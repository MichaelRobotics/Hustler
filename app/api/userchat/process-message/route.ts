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
 * - Rate limiting per user
 * - Request validation and sanitization
 * - Caching for conversation data
 * - Structured error handling
 */
async function processMessageHandler(request: NextRequest, context: AuthContext) {
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

    // Rate limiting per user
    const rateLimitKey = `user_${user.userId}`;
    const isRateLimited = !legacyRateLimiter.isAllowed(
      rateLimitKey,
      RATE_LIMITS.MESSAGE_PROCESSING.limit,
      RATE_LIMITS.MESSAGE_PROCESSING.windowMs
    );

    if (isRateLimited) {
      const resetTime = legacyRateLimiter.getResetTime(rateLimitKey);
      const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 60;
      
      return NextResponse.json(
        { 
          error: "Rate limit exceeded", 
          retryAfter,
          resetTime: resetTime ? new Date(resetTime).toISOString() : null,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': RATE_LIMITS.MESSAGE_PROCESSING.limit.toString(),
            'X-RateLimit-Remaining': legacyRateLimiter.getRemaining(rateLimitKey, RATE_LIMITS.MESSAGE_PROCESSING.limit, RATE_LIMITS.MESSAGE_PROCESSING.windowMs).toString(),
          },
        }
      );
    }

    // Read request body once
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate request format
    const requestValidation = validateRequestBody(requestBody, ['conversationId', 'messageContent']);
    if (!requestValidation.isValid) {
      return NextResponse.json(
        { error: "Invalid request format", details: requestValidation.errors },
        { status: 400 }
      );
    }

    const { conversationId, messageContent } = requestBody;

    // Validate conversation ID
    const conversationValidation = validateConversationId(conversationId);
    if (!conversationValidation.isValid) {
      return NextResponse.json(
        { error: "Invalid conversation ID", details: conversationValidation.errors },
        { status: 400 }
      );
    }

    // Validate message content
    const messageValidation = validateMessageContent(messageContent);
    if (!messageValidation.isValid) {
      return NextResponse.json(
        { error: "Invalid message content", details: messageValidation.errors },
        { status: 400 }
      );
    }

    const sanitizedConversationId = conversationValidation.sanitizedData;
    const sanitizedMessageContent = messageValidation.sanitizedData;

    console.log(`Processing message in UserChat for conversation ${sanitizedConversationId}:`, sanitizedMessageContent);

    // Get the internal experience ID from the database
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return createErrorResponse(
        "EXPERIENCE_NOT_FOUND",
        "Experience not found"
      );
    }

    // Check cache for recent conversation data
    const cacheKey = CacheKeys.conversation(sanitizedConversationId);
    const cachedConversation = cache.get(cacheKey);
    
    if (cachedConversation) {
      console.log("Using cached conversation data");
    }

    // Process user message through simplified funnel system with real experience ID
    const result = await processUserMessage(sanitizedConversationId, sanitizedMessageContent, experience.id);

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
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing message in UserChat:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      processingTime
    });

    return NextResponse.json(
      { 
        error: "Failed to process message", 
        details: error instanceof Error ? error.message : "Unknown error",
        processingTime 
      },
      { status: 500 }
    );
  }
}

export const POST = withWhopAuth(processMessageHandler);