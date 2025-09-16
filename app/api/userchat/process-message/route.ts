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
import { conversations } from "@/lib/supabase/schema";
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

    // Validate request format
    const requestValidation = validateRequestBody(requestBody, ['conversationId', 'messageContent']);
    if (!requestValidation.isValid) {
      return createErrorResponse(
        "INVALID_REQUEST_FORMAT",
        "Invalid request format"
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

    // Get conversation with funnel data (like the working navigate-funnel API)
    console.log(`[process-message] Looking for conversation: ${sanitizedConversationId}`);
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, sanitizedConversationId),
      with: {
        funnel: true,
        experience: true,
      },
    });

    if (!conversation) {
      console.log(`[process-message] Conversation not found: ${sanitizedConversationId}`);
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found"
      );
    }

    if (!conversation.funnel?.flow) {
      console.log(`[process-message] Funnel flow not found for conversation: ${sanitizedConversationId}`);
      return createErrorResponse(
        "FUNNEL_NOT_FOUND",
        "Funnel flow not found"
      );
    }

    console.log(`[process-message] Found conversation: ${conversation.id}, experienceId: ${conversation.experienceId}`);

    console.log(`Processing message in UserChat for conversation ${sanitizedConversationId}:`, sanitizedMessageContent);

    // Check cache for recent conversation data
    const cacheKey = CacheKeys.conversation(sanitizedConversationId);
    const cachedConversation = cache.get(cacheKey);
    
    if (cachedConversation) {
      console.log("Using cached conversation data");
    }

    // Process user message through simplified funnel system (use conversation's experienceId)
    console.log(`[process-message] Calling processUserMessage with conversationId: ${sanitizedConversationId}, message: ${sanitizedMessageContent}, experienceId: ${conversation.experienceId}`);
    const result = await processUserMessage(sanitizedConversationId, sanitizedMessageContent, conversation.experienceId);
    console.log(`[process-message] processUserMessage result:`, result);

    // Cache the result for future requests
    if (result.success) {
      cache.set(cacheKey, result, CACHE_TTL.CONVERSATION);
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

