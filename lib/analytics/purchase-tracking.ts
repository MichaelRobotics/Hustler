/**
 * Simplified Purchase Tracking
 * 
 * Handles conversion tracking from Whop webhooks for the new analytics system.
 * This replaces the complex custom tracking with a simpler Whop-native approach.
 */

import { db } from "@/lib/supabase/db-server";
import { funnelAnalytics } from "@/lib/supabase/schema";
import { eq, sql } from "drizzle-orm";
import { updateFunnelGrowthPercentages } from "../actions/funnel-actions";

export interface PurchaseData {
  userId: string;
  companyId: string;
  productId?: string;
  accessPassId?: string;
  planId?: string;
  amount: number;
  currency: string;
  purchaseTime: Date;
  metadata?: {
    funnelId?: string;
    experienceId?: string;
    [key: string]: any;
  };
}

/**
 * Track purchase conversion from Whop webhook
 * Simplified for Whop native tracking system
 */
export async function trackPurchaseConversion(
  purchaseData: PurchaseData
): Promise<boolean> {
  try {
    console.log("🔍 Tracking Whop webhook conversion for user:", purchaseData.userId);

    // Get funnel and experience from metadata
    const funnelId = purchaseData.metadata?.funnelId;
    const experienceId = purchaseData.metadata?.experienceId;
    
    if (!funnelId || !experienceId) {
      console.log("⚠️ No funnel/experience metadata found for purchase");
      return false;
    }

    // Update funnel analytics with conversion
    await updateFunnelConversionAnalytics(experienceId, funnelId, purchaseData);
    console.log("✅ Whop webhook conversion tracked successfully");
    return true;

  } catch (error) {
    console.error("❌ Error tracking purchase conversion:", error);
    return false;
  }
}

/**
 * Update funnel analytics with conversion data
 */
async function updateFunnelConversionAnalytics(
  experienceId: string,
  funnelId: string,
  purchaseData: PurchaseData
): Promise<void> {
  try {
    const today = new Date();
    const isToday = isTodayDate(today);
    
    // Check if funnel analytics record exists
    const existingFunnelAnalytics = await db.select()
      .from(funnelAnalytics)
      .where(eq(funnelAnalytics.funnelId, funnelId))
      .limit(1);

    const affiliateAmount = 0; // No affiliate tracking in simplified system
    const productAmount = purchaseData.amount;

    if (existingFunnelAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelAnalytics)
        .set({
          totalConversions: sql`${funnelAnalytics.totalConversions} + 1`,
          totalProductRevenue: sql`${funnelAnalytics.totalProductRevenue} + ${productAmount}`,
          todayConversions: isToday ? sql`${funnelAnalytics.todayConversions} + 1` : funnelAnalytics.todayConversions,
          todayProductRevenue: isToday ? sql`${funnelAnalytics.todayProductRevenue} + ${productAmount}` : funnelAnalytics.todayProductRevenue,
          lastUpdated: new Date()
        })
        .where(eq(funnelAnalytics.id, existingFunnelAnalytics[0].id));
    } else {
      // Create new record
      await db.insert(funnelAnalytics).values({
        experienceId,
        funnelId,
        totalConversions: 1,
        totalProductRevenue: productAmount.toString(),
        todayConversions: isToday ? 1 : 0,
        todayProductRevenue: isToday ? productAmount.toString() : "0",
        lastUpdated: new Date()
      });
    }
    
    // Update growth percentages
    await updateFunnelGrowthPercentages(funnelId);
    
    console.log(`✅ Updated funnel analytics for funnel ${funnelId}`);
  } catch (error) {
    console.error("Error updating funnel conversion analytics:", error);
    throw error;
  }
}

/**
 * Check if the given date is today
 */
function isTodayDate(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}