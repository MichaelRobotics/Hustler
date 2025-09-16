/**
 * Phase 2 Low Priority Polling Cron Job
 * 
 * Polls every 5 minutes for conversations in Phase 2 (VALUE_DELIVERY stage)
 * that are 30-60 minutes old from the start of Phase 2.
 * 
 * Schedule: Every 5 minutes
 * Target: Phase 2 conversations aged 30-60 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { processConversationsForPhase } from "@/lib/utils/cron-dm-monitoring";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware/whop-auth";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Phase2-Low] Starting low priority polling for Phase 2 conversations`);

    // Process conversations using the new cron-based DM monitoring
    const result = await processConversationsForPhase('PHASE2', 'PHASE2_LOW');

    if (result.success) {
      return createSuccessResponse({
        processed: result.processed,
        total: result.total,
        results: result.results,
        errors: result.errors,
      }, `Processed ${result.processed} conversations`);
    } else {
      return createErrorResponse(
        "PROCESSING_FAILED",
        "Failed to process conversations",
        500
      );
    }

  } catch (error) {
    console.error("[Cron] Error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}