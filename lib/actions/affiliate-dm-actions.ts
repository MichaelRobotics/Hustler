import { db } from "@/lib/supabase/db-server";
import { conversations, users, resources, messages } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * Send affiliate DM to user after OFFER stage
 */
export async function sendAffiliateDM(conversationId: string): Promise<boolean> {
  try {
    console.log(`[AFFILIATE-DM] Sending affiliate DM for conversation ${conversationId}`);
    
    // Check if affiliate DM already exists to prevent duplicates
    const existingAffiliateMessage = await db.query.messages.findFirst({
      where: and(
        eq(messages.conversationId, conversationId),
        eq(messages.type, 'bot'),
        sql`content LIKE '%Want to make money on whop but have nothing to Sell?%'`
      )
    });

    if (existingAffiliateMessage) {
      console.log(`[AFFILIATE-DM] Affiliate DM already exists in conversation messages, skipping send`);
      return true; // Return true since the DM was already sent
    }
    
    // Get conversation details
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        experience: true,
        funnel: true
      }
    });

    if (!conversation) {
      console.error(`[AFFILIATE-DM] Conversation not found: ${conversationId}`);
      return false;
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.whopUserId, conversation.whopUserId)
    });

    if (!user) {
      console.error(`[AFFILIATE-DM] User not found for whopUserId: ${conversation.whopUserId}`);
      return false;
    }

    // Get affiliate link from conversation
    let affiliateLink = conversation.myAffiliateLink;
    
    // If no affiliate link in conversation, try to get it from the resource link
    if (!affiliateLink) {
      console.log(`[AFFILIATE-DM] No affiliate link found, searching for resource using currentBlockId: ${conversation.currentBlockId}`);
      
      // Get the funnel flow to find the current block and its resourceName
      if (conversation.funnel?.flow) {
        const funnelFlow = conversation.funnel.flow;
        const currentBlockId = conversation.currentBlockId;
        
        if (currentBlockId && funnelFlow.blocks && funnelFlow.blocks[currentBlockId]) {
          const currentBlock = funnelFlow.blocks[currentBlockId];
          console.log(`[AFFILIATE-DM] Current block: ${currentBlockId}, resourceName: ${currentBlock.resourceName}`);
          
          // Check if this block has a resourceName (like OFFER blocks do)
          if (currentBlock.resourceName) {
            try {
              // Lookup resource by name and experience (same logic as navigate-funnel)
              const resource = await db.query.resources.findFirst({
                where: and(
                  eq(resources.name, currentBlock.resourceName),
                  eq(resources.experienceId, conversation.experienceId)
                ),
              });
              
              if (resource?.link) {
                console.log(`[AFFILIATE-DM] Found resource: ${resource.name} with link: ${resource.link}`);
                
                // Check if link already has affiliate parameters
                const hasAffiliate = resource.link.includes('app=') || resource.link.includes('ref=');
                
                if (!hasAffiliate) {
                  console.log(`[AFFILIATE-DM] Adding affiliate parameters to resource link`);
                  
                  // Get affiliate app ID from environment variable (same as navigate-funnel)
                  const affiliateAppId = process.env.NEXT_PUBLIC_WHOP_APP_ID || conversation.experienceId;
                  console.log(`[AFFILIATE-DM] Using affiliate app ID: ${affiliateAppId}`);
                  
                  // Add affiliate parameter to the link (same logic as navigate-funnel)
                  const url = new URL(resource.link);
                  url.searchParams.set('app', affiliateAppId);
                  affiliateLink = url.toString();
                  
                  console.log(`[AFFILIATE-DM] Generated affiliate link: ${affiliateLink}`);
                } else {
                  console.log(`[AFFILIATE-DM] Resource link already has affiliate parameters, using as-is`);
                  affiliateLink = resource.link;
                }
              } else {
                console.log(`[AFFILIATE-DM] Resource not found: ${currentBlock.resourceName}`);
              }
            } catch (error) {
              console.error(`[AFFILIATE-DM] Error processing resource lookup:`, error);
            }
          } else {
            console.log(`[AFFILIATE-DM] Current block ${currentBlockId} has no resourceName`);
          }
        } else {
          console.log(`[AFFILIATE-DM] Current block ${currentBlockId} not found in funnel flow`);
        }
      } else {
        console.log(`[AFFILIATE-DM] No funnel flow found in conversation`);
      }
      
      // Final fallback to app install link
      if (!affiliateLink) {
        console.log(`[AFFILIATE-DM] Using fallback app install link`);
        affiliateLink = process.env.NEXT_PUBLIC_WHOP_APP_ID 
          ? `https://whop.com/apps/${process.env.NEXT_PUBLIC_WHOP_APP_ID}/install`
          : 'https://whop.com/apps';
      }
    }

    // Create the DM message
    const dmMessage = `Want to make money on whop but have nothing to Sell?

Don't create your own product. Instead, become an affiliate! 

You can earn money by selling TOP products already in high demand on Whop.

Here's how to get started:

1. Create whop (https://whop.com/joined/whop/exp_sZInboyJKFOzbl/app/)
2. Install app (https://whop.com/apps/app_FInBMCJGyVdD9T/install/)
3. IN APP: CLICK LIBRARY -> CLICK ADD PRODUCT -> ADD LINK ${affiliateLink} -> ASSIGN PRODUCT -> GENERATE -> GO LIVE

Voila! Now Upsell will sell it to every customer who joins your whop!`;

    // Send DM using Whop SDK
    await whopSdk.messages.sendDirectMessageToUser({
      toUserIdOrUsername: conversation.whopUserId,
      message: dmMessage
    });

    // Save the affiliate DM to the conversation's messages table for deduplication
    try {
      await db.insert(messages).values({
        conversationId: conversationId,
        type: 'bot',
        content: dmMessage,
        createdAt: new Date()
      });
      console.log(`[AFFILIATE-DM] Saved affiliate DM to conversation messages for deduplication`);
    } catch (error) {
      console.error(`[AFFILIATE-DM] Failed to save affiliate DM to messages table:`, error);
      // Continue execution even if saving fails
    }

    console.log(`[AFFILIATE-DM] Successfully sent affiliate DM to user ${conversation.whopUserId}`);
    return true;

  } catch (error) {
    console.error(`[AFFILIATE-DM] Failed to send affiliate DM for conversation ${conversationId}:`, error);
    return false;
  }
}

