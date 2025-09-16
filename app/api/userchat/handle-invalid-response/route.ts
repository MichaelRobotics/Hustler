import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages } from "@/lib/supabase/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

/**
 * Handle invalid user responses with progressive escalation
 */
async function handleInvalidResponseHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const { conversationId, userInput } = await request.json();

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

    // Get conversation to verify access
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experienceId)
      ),
    });

    if (!conversation) {
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found"
      );
    }

    // Count recent invalid attempts by looking at bot error messages
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: [desc(messages.createdAt)],
      limit: 10,
    });

    // Count recent error messages (bot messages with error content)
    const invalidAttempts = recentMessages.filter((msg: any) => 
      msg.type === 'bot' && 
      (msg.content.includes('Please choose') || 
       msg.content.includes('I\'ll inform') || 
       msg.content.includes('unable to help'))
    ).length;

    // Determine escalation level
    const attemptCount = invalidAttempts + 1;
    let botMessage: string;

    if (attemptCount === 1) {
      botMessage = "Please choose from the provided options above.";
    } else if (attemptCount === 2) {
      botMessage = "I'll inform the Whop owner about your request. Please wait for assistance.";
    } else {
      botMessage = "I'm unable to help you further. Please contact the Whop owner directly.";
    }

    // Add the error message to the conversation
    await db.insert(messages).values({
      conversationId: conversationId,
      type: "bot",
      content: botMessage,
    });

    // If this is the 3rd attempt, mark conversation as abandoned
    if (attemptCount >= 3) {
      await db
        .update(conversations)
        .set({
          status: "abandoned",
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
    }

    return createSuccessResponse({
      success: true,
      botMessage,
      attemptCount,
      escalated: attemptCount >= 3,
    }, "Invalid response handled with escalation");

  } catch (error) {
    console.error("Error handling invalid response:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Failed to handle invalid response"
    );
  }
}

export const POST = withWhopAuth(handleInvalidResponseHandler);
