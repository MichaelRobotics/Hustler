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
	const [selectedPack, setSelectedPack] = useState<CreditPackId | null>(null);
	const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

	const [creditPacks, setCreditPacks] = useState<any[]>([]);

	useEffect(() => {
		getAllCreditPacks().then(setCreditPacks);
	}, []);

	// Clear error when modal opens
	useEffect(() => {
		if (isOpen) {
			setError(null);
			setIsLoading(null);
			setSelectedPack(null);
			setIsCheckoutLoading(false);
		}
	}, [isOpen]);

	const handlePurchase = async (packId: CreditPackId) => {
		try {
			setError(null); // Clear any previous error messages

			console.log("Starting purchase for pack:", packId);

			if (!isInIframe) {
				setError(
					"Please access this app through Whop to purchase credits. The payment system is only available within the Whop platform.",
				);
				return;
			}

			// Get the credit pack info
			const pack = creditPacks.find(p => p.id === packId);
			if (!pack || !pack.planId) {
				setError("Credit pack not found or plan ID not configured.");
				return;
			}

			console.log("Opening checkout page for plan ID:", pack.planId);

			// Create checkout URL
			const checkoutUrl = `https://whop.com/checkout/${pack.planId}?d2c=true`;
			
			// Detect if we're on mobile
			const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
			
			if (isMobile) {
				// On mobile, redirect in the same window
				setIsCheckoutLoading(true);
				
				// Show loading animation briefly
				setTimeout(() => {
					window.location.href = checkoutUrl;
				}, 500);
			} else {
				// On desktop, try to open in new window
				setSelectedPack(packId);
				setIsCheckoutLoading(true);
				
				// Open in new tab/window
				const newWindow = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
				
				if (!newWindow) {
					// If popup blocked, fallback to same window redirect
					setError("Popup blocked. Redirecting to checkout page...");
					setTimeout(() => {
						window.location.href = checkoutUrl;
					}, 2000);
					return;
				}

				// Listen for window close to stop loading
				const checkClosed = setInterval(() => {
					if (newWindow.closed) {
						clearInterval(checkClosed);
						setIsCheckoutLoading(false);
						setSelectedPack(null);
						// Check if purchase was successful (you might want to refresh user data here)
						onPurchaseSuccess?.();
					}
				}, 1000);
			}

		} catch (error: any) {
			console.error("Purchase setup failed:", error);
			setError("An unexpected error occurred. Please try again.");
			setIsCheckoutLoading(false);
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
			case "free":
				return <Zap className="w-6 h-6 text-gray-500" />;
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
					<div className="flex-1">
						<div className="text-center">
							<h2 className="text-xl sm:text-2xl font-bold text-violet-600 dark:text-violet-400">
								⚡ 1 Generation = 1 Credit
							</h2>
						</div>
					</div>
					<Button
						variant="ghost"
						size="2"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0 ml-4"
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

				{/* Loading Animation for Checkout */}
				{isCheckoutLoading && (
					<div className="p-4 sm:p-6">
						<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center">
							<div className="flex flex-col items-center justify-center space-y-4">
								{/* Animated loading spinner */}
								<div className="relative">
									<div className="w-16 h-16 border-4 border-violet-200 dark:border-violet-800 rounded-full"></div>
									<div className="absolute top-0 left-0 w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
								</div>
								
								{/* Loading text with animation */}
								<div className="space-y-2">
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
										{(() => {
											const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
											return isMobile ? "Redirecting to Checkout..." : "Opening Checkout...";
										})()}
									</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{(() => {
											const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
											return isMobile 
												? "You will be redirected to complete your purchase"
												: "Please complete your purchase in the new window";
										})()}
									</p>
									<div className="flex items-center justify-center space-x-1">
										<div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce"></div>
										<div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
										<div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
									</div>
								</div>
								
								{/* Progress indicator */}
								<div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div className="bg-violet-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
								</div>
								
								{/* Instructions */}
								<div className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
									{(() => {
										const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
										return isMobile 
											? <p>You will be taken to the Whop checkout page to complete your purchase.</p>
											: <p>If the checkout window didn't open, please check your popup blocker settings.</p>;
									})()}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Credit Packs */}
				{!isCheckoutLoading && (
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
								onClick={() => {
									setError(null); // Clear any previous error
									handlePurchase(pack.id as CreditPackId);
								}}
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
				)}

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
