"use client";

import { Button } from "frosted-ui";
import { ArrowLeft, X } from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { useIframeSdk } from "@whop/react";

interface EmbeddedCheckoutProps {
	planId: string;
	planName: string;
	credits: number;
	price: number;
	experienceId?: string;
	onComplete?: (planId: string, receiptId?: string) => void;
	onCancel?: () => void;
}

export const EmbeddedCheckout: React.FC<EmbeddedCheckoutProps> = ({
	planId,
	planName,
	credits,
	price,
	experienceId,
	onComplete,
	onCancel,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const iframeSdk = useIframeSdk();

	const handlePurchase = async () => {
		try {
			setIsProcessing(true);
			setError(null);

			if (!experienceId) {
				throw new Error('Experience ID is required for purchase');
			}

			// Create charge using the API
			const response = await fetch('/api/checkout-session-simple', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					planId,
					packId: planName.toLowerCase().replace(/\s+/g, '_'),
					credits,
					experienceId,
					price,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create charge');
			}

			const data = await response.json();
			
			if (!data.sessionId) {
				throw new Error('No session ID received from server');
			}

			// Use iframe SDK to process the in-app purchase
			const result = await iframeSdk.inAppPurchase({
				id: data.sessionId,
				planId: data.planId || planId,
			});

			if (result.status === "ok") {
				console.log("Purchase completed:", { 
					planId: data.planId || planId, 
					receiptId: result.data.receiptId 
				});
				onComplete?.(data.planId || planId, result.data.receiptId);
			} else {
				throw new Error(result.error || 'Purchase failed');
			}
		} catch (error) {
			console.error('Purchase failed:', error);
			setError(error instanceof Error ? error.message : 'Purchase failed. Please try again.');
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
				{/* Header */}
				<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
					<div className="flex items-center space-x-3">
						<Button
							variant="ghost"
							size="2"
							onClick={onCancel}
							className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
						>
							<ArrowLeft className="w-4 h-4" />
						</Button>
						<div>
							<h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
								Complete Your Purchase
							</h2>
							<p className="text-sm text-gray-600 dark:text-gray-400">
								{planName} - {credits} credits for ${price}
							</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="2"
						onClick={onCancel}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

				{/* Purchase Content */}
				<div className="p-4 sm:p-6">
					<div className="text-center space-y-6">
						{/* Purchase Summary */}
						<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
							<div className="space-y-4">
								<div className="flex items-center justify-center">
									<div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/20 rounded-full flex items-center justify-center">
										<span className="text-2xl">💳</span>
									</div>
								</div>
								<div>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
										{planName}
									</h3>
									<p className="text-sm text-gray-600 dark:text-gray-400">
										{credits} credits
									</p>
									<p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
										${price}
									</p>
								</div>
							</div>
						</div>

						{/* Purchase Button */}
						<Button
							onClick={handlePurchase}
							disabled={isProcessing}
							className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isProcessing ? (
								<div className="flex items-center justify-center space-x-2">
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									<span>Processing...</span>
								</div>
							) : (
								`Purchase for $${price}`
							)}
						</Button>

						{/* Security Notice */}
						<div className="flex items-center justify-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<span>Secured by Whop</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EmbeddedCheckout;
