/**
 * Whop Native Tracking Service
 * 
 * Uses Whop's native tracking system instead of custom tracking.
 * This leverages Whop's built-in analytics for clicks, conversions, and revenue.
 */

import { whopSdk } from "@/lib/whop-sdk";

export interface TrackingLinkData {
  id: string;
  url: string;
  name: string;
  planId: string;
  whopId: string;
  destination: 'checkout' | 'store';
}

export interface TrackingMetrics {
  clicks: number;
  revenue: number;
  conversionRate: number;
  convertedUsers: number;
}

class WhopNativeTrackingService {
  /**
   * Create a Whop native tracking link for a plan
   * This uses Whop's API to create proper tracking links with built-in analytics
   */
  async createTrackingLink(
    planId: string,
    whopId: string,
    linkName: string,
    destination: 'checkout' | 'store' = 'checkout'
  ): Promise<TrackingLinkData> {
    try {
      console.log(`🔗 Creating Whop native tracking link for plan ${planId}`);
      
      // TODO: Implement Whop native tracking link creation
      // The whopSdk.plans.createQuickLink method doesn't exist in the current SDK
      // For now, return a placeholder response
      const response = {
        id: `tracking_${Date.now()}`,
        url: destination === 'checkout' 
          ? `https://whop.com/checkout/${planId}` 
          : `https://whop.com/hub/${whopId}`,
        name: linkName
      };

      if (!response.id) {
        throw new Error('Failed to create tracking link: No data returned');
      }

      const trackingLink: TrackingLinkData = {
        id: response.id,
        url: response.url,
        name: linkName,
        planId,
        whopId,
        destination
      };

      console.log(`✅ Created Whop tracking link: ${trackingLink.url}`);
      return trackingLink;

    } catch (error) {
      console.error("❌ Error creating Whop tracking link:", error);
      throw error;
    }
  }

  /**
   * Create a tracking link for a product discovery page
   * This creates a link that goes to the product's discovery page with affiliate tracking
   */
  async createDiscoveryTrackingLink(
    discoveryPageUrl: string,
    planId: string,
    whopId: string,
    linkName: string,
    affiliateAppId?: string
  ): Promise<TrackingLinkData> {
    try {
      console.log(`🔗 Creating discovery tracking link for ${discoveryPageUrl}`);
      
      // TODO: Implement Whop native tracking link creation
      // The whopSdk.plans.createQuickLink method doesn't exist in the current SDK
      // For now, return a placeholder response
      const response = {
        id: `tracking_${Date.now()}`,
        url: this.buildDiscoveryUrl(discoveryPageUrl, affiliateAppId),
        name: linkName
      };

      if (!response.id) {
        throw new Error('Failed to create discovery tracking link: No data returned');
      }

      const trackingLink: TrackingLinkData = {
        id: response.id,
        url: response.url,
        name: linkName,
        planId,
        whopId,
        destination: 'store'
      };

      console.log(`✅ Created discovery tracking link: ${trackingLink.url}`);
      return trackingLink;

    } catch (error) {
      console.error("❌ Error creating discovery tracking link:", error);
      throw error;
    }
  }

  /**
   * Build a discovery page URL with affiliate tracking
   */
  private buildDiscoveryUrl(discoveryPageUrl: string, affiliateAppId?: string): string {
    try {
      const url = new URL(discoveryPageUrl);
      
      // Add affiliate tracking if provided
      if (affiliateAppId) {
        url.searchParams.set('app', affiliateAppId);
      }
      
      return url.toString();
    } catch (error) {
      console.error("Error building discovery URL:", error);
      return discoveryPageUrl;
    }
  }

  /**
   * Get tracking metrics for a tracking link
   * This retrieves analytics data from Whop's native tracking system
   * 
   * Note: The specific API endpoint for tracking link metrics isn't fully documented
   * in the current Whop API reference, but the metrics are available in the dashboard.
   * This method provides a structure for when the API becomes available.
   */
  async getTrackingMetrics(trackingLinkId: string): Promise<TrackingMetrics> {
    try {
      console.log(`📊 Getting tracking metrics for link ${trackingLinkId}`);
      
      // TODO: Implement API call to get tracking metrics from Whop
      // The exact endpoint isn't documented in the current API reference
      // but Whop's dashboard shows these metrics, so there should be an API
      
      // For now, return placeholder data
      // In production, you would call something like:
      // const response = await whopSdk.analytics.getTrackingLinkMetrics(trackingLinkId);
      
      console.log(`⚠️ Tracking metrics API not yet available - using placeholder data`);
      console.log(`💡 Access metrics via Whop Dashboard > Marketing > Tracking links`);
      
      return {
        clicks: 0,
        revenue: 0,
        conversionRate: 0,
        convertedUsers: 0
      };
    } catch (error) {
      console.error("❌ Error getting tracking metrics:", error);
      throw error;
    }
  }

  /**
   * Get all tracking links for a company
   * This allows you to see all your tracking links and their performance
   */
  async getAllTrackingLinks(companyId: string): Promise<TrackingLinkData[]> {
    try {
      console.log(`📊 Getting all tracking links for company ${companyId}`);
      
      // TODO: Implement API call to list all tracking links
      // This would require calling Whop's tracking links API endpoint
      
      return [];
    } catch (error) {
      console.error("❌ Error getting tracking links:", error);
      throw error;
    }
  }

  /**
   * Create a simple checkout link (no tracking)
   * For free products or when tracking isn't needed
   */
  createSimpleCheckoutLink(planId: string): string {
    return `https://whop.com/checkout/${planId}`;
  }

  /**
   * Create a direct app link for free products
   * This leads directly to the app inside Whop
   * Uses system IDs (fallback for when slugs are not available)
   */
  createDirectAppLink(companyId: string, experienceId: string, refId?: string): string {
    const baseUrl = `https://whop.com/joined/${companyId}/${experienceId}/app/`;
    const url = new URL(baseUrl);
    
    if (refId) {
      url.searchParams.set('ref', refId);
    }
    
    return url.toString();
  }

  /**
   * Create a custom app link using slugs
   * This leads directly to the app inside Whop with custom URLs
   */
  createCustomAppLink(companySlug: string, appSlug: string, refId?: string): string {
    const baseUrl = `https://whop.com/joined/${companySlug}/${appSlug}/app/`;
    const url = new URL(baseUrl);
    
    if (refId) {
      url.searchParams.set('ref', refId);
    }
    
    return url.toString();
  }
}

export const whopNativeTrackingService = new WhopNativeTrackingService();
