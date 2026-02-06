import { NextRequest } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";
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

/**
 * GET - Return typing state for the conversation. Customer must own the conversation.
 */
async function getTypingHandler(request: NextRequest, context: AuthContext) {
  try {
    const conversationId = getConversationIdFromPath(new URL(request.url).pathname);
    if (!conversationId) {
      return createErrorResponse("MISSING_CONVERSATION_ID", "Conversation ID is required");
    }
    const experienceId = context.user.experienceId;
    if (!experienceId) {
      return createErrorResponse("MISSING_EXPERIENCE_ID", "Experience ID is required");
    }

    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });
    if (!experience) {
      return createErrorResponse("EXPERIENCE_NOT_FOUND", "Experience not found");
    }

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      columns: { id: true, experienceId: true, whopUserId: true },
    });
    if (!conv || conv.experienceId !== experience.id || conv.whopUserId !== context.user.userId) {
      return createErrorResponse("CONVERSATION_NOT_FOUND", "Conversation not found");
    }

    const typing = await getConversationTypingState(conversationId);
    return createSuccessResponse(typing);
  } catch (error) {
    console.error("[userchat/typing] GET error:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

export const GET = withWhopAuth(getTypingHandler);
