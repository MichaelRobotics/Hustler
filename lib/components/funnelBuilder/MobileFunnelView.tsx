"use client";

import type React from "react";
import CollapsibleText from "../common/CollapsibleText";
import BlockEditor from "./BlockEditor";
import { formatStageName, formatBlockName } from "../../utils/format-names";

interface FunnelBlockOption {
	text: string;
	nextBlockId: string | null;
}

interface FunnelBlock {
	id: string;
	message: string;
	options: FunnelBlockOption[];
}

interface FunnelStage {
	id: string;
	name: string;
	explanation: string;
	blockIds: string[];
}

interface FunnelFlow {
	startBlockId: string;
	stages: FunnelStage[];
	blocks: Record<string, FunnelBlock>;
}

interface MobileFunnelViewProps {
	funnelFlow: FunnelFlow;
	selectedOfferBlockId: string | null;
	selectedPath: { blocks: Set<string>; options: Set<string> };
	editingBlockId: string | null;
	setEditingBlockId: (blockId: string | null) => void;
	onBlockUpdate: (block: FunnelBlock) => void;
	handleBlockClick: (blockId: string) => void;
	isDeployed?: boolean;
}

const MobileFunnelView: React.FC<MobileFunnelViewProps> = ({
	funnelFlow,
	selectedOfferBlockId,
	selectedPath,
	editingBlockId,
	setEditingBlockId,
	onBlockUpdate,
	handleBlockClick,
	isDeployed = false,
}) => {
	return (
		<div className="md:hidden p-4 space-y-6">
			<div className="space-y-8">
				{/* Mobile Funnel Flow - Only show blocks in selected path */}
				{selectedOfferBlockId ? (
					<div className="space-y-8">
						{funnelFlow.stages.map((stage, stageIndex) => {
							// Filter blocks to only show those in the selected path
							const pathBlocks = stage.blockIds.filter((blockId) =>
								selectedPath.blocks.has(blockId),
							);

							if (pathBlocks.length === 0) return null;

							return (
								<div key={stage.id}>
									<div className="text-center mb-6">
										<div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200/50 dark:border-violet-700/30 rounded-xl p-4 mb-3">
											<h3 className="text-lg font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
												{formatStageName(stage.name)}
											</h3>
											<p className="text-sm text-muted-foreground leading-relaxed">
												{stage.explanation}
											</p>
										</div>
									</div>
									<div className="space-y-4 flex flex-col items-center">
										{pathBlocks.map((blockId) => {
											const block = funnelFlow.blocks[blockId];

											return (
												<div
													key={blockId}
													onClick={() => handleBlockClick(blockId)}
													className={`bg-surface/95 dark:bg-surface/90 border rounded-2xl shadow-xl w-full max-w-sm transition-all duration-300 backdrop-blur-sm ${
														editingBlockId === blockId
															? "border-violet-500 ring-2 ring-violet-500/50 scale-105"
															: "border-border/50 dark:border-border/30 hover:scale-105 hover:shadow-violet-500/20"
													}`}
												>
													{editingBlockId === blockId ? (
														<BlockEditor
															block={block}
															funnelFlow={funnelFlow}
															onSave={onBlockUpdate}
															onCancel={() => setEditingBlockId(null)}
														/>
													) : (
														<>
															{/* Enhanced Block Header with Frosted UI */}
															<div className="border-b border-border/30 dark:border-border/20 p-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5 dark:from-violet-900/10 dark:to-purple-900/10 rounded-t-2xl flex justify-between items-center">
																<div className="flex-1 min-w-0 mr-2">
																	<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
																		<CollapsibleText
																			text={formatBlockName(block.id)}
																			maxLength={20}
																		/>
																	</span>
																</div>
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		if (isDeployed) {
																			// Show notification when funnel is live
																			const notification = document.createElement('div');
																			notification.className = 'fixed top-4 right-4 z-50 bg-red-500 text-white rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right-5 duration-300';
																			notification.innerHTML = `
																				<div class="flex items-start gap-3">
																					<div class="flex-shrink-0 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
																						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
																						</svg>
																					</div>
																					<div class="flex-1">
																						<h4 class="font-semibold text-sm mb-1">Cannot Edit Live Merchant</h4>
																						<p class="text-xs text-red-100 mb-2">
																							You cannot edit Merchant Conversation when he is live
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
																			setEditingBlockId(blockId);
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

															{/* Enhanced Block Message with Frosted UI */}
															<div className="p-4">
																<p className="text-sm text-foreground text-left whitespace-pre-wrap leading-relaxed">
																	{block.message}
																</p>
															</div>

															{/* Enhanced Block Options with Frosted UI */}
															{block.options && block.options.length > 0 && (() => {
																// Check if this block is in a TRANSITION stage
																const isTransitionBlock = funnelFlow.stages.some(
																	stage => stage.name === "TRANSITION" && stage.blockIds.includes(block.id)
																);
																
																// Hide options for TRANSITION stage blocks (they represent external links)
																if (isTransitionBlock) {
																	return null;
																}
																
																return (
																	<div className="p-4 border-t border-border/30 dark:border-border/20 space-y-2">
																		{block.options.map((opt, i) => (
																		<div
																			key={`${blockId}-opt-${i}`}
																			className={`text-foreground text-xs rounded-xl p-3 text-left transition-all duration-300 ${
																				selectedPath.options.has(
																					`${blockId}_${opt.nextBlockId}`,
																				)
																					? "bg-amber-500/20 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/20"
																					: "bg-surface/50 dark:bg-surface/30 hover:bg-surface/60 dark:hover:bg-surface/40 border border-border/30 dark:border-border/20"
																			}`}
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
																);
															})()}
														</>
													)}
												</div>
											);
										})}
									</div>

									{/* Enhanced Arrow separator between stages */}
									{stageIndex < funnelFlow.stages.length - 1 && (
										<div className="flex justify-center my-8">
											<div className="p-2 rounded-full bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50">
												<svg
													className="w-6 h-6 text-violet-600 dark:text-violet-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M19 14l-7 7m0 0l-7-7m7 7V3"
													></path>
												</svg>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div className="text-center py-12">
						<div className="bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 rounded-2xl p-6 max-w-sm mx-auto">
							<div className="w-16 h-16 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
								<svg
									className="w-8 h-8 text-violet-600 dark:text-violet-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div className="text-foreground font-medium mb-2">
								No offer blocks found
							</div>
							<div className="text-sm text-muted-foreground space-y-1">
								<div>
									Available stages:{" "}
									{funnelFlow.stages.map((s) => s.name).join(", ")}
								</div>
								<div>Total blocks: {Object.keys(funnelFlow.blocks).length}</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MobileFunnelView;
