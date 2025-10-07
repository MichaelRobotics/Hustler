import { NextRequest, NextResponse } from "next/server";
import { getConversationById } from "@/lib/actions/simplified-conversation-actions";
import { getConversationMessages, filterMessagesFromWelcomeStage } from "@/lib/actions/unified-message-actions";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels, messages, funnelAnalytics } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";
import { updateFunnelGrowthPercentages } from "@/lib/actions/funnel-actions";
import { safeBackgroundTracking, trackInterestBackground } from "@/lib/analytics/background-tracking";

async function loadConversationHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const { conversationId, userType } = await request.json();

    if (!conversationId) {
      return createErrorResponse(
        "MISSING_CONVERSATION_ID",
        "Conversation ID is required"
      );
    }

    const experienceId = user.experienceId;
    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Determine if this is a customer request (for message filtering)
    const isCustomerRequest = userType === "customer";
    console.log(`[load-conversation] Request type: ${userType}, isCustomerRequest: ${isCustomerRequest}`);

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

    // Debug logging for conversation details
    console.log(`[load-conversation] Debug - Conversation ${conversationId} found:`);
    console.log(`[load-conversation] Debug - whopUserId: ${conversation.whopUserId}`);
    console.log(`[load-conversation] Debug - currentBlockId: ${conversation.currentBlockId}`);
    console.log(`[load-conversation] Debug - experienceId: ${conversation.experienceId}`);

    // Use conversation's custom flow if available, otherwise use original funnel flow
    let funnelFlow: FunnelFlow;
    if (conversation.flow) {
      console.log(`[load-conversation] Using conversation's custom flow for conversation ${conversationId}`);
      funnelFlow = conversation.flow as FunnelFlow;
    } else if (conversation.funnel?.flow) {
      console.log(`[load-conversation] Using original funnel flow for conversation ${conversationId}`);
      funnelFlow = conversation.funnel.flow as FunnelFlow;
    } else {
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

		// Track interest when user reaches PAIN_POINT_QUALIFICATION stage - BACKGROUND PROCESSING
		if (isPainPointQualificationStage) {
			console.log(`🚀 [LOAD-CONVERSATION] About to track interest for experience ${conversation.experienceId}, funnel ${conversation.funnelId}`);
			safeBackgroundTracking(() => trackInterestBackground(conversation.experienceId, conversation.funnelId));
		}

    // Check if conversation is in UserChat phase (all stages are UserChat now)
    const isDMFunnelActive = false; // No more DM funnel - everything is UserChat


    // Load the conversation data
    const conversationData = await getConversationById(conversationId, conversation.experienceId);

    if (conversationData) {
      // Load unified messages using the single source of truth
      const unifiedMessages = await getConversationMessages(
        conversationId,
        conversation.experienceId,
        conversation.whopUserId
      );

      // Apply customer filtering if this is a customer request
      const finalMessages = isCustomerRequest 
        ? filterMessagesFromWelcomeStage(unifiedMessages, funnelFlow)
        : unifiedMessages;

      console.log(`[load-conversation] Message filtering: ${unifiedMessages.length} -> ${finalMessages.length} (customer: ${isCustomerRequest})`);

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
        conversation: {
          ...conversationData,
          messages: finalMessages, // Use filtered messages
        },
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
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Failed to load conversation"
      );
    }
  } catch (error) {
    console.error("Error loading conversation:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

// Tracking functions removed to prevent database conflicts and timeouts

// Export the protected route handler
export const POST = withWhopAuth(loadConversationHandler);
