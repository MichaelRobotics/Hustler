"use client";

import React from "react";
import { X } from "lucide-react";
import type { FunnelBlock, FunnelFlow } from "@/lib/types/funnel";

interface OptionTargetModalProps {
	isOpen: boolean;
	onClose: () => void;
	optionText: string;
	currentBlockId: string;
	funnelFlow: FunnelFlow;
	onSelectExisting: (blockId: string, targetBlockId: string) => void;
	onCreateNew: (blockId: string) => void;
}

export const OptionTargetModal: React.FC<OptionTargetModalProps> = ({
	isOpen,
	onClose,
	optionText,
	currentBlockId,
	funnelFlow,
	onSelectExisting,
	onCreateNew,
}) => {
	if (!isOpen) return null;

	// Find current block's stage
	const currentStage = funnelFlow.stages.find((stage) =>
		stage.blockIds.includes(currentBlockId)
	);
	if (!currentStage) {
		onClose();
		return null;
	}

	const currentStageIndex = funnelFlow.stages.indexOf(currentStage);
	const nextStage = funnelFlow.stages[currentStageIndex + 1];

	if (!nextStage) {
		// No next stage - close modal (logic not implemented per requirements)
		onClose();
		return null;
	}

	// Get all blocks in the next stage
	const nextStageBlocks = nextStage.blockIds
		.map((blockId) => ({
			id: blockId,
			block: funnelFlow.blocks[blockId],
		}))
		.filter((item) => item.block);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-surface dark:bg-surface/95 border border-border/50 dark:border-border/30 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-border/30 dark:border-border/20">
					<h3 className="text-lg font-bold text-foreground">
						Select Target for "{optionText}"
					</h3>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-surface/60 dark:hover:bg-surface/40 transition-colors"
					>
						<X className="w-5 h-5 text-muted-foreground" />
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4 space-y-3">
					{/* Option 1: Select existing card */}
					{nextStageBlocks.length > 0 && (
						<div>
							<label className="text-sm font-semibold text-foreground mb-2 block">
								Select existing card:
							</label>
							<div className="space-y-2">
								{nextStageBlocks.map(({ id, block }) => (
									<button
										key={id}
										onClick={() => {
											onSelectExisting(currentBlockId, id);
											onClose();
										}}
										className="w-full text-left p-3 rounded-xl bg-surface/50 dark:bg-surface/30 border border-border/30 dark:border-border/20 hover:bg-surface/60 dark:hover:bg-surface/40 hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-200"
									>
										<div className="text-xs font-medium text-foreground mb-1">
											{block.message.substring(0, 100)}
											{block.message.length > 100 ? "..." : ""}
										</div>
										{block.options && block.options.length > 0 && (
											<div className="text-xs text-muted-foreground">
												{block.options.length} option
												{block.options.length !== 1 ? "s" : ""}
											</div>
										)}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Option 2: Create new card */}
					<div>
						<label className="text-sm font-semibold text-foreground mb-2 block">
							Or create new card:
						</label>
						<button
							onClick={() => {
								onCreateNew(currentBlockId);
								onClose();
							}}
							className="w-full p-3 rounded-xl bg-violet-500 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-medium transition-all duration-200 flex items-center justify-center gap-2"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Create New Card
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
