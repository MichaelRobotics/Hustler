/**
 * Whop Tracking Links Implementation
 * 
 * This module provides functionality to create tracking links with funnel attribution
 * and correlate webhook data with specific funnels.
 */

import { whopSdk } from '../whop-sdk';

export interface TrackingLinkData {
  id: string;
  url: string;
  name: string;
  planId: string;
  funnelId: string;
  blockId: string;
  productId: string;
  metadata: Record<string, any>;
}

export interface FunnelContext {
  funnelId: string;
  blockId: string;
  productId: string;
  planId: string;
  userId?: string;
  checkoutId?: string;
}

class TrackingLinksService {
  /**
   * Create a tracking link for a specific funnel and block
   */
  async createTrackingLink(
    originalPlanId: string,
    funnelId: string,
    blockId: string,
    productId: string,
    customName?: string
  ): Promise<TrackingLinkData> {
    try {
      console.log(`🔗 Creating tracking link for funnel ${funnelId}, block ${blockId}`);
      
      // Create structured name for easy parsing
      const trackingName = customName || `funnel_${funnelId}_block_${blockId}_product_${productId}`;
      
      // Create quick link (tracking link) using the API
      const quickLinkData = {
        internal_notes: trackingName,
        payment_link_description: `Funnel ${funnelId} - ${blockId} block tracking link`,
        metadata: {
          funnelId,
          blockId,
          productId,
          originalPlanId,
          createdAt: new Date().toISOString()
        },
        stock: 1000, // High stock limit for tracking links
        short_link: `funnel-${funnelId}-${blockId}-${Date.now()}`
      };

      // Use direct API call since SDK might not have this method
      const response = await fetch(`https://api.whop.com/api/v2/plans/${originalPlanId}/create_quick_link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quickLinkData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create tracking link: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      // Store tracking link data in your database
      await this.storeTrackingLink({
        id: result.id,
        url: result.direct_link || `https://whop.com/checkout/${result.id}`,
        name: trackingName,
        planId: result.id,
        funnelId,
        blockId,
        productId,
        metadata: quickLinkData.metadata
      });

      console.log(`✅ Created tracking link: ${result.id}`);
      return {
        id: result.id,
        url: result.direct_link || `https://whop.com/checkout/${result.id}`,
        name: trackingName,
        planId: result.id,
        funnelId,
        blockId,
        productId,
        metadata: quickLinkData.metadata
      };

    } catch (error) {
      console.error('❌ Error creating tracking link:', error);
      throw error;
    }
  }

  /**
   * Store tracking link data in your database
   */
  private async storeTrackingLink(data: TrackingLinkData): Promise<void> {
    // TODO: Implement database storage
    // This should store the tracking link data in your database
    // so you can correlate webhook plan_id with funnel context
    console.log('📊 Storing tracking link data:', data);
  }

  /**
   * Get funnel context from webhook data
   */
  async getFunnelContextFromWebhook(webhookData: any): Promise<FunnelContext | null> {
    try {
      const { plan_id, user_id, checkout_id, product_id } = webhookData.data;
      
      // Method 1: Query database for plan_id mapping
      const trackingData = await this.getTrackingDataByPlanId(plan_id);
      if (trackingData) {
        return {
          funnelId: trackingData.funnelId,
          blockId: trackingData.blockId,
          productId: trackingData.productId,
          planId: plan_id,
          userId: user_id,
          checkoutId: checkout_id
        };
      }

      // Method 2: Try to get plan details and extract from internal_notes
      const planDetails = await this.getPlanDetails(plan_id);
      if (planDetails && planDetails.internal_notes) {
        const funnelContext = this.parseFunnelContextFromName(planDetails.internal_notes);
        if (funnelContext) {
          return {
            ...funnelContext,
            planId: plan_id,
            userId: user_id,
            checkoutId: checkout_id
          };
        }
      }

      // Method 3: Check plan metadata
      if (planDetails && planDetails.metadata) {
        const { funnelId, blockId, productId } = planDetails.metadata;
        if (funnelId && blockId && productId) {
          return {
            funnelId,
            blockId,
            productId,
            planId: plan_id,
            userId: user_id,
            checkoutId: checkout_id
          };
        }
      }

      return null;

    } catch (error) {
      console.error('❌ Error getting funnel context:', error);
      return null;
    }
  }

  /**
   * Get tracking data by plan ID from database
   */
  private async getTrackingDataByPlanId(planId: string): Promise<TrackingLinkData | null> {
    // TODO: Implement database query
    // This should query your database for tracking link data by plan_id
    console.log(`🔍 Looking up tracking data for plan: ${planId}`);
    return null;
  }

  /**
   * Get plan details from Whop API
   */
  private async getPlanDetails(planId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.whop.com/api/v2/plans/${planId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting plan details:', error);
      return null;
    }
  }

  /**
   * Parse funnel context from plan internal_notes
   */
  private parseFunnelContextFromName(internalNotes: string): FunnelContext | null {
    try {
      // Parse format: funnel_123_block_offer_product_prod_456
      const parts = internalNotes.split('_');
      if (parts.length >= 6 && parts[0] === 'funnel') {
        return {
          funnelId: parts[1],
          blockId: parts[3],
          productId: parts[5],
          planId: 'unknown' // We don't have planId in the internal notes format
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error parsing funnel context:', error);
      return null;
    }
  }

  /**
   * Handle funnel sale attribution
   */
  async handleFunnelSale(funnelContext: FunnelContext, webhookData: any): Promise<void> {
    try {
      console.log(`🎯 Processing funnel sale:`, funnelContext);
      
      // Here you can implement your funnel-specific logic:
      // - Send specific DMs based on funnel and block
      // - Update analytics
      // - Trigger specific actions
      // - etc.
      
      console.log(`✅ Funnel sale processed for funnel ${funnelContext.funnelId}, block ${funnelContext.blockId}`);
      
    } catch (error) {
      console.error('❌ Error handling funnel sale:', error);
    }
  }
}

export const trackingLinksService = new TrackingLinksService();

/**
 * Example usage in webhook handler:
 * 
 * export async function POST(request: NextRequest) {
 *   const webhookData = await request.json();
 *   
 *   if (webhookData.action === "membership.went_valid") {
 *     const funnelContext = await trackingLinksService.getFunnelContextFromWebhook(webhookData);
 *     
 *     if (funnelContext) {
 *       await trackingLinksService.handleFunnelSale(funnelContext, webhookData);
 *     } else {
 *       console.log('No funnel context found for this sale');
 *     }
 *   }
 * }
 */
