import { type NextRequest, NextResponse } from "next/server";
import { getUserCredits } from "../../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withCustomerAuth,
} from "../../../../lib/middleware/whop-auth";

/**
 * User Credits API Route
 * Handles credit-related operations with authentication
 */

/**
 * GET /api/user/credits - Get current user credits
 */
async function getUserCreditsHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;

		// Get experienceId from user context or fallback
		const experienceId = user.experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
		
		if (!experienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"Experience ID not found",
			);
		}

		// Get fresh credits from database for specific experience
		const currentCredits = await getUserCredits(user.userId, experienceId);

		const creditsInfo = {
			current: currentCredits,
			user: {
				id: user.userId,
				whopUserId: user.userId,
				name: "User", // WhopUser doesn't have name property
			},
		};

		return createSuccessResponse(
			creditsInfo,
			"User credits retrieved successfully",
		);
	} catch (error) {
		console.error("Error getting user credits:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handler
export const GET = withCustomerAuth(getUserCreditsHandler);
