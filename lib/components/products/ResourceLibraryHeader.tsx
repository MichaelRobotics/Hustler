import { Button, Heading, Text } from "frosted-ui";
import { ArrowLeft, Plus, Play } from "lucide-react";
import type React from "react";
import { GLOBAL_LIMITS } from "../../types/resource";
import type { Funnel, ResourceLibraryProps } from "../../types/resource";
import { ThemeToggle } from "../common/ThemeToggle";
import { hasValidFlow } from "@/lib/helpers/funnel-validation";

interface ResourceLibraryHeaderProps
	extends Pick<ResourceLibraryProps, "context" | "onBack"> {
	onAddProduct: () => void;
	onOpenOfflineConfirmation?: () => void;
	onDeploy?: (funnelId: string) => Promise<void>;
	filteredResourcesCount: number;
	funnel?: Funnel;
	allResourcesCount: number;
	// Deployment state
	isDeploying?: boolean;
	hasAnyLiveFunnel?: boolean;
}

export const ResourceLibraryHeader: React.FC<ResourceLibraryHeaderProps> = ({
	context,
	onBack,
	onAddProduct,
	onOpenOfflineConfirmation,
	onDeploy,
	filteredResourcesCount,
	funnel,
	allResourcesCount,
	isDeploying = false,
	hasAnyLiveFunnel = false,
}) => {
	const isAtGlobalLimit = allResourcesCount >= GLOBAL_LIMITS.PRODUCTS;
	return (
		<div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
			{/* Top Section: Back Button + Title */}
			<div className="flex items-center gap-4 mb-6">
				{context === "funnel" && onBack && (
					<Button
						size="2"
						variant="ghost"
						color="gray"
						onClick={onBack}
						className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
						aria-label="Back to assigned products"
					>
						<ArrowLeft size={20} strokeWidth={2.5} />
					</Button>
				)}

				<div>
					<Heading
						size="6"
						weight="bold"
						className="text-black dark:text-white"
					>
						{context === "funnel" ? "Resources" : "Library"}
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

				{/* Right Side: Create Resource Button, Go Live Button, or Live Status */}
				<div className="flex-shrink-0">
					{(context === "funnel" || context === "global") && (
						funnel?.isDeployed ? (
							/* Live Status Button - When funnel is deployed */
							<button
								data-accent-color="red"
								onClick={onOpenOfflineConfirmation}
								className="fui-reset fui-BaseButton fui-Button px-4 sm:px-6 py-3 shadow-lg shadow-red-500/25 group bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-all duration-200 fui-r-size-3 fui-variant-surface cursor-pointer"
							>
								<svg
									className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
									fill="red"
									viewBox="0 0 24 24"
								>
									<circle cx="12" cy="12" r="10" fill="red"></circle>
									<circle cx="12" cy="12" r="3" fill="white"></circle>
								</svg>
								<span className="font-semibold text-sm sm:text-base text-red-600 dark:text-red-400">
									Live
								</span>
							</button>
						) : context === "funnel" && funnel && hasValidFlow(funnel) && onDeploy ? (
							/* Go Live Button - When funnel is generated but not deployed */
							<Button
								size="3"
								color="green"
								onClick={() => onDeploy?.(funnel.id)}
								disabled={isDeploying}
								className={`px-4 sm:px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 ${
									!hasAnyLiveFunnel && hasValidFlow(funnel) && !isDeploying
										? "animate-pulse animate-bounce"
										: ""
								}`}
								title={
									isDeploying
										? "Deploying funnel..."
										: !hasValidFlow(funnel)
											? "Generate funnel first"
											: ""
								}
							>
								<Play
									size={18}
									strokeWidth={2.5}
									className={`transition-transform duration-300 ${
										!hasAnyLiveFunnel && hasValidFlow(funnel) && !isDeploying
											? "animate-spin"
											: "group-hover:scale-110"
									}`}
								/>
								<span className="ml-2 font-semibold text-sm sm:text-base">
									{isDeploying ? "Going Live..." : "Go Live"}
								</span>
							</Button>
						) : isAtGlobalLimit ? (
							<div className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
								<span className="text-gray-500 dark:text-gray-400 font-medium">
									Product Limit: {allResourcesCount}/{GLOBAL_LIMITS.PRODUCTS}
								</span>
								<span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
									MAX
								</span>
							</div>
						) : (
							/* Create Resource Button - When funnel is not deployed and not at limit */
							<Button
								size="3"
								color="violet"
								onClick={onAddProduct}
								className={`px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 ${
									filteredResourcesCount === 0
										? "animate-pulse animate-bounce"
										: ""
								}`}
							>
								<Plus
									size={20}
									strokeWidth={2.5}
									className={`transition-transform duration-300 ${
										filteredResourcesCount === 0
											? "animate-spin"
											: "group-hover:rotate-12"
									}`}
								/>
								Create Resource
							</Button>
						)
					)}
				</div>
			</div>
		</div>
	);
};
