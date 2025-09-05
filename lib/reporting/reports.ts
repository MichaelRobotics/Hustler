/**
 * Reporting System
 * 
 * Generates comprehensive reports for funnel performance, user analytics,
 * and business insights with export capabilities.
 */

import { db } from '../supabase/db';
import { 
  funnelAnalytics, 
  funnels, 
  conversations, 
  messages, 
  funnelInteractions,
  resources,
  users,
  companies
} from '../supabase/schema';
import { eq, and, gte, lte, desc, asc, count, sum, avg, sql } from 'drizzle-orm';
import { AuthenticatedUser } from '../middleware/simple-auth';
import { analyticsSystem } from '../analytics/analytics';

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  funnelIds?: string[];
  userIds?: string[];
  includeInactive?: boolean;
  format?: 'json' | 'csv' | 'pdf';
}

export interface FunnelPerformanceReport {
  reportId: string;
  title: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalFunnels: number;
    activeFunnels: number;
    totalViews: number;
    totalStarts: number;
    totalCompletions: number;
    totalConversions: number;
    totalRevenue: number;
    averageConversionRate: number;
  };
  funnelDetails: Array<{
    funnelId: string;
    funnelName: string;
    views: number;
    starts: number;
    completions: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
    completionRate: number;
  }>;
  topPerformingFunnels: Array<{
    funnelId: string;
    funnelName: string;
    conversions: number;
    revenue: number;
    conversionRate: number;
  }>;
  trends: Array<{
    date: string;
    views: number;
    starts: number;
    completions: number;
    conversions: number;
    revenue: number;
  }>;
}

export interface UserEngagementReport {
  reportId: string;
  title: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalUsers: number;
    activeUsers: number;
    totalInteractions: number;
    totalConversations: number;
    averageSessionDuration: number;
  };
  userDetails: Array<{
    userId: string;
    userName: string;
    interactions: number;
    conversations: number;
    averageSessionDuration: number;
    lastActive: Date;
  }>;
  engagementTrends: Array<{
    date: string;
    activeUsers: number;
    newUsers: number;
    interactions: number;
  }>;
}

export interface BusinessInsightsReport {
  reportId: string;
  title: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    total: number;
    average: number;
    growth: number;
    topProducts: Array<{
      productId: string;
      productName: string;
      revenue: number;
      conversions: number;
    }>;
  };
  conversion: {
    overallRate: number;
    funnelBreakdown: Array<{
      funnelId: string;
      funnelName: string;
      rate: number;
      trend: 'up' | 'down' | 'stable';
    }>;
  };
  recommendations: Array<{
    type: 'optimization' | 'growth' | 'issue';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }>;
}

class ReportingSystem {
  /**
   * Generate funnel performance report
   */
  async generateFunnelPerformanceReport(
    user: AuthenticatedUser,
    filters: ReportFilters
  ): Promise<FunnelPerformanceReport> {
    const reportId = `funnel_perf_${Date.now()}`;
    const generatedAt = new Date();
    
    // Build date filter
    const dateFilter = [];
    if (filters.startDate) {
      dateFilter.push(gte(funnelAnalytics.date, filters.startDate));
    }
    if (filters.endDate) {
      dateFilter.push(lte(funnelAnalytics.date, filters.endDate));
    }

    // Get summary metrics
    const summaryMetrics = await db
      .select({
        totalViews: sum(funnelAnalytics.views),
        totalStarts: sum(funnelAnalytics.starts),
        totalCompletions: sum(funnelAnalytics.completions),
        totalConversions: sum(funnelAnalytics.conversions),
        totalRevenue: sum(funnelAnalytics.revenue)
      })
      .from(funnelAnalytics)
      .innerJoin(funnels, eq(funnelAnalytics.funnelId, funnels.id))
      .where(and(
        eq(funnels.companyId, user.companyId),
        ...dateFilter
      ));

    const totals = summaryMetrics[0] || {
      totalViews: 0,
      totalStarts: 0,
      totalCompletions: 0,
      totalConversions: 0,
      totalRevenue: 0
    };

    // Get funnel details
    const funnelDetails = await db
      .select({
        funnelId: funnels.id,
        funnelName: funnels.name,
        views: sum(funnelAnalytics.views),
        starts: sum(funnelAnalytics.starts),
        completions: sum(funnelAnalytics.completions),
        conversions: sum(funnelAnalytics.conversions),
        revenue: sum(funnelAnalytics.revenue)
      })
      .from(funnelAnalytics)
      .innerJoin(funnels, eq(funnelAnalytics.funnelId, funnels.id))
      .where(and(
        eq(funnels.companyId, user.companyId),
        ...dateFilter
      ))
      .groupBy(funnels.id, funnels.name)
      .orderBy(desc(sum(funnelAnalytics.conversions)));

    // Get trends
    const trends = await db
      .select({
        date: sql<string>`DATE(${funnelAnalytics.date})`,
        views: sum(funnelAnalytics.views),
        starts: sum(funnelAnalytics.starts),
        completions: sum(funnelAnalytics.completions),
        conversions: sum(funnelAnalytics.conversions),
        revenue: sum(funnelAnalytics.revenue)
      })
      .from(funnelAnalytics)
      .innerJoin(funnels, eq(funnelAnalytics.funnelId, funnels.id))
      .where(and(
        eq(funnels.companyId, user.companyId),
        ...dateFilter
      ))
      .groupBy(sql`DATE(${funnelAnalytics.date})`)
      .orderBy(asc(sql`DATE(${funnelAnalytics.date})`));

    const averageConversionRate = totals.totalStarts > 0 
      ? (totals.totalConversions / totals.totalStarts) * 100 
      : 0;

    return {
      reportId,
      title: 'Funnel Performance Report',
      generatedAt,
      period: {
        startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: filters.endDate || new Date()
      },
      summary: {
        totalFunnels: funnelDetails.length,
        activeFunnels: funnelDetails.filter((f: any) => Number(f.starts) > 0).length,
        totalViews: Number(totals.totalViews) || 0,
        totalStarts: Number(totals.totalStarts) || 0,
        totalCompletions: Number(totals.totalCompletions) || 0,
        totalConversions: Number(totals.totalConversions) || 0,
        totalRevenue: Number(totals.totalRevenue) || 0,
        averageConversionRate
      },
      funnelDetails: funnelDetails.map((funnel: any) => ({
        funnelId: funnel.funnelId,
        funnelName: funnel.funnelName,
        views: Number(funnel.views) || 0,
        starts: Number(funnel.starts) || 0,
        completions: Number(funnel.completions) || 0,
        conversions: Number(funnel.conversions) || 0,
        revenue: Number(funnel.revenue) || 0,
        conversionRate: funnel.starts > 0 ? (Number(funnel.conversions) / Number(funnel.starts)) * 100 : 0,
        completionRate: funnel.starts > 0 ? (Number(funnel.completions) / Number(funnel.starts)) * 100 : 0
      })),
      topPerformingFunnels: funnelDetails
        .slice(0, 5)
        .map((funnel: any) => ({
          funnelId: funnel.funnelId,
          funnelName: funnel.funnelName,
          conversions: Number(funnel.conversions) || 0,
          revenue: Number(funnel.revenue) || 0,
          conversionRate: funnel.starts > 0 ? (Number(funnel.conversions) / Number(funnel.starts)) * 100 : 0
        })),
      trends: trends.map((trend: any) => ({
        date: trend.date,
        views: Number(trend.views) || 0,
        starts: Number(trend.starts) || 0,
        completions: Number(trend.completions) || 0,
        conversions: Number(trend.conversions) || 0,
        revenue: Number(trend.revenue) || 0
      }))
    };
  }

  /**
   * Generate user engagement report
   */
  async generateUserEngagementReport(
    user: AuthenticatedUser,
    filters: ReportFilters
  ): Promise<UserEngagementReport> {
    const reportId = `user_engagement_${Date.now()}`;
    const generatedAt = new Date();

    // Build date filter
    const dateFilter = [];
    if (filters.startDate) {
      dateFilter.push(gte(conversations.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      dateFilter.push(lte(conversations.createdAt, filters.endDate));
    }

    // Get user details
    const userDetails = await db
      .select({
        userId: users.id,
        userName: users.name,
        interactions: count(funnelInteractions.id),
        conversations: count(conversations.id),
        lastActive: sql<Date>`MAX(${conversations.updatedAt})`
      })
      .from(users)
      .leftJoin(conversations, eq(users.id, conversations.companyId)) // This join might need adjustment
      .leftJoin(funnelInteractions, eq(conversations.id, funnelInteractions.conversationId))
      .where(and(
        eq(users.companyId, user.companyId),
        ...dateFilter
      ))
      .groupBy(users.id, users.name)
      .orderBy(desc(count(funnelInteractions.id)));

    // Get engagement trends
    const engagementTrends = await db
      .select({
        date: sql<string>`DATE(${conversations.createdAt})`,
        activeUsers: count(sql`DISTINCT ${conversations.companyId}`), // This might need adjustment
        newUsers: count(sql`DISTINCT ${users.id}`),
        interactions: count(funnelInteractions.id)
      })
      .from(conversations)
      .leftJoin(funnelInteractions, eq(conversations.id, funnelInteractions.conversationId))
      .leftJoin(users, eq(conversations.companyId, users.companyId))
      .where(and(
        eq(conversations.companyId, user.companyId),
        ...dateFilter
      ))
      .groupBy(sql`DATE(${conversations.createdAt})`)
      .orderBy(asc(sql`DATE(${conversations.createdAt})`));

    const totalUsers = userDetails.length;
    const activeUsers = userDetails.filter((u: any) => Number(u.interactions) > 0).length;
    const totalInteractions = userDetails.reduce((sum: any, u: any) => sum + Number(u.interactions), 0);
    const totalConversations = userDetails.reduce((sum: any, u: any) => sum + Number(u.conversations), 0);

    return {
      reportId,
      title: 'User Engagement Report',
      generatedAt,
      period: {
        startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: filters.endDate || new Date()
      },
      summary: {
        totalUsers,
        activeUsers,
        totalInteractions,
        totalConversations,
        averageSessionDuration: 0 // Would need more complex calculation
      },
      userDetails: userDetails.map((user: any) => ({
        userId: user.userId,
        userName: user.userName,
        interactions: Number(user.interactions) || 0,
        conversations: Number(user.conversations) || 0,
        averageSessionDuration: 0, // Would need more complex calculation
        lastActive: user.lastActive || new Date()
      })),
      engagementTrends: engagementTrends.map((trend: any) => ({
        date: trend.date,
        activeUsers: Number(trend.activeUsers) || 0,
        newUsers: Number(trend.newUsers) || 0,
        interactions: Number(trend.interactions) || 0
      }))
    };
  }

  /**
   * Generate business insights report
   */
  async generateBusinessInsightsReport(
    user: AuthenticatedUser,
    filters: ReportFilters
  ): Promise<BusinessInsightsReport> {
    const reportId = `business_insights_${Date.now()}`;
    const generatedAt = new Date();

    // Get revenue data
    const revenueData = await db
      .select({
        totalRevenue: sum(funnelAnalytics.revenue),
        totalConversions: sum(funnelAnalytics.conversions)
      })
      .from(funnelAnalytics)
      .innerJoin(funnels, eq(funnelAnalytics.funnelId, funnels.id))
      .where(and(
        eq(funnels.companyId, user.companyId),
        ...(filters.startDate ? [gte(funnelAnalytics.date, filters.startDate)] : []),
        ...(filters.endDate ? [lte(funnelAnalytics.date, filters.endDate)] : [])
      ));

    const totals = revenueData[0] || { totalRevenue: 0, totalConversions: 0 };

    // Get top products (resources with conversions)
    const topProducts = await db
      .select({
        productId: resources.id,
        productName: resources.name,
        revenue: sum(funnelAnalytics.revenue),
        conversions: sum(funnelAnalytics.conversions)
      })
      .from(resources)
      .innerJoin(funnelAnalytics, eq(resources.id, funnelAnalytics.funnelId)) // This join might need adjustment
      .where(and(
        eq(resources.companyId, user.companyId),
        eq(resources.type, 'MY_PRODUCTS'),
        ...(filters.startDate ? [gte(funnelAnalytics.date, filters.startDate)] : []),
        ...(filters.endDate ? [lte(funnelAnalytics.date, filters.endDate)] : [])
      ))
      .groupBy(resources.id, resources.name)
      .orderBy(desc(sum(funnelAnalytics.revenue)))
      .limit(10);

    // Get conversion breakdown by funnel
    const funnelBreakdown = await db
      .select({
        funnelId: funnels.id,
        funnelName: funnels.name,
        conversions: sum(funnelAnalytics.conversions),
        starts: sum(funnelAnalytics.starts)
      })
      .from(funnelAnalytics)
      .innerJoin(funnels, eq(funnelAnalytics.funnelId, funnels.id))
      .where(and(
        eq(funnels.companyId, user.companyId),
        ...(filters.startDate ? [gte(funnelAnalytics.date, filters.startDate)] : []),
        ...(filters.endDate ? [lte(funnelAnalytics.date, filters.endDate)] : [])
      ))
      .groupBy(funnels.id, funnels.name)
      .orderBy(desc(sum(funnelAnalytics.conversions)));

    // Generate recommendations
    const recommendations = this.generateRecommendations(funnelBreakdown, totals);

    return {
      reportId,
      title: 'Business Insights Report',
      generatedAt,
      period: {
        startDate: filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: filters.endDate || new Date()
      },
      revenue: {
        total: Number(totals.totalRevenue) || 0,
        average: totals.totalConversions > 0 ? Number(totals.totalRevenue) / Number(totals.totalConversions) : 0,
        growth: 0, // Would need historical comparison
        topProducts: topProducts.map((product: any) => ({
          productId: product.productId,
          productName: product.productName,
          revenue: Number(product.revenue) || 0,
          conversions: Number(product.conversions) || 0
        }))
      },
      conversion: {
        overallRate: 0, // Would need total starts calculation
        funnelBreakdown: funnelBreakdown.map((funnel: any) => ({
          funnelId: funnel.funnelId,
          funnelName: funnel.funnelName,
          rate: funnel.starts > 0 ? (Number(funnel.conversions) / Number(funnel.starts)) * 100 : 0,
          trend: 'stable' as const // Would need historical comparison
        }))
      },
      recommendations
    };
  }

  /**
   * Generate recommendations based on data
   */
  private generateRecommendations(
    funnelBreakdown: any[],
    totals: any
  ): Array<{
    type: 'optimization' | 'growth' | 'issue';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }> {
    const recommendations = [];

    // Check for low-performing funnels
    const lowPerformingFunnels = funnelBreakdown.filter(f => 
      f.starts > 0 && (Number(f.conversions) / Number(f.starts)) < 0.05
    );

    if (lowPerformingFunnels.length > 0) {
      recommendations.push({
        type: 'optimization' as const,
        priority: 'high' as const,
        title: 'Low Conversion Rate Detected',
        description: `${lowPerformingFunnels.length} funnel(s) have conversion rates below 5%`,
        action: 'Review and optimize funnel flows, test different messaging, or consider A/B testing'
      });
    }

    // Check for high-performing funnels
    const highPerformingFunnels = funnelBreakdown.filter(f => 
      f.starts > 0 && (Number(f.conversions) / Number(f.starts)) > 0.2
    );

    if (highPerformingFunnels.length > 0) {
      recommendations.push({
        type: 'growth' as const,
        priority: 'medium' as const,
        title: 'High-Performing Funnels Identified',
        description: `${highPerformingFunnels.length} funnel(s) have conversion rates above 20%`,
        action: 'Scale these successful funnels and use them as templates for new campaigns'
      });
    }

    // Check for revenue opportunities
    if (Number(totals.totalRevenue) === 0) {
      recommendations.push({
        type: 'issue' as const,
        priority: 'high' as const,
        title: 'No Revenue Generated',
        description: 'No revenue has been generated in the selected period',
        action: 'Review funnel setup, check payment integration, and ensure conversion tracking is working'
      });
    }

    return recommendations;
  }

  /**
   * Export report to different formats
   */
  async exportReport(
    report: FunnelPerformanceReport | UserEngagementReport | BusinessInsightsReport,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'csv':
        return this.convertToCSV(report);
      case 'pdf':
        // In a real implementation, you'd use a PDF library like puppeteer or jsPDF
        throw new Error('PDF export not implemented yet');
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert report to CSV format
   */
  private convertToCSV(report: any): string {
    // Simplified CSV conversion - in production, you'd want a more robust solution
    const headers = Object.keys(report);
    const rows = [headers.join(',')];
    
    // This is a simplified implementation
    rows.push(JSON.stringify(report).replace(/"/g, '""'));
    
    return rows.join('\n');
  }
}

// Export singleton instance
export const reportingSystem = new ReportingSystem();

// Export types
// Types are already exported above
