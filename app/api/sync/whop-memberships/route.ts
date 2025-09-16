import { NextRequest, NextResponse } from "next/server";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { db } from "@/lib/supabase/db-server";
import { resources } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { experienceId, companyId, membershipId } = await request.json();
    
    if (!experienceId || !companyId) {
      return NextResponse.json(
        { error: "experienceId and companyId are required" },
        { status: 400 }
      );
    }
    
    // Check if this experience has already been synced for memberships
    const existingMembershipResources = await db.select()
      .from(resources)
      .where(
        and(
          eq(resources.experienceId, experienceId),
          eq(resources.type, "MY_PRODUCTS"),
          eq(resources.category, "PAID"),
          isNotNull(resources.whopMembershipId)
        )
      )
      .limit(1);
    
    if (existingMembershipResources.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Memberships already synced for this experience",
        synced: 0,
        created: 0,
        updated: 0
      });
    }
    
    const whopClient = getWhopApiClient();
    
    // If specific membershipId is provided, sync only that membership
    if (membershipId) {
      const membership = await whopClient.getMembershipById(membershipId);
      if (!membership) {
        return NextResponse.json(
          { error: "Membership not found" },
          { status: 404 }
        );
      }
      
      const resourceData = {
        experienceId,
        userId: "system",
        name: membership.name || membership.description || `Membership ${membership.id}`,
        type: "MY_PRODUCTS" as const,
        category: "PAID" as const,
        link: `https://whop.com/hub/${companyId}/memberships/${membership.id}?ref=${experienceId}`,
        description: membership.description,
        whopAppId: null,
        whopProductId: null,
        whopMembershipId: membership.id
      };
      
      await db.insert(resources).values(resourceData);
      
      return NextResponse.json({
        success: true,
        synced: 1,
        created: 1,
        updated: 0
      });
    }
    
    // Fetch all company memberships (one-time sync)
    const memberships = await whopClient.getCompanyMemberships(companyId);
    
    let synced = 0;
    let created = 0;
    const errors: string[] = [];
    
    // Transform memberships to resources (one-time creation)
    for (const membership of memberships) {
      try {
        const resourceData = {
          experienceId,
          userId: "system",
          name: membership.name || membership.description || `Membership ${membership.id}`,
          type: "MY_PRODUCTS" as const,
          category: "PAID" as const,
          link: `https://whop.com/hub/${companyId}/memberships/${membership.id}?ref=${experienceId}`,
          description: membership.description,
          whopAppId: null,
          whopProductId: null,
          whopMembershipId: membership.id
        };
        
        // Create new resource (no updates, only one-time creation)
        await db.insert(resources).values(resourceData);
        created++;
        synced++;
        
      } catch (error) {
        console.error(`Error syncing membership ${membership.id}:`, error);
        errors.push(`Failed to sync membership ${membership.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.error("Membership sync error:", error);
    return NextResponse.json(
      { 
        error: "Membership sync failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
