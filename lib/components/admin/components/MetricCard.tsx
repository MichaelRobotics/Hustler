import { Text } from "frosted-ui";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type React from "react";

interface MetricCardProps {
	icon: React.ReactNode;
	title: string;
	value: string | number;
	change: string;
	trend: "up" | "down";
	colorScheme: "pink" | "blue" | "green" | "orange" | "slate";
}

const MetricCard: React.FC<MetricCardProps> = ({
	icon,
	title,
	value,
	change,
	trend,
	colorScheme,
}) => {
	const getColorClasses = (scheme: string) => {
		const colors = {
			pink: {
				bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-blue-900/80 dark:via-blue-800/60 dark:to-indigo-900/30",
				border: "border-pink-200/40 dark:border-blue-700/30",
				iconBg: "bg-pink-100/60 dark:bg-blue-800/50",
				iconColor: "text-pink-500 dark:text-blue-400",
				hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-blue-500/10",
			},
			blue: {
				bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-blue-900/80 dark:via-blue-800/60 dark:to-indigo-900/30",
				border: "border-pink-200/40 dark:border-blue-700/30",
				iconBg: "bg-pink-100/60 dark:bg-blue-800/50",
				iconColor: "text-pink-500 dark:text-blue-400",
				hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-blue-500/10",
			},
			green: {
				bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-green-900/80 dark:via-green-800/60 dark:to-emerald-900/30",
				border: "border-pink-200/40 dark:border-green-700/30",
				iconBg: "bg-pink-100/60 dark:bg-green-800/50",
				iconColor: "text-pink-500 dark:text-green-400",
				hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-green-500/10",
			},
			orange: {
				bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-orange-900/60 dark:via-orange-800/50 dark:to-amber-900/40",
				border: "border-pink-200/40 dark:border-orange-700/40",
				iconBg: "bg-pink-100/60 dark:bg-orange-800/60",
				iconColor: "text-pink-500 dark:text-orange-300",
				hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-orange-500/10",
			},
			slate: {
				bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-slate-800/60 dark:via-slate-700/50 dark:to-gray-800/40",
				border: "border-pink-200/40 dark:border-slate-600/40",
				iconBg: "bg-pink-100/60 dark:bg-slate-700/60",
				iconColor: "text-pink-500 dark:text-slate-300",
				hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-slate-500/10",
			},
		};
		return colors[scheme as keyof typeof colors] || colors.pink;
	};

	const colors = getColorClasses(colorScheme);

	return (
		<div
			className={`group relative bg-gradient-to-br ${colors.bg} p-6 rounded-xl border ${colors.border} ${colors.hoverShadow} transition-all duration-300`}
		>
			<div className="flex items-center justify-between mb-4">
				<div className={`p-2 rounded-lg ${colors.iconBg}`}>
					<div className={`h-5 w-5 ${colors.iconColor}`}>{icon}</div>
				</div>
				<div
					className={`flex items-center gap-1 ${trend === "up" ? "text-green-600 dark:text-green-400" : "text-pink-500 dark:text-orange-300"}`}
				>
					{trend === "up" ? (
						<ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
					) : (
						<ArrowDownRight className="h-4 w-4" strokeWidth={2.5} />
					)}
					<Text size="1" weight="semi-bold">
						{change}
					</Text>
				</div>
			</div>
			<div className="mb-2">
				<Text size="8" weight="bold" className="text-black dark:text-white">
					{value}
				</Text>
			</div>
			<Text size="2" color="gray" className="text-muted-foreground">
				{title}
			</Text>
		</div>
	);
};

export default MetricCard;
