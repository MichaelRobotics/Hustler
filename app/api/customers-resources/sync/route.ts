import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, users } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { getUserContext } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import { syncCustomerMemberships, syncAdminResources } from "@/lib/services/customer-membership-sync";

/**
 * POST /api/customers-resources/sync - Sync memberships from Whop API
 * Query params: experienceId (required)
 * Only accessible by admins
 */
export async function POST(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const experienceId = searchParams.get("experienceId");
		const targetUserId = searchParams.get("userId"); // Optional: specific user to sync

		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		// Authenticate user
		const headersList = await headers();
		const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);

		if (!whopUserId) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 }
			);
		}

		// Get experience
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			return NextResponse.json(
				{ error: "Experience not found" },
				{ status: 404 }
			);
		}

		// Get user context to check access level
		const userContext = await getUserContext(
			whopUserId,
			experience.whopCompanyId,
			experienceId,
			false,
		);

		if (!userContext?.user) {
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 }
			);
		}

		// Only admins can trigger sync for all users
		// Non-admins can only sync their own memberships
		if (userContext.user.accessLevel !== "admin" && targetUserId && targetUserId !== userContext.user.id) {
			return NextResponse.json(
				{ error: "Access denied. You can only sync your own memberships." },
				{ status: 403 }
			);
		}

		// For admins: check if syncing for themselves or another user
		if (userContext.user.accessLevel === "admin") {
			// Determine if admin is syncing for themselves or another user
			const isSyncingForSelf = !targetUserId || targetUserId === userContext.user.id;
			
			if (isSyncingForSelf) {
				// Admin syncing for themselves → sync by resource
				const adminUserId = userContext.user.id;
				const result = await syncAdminResources(experienceId, adminUserId);
				return NextResponse.json({
					success: true,
					data: result,
					message: `Admin sync completed: ${result.created} created, ${result.updated} updated, ${result.errors} errors`,
				});
			} else {
				// Admin syncing for another user → sync by membership
				// Get the target user's whopUserId
				const targetUser = await db.query.users.findFirst({
					where: eq(users.id, targetUserId),
				});
				
				if (!targetUser) {
					return NextResponse.json(
						{ error: "Target user not found" },
						{ status: 404 }
					);
				}
				
				const result = await syncCustomerMemberships(
					experienceId,
					experience.whopCompanyId,
					targetUser.whopUserId
				);
				
				return NextResponse.json({
					success: true,
					data: result,
					message: `Sync completed: ${result.created} created, ${result.updated} updated, ${result.deleted || 0} deleted, ${result.errors} errors`,
				});
			}
		}

		// For non-admins: sync memberships (existing logic)
		// Determine which user to sync
		// If targetUserId provided, get that user's whopUserId
		// Otherwise, sync only current user
		let whopUserIdToSync: string | undefined = undefined;
		if (targetUserId) {
			// Get the target user's whopUserId
			const targetUser = await db.query.users.findFirst({
				where: eq(users.id, targetUserId),
			});
			if (targetUser) {
				whopUserIdToSync = targetUser.whopUserId;
			} else {
				return NextResponse.json(
					{ error: "Target user not found" },
					{ status: 404 }
				);
			}
		} else {
			// Non-admin: sync only their own memberships
			whopUserIdToSync = whopUserId;
		}

		// Sync memberships
		const result = await syncCustomerMemberships(
			experienceId,
			experience.whopCompanyId,
			whopUserIdToSync
		);

		return NextResponse.json({
			success: true,
			data: result,
			message: `Sync completed: ${result.created} created, ${result.updated} updated, ${result.deleted || 0} deleted, ${result.errors} errors`,
		});
	} catch (error) {
		console.error("Error syncing customer memberships:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}



