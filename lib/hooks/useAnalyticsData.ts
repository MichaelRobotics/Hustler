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
}

export const useAnalyticsData = ({
	funnel,
	enableBackend = false,
}: UseAnalyticsDataProps): UseAnalyticsDataReturn => {
	const [funnelStats, setFunnelStats] = useState<FunnelStats | null>(null);
	const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [salesData, setSalesData] = useState<SalesData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

	useEffect(() => {
		fetchData();
	}, [funnel.id, enableBackend]);

	return {
		funnelStats,
		salesStats,
		users,
		salesData,
		isLoading,
		error,
		refreshData,
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
