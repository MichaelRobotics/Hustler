import { Button, Heading } from "frosted-ui";
import { ArrowLeft, Library } from "lucide-react";
import type React from "react";
import type { Funnel, Resource } from "../../types/resource";
import { ThemeToggle } from "../common/ThemeToggle";
import { validateFunnelProducts } from "../../helpers/funnel-product-validation";

interface ResourcePageHeaderProps {
	funnel: Funnel;
	currentResources: Resource[];
	onBack: () => void;
	onOpenResourceLibrary: () => void;
	onOpenOfflineConfirmation: () => void;
	isGenerating: (funnelId: string) => boolean;
}

export const ResourcePageHeader: React.FC<ResourcePageHeaderProps> = ({
	funnel,
	currentResources,
	onBack,
	onOpenResourceLibrary,
	onOpenOfflineConfirmation,
	isGenerating,
}) => {
	// Check if validation conditions are met for animation
	const productValidation = validateFunnelProducts(funnel);
	const shouldAnimateLibrary = currentResources.length === 0 || !productValidation.isValid;
	return (
		<div className="sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg">
			{/* Top Section: Back Button + Title */}
			<div className="flex items-center gap-4 mb-6">
				<Button
					size="2"
					variant="ghost"
					color="gray"
					onClick={onBack}
					className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
					aria-label="Back to analytics"
				>
					<ArrowLeft size={20} strokeWidth={2.5} />
				</Button>

				<div>
					<Heading
						size="6"
						weight="bold"
						className="text-black dark:text-white"
					>
						Assigned Products
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

				{/* Right Side: Library Button or Live Status */}
				<div className="flex-shrink-0">
					{funnel.isDeployed ? (
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
					) : (
						/* Library Button - When funnel is not deployed and not generating */
						!isGenerating(funnel.id) && (
							<Button
								size="3"
								color="violet"
								onClick={onOpenResourceLibrary}
								className={`px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group ${
									shouldAnimateLibrary
										? "animate-pulse animate-bounce"
										: ""
								}`}
							>
								<Library
									size={20}
									strokeWidth={2.5}
									className={`transition-transform duration-300 ${
										shouldAnimateLibrary
											? "animate-spin"
											: "group-hover:rotate-12"
									}`}
								/>
								<span className="ml-2">Library</span>
							</Button>
						)
					)}
				</div>
			</div>
		</div>
	);
};
