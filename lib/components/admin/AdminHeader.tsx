"use client";

import { Button, Heading } from "frosted-ui";
import { Plus } from "lucide-react";
import React, { useState } from "react";
import { ThemeToggle } from "../common/ThemeToggle";
import { SubscriptionBadge } from "../common/SubscriptionBadge";
import { CreditPackModal } from "../payments/CreditPackModal";
import type { AuthenticatedUser } from "../../types/user";

interface AdminHeaderProps {
	onAddFunnel: () => void;
	funnelCount: number;
	maxFunnels: number;
	subscription?: "Basic" | "Pro" | "Vip" | null;
	experienceId?: string;
	user?: AuthenticatedUser | null;
	onPurchaseSuccess?: (purchaseData: {
		type: 'subscription' | 'credits' | 'messages';
		subscription?: 'Basic' | 'Pro' | 'Vip';
		credits?: number;
		messages?: number;
	}) => void;
	dashboardViewMode?: "cards" | "graph";
	onDashboardViewModeChange?: (mode: "cards" | "graph") => void;
}

export default function AdminHeader({ onAddFunnel, funnelCount, maxFunnels, subscription, experienceId, user, onPurchaseSuccess, dashboardViewMode, onDashboardViewModeChange }: AdminHeaderProps) {
	const isAtLimit = funnelCount >= maxFunnels;
	const [showCreditModal, setShowCreditModal] = useState(false);
	
	// Log when onPurchaseSuccess prop changes
	React.useEffect(() => {
		console.log("🔄 [AdminHeader] onPurchaseSuccess prop:", onPurchaseSuccess ? "defined" : "undefined", typeof onPurchaseSuccess);
		if (!onPurchaseSuccess) {
			console.warn("⚠️ [AdminHeader] onPurchaseSuccess is undefined! This will prevent state updates after payment.");
			console.warn("⚠️ [AdminHeader] This means AdminPanel did not pass handlePurchaseSuccess to AdminHeader.");
		} else {
			console.log("✅ [AdminHeader] onPurchaseSuccess is defined, will pass to CreditPackModal");
		}
	}, [onPurchaseSuccess]);
	
	// Log when modal opens
	React.useEffect(() => {
		if (showCreditModal) {
			console.log("🔄 [AdminHeader] CreditPackModal opened, onPurchaseSuccess:", onPurchaseSuccess ? "defined" : "undefined");
		}
	}, [showCreditModal, onPurchaseSuccess]);
	
	// Log re-renders when subscription or user state changes (after payment)
	React.useEffect(() => {
		console.log("🔄 [AdminHeader] Re-rendered with updated props:", {
			subscription,
			userSubscription: user?.subscription,
			credits: user?.credits,
			messages: user?.messages,
			onPurchaseSuccess: onPurchaseSuccess ? "defined" : "undefined",
		});
		console.log("🔄 [AdminHeader] SubscriptionBadge will show:", subscription ?? "Basic");
	}, [subscription, user?.subscription, user?.credits, user?.messages, onPurchaseSuccess]);
	
	return (
		<div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
			<div className="flex items-center justify-between mb-6">
				<div>
					<Heading
						size="6"
						weight="bold"
						className="text-black dark:text-white"
					>
						My Merchants
					</Heading>
				</div>
				<SubscriptionBadge 
					subscription={subscription ?? "Basic"} 
					onClick={() => setShowCreditModal(true)}
				/>
			</div>

			<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />

			<div className="flex justify-between items-center gap-2 sm:gap-3">
				<div className="flex-shrink-0 flex items-center gap-2">
					{dashboardViewMode !== undefined && onDashboardViewModeChange && (
						<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
							{dashboardViewMode === "cards" ? (
								<Button size="2" color="gray" variant="soft" onClick={() => onDashboardViewModeChange("graph")}>
									Graph
								</Button>
							) : (
								<Button size="2" color="gray" variant="soft" onClick={() => onDashboardViewModeChange("cards")}>
									Cards
								</Button>
							)}
						</div>
					)}
					<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
						<ThemeToggle />
					</div>
				</div>

				<div className="flex-shrink-0">
					{isAtLimit ? (
						<div className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
							<span className="text-gray-500 dark:text-gray-400 font-medium">
								Funnel Limit: {funnelCount}/{maxFunnels}
							</span>
							<span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
								MAX
							</span>
						</div>
					) : (
						<Button
							size="3"
							color="violet"
							onClick={onAddFunnel}
							className="px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
						>
							<Plus
								size={20}
								strokeWidth={2.5}
								className="group-hover:rotate-12 transition-transform duration-300"
							/>
							<span className="ml-1">Create Merchant</span>
						</Button>
					)}
				</div>
			</div>

			{/* Credit Pack Modal */}
			<CreditPackModal
				isOpen={showCreditModal}
				onClose={() => setShowCreditModal(false)}
				subscription={subscription ?? "Basic"}
				initialTab="subscriptions"
				experienceId={experienceId}
				user={user}
				onPurchaseSuccess={onPurchaseSuccess}
			/>
		</div>
	);
}
