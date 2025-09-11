/**
 * Analytics System
 *
 * Comprehensive analytics tracking for funnel performance, user interactions,
 * conversion rates, and real-time analytics updates.
 */

import {
	and,
	asc,
	avg,
	count,
	desc,
	eq,
	gte,
	lte,
	sql,
	sum,
} from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import {
	conversations,
	experiences,
	funnelAnalytics,
	funnelInteractions,
	funnels,
	messages,
	resources,
	users,
} from "../supabase/schema";
// WebSocket functionality moved to React hooks

export interface FunnelPerformanceMetrics {
	funnelId: string;
	funnelName: string;
	totalViews: number;
	totalStarts: number;
	totalCompletions: number;
	totalConversions: number;
	totalRevenue: number;
	conversionRate: number;
	completionRate: number;
	averageTimeToComplete: number;
	topPerformingBlocks: Array<{
		blockId: string;
		interactions: number;
		conversionRate: number;
	}>;
	dailyMetrics: Array<{
		date: string;
		views: number;
		starts: number;
		completions: number;
		conversions: number;
		revenue: number;
	}>;
}

export interface UserInteractionAnalytics {
	userId: string;
	userName: string;
	totalInteractions: number;
	totalConversations: number;
	averageSessionDuration: number;
	favoriteFunnels: Array<{
		funnelId: string;
		funnelName: string;
		interactions: number;
	}>;
	conversionHistory: Array<{
		date: string;
		conversions: number;
		revenue: number;
	}>;
}

export interface CompanyAnalytics {
	experienceId: string;
	totalFunnels: number;
	activeFunnels: number;
	totalUsers: number;
	totalConversations: number;
	totalRevenue: number;
	averageConversionRate: number;
	topPerformingFunnels: Array<{
		funnelId: string;
		funnelName: string;
		conversions: number;
		revenue: number;
		conversionRate: number;
	}>;
	userEngagement: {
		dailyActiveUsers: number;
		weeklyActiveUsers: number;
		monthlyActiveUsers: number;
	};
}

export interface ConversionAnalytics {
	totalConversions: number;
	totalRevenue: number;
	averageOrderValue: number;
	conversionRate: number;
	topConvertingFunnels: Array<{
		funnelId: string;
		funnelName: string;
		conversions: number;
		revenue: number;
		conversionRate: number;
	}>;
	conversionTrends: Array<{
		date: string;
		conversions: number;
		revenue: number;
	}>;
}

export interface AnalyticsFilters {
	startDate?: Date;
	endDate?: Date;
	funnelIds?: string[];
	userIds?: string[];
	includeInactive?: boolean;
}

class AnalyticsSystem {
	private analyticsCache: Map<string, { data: any; timestamp: Date }> =
		new Map();
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	/**
	 * Track funnel view
	 */
	async trackFunnelView(funnelId: string, userId?: string): Promise<void> {
		try {
			await this.updateFunnelAnalytics(funnelId, {
				views: 1,
			});
		} catch (error) {
			console.error("Error tracking funnel view:", error);
		}
	}

	/**
	 * Track funnel start (conversation creation)
	 */
	async trackFunnelStart(
		funnelId: string,
		conversationId: string,
		userId?: string,
	): Promise<void> {
		try {
			await this.updateFunnelAnalytics(funnelId, {
				starts: 1,
			});

			// Send real-time update
			const funnel = await db.query.funnels.findFirst({
				where: eq(funnels.id, funnelId),
			});

			if (funnel) {
				const experience = await db.query.experiences.findFirst({
					where: eq(experiences.id, funnel.experienceId),
				});

				if (experience) {
					// Real-time updates moved to React hooks
				}
			}
		} catch (error) {
			console.error("Error tracking funnel start:", error);
		}
	}

	/**
	 * Track funnel completion
	 */
	async trackFunnelCompletion(
		funnelId: string,
		conversationId: string,
		userId?: string,
	): Promise<void> {
		try {
			await this.updateFunnelAnalytics(funnelId, {
				completions: 1,
			});

			// Send real-time update
			const funnel = await db.query.funnels.findFirst({
				where: eq(funnels.id, funnelId),
			});

			if (funnel) {
				const experience = await db.query.experiences.findFirst({
					where: eq(experiences.id, funnel.experienceId),
				});

				if (experience) {
					// Real-time updates moved to React hooks
				}
			}
		} catch (error) {
			console.error("Error tracking funnel completion:", error);
		}
	}

	/**
	 * Track conversion
	 */
	async trackConversion(
		funnelId: string,
		conversationId: string,
		revenue: number,
		userId?: string,
	): Promise<void> {
		try {
			await this.updateFunnelAnalytics(funnelId, {
				conversions: 1,
				revenue: revenue,
			});

			// Send real-time update
			const funnel = await db.query.funnels.findFirst({
				where: eq(funnels.id, funnelId),
			});

			if (funnel) {
				const experience = await db.query.experiences.findFirst({
					where: eq(experiences.id, funnel.experienceId),
				});

				if (experience) {
					// Real-time updates moved to React hooks
				}
			}
		} catch (error) {
			console.error("Error tracking conversion:", error);
		}
	}

	/**
	 * Get funnel performance metrics
	 */
	async getFunnelPerformanceMetrics(
		user: AuthenticatedUser,
		funnelId: string,
		filters: AnalyticsFilters = {},
	): Promise<FunnelPerformanceMetrics> {
		const cacheKey = `funnel_metrics:${funnelId}:${JSON.stringify(filters)}`;

		// Check cache first
		const cached = this.analyticsCache.get(cacheKey);
		if (
			cached &&
			Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION
		) {
			return cached.data;
		}

		try {
			// Get funnel details
			const funnel = await db.query.funnels.findFirst({
				where: and(
					eq(funnels.id, funnelId),
					eq(funnels.experienceId, user.experience.id),
				),
			});

			if (!funnel) {
				throw new Error("Funnel not found");
			}

			// Build date filter
			const dateFilter = [];
			if (filters.startDate) {
				dateFilter.push(gte(funnelAnalytics.date, filters.startDate));
			}
			if (filters.endDate) {
				dateFilter.push(lte(funnelAnalytics.date, filters.endDate));
			}

			// Get aggregated metrics
			const metrics = await db
				.select({
					totalViews: sum(funnelAnalytics.views),
					totalStarts: sum(funnelAnalytics.starts),
					totalCompletions: sum(funnelAnalytics.completions),
					totalConversions: sum(funnelAnalytics.conversions),
					totalRevenue: sum(funnelAnalytics.revenue),
				})
				.from(funnelAnalytics)
				.where(and(eq(funnelAnalytics.funnelId, funnelId), ...dateFilter));

			const totals = metrics[0] || {
				totalViews: 0,
				totalStarts: 0,
				totalCompletions: 0,
				totalConversions: 0,
				totalRevenue: 0,
			};

			// Calculate rates
			const conversionRate =
				totals.totalStarts > 0
					? (totals.totalConversions / totals.totalStarts) * 100
					: 0;
			const completionRate =
				totals.totalStarts > 0
					? (totals.totalCompletions / totals.totalStarts) * 100
					: 0;

			// Get top performing blocks
			const topBlocks = await db
				.select({
					blockId: funnelInteractions.blockId,
					interactions: count(funnelInteractions.id),
					conversions: count(
						sql`CASE WHEN ${funnelInteractions.nextBlockId} IS NULL THEN 1 END`,
					),
				})
				.from(funnelInteractions)
				.innerJoin(
					conversations,
					eq(funnelInteractions.conversationId, conversations.id),
				)
				.where(
					and(
						eq(conversations.funnelId, funnelId),
						...(filters.startDate
							? [gte(conversations.createdAt, filters.startDate)]
							: []),
						...(filters.endDate
							? [lte(conversations.createdAt, filters.endDate)]
							: []),
					),
				)
				.groupBy(funnelInteractions.blockId)
				.orderBy(desc(count(funnelInteractions.id)))
				.limit(10);

			const topPerformingBlocks = topBlocks.map((block: any) => ({
				blockId: block.blockId,
				interactions: block.interactions,
				conversionRate:
					block.interactions > 0
						? (block.conversions / block.interactions) * 100
						: 0,
			}));

			// Get daily metrics
			const dailyMetrics = await db
				.select({
					date: sql<string>`DATE(${funnelAnalytics.date})`,
					views: sum(funnelAnalytics.views),
					starts: sum(funnelAnalytics.starts),
					completions: sum(funnelAnalytics.completions),
					conversions: sum(funnelAnalytics.conversions),
					revenue: sum(funnelAnalytics.revenue),
				})
				.from(funnelAnalytics)
				.where(and(eq(funnelAnalytics.funnelId, funnelId), ...dateFilter))
				.groupBy(sql`DATE(${funnelAnalytics.date})`)
				.orderBy(asc(sql`DATE(${funnelAnalytics.date})`));

			// Calculate average time to complete
			const avgTimeResult = await db
				.select({
					avgTime: avg(
						sql`EXTRACT(EPOCH FROM (${conversations.updatedAt} - ${conversations.createdAt}))`,
					),
				})
				.from(conversations)
				.where(
					and(
						eq(conversations.funnelId, funnelId),
						eq(conversations.status, "completed"),
						...(filters.startDate
							? [gte(conversations.createdAt, filters.startDate)]
							: []),
						...(filters.endDate
							? [lte(conversations.createdAt, filters.endDate)]
							: []),
					),
				);

			const averageTimeToComplete = avgTimeResult[0]?.avgTime || 0;

			const result: FunnelPerformanceMetrics = {
				funnelId,
				funnelName: funnel.name,
				totalViews: Number(totals.totalViews) || 0,
				totalStarts: Number(totals.totalStarts) || 0,
				totalCompletions: Number(totals.totalCompletions) || 0,
				totalConversions: Number(totals.totalConversions) || 0,
				totalRevenue: Number(totals.totalRevenue) || 0,
				conversionRate,
				completionRate,
				averageTimeToComplete,
				topPerformingBlocks,
				dailyMetrics: dailyMetrics.map((metric: any) => ({
					date: metric.date,
					views: Number(metric.views) || 0,
					starts: Number(metric.starts) || 0,
					completions: Number(metric.completions) || 0,
					conversions: Number(metric.conversions) || 0,
					revenue: Number(metric.revenue) || 0,
				})),
			};

			// Cache the result
			this.analyticsCache.set(cacheKey, {
				data: result,
				timestamp: new Date(),
			});

			return result;
		} catch (error) {
			console.error("Error getting funnel performance metrics:", error);
			throw error;
		}
	}

	/**
	 * Get user interaction analytics
	 */
	async getUserInteractionAnalytics(
		user: AuthenticatedUser,
		targetUserId?: string,
		filters: AnalyticsFilters = {},
	): Promise<UserInteractionAnalytics> {
		const userId = targetUserId || user.id;
		const cacheKey = `user_analytics:${userId}:${JSON.stringify(filters)}`;

		// Check cache first
		const cached = this.analyticsCache.get(cacheKey);
		if (
			cached &&
			Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION
		) {
			return cached.data;
		}

		try {
			// Get user details
			const targetUser = await db.query.users.findFirst({
				where: and(
					eq(users.id, userId),
					eq(users.experienceId, user.experience.id),
				),
			});

			if (!targetUser) {
				throw new Error("User not found");
			}

			// Build date filter
			const dateFilter = [];
			if (filters.startDate) {
				dateFilter.push(gte(conversations.createdAt, filters.startDate));
			}
			if (filters.endDate) {
				dateFilter.push(lte(conversations.createdAt, filters.endDate));
			}

			// Get total interactions
			const totalInteractions = await db
				.select({ count: count(funnelInteractions.id) })
				.from(funnelInteractions)
				.innerJoin(
					conversations,
					eq(funnelInteractions.conversationId, conversations.id),
				)
				.where(
					and(eq(conversations.experienceId, user.experienceId), ...dateFilter),
				);

			// Get total conversations
			const totalConversations = await db
				.select({ count: count(conversations.id) })
				.from(conversations)
				.where(
					and(eq(conversations.experienceId, user.experienceId), ...dateFilter),
				);

			// Get favorite funnels
			const favoriteFunnels = await db
				.select({
					funnelId: conversations.funnelId,
					funnelName: funnels.name,
					interactions: count(funnelInteractions.id),
				})
				.from(funnelInteractions)
				.innerJoin(
					conversations,
					eq(funnelInteractions.conversationId, conversations.id),
				)
				.innerJoin(funnels, eq(conversations.funnelId, funnels.id))
				.where(
					and(eq(conversations.experienceId, user.experienceId), ...dateFilter),
				)
				.groupBy(conversations.funnelId, funnels.name)
				.orderBy(desc(count(funnelInteractions.id)))
				.limit(5);

			// Get conversion history
			const conversionHistory = await db
				.select({
					date: sql<string>`DATE(${conversations.updatedAt})`,
					conversions: count(
						sql`CASE WHEN ${conversations.status} = 'completed' THEN 1 END`,
					),
					revenue: sum(
						sql`CASE WHEN ${conversations.status} = 'completed' THEN 1 ELSE 0 END * 0`,
					), // Placeholder for revenue
				})
				.from(conversations)
				.where(
					and(eq(conversations.experienceId, user.experienceId), ...dateFilter),
				)
				.groupBy(sql`DATE(${conversations.updatedAt})`)
				.orderBy(asc(sql`DATE(${conversations.updatedAt})`));

			// Calculate average session duration
			const avgDurationResult = await db
				.select({
					avgDuration: avg(
						sql`EXTRACT(EPOCH FROM (${conversations.updatedAt} - ${conversations.createdAt}))`,
					),
				})
				.from(conversations)
				.where(
					and(eq(conversations.experienceId, user.experienceId), ...dateFilter),
				);

			const result: UserInteractionAnalytics = {
				userId,
				userName: targetUser.name,
				totalInteractions: totalInteractions[0]?.count || 0,
				totalConversations: totalConversations[0]?.count || 0,
				averageSessionDuration: avgDurationResult[0]?.avgDuration || 0,
				favoriteFunnels: favoriteFunnels.map((funnel: any) => ({
					funnelId: funnel.funnelId,
					funnelName: funnel.funnelName,
					interactions: funnel.interactions,
				})),
				conversionHistory: conversionHistory.map((history: any) => ({
					date: history.date,
					conversions: history.conversions,
					revenue: Number(history.revenue) || 0,
				})),
			};

			// Cache the result
			this.analyticsCache.set(cacheKey, {
				data: result,
				timestamp: new Date(),
			});

			return result;
		} catch (error) {
			console.error("Error getting user interaction analytics:", error);
			throw error;
		}
	}

	/**
	 * Get company analytics
	 */
	async getCompanyAnalytics(
		user: AuthenticatedUser,
		filters: AnalyticsFilters = {},
	): Promise<CompanyAnalytics> {
		const cacheKey = `company_analytics:${user.experienceId}:${JSON.stringify(filters)}`;

		// Check cache first
		const cached = this.analyticsCache.get(cacheKey);
		if (
			cached &&
			Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION
		) {
			return cached.data;
		}

		try {
			// Build date filter
			const dateFilter = [];
			if (filters.startDate) {
				dateFilter.push(gte(funnelAnalytics.date, filters.startDate));
			}
			if (filters.endDate) {
				dateFilter.push(lte(funnelAnalytics.date, filters.endDate));
			}

			// Get total funnels
			const totalFunnels = await db
				.select({ count: count(funnels.id) })
				.from(funnels)
				.where(eq(funnels.experienceId, user.experienceId));

			// Get active funnels
			const activeFunnels = await db
				.select({ count: count(funnels.id) })
				.from(funnels)
				.where(
					and(
						eq(funnels.experienceId, user.experience.id),
						eq(funnels.isDeployed, true),
					),
				);

			// Get total users
			const totalUsers = await db
				.select({ count: count(users.id) })
				.from(users)
				.where(eq(users.experienceId, user.experienceId));

			// Get total conversations
			const totalConversations = await db
				.select({ count: count(conversations.id) })
				.from(conversations)
				.where(eq(conversations.experienceId, user.experienceId));

			// Get aggregated metrics
			const metrics = await db
				.select({
					totalRevenue: sum(funnelAnalytics.revenue),
					totalConversions: sum(funnelAnalytics.conversions),
					totalStarts: sum(funnelAnalytics.starts),
				})
				.from(funnelAnalytics)
				.innerJoin(funnels, eq(funnelAnalytics.funnelId, funnels.id))
				.where(and(eq(funnels.experienceId, user.experienceId), ...dateFilter));

			const totals = metrics[0] || {
				totalRevenue: 0,
				totalConversions: 0,
				totalStarts: 0,
			};

			const averageConversionRate =
				totals.totalStarts > 0
					? (totals.totalConversions / totals.totalStarts) * 100
					: 0;

			// Get top performing funnels
			const topFunnels = await db
				.select({
					funnelId: funnels.id,
					funnelName: funnels.name,
					conversions: sum(funnelAnalytics.conversions),
					revenue: sum(funnelAnalytics.revenue),
					starts: sum(funnelAnalytics.starts),
				})
				.from(funnelAnalytics)
				.innerJoin(funnels, eq(funnelAnalytics.funnelId, funnels.id))
				.where(and(eq(funnels.experienceId, user.experienceId), ...dateFilter))
				.groupBy(funnels.id, funnels.name)
				.orderBy(desc(sum(funnelAnalytics.conversions)))
				.limit(10);

			const topPerformingFunnels = topFunnels.map((funnel: any) => ({
				funnelId: funnel.funnelId,
				funnelName: funnel.funnelName,
				conversions: Number(funnel.conversions) || 0,
				revenue: Number(funnel.revenue) || 0,
				conversionRate:
					funnel.starts > 0
						? (Number(funnel.conversions) / Number(funnel.starts)) * 100
						: 0,
			}));

			// Get user engagement (simplified - would need more complex queries for real DAU/WAU/MAU)
			const userEngagement = {
				dailyActiveUsers: 0, // Would need more complex tracking
				weeklyActiveUsers: 0,
				monthlyActiveUsers: 0,
			};

			const result: CompanyAnalytics = {
				experienceId: user.experienceId,
				totalFunnels: totalFunnels[0]?.count || 0,
				activeFunnels: activeFunnels[0]?.count || 0,
				totalUsers: totalUsers[0]?.count || 0,
				totalConversations: totalConversations[0]?.count || 0,
				totalRevenue: Number(totals.totalRevenue) || 0,
				averageConversionRate,
				topPerformingFunnels,
				userEngagement,
			};

			// Cache the result
			this.analyticsCache.set(cacheKey, {
				data: result,
				timestamp: new Date(),
			});

			return result;
		} catch (error) {
			console.error("Error getting company analytics:", error);
			throw error;
		}
	}

	/**
	 * Update funnel analytics
	 */
	private async updateFunnelAnalytics(
		funnelId: string,
		updates: {
			views?: number;
			starts?: number;
			completions?: number;
			conversions?: number;
			revenue?: number;
		},
	): Promise<void> {
		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			// Check if analytics record exists for today
			const existing = await db.query.funnelAnalytics.findFirst({
				where: and(
					eq(funnelAnalytics.funnelId, funnelId),
					eq(funnelAnalytics.date, today),
				),
			});

			if (existing) {
				// Update existing record
				const updateData: any = {};
				if (updates.views) updateData.views = existing.views + updates.views;
				if (updates.starts)
					updateData.starts = existing.starts + updates.starts;
				if (updates.completions)
					updateData.completions = existing.completions + updates.completions;
				if (updates.conversions)
					updateData.conversions = existing.conversions + updates.conversions;
				if (updates.revenue)
					updateData.revenue = Number(existing.revenue) + updates.revenue;

				await db
					.update(funnelAnalytics)
					.set(updateData)
					.where(eq(funnelAnalytics.id, existing.id));
			} else {
				// Create new record
				await db.insert(funnelAnalytics).values({
					funnelId,
					experienceId:
						(
							await db.query.funnels.findFirst({
								where: eq(funnels.id, funnelId),
							})
						)?.experienceId || "",
					date: today,
					views: updates.views || 0,
					starts: updates.starts || 0,
					completions: updates.completions || 0,
					conversions: updates.conversions || 0,
					revenue: updates.revenue || 0,
				});
			}

			// Clear related cache entries
			this.clearCacheForFunnel(funnelId);
		} catch (error) {
			console.error("Error updating funnel analytics:", error);
		}
	}

	/**
	 * Clear cache for a specific funnel
	 */
	private clearCacheForFunnel(funnelId: string): void {
		const keysToDelete: string[] = [];
		for (const [key] of this.analyticsCache.entries()) {
			if (key.includes(funnelId)) {
				keysToDelete.push(key);
			}
		}
		keysToDelete.forEach((key) => this.analyticsCache.delete(key));
	}

	/**
	 * Clear all analytics cache
	 */
	clearCache(): void {
		this.analyticsCache.clear();
	}
}

// Export singleton instance
export const analyticsSystem = new AnalyticsSystem();

// Export types
// Types are already exported above
