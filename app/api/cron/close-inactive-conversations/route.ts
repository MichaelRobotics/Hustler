/**
 * Close Inactive Conversations Cron Job
 * 
 * Runs daily to close conversations that have been inactive for 2 days.
 * A conversation is considered inactive if the last message was sent 2+ days ago.
 * 
 * Schedule: Daily at 2:00 AM UTC
 * Target: Active conversations with last message 2+ days old
 */

import { NextRequest, NextResponse } from "next/server";
import { closeInactiveConversations } from "@/lib/actions/conversation-cleanup-actions";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware/whop-auth";

export async function GET(request: NextRequest) {
  try {
    console.log(`[CloseInactiveConversations] Starting to close inactive conversations`);

    const result = await closeInactiveConversations();

    if (result.success) {
      return createSuccessResponse({
        closed: result.closed,
        errors: result.errors,
        errorCount: result.errors.length,
      }, `Closed ${result.closed} inactive conversations`);
    } else {
      return createErrorResponse(
        "CLEANUP_FAILED",
        "Failed to close inactive conversations",
        500
      );
    }

  } catch (error) {
    console.error("[CloseInactiveConversations] Cron job error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
