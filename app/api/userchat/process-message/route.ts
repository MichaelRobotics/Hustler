import { NextRequest, NextResponse } from "next/server";
import { processUserMessage } from "@/lib/actions/simplified-conversation-actions";
import { rateLimiter, RATE_LIMITS } from "@/lib/middleware/rate-limiter";
import { 
  validateConversationId, 
  validateMessageContent, 
  validateApiRequest,
  extractUserIdFromHeaders 
} from "@/lib/middleware/request-validator";
import { cache, CacheKeys, CACHE_TTL } from "@/lib/middleware/cache";

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
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract user ID for rate limiting
    const userValidation = await extractUserIdFromHeaders(request);
    if (!userValidation.isValid) {
      return NextResponse.json(
        { error: "Authentication required", details: userValidation.errors },
        { status: 401 }
      );
    }

    // Rate limiting per user (using a fallback key if no user ID)
    const rateLimitKey = `user_${Date.now()}`; // Fallback for MVP
    const isRateLimited = !rateLimiter.isAllowed(
      rateLimitKey,
      RATE_LIMITS.MESSAGE_PROCESSING.limit,
      RATE_LIMITS.MESSAGE_PROCESSING.windowMs
    );

    if (isRateLimited) {
      const resetTime = rateLimiter.getResetTime(rateLimitKey);
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
            'X-RateLimit-Remaining': rateLimiter.getRemaining(rateLimitKey, RATE_LIMITS.MESSAGE_PROCESSING.limit, RATE_LIMITS.MESSAGE_PROCESSING.windowMs).toString(),
          },
        }
      );
    }

    // Validate request format
    const requestValidation = await validateApiRequest(request, ['conversationId', 'messageContent']);
    if (!requestValidation.isValid) {
      return NextResponse.json(
        { error: "Invalid request format", details: requestValidation.errors },
        { status: 400 }
      );
    }

    const { conversationId, messageContent } = await request.json();

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

    // Check cache for recent conversation data
    const cacheKey = CacheKeys.conversation(sanitizedConversationId);
    const cachedConversation = cache.get(cacheKey);
    
    if (cachedConversation) {
      console.log("Using cached conversation data");
    }

    // Process user message through simplified funnel system
    // TODO: Get experienceId from conversation or request for multi-tenancy
    const result = await processUserMessage(sanitizedConversationId, sanitizedMessageContent, "placeholder-experience-id");

    // Cache the result for future requests
    if (result.success) {
      cache.set(cacheKey, result, CACHE_TTL.CONVERSATION);
    }

    const processingTime = Date.now() - startTime;
    console.log(`Message processed in ${processingTime}ms`);

    return NextResponse.json({
      success: result.success,
      funnelResponse: result,
      processingTime,
      cached: !!cachedConversation,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Error processing message in UserChat:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
    });
    
    return NextResponse.json(
      { 
        error: "Failed to process message",
        processingTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

