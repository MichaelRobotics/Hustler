"use client";

import { Button, Heading, Text } from "frosted-ui";
import { Move } from "lucide-react";
import React from "react";
import { useFunnelInteraction } from "../../hooks/useFunnelInteraction";
import { useFunnelLayout } from "../../hooks/useFunnelLayout";
import { useAutoSaveVisualization } from "../../hooks/useVisualizationPersistence";
import CollapsibleText from "../common/CollapsibleText";
import BlockEditor from "./BlockEditor";
import FunnelCanvas from "./FunnelCanvas";
import FunnelStage from "./FunnelStage";

import FunnelConnections from "./FunnelConnections";
import MobileFunnelView from "./MobileFunnelView";

// Draggable Debug Panel Component
interface DraggableDebugPanelProps {
	children: React.ReactNode;
	initialPosition: { x: number; y: number };
	className?: string;
	isMobile?: boolean;
}

const DraggableDebugPanel: React.FC<DraggableDebugPanelProps> = ({
	children,
	initialPosition,
	className = "",
	isMobile = false,
}) => {
	const [position, setPosition] = React.useState(initialPosition);
	const [isDragging, setIsDragging] = React.useState(false);
	const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button === 0) {
			// Left mouse button only
			setIsDragging(true);
			const rect = e.currentTarget.getBoundingClientRect();
			setDragOffset({
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			});
			e.preventDefault();
		}
	};

	const handleTouchStart = (e: React.TouchEvent) => {
		setIsDragging(true);
		const rect = e.currentTarget.getBoundingClientRect();
		const touch = e.touches[0];
		setDragOffset({
			x: touch.clientX - rect.left,
			y: touch.clientY - rect.top,
		});
		e.preventDefault();
	};

	const handleMouseMove = React.useCallback(
		(e: MouseEvent) => {
			if (isDragging) {
				setPosition({
					x: e.clientX - dragOffset.x,
					y: e.clientY - dragOffset.y,
				});
			}
		},
		[isDragging, dragOffset],
	);

	const handleTouchMove = React.useCallback(
		(e: TouchEvent) => {
			if (isDragging) {
				const touch = e.touches[0];
				setPosition({
					x: touch.clientX - dragOffset.x,
					y: touch.clientY - dragOffset.y,
				});
				e.preventDefault();
			}
		},
		[isDragging, dragOffset],
	);

	const handleMouseUp = React.useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleTouchEnd = React.useCallback(() => {
		setIsDragging(false);
	}, []);

	React.useEffect(() => {
		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
			document.addEventListener("touchmove", handleTouchMove, {
				passive: false,
			});
			document.addEventListener("touchend", handleTouchEnd);
			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
				document.removeEventListener("touchmove", handleTouchMove);
				document.removeEventListener("touchend", handleTouchEnd);
			};
		}
	}, [
		isDragging,
		handleMouseMove,
		handleMouseUp,
		handleTouchMove,
		handleTouchEnd,
	]);

	return (
		<div
			className={`${isMobile ? "fixed" : "absolute"} z-10 select-none ${className}`}
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
				cursor: isDragging ? "grabbing" : "move",
			}}
			onMouseDown={handleMouseDown}
			onTouchStart={handleTouchStart}
		>
			{children}
		</div>
	);
};

interface FunnelBlockOption {
	text: string;
	nextBlockId: string | null;
}

interface FunnelBlockData {
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
	blocks: Record<string, FunnelBlockData>;
}

interface FunnelVisualizerProps {
	funnelFlow: FunnelFlow | null;
	editingBlockId: string | null;
	setEditingBlockId: (blockId: string | null) => void;
	onBlockUpdate: (block: FunnelBlockData) => void;
	selectedOffer?: string | null;
	onOfferSelect?: (offerId: string) => void; // New: callback when offer is selected from visualization
	isDeployed?: boolean; // New: whether the funnel is currently deployed/live
	funnelId?: string; // New: funnel ID for visualization persistence
	user?: { experienceId?: string } | null; // New: user context for authentication
}

/**
 * --- Funnel Visualizer Component ---
 * This component is responsible for rendering a visual graph of the funnel flow.
 * It calculates the positions of each block and stage, draws connecting lines,
 * and handles user interactions like editing blocks and highlighting paths.
 * It also provides a simplified, linear view for mobile devices.
 *
 * @param {FunnelVisualizerProps} props - The props passed to the component.
 * @returns {JSX.Element} The rendered FunnelVisualizer component.
 */
const FunnelVisualizer = React.memo(
	React.forwardRef<
		{ handleBlockClick: (blockId: string) => void },
		FunnelVisualizerProps
	>(
		(
			{
				funnelFlow,
				editingBlockId,
				setEditingBlockId,
				onBlockUpdate,
				selectedOffer,
				onOfferSelect,
				isDeployed = false,
				funnelId,
				user,
			},
			ref,
		) => {
			// Ref to store DOM elements for measurement
			const blockRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

			const EXPLANATION_AREA_WIDTH = 250;

			// Use custom hooks for layout and interaction logic
			const {
				positions,
				lines,
				stageLayouts,
				itemCanvasWidth,
				totalCanvasHeight,
				layoutPhase,
				performanceMode,
				enableCalculationsForOfferSelection,
				enableCalculationsForBlockHighlight,
				enableCalculationsForGoLive,
			} = useFunnelLayout(funnelFlow, editingBlockId, blockRefs, funnelId);

			const {
				selectedOfferBlockId,
				setSelectedOfferBlockId,
				selectedBlockForHighlight,
				setSelectedBlockForHighlight,
				offerBlocks,
				highlightedPath,
				selectedPath,
				handleBlockClick,
			} = useFunnelInteraction(
				funnelFlow,
				editingBlockId,
				setEditingBlockId,
				selectedOffer,
				performanceMode,
				enableCalculationsForOfferSelection,
				enableCalculationsForBlockHighlight,
			);

			// Separate visualization state saving (funnel flow saving is now handled by generation API)
			const { autoSave } = useAutoSaveVisualization({
				funnelId: funnelId || "",
				layoutPhase,
				positions,
				lines,
				stageLayouts,
				canvasDimensions: {
					itemCanvasWidth,
					totalCanvasHeight,
				},
				interactions: {
					selectedOfferBlockId,
					selectedBlockForHighlight,
					highlightedPath: {
						blocks: Array.from(highlightedPath.blocks),
						options: Array.from(highlightedPath.options),
					},
				},
				viewport: {
					scrollLeft: 0,
					scrollTop: 0,
					zoom: 1,
				},
				preferences: {
					showStageLabels: true,
					compactMode: false,
					connectionStyle: "curved" as const,
					autoLayout: true,
				},
				editingBlockId,
				user,
			});

			// Auto-save effect - separate from layout calculations
			React.useEffect(() => {
				if (
					funnelId &&
					layoutPhase === "final" &&
					Object.keys(positions).length > 0 &&
					lines.length > 0 &&
					!editingBlockId
				) {
					// Use setTimeout to avoid calling autoSave during render
					const timeoutId = setTimeout(() => {
						autoSave();
					}, 500); // Longer delay to ensure layout is stable

					return () => clearTimeout(timeoutId);
				}
			}, [funnelId, layoutPhase, positions, lines, editingBlockId, autoSave]);

			// Expose functions to parent component via ref
			React.useImperativeHandle(ref, () => ({
				handleBlockClick,
				enableCalculationsForGoLive,
			}));

			if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks) {
				return (
					<div className="flex items-center justify-center h-full text-gray-400 p-8 text-center">
						<div className="text-center">
							<div className="text-lg mb-2">
								Add resources and click 'Generate' to build and visualize your
								new funnel.
							</div>
							<div className="text-sm text-gray-500">
								{!funnelFlow
									? "Flow is null/undefined"
									: !funnelFlow.stages
										? "No stages found"
										: !funnelFlow.blocks
											? "No blocks found"
											: "Unknown error"}
							</div>
						</div>
					</div>
				);
			}

			return (
				<div className="w-full h-full">
					{/* Mobile View */}
					<MobileFunnelView
						funnelFlow={funnelFlow}
						selectedOfferBlockId={selectedOfferBlockId}
						selectedPath={selectedPath}
						editingBlockId={editingBlockId}
						setEditingBlockId={setEditingBlockId}
						onBlockUpdate={onBlockUpdate}
						handleBlockClick={handleBlockClick}
						isDeployed={isDeployed}
					/>

					{/* Desktop View */}
					<FunnelCanvas
						itemCanvasWidth={itemCanvasWidth}
						totalCanvasHeight={totalCanvasHeight}
						EXPLANATION_AREA_WIDTH={EXPLANATION_AREA_WIDTH}
					>
						{/* Stage Explanations */}
						<FunnelStage
							stageLayouts={stageLayouts}
							itemCanvasWidth={itemCanvasWidth}
							EXPLANATION_AREA_WIDTH={EXPLANATION_AREA_WIDTH}
						/>

						{/* Funnel Blocks and Lines */}
						<div
							className="absolute top-0 h-full"
							style={{
								left: `${EXPLANATION_AREA_WIDTH}px`,
								width: `${itemCanvasWidth}px`,
							}}
						>
							{Object.keys(positions).length === 0 ? (
								<div className="flex items-center justify-center h-full text-gray-400">
									<div className="text-center">
										<div className="text-lg mb-2">Calculating layout...</div>
										<div className="text-sm">Layout phase: {layoutPhase}</div>
										<div className="text-sm">
											Positions: {Object.keys(positions).length}
										</div>
									</div>
								</div>
							) : (
								<>
									<FunnelConnections lines={lines} />
									{Object.values(funnelFlow.blocks).map((block) => (
										<div
											key={block.id}
											ref={(el) => {
												blockRefs.current[block.id] = el;
											}}
											onClick={() => handleBlockClick(block.id)}
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
												left: `calc(50% + ${(positions[block.id]?.x || 0) - (editingBlockId === block.id ? 160 : 112)}px)`,
												top: `${positions[block.id]?.y || 0}px`,
												opacity: positions[block.id]?.opacity ?? 1,
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
																<CollapsibleText
																	text={block.id}
																	maxLength={20}
																/>
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
														);
													})()}
												</>
											)}
										</div>
									))}
								</>
							)}
						</div>
					</FunnelCanvas>
				</div>
			);
		},
	),
);

FunnelVisualizer.displayName = "FunnelVisualizer";

export default FunnelVisualizer;
