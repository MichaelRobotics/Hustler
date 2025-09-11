"use client";

import { Edit3, Eye, Library, Plus, Zap } from "lucide-react";
import type React from "react";
import { useState } from "react";
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
	showOnPage?: "resources" | "aibuilder" | "preview" | "all" | "analytics";
	user?: AuthenticatedUser | null; // New: User context for credits
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
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const { canGenerate, refresh: refreshCredits } = useCredits(user);
	const [showCreditModal, setShowCreditModal] = useState(false);

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded);
	};

	const handleGeneration = async () => {
		// Check if funnel has required PAID products (at least 1 PAID)
		if (funnel && !validateFunnelProducts(funnel).hasPaidProducts) {
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

			showNotification("Add at least 1 PAID product to generate");
			return;
		}

		// Check if user can generate (has credits)
		if (!canGenerate) {
			setShowCreditModal(true);
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

	const handlePurchaseSuccess = () => {
		setShowCreditModal(false);
	};

	// Only show on specified pages (hide on analytics)
	if (
		showOnPage === "analytics" ||
		(showOnPage !== "all" &&
			showOnPage !== "resources" &&
			showOnPage !== "aibuilder" &&
			showOnPage !== "preview")
	) {
		return null;
	}

	return (
		<div className={`fixed bottom-6 right-6 z-50 ${className}`}>
			<div className="flex flex-col items-center gap-3">
				{/* Preview Button - Show on resources and aibuilder pages, only if funnel is generated */}
				{isExpanded &&
					onPreview &&
					(showOnPage === "resources" || showOnPage === "aibuilder") &&
					isGenerated && (
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
					)}

				{/* Assigned Products Button - Show on aibuilder and preview pages */}
				{isExpanded &&
					onFunnelProducts &&
					(showOnPage === "aibuilder" || showOnPage === "preview") && (
						<button
							data-accent-color="violet"
							aria-label="Assigned Products"
							className="fui-reset fui-BaseButton fui-Button w-12 h-12 rounded-full shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-110 transition-all duration-300 group fui-r-size-2 fui-variant-surface bg-violet-500 text-white"
							onClick={onFunnelProducts}
							title="Assigned Products"
						>
							<Library
								size={20}
								strokeWidth={2.5}
								className="group-hover:scale-110 transition-transform duration-200"
							/>
						</button>
					)}

				{/* Edit Button - Show on resources and preview pages, only if funnel is generated */}
				{isExpanded &&
					onEdit &&
					(showOnPage === "resources" || showOnPage === "preview") &&
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

				{/* Generation Button - Hide when funnel is live, generating, already generated, or missing PAID or FREE products */}
				{isExpanded && !isDeployed && !isGenerated && (!funnel || (validateFunnelProducts(funnel).hasPaidProducts && validateFunnelProducts(funnel).hasFreeProducts)) && (
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
					onClick={toggleExpanded}
					title={isExpanded ? "Collapse navigation" : "Expand navigation"}
				>
					<Plus
						size={24}
						strokeWidth={2.5}
						className={`transition-transform duration-300 ${isExpanded ? "rotate-45" : "rotate-0"}`}
					/>
				</button>
			</div>

			{/* Credit Pack Modal */}
			<CreditPackModal
				isOpen={showCreditModal}
				onClose={() => setShowCreditModal(false)}
				onPurchaseSuccess={handlePurchaseSuccess}
			/>
		</div>
	);
};

export default UnifiedNavigation;
