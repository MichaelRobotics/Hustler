import { db } from "@/lib/supabase/db-server";
import { conversations, users, resources } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * Send affiliate DM to user after OFFER stage
 */
export async function sendAffiliateDM(conversationId: string): Promise<boolean> {
  try {
    console.log(`[AFFILIATE-DM] Sending affiliate DM for conversation ${conversationId}`);
    
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
      // Get the resource link from the conversation's current block
      const currentBlock = conversation.currentBlockId;
      if (currentBlock) {
        // Try to find the resource associated with this conversation's funnel
        const resource = await db.query.resources.findFirst({
          where: and(
            eq(resources.experienceId, conversation.experienceId),
            // Add logic to find the resource based on the current block
          )
        });
        
        if (resource?.link) {
          // Add affiliate parameters to the resource link like navigate-funnel does
          const affiliateAppId = process.env.NEXT_PUBLIC_WHOP_APP_ID || conversation.experienceId;
          const url = new URL(resource.link);
          url.searchParams.set('app', affiliateAppId);
          affiliateLink = url.toString();
        }
      }
      
      // Final fallback to app install link
      if (!affiliateLink) {
        affiliateLink = process.env.NEXT_PUBLIC_WHOP_APP_ID 
          ? `https://whop.com/apps/${process.env.NEXT_PUBLIC_WHOP_APP_ID}/install`
          : 'https://whop.com/apps';
      }
    }

    // Create the DM message
    const dmMessage = `Want to make money on whop but have nothing to Sell?

Why to create your own whop when you can just Search for BEST already existing products in niche on whop and take cut from selling them as affiliate?


1. Create whop (https://whop.com/joined/whop/exp_sZInboyJKFOzbl/app/)
2. Install app (https://whop.com/apps/app_FInBMCJGyVdD9T/install/)
3. add link ${affiliateLink} to products click "generate" and "Go Live" and let bot sell it to your whop owners


Search whop whop for best products, become affiliate and sell them!`;

    // Send DM using Whop SDK
    await whopSdk.messages.sendDirectMessageToUser({
      toUserIdOrUsername: conversation.whopUserId,
      message: dmMessage
    });

    console.log(`[AFFILIATE-DM] Successfully sent affiliate DM to user ${conversation.whopUserId}`);
    return true;

  } catch (error) {
    console.error(`[AFFILIATE-DM] Failed to send affiliate DM for conversation ${conversationId}:`, error);
    return false;
  }
}

