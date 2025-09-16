/**
 * Delete Old Closed Conversations Cron Job
 * 
 * Runs daily to permanently delete conversations that have been closed for 2 days.
 * This helps maintain database performance and storage efficiency.
 * 
 * Schedule: Daily at 3:00 AM UTC
 * Target: Closed conversations that were closed 2+ days ago
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteOldClosedConversations } from "@/lib/actions/conversation-cleanup-actions";
import { createSuccessResponse, createErrorResponse } from "@/lib/middleware/whop-auth";

export async function GET(request: NextRequest) {
  try {
    console.log(`[DeleteOldClosedConversations] Starting to delete old closed conversations`);

    const result = await deleteOldClosedConversations();

    if (result.success) {
      return createSuccessResponse({
        deleted: result.deleted,
        errors: result.errors,
        errorCount: result.errors.length,
      }, `Deleted ${result.deleted} old closed conversations`);
    } else {
      return createErrorResponse(
        "CLEANUP_FAILED",
        "Failed to delete old closed conversations",
        500
      );
    }

  } catch (error) {
    console.error("[DeleteOldClosedConversations] Cron job error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}
