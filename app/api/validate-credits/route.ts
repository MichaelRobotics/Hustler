import { type NextRequest, NextResponse } from "next/server";
import { getUserContext } from "../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../lib/middleware/whop-auth";

/**
 * Validate Credits API Route
 * Dedicated endpoint for credit validation before generation
 * This runs before any generation process to ensure user has sufficient credits
 */
async function validateCreditsHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { experienceId } = await request.json();

		// Get experienceId from request body or fallback to context
		const finalExperienceId = experienceId || context.user.experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
		
		if (!finalExperienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"Experience ID is required for credit validation",
			);
		}

		// Get user context with fresh credit data (force refresh)
		const userContext = await getUserContext(
			context.user.userId,
			"",
			finalExperienceId,
			true, // force refresh to get latest credit data
		);

		if (!userContext) {
			return createErrorResponse(
				"USER_NOT_FOUND",
				"User context not found",
			);
		}
		
		// Check if user is admin
		if (userContext.user.accessLevel !== "admin") {
			return createErrorResponse(
				"ACCESS_DENIED",
				"Only admins can validate credits for generation",
			);
		}
		
		// Check if user has sufficient credits
		const requiredCredits = 1;
		const currentCredits = userContext.user.credits;
		
		if (currentCredits < requiredCredits) {
			return createErrorResponse(
				"INSUFFICIENT_CREDITS",
				`Insufficient credits to generate funnel. Required: ${requiredCredits}, Available: ${currentCredits}. Please purchase more credits.`,
				{
					requiredCredits,
					currentCredits,
					shortfall: requiredCredits - currentCredits,
				}
			);
		}

		// Return success with credit information
		return createSuccessResponse(
			{
				hasSufficientCredits: true,
				currentCredits,
				requiredCredits,
				remainingCredits: currentCredits - requiredCredits,
			},
			"User has sufficient credits for generation"
		);
	} catch (error) {
		console.error("Error validating credits:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export handler with authentication middleware
export const POST = withWhopAuth(validateCreditsHandler);
