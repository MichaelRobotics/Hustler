"use client";

import React from "react";

const colors = {
	bg: "from-pink-50/70 via-pink-100/50 to-rose-50/40 dark:from-violet-900/80 dark:via-violet-800/60 dark:to-indigo-900/30",
	border: "border-pink-200/40 dark:border-violet-700/30",
	hoverShadow: "hover:shadow-pink-500/10 dark:hover:shadow-violet-500/10",
};

interface SpinToWinCardProps {
	children?: React.ReactNode;
}

export const SpinToWinCard: React.FC<SpinToWinCardProps> = ({ children }) => {
	return (
		<div
			className={`group relative bg-gradient-to-br ${colors.bg} p-6 rounded-xl border ${colors.border} ${colors.hoverShadow} transition-all duration-300 flex flex-col gap-3`}
		>
			{children}
		</div>
	);
};
