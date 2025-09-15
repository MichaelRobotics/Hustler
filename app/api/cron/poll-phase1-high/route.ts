/**
 * Phase 1 High Priority Polling Cron Job
 * 
 * Polls every 2 minutes for conversations in Phase 1 (WELCOME stage)
 * that are 2-10 minutes old from the start of Phase 1.
 * 
 * Schedule: Every 2 minutes
 * Target: Phase 1 conversations aged 2-10 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { processConversationsForPhase } from "@/lib/utils/cron-dm-monitoring";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Phase1-High] Starting high priority polling for Phase 1 conversations`);

    // Process conversations using the new cron-based DM monitoring
    const result = await processConversationsForPhase('PHASE1', 'PHASE1_HIGH');

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed} Phase 1 conversations in high priority window`,
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
    console.error("[Phase1-High] Cron job error:", error);
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