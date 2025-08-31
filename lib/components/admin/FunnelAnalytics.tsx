import React from 'react';
import { Heading, Text } from 'frosted-ui';
import { TrendingUp, Users, Target, BarChart3, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

// Type definitions
interface FunnelStats {
  total: number;
  qualifiedUsers: number;
  converted: number;
}

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
    const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : '0.0';
    const qualificationRate = stats.total > 0 ? ((stats.qualifiedUsers / stats.total) * 100).toFixed(1) : '0.0';
    const avgConversionRate = 2.5; // Industry average for comparison
    const isConversionAboveAvg = parseFloat(conversionRate) > avgConversionRate;
    
    // Mock trend data (in real app, this would come from historical data)
    const trendData = {
        users: { change: '+12.5%', trend: 'up' },
        conversions: { change: '+8.3%', trend: 'up' },
        conversionRate: { change: isConversionAboveAvg ? '+2.1%' : '-1.2%', trend: isConversionAboveAvg ? 'up' : 'down' }
    };

    return (
        <>


            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <div className="group relative bg-gradient-to-br from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-blue-900/80 dark:via-blue-800/60 dark:to-indigo-900/30 p-6 rounded-xl border border-pink-200/40 dark:border-blue-700/30 hover:shadow-lg hover:shadow-pink-500/10 dark:hover:shadow-blue-500/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-pink-100/60 dark:bg-blue-800/50">
                            <Users className="h-5 w-5 text-pink-500 dark:text-blue-400" strokeWidth={2.5} />
                        </div>
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                            <Text size="1" weight="semi-bold">{trendData.users.change}</Text>
                        </div>
                    </div>
                    <div className="mb-2">
                        <Text size="8" weight="bold" className="text-black dark:text-white">
                            {stats.total.toLocaleString()}
                        </Text>
                    </div>
                    <Text size="2" color="gray" className="text-muted-foreground">
                        Total Users
                    </Text>
                </div>

                {/* Qualified Users */}
                <div className="group relative bg-gradient-to-br from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-slate-800/60 dark:via-slate-700/50 dark:to-gray-800/40 p-6 rounded-xl border border-pink-200/40 dark:border-slate-600/40 hover:shadow-lg hover:shadow-pink-500/10 dark:hover:shadow-slate-500/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-pink-100/60 dark:bg-slate-700/60">
                            <Target className="h-5 w-5 text-pink-500 dark:text-slate-300" strokeWidth={2.5} />
                        </div>
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                            <Text size="1" weight="semi-bold">+5.2%</Text>
                        </div>
                    </div>
                    <div className="mb-2">
                        <Text size="8" weight="bold" className="text-black dark:text-white">
                            {stats.qualifiedUsers.toLocaleString()}
                        </Text>
                    </div>
                    <Text size="2" color="gray" className="text-muted-foreground">
                        Qualified Users
                    </Text>
                </div>

                {/* Click Rate */}
                <div className="group relative bg-gradient-to-br from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-green-900/80 dark:via-green-800/60 dark:to-emerald-900/30 p-6 rounded-xl border border-pink-200/40 dark:border-green-700/30 hover:shadow-lg hover:shadow-pink-500/10 dark:hover:shadow-green-500/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-pink-100/60 dark:bg-green-800/50">
                            <TrendingUp className="h-5 w-5 text-pink-500 dark:text-green-400" strokeWidth={2.5} />
                        </div>
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                            <Text size="1" weight="semi-bold">{trendData.conversions.change}</Text>
                        </div>
                    </div>
                    <div className="mb-2">
                        <Text size="8" weight="bold" className="text-black dark:text-white">
                            {stats.converted.toLocaleString()}
                        </Text>
                    </div>
                    <Text size="2" color="gray" className="text-muted-foreground">
                        Click Rate
                    </Text>
                </div>

                {/* Conversion Rate */}
                <div className="group relative bg-gradient-to-br from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-orange-900/60 dark:via-orange-800/50 dark:to-amber-900/40 p-6 rounded-xl border border-pink-200/40 dark:border-orange-700/40 hover:shadow-lg hover:shadow-pink-500/10 dark:hover:shadow-orange-500/10 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-lg bg-pink-100/60 dark:bg-orange-800/60">
                            <BarChart3 className="h-5 w-5 text-pink-500 dark:text-orange-300" strokeWidth={2.5} />
                        </div>
                        <div className={`flex items-center gap-1 ${trendData.conversionRate.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-pink-500 dark:text-orange-300'}`}>
                            {trendData.conversionRate.trend === 'up' ? (
                                <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
                            ) : (
                                <ArrowDownRight className="h-4 w-4" strokeWidth={2.5} />
                            )}
                            <Text size="1" weight="semi-bold">{trendData.conversionRate.change}</Text>
                        </div>
                    </div>
                    <div className="mb-2">
                        <Text size="8" weight="bold" className="text-black dark:text-white">
                            {conversionRate}%
                        </Text>
                    </div>
                    <Text size="2" color="gray" className="text-muted-foreground">
                        Conversion Rate
                    </Text>
                </div>
            </div>


        </>
    );
};

export default FunnelAnalytics;

