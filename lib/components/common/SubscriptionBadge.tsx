"use client";

import React from "react";
import { Ticket, Star, Crown } from "lucide-react";

interface SubscriptionBadgeProps {
	subscription?: "Basic" | "Pro" | "Vip" | null;
	onClick?: () => void;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
	subscription,
	onClick,
}) => {
	// Default to "Basic" if subscription is null or undefined
	const subscriptionType = subscription ?? "Basic";

	// Determine icon, text, and colors based on subscription type
	const getSubscriptionConfig = () => {
		switch (subscriptionType) {
			case "Pro":
				return {
					icon: <Star size={18} strokeWidth={2.5} />,
					text: "Pro",
					className:
						"bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 dark:border-yellow-500/40 hover:bg-yellow-500/20 dark:hover:bg-yellow-500/30",
				};
			case "Vip":
				return {
					icon: <Crown size={18} strokeWidth={2.5} />,
					text: "VIP",
					className:
						"bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/40 hover:bg-purple-500/20 dark:hover:bg-purple-500/30",
				};
			case "Basic":
			default:
				return {
					icon: <Ticket size={18} strokeWidth={2.5} />,
					text: "Basic",
					className:
						"bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/40 hover:bg-blue-500/20 dark:hover:bg-blue-500/30",
				};
		}
	};

	const config = getSubscriptionConfig();

	return (
		<div
			onClick={onClick}
			className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm backdrop-blur-sm transition-all duration-200 ${config.className} ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
		>
			{config.icon}
			<span className="font-semibold text-sm">{config.text}</span>
		</div>
	);
};

