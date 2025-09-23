/**
 * Product Card Management System for Webhook Analytics
 * 
 * This module handles creating and updating product cards in the sales dashboard
 * based on webhook analytics data.
 */

import { db } from "@/lib/supabase/db-server";
import { resources, funnelResourceAnalytics } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import type { ScenarioData } from "./scenario-detection";

/**
 * Update or create product card for analytics
 */
export async function updateProductCard(
  funnelId: string,
  productId: string,
  scenarioData: ScenarioData,
  experienceId: string
): Promise<boolean> {
  try {
    console.log(`[Product Card] Updating product card for product ${productId} in funnel ${funnelId}`);

    if (!experienceId) {
      console.error(`[Product Card] Experience ID required for product lookup`);
      return false;
    }

    // Find resource for this product with experience isolation
    const resource = await db.select()
      .from(resources)
      .where(and(
        eq(resources.whopProductId, productId),
        eq(resources.experienceId, experienceId)
      ))
      .limit(1);

    if (resource.length === 0) {
      console.error(`[Product Card] No resource found for product ${productId} in experience ${experienceId} - product must exist in database`);
      return false;
    }

    const resourceId = resource[0].id;
    const revenue = getRevenueForScenario(scenarioData);
    const today = new Date();
    const isToday = isTodayDate(today);

    console.log(`[Product Card] Revenue for scenario ${scenarioData.scenario}: ${revenue}`);

    // Determine type based on the scenario data
    const resourceType = scenarioData.scenario === 'AFFILIATE' ? 'AFFILIATE' : 'PRODUCT';
    
    // Check if funnel resource analytics record exists for this specific type
    const existingResourceAnalytics = await db.select()
      .from(funnelResourceAnalytics)
      .where(and(
        eq(funnelResourceAnalytics.funnelId, funnelId),
        eq(funnelResourceAnalytics.resourceId, resourceId),
        eq(funnelResourceAnalytics.type, resourceType)
      ))
      .limit(1);

    if (existingResourceAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelResourceAnalytics)
        .set({
          totalResourceConversions: sql`${funnelResourceAnalytics.totalResourceConversions} + 1`,
          totalResourceRevenue: sql`${funnelResourceAnalytics.totalResourceRevenue} + ${revenue}`,
          todayResourceConversions: isToday ? sql`${funnelResourceAnalytics.todayResourceConversions} + 1` : funnelResourceAnalytics.todayResourceConversions,
          todayResourceRevenue: isToday ? sql`${funnelResourceAnalytics.todayResourceRevenue} + ${revenue}` : funnelResourceAnalytics.todayResourceRevenue,
          lastUpdated: new Date()
        })
        .where(eq(funnelResourceAnalytics.id, existingResourceAnalytics[0].id));

      console.log(`[Product Card] Updated existing product card for product ${productId}`);
    } else {
      // Create new record
      await db.insert(funnelResourceAnalytics).values({
        experienceId: experienceId || resource[0].experienceId, // Use provided experienceId or get from resource
        funnelId,
        resourceId,
        type: resourceType, // Add type field
        totalResourceConversions: 1,
        totalResourceRevenue: revenue.toString(),
        todayResourceConversions: isToday ? 1 : 0,
        todayResourceRevenue: isToday ? revenue.toString() : "0",
        lastUpdated: new Date()
      });

      console.log(`[Product Card] Created new product card for product ${productId}`);
    }

    return true;
  } catch (error) {
    console.error(`[Product Card] Error updating product card for product ${productId}:`, error);
    return false;
  }
}


/**
 * Get revenue amount for scenario
 */
function getRevenueForScenario(scenarioData: ScenarioData): number {
  if (scenarioData.scenario === 'PRODUCT') {
    // Whop Owner sells their own product → Track Whop Owner's product revenue
    // Track as product revenue (My Products)
    return scenarioData.productOwnerRevenue || 0;
  } else if (scenarioData.scenario === 'AFFILIATE') {
    // Whop Owner sells another Whop Owner's product → Track Whop Owner's affiliate revenue
    // Track as affiliate revenue (Affiliate Sales)
    return scenarioData.affiliateCommission || 0;
  }
  
  return 0;
}

/**
 * Check if the given date is today
 */
function isTodayDate(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Get product card analytics for a funnel
 */
export async function getProductCardAnalytics(funnelId: string): Promise<any[]> {
  try {
    const analytics = await db.select()
      .from(funnelResourceAnalytics)
      .where(eq(funnelResourceAnalytics.funnelId, funnelId));

    return analytics;
  } catch (error) {
    console.error(`[Product Card] Error getting analytics for funnel ${funnelId}:`, error);
    return [];
  }
}

/**
 * Update product card with additional metadata
 */
export async function updateProductCardMetadata(
  funnelId: string,
  productId: string,
  metadata: any
): Promise<boolean> {
  try {
    // Find resource for this product
    const resource = await db.select()
      .from(resources)
      .where(eq(resources.whopProductId, productId))
      .limit(1);

    if (resource.length === 0) {
      console.log(`[Product Card] No resource found for product ${productId}`);
      return false;
    }

    const resourceId = resource[0].id;

    // Update metadata in funnel resource analytics
    await db.update(funnelResourceAnalytics)
      .set({
        metadata: {
          ...resource[0].metadata,
          ...metadata,
          lastUpdated: new Date().toISOString()
        }
      })
      .where(and(
        eq(funnelResourceAnalytics.funnelId, funnelId),
        eq(funnelResourceAnalytics.resourceId, resourceId)
      ));

    console.log(`[Product Card] Updated metadata for product ${productId}`);
    return true;
  } catch (error) {
    console.error(`[Product Card] Error updating metadata for product ${productId}:`, error);
    return false;
  }
}

