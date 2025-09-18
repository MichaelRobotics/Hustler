import { db } from "@/lib/supabase/db-server";
import { funnelAnalytics, resources } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";
import { trackAffiliateCommission, extractAffiliateAppId } from "./affiliate-tracking";

/**
 * Purchase Tracking Utilities
 * Handles conversion tracking and attribution
 */

export interface PurchaseData {
  userId: string;
  companyId: string;
  productId?: string;
  accessPassId?: string;
  planId?: string;
  amount: number;
  currency: string;
  purchaseTime: Date;
}

export interface ClickTrackingData {
  resourceId: string;
  userId: string;
  experienceId: string;
  funnelId: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Track purchase conversion with attribution
 */
export async function trackPurchaseConversion(
  purchaseData: PurchaseData,
  clickTracking: Map<string, ClickTrackingData>
): Promise<boolean> {
  try {
    console.log("🔍 Tracking purchase conversion for user:", purchaseData.userId);

    // Find matching click tracking data
    const matchingClick = findMatchingClick(purchaseData.userId, clickTracking);
    
    if (!matchingClick) {
      console.log("⚠️ No matching click found for purchase");
      return false;
    }

    // Find the resource that was clicked
    const resource = await findResourceByWhopProduct(
      purchaseData.productId,
      purchaseData.accessPassId,
      purchaseData.planId
    );

    if (!resource) {
      console.log("⚠️ No matching resource found for purchase");
      return false;
    }

    // Record conversion in analytics
    await recordConversion(matchingClick, resource, purchaseData);
    
    // Check if this was an affiliate purchase
    const affiliateAppId = extractAffiliateAppId(matchingClick.redirectUrl || '');
    if (affiliateAppId) {
      console.log(`💰 Affiliate purchase detected! App ID: ${affiliateAppId}`);
      
			// Track affiliate commission (10% rate)
			await trackAffiliateCommission(
				affiliateAppId,
				purchaseData.productId || '',
				purchaseData.userId,
				purchaseData.amount,
				purchaseData.currency,
				0.10 // 10% commission rate
			);
    }
    
    console.log(`✅ Purchase conversion tracked: ${purchaseData.amount} ${purchaseData.currency}`);
    return true;

  } catch (error) {
    console.error("❌ Error tracking purchase conversion:", error);
    return false;
  }
}

/**
 * Find matching click tracking data for a user
 */
function findMatchingClick(
  userId: string,
  clickTracking: Map<string, ClickTrackingData>
): ClickTrackingData | null {
  // Find the most recent click for this user (within last 24 hours)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  let latestClick: ClickTrackingData | null = null;
  let latestTime = cutoff;

  for (const [, clickData] of clickTracking.entries()) {
    if (clickData.userId === userId && clickData.timestamp > latestTime) {
      latestClick = clickData;
      latestTime = clickData.timestamp;
    }
  }

  return latestClick;
}

/**
 * Find resource by Whop product/plan/access pass ID
 */
async function findResourceByWhopProduct(
  productId?: string,
  accessPassId?: string,
  planId?: string
) {
  try {
    // Search by whopProductId
    if (productId) {
      const resource = await db.select()
        .from(resources)
        .where(eq(resources.whopProductId, productId))
        .limit(1);
      
      if (resource[0]) return resource[0];
    }

    // Search by access pass ID (if stored in description or metadata)
    if (accessPassId) {
      const resource = await db.select()
        .from(resources)
        .where(
          and(
            eq(resources.type, "MY_PRODUCTS"),
            sql`${resources.description} LIKE ${'%' + accessPassId + '%'}`
          )
        )
        .limit(1);
      
      if (resource[0]) return resource[0];
    }

    return null;
  } catch (error) {
    console.error("Error finding resource:", error);
    return null;
  }
}

/**
 * Record conversion in analytics
 */
async function recordConversion(
  clickData: ClickTrackingData,
  resource: any,
  purchaseData: PurchaseData
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if analytics record exists for today
  const existingAnalytics = await db.select()
    .from(funnelAnalytics)
    .where(
      and(
        eq(funnelAnalytics.funnelId, clickData.funnelId),
        eq(funnelAnalytics.date, today),
        eq(funnelAnalytics.resourceId, resource.id)
      )
    )
    .limit(1);

  if (existingAnalytics.length > 0) {
    // Update existing record
    await db.update(funnelAnalytics)
      .set({
        conversions: sql`${funnelAnalytics.conversions} + 1`,
        revenue: sql`${funnelAnalytics.revenue} + ${purchaseData.amount}`,
        paidConversions: sql`${funnelAnalytics.paidConversions} + 1`
      })
      .where(eq(funnelAnalytics.id, existingAnalytics[0].id));
  } else {
    // Create new record
    await db.insert(funnelAnalytics).values({
      funnelId: clickData.funnelId,
      resourceId: resource.id,
      date: today,
      resourceClicks: 0,
      freeClicks: 0,
      paidClicks: 0,
      conversions: 1,
      revenue: purchaseData.amount,
      uniqueUsers: 0,
      conversionRate: 0,
      paidConversions: 1
    });
  }
}

/**
 * Get conversion analytics for a funnel
 */
export async function getConversionAnalytics(
  funnelId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const whereConditions = [eq(funnelAnalytics.funnelId, funnelId)];
    
    if (startDate) {
      whereConditions.push(sql`${funnelAnalytics.date} >= ${startDate}`);
    }
    
    if (endDate) {
      whereConditions.push(sql`${funnelAnalytics.date} <= ${endDate}`);
    }

    const analytics = await db.select()
      .from(funnelAnalytics)
      .where(and(...whereConditions));

    // Calculate totals
    const totals = analytics.reduce((acc, record) => ({
      totalClicks: acc.totalClicks + (record.resourceClicks || 0),
      totalConversions: acc.totalConversions + (record.conversions || 0),
      totalRevenue: acc.totalRevenue + (record.revenue || 0),
      totalPaidConversions: acc.totalPaidConversions + (record.paidConversions || 0)
    }), {
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      totalPaidConversions: 0
    });

    const conversionRate = totals.totalClicks > 0 
      ? (totals.totalConversions / totals.totalClicks) * 100 
      : 0;

    return {
      ...totals,
      conversionRate: Math.round(conversionRate * 100) / 100,
      analytics
    };

  } catch (error) {
    console.error("Error getting conversion analytics:", error);
    throw error;
  }
}
