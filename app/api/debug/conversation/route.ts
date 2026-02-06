import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels, messages } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import type { FunnelFlow } from "@/lib/types/funnel";
import { isProductCardBlock } from "@/lib/utils/funnelUtils";

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // Get the conversation with all related data
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        experience: true,
        funnel: true,
        messages: {
          orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    const funnelFlow = conversation.funnel?.flow as FunnelFlow;

    // Debug information
    const debugInfo = {
      conversation: {
        id: conversation.id,
        currentBlockId: conversation.currentBlockId,
        userPath: conversation.userPath,
        status: conversation.status,
        whopUserId: conversation.whopUserId,
        experienceId: conversation.experienceId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      funnel: {
        id: conversation.funnel?.id,
        name: conversation.funnel?.name,
        isDeployed: conversation.funnel?.isDeployed,
      },
      funnelFlow: funnelFlow ? {
        stages: funnelFlow.stages.map(s => ({ name: s.name, blockIds: s.blockIds })),
        blocks: Object.keys(funnelFlow.blocks),
        startBlockId: funnelFlow.startBlockId,
      } : null,
      messages: conversation.messages.map((m: any) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };

    // Stage detection
    const currentBlockId = conversation.currentBlockId;
    const isTransitionStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "TRANSITION" && stage.blockIds.includes(currentBlockId)
    );
    const isExperienceQualificationStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "EXPERIENCE_QUALIFICATION" && stage.blockIds.includes(currentBlockId)
    );
    const isPainPointQualificationStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "PAIN_POINT_QUALIFICATION" && stage.blockIds.includes(currentBlockId)
    );
    const isOfferStage = currentBlockId && funnelFlow ? isProductCardBlock(currentBlockId, funnelFlow) : false;
    const isWelcomeStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "WELCOME" && stage.blockIds.includes(currentBlockId)
    );
    const isValueDeliveryStage = currentBlockId && funnelFlow?.stages.some(
      stage => stage.name === "VALUE_DELIVERY" && stage.blockIds.includes(currentBlockId)
    );

    const stageDetection = {
      currentBlockId,
      isTransitionStage,
      isExperienceQualificationStage,
      isPainPointQualificationStage,
      isOfferStage,
      isWelcomeStage,
      isValueDeliveryStage,
      currentStage: isTransitionStage ? "TRANSITION" : 
                  isExperienceQualificationStage ? "EXPERIENCE_QUALIFICATION" :
                  isPainPointQualificationStage ? "PAIN_POINT_QUALIFICATION" :
                  isOfferStage ? "OFFER" :
                  isWelcomeStage ? "WELCOME" :
                  isValueDeliveryStage ? "VALUE_DELIVERY" : "UNKNOWN",
    };

    return NextResponse.json({
      success: true,
      debugInfo,
      stageDetection,
    });

  } catch (error) {
    console.error("Error debugging conversation:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
