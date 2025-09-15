/**
 * Phase 1 Low Priority Polling Cron Job
 * 
 * Polls every 5 minutes for conversations in Phase 1 (WELCOME stage)
 * that are 10-30 minutes old from the start of Phase 1.
 * 
 * Schedule: Every 5 minutes
 * Target: Phase 1 conversations aged 10-30 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { processConversationsForPhase } from "@/lib/utils/cron-dm-monitoring";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Phase1-Low] Starting low priority polling for Phase 1 conversations`);

    // Process conversations using the new cron-based DM monitoring
    const result = await processConversationsForPhase('PHASE1', 'PHASE1_LOW');

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed} Phase 1 conversations in low priority window`,
        processed: result.processed,
        total: result.total,
        results: result.results,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process conversations",
          processed: 0,
          errors: result.errors,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("[Phase1-Low] Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
      },
      { status: 500 }
    );
  }
}