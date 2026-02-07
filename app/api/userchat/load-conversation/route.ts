import { NextRequest, NextResponse } from "next/server";
import { getConversationById, createNextConversationForCompletedFunnel } from "@/lib/actions/simplified-conversation-actions";
import { getConversationMessages, filterMessagesFromWelcomeStage } from "@/lib/actions/unified-message-actions";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels, funnelResources, resources } from "@/lib/supabase/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";
import { isProductCardBlock, getStageNameForBlock } from "@/lib/utils/funnelUtils";
import { updateFunnelGrowthPercentages } from "@/lib/actions/funnel-actions";
import { getConversationTypingState, getAdminAvatarForExperience } from "@/lib/actions/livechat-integration-actions";
import { safeBackgroundTracking, trackInterestBackground } from "@/lib/analytics/background-tracking";

function effectiveLink(r: { link?: string | null; whopProductId?: string | null; purchaseUrl?: string | null }): string {
  const link = (r.link ?? "").trim();
  if (link) return link;
  if (r.whopProductId) return "";
  return (r.purchaseUrl ?? "").trim() || "";
}

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

    // Archived conversations are not loadable in chat; return structured response so client can handle (no 404)
    if (conversation.status === "archived") {
      return NextResponse.json(
        { success: false, code: "ARCHIVED", error: "Conversation is archived" },
        { status: 200 }
      );
    }

    // Verify conversation belongs to the requesting user (same experience and whopUserId)
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });
    if (!experience || conversation.experienceId !== experience.id || conversation.whopUserId !== user.userId) {
      return NextResponse.json(
        { success: false, error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Do not mark as read here: "read by user" is set only when the user actually opens the chat (see CustomerView and chat page calling POST .../read with side: "user").

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
    const funnelRecord = conversation.funnel as { merchantType?: string } | undefined;
    const isQualification = (funnelRecord?.merchantType ?? "qualification") === "qualification";
    // Qualification: when current block has no outgoing (options: [] or no nextBlockIds), mark conversation closed
    if (
      conversation.status === "active" &&
      isQualification &&
      currentBlockId &&
      funnelFlow?.blocks?.[currentBlockId]
    ) {
      const currentBlock = funnelFlow.blocks[currentBlockId];
      const blockHasNoOutgoing = !(currentBlock.options ?? []).some((o) => o.nextBlockId != null);
      if (blockHasNoOutgoing) {
        await db
          .update(conversations)
          .set({ status: "closed", updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));
        void createNextConversationForCompletedFunnel(
          conversation.experienceId,
          conversation.whopUserId,
          conversation.funnelId,
        );
      }
    }

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
    const isOfferStage = currentBlockId ? isProductCardBlock(currentBlockId, funnelFlow) : false;
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
      
      const currentStageName = currentBlockId ? getStageNameForBlock(currentBlockId, funnelFlow) : "UNKNOWN";
      console.log(`Load-conversation final stage info being returned:`, {
        currentStage: currentStageName,
        isDMFunnelActive,
        isTransitionStage,
        isExperienceQualificationStage: finalIsExperienceQualificationStage,
        breakdown: {
          isExperienceQualificationStage,
          isPainPointQualificationStage,
          isOfferStage
        }
      });

      const funnelRecord = conversation.funnel as { merchantType?: string } | undefined;
      const merchantType = funnelRecord?.merchantType ?? "qualification";

      // Load funnel resources (funnel_resources + flow-referenced) so client can resolve product links
      let funnelResourcesList: Array<{ id: string; name: string; type: string; category: string; link: string; code?: string; description?: string; image?: string; storageUrl?: string; price?: string }> = [];
      if (conversation.funnelId && experience?.id) {
        const funnelResourcesRaw = await db.query.funnelResources.findMany({
          where: eq(funnelResources.funnelId, conversation.funnelId),
          with: { resource: true },
        });
        const resourcesMap = new Map<string, { id: string; name: string; type: string; category: string; link: string; code?: string; description?: string; image?: string; storageUrl?: string; price?: string }>();
        for (const fr of funnelResourcesRaw) {
          const r = (fr as { resource: Record<string, unknown> }).resource;
          if (r && typeof r === "object" && r.id && !resourcesMap.has(String(r.id))) {
            resourcesMap.set(String(r.id), {
              id: String(r.id),
              name: String(r.name ?? ""),
              type: String(r.type ?? "MY_PRODUCTS"),
              category: String(r.category ?? "PAID"),
              link: effectiveLink({
                link: r.link != null ? String(r.link) : null,
                whopProductId: r.whopProductId != null ? String(r.whopProductId) : null,
                purchaseUrl: r.purchaseUrl != null ? String(r.purchaseUrl) : null,
              }),
              code: r.code != null ? String(r.code) : undefined,
              description: r.description != null ? String(r.description) : undefined,
              image: r.image != null ? String(r.image) : undefined,
              storageUrl: r.storageUrl != null ? String(r.storageUrl) : undefined,
              price: r.price != null ? String(r.price) : undefined,
            });
          }
        }
        if (funnelFlow?.blocks && typeof funnelFlow.blocks === "object") {
          const resourceIds = new Set<string>();
          const resourceNames = new Set<string>();
          for (const block of Object.values(funnelFlow.blocks) as { resourceId?: string | null; resourceName?: string | null }[]) {
            const rid = block.resourceId != null ? String(block.resourceId).trim() : "";
            if (rid && !resourcesMap.has(rid)) resourceIds.add(rid);
            const rname = block.resourceName != null ? String(block.resourceName).trim() : "";
            if (rname) resourceNames.add(rname);
          }
          if (resourceIds.size > 0 || resourceNames.size > 0) {
            const conditions = [
              ...(resourceIds.size > 0 ? [inArray(resources.id, [...resourceIds])] : []),
              ...(resourceNames.size > 0 ? [inArray(resources.name, [...resourceNames])] : []),
            ];
            if (conditions.length > 0) {
              const extraResources = await db.query.resources.findMany({
                where: and(
                  eq(resources.experienceId, experience.id),
                  or(...conditions),
                ),
                columns: {
                  id: true,
                  name: true,
                  type: true,
                  category: true,
                  link: true,
                  whopProductId: true,
                  purchaseUrl: true,
                  code: true,
                  description: true,
                  image: true,
                  storageUrl: true,
                  price: true,
                },
              });
              for (const r of extraResources) {
                if (!resourcesMap.has(r.id)) {
                  resourcesMap.set(r.id, {
                    id: r.id,
                    name: r.name,
                    type: r.type,
                    category: r.category,
                    link: effectiveLink(r),
                    code: r.code ?? undefined,
                    description: r.description ?? undefined,
                    image: r.image ?? undefined,
                    storageUrl: r.storageUrl ?? undefined,
                    price: r.price ?? undefined,
                  });
                }
              }
            }
          }
        }
        funnelResourcesList = Array.from(resourcesMap.values());
      }

      const typing = await getConversationTypingState(conversationId);
      const adminAvatar = await getAdminAvatarForExperience(experienceId);
      return NextResponse.json({
        success: true,
        conversation: {
          ...conversationData,
          messages: finalMessages, // Use filtered messages
          userLastReadAt: conversation.userLastReadAt ?? null,
          adminLastReadAt: conversation.adminLastReadAt ?? null,
          typing,
          adminAvatar: adminAvatar ?? null,
        },
        funnelFlow: funnelFlow,
        stageInfo: {
          currentStage: currentStageName,
          isDMFunnelActive: isDMFunnelActive,
          isTransitionStage: isTransitionStage,
          isExperienceQualificationStage: finalIsExperienceQualificationStage,
        },
        merchantType: merchantType,
        resources: funnelResourcesList,
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
