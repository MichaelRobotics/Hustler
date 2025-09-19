/**
 * Daily Rollover Service
 * 
 * Handles daily rollover of analytics metrics, moving today's metrics to yesterday's
 * and resetting today's metrics to zero. This should be run daily via cron job.
 */

import { db } from "../supabase/db-server";
import { funnelAnalytics } from "../supabase/schema";
import { sql } from "drizzle-orm";

export class DailyRolloverService {
  /**
   * Perform daily rollover for all funnel analytics
   */
  async performDailyRollover(): Promise<void> {
    try {
      console.log("🔄 Starting daily rollover for funnel analytics...");
      
      // Move today's metrics to yesterday's and reset today's metrics
      await db.update(funnelAnalytics)
        .set({
          // Move today's metrics to yesterday's
          yesterdayStarts: sql`${funnelAnalytics.todayStarts}`,
          yesterdayIntent: sql`${funnelAnalytics.todayIntent}`,
          yesterdayConversions: sql`${funnelAnalytics.todayConversions}`,
          yesterdayInterest: sql`${funnelAnalytics.todayInterest}`,
          
          // Reset today's metrics to zero
          todayStarts: 0,
          todayIntent: 0,
          todayConversions: 0,
          todayInterest: 0,
          todayAffiliateRevenue: "0",
          todayProductRevenue: "0",
          
          // Update last updated timestamp
          lastUpdated: new Date()
        });

      console.log("✅ Daily rollover completed successfully");
      
    } catch (error) {
      console.error("❌ Error during daily rollover:", error);
      throw error;
    }
  }

  /**
   * Get rollover statistics
   */
  async getRolloverStats(): Promise<{
    totalFunnels: number;
    totalStarts: number;
    totalIntent: number;
    totalConversions: number;
    totalInterest: number;
  }> {
    try {
      const stats = await db
        .select({
          totalFunnels: sql<number>`count(*)`,
          totalStarts: sql<number>`sum(${funnelAnalytics.todayStarts})`,
          totalIntent: sql<number>`sum(${funnelAnalytics.todayIntent})`,
          totalConversions: sql<number>`sum(${funnelAnalytics.todayConversions})`,
          totalInterest: sql<number>`sum(${funnelAnalytics.todayInterest})`,
        })
        .from(funnelAnalytics);

      return stats[0] || {
        totalFunnels: 0,
        totalStarts: 0,
        totalIntent: 0,
        totalConversions: 0,
        totalInterest: 0,
      };
      
    } catch (error) {
      console.error("Error getting rollover stats:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const dailyRolloverService = new DailyRolloverService();
