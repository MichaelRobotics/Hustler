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
  let requestBody: any = null; // Define requestBody here for wider scope
  try {
    console.log(`[process-offer-block] Starting request processing`);
    console.log(`[process-offer-block] Request method: ${request.method}`);
    console.log(`[process-offer-block] Request URL: ${request.url}`);
    
    // Validate HTTP method
    if (request.method !== 'POST') {
      console.error(`[process-offer-block] Invalid method: ${request.method}, expected POST`);
      return createErrorResponse(
        "METHOD_NOT_ALLOWED",
        `Method ${request.method} not allowed. Use POST.`
      );
    }
    
    const { user } = context;
    console.log(`[process-offer-block] User context:`, { userId: user?.userId, experienceId: user?.experienceId });
    
    const experienceId = user.experienceId;

    if (!experienceId) {
      console.error(`[process-offer-block] Missing experience ID`);
      return createErrorResponse(
        "MISSING_EXPERIENCE_ID",
        "Experience ID is required"
      );
    }

    let requestBody;
    try {
      requestBody = await request.json();
      console.log(`[process-offer-block] Request body:`, requestBody);
    } catch (error) {
      console.error(`[process-offer-block] Error parsing request body:`, error);
      return createErrorResponse(
        "INVALID_JSON",
        "Invalid JSON in request body"
      );
    }

    const { messageId, messageText, conversationId } = requestBody;

    if (!messageText || !conversationId) {
      console.error(`[process-offer-block] Missing required parameters:`, { messageId, messageText, conversationId });
      return createErrorResponse(
        "MISSING_PARAMETERS",
        "messageText and conversationId are required"
      );
    }

    // Generate messageId if not provided
    const finalMessageId = messageId || `temp-${Date.now()}`;
    console.log(`[process-offer-block] Using messageId: ${finalMessageId} (provided: ${messageId})`);

    console.log(`[process-offer-block] Processing message ${finalMessageId} for conversation ${conversationId}`);

    // Test database connection first
    try {
      await db.query.experiences.findFirst({ limit: 1 });
      console.log(`[process-offer-block] Database connection test successful`);
    } catch (dbError) {
      console.error(`[process-offer-block] Database connection test failed:`, dbError);
      return createErrorResponse(
        "DATABASE_ERROR",
        "Database connection failed"
      );
    }

    // Get the experience record
    console.log(`[process-offer-block] Looking up experience with whopExperienceId: ${experienceId}`);
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, experienceId),
    });

    if (!experience) {
      console.error(`[process-offer-block] Experience not found for whopExperienceId: ${experienceId}`);
      return createErrorResponse(
        "EXPERIENCE_NOT_FOUND",
        "Experience not found"
      );
    }
    console.log(`[process-offer-block] Found experience: ${experience.id} for whopExperienceId: ${experienceId}`);

    // Get conversation with funnel data
    console.log(`[process-offer-block] Looking up conversation: ${conversationId} for experience: ${experience.id}`);
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, experience.id)
      ),
      with: {
        funnel: true,
      },
    });

    if (!conversation) {
      console.error(`[process-offer-block] Conversation not found: ${conversationId} for experience: ${experience.id}`);
      return createErrorResponse(
        "CONVERSATION_NOT_FOUND",
        "Conversation not found"
      );
    }

    if (!conversation.funnel?.flow) {
      console.error(`[process-offer-block] Funnel flow not found for conversation: ${conversationId}`);
      return createErrorResponse(
        "FUNNEL_NOT_FOUND",
        "Funnel flow not found"
      );
    }
    console.log(`[process-offer-block] Found conversation with funnel flow`);

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

    console.log(`[process-offer-block] Final processed message:`, {
      originalMessage: messageText.substring(0, 100) + '...',
      processedMessage: formattedMessage.substring(0, 200) + '...',
      hasAnimatedButton: formattedMessage.includes('animated-gold-button'),
      hasGeneratingLink: formattedMessage.includes('generating-link-placeholder'),
      hasReloadPage: formattedMessage.includes('Reload Page'),
      resourceFound: !!resource,
      messageLength: formattedMessage.length
    });

    return createSuccessResponse({
      processedMessage: formattedMessage,
      isOfferBlock: true,
      resourceFound: !!resource,
    });

  } catch (error) {
    console.error("Error processing OFFER block:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      messageId: requestBody?.messageId || `temp-${Date.now()}`,
      conversationId: requestBody?.conversationId,
      experienceId: context?.user?.experienceId
    });
    return createErrorResponse(
      "INTERNAL_ERROR",
      "Failed to process OFFER block"
    );
  }
}

// Handle POST requests
export const POST = withWhopAuth(processOfferBlockHandler);

// Handle GET requests for testing
export async function GET(request: NextRequest) {
  console.log(`[process-offer-block] GET request received`);
  return NextResponse.json({ 
    message: "process-offer-block API is working", 
    method: "GET",
    timestamp: new Date().toISOString()
  });
}

// Handle OPTIONS requests for CORS
export async function OPTIONS(request: NextRequest) {
  console.log(`[process-offer-block] OPTIONS request received`);
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
