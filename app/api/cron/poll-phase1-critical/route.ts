/**
 * Phase 1 Critical Polling Cron Job
 * 
 * Polls every minute for conversations in Phase 1 (WELCOME stage)
 * that are 0-2 minutes old from the start of Phase 1.
 * 
 * Schedule: Every minute
 * Target: Phase 1 conversations aged 0-2 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { processConversationsForPhase } from "@/lib/utils/cron-dm-monitoring";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware/whop-auth";

export async function GET(request: NextRequest) {
  try {

    console.log(`[Phase1-Critical] Starting critical polling for Phase 1 conversations`);

    // Process conversations using the new cron-based DM monitoring
    const result = await processConversationsForPhase('PHASE1', 'PHASE1_CRITICAL');

    if (result.success) {
      return createSuccessResponse({
        processed: result.processed,
        total: result.total,
        results: result.results,
        errors: result.errors,
      }, `Processed ${result.processed} Phase 1 conversations in critical window`);
    } else {
      return createErrorResponse(
        "PROCESSING_FAILED",
        "Failed to process conversations",
        500
      );
    }

  } catch (error) {
    console.error("[Phase1-Critical] Cron job error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}