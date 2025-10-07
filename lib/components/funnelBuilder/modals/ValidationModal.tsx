"use client";

import { Button, Heading, Text } from "frosted-ui";
import { X } from "lucide-react";
import type React from "react";

interface Resource {
	id: string;
	type: "AFFILIATE" | "MY_PRODUCTS" | "CONTENT" | "TOOL";
	name: string;
	link: string;
	promoCode?: string;
	category?: string;
}

interface DeploymentValidation {
	isValid: boolean;
	message: string;
	missingProducts: string[];
	extraProducts: string[];
	liveFunnelName?: string;
}

interface ValidationModalProps {
	validation: DeploymentValidation;
	resources: Resource[];
	onClose: () => void;
	onGoToProducts: () => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
	validation,
	resources,
	onClose,
	onGoToProducts,
}) => {
	if (!validation || validation.isValid) return null;

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 z-[9999]">
			<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-full max-w-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur-sm p-6 sm:p-8 animate-in zoom-in-95 duration-300 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-gray-600 dark:shadow-2xl dark:shadow-black/60">
				<div className="flex justify-between items-center mb-6">
					<Heading size="4" weight="bold" className="text-foreground">
						Cannot Go Live
					</Heading>
					<Button
						size="1"
						variant="ghost"
						color="gray"
						onClick={onClose}
						className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-all duration-200 hover:scale-105"
					>
						<X size={16} strokeWidth={2.5} />
					</Button>
				</div>

				<div className="space-y-6">
					{/* Live Funnel Conflict */}
					{validation.liveFunnelName && (
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
								<Heading size="3" weight="bold" className="text-red-800 dark:text-red-200">
									Another Funnel is Live
								</Heading>
							</div>
							<Text size="3" className="text-red-700 dark:text-red-300 mb-4">
								Funnel <span className="font-semibold">"{validation.liveFunnelName}"</span> is currently live.
							</Text>
						</div>
					)}

					{/* Product Mismatch - only show if no live funnel conflict */}
					{!validation.liveFunnelName && (
						<>
							<div className="text-center">
								<Text size="3" className="text-muted-foreground">
									Products don't match. Fix your products or generate a new funnel.
								</Text>
							</div>

					{/* Missing Products Section */}
					{validation.missingProducts.length > 0 && (
						<div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
							<div className="flex items-center gap-2 mb-3">
								<div className="w-2 h-2 bg-amber-500 rounded-full"></div>
								<Text
									size="3"
									weight="semi-bold"
									className="text-amber-800 dark:text-amber-200"
								>
									Add these products to "Library":
								</Text>
							</div>
							<div className="space-y-2">
								{validation.missingProducts.map((productName, index) => {
									return (
										<div
											key={index}
											className="flex items-center gap-2 bg-white dark:bg-amber-900/30 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-600"
										>
											<svg
												className="w-4 h-4 text-amber-600 dark:text-amber-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M12 6v6m0 0v6m0-6h6m-6 0H6"
												/>
											</svg>
											<Text
												size="2"
												className="text-amber-800 dark:text-amber-200 font-medium"
											>
												{productName}
											</Text>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Extra Products Section */}
					{validation.extraProducts.length > 0 && (
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
							<div className="flex items-center gap-2 mb-3">
								<div className="w-2 h-2 bg-red-500 rounded-full"></div>
								<Text
									size="3"
									weight="semi-bold"
									className="text-red-800 dark:text-red-200"
								>
									Remove these products from "Library":
								</Text>
							</div>
							<div className="space-y-2">
								{validation.extraProducts.map((productId) => {
									// Try to find the product name from funnel resources
									const productName =
										resources?.find((r) => r.id === productId)?.name ||
										`Product ${productId}`;
									return (
										<div
											key={productId}
											className="flex items-center gap-2 bg-white dark:bg-red-900/30 rounded-lg px-3 py-2 border border-red-200 dark:border-red-600"
										>
											<svg
												className="w-4 h-4 text-red-600 dark:text-red-400"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth="2"
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
											<Text
												size="2"
												className="text-red-800 dark:text-red-200 font-medium"
											>
												{productName}
											</Text>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex justify-center pt-4">
						{validation.liveFunnelName ? (
							<Button
								color="gray"
								onClick={onClose}
								className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-xl shadow-xl shadow-gray-500/30 hover:shadow-gray-500/50 hover:scale-105 transition-all duration-300 dark:bg-gray-500 dark:hover:bg-gray-600 dark:shadow-gray-500/40 dark:hover:bg-gray-500/60"
							>
								Close
							</Button>
						) : (
							<Button
								color="violet"
								onClick={onGoToProducts}
								className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 transition-all duration-300 dark:bg-violet-500 dark:hover:bg-violet-600 dark:shadow-violet-500/40 dark:hover:bg-violet-500/60"
							>
								Go to Library
							</Button>
						)}
					</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
