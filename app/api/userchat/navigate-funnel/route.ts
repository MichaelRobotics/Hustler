import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, funnelInteractions, resources, funnels, users } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import type { FunnelFlow, FunnelBlock } from "@/lib/types/funnel";
import {
  type AuthContext,
  withWhopAuth,
} from "@/lib/middleware/whop-auth";
import { safeBackgroundTracking, trackInterestBackground } from "@/lib/analytics/background-tracking";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * Look up resource by name and experience ID
 * Returns the resource link if found, null otherwise
 */
async function lookupResourceLink(resourceName: string, experienceId: string): Promise<string | null> {
  try {
    console.log(`[Resource Lookup] Looking up resource: "${resourceName}" for experience: ${experienceId}`);
    
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.experienceId, experienceId),
        eq(resources.name, resourceName)
      ),
    });

    if (resource?.link) {
      console.log(`[Resource Lookup] Found resource: ${resource.name} with link: ${resource.link}`);
      return resource.link;
    } else {
      console.log(`[Resource Lookup] Resource not found: ${resourceName}`);
      return null;
    }
  } catch (error) {
    console.error(`[Resource Lookup] Error looking up resource "${resourceName}":`, error);
    return null;
  }
}

/**
 * Look up admin user (WHOP_OWNER) by experience ID
 * Returns the admin user's name if found, null otherwise
 */
async function lookupAdminUser(experienceId: string): Promise<string | null> {
  try {
    console.log(`[Admin Lookup] Looking up admin user for experience: ${experienceId}`);
    
    const adminUser = await db.query.users.findFirst({
      where: and(
        eq(users.experienceId, experienceId),
        eq(users.accessLevel, "admin")
      ),
    });

    if (adminUser?.name) {
      // Return first word of admin name (same logic as [USER] placeholder)
      const firstName = adminUser.name.split(' ')[0];
      console.log(`[Admin Lookup] Found admin user: ${adminUser.name} -> firstName: ${firstName}`);
      return firstName;
    } else {
      console.log(`[Admin Lookup] No admin user found for experience: ${experienceId}`);
      return null;
    }
  } catch (error) {
    console.error(`[Admin Lookup] Error looking up admin user for experience ${experienceId}:`, error);
    return null;
  }
}

/**
 * Look up current user by conversation ID
 * Returns the user's name if found, null otherwise
 */
async function lookupCurrentUser(conversationId: string): Promise<string | null> {
  try {
    console.log(`[User Lookup] Looking up current user for conversation: ${conversationId}`);
    
    // Get conversation to find whopUserId
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
    });

    if (!conversation?.whopUserId) {
      console.log(`[User Lookup] No conversation or whopUserId found for conversation: ${conversationId}`);
      return null;
    }

    // Get user by whopUserId
    const user = await db.query.users.findFirst({
      where: eq(users.whopUserId, conversation.whopUserId),
    });

    if (user?.name) {
      // Return first word of user name (same logic as admin lookup)
      const firstName = user.name.split(' ')[0];
      console.log(`[User Lookup] Found user: ${user.name} -> firstName: ${firstName}`);
      return firstName;
    } else {
      console.log(`[User Lookup] No user found for whopUserId: ${conversation.whopUserId}`);
      return null;
    }
  } catch (error) {
    console.error(`[User Lookup] Error looking up current user for conversation ${conversationId}:`, error);
    return null;
  }
}

/**
 * Get current stage for a block ID
 */
function getCurrentStage(blockId: string | null, funnelFlow: FunnelFlow): string {
  if (!blockId) return "UNKNOWN";
  
  for (const stage of funnelFlow.stages) {
    if (stage.blockIds.includes(blockId)) {
      return stage.name;
    }
  }
  
  return "UNKNOWN";
}

/**
 * Send WebSocket message with stage transition
 */
async function sendStageTransitionWebSocket(
  conversationId: string,
  experienceId: string,
  currentStage: string,
  previousStage: string,
  botMessage: string
): Promise<void> {
  try {
    console.log(`[WebSocket] Sending stage transition: ${previousStage} -> ${currentStage}`);
    
    // Create WebSocket message with stage transition metadata
    const websocketMessage = {
      id: `stage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "message",
      conversationId: conversationId,
      messageType: "bot",
      content: botMessage,
      metadata: {
        stageTransition: {
          currentStage: currentStage,
          previousStage: previousStage,
          isTransitionStage: currentStage === 'TRANSITION',
          isExperienceQualificationStage: currentStage === 'EXPERIENCE_QUALIFICATION',
          isDMFunnelActive: true
        }
      },
      experienceId: experienceId,
      timestamp: new Date().toISOString(),
    };

    // Note: In a real implementation, this would use the Whop WebSocket broadcast API
    // For now, we'll log the message that should be sent
    console.log(`[WebSocket] Stage transition message to broadcast:`, {
      message: JSON.stringify(websocketMessage),
      target: "everyone",
      channels: [`experience:${experienceId}`, `livechat:${experienceId}`]
    });

    // TODO: Implement actual WebSocket broadcast using Whop's API
    // This would typically involve calling the Whop WebSocket broadcast endpoint
    // or using a WebSocket client to send the message to connected clients
    
  } catch (error) {
    console.error(`[WebSocket] Error sending stage transition message:`, error);
  }
}

/**
 * Replace [LINK], [WHOP_OWNER], and [USER] placeholders with actual values
 */
async function resolvePlaceholders(message: string, block: FunnelBlock, experienceId: string, conversationId?: string): Promise<string> {
  let resolvedMessage = message;

  // Resolve [WHOP_OWNER] placeholder
  if (resolvedMessage.includes('[WHOP_OWNER]')) {
    const adminName = await lookupAdminUser(experienceId);
    if (adminName) {
      resolvedMessage = resolvedMessage.replace(/\[WHOP_OWNER\]/g, adminName);
      console.log(`[Placeholder Resolution] Replaced [WHOP_OWNER] with: ${adminName}`);
    } else {
      console.log(`[Placeholder Resolution] Admin user not found, keeping [WHOP_OWNER] placeholder`);
    }
  }

  // Resolve [USER] placeholder
  if (resolvedMessage.includes('[USER]') && conversationId) {
    const userName = await lookupCurrentUser(conversationId);
    if (userName) {
      resolvedMessage = resolvedMessage.replace(/\[USER\]/g, userName);
      console.log(`[Placeholder Resolution] Replaced [USER] with: ${userName}`);
    } else {
      console.log(`[Placeholder Resolution] Current user not found, keeping [USER] placeholder`);
    }
  }

  return resolvedMessage;
}

/**
 * Navigate funnel in UserChat - handle option selections and custom inputs
 * This API route processes user interactions and updates conversation state
 */
async function navigateFunnelHandler(
  request: NextRequest,
  context: AuthContext
) {
  try {
    const { user } = context;
    const experienceId = user.experienceId;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    const { conversationId, navigationData } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!navigationData) {
      return NextResponse.json(
        { error: "Navigation data is required" },
        { status: 400 }
      );
    }

    console.log(`Navigating funnel for conversation ${conversationId}:`, navigationData);

    // Get conversation with funnel data
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        funnel: true,
        messages: {
          orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.funnel?.flow) {
      return NextResponse.json(
        { error: "Funnel flow not found" },
        { status: 404 }
      );
    }

    const funnelFlow = conversation.funnel.flow as FunnelFlow;

    // Process the navigation
    const result = await processFunnelNavigation(
      conversationId,
      navigationData,
      funnelFlow,
      conversation
    );

    return NextResponse.json({
      success: true,
      conversation: result.conversation,
      nextBlockId: result.nextBlockId,
      botMessage: result.botMessage,
      stageTransition: result.stageTransition, // Include stage transition data
    });

  } catch (error) {
    console.error("Error navigating funnel:", error);
    return NextResponse.json(
      { error: "Failed to navigate funnel" },
      { status: 500 }
    );
  }
}

export const POST = withWhopAuth(navigateFunnelHandler);

/**
 * Process funnel navigation and update conversation state
 */
async function processFunnelNavigation(
  conversationId: string,
  navigationData: {
    text: string;
    value: string;
    blockId: string;
  },
  funnelFlow: FunnelFlow,
  conversation: any
): Promise<{
  conversation: any;
  nextBlockId: string | null;
  botMessage: string | null;
  stageTransition?: {
    currentStage: string;
    previousStage: string;
    isTransitionStage: boolean;
    isExperienceQualificationStage: boolean;
    isDMFunnelActive: boolean;
  } | null;
}> {
  try {
    const { text, value, blockId } = navigationData;
    const currentBlockId = blockId || conversation.currentBlockId;

    // Find the current block
    const currentBlock = funnelFlow.blocks[currentBlockId];
    if (!currentBlock) {
      throw new Error(`Current block ${currentBlockId} not found`);
    }

    // Debug: Log available options
    console.log(`Available options in block ${currentBlockId}:`, currentBlock.options?.map(opt => opt.text));
    console.log(`Looking for option: "${text}"`);

    // Find the selected option with better matching
    const selectedOption = currentBlock.options?.find(opt => {
      const optionText = opt.text.toLowerCase().trim();
      const searchText = text.toLowerCase().trim();
      const searchValue = value.toLowerCase().trim();
      
      return optionText === searchText || 
             optionText === searchValue ||
             optionText.includes(searchText) ||
             searchText.includes(optionText);
    });

    if (!selectedOption) {
      console.error(`Option "${text}" not found in block ${currentBlockId}`);
      console.error(`Available options:`, currentBlock.options?.map(opt => `"${opt.text}"`));
      throw new Error(`Option "${text}" not found in block ${currentBlockId}. Available options: ${currentBlock.options?.map(opt => opt.text).join(', ')}`);
    }

    const nextBlockId = selectedOption.nextBlockId;
    const nextBlock = nextBlockId ? funnelFlow.blocks[nextBlockId] : null;

    // Record the funnel interaction
    await db.insert(funnelInteractions).values({
      conversationId: conversationId,
      blockId: currentBlockId,
      optionText: text,
      optionValue: value,
      nextBlockId: nextBlockId,
      metadata: {
        timestamp: new Date().toISOString(),
        userChoice: true,
      },
    });

    // Update conversation state
    const updatedConversation = await db
      .update(conversations)
      .set({
        currentBlockId: nextBlockId,
        userPath: [...(conversation.userPath || []), nextBlockId].filter(Boolean),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    // Detect stage transition and send WebSocket message
    const previousStage = getCurrentStage(currentBlockId, funnelFlow);
    const currentStage = getCurrentStage(nextBlockId, funnelFlow);
    
    if (previousStage !== currentStage) {
      console.log(`[NAVIGATE-FUNNEL] Stage transition detected: ${previousStage} -> ${currentStage}`);
      // We'll send the WebSocket message after we generate the bot message
    }

    // Track interest when conversation reaches PAIN_POINT_QUALIFICATION stage
    const isPainPointQualificationStage = nextBlockId && funnelFlow.stages.some(
      stage => stage.name === "PAIN_POINT_QUALIFICATION" && stage.blockIds.includes(nextBlockId)
    );
    
    if (isPainPointQualificationStage) {
      console.log(`🚀 [NAVIGATE-FUNNEL] About to track interest for experience ${conversation.experienceId}, funnel ${conversation.funnelId}`);
      safeBackgroundTracking(() => trackInterestBackground(conversation.experienceId, conversation.funnelId));
    }

    // Record user message
    await db.insert(messages).values({
      conversationId: conversationId,
      type: "user",
      content: text,
      metadata: {
        blockId: currentBlockId,
        optionSelected: true,
        timestamp: new Date().toISOString(),
      },
    });

    // Generate bot response
    let botMessage = null;
    if (nextBlock) {
      // Check if this is a VALUE_DELIVERY block
      const isValueDelivery = nextBlockId ? funnelFlow.stages.some(
        stage => stage.name === 'VALUE_DELIVERY' && stage.blockIds.includes(nextBlockId)
      ) : false;
      
      // Check if this block is in OFFER stage
      const isOfferBlock = nextBlockId ? funnelFlow.stages.some(
        stage => stage.name === 'OFFER' && stage.blockIds.includes(nextBlockId)
      ) : false;
      
      console.log(`[Navigate Funnel] Block ${nextBlockId} - isValueDelivery: ${isValueDelivery}, isOfferBlock: ${isOfferBlock}`);
      
      // Start with the base message
      let formattedMessage = nextBlock.message || "Thank you for your response.";
      
      if (isOfferBlock && nextBlock.resourceName) {
        console.log(`[OFFER] Processing OFFER block: ${nextBlockId} with resourceName: ${nextBlock.resourceName}`);
        
        try {
          // Lookup resource by name and experience
          const resource = await db.query.resources.findFirst({
            where: and(
              eq(resources.name, nextBlock.resourceName),
              eq(resources.experienceId, conversation.experienceId)
            ),
          });
          
          if (resource) {
            console.log(`[OFFER] Found resource: ${resource.name} with link: ${resource.link}`);
            
            // Check if link already has affiliate parameters
            const hasAffiliate = resource.link.includes('app=') || resource.link.includes('ref=');
            
            if (!hasAffiliate) {
              console.log(`[OFFER] Adding affiliate parameters to resource link`);
              
              // Get affiliate app ID from environment variable
              const affiliateAppId = process.env.NEXT_PUBLIC_WHOP_APP_ID || conversation.experienceId; // Use environment variable or experience ID as fallback
              console.log(`[OFFER] Using affiliate app ID: ${affiliateAppId} (from ${process.env.NEXT_PUBLIC_WHOP_APP_ID ? 'NEXT_PUBLIC_WHOP_APP_ID' : 'experience ID fallback'})`);
              
              // Add affiliate parameter to the link
              const url = new URL(resource.link);
              url.searchParams.set('app', affiliateAppId);
              const affiliateLink = url.toString();
              
              console.log(`[OFFER] Generated affiliate link: ${affiliateLink}`);
              
              // Store the affiliate link in the conversation
              try {
                await db.update(conversations)
                  .set({ 
                    myAffiliateLink: affiliateLink,
                    updatedAt: new Date()
                  })
                  .where(eq(conversations.id, conversationId));
                console.log(`[OFFER] Stored affiliate link in conversation: ${affiliateLink}`);
              } catch (error) {
                console.error(`[OFFER] Failed to store affiliate link in conversation:`, error);
                // Continue execution even if storing fails
              }
              
              // Replace [LINK] placeholder with animated button HTML
              const buttonHtml = `<div class="animated-gold-button" data-href="${affiliateLink}">Get Started!</div>`;
              formattedMessage = formattedMessage.replace('[LINK]', buttonHtml);
            } else {
              console.log(`[OFFER] Resource link already has affiliate parameters, using as-is`);
              // Replace [LINK] placeholder with animated button HTML
              const buttonHtml = `<div class="animated-gold-button" data-href="${resource.link}">Get Started!</div>`;
              formattedMessage = formattedMessage.replace('[LINK]', buttonHtml);
            }
          } else {
            console.log(`[OFFER] Resource not found: ${nextBlock.resourceName}`);
            // Replace [LINK] placeholder with fallback text
            formattedMessage = formattedMessage.replace('[LINK]', '[Resource not found]');
          }
        } catch (error) {
          console.error(`[OFFER] Error processing resource lookup:`, error);
          // Keep the original message with resolved placeholders
        }
      } else if (isValueDelivery && nextBlock.resourceName) {
        console.log(`[VALUE_DELIVERY] Processing VALUE_DELIVERY block: ${nextBlockId} with resourceName: ${nextBlock.resourceName}`);
        
        // First resolve placeholders for [USER], [WHOP_OWNER], [WHOP]
        formattedMessage = await resolvePlaceholders(formattedMessage, nextBlock, conversation.experienceId, conversationId);
        
        try {
          // Lookup resource by name and experience
          const resource = await db.query.resources.findFirst({
            where: and(
              eq(resources.name, nextBlock.resourceName),
              eq(resources.experienceId, conversation.experienceId)
            ),
          });
          
          if (resource) {
            console.log(`[VALUE_DELIVERY] Found resource: ${resource.name} with link: ${resource.link}`);
            
            // Replace [LINK] placeholder with animated button HTML for VALUE_DELIVERY
            const buttonHtml = `<div class="animated-gold-button" data-href="${resource.link}">Claim!</div>`;
            formattedMessage = formattedMessage.replace('[LINK]', buttonHtml);
            console.log(`[VALUE_DELIVERY] Replaced [LINK] with VALUE_DELIVERY button: ${buttonHtml}`);
          } else {
            console.log(`[VALUE_DELIVERY] Resource not found: ${nextBlock.resourceName}`);
            // Replace [LINK] placeholder with fallback text
            formattedMessage = formattedMessage.replace('[LINK]', '[Resource not found]');
          }
        } catch (error) {
          console.error(`[VALUE_DELIVERY] Error processing resource lookup:`, error);
          // Replace [LINK] placeholder with fallback text
          formattedMessage = formattedMessage.replace('[LINK]', '[Error loading resource]');
        }
      } else {
        // For other blocks, use simple placeholder resolution
        console.log(`[Navigate Funnel] Resolving placeholders for other block ${nextBlockId}`);
        formattedMessage = await resolvePlaceholders(formattedMessage, nextBlock, conversation.experienceId, conversationId);
      }
      
      // UserChat system: Options are handled by frontend buttons
      // No need to add options to bot message text

      botMessage = formattedMessage;

      // Record bot message
      await db.insert(messages).values({
        conversationId: conversationId,
        type: "bot",
        content: formattedMessage,
        metadata: {
          blockId: nextBlockId,
          timestamp: new Date().toISOString(),
        },
      });

      // Increment sends counter for the funnel
      try {
        await db.update(funnels)
          .set({ 
            sends: sql`${funnels.sends} + 1`,
            updatedAt: new Date()
          })
          .where(eq(funnels.id, conversation.funnelId));
        
        console.log(`[navigate-funnel] Incremented sends counter for funnel ${conversation.funnelId}`);
      } catch (sendsError) {
        console.error(`[navigate-funnel] Error updating sends counter:`, sendsError);
      }
    }

    // Prepare stage transition data for frontend WebSocket broadcasting
    let stageTransition = null;
    if (previousStage !== currentStage && botMessage) {
      stageTransition = {
        currentStage,
        previousStage,
        isTransitionStage: currentStage === 'TRANSITION',
        isExperienceQualificationStage: currentStage === 'EXPERIENCE_QUALIFICATION',
        isDMFunnelActive: true
      };
      
      console.log(`[NAVIGATE-FUNNEL] Stage transition detected: ${previousStage} -> ${currentStage}`);
    }

    return {
      conversation: updatedConversation[0],
      nextBlockId,
      botMessage,
      stageTransition, // Include stage transition data for frontend WebSocket broadcasting
    };

  } catch (error) {
    console.error("Error processing funnel navigation:", error);
    throw error;
  }
}

