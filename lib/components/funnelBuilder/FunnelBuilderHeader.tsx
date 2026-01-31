"use client";

import { Button, Heading } from "frosted-ui";
import { ArrowLeft, Play, Settings } from "lucide-react";
import type React from "react";
import { ThemeToggle } from "../common/ThemeToggle";

interface FunnelBuilderHeaderProps {
	onBack: () => void;
	isDeployed: boolean;
	hasFlow: boolean;
	hasApiError: boolean;
	onOpenConfiguration: () => void;
	onOpenOfflineConfirmation: () => void;
	onDeploy: () => void;
	hasAnyLiveFunnel?: boolean;
	isPanelOpen?: boolean; // When true, header shrinks to make room for side panel
	showMerchantButton?: boolean; // When true, show "Merchant" button instead of "Configure"
	isDraft?: boolean; // Draft mode - prevents deployment when new cards don't have complete connections
}

export const FunnelBuilderHeader: React.FC<FunnelBuilderHeaderProps> = ({
	onBack,
	isDeployed,
	hasFlow,
	hasApiError,
	onOpenConfiguration,
	onOpenOfflineConfirmation,
	onDeploy,
	hasAnyLiveFunnel = false,
	isPanelOpen = false,
	showMerchantButton = false,
	isDraft = false,
}) => {
	return (
		<div 
			className="fixed top-0 left-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-3 px-4 sm:px-6 border-b border-border/30 dark:border-border/20 shadow-lg transition-all duration-300"
			style={{ right: isPanelOpen ? '400px' : '0' }}
		>
			{/* Top Section: Back Button + Title */}
			<div className="flex items-center gap-4 mb-4">
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
						Merchant Conversation Editor
					</Heading>
				</div>
			</div>

			{/* Subtle Separator Line */}
			<div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mb-4" />

			{/* Bottom Section: Action Buttons - Always Horizontal Layout */}
			<div className="flex justify-between items-center gap-2 sm:gap-3">
				{/* Left Side: Configure/Merchant Button */}
				<div className="flex-shrink-0 flex items-center gap-2">
					<Button
						size="3"
						variant="ghost"
						color="violet"
						onClick={onOpenConfiguration}
						className="px-4 sm:px-6 py-3 border transition-all duration-200 group border-violet-200 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
					>
						<Settings
							className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:rotate-90 transition-transform duration-300"
						/>
						<span className="font-semibold text-sm sm:text-base">
							{showMerchantButton ? "Merchant" : "Notifications"}
						</span>
					</Button>
				</div>

				{/* Center: Theme Toggle */}
				<div className="flex-shrink-0">
					<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
						<ThemeToggle />
					</div>
				</div>

				{/* Right Side: Go Live / Draft Button */}
				<div className="flex-shrink-0">
					{isDeployed ? (
						<Button
							size="3"
							color="red"
							onClick={onOpenOfflineConfirmation}
							className="px-4 sm:px-6 py-3 shadow-lg shadow-red-500/25 group bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-all duration-200 cursor-pointer"
						>
							{/* Live Status Icon */}
							<svg
								className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
								fill="red"
								viewBox="0 0 24 24"
							>
								<circle cx="12" cy="12" r="10" fill="red" />
								<circle cx="12" cy="12" r="3" fill="white" />
							</svg>
							{/* Live Text */}
							<span className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-400">
								Live
							</span>
						</Button>
					) : isDraft ? (
						<Button
							size="3"
							color="gray"
							disabled
							className="px-4 sm:px-6 py-3 shadow-lg shadow-gray-500/25 group bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-75"
							title="Funnel is in draft mode. Complete new card connections to enable deployment."
						>
							<span className="font-semibold text-sm sm:text-base text-gray-600 dark:text-gray-400">
								Draft
							</span>
						</Button>
					) : (
						<Button
							size="3"
							color="green"
							onClick={onDeploy}
							disabled={!hasFlow || hasApiError}
							className={`px-4 sm:px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 ${
								!hasAnyLiveFunnel && hasFlow && !hasApiError
									? "animate-pulse animate-bounce"
									: ""
							}`}
							title={
								hasApiError
									? "Cannot go live due to generation error"
									: !hasFlow
										? "Generate funnel first"
										: ""
							}
						>
							<Play
								size={18}
								strokeWidth={2.5}
								className={`transition-transform duration-300 sm:w-5 sm:h-5 ${
									!hasAnyLiveFunnel && hasFlow && !hasApiError
										? "animate-spin"
										: "group-hover:scale-110"
								}`}
							/>
							<span className="ml-2 font-semibold text-sm sm:text-base">
								Go Live
							</span>
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
