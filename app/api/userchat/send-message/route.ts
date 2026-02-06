import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, experiences, users } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendWhopNotification } from "@/lib/helpers/whop-notifications";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import { validateConversationId, validateMessageContent } from "@/lib/middleware/request-validator";

/**
 * Send customer message API
 * 
 * Saves message to database. Updates are fetched via polling.
 * Used by UserChat when customer sends a message.
 */
async function sendMessageHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const whopExperienceId = user.experienceId;
    const whopUserId = user.userId;

    if (!whopExperienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return createErrorResponse(
        "INVALID_JSON",
        "Invalid JSON in request body"
      );
    }

    const { conversationId, content } = requestBody;

    // Validate required fields
    if (!conversationId) {
      return createErrorResponse(
        "MISSING_CONVERSATION_ID",
        "Conversation ID is required"
      );
    }

    if (!content) {
      return createErrorResponse(
        "MISSING_CONTENT",
        "Message content is required"
      );
    }

    // Validate conversation ID
    const conversationValidation = validateConversationId(conversationId);
    if (!conversationValidation.isValid) {
      return createErrorResponse(
        "INVALID_CONVERSATION_ID",
        "Invalid conversation ID format"
      );
    }

    // Validate message content
    const messageValidation = validateMessageContent(content);
    if (!messageValidation.isValid) {
      return createErrorResponse(
        "INVALID_CONTENT",
        "Invalid message content"
      );
    }

    const sanitizedConversationId = conversationValidation.sanitizedData;
    const sanitizedContent = messageValidation.sanitizedData;

    // Get experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, whopExperienceId),
    });

    if (!experience) {
      return createErrorResponse(
        "EXPERIENCE_NOT_FOUND",
        "Experience not found"
      );
    }

    // Verify conversation exists and belongs to this experience
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, sanitizedConversationId),
    });

    if (!conversation) {
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found"
      );
    }

    if (conversation.experienceId !== experience.id) {
      return createErrorResponse(
        "CONVERSATION_ACCESS_DENIED",
        "Conversation does not belong to this experience"
      );
    }

    // Verify user owns this conversation
    if (conversation.whopUserId !== whopUserId) {
      return createErrorResponse(
        "CONVERSATION_ACCESS_DENIED",
        "User does not own this conversation"
      );
    }

    console.log(`[send-message] Saving customer message for conversation ${sanitizedConversationId}`);

    // Save message to database
    const [savedMessage] = await db.insert(messages).values({
      conversationId: sanitizedConversationId,
      type: "user",
      content: sanitizedContent,
      metadata: {
        senderId: whopUserId,
        timestamp: new Date().toISOString(),
      },
    }).returning();

    console.log(`[send-message] Message saved with ID: ${savedMessage.id}`);

    // Notify admin of new message (unread count); handover to admin only when admin sends in LiveChat
    const now = new Date();
    await db.update(conversations)
      .set({
        updatedAt: now,
        unreadCountAdmin: sql`${conversations.unreadCountAdmin} + 1`,
      })
      .where(eq(conversations.id, sanitizedConversationId));

    // Notify admin(s) via Whop push notification
    const adminUsers = await db.query.users.findMany({
      where: and(
        eq(users.experienceId, conversation.experienceId),
        eq(users.accessLevel, "admin"),
      ),
      columns: { whopUserId: true, name: true },
    });
    const adminWhopIds = adminUsers.map((u: { whopUserId: string; name: string | null }) => u.whopUserId);
    const customerName = (await db.query.users.findFirst({
      where: and(
        eq(users.whopUserId, whopUserId),
        eq(users.experienceId, conversation.experienceId),
      ),
      columns: { name: true },
    }))?.name ?? "A customer";
    if (adminWhopIds.length > 0 && experience.whopExperienceId) {
      sendWhopNotification({
        experience_id: experience.whopExperienceId,
        user_ids: adminWhopIds,
        title: "New message",
        content: `${customerName}: ${sanitizedContent.slice(0, 80)}${sanitizedContent.length > 80 ? "…" : ""}`,
        rest_path: `/chat/${sanitizedConversationId}`,
      }).catch((err) => console.warn("[send-message] Whop notification failed:", err));
    }

    console.log(`[send-message] ✅ Message saved successfully`);

    return createSuccessResponse({
      messageId: savedMessage.id,
      conversationId: sanitizedConversationId,
      content: sanitizedContent,
      timestamp: savedMessage.createdAt,
    }, "Message sent successfully");

  } catch (error) {
    console.error("[send-message] Error sending message:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Failed to send message"
    );
  }
}

export const POST = withWhopAuth(sendMessageHandler);

