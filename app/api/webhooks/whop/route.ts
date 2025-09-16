import { NextRequest, NextResponse } from "next/server";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { db } from "@/lib/supabase/db-server";
import { resources, experiences } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";

interface WebhookPayload {
  event: string;
  data: {
    companyId: string;
    experienceId?: string;
    appId?: string;
    membershipId?: string;
    productId?: string;
    userId?: string;
  };
}

async function syncApps(companyId: string, experienceId: string, appId?: string) {
  try {
    // Check if this experience has already been synced for apps
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
      console.log(`Apps already synced for experience ${experienceId}`);
      return;
    }
    
    const whopClient = getWhopApiClient();
    
    if (appId) {
      // Sync only the specific app that was installed
      const app = await whopClient.getAppById(appId);
      if (app) {
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
        console.log(`Synced app ${appId} for experience ${experienceId}`);
      }
    } else {
      // Sync all apps (one-time only)
      const apps = await whopClient.getInstalledApps(companyId);
      
      for (const app of apps) {
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
      }
      
      console.log(`Synced ${apps.length} apps for experience ${experienceId}`);
    }
  } catch (error) {
    console.error("Error syncing apps:", error);
    throw error;
  }
}

async function syncMemberships(companyId: string, experienceId: string, membershipId?: string) {
  try {
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
      console.log(`Memberships already synced for experience ${experienceId}`);
      return;
    }
    
    const whopClient = getWhopApiClient();
    
    if (membershipId) {
      // Sync only the specific membership that was created
      const membership = await whopClient.getMembershipById(membershipId);
      if (membership) {
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
        console.log(`Synced membership ${membershipId} for experience ${experienceId}`);
      }
    } else {
      // Sync all memberships (one-time only)
      const memberships = await whopClient.getCompanyMemberships(companyId);
      
      for (const membership of memberships) {
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
      }
      
      console.log(`Synced ${memberships.length} memberships for experience ${experienceId}`);
    }
  } catch (error) {
    console.error("Error syncing memberships:", error);
    throw error;
  }
}

async function syncProducts(companyId: string, experienceId: string, productId?: string) {
  try {
    // Check if this experience has already been synced for products
    const existingProductResources = await db.select()
      .from(resources)
      .where(
        and(
          eq(resources.experienceId, experienceId),
          eq(resources.type, "MY_PRODUCTS"),
          isNotNull(resources.whopProductId)
        )
      )
      .limit(1);
    
    if (existingProductResources.length > 0) {
      console.log(`Products already synced for experience ${experienceId}`);
      return;
    }
    
    const whopClient = getWhopApiClient();
    
    if (productId) {
      // Sync only the specific product that was created
      const product = await whopClient.getProductById(productId);
      if (product) {
        const resourceData = {
          experienceId,
          userId: "system",
          name: product.name,
          type: "MY_PRODUCTS" as const,
          category: product.price && product.price > 0 ? "PAID" as const : "FREE_VALUE" as const,
          link: `https://whop.com/hub/${companyId}/products/${product.id}?ref=${experienceId}`,
          description: product.description,
          whopAppId: null,
          whopProductId: product.id,
          whopMembershipId: null
        };
        
        await db.insert(resources).values(resourceData);
        console.log(`Synced product ${productId} for experience ${experienceId}`);
      }
    } else {
      // Sync all products (one-time only)
      const products = await whopClient.getCompanyProducts(companyId);
      
      for (const product of products) {
        const resourceData = {
          experienceId,
          userId: "system",
          name: product.name,
          type: "MY_PRODUCTS" as const,
          category: product.price && product.price > 0 ? "PAID" as const : "FREE_VALUE" as const,
          link: `https://whop.com/hub/${companyId}/products/${product.id}?ref=${experienceId}`,
          description: product.description,
          whopAppId: null,
          whopProductId: product.id,
          whopMembershipId: null
        };
        
        await db.insert(resources).values(resourceData);
      }
      
      console.log(`Synced ${products.length} products for experience ${experienceId}`);
    }
  } catch (error) {
    console.error("Error syncing products:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();
    const { event, data } = payload;
    
    console.log(`Received webhook event: ${event}`, data);
    
    // Get experience ID from company ID if not provided
    let experienceId = data.experienceId;
    if (!experienceId && data.companyId) {
      const experience = await db.select()
        .from(experiences)
        .where(eq(experiences.whopCompanyId, data.companyId))
        .limit(1);
      
      if (experience.length > 0) {
        experienceId = experience[0].id;
      }
    }
    
    if (!experienceId) {
      console.error("No experience ID found for company:", data.companyId);
      return NextResponse.json(
        { error: "Experience not found" },
        { status: 404 }
      );
    }
    
    switch (event) {
      case "app.installed":
        // Only sync on app installation, not updates
        await syncApps(data.companyId, experienceId, data.appId);
        break;
        
      case "membership.created":
        // Only sync on membership creation, not updates
        await syncMemberships(data.companyId, experienceId, data.membershipId);
        break;
        
      case "product.created":
        // Only sync on product creation, not updates
        await syncProducts(data.companyId, experienceId, data.productId);
        break;
        
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
    
    return NextResponse.json({ 
      success: true,
      event,
      experienceId 
    });
    
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { 
        error: "Webhook processing failed", 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
