/**
 * WELCOME -> VALUE_DELIVERY Transition Cron Job
 * 
 * Runs every 2 hours to handle WELCOME conversations that haven't progressed
 * to VALUE_DELIVERY after 2 hours. Sends a VALUE_DELIVERY message.
 * 
 * Schedule: Every 2 hours
 * Target: WELCOME conversations older than 2 hours
 */

import { NextRequest, NextResponse } from "next/server";
import { handleWelcomeToValueDeliveryTransition } from "@/lib/utils/cron-dm-monitoring";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware/whop-auth";

export async function GET(request: NextRequest) {
  try {

    console.log(`[Welcome-ValueDelivery] Starting WELCOME -> VALUE_DELIVERY transition`);

    // Process transition using the new cron-based DM monitoring
    const result = await handleWelcomeToValueDeliveryTransition();

    if (result.success) {
      return createSuccessResponse({
        processed: result.processed,
        results: result.results,
      }, `WELCOME -> VALUE_DELIVERY transition completed: ${result.processed} conversations processed`);
    } else {
      return createErrorResponse(
        "TRANSITION_FAILED",
        "Failed to process WELCOME -> VALUE_DELIVERY transition",
        500
      );
    }

  } catch (error) {
    console.error("[Welcome-ValueDelivery] Cron job error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

