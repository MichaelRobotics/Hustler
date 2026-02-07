import { NextRequest, NextResponse } from "next/server";
import { processUserMessage } from "@/lib/actions/simplified-conversation-actions";
import { legacyRateLimiter, RATE_LIMITS } from "@/lib/middleware/rate-limiter";
import { 
  validateConversationId, 
  validateMessageContent, 
  validateRequestBody,
} from "@/lib/middleware/request-validator";
import { cache, CacheKeys, CACHE_TTL } from "@/lib/middleware/cache";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, users } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendWhopNotification } from "@/lib/helpers/whop-notifications";

/**
 * Process user message in UserChat and trigger funnel navigation
 * This API route handles the gap between WebSocket messages and funnel processing
 * 
 * Production optimizations:
 * - Multi-tenant authentication and isolation
 * - Rate limiting per tenant
 * - Request validation and sanitization
 * - Caching for conversation data
 * - Structured error handling
 */
async function processMessageHandler(
  request: NextRequest,
  context: AuthContext
) {
  const startTime = Date.now();
  
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Read request body once
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return createErrorResponse(
        "INVALID_JSON",
        "Invalid JSON in request body"
      );
    }

    // Validate required fields only (allow additional optional fields)
    if (!requestBody.conversationId) {
      return createErrorResponse(
        "MISSING_CONVERSATION_ID",
        "Conversation ID is required"
      );
    }
    
    if (!requestBody.messageContent) {
      return createErrorResponse(
        "MISSING_MESSAGE_CONTENT",
        "Message content is required"
      );
    }

    const { conversationId, messageContent } = requestBody;

    // Validate conversation ID
    const conversationValidation = validateConversationId(conversationId);
    if (!conversationValidation.isValid) {
      return createErrorResponse(
        "INVALID_CONVERSATION_ID",
        "Invalid conversation ID"
      );
    }

    // Validate message content
    const messageValidation = validateMessageContent(messageContent);
    if (!messageValidation.isValid) {
      return createErrorResponse(
        "INVALID_MESSAGE_CONTENT",
        "Invalid message content"
      );
    }

    const sanitizedConversationId = conversationValidation.sanitizedData;
    const sanitizedMessageContent = messageValidation.sanitizedData;

    // Get the experience record to get our internal experience ID
    console.log(`[process-message] Looking for experience with whopExperienceId: ${experienceId}`);
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.error(`[process-message] Experience not found for whopExperienceId: ${experienceId}`);
      return createErrorResponse(
        "EXPERIENCE_NOT_FOUND",
        "Experience not found"
      );
    }
    console.log(`[process-message] Found experience: ${experience.id} for whopExperienceId: ${experienceId}`);

    // Verify conversation belongs to this tenant
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, sanitizedConversationId),
      with: {
        experience: true,
      },
    });

    if (!conversation) {
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found"
      );
    }

    // Verify conversation belongs to this tenant's experience (compare database UUIDs)
    if (conversation.experienceId !== experience.id) {
      return createErrorResponse(
        "CONVERSATION_ACCESS_DENIED",
        "Conversation does not belong to this tenant"
      );
    }

    console.log(`Processing message in UserChat for conversation ${sanitizedConversationId}:`, sanitizedMessageContent);

    // Test database connection
    try {
      await db.query.conversations.findFirst({
        where: eq(conversations.id, sanitizedConversationId),
        limit: 1,
      });
      console.log("Database connection test successful");
    } catch (dbError) {
      console.error("Database connection test failed:", dbError);
      return createErrorResponse(
        "DATABASE_ERROR",
        "Database connection failed"
      );
    }

    // Check cache for recent conversation data
    const cacheKey = CacheKeys.conversation(sanitizedConversationId);
    const cachedConversation = cache.get(cacheKey);
    
    if (cachedConversation) {
      console.log("Using cached conversation data");
    }

    // Process user message through simplified funnel system with proper tenant isolation
    const result = await processUserMessage(sanitizedConversationId, sanitizedMessageContent, experience.id);

    // Cache the result for future requests
    if (result.success) {
      cache.set(cacheKey, result, CACHE_TTL.CONVERSATION);

      // Notify admin of new message (same as send-message): increment unread_count_admin and push
      const now = new Date();
      await db.update(conversations)
        .set({
          updatedAt: now,
          unreadCountAdmin: sql`${conversations.unreadCountAdmin} + 1`,
        })
        .where(eq(conversations.id, sanitizedConversationId));

      const whopUserId = user.userId;
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
          content: `${customerName}: ${sanitizedMessageContent.slice(0, 80)}${sanitizedMessageContent.length > 80 ? "…" : ""}`,
          rest_path: `?view=liveChat`,
        }).catch((err) => console.warn("[process-message] Whop notification failed:", err));
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`Message processed in ${processingTime}ms`);

    return createSuccessResponse({
      success: result.success,
      funnelResponse: result,
      processingTime,
      cached: !!cachedConversation,
    }, "Message processed successfully");

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing message in UserChat:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    });
    
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Failed to process message"
    );
  }
}

export const POST = withWhopAuth(processMessageHandler);

