import React from 'react';
import CollapsibleText from '../common/CollapsibleText';

// Type definitions
interface ProductSale {
  name: string;
  sales: number;
  revenue: number;
  type: string;
}

interface SalesTotal {
  sales: number;
  revenue: number;
}

interface SalesStats {
  affiliate: ProductSale[];
  myProducts: ProductSale[];
  affiliateTotal: SalesTotal;
  myProductsTotal: SalesTotal;
}

interface SalesPerformanceProps {
  salesStats: SalesStats;
}

/**
 * --- Sales Performance Component ---
 * This component displays a breakdown of sales data, separating affiliate sales from proprietary product sales.
 * It shows total revenue and sales counts for each category, as well as a list of individual product performance.
 *
 * @param {SalesPerformanceProps} props - The props passed to the component.
 * @param {SalesStats} props.salesStats - An object containing aggregated sales data.
 * @returns {JSX.Element} The rendered SalesPerformance component.
 */
const SalesPerformance: React.FC<SalesPerformanceProps> = ({ salesStats }) => {
    return (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 p-6 rounded-2xl shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Sales Performance</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Affiliate Sales Section */}
                <div>
                    <h3 className="text-lg font-semibold text-violet-400 mb-2">Affiliate Sales</h3>
                    <div className="bg-gray-900/50 p-4 rounded-md mb-4 border-t-2 border-violet-500/50 font-bold">
                        <span className="text-xl">TOTAL</span>
                        <div className="flex justify-between items-baseline">
                            <span className="text-3xl text-green-400">${salesStats.affiliateTotal.revenue.toFixed(2)}</span>
                            <span className="text-lg text-gray-400">{salesStats.affiliateTotal.sales} sales</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {salesStats.affiliate.map(p => (
                            <div key={p.name} className="bg-gray-900/50 p-2 rounded-md grid grid-cols-3 items-center text-sm">
                                <CollapsibleText text={p.name} maxLength={30} />
                                <span className="text-center text-gray-400">{p.sales} sales</span>
                                <span className="text-right font-semibold text-green-400">${p.revenue.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Product Sales Section */}
                <div>
                    <h3 className="text-lg font-semibold text-emerald-400 mb-2">My Product Sales</h3>
                     <div className="bg-gray-900/50 p-4 rounded-md mb-4 border-t-2 border-emerald-500/50 font-bold">
                        <span className="text-xl">TOTAL</span>
                        <div className="flex justify-between items-baseline">
                            <span className="text-3xl text-green-400">${salesStats.myProductsTotal.revenue.toFixed(2)}</span>
                            <span className="text-lg text-gray-400">{salesStats.myProductsTotal.sales} sales</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {salesStats.myProducts.map(p => (
                            <div key={p.name} className="bg-gray-900/50 p-2 rounded-md grid grid-cols-3 items-center text-sm">
                                <CollapsibleText text={p.name} maxLength={30} />
                                <span className="text-center text-gray-400">{p.sales} sales</span>
                                <span className="text-right font-semibold text-green-400">${p.revenue.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesPerformance;

