"use client";

import { Button } from "frosted-ui";
import { ArrowLeft, X } from "lucide-react";
import type React from "react";
import { useState, useEffect, useRef } from "react";

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
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const checkoutRef = useRef<HTMLDivElement>(null);

	// Load Whop checkout script and create charge on mount
	useEffect(() => {
		const loadWhopScript = () => {
			return new Promise<void>((resolve, reject) => {
				// Check if script is already loaded
				if (document.querySelector('script[src="https://js.whop.com/static/checkout/loader.js"]')) {
					resolve();
					return;
				}

				const script = document.createElement('script');
				script.src = 'https://js.whop.com/static/checkout/loader.js';
				script.async = true;
				script.defer = true;
				script.onload = () => resolve();
				script.onerror = () => reject(new Error('Failed to load Whop checkout script'));
				document.head.appendChild(script);
			});
		};

		const createCharge = async () => {
			try {
				setIsLoading(true);
				setError(null);

				if (!experienceId) {
					throw new Error('Experience ID is required for charge');
				}

				// Load Whop script first
				await loadWhopScript();

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
					}),
				});

				if (!response.ok) {
					throw new Error('Failed to create charge');
				}

				const data = await response.json();
				setSessionId(data.sessionId);
				setIsLoading(false);
			} catch (error) {
				console.error('Error creating charge:', error);
				setError('Failed to initialize checkout. Please try again.');
				setIsLoading(false);
			}
		};

		createCharge();
	}, [planId, planName, credits, experienceId]);

	// Set up global checkout completion callback
	useEffect(() => {
		const handleCheckoutComplete = (planId: string, receiptId?: string) => {
			console.log("Checkout completed:", { planId, receiptId });
			onComplete?.(planId, receiptId);
		};

		// Set global callback for Whop checkout
		(window as any).onCheckoutComplete = handleCheckoutComplete;

		return () => {
			// Clean up global callback
			delete (window as any).onCheckoutComplete;
		};
	}, [onComplete]);

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
			<div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
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

				{/* Checkout Embed */}
				<div className="p-4 sm:p-6">
					<div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<div className="text-center space-y-4">
									<div className="relative">
										<div className="w-12 h-12 border-4 border-violet-200 dark:border-violet-800 rounded-full"></div>
										<div className="absolute top-0 left-0 w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
									</div>
									<div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
											Creating Checkout Session...
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											Please wait while we prepare your payment
										</p>
									</div>
								</div>
							</div>
						) : sessionId ? (
							<div 
								ref={checkoutRef}
								key={`checkout-${sessionId}`} // Stable key to prevent re-rendering
								data-whop-checkout-plan-id={planId}
								data-whop-checkout-session={sessionId}
								data-whop-checkout-skip-redirect="true"
								data-whop-checkout-theme="system"
								data-whop-checkout-on-complete="onCheckoutComplete"
								style={{ height: '400px', width: '100%' }}
							/>
						) : (
							<div className="flex items-center justify-center py-12">
								<div className="text-center space-y-4">
									<div className="text-red-500">
										<X className="w-12 h-12 mx-auto" />
									</div>
									<div>
										<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
											Checkout Failed
										</h3>
										<p className="text-sm text-gray-600 dark:text-gray-400">
											{error || "Unable to initialize checkout"}
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
					<div className="flex items-center justify-center space-x-2">
						<div className="w-2 h-2 bg-green-500 rounded-full"></div>
						<p className="text-xs text-gray-600 dark:text-gray-400">
							Secured by Whop
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

export default EmbeddedCheckout;
