import { NextRequest, NextResponse } from "next/server";
import { getLiveChatConversations } from "@/lib/actions/livechat-integration-actions";
import { getUserContext } from "@/lib/context/user-context";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function getConversationsHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const sortBy = searchParams.get("sortBy") || "newest";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const { user } = context;

    const experienceId = user.experienceId;
    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Get full user context for LiveChat
    const userContext = await getUserContext(
      user.userId,
      "", // whopCompanyId is optional for experience-based isolation
      experienceId,
      false, // forceRefresh
      "admin", // accessLevel for LiveChat
    );

    if (!userContext?.isAuthenticated || !userContext.user) {
      return createErrorResponse(
        "USER_CONTEXT_NOT_FOUND",
        "User context not found"
      );
    }

    const authenticatedUser = userContext.user;

    const filters = {
      status: status as "all" | "open" | "auto",
      sortBy: sortBy as "newest" | "oldest" | "most_messages" | "least_messages",
      search,
    };

    const pagination = {
      page,
      limit,
    };

    const result = await getLiveChatConversations(authenticatedUser, experienceId, filters, pagination);

    return createSuccessResponse({
      conversations: result.conversations,
      total: result.total,
      hasMore: result.hasMore,
      page: result.page,
      limit: result.limit,
    });
  } catch (error) {
    console.error("Error loading conversations:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

export const GET = withWhopAuth(getConversationsHandler);
