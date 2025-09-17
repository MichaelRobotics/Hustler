import { db } from "@/lib/supabase/db-server";
import { experiences, users, resources, funnels, conversations } from "@/lib/supabase/schema";
import { eq, and, lt } from "drizzle-orm";

/**
 * Cleanup strategy for abandoned experiences
 * Handles the scenario where a Whop owner deletes and reinstalls the app
 */

/**
 * Clean up ALL existing experiences for a company before creating a new one
 * This is called when we're about to create a new experience (reinstall scenario)
 * We delete all existing experiences since the admin is creating a fresh one
 */
export async function cleanupAbandonedExperiences(companyId: string): Promise<{
	cleaned: string[];
	kept: string[];
}> {
	try {
		console.log(`🧹 Starting cleanup for company ${companyId} (reinstall scenario)`);

		// Get all existing experiences for this company
		const companyExperiences = await db.query.experiences.findMany({
			where: eq(experiences.whopCompanyId, companyId),
			orderBy: (experiences: any, { desc }: any) => [desc(experiences.createdAt)],
			with: {
				users: true,
				funnels: true,
				conversations: true
			}
		});

		if (companyExperiences.length === 0) {
			console.log(`✅ No existing experiences found, no cleanup needed`);
			return { cleaned: [], kept: [] };
		}

		console.log(`📊 Found ${companyExperiences.length} existing experiences for company ${companyId}`);

		// In a reinstall scenario, we delete ALL existing experiences
		// The admin is creating a new one, so old ones should be removed
		const allExperienceIds = companyExperiences.map((exp: any) => exp.id);
		
		console.log(`🗑️ Deleting ALL ${allExperienceIds.length} existing experiences (reinstall scenario)...`);
		await deleteAbandonedExperiences(allExperienceIds);
		console.log(`🎉 Cleaned up ${allExperienceIds.length} existing experiences`);

		return { cleaned: allExperienceIds, kept: [] };

	} catch (error) {
		console.error("❌ Error during experience cleanup:", error);
		throw error;
	}
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
 * Check if a company has existing experiences (reinstall scenario)
 */
export async function checkIfCleanupNeeded(companyId: string): Promise<boolean> {
	try {
		const experienceCount = await db.query.experiences.findMany({
			where: eq(experiences.whopCompanyId, companyId),
			columns: { id: true }
		});

		return experienceCount.length > 0;
	} catch (error) {
		console.error("Error checking if cleanup needed:", error);
		return false;
	}
}
