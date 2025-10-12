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
    
    // Use atomic update to set affiliateSend to true and get the conversation
    // This prevents race conditions by using the database as a lock
    const updateResult = await db.update(conversations)
      .set({ 
        affiliateSend: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.affiliateSend, false) // Only update if affiliateSend is false
      ))
      .returning();

    // If no rows were updated, it means affiliateSend was already true
    if (updateResult.length === 0) {
      console.log(`[AFFILIATE-DM] ⏭️ Affiliate DM already sent for conversation ${conversationId} (affiliateSend was already true)`);
      return true; // Return true since the DM was already sent
    }

    console.log(`[AFFILIATE-DM] ✅ Successfully claimed conversation ${conversationId} for affiliate DM (set affiliateSend to true)`);

    // Now get the full conversation details for sending the DM
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        experience: true,
        funnel: true
      }
    });

    if (!conversation) {
      console.error(`[AFFILIATE-DM] Conversation not found after update: ${conversationId}`);
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

    // Create the DM message with the resolved affiliate link
    const dmMessage = `Want Whop income with nothing to sell?

Don't build. Be an affiliate!

Monetize instantly: Sell Whop's hottest products.

1. Create whop 

https://whop.com/joined/profit-pulse-ai/courses-9WprApn8XKvQFW/app/

2. Install app 

https://whop.com/apps/${process.env.NEXT_PUBLIC_WHOP_APP_ID}/install/

3. Copy this link

${affiliateLink}

4. Quick 3-click setup & start earning grind: 

https://whop.com/joined/profit-pulse-ai/courses-9WprApn8XKvQFW/app/

LETS GO!`;

    // Send DM using Whop SDK
    await whopSdk.messages.sendDirectMessageToUser({
      toUserIdOrUsername: conversation.whopUserId,
      message: dmMessage
    });

    // Save the affiliate DM to the conversation's messages table
    try {
      console.log(`[AFFILIATE-DM] Saving affiliate DM to messages table for conversation ${conversationId}`);
      await db.insert(messages).values({
        conversationId: conversationId,
        type: 'bot',
        content: dmMessage,
        createdAt: new Date()
      });
      console.log(`[AFFILIATE-DM] ✅ Successfully saved affiliate DM to messages table`);
    } catch (error) {
      console.error(`[AFFILIATE-DM] Failed to save affiliate DM to messages table:`, error);
      // If saving fails, we should reset affiliateSend to false so it can be retried
      try {
        await db.update(conversations)
          .set({ 
            affiliateSend: false,
            updatedAt: new Date()
          })
          .where(eq(conversations.id, conversationId));
        console.log(`[AFFILIATE-DM] Reset affiliateSend to false for retry due to save failure`);
      } catch (resetError) {
        console.error(`[AFFILIATE-DM] Failed to reset affiliateSend:`, resetError);
      }
      return false;
    }

    console.log(`[AFFILIATE-DM] Successfully sent affiliate DM to user ${conversation.whopUserId}`);
    return true;

  } catch (error) {
    console.error(`[AFFILIATE-DM] Failed to send affiliate DM for conversation ${conversationId}:`, error);
    return false;
  }
}

