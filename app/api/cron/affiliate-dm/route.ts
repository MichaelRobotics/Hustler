import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { conversations, messages, funnels } from "@/lib/supabase/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendAffiliateDM } from "@/lib/actions/affiliate-dm-actions";

/**
 * Cron job to send affiliate DMs to users who reached OFFER stage
 * Runs every 1 minute
 * 
 * Logic:
 * 1. Find conversations in OFFER stage
 * 2. Check if their last message is NOT an affiliate message
 * 3. Send affiliate DM if needed
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`[AFFILIATE-DM-CRON] Starting affiliate DM cron job at ${new Date().toISOString()}`);
    
    // Get conversations that have a current block ID (active conversations) AND affiliateSend = false
    console.log(`[AFFILIATE-DM-CRON] Fetching active conversations that haven't sent affiliate DM yet`);
    const activeConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.status, 'active'),
        sql`current_block_id IS NOT NULL`,
        eq(conversations.affiliateSend, false) // Only get conversations that haven't sent affiliate DM
      ),
      columns: {
        id: true,
        affiliateSend: true,
        currentBlockId: true,
        updatedAt: true,
        whopUserId: true
      },
      with: {
        messages: {
          orderBy: [desc(messages.createdAt)],
          limit: 1
        },
        funnel: true
      }
    });
    
    console.log(`[AFFILIATE-DM-CRON] Found ${activeConversations.length} active conversations that haven't sent affiliate DM yet`);
    console.log(`[AFFILIATE-DM-CRON] Sample conversation data:`, activeConversations[0] ? {
      id: activeConversations[0].id,
      affiliateSend: activeConversations[0].affiliateSend,
      currentBlockId: activeConversations[0].currentBlockId
    } : 'No conversations found');

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
    
    // Log OFFER conversations (all should have affiliateSend = false)
    console.log(`[AFFILIATE-DM-CRON] OFFER conversations (all eligible for affiliate DM):`);
    offerConversations.forEach((conv: any, index: number) => {
      console.log(`[AFFILIATE-DM-CRON] ${index + 1}. Conversation ${conv.id}: affiliateSend = ${conv.affiliateSend} (should be false)`);
    });

    let sentCount = 0;
    let skippedCount = 0;

    for (const conversation of offerConversations) {
      try {
        // Check if conversation has been in OFFER stage for at least 30 seconds
        // (to avoid sending immediately when user just reached OFFER)
        const now = new Date();
        const offerStageTime = conversation.updatedAt;
        const timeDiff = now.getTime() - offerStageTime.getTime();
        const secondsInOffer = timeDiff / 1000;

        if (secondsInOffer < 30) {
          console.log(`[AFFILIATE-DM-CRON] Skipping conversation ${conversation.id} - only ${secondsInOffer.toFixed(1)} seconds in OFFER stage`);
          skippedCount++;
          continue;
        }

        // Send affiliate DM - sendAffiliateDM() handles affiliateSend check atomically
        console.log(`[AFFILIATE-DM-CRON] Attempting to send affiliate DM to conversation ${conversation.id}`);
        const success = await sendAffiliateDM(conversation.id);
        
        if (success) {
          sentCount++;
          console.log(`[AFFILIATE-DM-CRON] Successfully sent affiliate DM to conversation ${conversation.id}`);
        } else {
          // This could mean DM was already sent (affiliateSend was true) or there was an error
          console.log(`[AFFILIATE-DM-CRON] Affiliate DM not sent for conversation ${conversation.id} (may have been already sent or error occurred)`);
          skippedCount++;
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
