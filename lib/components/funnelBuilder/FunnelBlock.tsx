"use client";

import React from "react";
import CollapsibleText from "../common/CollapsibleText";
import BlockEditor from "./BlockEditor";
import { formatBlockName } from "../../utils/format-names";

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
	onAddNewOption?: (blockId: string, optionText: string) => void; // Callback for adding new option
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
	onAddNewOption,
}) => {
	const [newOptionText, setNewOptionText] = React.useState("");
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
								<CollapsibleText text={formatBlockName(block.id)} maxLength={20} />
							</span>
						</div>
						<button
							onClick={() => {
								if (isDeployed) {
									// Show notification when funnel is live
									const notification = document.createElement('div');
									notification.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right-5 duration-300';
									notification.innerHTML = `
										<div class="flex items-start gap-3">
											<div class="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
											</div>
											<div class="flex-1">
												<h4 class="font-semibold text-sm mb-1">Cannot edit conversation when Merchant is live</h4>
												<p class="text-xs text-green-100 mb-2">
													To make it offline, click Live button below
												</p>
											</div>
										</div>
									`;
									document.body.appendChild(notification);
									
									// Add eye-catching but controlled animation to Live button
									const liveButton = document.querySelector('[data-accent-color="red"]') as HTMLElement;
									if (liveButton) {
										// Add controlled dramatic effects
										liveButton.classList.add('animate-pulse', 'ring-4', 'ring-red-500', 'ring-opacity-100', 'shadow-xl', 'shadow-red-500/60');
										liveButton.style.transform = 'scale(1.05)';
										liveButton.style.transition = 'all 0.3s ease-in-out';
										liveButton.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.4), 0 0 15px rgba(239, 68, 68, 0.5), 0 0 25px rgba(239, 68, 68, 0.3)';
										
										// Create a subtle pulsing glow effect
										const glowInterval = setInterval(() => {
											liveButton.style.boxShadow = `0 0 0 6px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.7), 0 0 35px rgba(239, 68, 68, 0.4)`;
											setTimeout(() => {
												liveButton.style.boxShadow = `0 0 0 4px rgba(239, 68, 68, 0.4), 0 0 15px rgba(239, 68, 68, 0.5), 0 0 25px rgba(239, 68, 68, 0.3)`;
											}, 400);
										}, 800);
										
										setTimeout(() => {
											clearInterval(glowInterval);
											liveButton.classList.remove('animate-pulse', 'ring-4', 'ring-red-500', 'ring-opacity-100', 'shadow-xl', 'shadow-red-500/60');
											liveButton.style.transform = 'scale(1)';
											liveButton.style.boxShadow = '';
										}, 3000);
									}
									
									// Auto-remove after 4 seconds
									setTimeout(() => {
										notification.remove();
									}, 4000);
								} else {
									// Allow editing when not deployed
									setEditingBlockId(block.id);
								}
							}}
							className={`p-1.5 rounded-lg transition-colors duration-200 flex-shrink-0 ${
								isDeployed 
									? "text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50" 
									: "text-muted-foreground hover:text-foreground hover:bg-violet-100 dark:hover:bg-violet-800/50"
							}`}
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
					</div>
					<div className="p-4">
						<p className="text-sm text-foreground text-left whitespace-pre-wrap leading-relaxed">
							{block.message}
						</p>
					</div>
					<div className="p-4 border-t border-border/30 dark:border-border/20 space-y-2">
						{block.options && block.options.length > 0 && (
							<>
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
							</>
						)}
						{/* Always visible "+" option with input field */}
						{!isDeployed && onAddNewOption && (
							<div className="flex items-center gap-2 rounded-xl p-3 border border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
								<input
									type="text"
									value={newOptionText}
									onChange={(e) => setNewOptionText(e.target.value)}
									placeholder="Add new option..."
									className="flex-1 text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
									onKeyDown={(e) => {
										if (e.key === "Enter" && newOptionText.trim() && !e.shiftKey) {
											e.preventDefault();
											onAddNewOption(blockId, newOptionText.trim());
											setNewOptionText("");
										}
									}}
								/>
								<button
									onClick={() => {
										if (newOptionText.trim()) {
											onAddNewOption(blockId, newOptionText.trim());
											setNewOptionText("");
										}
									}}
									disabled={!newOptionText.trim()}
									className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
										newOptionText.trim()
											? "bg-violet-500 hover:bg-violet-600 dark:bg-violet-600 dark:hover:bg-violet-700 text-white cursor-pointer"
											: "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
									}`}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="w-4 h-4"
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
								</button>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default FunnelBlock;
