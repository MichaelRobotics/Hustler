import { NextRequest, NextResponse } from "next/server";
import { processUserMessage } from "@/lib/actions/simplified-conversation-actions";

/**
 * Process user message in UserChat and trigger funnel navigation
 * This API route handles the gap between WebSocket messages and funnel processing
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageContent } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!messageContent) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    console.log(`Processing message in UserChat for conversation ${conversationId}:`, messageContent);

    // Process user message through simplified funnel system
    const result = await processUserMessage(conversationId, messageContent);

    return NextResponse.json({
      success: result.success,
      funnelResponse: result,
    });

  } catch (error) {
    console.error("Error processing message in UserChat:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

