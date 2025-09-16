import { db } from "@/lib/supabase/db-server";
import { experiences, users, resources, funnels, conversations } from "@/lib/supabase/schema";
import { eq, and, lt } from "drizzle-orm";

/**
 * Cleanup strategy for abandoned experiences
 * Handles the scenario where a Whop owner deletes and reinstalls the app
 */

/**
 * Find and clean up abandoned experiences for a company
 * An experience is considered abandoned if:
 * 1. It's not the most recent experience for the company
 * 2. There is a newer experience for the same whop_company_id
 * 3. It has no recent user activity (no users created in last 7 days)
 * 4. It has no active funnels or conversations
 */
export async function cleanupAbandonedExperiences(companyId: string): Promise<{
	cleaned: string[];
	kept: string[];
}> {
	try {
		console.log(`🧹 Starting cleanup for company ${companyId}`);

		// Get all experiences for this company, ordered by creation date
		const companyExperiences = await db.query.experiences.findMany({
			where: eq(experiences.whopCompanyId, companyId),
			orderBy: (experiences: any, { desc }: any) => [desc(experiences.createdAt)],
			with: {
				users: true,
				funnels: true,
				conversations: true
			}
		});

		if (companyExperiences.length <= 1) {
			console.log(`✅ Only ${companyExperiences.length} experience(s) found, no cleanup needed`);
			return { cleaned: [], kept: companyExperiences.map((exp: any) => exp.id) };
		}

		console.log(`📊 Found ${companyExperiences.length} experiences for company ${companyId}`);

		// The most recent experience is always kept
		const [latestExperience, ...olderExperiences] = companyExperiences;
		console.log(`✅ Keeping latest experience: ${latestExperience.id} (${latestExperience.name})`);

		const cleaned: string[] = [];
		const kept: string[] = [latestExperience.id];

		// Only cleanup older experiences if there's a newer one (which there is, since we have latestExperience)
		// This ensures we only delete when there's actually a newer experience
		if (olderExperiences.length > 0) {
			console.log(`🔄 Found ${olderExperiences.length} older experiences, evaluating for cleanup...`);
			
			// Check each older experience to see if it should be cleaned up
			for (const experience of olderExperiences) {
				const shouldCleanup = await shouldCleanupExperience(experience as any);
				
				if (shouldCleanup) {
					console.log(`🗑️ Marking experience ${experience.id} for cleanup (abandoned - newer experience exists)`);
					cleaned.push(experience.id);
				} else {
					console.log(`✅ Keeping experience ${experience.id} (has active data despite newer experience)`);
					kept.push(experience.id);
				}
			}
		} else {
			console.log(`✅ No older experiences found to evaluate`);
		}

		// Actually delete the abandoned experiences
		if (cleaned.length > 0) {
			console.log(`🗑️ Deleting ${cleaned.length} abandoned experiences...`);
			await deleteAbandonedExperiences(cleaned);
			console.log(`🎉 Cleaned up ${cleaned.length} abandoned experiences`);
		} else {
			console.log(`🤷 No abandoned experiences found for cleanup.`);
		}

		return { cleaned, kept };

	} catch (error) {
		console.error("❌ Error during experience cleanup:", error);
		throw error;
	}
}

/**
 * Determine if an experience should be cleaned up
 */
async function shouldCleanupExperience(experience: any): Promise<boolean> {
	// Check if experience has any recent activity (users created in last 7 days)
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const recentUsers = experience.users.filter((user: any) => 
		new Date(user.createdAt) > sevenDaysAgo
	);

	// Check if experience has active funnels
	const activeFunnels = experience.funnels.filter((funnel: any) => 
		funnel.isDeployed || funnel.wasEverDeployed
	);

	// Check if experience has recent conversations
	const recentConversations = experience.conversations.filter((conv: any) => 
		new Date(conv.createdAt) > sevenDaysAgo
	);

	// Experience should be cleaned up if:
	// 1. No recent users (no activity in last 7 days)
	// 2. No active funnels
	// 3. No recent conversations
	const shouldCleanup = 
		recentUsers.length === 0 && 
		activeFunnels.length === 0 && 
		recentConversations.length === 0;

	console.log(`  Experience ${experience.id}:`);
	console.log(`    - Recent users: ${recentUsers.length}`);
	console.log(`    - Active funnels: ${activeFunnels.length}`);
	console.log(`    - Recent conversations: ${recentConversations.length}`);
	console.log(`    - Should cleanup: ${shouldCleanup}`);

	return shouldCleanup;
}

/**
 * Delete abandoned experiences and all their related data
 * This uses CASCADE deletes, so related data is automatically removed
 */
async function deleteAbandonedExperiences(experienceIds: string[]): Promise<void> {
	try {
		console.log(`🗑️ Deleting ${experienceIds.length} abandoned experiences...`);

		for (const experienceId of experienceIds) {
			// Delete the experience (CASCADE will handle related data)
			await db.delete(experiences).where(eq(experiences.id, experienceId));
			console.log(`  ✅ Deleted experience ${experienceId}`);
		}

		console.log(`🎉 Successfully deleted ${experienceIds.length} abandoned experiences`);

	} catch (error) {
		console.error("❌ Error deleting abandoned experiences:", error);
		throw error;
	}
}

/**
 * Check if a company has multiple experiences and needs cleanup
 */
export async function checkIfCleanupNeeded(companyId: string): Promise<boolean> {
	try {
		const experienceCount = await db.query.experiences.findMany({
			where: eq(experiences.whopCompanyId, companyId),
			columns: { id: true }
		});

		return experienceCount.length > 1;
	} catch (error) {
		console.error("Error checking if cleanup needed:", error);
		return false;
	}
}
