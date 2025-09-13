import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import type { FunnelFlow } from "@/lib/types/funnel";

export async function POST(request: NextRequest) {
  try {
    const { experienceId, whopUserId } = await request.json();

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    // Get the current user's Whop ID using proper authentication
    const headersList = await headers();
    const { userId: authenticatedWhopUserId } = await whopSdk.verifyUserToken(headersList);
    
    if (!authenticatedWhopUserId) {
      return NextResponse.json(
        { error: "User authentication required" },
        { status: 401 }
      );
    }

    // Use the provided whopUserId or fall back to authenticated user
    const targetWhopUserId = whopUserId || authenticatedWhopUserId;

    // Get the experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return NextResponse.json(
        { success: false, error: "Experience not found" },
        { status: 404 }
      );
    }

    // Check for active conversation for this user in this experience
    const activeConversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.whopUserId, targetWhopUserId),
        eq(conversations.experienceId, experience.id),
        eq(conversations.status, "active")
      ),
      with: {
        funnel: true,
      },
    });

    // Get the live funnel for this experience (needed even when no conversation exists)
    const liveFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.experienceId, experience.id),
        eq(funnels.isDeployed, true)
      ),
    });

    // Handle case where no live funnel exists
    let funnelFlow = null;
    if (liveFunnel) {
      funnelFlow = liveFunnel.flow as FunnelFlow;
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
    const isOfferStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "OFFER" && stage.blockIds.includes(currentBlockId)
    );

    // Check if conversation is in DM funnel phase (between WELCOME and VALUE_DELIVERY)
    const isDMFunnelActive = (isWelcomeStage || isValueDeliveryStage) && !isTransitionStage && !isExperienceQualificationStage;
    
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
      funnelFlow: funnelFlow,
      stageInfo: {
        currentStage: currentStage,
        isDMFunnelActive: isDMFunnelActive,
        isTransitionStage: isTransitionStage,
        isExperienceQualificationStage: finalIsExperienceQualificationStage,
      }
    });

  } catch (error) {
    console.error("Error checking conversation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
