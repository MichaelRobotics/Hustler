/**
 * API endpoint to create affiliate links for paid products
 * POST /api/products/affiliate-links
 */

import { NextRequest, NextResponse } from "next/server";
import { affiliateCheckoutService } from "@/lib/analytics/affiliate-checkout-service";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { authenticateWhopUser } from "@/lib/middleware/whop-auth";

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 Creating affiliate links for paid products...");

    // Authenticate user
    const userContext = await authenticateWhopUser(request);
    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      affiliateCode, 
      funnelId, 
      productId, 
      planId,
      createForAllPaid = false 
    } = body;

    if (!affiliateCode) {
      return NextResponse.json({ error: "Affiliate code is required" }, { status: 400 });
    }

    // Get Whop API client
    const whopClient = getWhopApiClient(
      userContext.experience.whopCompanyId, 
      userContext.user.id
    );

    let results: any = {};

    if (createForAllPaid) {
      // Create affiliate links for all paid products
      console.log("🔗 Creating affiliate links for all paid products...");
      
      const products = await whopClient.getCompanyProducts();
      const paidProducts = products.filter(p => !p.isFree && p.price > 0);
      
      const affiliateLinks = await affiliateCheckoutService.createPaidProductAffiliateLinks(
        paidProducts,
        affiliateCode,
        funnelId
      );

      results = {
        success: true,
        totalProducts: paidProducts.length,
        discoveryLinks: affiliateLinks.discoveryLinks,
        checkoutLinks: affiliateLinks.checkoutLinks,
        message: `Created affiliate links for ${paidProducts.length} paid products`
      };

    } else if (productId && planId) {
      // Create affiliate links for specific product
      console.log(`🔗 Creating affiliate links for product: ${productId}`);
      
      const products = await whopClient.getCompanyProducts();
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      if (product.isFree || product.price === 0) {
        return NextResponse.json({ error: "Cannot create affiliate links for free products" }, { status: 400 });
      }

      // Create discovery link
      const discoveryUrl = affiliateCheckoutService.createAffiliateDiscoveryLink(
        product,
        affiliateCode,
        funnelId,
        'unknown'
      );

      // Create checkout session
      const checkoutData = await affiliateCheckoutService.createAffiliateCheckout(
        product,
        planId,
        affiliateCode,
        funnelId,
        'unknown'
      );

      results = {
        success: true,
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency
        },
        discoveryUrl: discoveryUrl,
        checkoutData: checkoutData,
        message: `Created affiliate links for product: ${product.title}`
      };

    } else if (funnelId) {
      // Create funnel affiliate links for all paid products
      console.log(`🎯 Creating funnel affiliate links for funnel: ${funnelId}`);
      
      const products = await whopClient.getCompanyProducts();
      const paidProducts = products.filter(p => !p.isFree && p.price > 0);
      
      const funnelLinks: any[] = [];
      
      for (const product of paidProducts) {
        const cheapestPlan = product.plans?.[0];
        if (cheapestPlan) {
          const productFunnelLinks = await affiliateCheckoutService.createFunnelAffiliateLinks(
            product,
            cheapestPlan.id,
            affiliateCode,
            funnelId
          );
          funnelLinks.push(...productFunnelLinks);
        }
      }

      results = {
        success: true,
        funnelId: funnelId,
        totalProducts: paidProducts.length,
        totalLinks: funnelLinks.length,
        funnelLinks: funnelLinks,
        message: `Created ${funnelLinks.length} funnel affiliate links for ${paidProducts.length} products`
      };

    } else {
      return NextResponse.json({ 
        error: "Either createForAllPaid=true, or productId+planId, or funnelId is required" 
      }, { status: 400 });
    }

    console.log("✅ Affiliate links created successfully");
    return NextResponse.json(results);

  } catch (error) {
    console.error("❌ Error creating affiliate links:", error);
    return NextResponse.json(
      { error: "Failed to create affiliate links", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("📊 Getting affiliate link information...");

    // Authenticate user
    const userContext = await authenticateWhopUser(request);
    if (!userContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Whop API client
    const whopClient = getWhopApiClient(
      userContext.experience.whopCompanyId, 
      userContext.user.id
    );

    // Get all products
    const products = await whopClient.getCompanyProducts();
    const paidProducts = products.filter(p => !p.isFree && p.price > 0);
    const freeProducts = products.filter(p => p.isFree || p.price === 0);

    const response = {
      success: true,
      totalProducts: products.length,
      paidProducts: paidProducts.length,
      freeProducts: freeProducts.length,
      products: {
        paid: paidProducts.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          currency: p.currency,
          plans: p.plans?.length || 0,
          discoveryPageUrl: p.discoveryPageUrl
        })),
        free: freeProducts.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          currency: p.currency,
          discoveryPageUrl: p.discoveryPageUrl
        }))
      },
      message: `Found ${products.length} total products (${paidProducts.length} paid, ${freeProducts.length} free)`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("❌ Error getting product information:", error);
    return NextResponse.json(
      { error: "Failed to get product information", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
