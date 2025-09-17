import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { triggerProductSyncForNewAdmin } from "@/lib/sync/trigger-product-sync";
import { getUserContext } from "@/lib/context/user-context";

/**
 * POST /api/admin/sync-products - Trigger product sync for admin users
 * This endpoint uses proper WhopAuth middleware for authentication
 */
async function syncProductsHandler(
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

		// Get the full user context (same pattern as other APIs)
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			experienceId,
			false, // forceRefresh
			// Don't pass access level - let it be determined from Whop API
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

		// Check if products have already been synced
		if (userContext.user.productsSynced) {
			return NextResponse.json({
				success: true,
				message: "Products already synced",
				alreadySynced: true
			});
		}

		// Get company ID from experience
		const companyId = userContext.user.experience?.whopCompanyId;
		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID not found in experience" },
				{ status: 400 }
			);
		}

		console.log(`🔄 API: Triggering product sync for admin user ${userContext.user.id} in experience ${experienceId}`);
		console.log(`📊 Company ID: ${companyId}`);

		// Trigger the sync
		await triggerProductSyncForNewAdmin(
			userContext.user.id,
			experienceId,
			companyId
		);

		return NextResponse.json({
			success: true,
			message: "Product sync completed successfully",
			userId: userContext.user.id,
			experienceId: experienceId,
			companyId: companyId
		});

	} catch (error) {
		console.error("❌ Error in sync products API:", error);
		return NextResponse.json(
			{ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
}

// Export the protected route handler
export const POST = withWhopAuth(syncProductsHandler);
