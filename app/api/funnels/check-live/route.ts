import { type NextRequest, NextResponse } from "next/server";
import { checkForAnyLiveFunnels } from "../../../../lib/actions/funnel-actions";
import {
	createErrorResponse,
	createSuccessResponse,
	withFunnelAuth,
} from "../../../../lib/middleware/whop-auth";
import type { AuthContext } from "../../../../lib/middleware/whop-auth";
import { getUserContext } from "../../../../lib/context/user-context";

/**
 * Check Live Funnels API Route
 * Checks if any other funnel is currently live
 */

/**
 * GET /api/funnels/check-live - Check if any other funnel is live
 */
async function checkLiveFunnelsHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const { searchParams } = new URL(request.url);
		const excludeFunnelId = searchParams.get("excludeFunnelId");

		// Use experience ID from URL or fallback to a default
		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 },
			);
		}
		const experienceId = user.experienceId;

		// Get the full user context from the simplified auth
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

		// Check for live funnels across all products for this experience
		const liveFunnelCheck = await checkForAnyLiveFunnels(
			userContext.user,
			excludeFunnelId || undefined,
		);

		return createSuccessResponse(
			liveFunnelCheck,
			"Live funnel check completed",
		);
	} catch (error) {
		console.error("Error checking live funnels:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handler
export const GET = withFunnelAuth(checkLiveFunnelsHandler);
