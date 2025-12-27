"use client";

import { Button } from "frosted-ui";
import { Crown, Star, X, Zap, MessageSquare } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getAllCreditPacks } from "../../actions/credit-actions";
import { useSafeIframeSdk } from "../../hooks/useSafeIframeSdk";
import type { CreditPackId } from "../../types/credit";
import type { AuthenticatedUser } from "../../types/user";

interface CreditPackModalProps {
	isOpen: boolean;
	onClose: () => void;
	onPurchaseSuccess?: () => void;
	experienceId?: string;
	subscription?: "Basic" | "Pro" | "Vip" | null;
	initialTab?: TabType;
	user?: AuthenticatedUser | null;
}

type TabType = "subscriptions" | "credits" | "dms";

// Helper to get current balance from user
const getCurrentBalance = (user: AuthenticatedUser | null | undefined) => {
	return {
		messages: user?.messages ?? 0,
		credits: user?.credits ?? 0,
	};
};

// Subscription plans
const subscriptionPlans = [
	{
		id: "basic",
		name: "Basic",
		price: 29,
		features: ["10 DMs", "100 credits", "Full store access"],
		icon: <Zap className="w-6 h-6 text-blue-500" />,
	},
	{
		id: "pro",
		name: "Pro",
		price: 79,
		features: ["500 DMs/mo", "1000 credits/mo", "Full store access", "Promo system"],
		icon: <Star className="w-6 h-6 text-yellow-500" />,
		badge: "Most Popular",
	},
	{
		id: "vip",
		name: "VIP",
		price: 149,
		features: [
			"1000 DMs/mo",
			"2000 credits/mo",
			"Full store access",
			"Promo system",
			"Customer Dashboard",
		],
		icon: <Crown className="w-6 h-6 text-purple-500" />,
	},
];

// DM plans
const dmPlans = [
	{ id: "starter", name: "Starter", sends: 50, price: 9.99, icon: <Zap className="w-6 h-6 text-blue-500" /> },
	{
		id: "popular",
		name: "Popular",
		sends: 150,
		price: 24.99,
		icon: <Star className="w-6 h-6 text-yellow-500" />,
		badge: "Most Popular",
	},
	{ id: "pro", name: "Pro", sends: 300, price: 39.99, icon: <Crown className="w-6 h-6 text-purple-500" /> },
];

export const CreditPackModal: React.FC<CreditPackModalProps> = ({
	isOpen,
	onClose,
	onPurchaseSuccess,
	experienceId,
	subscription,
	initialTab = "credits",
	user,
}) => {
	const currentBalance = getCurrentBalance(user);
	const { isInIframe, iframeSdk } = useSafeIframeSdk();
	const [isLoading, setIsLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<TabType>(initialTab);
	const [creditPacks, setCreditPacks] = useState<any[]>([]);

	useEffect(() => {
		getAllCreditPacks().then(setCreditPacks);
	}, []);

	// Clear error when modal opens and set initial tab
	useEffect(() => {
		if (isOpen) {
			setError(null);
			setIsLoading(null);
			setActiveTab(initialTab);
			// Disable body scroll when modal is open
			document.body.style.overflow = "hidden";
		} else {
			// Re-enable body scroll when modal is closed
			document.body.style.overflow = "";
		}

		// Cleanup: re-enable scroll when component unmounts
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen, initialTab]);

	// Helper function to lookup plan data
	const lookupPlan = async (type: string, amount?: number, planId?: string): Promise<{ planId: string; type: string; amount: string | null; credits: string | null; messages: string | null } | null> => {
		try {
			const params = new URLSearchParams({ type });
			if (amount !== undefined) {
				params.append("amount", amount.toString());
			}
			if (planId) {
				params.append("planId", planId);
			}

			const response = await fetch(`/api/checkout/lookup?${params.toString()}`);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to lookup plan");
			}

			const data = await response.json();
			return {
				planId: data.planId,
				type: data.type,
				amount: data.amount,
				credits: data.credits,
				messages: data.messages,
			};
		} catch (error: any) {
			console.error("Error looking up plan:", error);
			setError(error.message || "Failed to lookup plan");
			return null;
		}
	};

	// Helper function to create checkout dynamically with experience metadata
	const createCheckout = async (planId: string, experienceId: string): Promise<{ checkoutId: string; planId: string } | null> => {
		try {
			const response = await fetch('/api/checkout/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					planId,
					experienceId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create checkout");
			}

			const data = await response.json();
			return {
				checkoutId: data.checkoutId,
				planId: data.planId,
			};
		} catch (error: any) {
			console.error("Error creating checkout:", error);
			setError(error.message || "Failed to create checkout");
			return null;
		}
	};

	const handlePurchase = async (packId: CreditPackId) => {
		try {
			setIsLoading(packId);
			setError(null);

			if (!isInIframe || !iframeSdk) {
				setError(
					"Please access this app through Whop to purchase credits. The payment system is only available within the Whop platform.",
				);
				return;
			}

			const pack = creditPacks.find((p) => p.id === packId);
			if (!pack) {
				setError("Credit pack not found.");
				return;
			}

			console.log("Looking up plan for Credits pack:", packId, "Amount:", pack.price);

			// 1. Lookup plan data
			const plan = await lookupPlan("Credits", pack.price);

			if (!plan) {
				setError("Plan not found for this credit pack.");
				return;
			}

			// 2. Create checkout dynamically with experience metadata
			if (!experienceId) {
				setError("Experience ID is required to create checkout.");
				return;
			}

			const checkout = await createCheckout(plan.planId, experienceId);

			if (!checkout) {
				setError("Failed to create checkout for this credit pack.");
				return;
			}

			// 3. Use inAppPurchase with the checkoutId and planId
			const result = await iframeSdk.inAppPurchase({
				planId: checkout.planId,
				id: checkout.checkoutId,
			});

			console.log("Payment result:", result);

			if (result.status === "ok") {
				console.log("Payment successful");
				onPurchaseSuccess?.();
				onClose();
			} else {
				const errorMessage = result.error || "Payment failed";
				let userFriendlyMessage = errorMessage;
				
				if (errorMessage.toLowerCase().includes("cancel")) {
					userFriendlyMessage = "Payment was cancelled. No charges were made.";
				} else if (errorMessage.toLowerCase().includes("insufficient")) {
					userFriendlyMessage =
						"Payment failed due to insufficient funds. Please try a different payment method.";
				} else if (errorMessage.toLowerCase().includes("declined")) {
					userFriendlyMessage = "Payment was declined. Please check your payment details and try again.";
				} else if (errorMessage.toLowerCase().includes("expired")) {
					userFriendlyMessage = "Payment session expired. Please try again.";
				} else if (
					errorMessage.toLowerCase().includes("network") ||
					errorMessage.toLowerCase().includes("timeout")
				) {
					userFriendlyMessage = "Network error occurred. Please check your connection and try again.";
				} else if (
					errorMessage.toLowerCase().includes("unauthorized") ||
					errorMessage.toLowerCase().includes("forbidden")
				) {
					userFriendlyMessage = "Payment authorization failed. Please try again or contact support.";
				}
				
				setError(userFriendlyMessage);
			}
		} catch (error: any) {
			console.error("Purchase failed:", error);
			setError(error.message || "Purchase failed. Please try again.");
		} finally {
			setIsLoading(null);
		}
	};

	const handleSubscriptionPurchase = async (planId: string) => {
		try {
			setIsLoading(planId);
			setError(null);

			if (!isInIframe || !iframeSdk) {
				setError(
					"Please access this app through Whop to purchase subscriptions. The payment system is only available within the Whop platform.",
				);
				return;
			}

			const plan = subscriptionPlans.find((p) => p.id === planId);
			if (!plan) {
				setError("Subscription plan not found.");
				return;
			}

			// Map planId to type
			const typeMap: Record<string, string> = {
				basic: "Basic",
				pro: "Pro",
				vip: "Vip",
			};

			const type = typeMap[planId];
			if (!type) {
				setError("Invalid subscription type.");
				return;
			}

			console.log("Looking up plan for subscription:", type, "PlanId:", planId);

			// 1. Lookup plan data
			const planData = await lookupPlan(type, undefined, planId);

			if (!planData) {
				setError("Plan not found for this subscription.");
				return;
			}

			// 2. Create checkout dynamically with experience metadata
			if (!experienceId) {
				setError("Experience ID is required to create checkout.");
				return;
			}

			const checkout = await createCheckout(planData.planId, experienceId);

			if (!checkout) {
				setError("Failed to create checkout for this subscription.");
				return;
			}

			// 3. Use inAppPurchase with the checkoutId and planId
			const result = await iframeSdk.inAppPurchase({
				planId: checkout.planId,
				id: checkout.checkoutId,
			});

			console.log("Payment result:", result);

			if (result.status === "ok") {
				console.log("Payment successful");
				onPurchaseSuccess?.();
				onClose();
			} else {
				const errorMessage = result.error || "Payment failed";
				let userFriendlyMessage = errorMessage;

				if (errorMessage.toLowerCase().includes("cancel")) {
					userFriendlyMessage = "Payment was cancelled. No charges were made.";
				} else if (errorMessage.toLowerCase().includes("insufficient")) {
					userFriendlyMessage =
						"Payment failed due to insufficient funds. Please try a different payment method.";
				} else if (errorMessage.toLowerCase().includes("declined")) {
					userFriendlyMessage = "Payment was declined. Please check your payment details and try again.";
				} else if (errorMessage.toLowerCase().includes("expired")) {
					userFriendlyMessage = "Payment session expired. Please try again.";
				} else if (
					errorMessage.toLowerCase().includes("network") ||
					errorMessage.toLowerCase().includes("timeout")
				) {
					userFriendlyMessage = "Network error occurred. Please check your connection and try again.";
				} else if (
					errorMessage.toLowerCase().includes("unauthorized") ||
					errorMessage.toLowerCase().includes("forbidden")
				) {
					userFriendlyMessage = "Payment authorization failed. Please try again or contact support.";
				}

				setError(userFriendlyMessage);
			}
		} catch (error: any) {
			console.error("Subscription purchase failed:", error);
			setError(error.message || "Subscription purchase failed. Please try again.");
		} finally {
			setIsLoading(null);
		}
	};

	const handleDMPurchase = async (planId: string) => {
		try {
			setIsLoading(planId);
			setError(null);

			if (!isInIframe || !iframeSdk) {
				setError(
					"Please access this app through Whop to purchase DMs. The payment system is only available within the Whop platform.",
				);
				return;
			}

			const plan = dmPlans.find((p) => p.id === planId);
			if (!plan) {
				setError("DM plan not found.");
				return;
			}

			console.log("Looking up plan for Messages pack:", planId, "Amount:", plan.price);

			// 1. Lookup plan data
			const planData = await lookupPlan("Messages", plan.price);

			if (!planData) {
				setError("Plan not found for this DM pack.");
				return;
			}

			// 2. Create checkout dynamically with experience metadata
			if (!experienceId) {
				setError("Experience ID is required to create checkout.");
				return;
			}

			const checkout = await createCheckout(planData.planId, experienceId);

			if (!checkout) {
				setError("Failed to create checkout for this DM pack.");
				return;
			}

			// 3. Use inAppPurchase with the checkoutId and planId
			const result = await iframeSdk.inAppPurchase({
				planId: checkout.planId,
				id: checkout.checkoutId,
			});

			console.log("Payment result:", result);

			if (result.status === "ok") {
				console.log("Payment successful");
				onPurchaseSuccess?.();
				onClose();
			} else {
				const errorMessage = result.error || "Payment failed";
				let userFriendlyMessage = errorMessage;

				if (errorMessage.toLowerCase().includes("cancel")) {
					userFriendlyMessage = "Payment was cancelled. No charges were made.";
				} else if (errorMessage.toLowerCase().includes("insufficient")) {
					userFriendlyMessage =
						"Payment failed due to insufficient funds. Please try a different payment method.";
				} else if (errorMessage.toLowerCase().includes("declined")) {
					userFriendlyMessage = "Payment was declined. Please check your payment details and try again.";
				} else if (errorMessage.toLowerCase().includes("expired")) {
					userFriendlyMessage = "Payment session expired. Please try again.";
				} else if (
					errorMessage.toLowerCase().includes("network") ||
					errorMessage.toLowerCase().includes("timeout")
				) {
					userFriendlyMessage = "Network error occurred. Please check your connection and try again.";
				} else if (
					errorMessage.toLowerCase().includes("unauthorized") ||
					errorMessage.toLowerCase().includes("forbidden")
				) {
					userFriendlyMessage = "Payment authorization failed. Please try again or contact support.";
				}

				setError(userFriendlyMessage);
			}
		} catch (error: any) {
			console.error("DM purchase failed:", error);
			setError(error.message || "DM purchase failed. Please try again.");
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

	const modalContent = (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4">
			<div
				className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50"
				style={{ width: 800 }}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
					{/* Left: Logo and Subscription */}
					<div className="flex items-center gap-3">
						<img
							src="https://img-v2-prod.whop.com/5gOGDA4NYxRDoEWNIhewVyY7p7jNsnQuwzDqEAz_374/plain/https://assets.whop.com/uploads/2025-10-10/user_16698014_53c1c87d-73a2-4091-8c9b-6f78fcbe2c6a.png"
							alt="UpSell Logo"
							className="w-8 h-8 rounded-lg"
						/>
						<div className="flex flex-col">
							<span className="text-sm font-semibold text-gray-900 dark:text-white">UpSell</span>
							<span className="text-xs text-gray-500 dark:text-gray-400">
								{subscription ?? "Basic"} Plan
							</span>
						</div>
					</div>

					{/* Right: Balance and Close */}
					<div className="flex items-center gap-3">
						<span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm font-medium text-blue-700 dark:text-blue-400">
							Messages: {currentBalance.messages}
						</span>
						<span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 rounded-full text-sm font-medium text-violet-700 dark:text-violet-400">
							Credits: {currentBalance.credits}
						</span>
					<Button
						variant="ghost"
						size="2"
						onClick={onClose}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
					>
						<X className="w-4 h-4" />
					</Button>
					</div>
				</div>

				{/* Tabs Navigation */}
				<div className="px-4 sm:px-6 pt-4">
					<div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
						<button
							onClick={() => setActiveTab("subscriptions")}
							className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
								activeTab === "subscriptions"
									? "border-violet-500 text-violet-600 dark:text-violet-400"
									: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							}`}
						>
							Subscriptions
						</button>
						<button
							onClick={() => setActiveTab("credits")}
							className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
								activeTab === "credits"
									? "border-violet-500 text-violet-600 dark:text-violet-400"
									: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							}`}
						>
							Credits
						</button>
						<button
							onClick={() => setActiveTab("dms")}
							className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
								activeTab === "dms"
									? "border-violet-500 text-violet-600 dark:text-violet-400"
									: "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							}`}
						>
							Messages
						</button>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<p className="text-red-600 dark:text-red-400 text-xs sm:text-sm">{error}</p>
					</div>
				)}

				{/* Tab Content */}
				<div className="p-4 sm:p-6">
					{/* Subscriptions Tab */}
					{activeTab === "subscriptions" && (
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
							{subscriptionPlans.map((plan) => (
								<div
									key={plan.id}
									className={`relative border-2 rounded-xl p-5 sm:p-6 transition-all duration-200 flex flex-col ${
										plan.badge === "Most Popular"
											? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
											: "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
									}`}
								>
									{plan.badge && (
										<div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
											<span className="bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
												{plan.badge}
											</span>
										</div>
									)}

									<div className="flex items-center justify-center mb-3 sm:mb-4">
										<div
											className={`p-2 sm:p-3 rounded-xl ${
												plan.badge === "Most Popular"
													? "bg-violet-100 dark:bg-violet-800"
													: "bg-gray-100 dark:bg-gray-800"
											}`}
										>
											{plan.icon}
										</div>
									</div>

									<div className="text-center mb-4 sm:mb-6 flex-grow">
										<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 whitespace-nowrap">
											{plan.name}
										</h3>
										<div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 whitespace-nowrap">
											${plan.price}/mo
										</div>
										<ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-2 sm:mb-3 text-left">
											{plan.features.map((feature, idx) => (
												<li key={idx} className="flex items-start">
													<span className="mr-2 flex-shrink-0">•</span>
													<span className="whitespace-nowrap">{feature}</span>
												</li>
											))}
										</ul>
									</div>

									{subscription?.toLowerCase() === plan.id.toLowerCase() ? (
										<div className="w-full mt-auto px-4 py-2 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 rounded-lg text-center">
											<span className="text-green-700 dark:text-green-400 font-semibold text-sm">
												Current
											</span>
										</div>
									) : (
										<Button
											onClick={() => handleSubscriptionPurchase(plan.id)}
											disabled={isLoading === plan.id}
											className={`w-full mt-auto ${
												plan.badge === "Most Popular"
													? "bg-violet-500 hover:bg-violet-600"
													: "bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
											}`}
										>
											{isLoading === plan.id ? (
												<div className="flex items-center justify-center">
													<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
													Processing...
												</div>
											) : (
												`Subscribe`
											)}
										</Button>
									)}
								</div>
							))}
						</div>
					)}

					{/* Credits Tab */}
					{activeTab === "credits" && (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
						{creditPacks.map((pack) => (
							<div
								key={pack.id}
										className={`relative border-2 rounded-xl p-5 sm:p-6 transition-all duration-200 cursor-pointer group ${
									pack.badge === "Most Popular"
										? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
										: "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
								}`}
								onClick={() => {
											setError(null);
									handlePurchase(pack.id as CreditPackId);
								}}
							>
								{pack.badge && (
											<div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
												<span className="bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
											{pack.badge}
										</span>
									</div>
								)}

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

								<div className="text-center mb-4 sm:mb-6">
											<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 whitespace-nowrap">
										{pack.name}
									</h3>
											<div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 whitespace-nowrap">
										${pack.price}
									</div>
											<div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 whitespace-nowrap">
										{pack.credits} Credits
									</div>
											<p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{pack.description}</p>
								</div>

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
					)}

					{/* DMs Tab */}
					{activeTab === "dms" && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
							{dmPlans.map((plan) => (
								<div
									key={plan.id}
									className={`relative border-2 rounded-xl p-5 sm:p-6 transition-all duration-200 ${
										plan.badge === "Most Popular"
											? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
											: "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
									}`}
								>
									{plan.badge && (
										<div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
											<span className="bg-violet-500 text-white text-xs font-medium px-3 py-1 rounded-full whitespace-nowrap">
												{plan.badge}
											</span>
										</div>
									)}

									<div className="flex items-center justify-center mb-3 sm:mb-4">
										<div
											className={`p-2 sm:p-3 rounded-xl ${
												plan.badge === "Most Popular"
													? "bg-violet-100 dark:bg-violet-800"
													: "bg-gray-100 dark:bg-gray-800"
											}`}
										>
											<MessageSquare className="w-6 h-6 text-blue-500" />
										</div>
									</div>

									<div className="text-center mb-4 sm:mb-6">
										<h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 whitespace-nowrap">
											{plan.name}
										</h3>
										<div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 whitespace-nowrap">
											${plan.price}
										</div>
										<div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 whitespace-nowrap">
											{plan.sends} Messages
										</div>
									</div>

									<Button
										onClick={() => handleDMPurchase(plan.id)}
										disabled={isLoading === plan.id}
										className={`w-full ${
											plan.badge === "Most Popular"
												? "bg-violet-500 hover:bg-violet-600"
												: "bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
										}`}
									>
										{isLoading === plan.id ? (
											<div className="flex items-center justify-center">
												<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
												Processing...
											</div>
										) : (
											`Buy ${plan.sends} Messages`
										)}
									</Button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				{isInIframe && (
					<div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl">
						<div className="flex items-center justify-center space-x-2">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<p className="text-xs text-gray-600 dark:text-gray-400">Payment ready</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);

	// Use portal to render at document body level for proper viewport positioning
	if (typeof window !== "undefined") {
		return createPortal(modalContent, document.body);
	}

	return null;
};

export default CreditPackModal;
