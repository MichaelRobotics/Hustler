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
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware/whop-auth";
import { authenticateAndValidateCron } from "@/lib/middleware/cron-auth";

export async function GET(request: NextRequest) {
  try {
    // Authenticate and validate cron request
    const authError = authenticateAndValidateCron(request);
    if (authError) return authError;

    console.log(`[Phase1-High] Starting high priority polling for Phase 1 conversations`);

    // Process conversations using the new cron-based DM monitoring
    const result = await processConversationsForPhase('PHASE1', 'PHASE1_HIGH');

    if (result.success) {
      return createSuccessResponse({
        processed: result.processed,
        total: result.total,
        results: result.results,
        errors: result.errors,
      }, `Processed ${result.processed} Phase 1 conversations in high priority window`);
    } else {
      return createErrorResponse(
        "PROCESSING_FAILED",
        "Failed to process conversations",
        500
      );
    }

  } catch (error) {
    console.error("[Phase1-High] Cron job error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}