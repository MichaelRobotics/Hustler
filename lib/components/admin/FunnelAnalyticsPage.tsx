'use client';

import React from 'react';
import SalesPerformance from './SalesPerformance';
import FunnelAnalytics from './FunnelAnalytics';
import CollapsibleText from '../common/CollapsibleText';
import { ArrowLeft, Settings, Activity, Edit3 } from 'lucide-react';
import { Heading, Text, Button } from 'frosted-ui';
import { ThemeToggle } from '../common/ThemeToggle';
import UnifiedNavigation from '../common/UnifiedNavigation';

// Type definitions
interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  delay?: number;
  resources?: any[];
  flow?: any;
}

interface User {
  id: string;
  funnelId: string;
  isQualified: boolean;
  stepCompleted: number;
}

interface SalesData {
  funnelId: string;
  name: string;
  price: number;
  type: string;
}

interface Stats {
  total: number;
  qualifiedUsers: number;
  converted: number;
}

interface SalesStats {
  affiliate: any[];
  myProducts: any[];
  affiliateTotal: { sales: number; revenue: number };
  myProductsTotal: { sales: number; revenue: number };
}

interface FunnelAnalyticsPageProps {
  funnel: Funnel;
  allUsers: User[];
  allSalesData: SalesData[];
  onBack: () => void;
  onGoToBuilder: (funnel: Funnel) => void;
  onGlobalGeneration: () => Promise<void>;
  isGenerating: boolean;
}

/**
 * --- Funnel Analytics Page Component ---
 * This component displays detailed analytics for a specific funnel including
 * sales performance and funnel metrics, with navigation to the funnel builder.
 *
 * @param {FunnelAnalyticsPageProps} props - The props passed to the component.
 * @returns {JSX.Element} The rendered FunnelAnalyticsPage component.
 */
const FunnelAnalyticsPage: React.FC<FunnelAnalyticsPageProps> = ({
  funnel,
  allUsers,
  allSalesData,
  onBack,
  onGoToBuilder,
  onGlobalGeneration,
  isGenerating
}) => {
  // Calculate funnel-specific stats
  const funnelUsers = allUsers.filter(u => u.funnelId === funnel.id);
  const stats: Stats = {
    total: funnelUsers.length,
    qualifiedUsers: funnelUsers.filter(u => u.isQualified).length,
    converted: funnelUsers.filter(u => u.stepCompleted === 6).length,
  };

  // Calculate funnel-specific sales stats
  const funnelSales = allSalesData.filter(s => s.funnelId === funnel.id);
  const productSummary = funnelSales.reduce((acc: any, sale) => {
    if (!acc[sale.name]) {
      acc[sale.name] = { name: sale.name, sales: 0, revenue: 0, type: sale.type };
    }
    acc[sale.name].sales += 1;
    acc[sale.name].revenue += sale.price;
    return acc;
  }, {});

  const allProducts = Object.values(productSummary);
  const affiliateProducts = allProducts.filter((p: any) => p.type === 'AFFILIATE');
  const myProducts = allProducts.filter((p: any) => p.type === 'MY_PRODUCTS');
  const affiliateTotal = affiliateProducts.reduce((acc: { sales: number; revenue: number }, p: any) => ({ sales: acc.sales + p.sales, revenue: acc.revenue + p.revenue }), { sales: 0, revenue: 0 });
  const myProductsTotal = myProducts.reduce((acc: { sales: number; revenue: number }, p: any) => ({ sales: acc.sales + p.sales, revenue: acc.revenue + p.revenue }), { sales: 0, revenue: 0 });

  const salesStats: SalesStats = {
    affiliate: affiliateProducts.sort((a: any, b: any) => b.revenue - a.revenue),
    myProducts: myProducts.sort((a: any, b: any) => b.revenue - a.revenue),
    affiliateTotal,
    myProductsTotal
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Enhanced Background Pattern for Dark Mode */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.25)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
      
      <div className="relative p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Header with Whop Design Patterns - Always Visible */}
          <div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
            {/* Top Section: Back Button + Title */}
            <div className="flex items-center gap-4 mb-6">
              <Button
                size="2"
                variant="ghost"
                color="gray"
                onClick={onBack}
                className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </Button>
              
              <div>
                <Heading size="6" weight="bold" className="text-black dark:text-white">
                  Analytics
                </Heading>
              </div>
            </div>
            
            {/* Subtle Separator Line */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />
            
            {/* Bottom Section: Action Buttons - Always Horizontal Layout */}
            <div className="flex justify-between items-center gap-4">
              {/* Left Side: Theme Toggle */}
              <div className="flex-shrink-0">
                <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
                  <ThemeToggle />
                </div>
              </div>
              
              {/* Center: Empty space for balance */}
              <div className="flex-shrink-0">
                <div className="w-32 h-10"></div>
              </div>
              
              {/* Right Side: Edit Button */}
              <div className="flex-shrink-0">
                <Button
                  size="3"
                  color="violet"
                  onClick={() => onGoToBuilder(funnel)}
                  className="px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
                >
                  <Edit3 size={20} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
                  <span className="ml-2">Edit</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Live Performance Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/30 mb-6 w-fit mt-12">
              <Activity className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2.5} />
              <Text size="2" weight="semi-bold" color="green" className="dark:text-green-300">
                  Live Performance
              </Text>
          </div>

          {/* Analytics Components - Direct rendering without nesting */}
          <FunnelAnalytics stats={stats} />
          
          {/* Live Sales Indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-white to-gray-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-gray-200/50 dark:border-blue-700/30 mb-6 w-fit">
              <Activity className="h-4 w-4 text-gray-600 dark:text-blue-400" strokeWidth={2.5} />
              <Text size="2" weight="semi-bold" color="blue" className="dark:text-blue-300">
                  Live Sales
              </Text>
          </div>
          
          <SalesPerformance salesStats={salesStats} />
        </div>
      </div>

      {/* Unified Navigation - Hidden on analytics page */}
      <UnifiedNavigation
        onPreview={() => {}} // No preview in analytics
        onFunnelProducts={() => {}} // Already on analytics page
        onGeneration={onGlobalGeneration}
        isGenerated={!!funnel.flow}
        isGenerating={isGenerating}
        showOnPage="analytics" // Hide on analytics page
      />
    </div>
  );
};

export default FunnelAnalyticsPage;
