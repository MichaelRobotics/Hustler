import { NextRequest } from "next/server";
import { getUserContext } from "@/lib/context/user-context";
import { markConversationRead } from "@/lib/actions/livechat-actions";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

/**
 * Mark conversation as read (read receipts).
 * POST body: { side: 'user' | 'admin' }
 * - admin: caller must be admin for this experience; sets admin_last_read_at.
 * - user: caller must be the conversation's customer; sets user_last_read_at.
 */
async function postMarkReadHandler(request: NextRequest, context: AuthContext) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const conversationId = pathParts[pathParts.length - 2]; // .../conversations/[id]/read
    const { user } = context;

    if (!conversationId) {
      return createErrorResponse(
        "MISSING_CONVERSATION_ID",
        "Conversation ID is required"
      );
    }

    const experienceId = user.experienceId;
    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    const userContext = await getUserContext(
      user.userId,
      "",
      experienceId,
      false,
      undefined
    );

    if (!userContext?.isAuthenticated || !userContext.user) {
      return createErrorResponse(
        "USER_CONTEXT_NOT_FOUND",
        "User context not found"
      );
    }

    const body = await request.json().catch(() => ({}));
    const side = body?.side as string | undefined;
    if (side !== "user" && side !== "admin") {
      return createErrorResponse(
        "INVALID_SIDE",
        "Body must include { side: 'user' | 'admin' }"
      );
    }

    const result = await markConversationRead(
      userContext.user,
      conversationId,
      side
    );

    if (!result.success) {
      return createErrorResponse(
        "MARK_READ_FAILED",
        result.error || "Failed to mark as read"
      );
    }

    return createSuccessResponse({ ok: true });
  } catch (error) {
    console.error("Error marking conversation read:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      (error as Error).message
    );
  }
}

export const POST = withWhopAuth(postMarkReadHandler);
