import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { triggerProductSyncForNewAdmin } from "@/lib/sync/trigger-product-sync";
import { db } from "@/lib/supabase/db-server";
import { users, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";

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

		// Get user from database to check access level
		const userRecord = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, user.userId),
				eq(users.experienceId, experienceId)
			),
			with: {
				experience: true
			}
		});

		if (!userRecord) {
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 }
			);
		}

		// Only allow admin users to trigger sync
		if (userRecord.accessLevel !== "admin") {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 }
			);
		}

		// Check if products have already been synced
		if (userRecord.productsSynced) {
			return NextResponse.json({
				success: true,
				message: "Products already synced",
				alreadySynced: true
			});
		}

		// Get company ID from experience
		const companyId = userRecord.experience?.whopCompanyId;
		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID not found in experience" },
				{ status: 400 }
			);
		}

		console.log(`🔄 API: Triggering product sync for admin user ${userRecord.id} in experience ${experienceId}`);
		console.log(`📊 Company ID: ${companyId}`);

		// Trigger the sync
		await triggerProductSyncForNewAdmin(
			userRecord.id,
			experienceId,
			companyId
		);

		return NextResponse.json({
			success: true,
			message: "Product sync completed successfully",
			userId: userRecord.id,
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
