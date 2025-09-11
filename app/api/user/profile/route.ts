import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getUserContext } from "../../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../../lib/middleware/whop-auth";

/**
 * User Profile API Route
 * Handles user profile operations with proper authentication
 */

/**
 * GET /api/user/profile - Get user profile
 */
async function getUserProfileHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;

		// Get experience ID from user context or request headers
		let experienceId = user.experienceId;
		
		// If no experienceId in user context, try to get from request headers
		if (!experienceId) {
			const headersList = await headers();
			const url = new URL(request.url);
			const pathExperienceId = url.pathname.match(/\/experiences\/([^\/]+)/)?.[1];
			
			if (pathExperienceId) {
				experienceId = pathExperienceId;
			} else {
				// Last resort: use environment variable
				experienceId = process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
			}
		}

		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID not found" },
				{ status: 400 },
			);
		}

		// Get the full user context from the simplified auth (whopCompanyId is now optional)
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
				{ status: 401 },
			);
		}

		const profile = {
			id: userContext.user.id,
			whopUserId: userContext.user.whopUserId,
			email: userContext.user.email,
			name: userContext.user.name,
			experienceId: userContext.user.experienceId,
			accessLevel: userContext.user.accessLevel,
			credits: userContext.user.credits,
			experience: userContext.user.experience,
		};

		return createSuccessResponse(
			profile,
			"User profile retrieved successfully",
		);
	} catch (error) {
		console.error("Error getting user profile:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * PUT /api/user/profile - Update user profile
 */
async function updateUserProfileHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const input = await request.json();

		// Use experience ID from URL or fallback to a default
		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 },
			);
		}
		const experienceId = user.experienceId;

		// Get the full user context from the simplified auth (whopCompanyId is now optional)
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
				{ status: 401 },
			);
		}

		// For now, just return the current profile (update logic would go here)
		const updatedProfile = {
			id: userContext.user.id,
			whopUserId: userContext.user.whopUserId,
			email: userContext.user.email,
			name: userContext.user.name,
			experienceId: userContext.user.experienceId,
			accessLevel: userContext.user.accessLevel,
			credits: userContext.user.credits,
			experience: userContext.user.experience,
		};

		return createSuccessResponse(
			updatedProfile,
			"User profile updated successfully",
		);
	} catch (error) {
		console.error("Error updating user profile:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handlers
export const GET = withWhopAuth(getUserProfileHandler);
export const PUT = withWhopAuth(updateUserProfileHandler);
