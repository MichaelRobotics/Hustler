/**
 * Plan Member Count Sync Service
 * 
 * Handles syncing member_count for plans from Whop API
 */

import { db } from "@/lib/supabase/db-server";
import { resources, experiences } from "@/lib/supabase/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";

/**
 * Sync member_count for a specific plan from Whop API
 */
export async function syncPlanMemberCount(
	experienceId: string,
	planId: string,
	resourceId: string
): Promise<number | null> {
	try {
		// Resolve experience ID if it's a Whop experience ID
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: { id: true, whopCompanyId: true },
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		} else {
			// Get company ID from experience
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.id, resolvedExperienceId),
				columns: { whopCompanyId: true },
			});

			if (!experience?.whopCompanyId) {
				throw new Error(`Company ID not found for experience ${resolvedExperienceId}`);
			}
		}

		// Get company ID
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, resolvedExperienceId),
			columns: { whopCompanyId: true },
		});

		if (!experience?.whopCompanyId) {
			throw new Error(`Company ID not found for experience ${resolvedExperienceId}`);
		}

		const whopCompanyId = experience.whopCompanyId;

		// Import Whop SDK client
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
			appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
		});

		// Fetch all plans from Whop API and filter by planId
		let memberCount: number | null = null;
		try {
			for await (const planListResponse of client.plans.list({ 
				company_id: whopCompanyId 
			})) {
				// Handle different response formats
				const plans = (planListResponse as any).data || (planListResponse as any) || [];
				const plansArray = Array.isArray(plans) ? plans : [];
				
				for (const plan of plansArray) {
					if (plan.id === planId) {
						// Found the plan - extract member_count
						memberCount = plan.member_count || plan.active_users_count || null;
						break;
					}
				}
				// If we found the plan, break out of the outer loop
				if (memberCount !== null) {
					break;
				}
			}
		} catch (error) {
			console.error(`Error fetching plan ${planId} from Whop API:`, error instanceof Error ? error.message : String(error));
			// Return null if API call fails
			return null;
		}

		// Update resource's sold field if member_count was found
		if (memberCount !== null) {
			await db
				.update(resources)
				.set({
					sold: memberCount,
					updatedAt: new Date(),
				})
				.where(eq(resources.id, resourceId));

			console.log(`✅ Updated member_count for plan ${planId} (resource ${resourceId}): ${memberCount}`);
		} else {
			console.warn(`⚠️ No member_count found for plan ${planId}`);
		}

		return memberCount;
	} catch (error) {
		console.error(`Error syncing member_count for plan ${planId}:`, error instanceof Error ? error.message : String(error));
		return null;
	}
}

/**
 * Sync member_count for all plan-only resources in an experience
 */
export async function syncAllPlanMemberCounts(
	experienceId: string
): Promise<{ synced: number; errors: number }> {
	try {
		// Resolve experience ID if it's a Whop experience ID
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: { id: true },
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		}

		// Get all resources with planId but no whopProductId
		const planOnlyResources = await db.query.resources.findMany({
			where: and(
				eq(resources.experienceId, resolvedExperienceId),
				isNotNull(resources.planId),
				isNull(resources.whopProductId)
			),
			columns: {
				id: true,
				planId: true,
			},
		});

		console.log(`[PLAN-MEMBER-SYNC] Found ${planOnlyResources.length} plan-only resources to sync`);

		let synced = 0;
		let errors = 0;

		// Sync member_count for each plan
		for (const resource of planOnlyResources) {
			if (!resource.planId) continue;

			try {
				const memberCount = await syncPlanMemberCount(
					resolvedExperienceId,
					resource.planId,
					resource.id
				);

				if (memberCount !== null) {
					synced++;
				}
			} catch (error) {
				console.error(`[PLAN-MEMBER-SYNC] Error syncing plan ${resource.planId}:`, error);
				errors++;
			}
		}

		console.log(`[PLAN-MEMBER-SYNC] Completed: ${synced} synced, ${errors} errors`);
		return { synced, errors };
	} catch (error) {
		console.error(`[PLAN-MEMBER-SYNC] Error syncing all plan member counts:`, error instanceof Error ? error.message : String(error));
		throw error;
	}
}

