import { Heading, Text } from "frosted-ui";
import type React from "react";
import type { ProductSale, SalesTotal } from "../../../utils/adminAnalytics";
import CollapsibleText from "../../common/CollapsibleText";

interface SalesSectionProps {
	title: string;
	subtitle: string;
	icon: React.ReactNode;
	products: ProductSale[];
	total: SalesTotal;
	colorScheme: "pink" | "blue" | "green" | "slate";
	isRefreshing?: boolean;
}

const SalesSection: React.FC<SalesSectionProps> = ({
	title,
	subtitle,
	icon,
	products,
	total,
	colorScheme,
	isRefreshing = false,
}) => {
	const getColorClasses = (scheme: string) => {
		const colors = {
			pink: {
				bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-green-900/80 dark:via-green-800/60 dark:to-emerald-900/30",
				border: "border-pink-200/40 dark:border-green-700/30",
				iconBg: "bg-pink-100/60 dark:bg-green-800/50",
				iconColor: "text-pink-500 dark:text-green-400",
				cardBg:
					"from-pink-100/50 via-pink-200/40 to-rose-100/30 dark:from-green-800/50 dark:via-green-700/40 dark:to-emerald-800/30",
				cardBorder: "border-pink-300/50 dark:border-green-600/50",
				productBg:
					"from-white/60 via-white/40 to-pink-50/20 dark:from-gray-800/60 dark:via-gray-700/40 dark:to-green-900/20",
				productBorder: "border-pink-200/30 dark:border-green-600/30",
				dotColor: "bg-pink-500 dark:bg-green-400",
				hoverShadow: "hover:shadow-pink-500/10",
			},
			blue: {
				bg: "from-blue-50/70 via-blue-100/50 to-indigo-50/40 dark:from-blue-900/80 dark:via-blue-800/60 dark:to-indigo-900/30",
				border: "border-blue-200/40 dark:border-blue-700/30",
				iconBg: "bg-blue-100/60 dark:bg-blue-800/50",
				iconColor: "text-blue-500 dark:text-blue-400",
				cardBg:
					"from-blue-100/50 via-blue-200/40 to-indigo-100/30 dark:from-blue-800/50 dark:via-blue-700/40 dark:to-indigo-800/30",
				cardBorder: "border-blue-300/50 dark:border-blue-600/50",
				productBg:
					"from-white/60 via-white/40 to-blue-50/20 dark:from-gray-800/60 dark:via-gray-700/40 dark:to-blue-900/20",
				productBorder: "border-blue-200/30 dark:border-blue-600/30",
				dotColor: "bg-blue-500 dark:bg-blue-400",
				hoverShadow: "hover:shadow-blue-500/10",
			},
			green: {
				bg: "from-green-50/70 via-green-100/50 to-emerald-50/40 dark:from-green-900/80 dark:via-green-800/60 dark:to-emerald-900/30",
				border: "border-green-200/40 dark:border-green-700/30",
				iconBg: "bg-green-100/60 dark:bg-green-800/50",
				iconColor: "text-green-500 dark:text-green-400",
				cardBg:
					"from-green-100/50 via-green-200/40 to-emerald-100/30 dark:from-green-800/50 dark:via-green-700/40 dark:to-emerald-800/30",
				cardBorder: "border-green-300/50 dark:border-green-600/50",
				productBg:
					"from-white/60 via-white/40 to-green-50/20 dark:from-gray-800/60 dark:via-gray-700/40 dark:to-green-900/20",
				productBorder: "border-green-200/30 dark:border-green-600/30",
				dotColor: "bg-green-500 dark:bg-green-400",
				hoverShadow: "hover:shadow-green-500/10",
			},
			slate: {
				bg: "from-slate-50/70 via-slate-100/50 to-gray-50/40 dark:from-slate-800/60 dark:via-slate-700/50 dark:to-gray-800/40",
				border: "border-slate-200/40 dark:border-slate-600/40",
				iconBg: "bg-slate-100/60 dark:bg-slate-700/60",
				iconColor: "text-slate-500 dark:text-slate-300",
				cardBg:
					"from-slate-100/50 via-slate-200/40 to-gray-100/30 dark:from-slate-800/50 dark:via-slate-700/40 dark:to-gray-800/30",
				cardBorder: "border-slate-300/50 dark:border-slate-600/50",
				productBg:
					"from-white/60 via-white/40 to-slate-50/20 dark:from-gray-800/60 dark:via-gray-700/40 dark:to-slate-900/20",
				productBorder: "border-slate-200/30 dark:border-slate-600/30",
				dotColor: "bg-slate-500 dark:bg-slate-400",
				hoverShadow: "hover:shadow-slate-500/10",
			},
		};
		return colors[scheme as keyof typeof colors] || colors.pink;
	};

	const colors = getColorClasses(colorScheme);

	return (
		<div
			className={`bg-gradient-to-br ${colors.bg} p-6 rounded-xl border ${colors.border}`}
		>
			<div className="flex items-center gap-3 mb-6">
				<div className={`p-2 rounded-lg ${colors.iconBg}`}>
					<div className={`h-5 w-5 ${colors.iconColor}`}>{icon}</div>
				</div>
				<div>
					<Heading
						size="3"
						weight="semi-bold"
						className="text-black dark:text-white"
					>
						{title}
					</Heading>
					<Text size="1" color="gray" className="text-muted-foreground">
						{subtitle}
					</Text>
				</div>
			</div>

			{/* Total Revenue Card */}
			<div
				className={`bg-gradient-to-br ${colors.cardBg} p-6 rounded-lg mb-6 border-2 ${colors.cardBorder}`}
			>
				<div className="flex items-center justify-between">
					<div>
						<Text
							size="2"
							weight="bold"
							className="text-black dark:text-white block mb-3"
						>
							TOTAL REVENUE
						</Text>
						<Text size="1" color="gray" className="text-muted-foreground block">
							<span className="text-black dark:text-white">{total.sales}</span>{" "}
							sales
						</Text>
					</div>
					<div className="text-right">
						<div className="space-y-1">
							<Text
								size="6"
								weight="bold"
								color="green"
								className="dark:text-green-300"
							>
								${total.revenue.toFixed(2)}
							</Text>
						</div>
					</div>
				</div>
			</div>

			{/* Product List */}
			<div className="space-y-3">
				{products.length > 0 ? (
					products.map((product) => (
						<div
							key={product.name}
							className={`group bg-gradient-to-br ${colors.productBg} p-4 rounded-lg border ${colors.productBorder} ${colors.hoverShadow} transition-all duration-200`}
						>
							<div className="flex items-center justify-between">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<div className={`w-2 h-2 rounded-full ${colors.dotColor}`} />
										<CollapsibleText text={product.name} maxLength={25} />
									</div>
									<Text size="1" color="gray" className="text-muted-foreground">
										<span className="text-black dark:text-white">
											{product.sales}
										</span>{" "}
										sales
									</Text>
								</div>
								<div className="text-right">
									<div className="mb-1">
										<Text
											size="3"
											weight="semi-bold"
											color="green"
											className="dark:text-green-300"
										>
											${product.revenue.toFixed(2)}
										</Text>
									</div>
								</div>
							</div>
						</div>
					))
				) : (
					<div className={`bg-gradient-to-br ${colors.productBg} p-4 rounded-lg border ${colors.productBorder} text-center`}>
						<Text size="1" color="gray" className="text-muted-foreground">
							No products yet
						</Text>
					</div>
				)}
			</div>
		</div>
	);
};

export default SalesSection;
