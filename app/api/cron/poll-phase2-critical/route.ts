/**
 * Phase 2 Critical Polling Cron Job
 * 
 * Polls every minute for conversations in Phase 2 (VALUE_DELIVERY stage)
 * that are 0-5 minutes old from the start of Phase 2.
 * 
 * Schedule: Every minute
 * Target: Phase 2 conversations aged 0-5 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { processConversationsForPhase } from "@/lib/utils/cron-dm-monitoring";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Phase2-Critical] Starting critical polling for Phase 2 conversations`);

    // Process conversations using the new cron-based DM monitoring
    const result = await processConversationsForPhase('PHASE2', 'PHASE2_CRITICAL');

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Processed ${result.processed} Phase 2 conversations in critical window`,
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
    console.error("[Phase2-Critical] Cron job error:", error);
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