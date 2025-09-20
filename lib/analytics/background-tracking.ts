import { db } from "@/lib/supabase/db-server";
import { funnelAnalytics } from "@/lib/supabase/schema";
import { eq, sql, and } from "drizzle-orm";

/**
 * Background Analytics Tracking Service
 * 
 * This service provides non-blocking analytics tracking that won't interfere
 * with the main conversation flow. All tracking is done in the background.
 */

/**
 * Track awareness (starts) when WELCOME DM is sent
 * This is called when a welcome message is sent to a user
 */
export async function trackAwarenessBackground(
  experienceId: string,
  funnelId: string
): Promise<void> {
  try {
    console.log(`📊 [BACKGROUND] Tracking awareness for funnel ${funnelId} in experience ${experienceId}`);
    
    const today = new Date();
    const isToday = isTodayDate(today);
    
    // Check if funnel analytics record exists for this specific experience and funnel
    // First check for exact match, then check for funnel-only match (to handle null experienceId)
    let existingFunnelAnalytics = await db.select()
      .from(funnelAnalytics)
      .where(and(
        eq(funnelAnalytics.funnelId, funnelId),
        eq(funnelAnalytics.experienceId, experienceId)
      ))
      .limit(1);

    // If no exact match found, check for funnel-only match (for records with null experienceId)
    if (existingFunnelAnalytics.length === 0) {
      existingFunnelAnalytics = await db.select()
        .from(funnelAnalytics)
        .where(eq(funnelAnalytics.funnelId, funnelId))
        .limit(1);
    }

    if (existingFunnelAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelAnalytics)
        .set({
          experienceId: experienceId, // Set experienceId if it was null
          totalStarts: sql`${funnelAnalytics.totalStarts} + 1`,
          todayStarts: isToday ? sql`${funnelAnalytics.todayStarts} + 1` : funnelAnalytics.todayStarts,
          lastUpdated: new Date()
        })
        .where(eq(funnelAnalytics.id, existingFunnelAnalytics[0].id));
    } else {
      // Create new record
      await db.insert(funnelAnalytics).values({
        experienceId,
        funnelId,
        totalStarts: 1,
        todayStarts: isToday ? 1 : 0,
        lastUpdated: new Date()
      });
    }

    console.log(`✅ [BACKGROUND] Tracked awareness for funnel ${funnelId}`);
  } catch (error) {
    console.error("❌ [BACKGROUND] Error tracking awareness:", error);
    // Don't throw - this is background tracking
  }
}

/**
 * Track interest when conversation reaches PAIN_POINT_QUALIFICATION stage
 * This is called when a user progresses to the pain point qualification stage
 */
export async function trackInterestBackground(
  experienceId: string,
  funnelId: string
): Promise<void> {
  try {
    console.log(`📊 [BACKGROUND] Tracking interest for funnel ${funnelId} in experience ${experienceId}`);
    
    const today = new Date();
    const isToday = isTodayDate(today);
    
    // Check if funnel analytics record exists for this specific experience and funnel
    const existingFunnelAnalytics = await db.select()
      .from(funnelAnalytics)
      .where(and(
        eq(funnelAnalytics.funnelId, funnelId),
        eq(funnelAnalytics.experienceId, experienceId)
      ))
      .limit(1);

    if (existingFunnelAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelAnalytics)
        .set({
          experienceId: experienceId, // Set experienceId if it was null
          totalInterest: sql`${funnelAnalytics.totalInterest} + 1`,
          todayInterest: isToday ? sql`${funnelAnalytics.todayInterest} + 1` : funnelAnalytics.todayInterest,
          lastUpdated: new Date()
        })
        .where(eq(funnelAnalytics.id, existingFunnelAnalytics[0].id));
    } else {
      // Create new record
      await db.insert(funnelAnalytics).values({
        experienceId,
        funnelId,
        totalInterest: 1,
        todayInterest: isToday ? 1 : 0,
        lastUpdated: new Date()
      });
    }

    console.log(`✅ [BACKGROUND] Tracked interest for funnel ${funnelId}`);
  } catch (error) {
    console.error("❌ [BACKGROUND] Error tracking interest:", error);
    // Don't throw - this is background tracking
  }
}

/**
 * Track intent when user clicks button and discovery page product is shown
 * This is called when a user clicks a resource link button
 */
export async function trackIntentBackground(
  experienceId: string,
  funnelId: string
): Promise<void> {
  try {
    console.log(`📊 [BACKGROUND] Tracking intent for funnel ${funnelId} in experience ${experienceId}`);
    
    const today = new Date();
    const isToday = isTodayDate(today);
    
    // Check if funnel analytics record exists for this specific experience and funnel
    const existingFunnelAnalytics = await db.select()
      .from(funnelAnalytics)
      .where(and(
        eq(funnelAnalytics.funnelId, funnelId),
        eq(funnelAnalytics.experienceId, experienceId)
      ))
      .limit(1);

    if (existingFunnelAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelAnalytics)
        .set({
          experienceId: experienceId, // Set experienceId if it was null
          totalIntent: sql`${funnelAnalytics.totalIntent} + 1`,
          todayIntent: isToday ? sql`${funnelAnalytics.todayIntent} + 1` : funnelAnalytics.todayIntent,
          lastUpdated: new Date()
        })
        .where(eq(funnelAnalytics.id, existingFunnelAnalytics[0].id));
    } else {
      // Create new record
      await db.insert(funnelAnalytics).values({
        experienceId,
        funnelId,
        totalIntent: 1,
        todayIntent: isToday ? 1 : 0,
        lastUpdated: new Date()
      });
    }

    console.log(`✅ [BACKGROUND] Tracked intent for funnel ${funnelId}`);
  } catch (error) {
    console.error("❌ [BACKGROUND] Error tracking intent:", error);
    // Don't throw - this is background tracking
  }
}

/**
 * Check if a date is today
 */
function isTodayDate(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Safe background tracking wrapper
 * This ensures tracking never blocks the main flow
 */
export function safeBackgroundTracking(
  trackingFunction: () => Promise<void>
): void {
  // Use setImmediate to run in the next tick, completely non-blocking
  setImmediate(async () => {
    try {
      await trackingFunction();
    } catch (error) {
      console.error("❌ [BACKGROUND] Safe tracking error:", error);
      // Silently fail - never break the main flow
    }
  });
}
