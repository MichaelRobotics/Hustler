/**
 * Enhanced Purchase Tracking with Scenario Detection
 * 
 * Handles conversion tracking from Whop webhooks with scenario detection
 * for affiliate vs product owner revenue attribution.
 */

import { db } from "@/lib/supabase/db-server";
import { funnelAnalytics } from "@/lib/supabase/schema";
import { eq, sql } from "drizzle-orm";
import { updateFunnelGrowthPercentages } from "../actions/funnel-actions";
import type { ScenarioData } from "./scenario-detection";
import { updateProductCard } from "./product-card-management";



/**
 * Track purchase conversion with scenario detection and analytics
 */
export async function trackPurchaseConversionWithScenario(
  scenarioData: ScenarioData,
  conversation: any,
  funnelId: string,
  experienceId: string
): Promise<boolean> {
  try {
    console.log(`[Purchase Tracking] Tracking conversion for scenario: ${scenarioData.scenario}`);

    if (scenarioData.scenario === 'error') {
      console.log('[Purchase Tracking] Skipping analytics update - error scenario');
      return false;
    }

    if (!conversation || !funnelId || !experienceId) {
      console.log('[Purchase Tracking] Missing conversation, funnelId, or experienceId');
      return false;
    }

    // Update funnel analytics with scenario-based revenue
    await updateFunnelAnalyticsWithScenario(funnelId, scenarioData, experienceId);
    
    // Update product card
    if (scenarioData.productId && experienceId) {
      await updateProductCard(funnelId, scenarioData.productId, scenarioData, experienceId);
    } else if (scenarioData.productId && !experienceId) {
      console.error('[Purchase Tracking] Cannot update product card - experienceId required');
    }
    
    console.log(`[Purchase Tracking] Analytics updated for scenario: ${scenarioData.scenario}`);
    return true;
  } catch (error) {
    console.error('[Purchase Tracking] Error updating analytics:', error);
    return false;
  }
}


/**
 * Update funnel analytics with scenario-based revenue attribution
 */
async function updateFunnelAnalyticsWithScenario(
  funnelId: string,
  scenarioData: ScenarioData,
  experienceId: string
): Promise<void> {
  try {
    const today = new Date();
    const isToday = isTodayDate(today);
    
    // Check if funnel analytics record exists
    const existingFunnelAnalytics = await db.select()
      .from(funnelAnalytics)
      .where(eq(funnelAnalytics.funnelId, funnelId))
      .limit(1);

    let affiliateAmount = 0;
    let productAmount = 0;

    if (scenarioData.scenario === 'PRODUCT') {
      // Whop Owner sells their own product → Track Whop Owner's product revenue
      // Track as product revenue (My Products)
      productAmount = scenarioData.productOwnerRevenue || 0;
    } else if (scenarioData.scenario === 'AFFILIATE') {
      // Whop Owner sells another Whop Owner's product → Track Whop Owner's affiliate revenue
      // Track as affiliate revenue (Affiliate Sales)
      affiliateAmount = scenarioData.affiliateCommission || 0;
    }

    console.log(`[Purchase Tracking] Revenue attribution - Affiliate: ${affiliateAmount}, Product: ${productAmount}`);

    if (existingFunnelAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelAnalytics)
        .set({
          totalConversions: sql`${funnelAnalytics.totalConversions} + 1`,
          totalAffiliateRevenue: sql`${funnelAnalytics.totalAffiliateRevenue} + ${affiliateAmount}`,
          totalProductRevenue: sql`${funnelAnalytics.totalProductRevenue} + ${productAmount}`,
          todayConversions: isToday ? sql`${funnelAnalytics.todayConversions} + 1` : funnelAnalytics.todayConversions,
          todayAffiliateRevenue: isToday ? sql`${funnelAnalytics.todayAffiliateRevenue} + ${affiliateAmount}` : funnelAnalytics.todayAffiliateRevenue,
          todayProductRevenue: isToday ? sql`${funnelAnalytics.todayProductRevenue} + ${productAmount}` : funnelAnalytics.todayProductRevenue,
          lastUpdated: new Date()
        })
        .where(eq(funnelAnalytics.id, existingFunnelAnalytics[0].id));
    } else {
      // Create new record
      await db.insert(funnelAnalytics).values({
        experienceId: experienceId, // Use the correct experience ID parameter
        funnelId,
        totalConversions: 1,
        totalAffiliateRevenue: affiliateAmount.toString(),
        totalProductRevenue: productAmount.toString(),
        todayConversions: isToday ? 1 : 0,
        todayAffiliateRevenue: isToday ? affiliateAmount.toString() : "0",
        todayProductRevenue: isToday ? productAmount.toString() : "0",
        lastUpdated: new Date()
      });
    }
    
    // Update growth percentages
    await updateFunnelGrowthPercentages(funnelId);
    
    console.log(`✅ Updated funnel analytics for funnel ${funnelId} with scenario ${scenarioData.scenario}`);
  } catch (error) {
    console.error("Error updating funnel analytics with scenario:", error);
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