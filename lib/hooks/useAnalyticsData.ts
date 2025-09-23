"use client";

import { useEffect, useState, useCallback } from "react";
import {
	type Funnel,
	type FunnelStats,
	type SalesData,
	type SalesStats,
	type User,
} from "../utils/adminAnalytics";
import { useAnalyticsManagement } from "./useAnalyticsManagement";

interface UseAnalyticsDataProps {
	funnel: Funnel;
	enableBackend?: boolean;
	experienceId?: string;
	// Optional: Pass in existing analytics management to share state
	analyticsManagement?: {
		analyticsData: Map<string, any>;
		isRefreshing: boolean;
		error: string | null;
		getAnalyticsData: (funnelId: string) => any;
		fetchAnalyticsData: (funnel: Funnel, experienceId?: string) => Promise<void>;
		updateAnalyticsData: (funnel: Funnel, experienceId?: string) => Promise<void>;
		isAnalyticsDataStale: (funnelId: string, maxAge?: number) => boolean;
	};
}

interface UseAnalyticsDataReturn {
	funnelStats: FunnelStats | null;
	salesStats: SalesStats | null;
	users: User[];
	salesData: SalesData[];
	isLoading: boolean;
	error: string | null;
	refreshData: () => Promise<void>;
	isRefreshing: boolean;
}

export const useAnalyticsData = ({
	funnel,
	enableBackend = true,
	experienceId,
	analyticsManagement,
}: UseAnalyticsDataProps): UseAnalyticsDataReturn => {
	// Use passed-in analytics management or create new instance
	const localAnalyticsManagement = useAnalyticsManagement({ experienceId });
	const {
		analyticsData,
		isRefreshing: globalIsRefreshing,
		error: globalError,
		getAnalyticsData,
		fetchAnalyticsData,
		updateAnalyticsData,
		isAnalyticsDataStale,
	} = analyticsManagement || localAnalyticsManagement;

	// Get analytics data for this specific funnel
	const funnelAnalyticsData = getAnalyticsData(funnel.id);

	// Local state for component-specific loading
	const [isLocalLoading, setIsLocalLoading] = useState(false);

	// Initialize with zero values if no data exists
	const funnelStats = funnelAnalyticsData?.funnelStats || {
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
	};

	const salesStats = funnelAnalyticsData?.salesStats || {
		affiliate: [],
		myProducts: [],
		affiliateTotal: { sales: 0, revenue: 0 },
		myProductsTotal: { sales: 0, revenue: 0 },
	};

	const users = funnelAnalyticsData?.users || [];
	const salesData = funnelAnalyticsData?.salesData || [];
	const isLoading = funnelAnalyticsData?.isLoading || isLocalLoading || (!funnelAnalyticsData && enableBackend);
	const error = funnelAnalyticsData?.error || globalError;

	// Fetch data when component mounts or funnel changes - only once per funnel
	useEffect(() => {
		if (!funnel.id || !enableBackend) return;

		// Only fetch if we don't have any data for this funnel
		if (!funnelAnalyticsData) {
			console.log(`[useAnalyticsData] Initial fetch for funnel ${funnel.id}`);
			setIsLocalLoading(true);
			fetchAnalyticsData(funnel, experienceId).finally(() => {
				setIsLocalLoading(false);
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [funnel.id, enableBackend, experienceId]);

	// Live updates with proper throttling to prevent mass API calls
	useEffect(() => {
		if (!funnel.id || !enableBackend) return;

		console.log(`[useAnalyticsData] Setting up live updates for funnel ${funnel.id}`);

		// Set up live updates every 30 seconds
		const interval = setInterval(() => {
			console.log(`[useAnalyticsData] Live update check for funnel ${funnel.id} - isRefreshing: ${globalIsRefreshing}`);
			
			// Simple approach: update every 30 seconds if not already refreshing
			if (!globalIsRefreshing) {
				console.log(`[useAnalyticsData] Live updating analytics for funnel ${funnel.id}`);
				updateAnalyticsData(funnel, experienceId);
			} else {
				console.log(`[useAnalyticsData] Skipping live update for funnel ${funnel.id} - already refreshing`);
			}
		}, 30 * 1000); // 30 seconds

		return () => {
			console.log(`[useAnalyticsData] Cleaning up live updates for funnel ${funnel.id}`);
			clearInterval(interval);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [funnel.id, enableBackend, experienceId, globalIsRefreshing]);

	// Manual refresh function
	const refreshData = useCallback(async () => {
		if (!funnel.id || !enableBackend) return;
		
		console.log(`[useAnalyticsData] Manual refresh for funnel ${funnel.id}`);
		setIsLocalLoading(true);
		await fetchAnalyticsData(funnel, experienceId);
		setIsLocalLoading(false);
	}, [funnel.id, enableBackend, experienceId, fetchAnalyticsData]);

	return {
		funnelStats,
		salesStats,
		users,
		salesData,
		isLoading,
		error,
		refreshData,
		isRefreshing: globalIsRefreshing,
	};
};