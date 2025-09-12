import { type NextRequest, NextResponse } from "next/server";
import { simplifiedAnalyticsSystem } from "../../../lib/analytics/analytics";
import { getUserContext } from "../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../lib/middleware/whop-auth";

/**
 * Simplified Analytics API Route
 * Handles basic analytics operations with proper authentication and authorization
 */

/**
 * GET /api/analytics - Get basic analytics data
 */
async function getAnalyticsHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const url = new URL(request.url);

		// Extract query parameters
		const startDate = url.searchParams.get("startDate")
			? new Date(url.searchParams.get("startDate")!)
			: undefined;
		const endDate = url.searchParams.get("endDate")
			? new Date(url.searchParams.get("endDate")!)
			: undefined;

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

		// Get basic analytics using simplified system
		const analytics = await simplifiedAnalyticsSystem.getBasicAnalytics(
			userContext.user,
			startDate,
			endDate,
		);

		return createSuccessResponse(analytics, "Analytics retrieved successfully");
	} catch (error) {
		console.error("Error getting analytics:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handlers
export const GET = withWhopAuth(getAnalyticsHandler);