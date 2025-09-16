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
import { conversations, experiences } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

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
    console.log("🔍 ProcessMessage: Starting request processing");
    const { user } = context;
    const experienceId = user.experienceId;
    
    console.log("🔍 ProcessMessage: User context:", {
      userId: user.userId,
      experienceId: user.experienceId,
      accessLevel: user.accessLevel
    });

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
      console.log("🔍 ProcessMessage: Request body received:", requestBody);
    } catch (error) {
      console.error("❌ ProcessMessage: Invalid JSON in request body:", error);
      return createErrorResponse(
        "INVALID_JSON",
        "Invalid JSON in request body"
      );
    }

    // Validate request format
    const requestValidation = validateRequestBody(requestBody, ['conversationId', 'messageContent']);
    console.log("🔍 ProcessMessage: Request validation result:", requestValidation);
    if (!requestValidation.isValid) {
      console.error("❌ ProcessMessage: Request validation failed:", requestValidation.errors);
      return createErrorResponse(
        "INVALID_REQUEST_FORMAT",
        `Invalid request format: ${requestValidation.errors.join(", ")}`
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

    // Verify conversation belongs to this tenant's experience
    if (conversation.experienceId !== experienceId) {
      return createErrorResponse(
        "CONVERSATION_ACCESS_DENIED",
        "Conversation does not belong to this tenant"
      );
    }

    console.log(`🔍 ProcessMessage: Processing message in UserChat for conversation ${sanitizedConversationId}:`, sanitizedMessageContent);

    // Check cache for recent conversation data
    const cacheKey = CacheKeys.conversation(sanitizedConversationId);
    const cachedConversation = cache.get(cacheKey);
    
    if (cachedConversation) {
      console.log("🔍 ProcessMessage: Using cached conversation data");
    }

    console.log("🔍 ProcessMessage: About to call processUserMessage with:", {
      conversationId: sanitizedConversationId,
      messageContent: sanitizedMessageContent,
      experienceId
    });

    // Process user message through simplified funnel system with proper tenant isolation
    const result = await processUserMessage(sanitizedConversationId, sanitizedMessageContent, experienceId);
    
    console.log("🔍 ProcessMessage: processUserMessage result:", result);

    // Cache the result for future requests
    if (result.success) {
      cache.set(cacheKey, result, CACHE_TTL.CONVERSATION);
    }

    const processingTime = Date.now() - startTime;
    console.log(`Message processed in ${processingTime}ms`);

    return createSuccessResponse({
      success: result.success,
      funnelResponse: {
        success: result.success,
        nextBlockId: result.nextBlockId,
        phaseTransition: result.phaseTransition,
        botMessage: result.botMessage,
        error: result.error,
      },
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

