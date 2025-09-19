/**
 * Affiliate Checkout Service
 * 
 * Creates affiliate links with checkout sessions for paid products
 * Includes funnel attribution metadata for complete tracking
 */

import { whopSdk } from "@/lib/whop-sdk";
import type { WhopProduct } from "@/lib/whop-api-client";

export interface AffiliateCheckoutData {
  id: string;
  url: string;
  name: string;
  planId: string;
  productId: string;
  affiliateCode: string;
  funnelId?: string;
  blockId?: string;
  metadata: Record<string, any>;
}

export interface FunnelAffiliateLink {
  funnelId: string;
  blockId: string;
  productId: string;
  planId: string;
  affiliateCode: string;
  discoveryUrl: string;
  checkoutUrl: string;
  metadata: Record<string, any>;
}

class AffiliateCheckoutService {
  /**
   * Create affiliate checkout session for a paid product
   */
  async createAffiliateCheckout(
    product: WhopProduct,
    planId: string,
    affiliateCode: string,
    funnelId?: string,
    blockId?: string
  ): Promise<AffiliateCheckoutData> {
    try {
      console.log(`🔗 Creating affiliate checkout for product: ${product.title}`);
      
      // Validate that this is a paid product
      if (product.isFree || product.price === 0) {
        throw new Error("Cannot create affiliate checkout for free products");
      }

      // Create checkout session with affiliate and funnel metadata
      const checkoutSession = await whopSdk.payments.createCheckoutSession({
        planId: planId,
        affiliateCode: affiliateCode,
        metadata: {
          funnelId: funnelId || 'unknown',
          blockId: blockId || 'unknown',
          productId: product.id,
          productName: product.title,
          affiliateCode: affiliateCode,
          source: 'funnel_attribution',
          createdAt: new Date().toISOString()
        }
      });

      const affiliateCheckout: AffiliateCheckoutData = {
        id: checkoutSession.id,
        url: checkoutSession.purchase_url,
        name: `${product.title} - Affiliate Checkout`,
        planId: planId,
        productId: product.id,
        affiliateCode: affiliateCode,
        funnelId: funnelId,
        blockId: blockId,
        metadata: {
          funnelId: funnelId || 'unknown',
          blockId: blockId || 'unknown',
          productId: product.id,
          productName: product.title,
          affiliateCode: affiliateCode,
          source: 'funnel_attribution'
        }
      };

      console.log(`✅ Created affiliate checkout: ${affiliateCheckout.url}`);
      return affiliateCheckout;

    } catch (error) {
      console.error("❌ Error creating affiliate checkout:", error);
      throw error;
    }
  }

  /**
   * Create affiliate discovery link for a product
   * This goes to the discovery page with affiliate tracking
   */
  createAffiliateDiscoveryLink(
    product: WhopProduct,
    affiliateCode: string,
    funnelId?: string,
    blockId?: string
  ): string {
    try {
      console.log(`🔗 Creating affiliate discovery link for product: ${product.title}`);
      
      if (!product.discoveryPageUrl) {
        throw new Error("Product does not have a discovery page URL");
      }

      const url = new URL(product.discoveryPageUrl);
      
      // Add affiliate tracking
      url.searchParams.set('a', affiliateCode);
      
      // Add funnel tracking parameters
      if (funnelId) {
        url.searchParams.set('funnel_id', funnelId);
      }
      if (blockId) {
        url.searchParams.set('block_id', blockId);
      }
      
      // Add UTM parameters for additional tracking
      url.searchParams.set('utm_source', 'funnel');
      url.searchParams.set('utm_campaign', funnelId || 'unknown');
      url.searchParams.set('utm_content', blockId || 'unknown');

      const affiliateUrl = url.toString();
      console.log(`✅ Created affiliate discovery link: ${affiliateUrl}`);
      return affiliateUrl;

    } catch (error) {
      console.error("❌ Error creating affiliate discovery link:", error);
      throw error;
    }
  }

  /**
   * Create funnel affiliate links for all blocks
   * This creates both discovery and checkout links for each funnel block
   */
  async createFunnelAffiliateLinks(
    product: WhopProduct,
    planId: string,
    affiliateCode: string,
    funnelId: string
  ): Promise<FunnelAffiliateLink[]> {
    try {
      console.log(`🎯 Creating funnel affiliate links for funnel: ${funnelId}`);
      
      const blocks = ['value_delivery', 'transition', 'offer'];
      const funnelLinks: FunnelAffiliateLink[] = [];

      for (const blockId of blocks) {
        try {
          // Create discovery link
          const discoveryUrl = this.createAffiliateDiscoveryLink(
            product,
            affiliateCode,
            funnelId,
            blockId
          );

          // Create checkout session
          const checkoutData = await this.createAffiliateCheckout(
            product,
            planId,
            affiliateCode,
            funnelId,
            blockId
          );

          const funnelLink: FunnelAffiliateLink = {
            funnelId,
            blockId,
            productId: product.id,
            planId: planId,
            affiliateCode: affiliateCode,
            discoveryUrl: discoveryUrl,
            checkoutUrl: checkoutData.url,
            metadata: checkoutData.metadata
          };

          funnelLinks.push(funnelLink);
          console.log(`✅ Created funnel link for ${blockId}: ${funnelLink.checkoutUrl}`);

        } catch (error) {
          console.error(`❌ Error creating funnel link for ${blockId}:`, error);
          // Continue with other blocks
        }
      }

      console.log(`✅ Created ${funnelLinks.length} funnel affiliate links`);
      return funnelLinks;

    } catch (error) {
      console.error("❌ Error creating funnel affiliate links:", error);
      throw error;
    }
  }

  /**
   * Create affiliate links for all paid products
   * This creates both discovery and checkout links for each paid product
   */
  async createPaidProductAffiliateLinks(
    products: WhopProduct[],
    affiliateCode: string,
    funnelId?: string
  ): Promise<{
    discoveryLinks: Array<{ product: WhopProduct; url: string }>;
    checkoutLinks: AffiliateCheckoutData[];
  }> {
    try {
      console.log(`🔗 Creating affiliate links for ${products.length} paid products`);
      
      const paidProducts = products.filter(p => !p.isFree && p.price > 0);
      const discoveryLinks: Array<{ product: WhopProduct; url: string }> = [];
      const checkoutLinks: AffiliateCheckoutData[] = [];

      for (const product of paidProducts) {
        try {
          // Get the cheapest plan for this product
          const cheapestPlan = this.getCheapestPlan(product);
          if (!cheapestPlan) {
            console.warn(`⚠️ No plans found for product: ${product.title}`);
            continue;
          }

          // Create discovery link
          const discoveryUrl = this.createAffiliateDiscoveryLink(
            product,
            affiliateCode,
            funnelId,
            'unknown'
          );
          discoveryLinks.push({ product, url: discoveryUrl });

          // Create checkout session
          const checkoutData = await this.createAffiliateCheckout(
            product,
            cheapestPlan.id,
            affiliateCode,
            funnelId,
            'unknown'
          );
          checkoutLinks.push(checkoutData);

          console.log(`✅ Created affiliate links for: ${product.title}`);

        } catch (error) {
          console.error(`❌ Error creating affiliate links for ${product.title}:`, error);
          // Continue with other products
        }
      }

      console.log(`✅ Created ${discoveryLinks.length} discovery links and ${checkoutLinks.length} checkout links`);
      return { discoveryLinks, checkoutLinks };

    } catch (error) {
      console.error("❌ Error creating paid product affiliate links:", error);
      throw error;
    }
  }

  /**
   * Get the cheapest plan for a product
   */
  private getCheapestPlan(product: WhopProduct): { id: string; price: number; currency: string; title?: string } | null {
    if (!product.plans || product.plans.length === 0) {
      return null;
    }

    const cheapestPlan = product.plans.reduce((cheapest, current) => 
      current.price < cheapest.price ? current : cheapest
    );

    return cheapestPlan;
  }

  /**
   * Extract funnel context from webhook data
   */
  extractFunnelContextFromWebhook(webhookData: any): {
    funnelId?: string;
    blockId?: string;
    productId?: string;
    affiliateCode?: string;
  } {
    try {
      const plan = webhookData.body?.plan;
      const metadata = plan?.metadata || {};
      
      return {
        funnelId: metadata.funnelId,
        blockId: metadata.blockId,
        productId: metadata.productId,
        affiliateCode: webhookData.body?.affiliate_reward
      };
    } catch (error) {
      console.error("❌ Error extracting funnel context from webhook:", error);
      return {};
    }
  }

  /**
   * Handle affiliate sale with funnel attribution
   */
  async handleAffiliateSale(
    webhookData: any,
    funnelContext: {
      funnelId?: string;
      blockId?: string;
      productId?: string;
      affiliateCode?: string;
    }
  ): Promise<void> {
    try {
      console.log(`💰 Processing affiliate sale with funnel attribution:`, funnelContext);
      
      const { user_id, final_amount, currency } = webhookData.body;
      
      // Log the sale with full attribution
      console.log(`🎯 Affiliate Sale Detected:`, {
        userId: user_id,
        revenue: final_amount,
        currency: currency,
        funnelId: funnelContext.funnelId,
        blockId: funnelContext.blockId,
        productId: funnelContext.productId,
        affiliateCode: funnelContext.affiliateCode
      });

      // Here you can implement your business logic:
      // - Update analytics
      // - Send notifications
      // - Update database records
      // - etc.

      console.log(`✅ Affiliate sale processed successfully`);

    } catch (error) {
      console.error("❌ Error handling affiliate sale:", error);
      throw error;
    }
  }
}

export const affiliateCheckoutService = new AffiliateCheckoutService();
