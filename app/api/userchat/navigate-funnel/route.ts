import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, funnelInteractions } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import type { FunnelFlow, FunnelBlock } from "@/lib/types/funnel";
import { parseUserPath, createUpdatedUserPath } from "@/lib/constants/error-messages";

/**
 * Navigate funnel in UserChat - handle option selections and custom inputs
 * This API route processes user interactions and updates conversation state
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, navigationData } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!navigationData) {
      return NextResponse.json(
        { error: "Navigation data is required" },
        { status: 400 }
      );
    }

    console.log(`Navigating funnel for conversation ${conversationId}:`, navigationData);

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

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.funnel?.flow) {
      return NextResponse.json(
        { error: "Funnel flow not found" },
        { status: 404 }
      );
    }

    const funnelFlow = conversation.funnel.flow as FunnelFlow;

    // Process the navigation
    const result = await processFunnelNavigation(
      conversationId,
      navigationData,
      funnelFlow,
      conversation
    );

    return NextResponse.json({
      success: true,
      conversation: result.conversation,
      nextBlockId: result.nextBlockId,
      botMessage: result.botMessage,
    });

  } catch (error) {
    console.error("Error navigating funnel:", error);
    return NextResponse.json(
      { error: "Failed to navigate funnel" },
      { status: 500 }
    );
  }
}

/**
 * Process funnel navigation and update conversation state
 */
async function processFunnelNavigation(
  conversationId: string,
  navigationData: {
    text: string;
    value: string;
    blockId: string;
  },
  funnelFlow: FunnelFlow,
  conversation: any
): Promise<{
  conversation: any;
  nextBlockId: string | null;
  botMessage: string | null;
}> {
  try {
    const { text, value, blockId } = navigationData;
    const currentBlockId = blockId || conversation.currentBlockId;

    // Find the current block
    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) {
      throw new Error(`Current block ${currentBlockId} not found`);
    }

    // Debug: Log available options
    console.log(`Available options in block ${currentBlockId}:`, currentBlock.options?.map(opt => opt.text));
    console.log(`Looking for option: "${text}"`);

    // Find the selected option with better matching
    const selectedOption = currentBlock.options?.find(opt => {
      const optionText = opt.text.toLowerCase().trim();
      const searchText = text.toLowerCase().trim();
      const searchValue = value.toLowerCase().trim();
      
      return optionText === searchText || 
             optionText === searchValue ||
             optionText.includes(searchText) ||
             searchText.includes(optionText);
    });

    if (!selectedOption) {
      console.error(`Option "${text}" not found in block ${currentBlockId}`);
      console.error(`Available options:`, currentBlock.options?.map(opt => `"${opt.text}"`));
      throw new Error(`Option "${text}" not found in block ${currentBlockId}. Available options: ${currentBlock.options?.map(opt => opt.text).join(', ')}`);
    }

    const nextBlockId = selectedOption.nextBlockId;
    const nextBlock = nextBlockId ? funnelFlow.blocks[nextBlockId] : null;

    // Record the funnel interaction
    await db.insert(funnelInteractions).values({
      conversationId: conversationId,
      blockId: currentBlockId,
      optionText: text,
      optionValue: value,
      nextBlockId: nextBlockId,
      metadata: {
        timestamp: new Date().toISOString(),
        userChoice: true,
      },
    });

    // Update conversation state
    // Parse existing userPath to preserve metadata
    const currentUserPath = parseUserPath(conversation.userPath);
    const updatedUserPath = createUpdatedUserPath(currentUserPath, 0); // Reset invalid response count
    if (nextBlockId) {
      updatedUserPath.path.push(nextBlockId); // Add new block to path
    }
    
    const updatedConversation = await db
      .update(conversations)
      .set({
        currentBlockId: nextBlockId,
        userPath: updatedUserPath,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Record user message
    await db.insert(messages).values({
      conversationId: conversationId,
      type: "user",
      content: text,
      metadata: {
        blockId: currentBlockId,
        optionSelected: true,
        timestamp: new Date().toISOString(),
      },
    });

    // Generate bot response
    let botMessage = null;
    if (nextBlock) {
      // Format bot message with options if available
      let formattedMessage = nextBlock.message || "Thank you for your response.";
      
      if (nextBlock.options && nextBlock.options.length > 0) {
        const numberedOptions = nextBlock.options
          .map((opt: any, index: number) => `${index + 1}. ${opt.text}`)
          .join("\n");
        formattedMessage = `${formattedMessage}\n\n${numberedOptions}`;
      }

      botMessage = formattedMessage;

      // Record bot message
      await db.insert(messages).values({
        conversationId: conversationId,
        type: "bot",
        content: formattedMessage,
        metadata: {
          blockId: nextBlockId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      conversation: updatedConversation[0],
      nextBlockId,
      botMessage,
    };

  } catch (error) {
    console.error("Error processing funnel navigation:", error);
    throw error;
  }
}