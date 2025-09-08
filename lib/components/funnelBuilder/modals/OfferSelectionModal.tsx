"use client";

import { Button, Text } from "frosted-ui";
import { X } from "lucide-react";
import type React from "react";

interface OfferBlock {
	id: string;
	name: string;
}

interface OfferSelectionModalProps {
	isOpen: boolean;
	offerBlocks: OfferBlock[];
	onClose: () => void;
	onOfferSelect: (offerId: string) => void;
	onBlockClick: (blockId: string) => void;
}

export const OfferSelectionModal: React.FC<OfferSelectionModalProps> = ({
	isOpen,
	offerBlocks,
	onClose,
	onOfferSelect,
	onBlockClick,
}) => {
	if (!isOpen || offerBlocks.length === 0) return null;

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
						Select Offer
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

			{/* Offers List */}
			<div className="p-4 max-h-80 overflow-y-auto">
				<div className="space-y-2">
					{offerBlocks.map((resource: any) => {
						return (
							<div
								key={resource.id}
								onClick={() => {
									// Since resource.id is now the block ID, we can use it directly
									const blockId = resource.id;

									if (blockId) {
										// Set the selected offer for highlighting in preview mode
										onOfferSelect(blockId);
										// Directly call handleBlockClick to set selectedBlockForHighlight state
										onBlockClick(blockId);
									}

									onClose();
								}}
								className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${"bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50"}`}
							>
								<div className="flex items-center justify-between">
									<Text
										size="2"
										weight="semi-bold"
										className="text-gray-900 dark:text-white"
									>
										{resource.name}
									</Text>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};
