import { NextRequest, NextResponse } from "next/server";
import { getConversationById } from "@/lib/actions/simplified-conversation-actions";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels, messages } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import type { FunnelFlow } from "@/lib/types/funnel";

export async function POST(request: NextRequest) {
  try {
    const { conversationId, experienceId, whopUserId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Get the conversation to find the correct experience ID
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        experience: true,
        funnel: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get the funnel flow to check stages
    const funnelFlow = conversation.funnel?.flow as FunnelFlow;
    if (!funnelFlow) {
      return NextResponse.json(
        { success: false, error: "Funnel flow not found" },
        { status: 404 }
      );
    }

    // Determine conversation stage and status
    const currentBlockId = conversation.currentBlockId;
    
    // Debug logging
    console.log(`Load-conversation API - Conversation ${conversationId}:`);
    console.log(`  Current blockId: ${currentBlockId}`);
    console.log(`  Available stages:`, funnelFlow.stages.map(s => ({ name: s.name, blockIds: s.blockIds })));
    
    const isTransitionStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlockId)
    );
    const isExperienceQualificationStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "EXPERIENCE_QUALIFICATION" && stage.blockIds.includes(currentBlockId)
    );
    const isPainPointQualificationStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "PAIN_POINT_QUALIFICATION" && stage.blockIds.includes(currentBlockId)
    );
    const isOfferStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "OFFER" && stage.blockIds.includes(currentBlockId)
    );
    const isWelcomeStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "WELCOME" && stage.blockIds.includes(currentBlockId)
    );
    const isValueDeliveryStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(currentBlockId)
    );
    
    // Debug logging
    console.log(`  Stage detection results:`, {
      isTransitionStage,
      isExperienceQualificationStage,
      isPainPointQualificationStage,
      isOfferStage,
      isWelcomeStage,
      isValueDeliveryStage
    });

    // Check if conversation is in DM funnel phase (between WELCOME and VALUE_DELIVERY)
    const isDMFunnelActive = (isWelcomeStage || isValueDeliveryStage) && !isTransitionStage && !isExperienceQualificationStage;

    // Handle TRANSITION stage - automatically transition to EXPERIENCE_QUALIFICATION
    if (isTransitionStage) {
      console.log(`Conversation ${conversationId} is in TRANSITION stage, transitioning to EXPERIENCE_QUALIFICATION`);
      
      // Find the first EXPERIENCE_QUALIFICATION block
      const experienceQualificationStage = funnelFlow.stages.find(
        stage => stage.name === "EXPERIENCE_QUALIFICATION"
      );
      
      if (experienceQualificationStage && experienceQualificationStage.blockIds.length > 0) {
        const firstExperienceBlockId = experienceQualificationStage.blockIds[0];
        
        // Use a transaction to prevent race conditions
        await db.transaction(async (tx: any) => {
          // First, check if conversation is still in TRANSITION stage (double-check)
          const currentConversation = await tx.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
          });
          
          if (currentConversation?.currentBlockId === currentBlockId) {
            // Update conversation to EXPERIENCE_QUALIFICATION stage
            await tx
              .update(conversations)
              .set({
                currentBlockId: firstExperienceBlockId,
                userPath: [...(conversation.userPath || []), firstExperienceBlockId],
                updatedAt: new Date(),
              })
              .where(eq(conversations.id, conversationId));

            // Add the EXPERIENCE_QUALIFICATION agent message (only if it doesn't already exist)
            const experienceBlock = funnelFlow.blocks[firstExperienceBlockId];
            if (experienceBlock?.message) {
              // Check if this message already exists to prevent duplicates
              const existingMessage = await tx.query.messages.findFirst({
                where: and(
                  eq(messages.conversationId, conversationId),
                  eq(messages.type, "bot"),
                  eq(messages.content, experienceBlock.message)
                ),
              });
              
              if (!existingMessage) {
                await tx.insert(messages).values({
                  conversationId: conversationId,
                  type: "bot",
                  content: experienceBlock.message,
                });
                console.log(`Added EXPERIENCE_QUALIFICATION message for conversation ${conversationId}`);
              } else {
                console.log(`EXPERIENCE_QUALIFICATION message already exists for conversation ${conversationId}`);
              }
            }
          } else {
            console.log(`Conversation ${conversationId} is no longer in TRANSITION stage, skipping transition`);
          }
        });

        // Reload the updated conversation
        const updatedConversation = await getConversationById(conversationId, conversation.experienceId);
        if (updatedConversation) {
          return NextResponse.json({
            success: true,
            conversation: updatedConversation,
            funnelFlow: funnelFlow,
            stageInfo: {
              currentStage: "EXPERIENCE_QUALIFICATION",
              isDMFunnelActive: false,
              isTransitionStage: false,
              isExperienceQualificationStage: true,
            }
          });
        }
      }
    }

    // Load the conversation data
    const conversationData = await getConversationById(conversationId, conversation.experienceId);

    if (conversationData) {
      const finalIsExperienceQualificationStage = isExperienceQualificationStage || isPainPointQualificationStage || isOfferStage;
      
      console.log(`Load-conversation final stage info being returned:`, {
        currentStage: isTransitionStage ? "TRANSITION" : 
                    isExperienceQualificationStage ? "EXPERIENCE_QUALIFICATION" :
                    isPainPointQualificationStage ? "PAIN_POINT_QUALIFICATION" :
                    isOfferStage ? "OFFER" :
                    isWelcomeStage ? "WELCOME" :
                    isValueDeliveryStage ? "VALUE_DELIVERY" : "UNKNOWN",
        isDMFunnelActive,
        isTransitionStage,
        isExperienceQualificationStage: finalIsExperienceQualificationStage,
        breakdown: {
          isExperienceQualificationStage,
          isPainPointQualificationStage,
          isOfferStage
        }
      });

      return NextResponse.json({
        success: true,
        conversation: conversationData,
        funnelFlow: funnelFlow,
        stageInfo: {
          currentStage: isTransitionStage ? "TRANSITION" : 
                      isExperienceQualificationStage ? "EXPERIENCE_QUALIFICATION" :
                      isPainPointQualificationStage ? "PAIN_POINT_QUALIFICATION" :
                      isOfferStage ? "OFFER" :
                      isWelcomeStage ? "WELCOME" :
                      isValueDeliveryStage ? "VALUE_DELIVERY" : "UNKNOWN",
          isDMFunnelActive: isDMFunnelActive,
          isTransitionStage: isTransitionStage,
          isExperienceQualificationStage: finalIsExperienceQualificationStage,
        }
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to load conversation" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error loading conversation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
