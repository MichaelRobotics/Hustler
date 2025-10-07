"use client";

import { Button, Text } from "frosted-ui";
import { X, Package, Sparkles } from "lucide-react";
import type React from "react";

interface DiscoveryProduct {
	id: string;           // accessPass.id
	title: string;        // Product name
	description?: string;
	price: number;
	currency: string;
	isFree: boolean;
	route: string;
	discoveryPageUrl?: string;
}

interface ProductSelectionModalProps {
	isOpen: boolean;
	products: DiscoveryProduct[];
	onClose: () => void;
	onProductSelect: (product: DiscoveryProduct) => void;
	loading?: boolean;
}

export const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({
	isOpen,
	products,
	onClose,
	onProductSelect,
	loading = false,
}) => {
	console.log("🔧 [ProductSelectionModal] Render:", { isOpen, productsCount: products.length, loading });
	if (!isOpen) return null;

	return (
		<div 
			className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
			onClick={onClose}
		>
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />
			
			{/* Modal */}
			<div 
				className="relative w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-300"
				onClick={(e) => e.stopPropagation()}
			>
			{/* Header */}
			<div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
				<div className="flex items-center gap-3">
					<Text
						size="3"
						weight="bold"
						className="text-gray-900 dark:text-white"
					>
						Define the Funnel's Trigger
					</Text>
				</div>
				<Button
					size="1"
					variant="ghost"
					color="gray"
					onClick={onClose}
					className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-105"
				>
					<X size={16} strokeWidth={2.5} />
				</Button>
			</div>

			{/* Explanatory Text */}
			<div className="px-6 py-4 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-violet-900/10 dark:to-purple-900/10 border-b border-gray-100 dark:border-gray-700">
				<Text
					size="2"
					className="text-gray-700 dark:text-gray-300 leading-relaxed"
				>
					When a customer buys the product you select below, they will be entered into this funnel.
				</Text>
			</div>

			{/* Products List */}
			<div className="p-6 max-h-80 overflow-y-auto">
				{loading ? (
					<div className="flex flex-col items-center justify-center py-16 space-y-6">
						{/* Animated Product Icon with Spinning Ring */}
						<div className="relative">
							{/* Outer spinning ring */}
							<div className="absolute inset-0 w-16 h-16 border-2 border-violet-200 dark:border-violet-800 rounded-full animate-spin"></div>
							{/* Inner spinning ring */}
							<div className="absolute inset-2 w-12 h-12 border-2 border-transparent border-t-violet-500 dark:border-t-violet-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
							{/* Center icon */}
							<div className="relative w-16 h-16 flex items-center justify-center">
								<Package className="w-8 h-8 text-violet-500 dark:text-violet-400 animate-pulse" strokeWidth={1.5} />
							</div>
							{/* Floating sparkles */}
							<Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-violet-400 dark:text-violet-500 animate-ping" strokeWidth={2} />
							<Sparkles className="absolute -bottom-2 -left-2 w-3 h-3 text-violet-300 dark:text-violet-600 animate-ping" strokeWidth={2} style={{ animationDelay: '0.5s' }} />
						</div>
						
						{/* Loading text with animated dots */}
						<div className="flex items-center space-x-3">
							<Text size="2" color="gray" className="text-gray-500 dark:text-gray-400">
								Loading products
							</Text>
							<div className="flex space-x-1">
								<div className="w-1 h-1 bg-violet-500 rounded-full animate-bounce"></div>
								<div className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
								<div className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
							</div>
						</div>
					</div>
				) : (
					<div className="space-y-3">
						{products.map((product, index) => (
							<div
								key={product.id}
								onClick={() => {
									onProductSelect(product);
									onClose();
								}}
								className="group p-4 rounded-xl border cursor-pointer transition-all duration-300 bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 dark:hover:from-violet-900/20 dark:hover:to-purple-900/20 hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-100/50 dark:hover:shadow-violet-900/20 hover:scale-[1.02] animate-in fade-in slide-in-from-left-2"
								style={{ animationDelay: `${index * 50}ms` }}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-2 h-2 bg-violet-400 rounded-full group-hover:bg-violet-500 transition-colors duration-200"></div>
										<Text
											size="2"
											weight="semi-bold"
											className="text-gray-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors duration-200"
										>
											{product.title}
										</Text>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
			</div>
		</div>
	);
};


