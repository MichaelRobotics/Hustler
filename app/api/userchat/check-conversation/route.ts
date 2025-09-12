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

    if (!activeConversation) {
      return NextResponse.json({
        success: true,
        hasActiveConversation: false,
        conversation: null,
        stageInfo: {
          currentStage: "NO_CONVERSATION",
          isDMFunnelActive: false,
          isTransitionStage: false,
          isExperienceQualificationStage: false,
        }
      });
    }

    // Get the funnel flow to check stages
    const funnelFlow = activeConversation.funnel?.flow as FunnelFlow;
    if (!funnelFlow) {
      return NextResponse.json(
        { success: false, error: "Funnel flow not found" },
        { status: 404 }
      );
    }

    // Determine conversation stage and status
    const currentBlockId = activeConversation.currentBlockId;
    const isTransitionStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlockId)
    );
    const isExperienceQualificationStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "EXPERIENCE_QUALIFICATION" && stage.blockIds.includes(currentBlockId)
    );
    const isWelcomeStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "WELCOME" && stage.blockIds.includes(currentBlockId)
    );
    const isValueDeliveryStage = currentBlockId && funnelFlow.stages.some(
      stage => stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(currentBlockId)
    );

    // Check if conversation is in DM funnel phase (between WELCOME and VALUE_DELIVERY)
    const isDMFunnelActive = (isWelcomeStage || isValueDeliveryStage) && !isTransitionStage && !isExperienceQualificationStage;

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
        currentStage: isTransitionStage ? "TRANSITION" : 
                    isExperienceQualificationStage ? "EXPERIENCE_QUALIFICATION" :
                    isWelcomeStage ? "WELCOME" :
                    isValueDeliveryStage ? "VALUE_DELIVERY" : "UNKNOWN",
        isDMFunnelActive: isDMFunnelActive,
        isTransitionStage: isTransitionStage,
        isExperienceQualificationStage: isExperienceQualificationStage,
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
