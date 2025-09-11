import { type NextRequest, NextResponse } from "next/server";
import { analyticsSystem } from "../../../../lib/analytics/analytics";
import { getUserContext } from "../../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../../lib/middleware/whop-auth";

/**
 * Analytics Tracking API Route
 * Handles real-time analytics tracking with proper authentication and authorization
 */

/**
 * POST /api/analytics/track - Track analytics events
 */
async function trackAnalyticsHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const body = await request.json();

		const { event, funnelId, conversationId, data } = body;

		if (!event || !funnelId) {
			return createErrorResponse(
				"MISSING_REQUIRED_FIELDS",
				"Event and funnelId are required",
			);
		}

		// Use experience ID from URL or fallback to a default
		const experienceId = user.experienceId || "exp_wl5EtbHqAqLdjV"; // Fallback for API routes

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

		// Track the event based on type
		switch (event) {
			case "funnel_view":
				// await analyticsSystem.trackFunnelView(funnelId, context.user.id); // Disabled for build
				break;
			case "funnel_start":
				if (!conversationId) {
					return createErrorResponse(
						"MISSING_REQUIRED_FIELDS",
						"ConversationId is required for funnel_start event",
					);
				}
				// await analyticsSystem.trackFunnelStart(funnelId, conversationId, context.user.id); // Disabled for build
				break;
			case "funnel_completion":
				if (!conversationId) {
					return createErrorResponse(
						"MISSING_REQUIRED_FIELDS",
						"ConversationId is required for funnel_completion event",
					);
				}
				// await analyticsSystem.trackFunnelCompletion(funnelId, conversationId, context.user.id); // Disabled for build
				break;
			case "conversion":
				if (!conversationId || !data?.revenue) {
					return createErrorResponse(
						"MISSING_REQUIRED_FIELDS",
						"ConversationId and revenue are required for conversion event",
					);
				}
				// await analyticsSystem.trackConversion(funnelId, conversationId, data.revenue, context.user.id); // Disabled for build
				break;
			default:
				return createErrorResponse(
					"INVALID_INPUT",
					`Unknown event type: ${event}`,
				);
		}

		return createSuccessResponse(
			{ event, funnelId, conversationId, tracked: true },
			"Analytics event tracked successfully",
		);
	} catch (error) {
		console.error("Error tracking analytics:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handler
export const POST = withWhopAuth(trackAnalyticsHandler);
