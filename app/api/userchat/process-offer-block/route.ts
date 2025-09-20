import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, resources, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import {
  type AuthContext,
  createErrorResponse,
  createSuccessResponse,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";

/**
 * Process OFFER block message to resolve [LINK] placeholders
 * This API route handles frontend-triggered OFFER block processing
 */
async function processOfferBlockHandler(
  request: NextRequest,
  context: AuthContext
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

    const { messageId, messageText, conversationId } = await request.json();

    if (!messageId || !messageText || !conversationId) {
      return createErrorResponse(
        "MISSING_PARAMETERS",
        "messageId, messageText, and conversationId are required"
      );
    }

    console.log(`[process-offer-block] Processing message ${messageId} for conversation ${conversationId}`);

    // Get the experience record
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      return createErrorResponse(
        "EXPERIENCE_NOT_FOUND",
        "Experience not found"
      );
    }

    // Get conversation with funnel data
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experience.id)
      ),
      with: {
        funnel: true,
      },
    });

    if (!conversation || !conversation.funnel?.flow) {
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation or funnel not found"
      );
    }

    const funnelFlow = conversation.funnel.flow as any;
    const currentBlockId = conversation.currentBlockId;

    if (!currentBlockId) {
      return createErrorResponse(
        "NO_CURRENT_BLOCK",
        "No current block ID found"
      );
    }

    // Find the current block
    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) {
      return createErrorResponse(
        "BLOCK_NOT_FOUND",
        "Current block not found"
      );
    }

    // Check if this block is in OFFER stage
    const isOfferBlock = funnelFlow.stages.some(
      (stage: any) => stage.name === 'OFFER' && stage.blockIds.includes(currentBlockId)
    );

    if (!isOfferBlock || !currentBlock.resourceName) {
      console.log(`[process-offer-block] Block ${currentBlockId} is not an OFFER block or has no resourceName`);
      return createSuccessResponse({
        processedMessage: messageText, // Return original message
        isOfferBlock: false,
      });
    }

    console.log(`[process-offer-block] Processing OFFER block: ${currentBlockId} with resourceName: ${currentBlock.resourceName}`);

    // Always show "Generating Link..." during retry process
    let formattedMessage = messageText.replace('[LINK]', '<div class="generating-link-placeholder">Generating Link...</div>');

    // Retry logic for resource lookup
    const maxRetries = 5;
    const retryDelay = 1000;
    let resource = null;
    let retryCount = 0;

    while (!resource && retryCount < maxRetries) {
      try {
        console.log(`[process-offer-block] Resource lookup attempt ${retryCount + 1}/${maxRetries}`);
        
        // Lookup resource by name and experience
        resource = await db.query.resources.findFirst({
          where: and(
            eq(resources.name, currentBlock.resourceName),
            eq(resources.experienceId, experience.id)
          ),
        });
        
        if (resource) {
          console.log(`[process-offer-block] Found resource: ${resource.name} with link: ${resource.link}`);
          break;
        } else {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`[process-offer-block] Resource not found, retrying in ${retryDelay * retryCount}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          }
        }
      } catch (error) {
        retryCount++;
        console.error(`[process-offer-block] Error in resource lookup attempt ${retryCount}:`, error);
        if (retryCount < maxRetries) {
          console.log(`[process-offer-block] Retrying in ${retryDelay * retryCount}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        }
      }
    }

    if (resource) {
      // Check if link already has affiliate parameters
      const hasAffiliate = resource.link.includes('app=') || resource.link.includes('ref=');
      
      if (!hasAffiliate) {
        console.log(`[process-offer-block] Adding affiliate parameters to resource link`);
        
        // Get affiliate app ID
        let affiliateAppId = experienceId;
        try {
          const whopExperience = await whopSdk.experiences.getExperience({
            experienceId: experienceId,
          });
          affiliateAppId = whopExperience.app?.id || experienceId;
          console.log(`[process-offer-block] Got affiliate app ID: ${affiliateAppId}`);
        } catch (error) {
          console.log(`[process-offer-block] Could not get app ID, using experience ID: ${experienceId}`);
        }
        
        // Add affiliate parameter to the link
        const url = new URL(resource.link);
        url.searchParams.set('app', affiliateAppId);
        const affiliateLink = url.toString();
        
        console.log(`[process-offer-block] Generated affiliate link: ${affiliateLink}`);
        
        // Replace generating link placeholder with animated button HTML
        const buttonHtml = `<div class="animated-gold-button" data-href="${affiliateLink}">Get Your Free Guide</div>`;
        formattedMessage = formattedMessage.replace('<div class="generating-link-placeholder">Generating Link...</div>', buttonHtml);
      } else {
        console.log(`[process-offer-block] Resource link already has affiliate parameters, using as-is`);
        // Replace generating link placeholder with animated button HTML
        const buttonHtml = `<div class="animated-gold-button" data-href="${resource.link}">Get Your Free Guide</div>`;
        formattedMessage = formattedMessage.replace('<div class="generating-link-placeholder">Generating Link...</div>', buttonHtml);
      }
    } else {
      console.log(`[process-offer-block] Resource not found after ${maxRetries} attempts: ${currentBlock.resourceName}`);
      // Replace generating link placeholder with reload page text
      formattedMessage = formattedMessage.replace('<div class="generating-link-placeholder">Generating Link...</div>', 'Reload Page');
    }

    console.log(`[process-offer-block] Final processed message:`, {
      hasLink: formattedMessage.includes('[LINK]'),
      hasAnimatedButton: formattedMessage.includes('animated-gold-button'),
      hasGeneratingLink: formattedMessage.includes('generating-link-placeholder'),
      hasReloadPage: formattedMessage.includes('Reload Page'),
    });

    return createSuccessResponse({
      processedMessage: formattedMessage,
      isOfferBlock: true,
      resourceFound: !!resource,
    });

  } catch (error) {
    console.error("Error processing OFFER block:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Failed to process OFFER block"
    );
  }
}

export const POST = withWhopAuth(processOfferBlockHandler);
