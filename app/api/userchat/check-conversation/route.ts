import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { getUserContext } from "@/lib/context/user-context";
import {
  type AuthContext,
  createErrorResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";
import { isProductCardBlock } from "@/lib/utils/funnelUtils";
import { findFunnelForTrigger, hasConversationFromFunnel } from "@/lib/helpers/conversation-trigger";
import { createConversation } from "@/lib/actions/simplified-conversation-actions";
import { updateConversationToWelcomeStage } from "@/lib/actions/user-join-actions";


async function checkConversationHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    // Get the full user context
    const userContext = await getUserContext(
      user.userId,
      "", // whopCompanyId is optional for experience-based isolation
      experienceId,
      false, // forceRefresh
    );

    if (!userContext) {
      return createErrorResponse(
        "USER_CONTEXT_NOT_FOUND",
        "User context not found"
      );
    }

    const targetWhopUserId = user.userId;
    
    // Debug logging for authentication
    console.log(`[check-conversation] Debug - experienceId from user context: ${experienceId}`);
    console.log(`[check-conversation] Debug - authenticatedWhopUserId from session: ${targetWhopUserId}`);
    console.log(`[check-conversation] Debug - accessLevel: ${userContext.user.accessLevel}`);

    // Get the experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });
    
    console.log(`[check-conversation] Debug - Found experience:`, {
      id: experience?.id,
      whopExperienceId: experience?.whopExperienceId,
      name: experience?.name
    });

    if (!experience) {
      return NextResponse.json(
        { success: false, error: "Experience not found" },
        { status: 404 }
      );
    }

    // Check for active conversation for this user in this experience
    // Try multiple lookup strategies to handle different Whop User ID formats
    console.log(`[check-conversation] Debug - Looking for conversation with:`);
    console.log(`[check-conversation] Debug - whopUserId: ${targetWhopUserId}`);
    console.log(`[check-conversation] Debug - experience.id (database): ${experience.id}`);
    console.log(`[check-conversation] Debug - experience.whopExperienceId: ${experience.whopExperienceId}`);
    
    let activeConversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.whopUserId, targetWhopUserId),
        eq(conversations.experienceId, experience.id),
        eq(conversations.status, "active")
      ),
      with: {
        funnel: true,
      },
    });
    
    console.log(`[check-conversation] Debug - Primary lookup result:`, {
      found: !!activeConversation,
      conversationId: activeConversation?.id,
      conversationWhopUserId: activeConversation?.whopUserId,
      conversationExperienceId: activeConversation?.experienceId
    });

    // Debug: Check what conversations exist for this user
    const allUserConversations = await db.query.conversations.findMany({
      where: eq(conversations.whopUserId, targetWhopUserId),
      with: {
        experience: true,
      },
    });
    
    console.log(`[check-conversation] Debug - All conversations for user ${targetWhopUserId}:`, 
      allUserConversations.map((conv: any) => ({
        id: conv.id,
        whopUserId: conv.whopUserId,
        experienceId: conv.experienceId,
        experienceWhopId: conv.experience?.whopExperienceId,
        status: conv.status,
        currentBlockId: conv.currentBlockId
      }))
    );

    // Log the result
    if (!activeConversation) {
      console.log(`[check-conversation] Debug - No conversation found for user ${targetWhopUserId} in experience ${experience.id}`);
    } else {
      console.log(`[check-conversation] Debug - Found conversation ${activeConversation.id} for user ${targetWhopUserId}`);
    }

    // Get the funnel flow - either from the conversation's funnel or find a live funnel
    let funnelFlow = null;
    if (activeConversation) {
      // If we have a conversation, get the funnel from the conversation's funnelId
      const conversationFunnel = await db.query.funnels.findFirst({
        where: eq(funnels.id, activeConversation.funnelId),
      });
      if (conversationFunnel) {
        funnelFlow = conversationFunnel.flow as FunnelFlow;
      }
    } else {
      // No active conversation: optionally auto-start one for app_entry so user sees first message when they open chat
      const funnelForAppEntry = await findFunnelForTrigger(experience.id, "app_entry", {
        userId: userContext.user.id,
        whopUserId: targetWhopUserId,
      });
      const alreadyHasConversationFromFunnel =
        funnelForAppEntry?.id != null &&
        (await hasConversationFromFunnel(experience.id, targetWhopUserId, funnelForAppEntry.id));
      if (funnelForAppEntry?.flow && !alreadyHasConversationFromFunnel) {
        const flow = funnelForAppEntry.flow as FunnelFlow;
        try {
          const conversationId = await createConversation(
            experience.id,
            funnelForAppEntry.id,
            targetWhopUserId,
            flow.startBlockId,
            undefined,
            undefined
          );
          await updateConversationToWelcomeStage(conversationId, flow);
          // Re-fetch so we return the new conversation
          activeConversation = await db.query.conversations.findFirst({
            where: and(
              eq(conversations.whopUserId, targetWhopUserId),
              eq(conversations.experienceId, experience.id),
              eq(conversations.status, "active")
            ),
            with: { funnel: true },
          });
          if (activeConversation) {
            const conversationFunnel = await db.query.funnels.findFirst({
              where: eq(funnels.id, activeConversation.funnelId),
            });
            if (conversationFunnel) {
              funnelFlow = conversationFunnel.flow as FunnelFlow;
            }
          }
        } catch (err) {
          console.error("[check-conversation] Error auto-starting conversation:", err);
        }
      }
      // No fallback to "any live funnel"—if no app_entry funnel matched, funnelFlow stays null
    }

    if (!activeConversation) {
      return NextResponse.json({
        success: true,
        hasActiveConversation: false,
        conversation: null,
        funnelFlow: funnelFlow,
        stageInfo: {
          currentStage: funnelFlow ? "NO_CONVERSATION" : "NO_FUNNEL",
          isDMFunnelActive: false,
          isTransitionStage: false,
          isExperienceQualificationStage: false,
        }
      });
    }

    // Use the funnel flow we already retrieved

    // Determine conversation stage and status
    const currentBlockId = activeConversation.currentBlockId;
    
    // Debug logging
    console.log(`Checking conversation stage for blockId: ${currentBlockId}`);
    console.log(`Available stages:`, funnelFlow?.stages.map(s => ({ name: s.name, blockIds: s.blockIds })));
    console.log(`Available blocks:`, Object.keys(funnelFlow?.blocks || {}));
    console.log(`Current block details:`, funnelFlow?.blocks[currentBlockId || ''] || 'Block not found');
    
    const isTransitionStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlockId)
    );
    const isExperienceQualificationStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "EXPERIENCE_QUALIFICATION" && stage.blockIds.includes(currentBlockId)
    );
    const isWelcomeStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "WELCOME" && stage.blockIds.includes(currentBlockId)
    );
    const isValueDeliveryStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(currentBlockId)
    );
    const isPainPointQualificationStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "PAIN_POINT_QUALIFICATION" && stage.blockIds.includes(currentBlockId)
    );
    const isOfferStage = currentBlockId && funnelFlow ? isProductCardBlock(currentBlockId, funnelFlow) : false;

    // Check if conversation is in UserChat phase (all stages are UserChat now)
    const isDMFunnelActive = false; // No more DM funnel - everything is UserChat
    
    // Debug logging
    console.log(`Stage detection results:`, {
      isTransitionStage,
      isExperienceQualificationStage,
      isWelcomeStage,
      isValueDeliveryStage,
      isPainPointQualificationStage,
      isOfferStage,
      isDMFunnelActive
    });

    // Determine the current stage with better fallback logic
    let currentStage = "UNKNOWN";
    if (isTransitionStage) {
      currentStage = "TRANSITION";
    } else if (isExperienceQualificationStage) {
      currentStage = "EXPERIENCE_QUALIFICATION";
    } else if (isPainPointQualificationStage) {
      currentStage = "PAIN_POINT_QUALIFICATION";
    } else if (isOfferStage) {
      currentStage = "OFFER";
    } else if (isWelcomeStage) {
      currentStage = "WELCOME";
    } else if (isValueDeliveryStage) {
      currentStage = "VALUE_DELIVERY";
    } else if (currentBlockId && funnelFlow) {
      // If we have a blockId but it's not in any stage, it might be a custom block
      // Check if it's in the funnel flow at all
      const blockExists = funnelFlow.blocks[currentBlockId];
      if (blockExists) {
        currentStage = "CUSTOM_BLOCK";
      } else {
        currentStage = "INVALID_BLOCK";
      }
    }

    const finalIsExperienceQualificationStage = isExperienceQualificationStage || isPainPointQualificationStage || isOfferStage;
    
    console.log(`Final stage info being returned:`, {
      currentStage,
      isDMFunnelActive,
      isTransitionStage,
      isExperienceQualificationStage: finalIsExperienceQualificationStage,
      breakdown: {
        isExperienceQualificationStage,
        isPainPointQualificationStage,
        isOfferStage
      }
    });

    // Use conversation's custom flow if available, otherwise use original funnel flow
    let finalFunnelFlow = funnelFlow;
    if (activeConversation?.flow) {
      console.log(`[check-conversation] Using conversation's custom flow for conversation ${activeConversation.id}`);
      finalFunnelFlow = activeConversation.flow as FunnelFlow;
    }

    const funnelRecord = activeConversation.funnel as { merchantType?: string } | undefined;
    const merchantType = funnelRecord?.merchantType ?? "qualification";

    return NextResponse.json({
      success: true,
      hasActiveConversation: true,
      conversation: {
        id: activeConversation.id,
        currentBlockId: activeConversation.currentBlockId,
        status: activeConversation.status,
        createdAt: activeConversation.createdAt,
        updatedAt: activeConversation.updatedAt,
      },
      funnelFlow: finalFunnelFlow,
      stageInfo: {
        currentStage: currentStage,
        isDMFunnelActive: isDMFunnelActive,
        isTransitionStage: isTransitionStage,
        isExperienceQualificationStage: finalIsExperienceQualificationStage,
      },
      merchantType: merchantType,
    });

  } catch (error) {
    console.error("Error checking conversation:", error);
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

// Export the protected route handler
export const POST = withWhopAuth(checkConversationHandler);
