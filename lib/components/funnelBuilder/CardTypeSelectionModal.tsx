"use client";

import React from "react";
import { Heading, Text } from "frosted-ui";
import { X, MessageSquare, ShoppingCart } from "lucide-react";

interface CardTypeSelectionModalProps {
	isOpen: boolean;
	onSelect: (cardType: "qualification" | "product") => void;
	onClose: () => void;
}

const CardTypeSelectionModal: React.FC<CardTypeSelectionModalProps> = ({
	isOpen,
	onSelect,
	onClose,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center">
			<div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
				{/* Header */}
				<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
					<Heading size="5" weight="bold" className="text-black dark:text-white">
						Select Card Type
					</Heading>
					<button
						onClick={onClose}
						className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
					>
						<X className="w-5 h-5 text-gray-500" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-4">
					<Text size="2" className="text-gray-600 dark:text-gray-400 mb-4">
						Choose the type of card for this new stage:
					</Text>

					{/* Qualification Card Option */}
					<button
						onClick={() => onSelect("qualification")}
						className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-500 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left group"
					>
						<div className="flex items-start gap-4">
							<div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
								<MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
							</div>
							<div className="flex-1">
								<Heading size="4" weight="semi-bold" className="text-gray-900 dark:text-white mb-1">
									Qualification Card
								</Heading>
								<Text size="2" className="text-gray-600 dark:text-gray-400">
									Text with choices - no product link
								</Text>
							</div>
						</div>
					</button>

					{/* Product Card Option */}
					<button
						onClick={() => onSelect("product")}
						className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-500 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left group"
					>
						<div className="flex items-start gap-4">
							<div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
								<ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
							</div>
							<div className="flex-1">
								<Heading size="4" weight="semi-bold" className="text-gray-900 dark:text-white mb-1">
									Product Card
								</Heading>
								<Text size="2" className="text-gray-600 dark:text-gray-400">
									Text with product link [LINK] - user can choose product
								</Text>
							</div>
						</div>
					</button>
				</div>
			</div>
		</div>
	);
};

export default CardTypeSelectionModal;
