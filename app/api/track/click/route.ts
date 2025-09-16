import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { funnelAnalytics, resources } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { resourceId, userId, experienceId, funnelId } = await request.json();
    
    if (!resourceId || !userId || !experienceId || !funnelId) {
      return NextResponse.json(
        { error: "resourceId, userId, experienceId, and funnelId are required" },
        { status: 400 }
      );
    }
    
    // Get resource details
    const resource = await db.select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);
    
    if (!resource[0]) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      );
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
    
    // Return the resource link for redirection
    return NextResponse.json({
      success: true,
      redirectUrl: resource[0].link,
      resource: {
        id: resource[0].id,
        name: resource[0].name,
        type: resource[0].type,
        category: resource[0].category
      }
    });
    
  } catch (error) {
    console.error("Click tracking error:", error);
    return NextResponse.json(
      { 
        error: "Click tracking failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for direct link tracking (for use in tracking URLs)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get("resourceId");
    const userId = searchParams.get("userId");
    const experienceId = searchParams.get("experienceId");
    const funnelId = searchParams.get("funnelId");
    
    if (!resourceId || !userId || !experienceId || !funnelId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }
    
    // Track the click
    const trackResponse = await POST(new NextRequest(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId, userId, experienceId, funnelId })
    }));
    
    if (!trackResponse.ok) {
      return trackResponse;
    }
    
    const trackData = await trackResponse.json();
    
    // Redirect to the actual resource
    return NextResponse.redirect(trackData.redirectUrl);
    
  } catch (error) {
    console.error("Click tracking GET error:", error);
    return NextResponse.json(
      { 
        error: "Click tracking failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
