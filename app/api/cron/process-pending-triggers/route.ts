/**
 * Process Pending Triggers Cron Job
 *
 * Finds pending triggers whose fire_at has elapsed and creates conversations + sends DMs.
 * Schedule: every 1–5 minutes (matching the desired delay granularity).
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq, lte } from "drizzle-orm";
import { db } from "@/lib/supabase/db-server";
import { pendingTriggers, funnels } from "@/lib/supabase/schema";
import { hasActiveConversation } from "@/lib/helpers/conversation-trigger";
import { createConversationWithDm } from "@/lib/actions/user-join-actions";
import { safeBackgroundTracking, trackAwarenessBackground } from "@/lib/analytics/background-tracking";
import type { FunnelFlow } from "@/lib/types/funnel";

export async function GET(_request: NextRequest) {
  const fired: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  try {
    const now = new Date();

    // Find all pending triggers whose fire_at has elapsed
    const pending = await db.query.pendingTriggers.findMany({
      where: and(
        eq(pendingTriggers.status, "pending"),
        lte(pendingTriggers.fireAt, now),
      ),
    });

    if (pending.length === 0) {
      return NextResponse.json({ message: "No pending triggers to process", fired: 0 });
    }

    console.log(`[CRON process-pending-triggers] Found ${pending.length} pending triggers to process`);

    for (const trigger of pending) {
      try {
        // Guard: if user already has an active conversation, cancel this trigger
        if (await hasActiveConversation(trigger.experienceId, trigger.whopUserId)) {
          await db
            .update(pendingTriggers)
            .set({ status: "cancelled" })
            .where(eq(pendingTriggers.id, trigger.id));
          skipped.push(trigger.id);
          console.log(`[CRON] Cancelled trigger ${trigger.id} — user ${trigger.whopUserId} already has active conversation`);
          continue;
        }

        // Get the funnel (re-check it's still deployed)
        const funnel = await db.query.funnels.findFirst({
          where: and(
            eq(funnels.id, trigger.funnelId),
            eq(funnels.isDeployed, true),
          ),
        });

        if (!funnel?.flow) {
          await db
            .update(pendingTriggers)
            .set({ status: "cancelled" })
            .where(eq(pendingTriggers.id, trigger.id));
          skipped.push(trigger.id);
          console.log(`[CRON] Cancelled trigger ${trigger.id} — funnel ${trigger.funnelId} not found or no longer deployed`);
          continue;
        }

        const funnelFlow = funnel.flow as FunnelFlow;

        // Fire: create conversation + send DM
        const conversationId = await createConversationWithDm(
          trigger.experienceId,
          trigger.funnelId,
          trigger.whopUserId,
          funnelFlow,
          trigger.membershipId ?? undefined,
          trigger.productId ?? undefined,
        );

        // Mark as fired
        await db
          .update(pendingTriggers)
          .set({ status: "fired" })
          .where(eq(pendingTriggers.id, trigger.id));

        // Track analytics
        safeBackgroundTracking(() => trackAwarenessBackground(trigger.experienceId, trigger.funnelId));

        fired.push(trigger.id);
        console.log(`[CRON] Fired trigger ${trigger.id} — created conversation ${conversationId} for user ${trigger.whopUserId}`);
      } catch (err) {
        console.error(`[CRON] Error processing trigger ${trigger.id}:`, err);
        errors.push(`${trigger.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      message: `Processed ${pending.length} pending triggers`,
      fired: fired.length,
      skipped: skipped.length,
      errors: errors.length,
      details: { fired, skipped, errors },
    });
  } catch (error) {
    console.error("[CRON process-pending-triggers] Error:", error);
    return NextResponse.json(
      { error: "Failed to process pending triggers" },
      { status: 500 },
    );
  }
}
