import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, funnels } from "@/lib/supabase/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendAffiliateDM } from "@/lib/actions/affiliate-dm-actions";

/**
 * Cron job to send affiliate DMs to users who reached OFFER stage
 * Runs every 5 minutes
 * 
 * Logic:
 * 1. Find conversations in OFFER stage
 * 2. Check if their last message is NOT an affiliate message
 * 3. Send affiliate DM if needed
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`[AFFILIATE-DM-CRON] Starting affiliate DM cron job at ${new Date().toISOString()}`);
    
    // Get conversations that have a current block ID (active conversations)
    const activeConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.status, 'active'),
        sql`current_block_id IS NOT NULL`
      ),
      with: {
        messages: {
          orderBy: [desc(messages.createdAt)],
          limit: 1
        },
        funnel: true
      }
    });

    // Filter conversations that are in OFFER stage
    const offerConversations = activeConversations.filter((conversation: any) => {
      if (!conversation.funnel?.flow?.stages || !conversation.currentBlockId) {
        return false;
      }
      
      // Check if current block is in OFFER stage
      return conversation.funnel.flow.stages.some(
        (stage: any) => stage.name === 'OFFER' && stage.blockIds.includes(conversation.currentBlockId)
      );
    });

    console.log(`[AFFILIATE-DM-CRON] Found ${offerConversations.length} conversations in OFFER stage`);

    let sentCount = 0;
    let skippedCount = 0;

    for (const conversation of offerConversations) {
      try {
        // Check if the last message is an affiliate message
        const lastMessage = conversation.messages[0];
        const isAffiliateMessage = lastMessage?.content?.includes('Want to make money on whop but have nothing to Sell?') ||
                                 lastMessage?.content?.includes('Search whop whop for best products, become affiliate and sell them!');

        if (isAffiliateMessage) {
          console.log(`[AFFILIATE-DM-CRON] Skipping conversation ${conversation.id} - already sent affiliate DM`);
          skippedCount++;
          continue;
        }

        // Check if conversation has been in OFFER stage for at least 2 minutes
        // (to avoid sending immediately when user just reached OFFER)
        const now = new Date();
        const offerStageTime = conversation.updatedAt;
        const timeDiff = now.getTime() - offerStageTime.getTime();
        const minutesInOffer = timeDiff / (1000 * 60);

        if (minutesInOffer < 2) {
          console.log(`[AFFILIATE-DM-CRON] Skipping conversation ${conversation.id} - only ${minutesInOffer.toFixed(1)} minutes in OFFER stage`);
          skippedCount++;
          continue;
        }

        // Send affiliate DM
        console.log(`[AFFILIATE-DM-CRON] Sending affiliate DM to conversation ${conversation.id}`);
        const success = await sendAffiliateDM(conversation.id);
        
        if (success) {
          sentCount++;
          console.log(`[AFFILIATE-DM-CRON] Successfully sent affiliate DM to conversation ${conversation.id}`);
        } else {
          console.error(`[AFFILIATE-DM-CRON] Failed to send affiliate DM to conversation ${conversation.id}`);
        }

      } catch (error) {
        console.error(`[AFFILIATE-DM-CRON] Error processing conversation ${conversation.id}:`, error);
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      totalOfferConversations: offerConversations.length,
      sentCount,
      skippedCount,
      message: `Processed ${offerConversations.length} conversations in OFFER stage. Sent ${sentCount} DMs, skipped ${skippedCount}`
    };

    console.log(`[AFFILIATE-DM-CRON] Completed:`, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error(`[AFFILIATE-DM-CRON] Cron job failed:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
