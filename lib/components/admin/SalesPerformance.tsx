import { ExternalLink, Package } from "lucide-react";
import type React from "react";
import type { SalesStats } from "../../utils/adminAnalytics";
import SalesSection from "./components/SalesSection";

interface SalesPerformanceProps {
	salesStats: SalesStats;
	isRefreshing?: boolean;
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
const SalesPerformance: React.FC<SalesPerformanceProps> = ({ salesStats, isRefreshing = false }) => {
	return (
		<>
			{/* Sales Categories Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* My Product Sales Section */}
				<SalesSection
					title="My Digital Assets"
					subtitle="My digital assets sales"
					icon={<Package strokeWidth={2.5} />}
					products={salesStats.myProducts}
					total={salesStats.myProductsTotal}
					colorScheme="pink"
					isRefreshing={isRefreshing}
				/>

				{/* Affiliate Sales Section */}
				<SalesSection
					title="Affiliate Digital Assets"
					subtitle="Affiliate commissions on digital assets"
					icon={<ExternalLink strokeWidth={2.5} />}
					products={salesStats.affiliate}
					total={salesStats.affiliateTotal}
					colorScheme="slate"
					isRefreshing={isRefreshing}
				/>
			</div>
		</>
	);
};

export default SalesPerformance;
