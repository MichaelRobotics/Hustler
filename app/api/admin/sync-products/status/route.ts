import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { getUserContext } from "@/lib/context/user-context";
import { db } from "@/lib/supabase/db-server";
import { users, resources, funnels } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/admin/sync-products/status - Check product sync status for admin users
 * This endpoint provides real-time sync status and progress information
 */
async function getSyncStatusHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		
		// Get experience ID from user context
		const experienceId = user.experienceId;
		
		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID required" },
				{ status: 400 }
			);
		}

		// Get full user context to check access level
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			experienceId,
			false, // forceRefresh
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 }
			);
		}

		// Only allow admin users to check sync status
		if (userContext.user.accessLevel !== "admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		console.log(`📊 Checking sync status for admin user ${userContext.user.id} in experience ${experienceId}`);

		// Check if products have already been synced
		const userRecord = await db.query.users.findFirst({
			where: eq(users.id, userContext.user.id),
			columns: { 
				productsSynced: true,
				updatedAt: true
			}
		});

		// Count existing resources and funnels
		const [resourceCount, funnelCount] = await Promise.all([
			db.select({ count: resources.id })
				.from(resources)
				.where(
					and(
						eq(resources.experienceId, experienceId),
						eq(resources.type, "MY_PRODUCTS")
					)
				),
			db.select({ count: funnels.id })
				.from(funnels)
				.where(eq(funnels.experienceId, experienceId))
		]);

		const totalResources = resourceCount.length;
		const totalFunnels = funnelCount.length;

		// Determine sync status
		const isSynced = userRecord?.productsSynced || false;
		const hasResources = totalResources > 0;
		const hasFunnels = totalFunnels > 0;
		const syncComplete = isSynced && hasResources && hasFunnels;

		// Calculate sync progress
		let progress = 0;
		if (isSynced) progress += 33;
		if (hasResources) progress += 33;
		if (hasFunnels) progress += 34;

		const status = syncComplete ? "completed" : 
			isSynced ? "in_progress" : "not_started";

		return NextResponse.json({
			success: true,
			status: status,
			progress: progress,
			syncComplete: syncComplete,
			details: {
				userSynced: isSynced,
				hasResources: hasResources,
				hasFunnels: hasFunnels,
				totalResources: totalResources,
				totalFunnels: totalFunnels,
				lastUpdated: userRecord?.updatedAt
			},
			userId: userContext.user.id,
			experienceId: experienceId
		});

	} catch (error) {
		console.error("Error checking sync status:", error);
		return NextResponse.json(
			{ 
				error: "Failed to check sync status",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// Export the handler with WhopAuth middleware
export const GET = withWhopAuth(getSyncStatusHandler);
