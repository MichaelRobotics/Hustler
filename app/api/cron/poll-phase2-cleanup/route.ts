/**
 * Phase 2 Cleanup Cron Job
 * 
 * Runs daily to handle Phase 2 conversations that haven't been completed
 * after 24 hours. Sends a TRANSITION message with personalized chat link.
 * 
 * Schedule: Daily at midnight
 * Target: Phase 2 conversations older than 24 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { handlePhase2Cleanup } from "@/lib/utils/cron-dm-monitoring";

export async function GET(request: NextRequest) {
  try {
    console.log(`[Phase2-Cleanup] Starting Phase 2 cleanup`);

    // Process cleanup using the new cron-based DM monitoring
    const result = await handlePhase2Cleanup();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Phase 2 cleanup completed: ${result.processed} conversations processed`,
        processed: result.processed,
        results: result.results,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process Phase 2 cleanup",
          processed: 0,
          results: result.results,
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("[Phase2-Cleanup] Cron job error:", error);
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