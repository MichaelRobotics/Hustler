import { useEffect, useState } from "react";
import {
	type Funnel,
	type FunnelStats,
	type SalesData,
	type SalesStats,
	type User,
	fetchFunnelSales,
	fetchFunnelStats,
	fetchFunnelUsers,
	fetchSalesStats,
	processFunnelStats,
	processSalesStats,
} from "../utils/adminAnalytics";

interface UseAnalyticsDataProps {
	funnel: Funnel;
	enableBackend?: boolean; // Flag to switch between mock and backend data
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
	enableBackend = true, // Enable backend by default
}: UseAnalyticsDataProps): UseAnalyticsDataReturn => {
	const [funnelStats, setFunnelStats] = useState<FunnelStats | null>(null);
	const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [salesData, setSalesData] = useState<SalesData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);

	const fetchData = async () => {
		if (!funnel.id) return;

		setIsLoading(true);
		setError(null);

		try {
			if (enableBackend) {
				// Backend integration path
				const [stats, sales, userData, salesDataResult] = await Promise.all([
					fetchFunnelStats(funnel.id),
					fetchSalesStats(funnel.id),
					fetchFunnelUsers(funnel.id),
					fetchFunnelSales(funnel.id),
				]);

				setFunnelStats(stats);
				setSalesStats(sales);
				setUsers(userData);
				setSalesData(salesDataResult);
			} else {
				// Mock data path (current implementation)
				const [stats, sales, userData, salesDataResult] = await Promise.all([
					fetchFunnelStats(funnel.id),
					fetchSalesStats(funnel.id),
					fetchFunnelUsers(funnel.id),
					fetchFunnelSales(funnel.id),
				]);

				setFunnelStats(stats);
				setSalesStats(sales);
				setUsers(userData);
				setSalesData(salesDataResult);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to fetch analytics data",
			);
			console.error("Error fetching analytics data:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const refreshData = async () => {
		await fetchData();
	};

	// Live update function that only updates numbers without full re-render
	const updateLiveNumbers = async () => {
		if (!funnel.id || !enableBackend) return;
		
		setIsRefreshing(true);
		
		try {
			const response = await fetch(`/api/analytics/tracking-links?funnelId=${funnel.id}`);
			
			if (!response.ok) return;
			
			const data = await response.json();
			
			if (data.success && data.data.funnelAnalytics && data.data.funnelAnalytics.length > 0) {
				const funnelData = data.data.funnelAnalytics[0];
				
				// Only update the numbers, not the entire state
				setFunnelStats(prevStats => {
					if (!prevStats) return prevStats;
					
					return {
						...prevStats,
						// Update only the live numbers
						totalStarts: funnelData.totalStarts || 0,
						totalInterest: funnelData.totalInterest || 0,
						totalIntent: funnelData.totalIntent || 0,
						totalConversions: funnelData.totalConversions || 0,
						todayStarts: funnelData.todayStarts || 0,
						todayInterest: funnelData.todayInterest || 0,
						todayIntent: funnelData.todayIntent || 0,
						todayConversions: funnelData.todayConversions || 0,
						todayProductRevenue: parseFloat(funnelData.todayProductRevenue || '0'),
						todayAffiliateRevenue: parseFloat(funnelData.todayAffiliateRevenue || '0'),
						startsGrowthPercent: parseFloat(funnelData.startsGrowthPercent || '0'),
						intentGrowthPercent: parseFloat(funnelData.intentGrowthPercent || '0'),
						conversionsGrowthPercent: parseFloat(funnelData.conversionsGrowthPercent || '0'),
						interestGrowthPercent: parseFloat(funnelData.interestGrowthPercent || '0'),
					};
				});
			}
		} catch (error) {
			console.error('Error updating live numbers:', error);
		} finally {
			setIsRefreshing(false);
		}
	};

	useEffect(() => {
		fetchData();
		
		// Auto-refresh every 30 seconds for live updates - ONLY updates numbers
		const interval = setInterval(() => {
			updateLiveNumbers();
		}, 30000); // 30 seconds
		
		return () => clearInterval(interval);
	}, [funnel.id, enableBackend]);

	return {
		funnelStats,
		salesStats,
		users,
		salesData,
		isLoading,
		error,
		refreshData,
		isRefreshing,
	};
};

// Alternative hook for when you have existing data arrays (current implementation)
export const useProcessedAnalyticsData = (
	allUsers: User[],
	allSalesData: SalesData[],
	funnelId: string,
) => {
	console.log("useProcessedAnalyticsData called with:", {
		allUsersCount: allUsers.length,
		allSalesDataCount: allSalesData.length,
		funnelId,
		sampleUser: allUsers[0],
		sampleSale: allSalesData[0],
	});

	const funnelStats = processFunnelStats(allUsers, funnelId);
	const salesStats = processSalesStats(allSalesData, funnelId);

	console.log("Processed stats:", { funnelStats, salesStats });

	return {
		funnelStats,
		salesStats,
	};
};
