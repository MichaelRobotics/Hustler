import { db } from "../supabase/db-server";
import { funnelAnalytics, resources } from "../supabase/schema";
import { eq, and, sql, desc, sum, count } from "drizzle-orm";

export interface ResourceAnalytics {
  resourceId: string;
  resourceName: string;
  resourceType: "AFFILIATE" | "MY_PRODUCTS";
  resourceCategory: "PAID" | "FREE_VALUE";
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
}

export interface FunnelAnalyticsSummary {
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  affiliateRevenue: number;
  productRevenue: number;
  freeClicks: number;
  conversionRate: number;
  resourceBreakdown: ResourceAnalytics[];
}

/**
 * Track a resource click
 */
export async function trackResourceClick(
  resourceId: string,
  userId: string,
  experienceId: string,
  funnelId: string
): Promise<void> {
  try {
    // Get resource details
    const resource = await db.select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);
    
    if (!resource[0]) {
      throw new Error("Resource not found");
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if analytics record exists for today
    const existingAnalytics = await db.select()
      .from(funnelAnalytics)
      .where(
        and(
          eq(funnelAnalytics.funnelId, funnelId),
          eq(funnelAnalytics.date, today),
          eq(funnelAnalytics.resourceId, resourceId)
        )
      )
      .limit(1);
    
    if (existingAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelAnalytics)
        .set({
          resourceClicks: sql`${funnelAnalytics.resourceClicks} + 1`,
          freeClicks: sql`${funnelAnalytics.freeClicks} + ${resource[0].category === "FREE_VALUE" ? 1 : 0}`
        })
        .where(eq(funnelAnalytics.id, existingAnalytics[0].id));
    } else {
      // Create new record
      await db.insert(funnelAnalytics)
        .values({
          experienceId,
          funnelId,
          date: today,
          resourceId,
          resourceClicks: 1,
          freeClicks: resource[0].category === "FREE_VALUE" ? 1 : 0,
          starts: 0,
          completions: 0,
          conversions: 0,
          affiliateRevenue: "0",
          productRevenue: "0",
          resourceConversions: 0,
          resourceRevenue: "0"
        });
    }
    
    console.log(`Tracked click for resource ${resourceId} in funnel ${funnelId}`);
  } catch (error) {
    console.error("Error tracking resource click:", error);
    throw error instanceof Error ? error : new Error('Unknown error');
  }
}

/**
 * Track a resource conversion
 */
export async function trackResourceConversion(
  resourceId: string,
  userId: string,
  experienceId: string,
  funnelId: string,
  revenue: number
): Promise<void> {
  try {
    // Get resource details
    const resource = await db.select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);
    
    if (!resource[0]) {
      throw new Error("Resource not found");
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if analytics record exists for today
    const existingAnalytics = await db.select()
      .from(funnelAnalytics)
      .where(
        and(
          eq(funnelAnalytics.funnelId, funnelId),
          eq(funnelAnalytics.date, today),
          eq(funnelAnalytics.resourceId, resourceId)
        )
      )
      .limit(1);
    
    if (existingAnalytics.length > 0) {
      // Update existing record
      await db.update(funnelAnalytics)
        .set({
          resourceConversions: sql`${funnelAnalytics.resourceConversions} + 1`,
          resourceRevenue: sql`${funnelAnalytics.resourceRevenue} + ${revenue}`,
          conversions: sql`${funnelAnalytics.conversions} + 1`,
          affiliateRevenue: sql`${funnelAnalytics.affiliateRevenue} + ${resource[0].type === "AFFILIATE" ? revenue : 0}`,
          productRevenue: sql`${funnelAnalytics.productRevenue} + ${resource[0].type === "MY_PRODUCTS" ? revenue : 0}`
        })
        .where(eq(funnelAnalytics.id, existingAnalytics[0].id));
    } else {
      // Create new record
      await db.insert(funnelAnalytics)
        .values({
          experienceId,
          funnelId,
          date: today,
          resourceId,
          resourceClicks: 0,
          freeClicks: 0,
          starts: 0,
          completions: 0,
          conversions: 1,
          affiliateRevenue: resource[0].type === "AFFILIATE" ? revenue.toString() : "0",
          productRevenue: resource[0].type === "MY_PRODUCTS" ? revenue.toString() : "0",
          resourceConversions: 1,
          resourceRevenue: revenue.toString()
        });
    }
    
    console.log(`Tracked conversion for resource ${resourceId} in funnel ${funnelId} with revenue ${revenue}`);
  } catch (error) {
    console.error("Error tracking resource conversion:", error);
    throw error instanceof Error ? error : new Error('Unknown error');
  }
}

/**
 * Get analytics summary for a funnel
 */
export async function getFunnelAnalyticsSummary(
  funnelId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FunnelAnalyticsSummary> {
  try {
    const conditions = [eq(funnelAnalytics.funnelId, funnelId)];
    
    if (startDate) {
      conditions.push(sql`${funnelAnalytics.date} >= ${startDate}`);
    }
    
    if (endDate) {
      conditions.push(sql`${funnelAnalytics.date} <= ${endDate}`);
    }
    
    // Get aggregated analytics
    const analytics = await db.select({
      totalClicks: sum(funnelAnalytics.resourceClicks),
      totalConversions: sum(funnelAnalytics.resourceConversions),
      totalRevenue: sum(funnelAnalytics.resourceRevenue),
      affiliateRevenue: sum(funnelAnalytics.affiliateRevenue),
      productRevenue: sum(funnelAnalytics.productRevenue),
      freeClicks: sum(funnelAnalytics.freeClicks)
    })
    .from(funnelAnalytics)
    .where(and(...conditions));
    
    const totals = analytics[0] || {
      totalClicks: 0,
      totalConversions: 0,
      totalRevenue: 0,
      affiliateRevenue: 0,
      productRevenue: 0,
      freeClicks: 0
    };
    
    // Get resource breakdown
    const resourceBreakdown = await db.select({
      resourceId: funnelAnalytics.resourceId,
      resourceName: resources.name,
      resourceType: resources.type,
      resourceCategory: resources.category,
      clicks: sum(funnelAnalytics.resourceClicks),
      conversions: sum(funnelAnalytics.resourceConversions),
      revenue: sum(funnelAnalytics.resourceRevenue)
    })
    .from(funnelAnalytics)
    .leftJoin(resources, eq(funnelAnalytics.resourceId, resources.id))
    .where(and(...conditions))
    .groupBy(
      funnelAnalytics.resourceId,
      resources.name,
      resources.type,
      resources.category
    )
    .orderBy(desc(sum(funnelAnalytics.resourceRevenue)));
    
    // Calculate conversion rate
    const conversionRate = totals.totalClicks > 0 
      ? (Number(totals.totalConversions) / Number(totals.totalClicks)) * 100 
      : 0;
    
    return {
      totalClicks: Number(totals.totalClicks) || 0,
      totalConversions: Number(totals.totalConversions) || 0,
      totalRevenue: Number(totals.totalRevenue) || 0,
      affiliateRevenue: Number(totals.affiliateRevenue) || 0,
      productRevenue: Number(totals.productRevenue) || 0,
      freeClicks: Number(totals.freeClicks) || 0,
      conversionRate,
      resourceBreakdown: resourceBreakdown.map((item: any) => ({
        resourceId: item.resourceId || "",
        resourceName: item.resourceName || "Unknown",
        resourceType: item.resourceType as "AFFILIATE" | "MY_PRODUCTS",
        resourceCategory: item.resourceCategory as "PAID" | "FREE_VALUE",
        clicks: Number(item.clicks) || 0,
        conversions: Number(item.conversions) || 0,
        revenue: Number(item.revenue) || 0,
        conversionRate: Number(item.clicks) > 0 
          ? (Number(item.conversions) / Number(item.clicks)) * 100 
          : 0
      }))
    };
  } catch (error) {
    console.error("Error getting funnel analytics summary:", error);
    throw error instanceof Error ? error : new Error('Unknown error');
  }
}

/**
 * Generate tracking URL for a resource
 */
export function generateTrackingUrl(
  resourceId: string,
  userId: string,
  experienceId: string,
  funnelId: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
): string {
  const params = new URLSearchParams({
    resourceId,
    userId,
    experienceId,
    funnelId
  });
  
  return `${baseUrl}/api/track/click?${params.toString()}`;
}
