/**
 * Phase 1 Cleanup Cron Job
 * 
 * Runs daily to handle Phase 1 conversations that haven't been completed
 * after 24 hours. Sends a random VALUE_DELIVERY message and transitions to Phase 2.
 * 
 * Schedule: Daily at midnight
 * Target: Phase 1 conversations older than 24 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { handlePhase1Cleanup } from "@/lib/utils/cron-dm-monitoring";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware/whop-auth";

export async function GET(request: NextRequest) {
  try {

    console.log(`[Phase1-Cleanup] Starting Phase 1 cleanup`);

    // Process cleanup using the new cron-based DM monitoring
    const result = await handlePhase1Cleanup();

    if (result.success) {
      return createSuccessResponse({
        processed: result.processed,
        results: result.results,
      }, `Phase 1 cleanup completed: ${result.processed} conversations processed`);
    } else {
      return createErrorResponse(
        "CLEANUP_FAILED",
        "Failed to process Phase 1 cleanup",
        500
      );
    }

  } catch (error) {
    console.error("[Phase1-Cleanup] Cron job error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}