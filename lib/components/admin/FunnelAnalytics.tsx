import React from 'react';

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
 * This component displays key performance indicators (KPIs) for a selected funnel.
 * It shows high-level statistics like total users, qualified leads, and conversion rate.
 *
 * @param {FunnelAnalyticsProps} props - The props passed to the component.
 * @param {FunnelStats} props.stats - An object containing the analytics data for the funnel.
 * @returns {JSX.Element} The rendered FunnelAnalytics component.
 */
const FunnelAnalytics: React.FC<FunnelAnalyticsProps> = ({ stats }) => {
    return (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 p-6 rounded-2xl shadow-lg mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-white text-center md:text-left">Funnel Analytics</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-400">Total Users in Funnel</h2>
                    <p className="text-3xl font-bold text-blue-400">{stats.total}</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-400">Total Qualified</h2>
                    <p className="text-3xl font-bold text-emerald-400">{stats.qualifiedUsers}</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-400">Conversion Rate</h2>
                    <p className="text-3xl font-bold text-violet-400">
                        {stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(2) : 0}%
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FunnelAnalytics;

