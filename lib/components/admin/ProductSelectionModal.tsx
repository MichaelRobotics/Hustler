"use client";

import { Button, Text } from "frosted-ui";
import { X } from "lucide-react";
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
	if (!isOpen) return null;

	return (
		<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-2xl backdrop-blur-sm">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 bg-violet-500 rounded-full"></div>
					<Text
						size="2"
						weight="semi-bold"
						className="text-gray-900 dark:text-white"
					>
						Select Product
					</Text>
				</div>
				<Button
					size="1"
					variant="ghost"
					color="gray"
					onClick={onClose}
					className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
				>
					<X size={14} strokeWidth={2.5} />
				</Button>
			</div>

			{/* Products List */}
			<div className="p-4 max-h-80 overflow-y-auto">
				{loading ? (
					<div className="flex flex-col items-center justify-center py-12 space-y-4">
						<div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-200 border-t-violet-500"></div>
						<Text size="2" color="gray" className="text-gray-500 dark:text-gray-400">
							Loading products...
						</Text>
					</div>
				) : (
					<div className="space-y-2">
						{products.map((product) => (
							<div
								key={product.id}
								onClick={() => {
									onProductSelect(product);
									onClose();
								}}
								className="p-3 rounded-xl border cursor-pointer transition-all duration-200 bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50"
							>
								<div className="flex items-center justify-between">
									<Text
										size="2"
										weight="semi-bold"
										className="text-gray-900 dark:text-white"
									>
										{product.title}
									</Text>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

