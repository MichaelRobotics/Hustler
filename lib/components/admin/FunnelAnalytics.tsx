import { BarChart3, Target, TrendingUp, Users } from "lucide-react";
import type React from "react";
import type { FunnelStats } from "../../utils/adminAnalytics";
import MetricCard from "./components/MetricCard";

interface FunnelAnalyticsProps {
	stats: FunnelStats;
}

/**
 * --- Funnel Analytics Component ---
 * Modern analytics dashboard following Whop best practices with ROI metrics,
 * conversion rates, and performance indicators for funnel optimization.
 *
 * @param {FunnelAnalyticsProps} props - The props passed to the component.
 * @param {FunnelStats} props.stats - An object containing the analytics data for the funnel.
 * @returns {JSX.Element} The rendered FunnelAnalytics component.
 */
const FunnelAnalytics: React.FC<FunnelAnalyticsProps> = ({ stats }) => {
	// Calculate key metrics
	const conversionRate =
		stats.total > 0
			? ((stats.converted / stats.total) * 100).toFixed(1)
			: "0.0";
	const qualificationRate =
		stats.total > 0
			? ((stats.qualifiedUsers / stats.total) * 100).toFixed(1)
			: "0.0";
	const avgConversionRate = 2.5; // Industry average for comparison
	const isConversionAboveAvg =
		Number.parseFloat(conversionRate) > avgConversionRate;

	// Mock trend data (in real app, this would come from historical data)
	const trendData = {
		users: { change: "+12.5%", trend: "up" as const },
		conversions: { change: "+8.3%", trend: "up" as const },
		conversionRate: {
			change: isConversionAboveAvg ? "+2.1%" : "-1.2%",
			trend: isConversionAboveAvg ? ("up" as const) : ("down" as const),
		},
	};

	// Metric configuration for easy maintenance and backend integration
	const metrics = [
		{
			icon: <Users strokeWidth={2.5} />,
			title: "Total Users",
			value: stats.total.toLocaleString(),
			change: trendData.users.change,
			trend: trendData.users.trend,
			colorScheme: "blue" as const,
		},
		{
			icon: <Target strokeWidth={2.5} />,
			title: "Qualified Users",
			value: stats.qualifiedUsers.toLocaleString(),
			change: "+5.2%",
			trend: "up" as const,
			colorScheme: "slate" as const,
		},
		{
			icon: <TrendingUp strokeWidth={2.5} />,
			title: "Click Rate",
			value: stats.converted.toLocaleString(),
			change: trendData.conversions.change,
			trend: trendData.conversions.trend,
			colorScheme: "green" as const,
		},
		{
			icon: <BarChart3 strokeWidth={2.5} />,
			title: "Conversion Rate",
			value: `${conversionRate}%`,
			change: trendData.conversionRate.change,
			trend: trendData.conversionRate.trend,
			colorScheme: "orange" as const,
		},
	];

	return (
		<>
			{/* Primary Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
				{metrics.map((metric, index) => (
					<MetricCard
						key={index}
						icon={metric.icon}
						title={metric.title}
						value={metric.value}
						change={metric.change}
						trend={metric.trend}
						colorScheme={metric.colorScheme}
					/>
				))}
			</div>
		</>
	);
};

export default FunnelAnalytics;
