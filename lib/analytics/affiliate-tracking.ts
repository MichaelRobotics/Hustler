import { db } from "@/lib/supabase/db-server";
import { funnelAnalytics, resources } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Affiliate Commission Tracking
 * Handles affiliate commission tracking and reporting
 */

export interface AffiliateCommission {
  id: string;
  affiliateAppId: string; // Your app/experience ID
  productId: string;
  userId: string;
  amount: number;
  currency: string;
  commissionRate: number; // e.g., 0.30 for 30%
  commissionAmount: number;
  purchaseDate: Date;
  payoutDate?: Date;
  status: 'pending' | 'paid' | 'cancelled';
}

/**
 * Track affiliate commission for a purchase
 */
export async function trackAffiliateCommission(
  affiliateAppId: string,
  productId: string,
  userId: string,
  amount: number,
  currency: string,
  commissionRate: number = 0.10 // Default 10% commission
): Promise<AffiliateCommission | null> {
  try {
    console.log(`💰 Tracking affiliate commission: ${commissionRate * 100}% of ${amount} ${currency}`);
    
    const commissionAmount = amount * commissionRate;
    const purchaseDate = new Date();
    const payoutDate = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
    
    const commission: AffiliateCommission = {
      id: `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      affiliateAppId,
      productId,
      userId,
      amount,
      currency,
      commissionRate,
      commissionAmount,
      purchaseDate,
      payoutDate,
      status: 'pending'
    };
    
    // Store commission in database (you'll need to create this table)
    // await db.insert(affiliateCommissions).values(commission);
    
    console.log(`✅ Affiliate commission tracked: $${commissionAmount} ${currency} (${commissionRate * 100}% of $${amount})`);
    console.log(`📅 Payout date: ${payoutDate.toISOString()}`);
    
    return commission;
    
  } catch (error) {
    console.error("❌ Error tracking affiliate commission:", error);
    return null;
  }
}

/**
 * Get affiliate commission summary
 */
export async function getAffiliateCommissionSummary(
  affiliateAppId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    // This would query your affiliate commissions table
    // For now, return mock data structure
    return {
      totalCommissions: 0,
      totalRevenue: 0,
      pendingCommissions: 0,
      paidCommissions: 0,
      upcomingPayouts: 0,
      commissionRate: 0.30
    };
    
  } catch (error) {
    console.error("Error getting affiliate commission summary:", error);
    throw error;
  }
}

/**
 * Check if a product link has affiliate tracking
 */
export function hasAffiliateTracking(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.has('app') || urlObj.searchParams.has('affiliate');
  } catch {
    return false;
  }
}

/**
 * Extract affiliate app ID from URL
 */
export function extractAffiliateAppId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('app') || urlObj.searchParams.get('affiliate');
  } catch {
    return null;
  }
}

/**
 * Generate affiliate tracking URL
 */
export function generateAffiliateUrl(
  baseUrl: string,
  affiliateAppId: string,
  isDiscoveryPage: boolean = true
): string {
  try {
    const url = new URL(baseUrl);
    
    if (isDiscoveryPage) {
      // For discovery pages, use 'app' parameter (Whop standard)
      url.searchParams.set('app', affiliateAppId);
    } else {
      // For other URLs, use 'affiliate' parameter
      url.searchParams.set('affiliate', affiliateAppId);
    }
    
    return url.toString();
  } catch (error) {
    console.error("Error generating affiliate URL:", error);
    return baseUrl;
  }
}
