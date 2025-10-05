import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, experiences, funnels, resources } from "@/lib/supabase/schema";
import { eq, and, or } from "drizzle-orm";
import { getUserContext } from "@/lib/context/user-context";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { FunnelFlow } from "@/lib/types/funnel";

/**
 * Validate WELCOME stage options against product_apps from conversation's whop_product_id
 * This ensures that options in WELCOME stage only lead to blocks with resourceName
 * that matches one of the app names from the product_apps field of the resource
 * that matches the conversation's whop_product_id
 */
async function validateWelcomeOptions(
  funnelFlow: FunnelFlow,
  conversation: any,
  experienceId: string
): Promise<{ isValid: boolean; filteredOptions?: any[]; validationLog?: string[] }> {
  const validationLog: string[] = [];
  
  try {
    // Check if we have a whop_product_id in the conversation
    if (!conversation.whopProductId) {
      validationLog.push("⚠️ No whop_product_id found in conversation - skipping validation");
      return { isValid: true, validationLog };
    }

    // Find the resource that matches the conversation's whop_product_id
    const matchingResource = await db.query.resources.findFirst({
      where: and(
        eq(resources.whopProductId, conversation.whopProductId),
        eq(resources.experienceId, experienceId)
      ),
      columns: {
        id: true,
        name: true,
        productApps: true,
        whopProductId: true
      }
    });

    if (!matchingResource) {
      validationLog.push(`⚠️ No resource found with whop_product_id: ${conversation.whopProductId} - skipping validation`);
      return { isValid: true, validationLog };
    }

    validationLog.push(`✅ Found matching resource: ${matchingResource.name} (ID: ${matchingResource.id})`);
    validationLog.push(`📱 Product apps: ${JSON.stringify(matchingResource.productApps)}`);

    // Get product_apps array from the resource
    const productApps = matchingResource.productApps as string[] || [];
    if (productApps.length === 0) {
      validationLog.push("⚠️ No product_apps found in resource - skipping validation");
      return { isValid: true, validationLog };
    }

    // Find WELCOME stage blocks
    const welcomeStage = funnelFlow.stages.find(stage => stage.name === "WELCOME");
    if (!welcomeStage) {
      validationLog.push("⚠️ No WELCOME stage found in funnel flow - skipping validation");
      return { isValid: true, validationLog };
    }

    validationLog.push(`🎯 WELCOME stage blocks: ${welcomeStage.blockIds.join(', ')}`);

    // Check each WELCOME block's options
    const filteredOptions: any[] = [];
    let hasValidOptions = false;

    for (const blockId of welcomeStage.blockIds) {
      const block = funnelFlow.blocks[blockId];
      if (!block || !block.options) continue;

      validationLog.push(`🔍 Checking block ${blockId} with ${block.options.length} options`);

      for (const option of block.options) {
        const targetBlockId = option.nextBlockId;
        
        if (!targetBlockId) {
          validationLog.push(`❌ Option "${option.text}" has no nextBlockId`);
          continue;
        }
        
        const targetBlock = funnelFlow.blocks[targetBlockId];
        
        if (!targetBlock) {
          validationLog.push(`❌ Option "${option.text}" leads to non-existent block: ${targetBlockId}`);
          continue;
        }

        // Check if target block has resourceName
        if (!targetBlock.resourceName) {
          validationLog.push(`⚠️ Option "${option.text}" leads to block ${targetBlockId} without resourceName - allowing`);
          filteredOptions.push(option);
          hasValidOptions = true;
          continue;
        }

        // Check if resourceName matches any of the product_apps
        const resourceNameMatches = productApps.some(appName => 
          appName.toLowerCase().trim() === (targetBlock.resourceName || '').toLowerCase().trim()
        );

        if (resourceNameMatches) {
          validationLog.push(`✅ Option "${option.text}" -> "${targetBlock.resourceName}" matches product_apps`);
          filteredOptions.push(option);
          hasValidOptions = true;
        } else {
          validationLog.push(`❌ Option "${option.text}" -> "${targetBlock.resourceName}" does NOT match product_apps: [${productApps.join(', ')}]`);
        }
      }
    }

    validationLog.push(`📊 Validation result: ${hasValidOptions ? 'VALID' : 'INVALID'} (${filteredOptions.length} valid options)`);
    
    return {
      isValid: hasValidOptions,
      filteredOptions: hasValidOptions ? filteredOptions : undefined,
      validationLog
    };

  } catch (error) {
    validationLog.push(`❌ Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, validationLog };
  }
}

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
      // If no conversation, get any live funnel for this experience
      const liveFunnel = await db.query.funnels.findFirst({
        where: and(
          eq(funnels.experienceId, experience.id),
          eq(funnels.isDeployed, true)
        ),
      });
      if (liveFunnel) {
        funnelFlow = liveFunnel.flow as FunnelFlow;
      }
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

    // Validate WELCOME stage options if we're in WELCOME stage
    let validatedFunnelFlow = funnelFlow;
    let validationLog: string[] = [];
    
    if (isWelcomeStage && funnelFlow && activeConversation) {
      console.log(`[check-conversation] Validating WELCOME stage options for conversation ${activeConversation.id}`);
      
      const validationResult = await validateWelcomeOptions(
        funnelFlow,
        activeConversation,
        experience.id
      );
      
      validationLog = validationResult.validationLog || [];
      console.log(`[check-conversation] WELCOME validation log:`, validationLog);
      
      if (!validationResult.isValid) {
        console.warn(`[check-conversation] WELCOME validation failed - no valid options found`);
        // For now, we'll still return the original funnel flow
        // In the future, we might want to handle this differently
      } else if (validationResult.filteredOptions && validationResult.filteredOptions.length > 0) {
        console.log(`[check-conversation] WELCOME validation passed with ${validationResult.filteredOptions.length} valid options`);
        // Note: We're not modifying the funnel flow here, just logging the validation
        // The actual filtering would need to be implemented in the frontend or a different approach
      }
    }

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
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

// Export the protected route handler
export const POST = withWhopAuth(checkConversationHandler);
