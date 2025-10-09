import { Heading, Text } from "frosted-ui";
import { Zap } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useCredits } from "../../hooks/useCredits";
import type { Funnel, Resource } from "../../types/resource";
import type { AuthenticatedUser } from "../../types/user";
import { CreditPackModal } from "../payments/CreditPackModal";
// Removed product validation imports

interface FunnelGenerationSectionProps {
	funnel: Funnel;
	user: AuthenticatedUser | null;
	currentResources: Resource[];
	isGenerating: (funnelId: string) => boolean;
	isAnyFunnelGenerating: () => boolean;
	onGlobalGeneration: (funnelId: string) => Promise<void>;
	totalFunnels?: number;
	onDeploy?: (funnelId: string) => Promise<void>;
}

export const FunnelGenerationSection: React.FC<
	FunnelGenerationSectionProps
> = ({
	funnel,
	user,
	currentResources,
	isGenerating,
	isAnyFunnelGenerating,
	onGlobalGeneration,
	totalFunnels = 0,
	onDeploy,
}) => {
	const { canGenerate, consumeCredit, refresh: refreshCredits } = useCredits(user);
	const [showCreditModal, setShowCreditModal] = useState(false);

	const handleGeneration = async () => {
		// Removed PAID product validation - no longer checking for specific product types

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

		// Check if any funnel is already generating (not just this one)
		if (isAnyFunnelGenerating()) {
			console.log("Another funnel is already generating");

			// Show notification to user
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
				}, 3000);
			};

			showNotification("Another generation running");
			return;
		}

		try {
			// Call the original generation handler first
			// Credit deduction will happen in the generation completion callback
			await onGlobalGeneration(funnel.id);

			// Refresh credit balance after successful generation
			// The server-side generation API now handles credit deduction
			await refreshCredits();
		} catch (error) {
			console.error("Error during generation:", error);
			// Don't consume credit if generation failed
			// Don't show credit modal for generation failures
		}
	};

	const handlePurchaseSuccess = () => {
		setShowCreditModal(false);
	};

	// Removed product validation - generation is no longer disabled based on product types
	const isGenerationDisabled = false;

	if (funnel.flow || currentResources.length === 0) {
		return null;
	}

	return (
		<div className="mt-8 mb-8">
			<div className="text-center py-12 px-8 bg-gradient-to-br from-orange-50/30 via-orange-100/20 to-gray-200/15 dark:from-orange-900/40 dark:via-gray-800/30 dark:to-gray-700/20 rounded-2xl border border-orange-200/30 dark:border-gray-600/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
				{/* Subtle animated background elements */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(251,146,60,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(251,146,60,0.12)_0%,transparent_50%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(156,163,175,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(156,163,175,0.12)_0%,transparent_50%)]" />

				<div className="relative z-10">
					<div className="mb-6">
						{isGenerating(funnel.id) ? (
							<div className="flex justify-center mb-4">
								<div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
									<Zap className="w-8 h-8 text-green-500" strokeWidth={2.5} />
								</div>
							</div>
						) : (
							<button
								onClick={handleGeneration}
								disabled={funnel.generationStatus === "generating" || isGenerationDisabled}
								className={`group w-24 h-24 mx-auto mb-4 p-5 rounded-full bg-gradient-to-br from-orange-300/20 to-gray-400/25 dark:from-gray-700/30 dark:to-gray-600/25 border border-orange-200/30 dark:border-gray-500/30 flex items-center justify-center shadow-lg shadow-orange-500/15 transition-all duration-500 ease-out ${
									funnel.generationStatus === "generating" || isGenerationDisabled
										? "opacity-50 cursor-not-allowed"
										: "animate-pulse hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/25 cursor-pointer"
								}`}
							>
								<div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 dark:from-orange-300 dark:via-orange-400 dark:to-orange-500 animate-ping group-hover:animate-none group-hover:scale-125 group-hover:shadow-lg group-hover:shadow-orange-400/50 transition-all duration-300 relative">
									<Zap
										className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
										strokeWidth={2.5}
									/>
								</div>
							</button>
						)}
					</div>

					<div className="mb-8">
						<div className="text-center space-y-4">
							<Text size="2" color="gray" className="text-muted-foreground">
								{currentResources.length} resource
								{currentResources.length !== 1 ? "s" : ""} selected
							</Text>
							{/* Removed PAID product validation message */}
							<Heading
								size="5"
								weight="bold"
								className="text-orange-600 dark:text-orange-400"
							>
								{funnel.generationStatus === "generating"
									? "Generating..."
									: funnel.generationStatus === "completed"
										? "Generated"
										: funnel.generationStatus === "failed"
											? "Generation Failed"
											: totalFunnels === 1 ? "Generate & Go Live" : "Generate"}
							</Heading>
							{funnel.generationStatus === "failed" &&
								funnel.generationError && (
									<Text
										size="2"
										color="red"
										className="text-red-600 dark:text-red-400"
									>
										Error: {funnel.generationError}
									</Text>
								)}
							{funnel.generationStatus === "completed" &&
								funnel.lastGeneratedAt && (
									<Text size="2" color="gray" className="text-muted-foreground">
										Last generated:{" "}
										{new Date(funnel.lastGeneratedAt).toLocaleString()}
									</Text>
								)}
						</div>
					</div>
				</div>
			</div>

			{/* Credit Pack Modal */}
			<CreditPackModal
				isOpen={showCreditModal}
				onClose={() => setShowCreditModal(false)}
				onPurchaseSuccess={handlePurchaseSuccess}
				experienceId={user?.experienceId}
			/>
		</div>
	);
};
