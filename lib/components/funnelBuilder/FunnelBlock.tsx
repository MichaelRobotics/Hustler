"use client";

import type React from "react";
import CollapsibleText from "../common/CollapsibleText";
import BlockEditor from "./BlockEditor";

interface FunnelBlockOption {
	text: string;
	nextBlockId: string | null;
}

interface FunnelBlock {
	id: string;
	message: string;
	options: FunnelBlockOption[];
}

interface FunnelFlow {
	stages: Array<{
		name: string;
		blockIds: string[];
	}>;
	blocks: Record<string, FunnelBlock>;
}

interface FunnelBlockProps {
	block: FunnelBlock;
	blockId: string;
	position: { x: number; y: number; opacity: number };
	editingBlockId: string | null;
	setEditingBlockId: (blockId: string | null) => void;
	onBlockUpdate: (block: FunnelBlock) => void;
	highlightedPath: { blocks: Set<string>; options: Set<string> };
	isDeployed?: boolean;
	funnelFlow?: FunnelFlow;
}

const FunnelBlock: React.FC<FunnelBlockProps> = ({
	block,
	blockId,
	position,
	editingBlockId,
	setEditingBlockId,
	onBlockUpdate,
	highlightedPath,
	isDeployed = false,
	funnelFlow,
}) => {
	return (
		<div
			ref={(el) => {
				/* This will be handled by parent */
			}}
			onClick={() => {
				/* This will be handled by parent */
			}}
			className={`absolute bg-surface/95 dark:bg-surface/90 border rounded-2xl shadow-2xl transform transition-all duration-300 backdrop-blur-sm ${
				editingBlockId === block.id
					? "border-violet-500 ring-2 ring-violet-500/50 scale-105 w-80"
					: `w-56 hover:scale-105 hover:shadow-violet-500/20 cursor-pointer ${
							highlightedPath.blocks.has(block.id)
								? "border-amber-400 shadow-lg shadow-amber-400/20"
								: "border-border/50 dark:border-border/30"
						}`
			}`}
			style={{
				left: `calc(50% + ${(position?.x || 0) - (editingBlockId === block.id ? 160 : 112)}px)`,
				top: `${position?.y || 0}px`,
				opacity: position?.opacity ?? 1,
			}}
		>
			{editingBlockId === block.id ? (
				<BlockEditor
					block={block}
					funnelFlow={funnelFlow}
					onSave={onBlockUpdate}
					onCancel={() => setEditingBlockId(null)}
				/>
			) : (
				<>
					<div className="border-b border-border/30 dark:border-border/20 p-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5 dark:from-violet-900/10 dark:to-purple-900/10 rounded-t-2xl flex justify-between items-center">
						<div className="flex-1 min-w-0 mr-2">
							<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
								<CollapsibleText text={block.id} maxLength={20} />
							</span>
						</div>
						{!isDeployed && (
							<button
								onClick={() => setEditingBlockId(block.id)}
								className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors duration-200 flex-shrink-0"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z"
									/>
								</svg>
							</button>
						)}
					</div>
					<div className="p-4">
						<p className="text-sm text-foreground text-left whitespace-pre-wrap leading-relaxed">
							{block.message}
						</p>
					</div>
					{block.options && block.options.length > 0 && (
						<div className="p-4 border-t border-border/30 dark:border-border/20 space-y-2">
							{block.options.map((opt, i) => (
								<div
									key={`${block.id}-opt-${i}`}
									className={`text-foreground text-xs rounded-xl p-3 text-left transition-all duration-300 ${highlightedPath.options.has(`${block.id}_${opt.nextBlockId}`) ? "bg-amber-500/20 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/20" : "bg-surface/50 dark:bg-surface/30 hover:bg-surface/60 dark:hover:bg-surface/40 border border-border/30 dark:border-border/20"}`}
								>
									<div className="flex items-start gap-2">
										<div className="flex-shrink-0 w-5 h-5 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
											<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
												{i + 1}
											</span>
										</div>
										<div className="flex-1">
											<p className="whitespace-normal font-medium">
												{opt.text}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
};

export default FunnelBlock;
