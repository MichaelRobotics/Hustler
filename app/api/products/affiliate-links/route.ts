/**
 * API endpoint to create affiliate links for paid products
 * POST /api/products/affiliate-links
 */

import { NextRequest, NextResponse } from "next/server";
import { affiliateCheckoutService } from "@/lib/analytics/affiliate-checkout-service";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { getUserContext } from "@/lib/context/user-context";
import {
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "@/lib/middleware/whop-auth";
import type { AuthContext } from "@/lib/middleware/whop-auth";

async function createAffiliateLinksHandler(request: NextRequest, context: AuthContext) {
  try {
    console.log("🔗 Creating affiliate links for paid products...");

    const { user } = context;

    // Validate experience ID is provided
    if (!user.experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 },
      );
    }
    const experienceId = user.experienceId;

    // Get the full user context
    const userContext = await getUserContext(
      user.userId,
      "", // whopCompanyId is optional for experience-based isolation
      experienceId,
      false, // forceRefresh
    );

    if (!userContext) {
      return NextResponse.json(
        { error: "User context not found" },
        { status: 401 },
      );
    }

    // Get company ID from experience
    const companyId = userContext.user.experience?.whopCompanyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID not found in experience" },
        { status: 400 },
      );
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
    const whopClient = getWhopApiClient(companyId, userContext.user.id);

    let results: any = {};

    if (createForAllPaid) {
      // Create affiliate links for all products (paid = checkout sessions, free = discovery links)
      console.log("🔗 Creating affiliate links for all products...");
      
      const products = await whopClient.getCompanyProducts();
      
      const affiliateLinks = await affiliateCheckoutService.createPaidProductAffiliateLinks(
        products,
        affiliateCode,
        funnelId
      );

      results = {
        success: true,
        totalProducts: products.length,
        paidProducts: affiliateLinks.paidCheckoutLinks.length,
        freeProducts: affiliateLinks.freeDiscoveryLinks.length,
        paidCheckoutLinks: affiliateLinks.paidCheckoutLinks,
        freeDiscoveryLinks: affiliateLinks.freeDiscoveryLinks,
        message: `Created ${affiliateLinks.paidCheckoutLinks.length} checkout sessions for paid products and ${affiliateLinks.freeDiscoveryLinks.length} discovery links for free products`
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
        // For free products, create discovery link
        const discoveryUrl = affiliateCheckoutService.createAffiliateDiscoveryLink(
          product,
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
            currency: product.currency,
            isFree: true
          },
          discoveryUrl: discoveryUrl,
          message: `Created discovery link for FREE product: ${product.title}`
        };
      } else {
        // For paid products, create checkout session
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
            currency: product.currency,
            isFree: false
          },
          checkoutData: checkoutData,
          message: `Created checkout session for PAID product: ${product.title} ($${product.price})`
        };
      }

    } else if (funnelId) {
      // Create funnel affiliate links for all products
      console.log(`🎯 Creating funnel affiliate links for funnel: ${funnelId}`);
      
      const products = await whopClient.getCompanyProducts();
      const paidProducts = products.filter(p => !p.isFree && p.price > 0);
      const freeProducts = products.filter(p => p.isFree || p.price === 0);
      
      const paidFunnelLinks: any[] = [];
      const freeFunnelLinks: any[] = [];
      
      // For paid products: Create checkout sessions for each funnel block
      for (const product of paidProducts) {
        const cheapestPlan = product.plans?.[0];
        if (cheapestPlan) {
          const productFunnelLinks = await affiliateCheckoutService.createFunnelAffiliateLinks(
            product,
            cheapestPlan.id,
            affiliateCode,
            funnelId
          );
          paidFunnelLinks.push(...productFunnelLinks);
        }
      }

      // For free products: Create discovery links for each funnel block
      for (const product of freeProducts) {
        const blocks = ['value_delivery', 'transition', 'offer'];
        for (const blockId of blocks) {
          const discoveryUrl = affiliateCheckoutService.createAffiliateDiscoveryLink(
            product,
            affiliateCode,
            funnelId,
            blockId
          );
          freeFunnelLinks.push({
            funnelId,
            blockId,
            productId: product.id,
            productName: product.title,
            discoveryUrl: discoveryUrl,
            type: 'discovery'
          });
        }
      }

      results = {
        success: true,
        funnelId: funnelId,
        totalProducts: products.length,
        paidProducts: paidProducts.length,
        freeProducts: freeProducts.length,
        paidFunnelLinks: paidFunnelLinks,
        freeFunnelLinks: freeFunnelLinks,
        totalLinks: paidFunnelLinks.length + freeFunnelLinks.length,
        message: `Created ${paidFunnelLinks.length} checkout sessions for paid products and ${freeFunnelLinks.length} discovery links for free products`
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

async function getAffiliateLinkInfoHandler(request: NextRequest, context: AuthContext) {
  try {
    console.log("📊 Getting affiliate link information...");

    const { user } = context;

    // Validate experience ID is provided
    if (!user.experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 },
      );
    }
    const experienceId = user.experienceId;

    // Get the full user context
    const userContext = await getUserContext(
      user.userId,
      "", // whopCompanyId is optional for experience-based isolation
      experienceId,
      false, // forceRefresh
    );

    if (!userContext) {
      return NextResponse.json(
        { error: "User context not found" },
        { status: 401 },
      );
    }

    // Get company ID from experience
    const companyId = userContext.user.experience?.whopCompanyId;
    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID not found in experience" },
        { status: 400 },
      );
    }

    // Get Whop API client
    const whopClient = getWhopApiClient(companyId, userContext.user.id);

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
    return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
  }
}

// Export the protected route handlers
export const POST = withWhopAuth(createAffiliateLinksHandler);
export const GET = withWhopAuth(getAffiliateLinkInfoHandler);
