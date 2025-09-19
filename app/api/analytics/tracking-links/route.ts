import { NextRequest, NextResponse } from "next/server";
import { whopNativeTrackingService } from "@/lib/analytics/whop-native-tracking";
import { db } from "@/lib/supabase/db-server";
import { resources, funnelAnalytics, funnelResourceAnalytics, funnelResources } from "@/lib/supabase/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

/**
 * Analytics API for Tracking Links
 * 
 * This API provides access to tracking link analytics and performance data.
 * Since Whop's tracking link metrics API isn't fully documented, this provides
 * a way to access the data that is available through other means.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const experienceId = searchParams.get('experienceId');
    const funnelId = searchParams.get('funnelId');

    // At least one of these must be provided
    if (!companyId && !experienceId && !funnelId) {
      return NextResponse.json(
        { error: "companyId, experienceId, or funnelId is required" },
        { status: 400 }
      );
    }

    console.log(`📊 Getting tracking analytics for:`, { companyId, experienceId, funnelId });

    let funnelAnalyticsData: any[] = [];
    let resourceAnalyticsData: any[] = [];
    let resourcesData: any[] = [];

    if (funnelId) {
      // Get data for specific funnel
      funnelAnalyticsData = await db.select()
        .from(funnelAnalytics)
        .where(eq(funnelAnalytics.funnelId, funnelId));
      
      resourceAnalyticsData = await db.select()
        .from(funnelResourceAnalytics)
        .where(eq(funnelResourceAnalytics.funnelId, funnelId));
      
      // Get resources through the junction table
      const funnelResourcesData = await db.select()
        .from(funnelResources)
        .where(eq(funnelResources.funnelId, funnelId));
      
      if (funnelResourcesData.length > 0) {
        const resourceIds = funnelResourcesData.map((fr: any) => fr.resourceId);
        resourcesData = await db.select()
          .from(resources)
          .where(inArray(resources.id, resourceIds));
      } else {
        resourcesData = [];
      }
    } else if (experienceId) {
      // Get data for specific experience
      funnelAnalyticsData = await db.select()
        .from(funnelAnalytics)
        .where(eq(funnelAnalytics.experienceId, experienceId));
      
      resourceAnalyticsData = await db.select()
        .from(funnelResourceAnalytics)
        .where(eq(funnelResourceAnalytics.experienceId, experienceId));
      
      resourcesData = await db.select()
        .from(resources)
        .where(eq(resources.experienceId, experienceId));
    } else if (companyId) {
      // For company-wide analytics, you might need to join across experiences/funnels
      // For simplicity, this example assumes experienceId or funnelId is usually provided
      // You would fetch all experiences for the company, then all funnels/resources
      return NextResponse.json(
        { error: "Company-wide analytics not fully implemented, please provide experienceId or funnelId" },
        { status: 400 }
      );
    }

    // Process the data to provide comprehensive analytics
    const analytics = {
      summary: {
        totalResources: resourcesData.length,
        paidResources: resourcesData.filter((r: any) => r.category === 'PAID').length,
        freeResources: resourcesData.filter((r: any) => r.category === 'FREE_VALUE').length,
        totalFunnels: funnelAnalyticsData.length,
      },
      funnelAnalytics: funnelAnalyticsData.map((funnel: any) => ({
        experienceId: funnel.experienceId,
        funnelId: funnel.funnelId,
        totalStarts: funnel.totalStarts || 0,
        totalIntent: funnel.totalIntent || 0,
        totalConversions: funnel.totalConversions || 0,
        totalInterest: funnel.totalInterest || 0,
        totalProductRevenue: parseFloat(funnel.totalProductRevenue || '0'),
        totalAffiliateRevenue: parseFloat(funnel.totalAffiliateRevenue || '0'),
        todayStarts: funnel.todayStarts || 0,
        todayIntent: funnel.todayIntent || 0,
        todayConversions: funnel.todayConversions || 0,
        todayInterest: funnel.todayInterest || 0,
        todayProductRevenue: parseFloat(funnel.todayProductRevenue || '0'),
        todayAffiliateRevenue: parseFloat(funnel.todayAffiliateRevenue || '0'),
        startsGrowthPercent: parseFloat(funnel.startsGrowthPercent || '0'),
        intentGrowthPercent: parseFloat(funnel.intentGrowthPercent || '0'),
        conversionsGrowthPercent: parseFloat(funnel.conversionsGrowthPercent || '0'),
        interestGrowthPercent: parseFloat(funnel.interestGrowthPercent || '0'),
        lastUpdated: funnel.lastUpdated,
      })),
      resourceAnalytics: resourceAnalyticsData.map((resource: any) => ({
        resourceId: resource.resourceId,
        totalResourceClicks: resource.totalResourceClicks || 0,
        totalResourceConversions: resource.totalResourceConversions || 0,
        totalResourceRevenue: parseFloat(resource.totalResourceRevenue || '0'),
        todayResourceClicks: resource.todayResourceClicks || 0,
        todayResourceConversions: resource.todayResourceConversions || 0,
        todayResourceRevenue: parseFloat(resource.todayResourceRevenue || '0'),
        lastUpdated: resource.lastUpdated,
      })),
      resources: resourcesData.map((resource: any) => ({
        id: resource.id,
        name: resource.name,
        type: resource.type,
        category: resource.category,
        link: resource.link,
        whopProductId: resource.whopProductId,
        // Note: For Whop native tracking links, you'll need to check
        // the Whop dashboard for detailed click/revenue metrics
        whopTrackingNote: resource.category === 'PAID' 
          ? "Check Whop Dashboard > Marketing > Tracking links for detailed metrics"
          : "Free resource - tracked via interest on UserChat entry"
      })),
      whopNativeTracking: {
        note: "For detailed tracking link metrics (clicks, revenue, conversions), access Whop Dashboard > Marketing > Tracking links",
        availableMetrics: [
          "Clicks: Total count of users who clicked the link",
          "Revenue generated: Total revenue attributed to the link", 
          "Conversion rate: Percentage of clicks resulting in purchases",
          "Converted users: Number of unique users who purchased after clicking"
        ],
        dashboardUrl: companyId ? `https://whop.com/dashboard/${companyId}/marketing/tracking-links` : "https://whop.com/dashboard"
      }
    };

    return NextResponse.json({
      success: true,
      data: analytics,
      message: "Analytics data retrieved successfully"
    });

  } catch (error) {
    console.error("❌ Error getting tracking analytics:", error);
    return NextResponse.json(
      { 
        error: "Failed to retrieve analytics data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { companyId, planId, linkName, destination, redirectUrl } = await request.json();

    if (!companyId || !planId || !linkName) {
      return NextResponse.json(
        { error: "companyId, planId, and linkName are required" },
        { status: 400 }
      );
    }

    console.log(`🔗 Creating tracking link for plan ${planId}`);

    // Create a new tracking link using Whop's native system
    const trackingLink = await whopNativeTrackingService.createTrackingLink(
      planId,
      companyId,
      linkName,
      destination || 'checkout'
    );

    return NextResponse.json({
      success: true,
      data: trackingLink,
      message: "Tracking link created successfully"
    });

  } catch (error) {
    console.error("❌ Error creating tracking link:", error);
    return NextResponse.json(
      { 
        error: "Failed to create tracking link",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
