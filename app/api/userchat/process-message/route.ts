import { NextRequest, NextResponse } from "next/server";
import { processUserMessage } from "@/lib/actions/simplified-conversation-actions";
import { legacyRateLimiter, RATE_LIMITS } from "@/lib/middleware/rate-limiter";
import { 
  validateConversationId, 
  validateMessageContent, 
  validateRequestBody,
} from "@/lib/middleware/request-validator";
import { cache, CacheKeys, CACHE_TTL } from "@/lib/middleware/cache";
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
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {

    // Read request body once
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate request format
    const requestValidation = validateRequestBody(requestBody, ['conversationId', 'messageContent']);
    if (!requestValidation.isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid request format" },
        { status: 400 }
      );
    }

    const { conversationId, messageContent } = requestBody;

    // Validate conversation ID
    const conversationValidation = validateConversationId(conversationId);
    if (!conversationValidation.isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    // Validate message content
    const messageValidation = validateMessageContent(messageContent);
    if (!messageValidation.isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid message content" },
        { status: 400 }
      );
    }

    const sanitizedConversationId = conversationValidation.sanitizedData;
    const sanitizedMessageContent = messageValidation.sanitizedData;

    // Get conversation with experience data to determine tenant
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, sanitizedConversationId),
      with: {
        experience: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const experienceId = conversation.experienceId;

    console.log(`Processing message in UserChat for conversation ${sanitizedConversationId}:`, sanitizedMessageContent);

    // Check cache for recent conversation data
    const cacheKey = CacheKeys.conversation(sanitizedConversationId);
    const cachedConversation = cache.get(cacheKey);
    
    if (cachedConversation) {
      console.log("Using cached conversation data");
    }

    // Process user message through simplified funnel system with proper tenant isolation
    const result = await processUserMessage(sanitizedConversationId, sanitizedMessageContent, experienceId);

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
      { success: false, error: "Failed to process message" },
      { status: 500 }
    );
  }
}

