import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, funnelInteractions } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import type { FunnelFlow, FunnelBlock } from "@/lib/types/funnel";

/**
 * Process user message in UserChat and trigger funnel navigation
 * This API route handles the gap between WebSocket messages and funnel processing
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageContent, messageType = "user" } = await request.json();

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

    // Get conversation with funnel data
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        funnel: true,
        messages: {
          orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
        },
      },
    });

    // Debug logging for message processing
    console.log('Processing message for conversation:', conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.funnel) {
      console.log('No funnel found for conversation:', conversationId);
      return NextResponse.json(
        { error: "Funnel not found for conversation" },
        { status: 404 }
      );
    }

    if (!conversation.funnel.flow) {
      console.log('No funnel flow found for funnel:', conversation.funnel.id);
      return NextResponse.json(
        { error: "Funnel flow not found" },
        { status: 404 }
      );
    }

    const funnelFlow = conversation.funnel.flow as FunnelFlow;

    // Funnel flow loaded successfully

    // Create the user message in database
    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId: conversationId,
        type: messageType,
        content: messageContent,
        metadata: {
          processed: true,
          timestamp: new Date().toISOString(),
        },
      })
      .returning();

    // Process user response through funnel system
    const result = await processUserResponseThroughFunnel(
      conversationId,
      messageContent,
      funnelFlow,
      conversation.currentBlockId,
      conversation
    );

    return NextResponse.json({
      success: true,
      message: newMessage,
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

/**
 * Process user response through the funnel system
 * Similar to DM monitoring but for UserChat
 */
async function processUserResponseThroughFunnel(
  conversationId: string,
  userMessage: string,
  funnelFlow: FunnelFlow,
  currentBlockId: string | null,
  conversation: any
): Promise<{ success: boolean; nextBlockId?: string; botMessage?: string; error?: string }> {
  try {
    // Processing user response through funnel system

    if (!currentBlockId) {
      console.log('No current block ID found');
      return {
        success: false,
        error: "No current block ID found",
      };
    }

    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) {
      return {
        success: false,
        error: `Current block ${currentBlockId} not found in funnel`,
      };
    }

    // Validate user response
    const validationResult = validateUserResponse(userMessage, currentBlock);

    if (!validationResult.isValid) {
      // Handle invalid response
      const errorMessage = "Please choose from the provided options above.";
      
      // Create bot error message
      await db.insert(messages).values({
        conversationId: conversationId,
        type: "bot",
        content: errorMessage,
        metadata: {
          type: "error_response",
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        botMessage: errorMessage,
      };
    }

    // Navigate to next block
    if (validationResult.selectedOption) {
      const nextBlockId = validationResult.selectedOption.nextBlockId;
      const nextBlock = funnelFlow.blocks[nextBlockId];

      if (!nextBlock) {
        return {
          success: false,
          error: `Next block ${nextBlockId} not found`,
        };
      }

      // Update conversation state
      await db
        .update(conversations)
        .set({
          currentBlockId: nextBlockId,
          userPath: [...(conversation.userPath || []), nextBlockId],
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));

      // Create funnel interaction record
      await db.insert(funnelInteractions).values({
        conversationId: conversationId,
        blockId: currentBlockId,
        optionText: validationResult.selectedOption.text,
        nextBlockId: nextBlockId,
      });

      // Generate bot response
      const botMessage = generateBotResponse(nextBlock, funnelFlow);

      // Create bot message
      await db.insert(messages).values({
        conversationId: conversationId,
        type: "bot",
        content: botMessage,
        metadata: {
          blockId: nextBlockId,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        success: true,
        nextBlockId: nextBlockId,
        botMessage: botMessage,
      };
    }

    return {
      success: false,
      error: "No valid option selected",
    };

  } catch (error) {
    console.error("Error processing user response through funnel:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: `Failed to process response: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Validate user response against current funnel block options
 */
function validateUserResponse(userMessage: string, currentBlock: FunnelBlock): {
  isValid: boolean;
  selectedOption?: { text: string; value: string; nextBlockId: string };
} {
  if (!currentBlock.options || currentBlock.options.length === 0) {
    return { isValid: false };
  }

  // Check for exact text match
  const exactMatch = currentBlock.options.find(
    option => option.text.toLowerCase() === userMessage.toLowerCase()
  );
  if (exactMatch) {
    return {
      isValid: true,
      selectedOption: {
        text: exactMatch.text,
        value: exactMatch.text, // Use text as value
        nextBlockId: exactMatch.nextBlockId || "",
      },
    };
  }

  // Check for number selection (e.g., "1", "2", "3")
  const numberMatch = /^(\d+)$/.exec(userMessage.trim());
  if (numberMatch) {
    const optionIndex = parseInt(numberMatch[1]) - 1;
    if (optionIndex >= 0 && optionIndex < currentBlock.options.length) {
      const selectedOption = currentBlock.options[optionIndex];
      return {
        isValid: true,
        selectedOption: {
          text: selectedOption.text,
          value: selectedOption.text, // Use text as value
          nextBlockId: selectedOption.nextBlockId || "",
        },
      };
    }
  }

  // Check for partial text match
  const partialMatch = currentBlock.options.find(option =>
    option.text.toLowerCase().includes(userMessage.toLowerCase()) ||
    userMessage.toLowerCase().includes(option.text.toLowerCase())
  );
  if (partialMatch) {
    return {
      isValid: true,
      selectedOption: {
        text: partialMatch.text,
        value: partialMatch.text, // Use text as value
        nextBlockId: partialMatch.nextBlockId || "",
      },
    };
  }

  return { isValid: false };
}

/**
 * Generate bot response for the next block
 */
function generateBotResponse(block: FunnelBlock, funnelFlow: FunnelFlow): string {
  let response = block.message || "";

  // Add options if available
  if (block.options && block.options.length > 0) {
    response += "\n\nAnswer by pasting one of those numbers\n";
    block.options.forEach((option, index) => {
      response += `${index + 1}. ${option.text}\n`;
    });
  }

  return response;
}
