import { NextRequest } from "next/server";
import { getConversationAnalytics } from "@/lib/actions/livechat-actions";
import { getUserContext } from "@/lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function getAnalyticsHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const url = new URL(request.url);
		const pathParts = url.pathname.split("/");
		const conversationId = pathParts[pathParts.length - 1];
		const { user } = context;

		if (!conversationId || conversationId === "analytics") {
			return createErrorResponse(
				"MISSING_CONVERSATION_ID",
				"Conversation ID is required",
				400,
			);
		}

		const experienceId = user.experienceId;
		if (!experienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"Experience ID is required",
				400,
			);
		}

		const userContext = await getUserContext(
			user.userId,
			"",
			experienceId,
			false,
			"admin",
		);

		if (!userContext?.isAuthenticated || !userContext.user) {
			return createErrorResponse(
				"USER_CONTEXT_NOT_FOUND",
				"User context not found",
				401,
			);
		}

		const result = await getConversationAnalytics(
			userContext.user,
			conversationId,
		);

		if (!result.success || !result.analytics) {
			const status = result.error?.includes("Access denied")
				? 403
				: result.error?.includes("not found")
					? 404
					: 500;
			return createErrorResponse(
				"ANALYTICS_FAILED",
				result.error || "Failed to load analytics",
				status,
			);
		}

		return createSuccessResponse({ analytics: result.analytics });
	} catch (error) {
		console.error("Error loading analytics:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

export const GET = withWhopAuth(getAnalyticsHandler);
