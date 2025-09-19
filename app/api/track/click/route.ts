import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { resources } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

/**
 * Simplified Click Tracking API
 * 
 * This API now only handles redirects - no custom analytics.
 * Analytics are handled by:
 * - Whop native tracking for paid products (clicks, conversions, revenue)
 * - Interest tracking on UserChat entry for free products
 * - Starts tracking on welcome message sent
 */

export async function POST(request: NextRequest) {
  try {
    const { resourceId, userId, experienceId, funnelId } = await request.json();
    
    if (!resourceId || !userId || !experienceId || !funnelId) {
      return NextResponse.json(
        { error: "resourceId, userId, experienceId, and funnelId are required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Redirecting click for resource ${resourceId} in funnel ${funnelId}`);
    
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
    
    // This API now only handles redirects - no custom analytics
    // Analytics are handled by:
    // - Whop native tracking for paid products (clicks, conversions, revenue)
    // - Interest tracking on UserChat entry for free products
    // - Starts tracking on welcome message sent
    
    console.log(`✅ Redirecting to ${resource[0].category} product: ${resource[0].link}`);
    
    // Return the resource link for redirection
    return NextResponse.json({
      success: true,
      redirectUrl: resource[0].link,
      resource: {
        id: resource[0].id,
        name: resource[0].name,
        type: resource[0].type,
        category: resource[0].category,
        link: resource[0].link
      }
    });

  } catch (error) {
    console.error("Error handling click redirect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resourceId');
    const userId = searchParams.get('userId');
    const experienceId = searchParams.get('experienceId');
    const funnelId = searchParams.get('funnelId');
    
    if (!resourceId || !userId || !experienceId || !funnelId) {
      return NextResponse.json(
        { error: "resourceId, userId, experienceId, and funnelId are required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Redirecting click for resource ${resourceId} in funnel ${funnelId}`);
    
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
    
    // Redirect to the resource link
    return NextResponse.redirect(resource[0].link);

  } catch (error) {
    console.error("Error handling click redirect:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}