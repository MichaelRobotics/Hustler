"use client";

import { Edit3, Eye, Library, Plus, Zap } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useCredits } from "../../hooks/useCredits";
import { CreditPackModal } from "../payments/CreditPackModal";
import { shouldDisableGeneration, validateFunnelProducts } from "../../helpers/funnel-product-validation";
import type { Funnel } from "../../types/resource";
import type { AuthenticatedUser } from "../../types/user";

interface UnifiedNavigationProps {
	onPreview?: () => void;
	onFunnelProducts?: () => void;
	onGeneration?: () => void;
	onEdit?: () => void; // New: Go to FunnelBuilder
	isGenerated?: boolean;
	isGenerating?: boolean;
	isAnyFunnelGenerating?: () => boolean; // New: Check if any funnel is generating
	isDeployed?: boolean; // New: Check if funnel is deployed/live
	funnel?: Funnel; // New: Funnel object for validation
	className?: string;
	showOnPage?: "aibuilder" | "preview" | "all" | "analytics";
	user?: AuthenticatedUser | null; // New: User context for credits
	onUserUpdate?: () => Promise<void>; // Callback to refresh user context after payment
	isFunnelBuilder?: boolean; // New: Distinguish between Funnel Builder and Library contexts
	isSingleMerchant?: boolean; // New: Detect if there's only 1 merchant card
}

const UnifiedNavigation: React.FC<UnifiedNavigationProps> = ({
	onPreview,
	onFunnelProducts,
	onGeneration,
	onEdit,
	isGenerated = false,
	isGenerating = false,
	isAnyFunnelGenerating,
	isDeployed = false,
	funnel,
	className = "",
	showOnPage = "all",
	user = null,
	onUserUpdate,
	isFunnelBuilder = false,
	isSingleMerchant = false,
}) => {
	const [isExpanded, setIsExpanded] = useState(isSingleMerchant); // Open at start for single merchant
	const [showLibraryExplanation, setShowLibraryExplanation] = useState(false);
	const [showPreviewExplanation, setShowPreviewExplanation] = useState(false);
	const { canGenerate, refresh: refreshCredits } = useCredits(user);
	const [showCreditModal, setShowCreditModal] = useState(false);

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded);
	};

	// Show explanations for single merchant - continuous loop
	useEffect(() => {
		if (isSingleMerchant && isExpanded) {
			let isPreviewTurn = true;
			
			const showNextExplanation = () => {
				if (isPreviewTurn) {
					setShowPreviewExplanation(true);
					setShowLibraryExplanation(false);
					setTimeout(() => {
						setShowPreviewExplanation(false);
						isPreviewTurn = false;
						showNextExplanation();
					}, 3000);
				} else {
					setShowLibraryExplanation(true);
					setShowPreviewExplanation(false);
					setTimeout(() => {
						setShowLibraryExplanation(false);
						isPreviewTurn = true;
						showNextExplanation();
					}, 3000);
				}
			};
			
			// Start the loop after initial delay
			setTimeout(showNextExplanation, 1000);
		} else {
			// Reset when not single merchant or not expanded
			setShowLibraryExplanation(false);
			setShowPreviewExplanation(false);
		}
	}, [isSingleMerchant, isExpanded]);

	const handleGeneration = async () => {
		// Check if funnel has required FREE products and minimum resources
		if (funnel) {
			const validation = validateFunnelProducts(funnel);
			if (!validation.hasFreeProducts || !validation.hasMinimumResources) {
				// Show notification to user
				const showNotification = (message: string) => {
					const notification = document.createElement("div");
					notification.className =
						"fixed top-4 right-4 z-50 px-4 py-3 bg-amber-500 text-white rounded-lg border border-amber-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
					notification.textContent = message;

					const closeBtn = document.createElement("button");
					closeBtn.innerHTML = "×";
					closeBtn.className =
						"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
					closeBtn.onclick = () => notification.remove();
					notification.appendChild(closeBtn);

					document.body.appendChild(notification);

					setTimeout(() => {
						if (notification.parentNode) {
							notification.remove();
						}
					}, 4000);
				};

				if (!validation.hasFreeProducts) {
					showNotification("Add at least 1 FREE product to generate");
				} else if (!validation.hasMinimumResources) {
					showNotification("Add at least 3 resources to generate");
				}
				return;
			}
		}

		// CREDIT VALIDATION - Check credits BEFORE any other checks
		try {
			const experienceId = user?.experienceId;
			if (!experienceId) {
				throw new Error("Experience ID is required");
			}

			// Call dedicated credit validation endpoint
			const { apiPost } = await import("../../utils/api-client");
			const creditValidationResponse = await apiPost("/api/validate-credits", {
				experienceId: experienceId,
			}, experienceId);

			if (!creditValidationResponse.ok) {
				const creditError = await creditValidationResponse.json();
				
				// Check if it's insufficient credits error
				if (creditError.error === "INSUFFICIENT_CREDITS") {
					// Show credit modal instead of notification
					setShowCreditModal(true);
					return;
				}
				
				// Show other credit errors as notifications
				const showNotification = (message: string) => {
					const notification = document.createElement("div");
					notification.className =
						"fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
					notification.textContent = message;

					const closeBtn = document.createElement("button");
					closeBtn.innerHTML = "×";
					closeBtn.className =
						"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
					closeBtn.onclick = () => notification.remove();
					notification.appendChild(closeBtn);

					document.body.appendChild(notification);

					setTimeout(() => {
						if (notification.parentNode) {
							notification.remove();
						}
					}, 5000);
				};

				showNotification(creditError.message || "Credit validation failed");
				return;
			}
		} catch (error) {
			console.error("Credit validation failed:", error);
			// Show error notification
			const showNotification = (message: string) => {
				const notification = document.createElement("div");
				notification.className =
					"fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
				notification.textContent = message;

				const closeBtn = document.createElement("button");
				closeBtn.innerHTML = "×";
				closeBtn.className =
					"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
				closeBtn.onclick = () => notification.remove();
				notification.appendChild(closeBtn);

				document.body.appendChild(notification);

				setTimeout(() => {
					if (notification.parentNode) {
						notification.remove();
					}
				}, 5000);
			};

			showNotification("Failed to validate credits. Please try again.");
			return;
		}

		// Check if any funnel is already generating (prefer isAnyFunnelGenerating if available)
		const anyGenerating = isAnyFunnelGenerating
			? isAnyFunnelGenerating()
			: isGenerating;
		if (anyGenerating) {
			console.log("Another funnel is already generating");
			return;
		}

		try {
			// Call the generation handler - credit deduction is now handled server-side
			await onGeneration?.();

			// Refresh credit balance after successful generation
			// The server-side generation API now handles credit deduction
			await refreshCredits();
		} catch (error) {
			console.error("Error during generation:", error);
			// Don't show credit modal for generation failures
		}
	};

	const handlePurchaseSuccess = async () => {
		setShowCreditModal(false);
		// Refresh user context after payment to update credits, messages, subscription, and membership
		if (onUserUpdate) {
			await onUserUpdate();
		}
	};

	// Only show on specified pages (hide on analytics)
	if (
		showOnPage === "analytics" ||
		(showOnPage !== "all" &&
			showOnPage !== "aibuilder" &&
			showOnPage !== "preview")
	) {
		return null;
	}

	return (
		<div className={`fixed bottom-6 right-6 z-50 ${className}`}>
			<div className="flex flex-col items-center gap-3">
				{/* Preview Button - Show on aibuilder pages, only if funnel is generated */}
				{isExpanded &&
					onPreview &&
					showOnPage === "aibuilder" &&
					isGenerated && (
						<div className="relative">
							<button
								data-accent-color="blue"
								aria-label="Preview view"
								className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-blue-500 text-white"
								onClick={onPreview}
								title="Preview view"
							>
								<Eye
									size={20}
									strokeWidth={2.5}
									className="group-hover:scale-110 transition-transform duration-200"
								/>
							</button>
							
							{/* Preview Explanation Tooltip */}
							{showPreviewExplanation && (
								<div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg animate-in slide-in-from-right-2 duration-300">
									Preview Merchant Conversation
									<div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 w-0 h-0 border-l-4 border-l-blue-500 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
								</div>
							)}
						</div>
					)}

				{/* Assigned Products Button - Show on aibuilder and preview pages, but show Edit icon only in Library context with generated funnel */}
				{isExpanded &&
					onFunnelProducts &&
					(showOnPage === "aibuilder" || showOnPage === "preview") && (
						<div className="relative">
							<button
								data-accent-color={isGenerated && showOnPage === "aibuilder" && !isFunnelBuilder ? "orange" : "violet"}
								aria-label={isGenerated && showOnPage === "aibuilder" && !isFunnelBuilder ? "Edit Funnel" : "Assigned Products"}
								className={`fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface text-white ${
									isGenerated && showOnPage === "aibuilder" && !isFunnelBuilder
										? "shadow-orange-500/25 hover:shadow-orange-500/40 bg-orange-500"
										: "shadow-violet-500/25 hover:shadow-violet-500/40 bg-violet-500"
								}`}
								onClick={isGenerated && showOnPage === "aibuilder" && !isFunnelBuilder ? onEdit : onFunnelProducts}
								title={isGenerated && showOnPage === "aibuilder" && !isFunnelBuilder ? "Edit Merchant" : "Market Stall"}
							>
								{isGenerated && showOnPage === "aibuilder" && !isFunnelBuilder ? (
									<Edit3
										size={20}
										strokeWidth={2.5}
										className="group-hover:scale-110 transition-transform duration-200"
									/>
								) : (
									<Library
										size={20}
										strokeWidth={2.5}
										className="group-hover:scale-110 transition-transform duration-200"
									/>
								)}
							</button>
							
							{/* Library Explanation Tooltip */}
							{showLibraryExplanation && (
								<div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg animate-in slide-in-from-right-2 duration-300">
									{isGenerated && showOnPage === "aibuilder" && !isFunnelBuilder ? "Edit Merchant conversation" : "Check Merchant Market Stall"}
									<div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 w-0 h-0 border-l-4 border-l-blue-500 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
								</div>
							)}
						</div>
					)}

				{/* Edit Button - Show on preview pages, only if funnel is generated */}
				{isExpanded &&
					onEdit &&
					showOnPage === "preview" &&
					isGenerated && (
						<button
							data-accent-color="orange"
							aria-label="Edit Funnel"
							className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-orange-500 text-white"
							onClick={onEdit}
							title="Edit Funnel"
						>
							<Edit3
								size={20}
								strokeWidth={2.5}
								className="group-hover:scale-110 transition-transform duration-200"
							/>
						</button>
					)}

				{/* Generation Button - Hide when funnel is live, generating, already generated, or missing FREE products or minimum resources */}
				{isExpanded && !isDeployed && !isGenerated && (!funnel || (validateFunnelProducts(funnel).hasFreeProducts && validateFunnelProducts(funnel).hasMinimumResources)) && (
					<button
						onClick={handleGeneration}
						disabled={isGenerating}
						className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-violet-500 text-white"
						aria-label="Generate funnel"
						title="Generate funnel"
					>
						<Zap
							size={20}
							strokeWidth={2.5}
							className="group-hover:scale-110 transition-transform duration-200"
						/>
					</button>
				)}

				{/* Main Toggle Button */}
				<button
					data-accent-color="violet"
					aria-label={isExpanded ? "Collapse navigation" : "Expand navigation"}
					className="fui-reset fui-BaseButton fui-Button w-14 h-14 rounded-full shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-110 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 dark:shadow-lg group fui-r-size-3 fui-variant-surface bg-violet-500 text-white"
					onClick={isExpanded ? toggleExpanded : (() => {
						// If generation conditions are met, trigger generation directly
						const validation = funnel ? validateFunnelProducts(funnel) : null;
						const canGenerate = !isDeployed && !isGenerated && (!funnel || (validation?.hasFreeProducts && validation?.hasMinimumResources));
						
						if (canGenerate) {
							handleGeneration();
						} else {
							toggleExpanded();
						}
					})}
					title={isExpanded ? "Collapse navigation" : (!isDeployed && !isGenerated && (!funnel || (validateFunnelProducts(funnel).hasFreeProducts && validateFunnelProducts(funnel).hasMinimumResources))) ? "Generate funnel" : "Expand navigation"}
				>
					{isExpanded ? (
						<Plus
							size={24}
							strokeWidth={2.5}
							className={`transition-transform duration-300 ${isSingleMerchant ? 'rotate-45' : 'rotate-45'}`}
						/>
					) : (!isDeployed && !isGenerated && (!funnel || (validateFunnelProducts(funnel).hasFreeProducts && validateFunnelProducts(funnel).hasMinimumResources))) ? (
						<Zap
							size={24}
							strokeWidth={2.5}
							className="transition-transform duration-200"
						/>
					) : (
						<Plus
							size={24}
							strokeWidth={2.5}
							className="transition-transform duration-300 rotate-0"
						/>
					)}
				</button>
			</div>

			{/* Credit Pack Modal */}
			<CreditPackModal
				isOpen={showCreditModal}
				onClose={() => setShowCreditModal(false)}
				onPurchaseSuccess={handlePurchaseSuccess}
				experienceId={user?.experienceId}
				subscription={user?.subscription ?? null}
				user={user}
			/>
		</div>
	);
};

export default UnifiedNavigation;
