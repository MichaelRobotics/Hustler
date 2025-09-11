"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import { Button, Heading, Text } from "frosted-ui";
import { Activity, ArrowLeft, Edit3, Settings } from "lucide-react";
import React, { useMemo, useCallback } from "react";
import { useProcessedAnalyticsData } from "../../hooks/useAnalyticsData";
import type { Funnel, SalesData, User } from "../../utils/adminAnalytics";
import { ThemeToggle } from "../common/ThemeToggle";
import UnifiedNavigation from "../common/UnifiedNavigation";
import FunnelAnalytics from "./FunnelAnalytics";
import SalesPerformance from "./SalesPerformance";

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
const FunnelAnalyticsPage: React.FC<FunnelAnalyticsPageProps> = React.memo(
	({
		funnel,
		allUsers,
		allSalesData,
		onBack,
		onGoToBuilder,
		onGlobalGeneration,
		isGenerating,
	}) => {
		// Use the custom hook to process analytics data
		const { funnelStats, salesStats } = useProcessedAnalyticsData(
			allUsers,
			allSalesData,
			funnel.id,
		);

		// Memoized computed values for better performance
		const funnelValidation = useMemo(
			() => ({
				isValid: hasValidFlow(funnel),
				isDeployed: funnel.isDeployed,
				wasEverDeployed: funnel.wasEverDeployed,
			}),
			[funnel],
		);

		// Memoized handlers
		const handleGoToBuilder = useCallback(() => {
			onGoToBuilder(funnel);
		}, [onGoToBuilder, funnel]);

		const handleGlobalGeneration = useCallback(async () => {
			await onGlobalGeneration();
		}, [onGlobalGeneration]);

		// Debug logging (only in development)
		if (process.env.NODE_ENV === "development") {
			console.log("FunnelAnalyticsPage Debug:", {
				funnelId: funnel.id,
				...funnelValidation,
				allUsersCount: allUsers.length,
				allSalesDataCount: allSalesData.length,
				funnelStats,
				salesStats,
			});
		}

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
									<Heading
										size="6"
										weight="bold"
										className="text-black dark:text-white"
									>
										Analytics
									</Heading>
								</div>
							</div>

							{/* Subtle Separator Line */}
							<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />

							{/* Bottom Section: Action Buttons - Always Horizontal Layout */}
							<div className="flex justify-between items-center gap-2 sm:gap-3">
								{/* Left Side: Theme Toggle */}
								<div className="flex-shrink-0">
									<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
										<ThemeToggle />
									</div>
								</div>

								{/* Right Side: Edit Button - Only show if funnel has valid flow */}
								{funnelValidation.isValid && (
									<div className="flex-shrink-0">
										<Button
											size="3"
											color="violet"
											onClick={handleGoToBuilder}
											className="px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
										>
											<Edit3
												size={20}
												strokeWidth={2.5}
												className="group-hover:rotate-12 transition-transform duration-300"
											/>
											<span className="ml-2">Edit</span>
										</Button>
									</div>
								)}

								{/* Show message if funnel has no valid flow */}
								{!hasValidFlow(funnel) && (
									<div className="flex-shrink-0">
										<div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg">
											<Text
												size="2"
												color="amber"
												className="text-amber-700 dark:text-amber-300"
											>
												Generate funnel first to edit
											</Text>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Live Performance Indicator */}
						<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-700/30 mb-6 w-fit mt-12">
							<Activity
								className="h-4 w-4 text-green-600 dark:text-green-400"
								strokeWidth={2.5}
							/>
							<Text
								size="2"
								weight="semi-bold"
								color="green"
								className="dark:text-green-300"
							>
								Live Performance
							</Text>
						</div>

						{/* Check if funnel was ever live - if never live, show no analytics message */}
						{!funnel.wasEverDeployed && (!funnelStats || !salesStats) ? (
							<div className="mb-8 p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border border-gray-200 dark:border-gray-700/30 rounded-xl text-center">
								<div className="mb-4">
									<Activity
										className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4"
										strokeWidth={1.5}
									/>
									<Heading
										size="5"
										weight="bold"
										className="text-gray-800 dark:text-gray-200 mb-2"
									>
										No Analytics Available
									</Heading>
									<Text
										size="3"
										color="gray"
										className="text-gray-700 dark:text-gray-300 mb-4"
									>
										This funnel has never been live, so there are no analytics
										to collect.
									</Text>
									<Text
										size="2"
										color="gray"
										className="text-gray-600 dark:text-gray-400"
									>
										Go to the Funnel Builder and click "Go Live" to start
										collecting data.
									</Text>
								</div>
							</div>
						) : (
							<>
								{/* Analytics Components - Show if funnel was ever live OR if we have mock data */}
								{funnelStats && <FunnelAnalytics stats={funnelStats} />}

								{/* Live Sales Indicator */}
								<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-white to-gray-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-gray-200/50 dark:border-blue-700/30 mb-6 w-fit">
									<Activity
										className="h-4 w-4 text-gray-600 dark:text-blue-400"
										strokeWidth={2.5}
									/>
									<Text
										size="2"
										weight="semi-bold"
										color="blue"
										className="dark:text-blue-300"
									>
										Live Sales
									</Text>
								</div>

								{salesStats && <SalesPerformance salesStats={salesStats} />}
							</>
						)}
					</div>
				</div>

				{/* Unified Navigation - Hidden on analytics page or when generating */}
				{!isGenerating && (
					<UnifiedNavigation
						onPreview={() => {}} // No preview in analytics
						onFunnelProducts={() => {}} // Already on analytics page
						onGeneration={handleGlobalGeneration}
						isGenerated={funnelValidation.isValid}
						isGenerating={isGenerating}
						user={null}
						showOnPage="analytics" // Hide on analytics page
					/>
				)}
			</div>
		);
	},
);

FunnelAnalyticsPage.displayName = "FunnelAnalyticsPage";

export default FunnelAnalyticsPage;
