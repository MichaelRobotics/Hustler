"use client";

import React from "react";
import { Text, Button } from "frosted-ui";
import { Banknote, Settings } from "lucide-react";

interface CashbackStatCardProps {
	value: string | number;
	subtitle?: string;
	onSettingsClick?: () => void;
}

const colors = {
	bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-blue-900/80 dark:via-blue-800/60 dark:to-indigo-900/30",
	border: "border-pink-200/40 dark:border-blue-700/30",
	iconColor: "text-pink-500 dark:text-blue-400",
	hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-blue-500/10",
};

export const CashbackStatCard: React.FC<CashbackStatCardProps> = ({
	value,
	subtitle,
	onSettingsClick,
}) => {
	const displayValue = typeof value === "number" ? `+ $${value.toFixed(2)}/mo` : value;
	return (
		<div
			className={`group relative bg-gradient-to-br ${colors.bg} p-6 rounded-xl border ${colors.border} ${colors.hoverShadow} transition-all duration-300`}
		>
			<Button
				size="1"
				variant="ghost"
				color="gray"
				className="absolute top-3 right-3 p-2 shrink-0"
				onClick={onSettingsClick}
				aria-label="Settings"
			>
				<Settings size={18} strokeWidth={2.5} />
			</Button>
			<div className="flex items-center gap-2 mb-2 pr-8">
				<Banknote className={`h-5 w-5 shrink-0 ${colors.iconColor}`} strokeWidth={2.5} />
				<Text size="2" color="gray" className="text-muted-foreground">
					Cashback MRR
				</Text>
			</div>
			<Text size="8" weight="bold" className="text-black dark:text-white">
				{displayValue}
			</Text>
			{subtitle && (
				<Text size="1" className="text-muted-foreground mt-1">
					{subtitle}
				</Text>
			)}
		</div>
	);
};
