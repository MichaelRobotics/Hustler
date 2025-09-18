import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { triggerProductSyncForNewAdmin } from "@/lib/sync/trigger-product-sync";
import { getUserContext } from "@/lib/context/user-context";
import { waitUntil } from "@vercel/functions";

/**
 * POST /api/admin/sync-products/trigger - Trigger async product sync for admin users
 * This endpoint triggers product sync asynchronously to prevent timeouts
 */
async function triggerSyncHandler(
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

		// Get full user context to check access level and get company ID
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

		// Only allow admin users to trigger sync
		if (userContext.user.accessLevel !== "admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		// Get company ID from experience
		const companyId = userContext.user.experience?.whopCompanyId;
		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID not found in experience" },
				{ status: 400 }
			);
		}

		console.log(`🔄 API: Triggering async product sync for admin user ${userContext.user.id} in experience ${experienceId}`);
		console.log(`📊 Company ID: ${companyId}`);

		// Trigger the sync asynchronously using Vercel's waitUntil
		// This ensures the API response returns immediately while sync runs in background
		waitUntil(
			triggerProductSyncForNewAdmin(
				userContext.user.id,
				experienceId,
				companyId
			)
		);

		return NextResponse.json({
			success: true,
			message: "Product sync triggered successfully",
			userId: userContext.user.id,
			experienceId: experienceId,
			companyId: companyId
		});

	} catch (error) {
		console.error("Error triggering product sync:", error);
		return NextResponse.json(
			{ 
				error: "Failed to trigger product sync",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// Export the handler with WhopAuth middleware
export const POST = withWhopAuth(triggerSyncHandler);
