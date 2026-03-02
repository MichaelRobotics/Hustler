"use client";

import React from "react";
import { Text } from "frosted-ui";
import { Award } from "lucide-react";

interface LevelStatCardProps {
	levelName: string;
	progress: number; // 0-100
	cashSpent?: string; // e.g. "$1,234" - shown below the bar as "Amount of Cash spent"
}

const colors = {
	bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-green-900/80 dark:via-green-800/60 dark:to-emerald-900/30",
	border: "border-pink-200/40 dark:border-green-700/30",
	iconColor: "text-pink-500 dark:text-green-400",
	hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-green-500/10",
};

export const LevelStatCard: React.FC<LevelStatCardProps> = ({
	levelName,
	progress,
	cashSpent = "$0",
}) => {
	const clampedProgress = Math.min(100, Math.max(0, progress));
	return (
		<div
			className={`group relative bg-gradient-to-br ${colors.bg} p-6 rounded-xl border ${colors.border} ${colors.hoverShadow} transition-all duration-300`}
		>
			{/* Icon + level name on left, Spent $X on right */}
			<div className="flex items-center justify-between gap-2 mb-3">
				<div className="flex items-center gap-2">
					<Award className={`h-5 w-5 shrink-0 ${colors.iconColor}`} strokeWidth={2.5} />
					<Text size="6" weight="bold" className="text-black dark:text-white">
						{levelName}
					</Text>
				</div>
				<Text size="2" weight="medium" className="text-muted-foreground shrink-0">
					Spent {cashSpent}
				</Text>
			</div>
			{/* Level number on left, bar on right */}
			<div className="flex items-center gap-3">
				<Text size="4" weight="medium" className="text-black/80 dark:text-white/80 shrink-0">
					{clampedProgress}
				</Text>
				<div className="flex-1 min-w-0 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
					<div
						className="h-full rounded-full bg-green-500 dark:bg-green-600 transition-all duration-500"
						style={{ width: `${clampedProgress}%` }}
					/>
				</div>
			</div>
		</div>
	);
};
