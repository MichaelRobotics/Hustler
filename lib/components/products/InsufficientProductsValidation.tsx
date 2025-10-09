import { Heading, Text } from "frosted-ui";
import { AlertTriangle, DollarSign, Gift } from "lucide-react";
import type React from "react";
import type { Funnel } from "../../types/resource";
import { validateFunnelProducts } from "../../helpers/funnel-product-validation";

interface InsufficientProductsValidationProps {
	funnel?: Funnel;
}

export const InsufficientProductsValidation: React.FC<InsufficientProductsValidationProps> = ({ funnel }) => {
	const getValidationMessage = () => {
		// Always show validation (no product type checks)
		return {
			title: "Offer New Members",
			message: "📱 Apps and free memberships\n💳 Paid memberships",
			icon: null, // No icon - will use dollar button instead
			iconBg: "from-orange-100/80 to-red-100/60 dark:from-orange-900/40 dark:to-red-900/30",
			iconBorder: "border-orange-200/50 dark:border-orange-700/30"
		};
	};

	const validation = getValidationMessage();
	if (!validation) return null;

	// Handle dollar button click - show smart notification and scroll to products
	const handleDollarButtonClick = () => {
		// Show smart notification if funnel data is available
		if (funnel) {
			const resources = funnel.resources || [];
			const freeCount = resources.filter(r => r.category === "FREE_VALUE").length;
			const totalCount = resources.length;
			
			// Calculate what's missing
			const resourcesNeeded = Math.max(0, 3 - totalCount);
			const freeNeeded = freeCount === 0 ? 1 : 0;
			
			let message = "";
			
			// Smart notification based on what's actually missing
			if (freeNeeded > 0) {
				// Missing FREE resources - prioritize this message
				message = `Add ${freeNeeded} FREE resource to generate your funnel.`;
			} else if (resourcesNeeded > 0) {
				// Only missing total resources (has free but not enough total)
				message = `Add ${resourcesNeeded} more resource${resourcesNeeded > 1 ? 's' : ''} to generate your funnel.`;
			}
			
			if (message) {
				// Show smart notification to user (same style as "Another generation running")
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

				showNotification(message);
			}
		}
		
		// Check if mobile view
		if (window.innerWidth < 768) {
			// Scroll to products section
			const productsSection = document.querySelector('[data-products-section]');
			if (productsSection) {
				productsSection.scrollIntoView({ behavior: 'smooth' });
			}
		}
	};

	return (
		<div className="mt-8 mb-8">
			<div className="text-center py-12 px-8 bg-gradient-to-br from-orange-50/30 via-orange-100/20 to-gray-200/15 dark:from-orange-900/40 dark:via-gray-800/30 dark:to-gray-700/20 rounded-2xl border border-orange-200/30 dark:border-gray-600/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
				{/* Subtle animated background elements */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(251,146,60,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(251,146,60,0.12)_0%,transparent_50%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(156,163,175,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(156,163,175,0.12)_0%,transparent_50%)]" />

				<div className="relative z-10">
					{/* Dollar Button - Same animation as Generate button */}
					<div className="mb-6">
						<button
							onClick={handleDollarButtonClick}
							className="group w-24 h-24 mx-auto mb-4 p-5 rounded-full bg-gradient-to-br from-orange-300/20 to-gray-400/25 dark:from-gray-700/30 dark:to-gray-600/25 border border-orange-200/30 dark:border-gray-500/30 flex items-center justify-center shadow-lg shadow-orange-500/15 transition-all duration-500 ease-out animate-pulse hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/25 cursor-pointer"
						>
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 dark:from-orange-300 dark:via-orange-400 dark:to-orange-500 animate-ping group-hover:animate-none group-hover:scale-125 group-hover:shadow-lg group-hover:shadow-orange-400/50 transition-all duration-300 relative">
								<DollarSign
									className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
									strokeWidth={2.5}
								/>
							</div>
						</button>
					</div>

					<div className="mb-8">
						<Heading size="5" weight="bold" className="mb-3 text-violet-600 dark:text-violet-400">
							{validation.title}
						</Heading>
						<Text
							size="2"
							color="gray"
							className="text-muted-foreground max-w-md mx-auto leading-relaxed whitespace-pre-line"
						>
							{validation.message}
						</Text>
					</div>
				</div>
			</div>
		</div>
	);
};
