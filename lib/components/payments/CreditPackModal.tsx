"use client";

import { Button } from "frosted-ui";
import { Crown, Star, X, Zap } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import {
	createCreditPackCharge,
	getAllCreditPacks,
	getCreditPack,
} from "../../actions/credit-actions";
import { useSafeIframeSdk } from "../../hooks/useSafeIframeSdk";
import type { CreditPackId } from "../../types/credit";

interface CreditPackModalProps {
	isOpen: boolean;
	onClose: () => void;
	onPurchaseSuccess?: () => void;
}

export const CreditPackModal: React.FC<CreditPackModalProps> = ({
	isOpen,
	onClose,
	onPurchaseSuccess,
}) => {
	const { isInIframe, safeInAppPurchase } = useSafeIframeSdk();
	const [isLoading, setIsLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const [creditPacks, setCreditPacks] = useState<any[]>([]);

	useEffect(() => {
		getAllCreditPacks().then(setCreditPacks);
	}, []);

	const handlePurchase = async (packId: CreditPackId) => {
		try {
			setIsLoading(packId);
			setError(null);

			console.log("Starting purchase for pack:", packId);

			// Create charge on server
			const chargeResult = await createCreditPackCharge(packId);
			console.log("Charge result:", chargeResult);

			if (chargeResult.status === "success") {
				// Payment was successful immediately
				console.log("Payment successful immediately");
				onPurchaseSuccess?.();
				onClose();
				return;
			}

			if (
				chargeResult.status === "needs_action" &&
				chargeResult.inAppPurchase
			) {
				if (isInIframe) {
					// Use iframe SDK for payment
					console.log("Using Whop iframe SDK for payment");
					try {
						const result = await safeInAppPurchase(chargeResult.inAppPurchase);
						console.log("Payment result:", result);

						if (result.status === "ok") {
							console.log("Payment successful via iframe SDK");
							onPurchaseSuccess?.();
							onClose();
						} else {
							setError(result.error || "Payment failed");
						}
					} catch (error) {
						console.error("Iframe SDK payment error:", error);
						setError("Payment failed - please try again");
					}
				} else {
					// Not in iframe context - show helpful message
					setError(
						"Please access this app through Whop to purchase credits. The payment system is only available within the Whop platform.",
					);
				}
			} else {
				setError("Failed to create payment. Please try again.");
			}
		} catch (error) {
			console.error("Purchase error:", error);
			setError("An error occurred during purchase. Please try again.");
		} finally {
			setIsLoading(null);
		}
	};

	const getPackIcon = (packId: string) => {
		switch (packId) {
			case "starter":
				return <Zap className="w-6 h-6 text-blue-500" />;
			case "popular":
				return <Star className="w-6 h-6 text-yellow-500" />;
			case "pro":
				return <Crown className="w-6 h-6 text-purple-500" />;
			default:
				return <Zap className="w-6 h-6 text-gray-500" />;
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50">
				{/* Header */}
				<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
					<div>
						<h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
							Get Credits
						</h2>
						<p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
							Generate more funnels
						</p>
					</div>
					<Button
						variant="ghost"
						size="2"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
					>
						<X className="w-4 h-4" />
					</Button>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{error}</p>
					</div>
				)}

				{/* Credit Packs */}
				<div className="p-4 sm:p-6">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
						{creditPacks.map((pack) => (
							<div
								key={pack.id}
								className={`relative border-2 rounded-xl p-4 sm:p-6 transition-all duration-200 cursor-pointer group ${
									pack.badge === "Most Popular"
										? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
										: "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
								}`}
								onClick={() => handlePurchase(pack.id as CreditPackId)}
							>
								{/* Badge */}
								{pack.badge && (
									<div className="absolute -top-2 sm:-top-3 left-1/2 transform -translate-x-1/2">
										<span className="bg-violet-500 text-white text-xs font-medium px-2 sm:px-3 py-1 rounded-full">
											{pack.badge}
										</span>
									</div>
								)}

								{/* Pack Icon */}
								<div className="flex items-center justify-center mb-3 sm:mb-4">
									<div
										className={`p-2 sm:p-3 rounded-xl ${
											pack.badge === "Most Popular"
												? "bg-violet-100 dark:bg-violet-800"
												: "bg-gray-100 dark:bg-gray-800"
										}`}
									>
										{getPackIcon(pack.id)}
									</div>
								</div>

								{/* Pack Info */}
								<div className="text-center mb-4 sm:mb-6">
									<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">
										{pack.name}
									</h3>
									<div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
										${pack.price}
									</div>
									<div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
										{pack.credits} Credits
									</div>
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{pack.description}
									</p>
								</div>

								{/* Purchase Button */}
								<Button
									onClick={(e) => {
										e.stopPropagation();
										handlePurchase(pack.id as CreditPackId);
									}}
									disabled={isLoading === pack.id}
									className={`w-full ${
										pack.badge === "Most Popular"
											? "bg-violet-500 hover:bg-violet-600"
											: "bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
									}`}
								>
									{isLoading === pack.id ? (
										<div className="flex items-center justify-center">
											<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
											Processing...
										</div>
									) : (
										`Buy ${pack.credits} Credits`
									)}
								</Button>
							</div>
						))}
					</div>
				</div>

				{/* Footer */}
				{isInIframe && (
					<div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl">
						<div className="flex items-center justify-center space-x-2">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<p className="text-xs text-gray-600 dark:text-gray-400">
								Payment ready
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default CreditPackModal;
