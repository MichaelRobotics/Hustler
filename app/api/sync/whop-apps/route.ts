import { NextRequest, NextResponse } from "next/server";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { db } from "@/lib/supabase/db-server";
import { resources } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { experienceId, companyId, appId } = await request.json();
    
    if (!experienceId || !companyId) {
      return NextResponse.json(
        { error: "experienceId and companyId are required" },
        { status: 400 }
      );
    }
    
    // Check if this experience has already been synced
    const existingAppResources = await db.select()
      .from(resources)
      .where(
        and(
          eq(resources.experienceId, experienceId),
          eq(resources.type, "MY_PRODUCTS"),
          eq(resources.category, "FREE_VALUE"),
          isNotNull(resources.whopAppId)
        )
      )
      .limit(1);
    
    if (existingAppResources.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Apps already synced for this experience",
        synced: 0,
        created: 0,
        updated: 0
      });
    }
    
    const whopClient = getWhopApiClient();
    
    // If specific appId is provided, sync only that app
    if (appId) {
      const app = await whopClient.getAppById(appId);
      if (!app) {
        return NextResponse.json(
          { error: "App not found" },
          { status: 404 }
        );
      }
      
      const resourceData = {
        experienceId,
        userId: "system",
        name: app.name || app.description || `App ${app.id}`,
        type: "MY_PRODUCTS" as const,
        category: "FREE_VALUE" as const,
        link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
        description: app.description,
        whopAppId: app.id,
        whopProductId: null,
        whopMembershipId: null
      };
      
      await db.insert(resources).values(resourceData);
      
      return NextResponse.json({
        success: true,
        synced: 1,
        created: 1,
        updated: 0
      });
    }
    
    // Fetch all installed apps (one-time sync)
    const apps = await whopClient.getInstalledApps(companyId);
    
    let synced = 0;
    let created = 0;
    const errors: string[] = [];
    
    // Transform apps to resources (one-time creation)
    for (const app of apps) {
      try {
        const resourceData = {
          experienceId,
          userId: "system",
          name: app.name || app.description || `App ${app.id}`,
          type: "MY_PRODUCTS" as const,
          category: "FREE_VALUE" as const,
          link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
          description: app.description,
          whopAppId: app.id,
          whopProductId: null,
          whopMembershipId: null
        };
        
        // Create new resource (no updates, only one-time creation)
        await db.insert(resources).values(resourceData);
        created++;
        synced++;
        
      } catch (error) {
        console.error(`Error syncing app ${app.id}:`, error);
        errors.push(`Failed to sync app ${app.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      synced,
      created,
      updated: 0,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error("App sync error:", error);
    return NextResponse.json(
      { 
        error: "App sync failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
