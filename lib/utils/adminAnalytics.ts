// Admin Analytics Utility Functions
// These functions prepare data for backend integration while maintaining mock data support

export interface ProductSale {
	name: string;
	sales: number;
	revenue: number;
	type: string;
}

export interface SalesTotal {
	sales: number;
	revenue: number;
}

export interface SalesStats {
	affiliate: ProductSale[];
	myProducts: ProductSale[];
	affiliateTotal: SalesTotal;
	myProductsTotal: SalesTotal;
}

export interface FunnelStats {
	total: number;
	qualifiedUsers: number;
	converted: number;
	// New analytics fields
	totalStarts: number;
	totalInterest: number;
	totalIntent: number;
	totalConversions: number;
	totalProductRevenue: number;
	totalAffiliateRevenue: number;
	todayStarts: number;
	todayInterest: number;
	todayIntent: number;
	todayConversions: number;
	todayProductRevenue: number;
	todayAffiliateRevenue: number;
	startsGrowthPercent: number;
	intentGrowthPercent: number;
	conversionsGrowthPercent: number;
	interestGrowthPercent: number;
}

export interface User {
	id: string;
	funnelId: string;
	isQualified: boolean;
	stepCompleted: number;
}

export interface SalesData {
	funnelId: string;
	name: string;
	price: number;
	type: string;
}

export interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	delay?: number;
	resources?: any[];
	flow?: any;
}

// Data processing functions for backend integration
export const processFunnelStats = (
	users: User[],
	funnelId: string,
): FunnelStats => {
	console.log("processFunnelStats called with:", {
		usersCount: users.length,
		funnelId,
	});

	const funnelUsers = users.filter((u) => u.funnelId === funnelId);
	console.log("Filtered funnel users:", {
		funnelUsersCount: funnelUsers.length,
		sampleUser: funnelUsers[0],
	});

	const result = {
		total: funnelUsers.length,
		qualifiedUsers: funnelUsers.filter((u) => u.isQualified).length,
		converted: funnelUsers.filter((u) => u.stepCompleted === 6).length,
		// Add default values for new fields
		totalStarts: funnelUsers.length,
		totalInterest: funnelUsers.filter((u) => u.isQualified).length,
		totalIntent: funnelUsers.filter((u) => u.stepCompleted >= 3).length,
		totalConversions: funnelUsers.filter((u) => u.stepCompleted === 6).length,
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

	console.log("Funnel stats result:", result);
	return result;
};

export const processSalesStats = (
	salesData: SalesData[],
	funnelId: string,
): SalesStats => {
	console.log("processSalesStats called with:", {
		salesDataCount: salesData.length,
		funnelId,
	});

	const funnelSales = salesData.filter((s) => s.funnelId === funnelId);
	console.log("Filtered funnel sales:", {
		funnelSalesCount: funnelSales.length,
		sampleSale: funnelSales[0],
	});

	const productSummary = funnelSales.reduce(
		(acc: Record<string, ProductSale>, sale) => {
			if (!acc[sale.name]) {
				acc[sale.name] = {
					name: sale.name,
					sales: 0,
					revenue: 0,
					type: sale.type,
				};
			}
			acc[sale.name].sales += 1;
			acc[sale.name].revenue += sale.price;
			return acc;
		},
		{},
	);

	const allProducts = Object.values(productSummary);
	const affiliateProducts = allProducts.filter((p) => p.type === "AFFILIATE");
	const myProducts = allProducts.filter((p) => p.type === "MY_PRODUCTS");

	const affiliateTotal = affiliateProducts.reduce(
		(acc, p) => ({
			sales: acc.sales + p.sales,
			revenue: acc.revenue + p.revenue,
		}),
		{ sales: 0, revenue: 0 },
	);

	const myProductsTotal = myProducts.reduce(
		(acc, p) => ({
			sales: acc.sales + p.sales,
			revenue: acc.revenue + p.revenue,
		}),
		{ sales: 0, revenue: 0 },
	);

	const result = {
		affiliate: affiliateProducts.sort((a, b) => b.revenue - a.revenue),
		myProducts: myProducts.sort((a, b) => b.revenue - a.revenue),
		affiliateTotal,
		myProductsTotal,
	};

	console.log("Sales stats result:", result);
	return result;
};

// Mock data generators removed - now using real data from API

// Backend integration helpers
export const fetchFunnelStats = async (
	funnelId: string,
	experienceId?: string,
): Promise<FunnelStats> => {
	try {
		// Call our real analytics API
		const url = new URL('/api/analytics/tracking-links', window.location.origin);
		url.searchParams.set('funnelId', funnelId);
		if (experienceId) {
			url.searchParams.set('experienceId', experienceId);
		}
		const response = await fetch(url.toString());
		
		if (!response.ok) {
			throw new Error(`Failed to fetch analytics: ${response.statusText}`);
		}
		
		const data = await response.json();
		
		if (!data.success || !data.data.funnelAnalytics || data.data.funnelAnalytics.length === 0) {
			// Return zero data if no analytics found
			return {
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
		}
		
		// Get the first funnel analytics record
		const funnelData = data.data.funnelAnalytics[0];
		
		// Map the real data to our interface
		return {
			total: funnelData.totalStarts || 0,
			qualifiedUsers: funnelData.totalInterest || 0,
			converted: funnelData.totalConversions || 0,
			totalStarts: funnelData.totalStarts || 0,
			totalInterest: funnelData.totalInterest || 0,
			totalIntent: funnelData.totalIntent || 0,
			totalConversions: funnelData.totalConversions || 0,
			totalProductRevenue: parseFloat(funnelData.totalProductRevenue || '0'),
			totalAffiliateRevenue: parseFloat(funnelData.totalAffiliateRevenue || '0'),
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
	} catch (error) {
		console.error('Error fetching funnel stats:', error);
		// Return zero data on error
		return {
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
	}
};

export const fetchSalesStats = async (
	funnelId: string,
): Promise<SalesStats> => {
	// Return empty sales data (no mock data)
	// This will show $0.00 totals and no individual product cards
	return {
		affiliate: [],
		myProducts: [],
		affiliateTotal: { sales: 0, revenue: 0.0 },
		myProductsTotal: { sales: 0, revenue: 0.0 },
	};
};

export const fetchFunnelUsers = async (funnelId: string): Promise<User[]> => {
	// TODO: Replace with actual API call
	// const response = await fetch(`/api/funnels/${funnelId}/users`);
	// return response.json();

	// For now, return mock data
	return [];
};

export const fetchFunnelSales = async (
	funnelId: string,
): Promise<SalesData[]> => {
	// TODO: Replace with actual API call
	// const response = await fetch(`/api/funnels/${funnelId}/sales-data`);
	// return response.json();

	// For now, return mock data
	return [];
};
