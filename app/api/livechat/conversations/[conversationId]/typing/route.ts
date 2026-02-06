import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
import { getUserContext } from "@/lib/context/user-context";
import { getConversationTypingState } from "@/lib/actions/livechat-integration-actions";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

function getConversationIdFromPath(pathname: string): string | null {
  const pathParts = pathname.split("/");
  return pathParts[pathParts.length - 2] ?? null;
}

async function getTypingHandler(request: NextRequest, context: AuthContext) {
  try {
    const conversationId = getConversationIdFromPath(request.url ? new URL(request.url).pathname : "");
    if (!conversationId) {
      return createErrorResponse("MISSING_CONVERSATION_ID", "Conversation ID is required");
    }
    const experienceId = context.user.experienceId;
    if (!experienceId) {
      return createErrorResponse("MISSING_EXPERIENCE_ID", "Experience ID is required");
    }
    const userContext = await getUserContext(
      context.user.userId,
      "",
      experienceId,
      false,
      "admin"
    );
    if (!userContext?.isAuthenticated || !userContext.user || userContext.user.accessLevel !== "admin") {
      return createErrorResponse("FORBIDDEN", "Admin access required");
    }
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      columns: { experienceId: true },
    });
    if (!conv || conv.experienceId !== userContext.user.experience?.id) {
      return createErrorResponse("CONVERSATION_NOT_FOUND", "Conversation not found");
    }
    const typing = await getConversationTypingState(conversationId);
    return createSuccessResponse(typing);
  } catch (error) {
    console.error("Error getting typing state:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

async function postTypingHandler(request: NextRequest, context: AuthContext) {
  try {
    const url = new URL(request.url);
    const conversationId = getConversationIdFromPath(url.pathname);
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

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      columns: { id: true, experienceId: true, whopUserId: true },
    });

    if (!conv) {
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found"
      );
    }

    const body = await request.json().catch(() => ({}));
    const side = body?.side as string | undefined;
    const active = body?.active as boolean | undefined;

    if (side !== "user" && side !== "admin") {
      return createErrorResponse(
        "INVALID_SIDE",
        "Body must include { side: 'user' | 'admin', active: boolean }"
      );
    }

    if (typeof active !== "boolean") {
      return createErrorResponse(
        "INVALID_ACTIVE",
        "Body must include { side: 'user' | 'admin', active: boolean }"
      );
    }

    if (side === "admin" && userContext.user.accessLevel !== "admin") {
      return createErrorResponse(
        "FORBIDDEN",
        "Only admins can set admin typing"
      );
    }
    if (side === "user" && userContext.user.whopUserId !== conv.whopUserId) {
      return createErrorResponse(
        "FORBIDDEN",
        "Only the conversation user can set user typing"
      );
    }

    const now = new Date();
    await db
      .update(conversations)
      .set({
        ...(side === "user"
          ? { userTyping: active, userTypingAt: active ? now : null }
          : { adminTyping: active, adminTypingAt: active ? now : null }),
        updatedAt: now,
      })
      .where(eq(conversations.id, conversationId));

    return createSuccessResponse({ ok: true });
  } catch (error) {
    console.error("Error setting typing:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      (error as Error).message
    );
  }
}

export const GET = withWhopAuth(getTypingHandler);
export const POST = withWhopAuth(postTypingHandler);
