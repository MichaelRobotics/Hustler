/**
 * Send Funnel Notifications Cron Job
 *
 * For each active conversation, determines if a reminder is due (current block, stage,
 * inactivity time, and which notification sequence has already been sent). Sends push
 * notifications via Whop API (experience_id + user_ids) so the user gets a reminder and
 * opening it opens the app.
 *
 * Schedule: e.g. every 5–15 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq, asc, isNotNull } from "drizzle-orm";
import { db } from "@/lib/supabase/db-server";
import {
  conversations,
  funnelNotifications,
  funnels,
  experiences,
  messages,
} from "@/lib/supabase/schema";
import { sendWhopNotification } from "@/lib/helpers/whop-notifications";
import {
  addMessage,
  deleteLastBotMessage,
  formatFunnelBlockMessage,
} from "@/lib/actions/simplified-conversation-actions";
import type { FunnelFlow } from "@/lib/types/funnel";

function getStageIdForBlock(blockId: string | null, flow: FunnelFlow | null): string | null {
  if (!blockId || !flow?.stages) return null;
  for (const stage of flow.stages) {
    if (stage.blockIds?.includes(blockId)) return stage.id;
  }
  return null;
}

/**
 * Resolve offer timer: for conversations that have passed their deadline,
 * check purchase in window and advance to upsell or downsell block.
 * Purchase check is a stub (returns false) until Whop webhooks or purchases table is wired.
 */
async function resolveOfferTimers(now: Date): Promise<{ resolved: string[]; errors: string[] }> {
  const resolved: string[] = [];
  const errs: string[] = [];
  const withTimer = await db.query.conversations.findMany({
    where: and(
      eq(conversations.status, "active"),
      eq(conversations.controlledBy, "bot"),
      isNotNull(conversations.offerCtaClickedAt),
      isNotNull(conversations.offerCtaBlockId),
    ),
    columns: {
      id: true,
      experienceId: true,
      offerCtaClickedAt: true,
      offerCtaBlockId: true,
      offerPurchasedAt: true,
      userPath: true,
    },
    with: { funnel: { columns: { flow: true } } },
  });

  for (const conv of withTimer) {
    const flow = conv.funnel?.flow as FunnelFlow | null;
    if (!flow?.blocks) {
      errs.push(`Conversation ${conv.id}: no flow`);
      continue;
    }
    const offerBlock = flow.blocks[conv.offerCtaBlockId!];
    if (!offerBlock) {
      errs.push(`Conversation ${conv.id}: offer block not found`);
      continue;
    }
    const timeoutMin = offerBlock.timeoutMinutes ?? 0;
    const clickedAt = new Date(conv.offerCtaClickedAt!);
    const deadline = new Date(clickedAt.getTime() + timeoutMin * 60 * 1000);
    if (now < deadline) continue;

    const upsellBlockId = offerBlock.upsellBlockId ?? null;
    const downsellBlockId = offerBlock.downsellBlockId ?? null;
    if (!upsellBlockId && !downsellBlockId) {
      errs.push(`Conversation ${conv.id}: no upsell or downsell target`);
      continue;
    }

    // Check conversations.offerPurchasedAt for a purchase in [offerCtaClickedAt, deadline]
    const paidAt = conv.offerPurchasedAt ? new Date(conv.offerPurchasedAt) : null;
    const purchased = !!(paidAt && paidAt >= clickedAt && paidAt <= deadline);

    const nowDate = new Date();
    if (purchased && upsellBlockId) {
      const nextBlock = flow.blocks[upsellBlockId];
      if (!nextBlock) {
        errs.push(`Conversation ${conv.id}: upsell block not found`);
        continue;
      }
      const content = await formatFunnelBlockMessage(
        nextBlock,
        conv.experienceId,
        conv.id,
        flow,
      );
      await db
        .update(conversations)
        .set({
          currentBlockId: upsellBlockId,
          currentBlockEnteredAt: nowDate,
          lastNotificationSequenceSent: null,
          offerCtaClickedAt: null,
          offerCtaBlockId: null,
          offerPurchasedAt: null,
          userPath: [...((conv.userPath as string[]) || []), upsellBlockId].filter(Boolean),
          updatedAt: nowDate,
        })
        .where(eq(conversations.id, conv.id));
      await addMessage(conv.id, "bot", content);
      resolved.push(`${conv.id}-upsell`);
    } else if (downsellBlockId) {
      const nextBlock = flow.blocks[downsellBlockId];
      if (!nextBlock) {
        errs.push(`Conversation ${conv.id}: downsell block not found`);
        continue;
      }
      await deleteLastBotMessage(conv.id);
      const content = await formatFunnelBlockMessage(
        nextBlock,
        conv.experienceId,
        conv.id,
        flow,
      );
      await db
        .update(conversations)
        .set({
          currentBlockId: downsellBlockId,
          currentBlockEnteredAt: nowDate,
          lastNotificationSequenceSent: null,
          offerCtaClickedAt: null,
          offerCtaBlockId: null,
          userPath: [...((conv.userPath as string[]) || []), downsellBlockId].filter(Boolean),
          updatedAt: nowDate,
        })
        .where(eq(conversations.id, conv.id));
      await addMessage(conv.id, "bot", content);
      resolved.push(`${conv.id}-downsell`);
    }
  }
  return { resolved, errors: errs };
}

export async function GET(request: NextRequest) {
  const sent: string[] = [];
  const errors: string[] = [];

  try {
    const now = new Date();

    // Resolve offer timers (upsell/downsell after CTA click + timeout)
    const timerResult = await resolveOfferTimers(now);
    errors.push(...timerResult.errors);

    const activeConversations = await db.query.conversations.findMany({
      where: and(eq(conversations.status, "active"), eq(conversations.controlledBy, "bot")),
      columns: {
        id: true,
        experienceId: true,
        funnelId: true,
        whopUserId: true,
        currentBlockId: true,
        currentBlockEnteredAt: true,
        lastNotificationSequenceSent: true,
        flow: true,
      },
      with: {
        experience: { columns: { whopExperienceId: true } },
        funnel: { columns: { flow: true } },
      },
    });

    for (const conv of activeConversations) {
      if (!conv.currentBlockId || !conv.currentBlockEnteredAt) continue;

      const flow = (conv.flow as FunnelFlow) ?? (conv.funnel?.flow as FunnelFlow);
      if (!flow) continue;

      const stageId = getStageIdForBlock(conv.currentBlockId, flow);
      if (!stageId) continue;

      const notifications = await db.query.funnelNotifications.findMany({
        where: and(
          eq(funnelNotifications.funnelId, conv.funnelId),
          eq(funnelNotifications.stageId, stageId)
        ),
        orderBy: [asc(funnelNotifications.sequence)],
      });

      const enteredAt = new Date(conv.currentBlockEnteredAt);
      const minutesInactive = (now.getTime() - enteredAt.getTime()) / (60 * 1000);
      const lastSeq = conv.lastNotificationSequenceSent ?? 0;

      for (const notif of notifications) {
        if (notif.isReset) {
          const delayMin = notif.delayMinutes ?? 0;
          const threshold = notif.inactivityMinutes + delayMin;
          if (minutesInactive >= threshold && lastSeq >= 3) {
            if (notif.resetAction === "delete") {
              await db
                .update(conversations)
                .set({ status: "archived", updatedAt: now })
                .where(eq(conversations.id, conv.id));
            } else if (notif.resetAction === "complete") {
              await db
                .update(conversations)
                .set({ status: "closed", updatedAt: now })
                .where(eq(conversations.id, conv.id));
            }
            break;
          }
          continue;
        }

        if (minutesInactive < notif.inactivityMinutes) continue;
        if (notif.sequence !== lastSeq + 1) continue;

        const whopExperienceId = (conv.experience as { whopExperienceId?: string } | null)?.whopExperienceId;
        if (!whopExperienceId) {
          errors.push(`Conversation ${conv.id}: missing experience whopExperienceId`);
          continue;
        }

        const result = await sendWhopNotification({
          experience_id: whopExperienceId,
          user_ids: [conv.whopUserId],
          title: "Reminder",
          content: notif.message,
          rest_path: `/chat?conversation=${conv.id}`,
        });

        if (!result.success) {
          errors.push(`Conversation ${conv.id} seq ${notif.sequence}: ${result.error}`);
          continue;
        }

        await db
          .update(conversations)
          .set({
            lastNotificationSequenceSent: notif.sequence,
            updatedAt: now,
          })
          .where(eq(conversations.id, conv.id));

        try {
          await addMessage(conv.id, "bot", notif.message);
        } catch (_) {
          // non-fatal
        }

        sent.push(`${conv.id}-seq${notif.sequence}`);
      }
    }

    return NextResponse.json({
      success: true,
      sent: sent.length,
      sentIds: sent,
      offerTimersResolved: timerResult.resolved.length,
      offerTimerIds: timerResult.resolved,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    console.error("[send-funnel-notifications] Cron error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
