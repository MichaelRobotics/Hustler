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
	// Calculate key metrics using real data
	const conversionRate =
		stats.totalStarts > 0
			? ((stats.totalConversions / stats.totalStarts) * 100).toFixed(1)
			: "0.0";
	const interestRate =
		stats.totalStarts > 0
			? ((stats.totalInterest / stats.totalStarts) * 100).toFixed(1)
			: "0.0";
	const intentRate =
		stats.totalStarts > 0
			? ((stats.totalIntent / stats.totalStarts) * 100).toFixed(1)
			: "0.0";

	// Use real growth percentages from analytics
	const trendData = {
		awareness: { 
			change: stats.startsGrowthPercent >= 0 ? `+${stats.startsGrowthPercent.toFixed(1)}%` : `${stats.startsGrowthPercent.toFixed(1)}%`, 
			trend: stats.startsGrowthPercent >= 0 ? ("up" as const) : ("down" as const) 
		},
		interest: { 
			change: stats.interestGrowthPercent >= 0 ? `+${stats.interestGrowthPercent.toFixed(1)}%` : `${stats.interestGrowthPercent.toFixed(1)}%`, 
			trend: stats.interestGrowthPercent >= 0 ? ("up" as const) : ("down" as const) 
		},
		intent: { 
			change: stats.intentGrowthPercent >= 0 ? `+${stats.intentGrowthPercent.toFixed(1)}%` : `${stats.intentGrowthPercent.toFixed(1)}%`, 
			trend: stats.intentGrowthPercent >= 0 ? ("up" as const) : ("down" as const) 
		},
		conversion: {
			change: stats.conversionsGrowthPercent >= 0 ? `+${stats.conversionsGrowthPercent.toFixed(1)}%` : `${stats.conversionsGrowthPercent.toFixed(1)}%`,
			trend: stats.conversionsGrowthPercent >= 0 ? ("up" as const) : ("down" as const),
		},
	};

	// Metric configuration for easy maintenance and backend integration
	const metrics = [
		{
			icon: <Users strokeWidth={2.5} />,
			title: "Awareness",
			value: (stats.totalStarts || 0).toLocaleString(),
			change: trendData.awareness.change,
			trend: trendData.awareness.trend,
			colorScheme: "blue" as const,
		},
		{
			icon: <Target strokeWidth={2.5} />,
			title: "Interested",
			value: (stats.totalInterest || 0).toLocaleString(),
			change: trendData.interest.change,
			trend: trendData.interest.trend,
			colorScheme: "slate" as const,
		},
		{
			icon: <TrendingUp strokeWidth={2.5} />,
			title: "Intent",
			value: (stats.totalIntent || 0).toLocaleString(),
			change: trendData.intent.change,
			trend: trendData.intent.trend,
			colorScheme: "green" as const,
		},
		{
			icon: <BarChart3 strokeWidth={2.5} />,
			title: "Conversion Rate",
			value: `${conversionRate}%`,
			change: trendData.conversion.change,
			trend: trendData.conversion.trend,
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
