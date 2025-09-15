/**
 * Phase 2 Extended Polling Cron Job
 * 
 * Polls every 30 minutes for conversations in Phase 2 (VALUE_DELIVERY stage)
 * that are 1-24 hours old from the start of Phase 2.
 * 
 * Schedule: Every 30 minutes
 * Target: Phase 2 conversations aged 1-24 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { processConversationsForPhase } from "@/lib/utils/cron-dm-monitoring";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Phase2-Extended] Starting extended polling for Phase 2 conversations`);

    // Process conversations using the new cron-based DM monitoring
    const result = await processConversationsForPhase('PHASE2', 'PHASE2_EXTENDED');

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed} Phase 2 conversations in extended window`,
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
    console.error("[Phase2-Extended] Cron job error:", error);
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