import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, funnelInteractions, resources } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import type { FunnelFlow, FunnelBlock } from "@/lib/types/funnel";
import {
  type AuthContext,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import { safeBackgroundTracking, trackInterestBackground } from "@/lib/analytics/background-tracking";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * Navigate funnel in UserChat - handle option selections and custom inputs
 * This API route processes user interactions and updates conversation state
 */
async function navigateFunnelHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

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

export const POST = withWhopAuth(navigateFunnelHandler);

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
    const updatedConversation = await db
      .update(conversations)
      .set({
        currentBlockId: nextBlockId,
        userPath: [...(conversation.userPath || []), nextBlockId].filter(Boolean),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Track interest when conversation reaches PAIN_POINT_QUALIFICATION stage
    const isPainPointQualificationStage = nextBlockId && funnelFlow.stages.some(
      stage => stage.name === "PAIN_POINT_QUALIFICATION" && stage.blockIds.includes(nextBlockId)
    );
    
    if (isPainPointQualificationStage) {
      console.log(`🚀 [NAVIGATE-FUNNEL] About to track interest for experience ${conversation.experienceId}, funnel ${conversation.funnelId}`);
      safeBackgroundTracking(() => trackInterestBackground(conversation.experienceId, conversation.funnelId));
    }

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
      // Check if this is an OFFER stage block and handle resource lookup
      let formattedMessage = nextBlock.message || "Thank you for your response.";
      
      // Check if this block is in OFFER stage
      const isOfferBlock = nextBlockId ? funnelFlow.stages.some(
        stage => stage.name === 'OFFER' && stage.blockIds.includes(nextBlockId)
      ) : false;
      
      if (isOfferBlock && nextBlock.resourceName) {
        console.log(`[OFFER] Processing OFFER block: ${nextBlockId} with resourceName: ${nextBlock.resourceName}`);
        
        // Ensure we have a resource before proceeding
        let resolvedLink = null;
        
        try {
          // Lookup resource by name and experience
          const resource = await db.query.resources.findFirst({
            where: and(
              eq(resources.name, nextBlock.resourceName),
              eq(resources.experienceId, conversation.experienceId)
            ),
          });
          
          if (resource) {
            console.log(`[OFFER] Found resource: ${resource.name} with link: ${resource.link}`);
            
            // Check if link already has affiliate parameters
            const hasAffiliate = resource.link.includes('app=') || resource.link.includes('ref=');
            
            if (!hasAffiliate) {
              console.log(`[OFFER] Adding affiliate parameters to resource link`);
              
              // Get affiliate app ID (same logic as product-sync)
              let affiliateAppId = conversation.experienceId; // Use experience ID as fallback
              try {
                const whopExperience = await whopSdk.experiences.getExperience({
                  experienceId: conversation.experienceId,
                });
                affiliateAppId = whopExperience.app?.id || conversation.experienceId;
                console.log(`[OFFER] Got affiliate app ID: ${affiliateAppId}`);
              } catch (error) {
                console.log(`[OFFER] Could not get app ID, using experience ID: ${conversation.experienceId}`);
              }
              
              // Add affiliate parameter to the link
              const url = new URL(resource.link);
              url.searchParams.set('app', affiliateAppId);
              resolvedLink = url.toString();
            } else {
              console.log(`[OFFER] Resource link already has affiliate parameters, using as-is`);
              resolvedLink = resource.link;
            }
            
            console.log(`[OFFER] Generated resolved link: ${resolvedLink}`);
            
            // Only replace [LINK] placeholder if we have a resolved link
            if (resolvedLink) {
              const buttonHtml = `<div class="animated-gold-button" data-href="${resolvedLink}">Get Your Free Guide</div>`;
              formattedMessage = formattedMessage.replace('[LINK]', buttonHtml);
              console.log(`[OFFER] Generated button HTML: ${buttonHtml}`);
              console.log(`[OFFER] Final formatted message: ${formattedMessage}`);
            } else {
              console.error(`[OFFER] No resolved link available, keeping [LINK] placeholder`);
            }
          } else {
            console.log(`[OFFER] Resource not found: ${nextBlock.resourceName}`);
            formattedMessage = formattedMessage.replace('[LINK]', '[Resource not found]');
          }
        } catch (error) {
          console.error(`[OFFER] Error processing resource lookup:`, error);
          formattedMessage = formattedMessage.replace('[LINK]', '[Error loading resource]');
        }
      } else if (formattedMessage.includes('[LINK]')) {
        // Handle other blocks that might have [LINK] placeholder
        console.log(`[LINK] Block ${nextBlockId} has [LINK] placeholder but is not OFFER stage - removing placeholder`);
        formattedMessage = formattedMessage.replace('[LINK]', '[Link not available]');
      }
      
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