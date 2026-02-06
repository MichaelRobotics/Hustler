import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";
import { isProductCardBlock } from "@/lib/utils/funnelUtils";

/**
 * POST /api/userchat/offer-cta-clicked
 * Records that the customer clicked the offer CTA (e.g. "Get Started!") so the
 * upsell/downsell timer starts. Backend sets offerCtaClickedAt and offerCtaBlockId.
 * Cron will later resolve to upsell or downsell based on purchase and timeoutMinutes.
 */
async function offerCtaClickedHandler(
  request: NextRequest,
  context: AuthContext,
) {
  try {
    const { user } = context;
    const whopExperienceId = user.experienceId;

    if (!whopExperienceId) {
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required",
      );
    }

    const body = await request.json();
    const { conversationId, blockId } = body as { conversationId?: string; blockId?: string };

    if (!conversationId || !blockId) {
      return createErrorResponse(
        "MISSING_PARAMS",
        "conversationId and blockId are required",
      );
    }

    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, whopExperienceId),
      columns: { id: true },
    });

    if (!experience) {
      return createErrorResponse(
        "EXPERIENCE_NOT_FOUND",
        "Experience not found",
      );
    }

    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experience.id),
      ),
      with: { funnel: { columns: { flow: true } } },
      columns: {
        id: true,
        experienceId: true,
        flow: true,
      },
    });

    if (!conversation) {
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found",
      );
    }

    const funnelFlow = (conversation.flow as FunnelFlow) ?? (conversation.funnel?.flow as FunnelFlow);
    if (!funnelFlow?.blocks) {
      return createErrorResponse(
        "FLOW_NOT_FOUND",
        "Funnel flow not found",
      );
    }

    const block = funnelFlow.blocks[blockId];
    if (!block) {
      return createErrorResponse(
        "BLOCK_NOT_FOUND",
        "Block not found",
      );
    }

    const isOfferStage = isProductCardBlock(blockId, funnelFlow);
    const hasTimeout = typeof block.timeoutMinutes === "number" && block.timeoutMinutes > 0;
    const hasUpsellOrDownsell = !!(block.upsellBlockId || block.downsellBlockId);

    if (!isOfferStage || !hasTimeout || !hasUpsellOrDownsell) {
      return createErrorResponse(
        "INVALID_BLOCK",
        "Block must be an OFFER block with timeoutMinutes and upsell or downsell target",
      );
    }

    const now = new Date();
    await db
      .update(conversations)
      .set({
        offerCtaClickedAt: now,
        offerCtaBlockId: blockId,
        updatedAt: now,
      })
      .where(eq(conversations.id, conversationId));

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error("[offer-cta-clicked] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const POST = withWhopAuth(offerCtaClickedHandler);
