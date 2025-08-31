import React from 'react';
import CollapsibleText from '../common/CollapsibleText';
import { Heading, Text } from 'frosted-ui';
import { DollarSign, TrendingUp, Package, ExternalLink } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';

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
 * Modern sales analytics dashboard following Whop best practices with revenue tracking,
 * product performance, and affiliate metrics for comprehensive business insights.
 *
 * @param {SalesPerformanceProps} props - The props passed to the component.
 * @param {SalesStats} props.salesStats - An object containing aggregated sales data.
 * @returns {JSX.Element} The rendered SalesPerformance component.
 */
const SalesPerformance: React.FC<SalesPerformanceProps> = ({ salesStats }) => {
    // Calculate additional metrics
    const totalRevenue = salesStats.myProductsTotal.revenue + salesStats.affiliateTotal.revenue;
    const totalSales = salesStats.myProductsTotal.sales + salesStats.affiliateTotal.sales;
    const avgOrderValue = totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : '0.00';

    return (
        <>


            {/* Sales Categories Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* My Product Sales Section */}
                <div className="bg-gradient-to-br from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-green-900/80 dark:via-green-800/60 dark:to-emerald-900/30 p-6 rounded-xl border border-pink-200/40 dark:border-green-700/30">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-pink-100/60 dark:bg-green-800/50">
                            <Package className="h-5 w-5 text-pink-500 dark:text-green-400" strokeWidth={2.5} />
                        </div>
                        <div>
                            <Heading size="3" weight="semi-bold" className="text-black dark:text-white">
                                My Products
                            </Heading>
                            <Text size="1" color="gray" className="text-muted-foreground">
                                Direct product sales
                            </Text>
                        </div>
                    </div>

                    {/* Total Revenue Card */}
                    <div className="bg-gradient-to-br from-pink-100/50 via-pink-200/40 to-rose-100/30 dark:from-green-800/50 dark:via-green-700/40 dark:to-emerald-800/30 p-6 rounded-lg mb-6 border-2 border-pink-300/50 dark:border-green-600/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <Text size="2" weight="bold" className="text-black dark:text-white block mb-3">TOTAL REVENUE</Text>
                                <Text size="1" color="gray" className="text-muted-foreground block">
                                    <span className="text-black dark:text-white">{salesStats.myProductsTotal.sales}</span> sales
                                </Text>
                            </div>
                            <div className="text-right">
                                <div className="space-y-1">
                                                                    <Text size="6" weight="bold" color="green" className="dark:text-green-300">
                                    ${salesStats.myProductsTotal.revenue.toFixed(2)}
                                </Text>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="space-y-3">
                        {salesStats.myProducts.map((product, index) => (
                            <div key={product.name} className="group bg-gradient-to-br from-white/60 via-white/40 to-pink-50/20 dark:from-gray-800/60 dark:via-gray-700/40 dark:to-green-900/20 p-4 rounded-lg border border-pink-200/30 dark:border-green-600/30 hover:shadow-md hover:shadow-pink-500/10 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-pink-500 dark:bg-green-400" />
                                            <CollapsibleText text={product.name} maxLength={25} />
                                        </div>
                                        <Text size="1" color="gray" className="text-muted-foreground">
                                            <span className="text-black dark:text-white">{product.sales}</span> sales
                                        </Text>
                                    </div>
                                    <div className="text-right">
                                        <div className="mb-1">
                                            <Text size="3" weight="semi-bold" color="green" className="dark:text-green-300">
                                                ${product.revenue.toFixed(2)}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Affiliate Sales Section */}
                <div className="bg-gradient-to-br from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-slate-800/60 dark:via-slate-700/50 dark:to-gray-800/40 p-6 rounded-xl border border-pink-200/40 dark:border-slate-600/40">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-pink-100/60 dark:bg-slate-700/60">
                            <ExternalLink className="h-5 w-5 text-pink-500 dark:text-slate-300" strokeWidth={2.5} />
                        </div>
                        <div>
                            <Heading size="3" weight="semi-bold" className="text-black dark:text-white">
                                Affiliate Sales
                            </Heading>
                            <Text size="1" color="gray" className="text-muted-foreground">
                                Partner product commissions
                            </Text>
                        </div>
                    </div>

                    {/* Total Revenue Card */}
                    <div className="bg-gradient-to-br from-pink-100/50 via-pink-200/40 to-rose-100/30 dark:from-slate-800/50 dark:via-slate-700/40 dark:to-gray-800/30 p-6 rounded-lg mb-6 border-2 border-pink-300/50 dark:border-slate-600/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <Text size="2" weight="bold" className="text-black dark:text-white block mb-3">TOTAL REVENUE</Text>
                                <Text size="1" color="gray" className="text-muted-foreground block">
                                    <span className="text-black dark:text-white">{salesStats.affiliateTotal.sales}</span> sales
                                </Text>
                            </div>
                            <div className="text-right">
                                <div className="space-y-1">
                                                                    <Text size="6" weight="bold" color="green" className="dark:text-green-300">
                                    ${salesStats.affiliateTotal.revenue.toFixed(2)}
                                </Text>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product List */}
                    <div className="space-y-3">
                        {salesStats.affiliate.map((product, index) => (
                            <div key={product.name} className="group bg-gradient-to-br from-white/60 via-white/40 to-pink-50/20 dark:from-gray-800/60 dark:via-gray-700/40 dark:to-slate-900/20 p-4 rounded-lg border border-pink-200/30 dark:border-slate-600/30 hover:shadow-md hover:shadow-pink-500/10 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-pink-500 dark:bg-slate-400" />
                                            <CollapsibleText text={product.name} maxLength={25} />
                                        </div>
                                        <Text size="1" color="gray" className="text-muted-foreground">
                                            <span className="text-black dark:text-white">{product.sales}</span> sales
                                        </Text>
                                    </div>
                                    <div className="text-right">
                                        <div className="mb-1">
                                            <Text size="3" weight="semi-bold" color="green" className="dark:text-green-300">
                                                ${product.revenue.toFixed(2)}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SalesPerformance;

