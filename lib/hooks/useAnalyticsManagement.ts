"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFunnelStats, fetchSalesStats, fetchFunnelUsers, fetchFunnelSales } from "../utils/adminAnalytics";
import type { FunnelStats, SalesStats, User, SalesData } from "../utils/adminAnalytics";

interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: any[];
	sends?: number;
	flow?: any;
	generationStatus?: "idle" | "generating" | "completed" | "failed";
	generationError?: string;
	lastGeneratedAt?: number;
}

interface AnalyticsData {
	funnelStats: FunnelStats;
	salesStats: SalesStats;
	users: User[];
	salesData: SalesData[];
	lastUpdated: number;
	isLoading: boolean;
	error: string | null;
}

export function useAnalyticsManagement(user?: { experienceId?: string } | null) {
	const [analyticsData, setAnalyticsData] = useState<Map<string, AnalyticsData>>(new Map());
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Get analytics data for a specific funnel
	const getAnalyticsData = useCallback((funnelId: string): AnalyticsData | null => {
		return analyticsData.get(funnelId) || null;
	}, [analyticsData]);

	// Fetch analytics data for a specific funnel
	const fetchAnalyticsData = useCallback(async (funnel: Funnel, experienceId?: string) => {
		if (!funnel.id) return;

		const funnelId = funnel.id;
		const expId = experienceId || user?.experienceId;

		// Set loading state for this funnel
		setAnalyticsData(prev => new Map(prev.set(funnelId, {
			funnelStats: {
				total: 0,
				qualifiedUsers: 0,
				converted: 0,
				totalStarts: 0,
				totalInterest: 0,
				totalIntent: 0,
				totalConversions: 0,
				totalProductRevenue: 0,
				totalAffiliateRevenue: 0,
				todayStarts: 0,
				todayInterest: 0,
				todayIntent: 0,
				todayConversions: 0,
				todayProductRevenue: 0,
				todayAffiliateRevenue: 0,
				startsGrowthPercent: 0,
				intentGrowthPercent: 0,
				conversionsGrowthPercent: 0,
				interestGrowthPercent: 0,
			},
			salesStats: {
				affiliate: [],
				myProducts: [],
				affiliateTotal: { sales: 0, revenue: 0 },
				myProductsTotal: { sales: 0, revenue: 0 },
			},
			users: [],
			salesData: [],
			lastUpdated: 0,
			isLoading: true,
			error: null,
		})));

		try {
			setError(null);
			console.log(`[useAnalyticsManagement] Fetching analytics for funnel ${funnelId}`);

			const [funnelStats, salesStats, users, salesData] = await Promise.all([
				fetchFunnelStats(funnelId, expId),
				fetchSalesStats(funnelId),
				fetchFunnelUsers(funnelId),
				fetchFunnelSales(funnelId),
			]);

			console.log(`[useAnalyticsManagement] Fetched analytics for funnel ${funnelId}:`, {
				funnelStats: { total: funnelStats.total, converted: funnelStats.converted },
				salesStats,
				usersCount: users.length,
				salesDataCount: salesData.length,
			});

			// Update analytics data for this funnel
			setAnalyticsData(prev => new Map(prev.set(funnelId, {
				funnelStats,
				salesStats,
				users,
				salesData,
				lastUpdated: Date.now(),
				isLoading: false,
				error: null,
			})));

		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to fetch analytics data";
			console.error(`[useAnalyticsManagement] Error fetching analytics for funnel ${funnelId}:`, err);
			
			setError(errorMessage);
			setAnalyticsData(prev => new Map(prev.set(funnelId, {
				funnelStats: {
					total: 0,
					qualifiedUsers: 0,
					converted: 0,
					totalStarts: 0,
					totalInterest: 0,
					totalIntent: 0,
					totalConversions: 0,
					totalProductRevenue: 0,
					totalAffiliateRevenue: 0,
					todayStarts: 0,
					todayInterest: 0,
					todayIntent: 0,
					todayConversions: 0,
					todayProductRevenue: 0,
					todayAffiliateRevenue: 0,
					startsGrowthPercent: 0,
					intentGrowthPercent: 0,
					conversionsGrowthPercent: 0,
					interestGrowthPercent: 0,
				},
				salesStats: {
					affiliate: [],
					myProducts: [],
					affiliateTotal: { sales: 0, revenue: 0 },
					myProductsTotal: { sales: 0, revenue: 0 },
				},
				users: [],
				salesData: [],
				lastUpdated: 0,
				isLoading: false,
				error: errorMessage,
			})));
		}
	}, [user?.experienceId]);

	// Update analytics data for a specific funnel (for live updates)
	const updateAnalyticsData = useCallback(async (funnel: Funnel, experienceId?: string) => {
		if (!funnel.id) return;

		const funnelId = funnel.id;
		const expId = experienceId || user?.experienceId;

		// Don't update if already refreshing
		if (isRefreshing) {
			console.log(`[useAnalyticsManagement] Skipping update for funnel ${funnelId} - already refreshing`);
			return;
		}

		setIsRefreshing(true);

		try {
			console.log(`[useAnalyticsManagement] Live updating analytics for funnel ${funnelId}`);

			const [funnelStats, salesStats, users, salesData] = await Promise.all([
				fetchFunnelStats(funnelId, expId),
				fetchSalesStats(funnelId),
				fetchFunnelUsers(funnelId),
				fetchFunnelSales(funnelId),
			]);

			console.log(`[useAnalyticsManagement] Live updated analytics for funnel ${funnelId}:`, {
				funnelStats: { total: funnelStats.total, converted: funnelStats.converted },
				salesStats,
				usersCount: users.length,
				salesDataCount: salesData.length,
			});

			// Update analytics data for this funnel
			setAnalyticsData(prev => new Map(prev.set(funnelId, {
				funnelStats,
				salesStats,
				users,
				salesData,
				lastUpdated: Date.now(),
				isLoading: false,
				error: null,
			})));

		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Failed to update analytics data";
			console.error(`[useAnalyticsManagement] Error updating analytics for funnel ${funnelId}:`, err);
			setError(errorMessage);
		} finally {
			setIsRefreshing(false);
		}
	}, [user?.experienceId, isRefreshing]);

	// Refresh analytics data for a specific funnel
	const refreshAnalyticsData = useCallback(async (funnel: Funnel, experienceId?: string) => {
		return fetchAnalyticsData(funnel, experienceId);
	}, [fetchAnalyticsData]);

	// Clear analytics data for a specific funnel
	const clearAnalyticsData = useCallback((funnelId: string) => {
		setAnalyticsData(prev => {
			const newMap = new Map(prev);
			newMap.delete(funnelId);
			return newMap;
		});
	}, []);

	// Clear all analytics data
	const clearAllAnalyticsData = useCallback(() => {
		setAnalyticsData(new Map());
	}, []);

	// Check if analytics data is stale (older than 5 minutes)
	const isAnalyticsDataStale = useCallback((funnelId: string, maxAge: number = 5 * 60 * 1000) => {
		const data = analyticsData.get(funnelId);
		if (!data) return true;
		return Date.now() - data.lastUpdated > maxAge;
	}, [analyticsData]);

	return {
		// State
		analyticsData,
		isRefreshing,
		error,

		// Actions
		getAnalyticsData,
		fetchAnalyticsData,
		updateAnalyticsData,
		refreshAnalyticsData,
		clearAnalyticsData,
		clearAllAnalyticsData,
		isAnalyticsDataStale,
	};
}