import { NextRequest, NextResponse } from "next/server";
import { getLiveChatConversationDetails, sendLiveChatMessage } from "@/lib/actions/livechat-integration-actions";
import { getConversationMessages } from "@/lib/actions/unified-message-actions";
import { getUserContext } from "@/lib/context/user-context";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

async function getConversationHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const conversationId = pathParts[pathParts.length - 1];
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
    const conversation = await getLiveChatConversationDetails(authenticatedUser, conversationId, experienceId);

    if (!conversation) {
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found"
      );
    }

    // Load unified messages using the single source of truth
    const unifiedMessages = await getConversationMessages(
      conversationId,
      conversation.experienceId || experienceId,
      conversation.whopUserId
    );

    return createSuccessResponse({
      conversation: {
        ...conversation,
        messages: unifiedMessages, // Use unified message format
      },
    });
  } catch (error) {
    console.error("Error loading conversation details:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

export const GET = withWhopAuth(getConversationHandler);

async function postConversationHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const conversationId = pathParts[pathParts.length - 1];
    const { user } = context;
    const body = await request.json();
    const { action, message, messageType } = body;

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

    if (action === "send_message") {
      if (!message) {
        return createErrorResponse(
          "MISSING_MESSAGE",
          "Message is required"
        );
      }

      const result = await sendLiveChatMessage(authenticatedUser, conversationId, message, experienceId);

      if (result.success) {
        return createSuccessResponse({
          message: result.message,
        });
      } else {
        return createErrorResponse(
          "SEND_MESSAGE_FAILED",
          result.error || "Failed to send message"
        );
      }
    } else {
      return createErrorResponse(
        "INVALID_ACTION",
        "Invalid action. Use 'send_message'"
      );
    }
  } catch (error) {
    console.error("Error handling conversation action:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

export const POST = withWhopAuth(postConversationHandler);
