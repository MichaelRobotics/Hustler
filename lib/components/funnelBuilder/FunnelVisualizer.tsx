"use client";

import { Button, Heading, Text } from "frosted-ui";
import {
	Move,
	ArrowUpCircle,
	ArrowDownCircle,
	Hexagon,
	Diamond,
	CircleDot,
	Crosshair,
	Octagon,
	Square,
	Triangle,
	RectangleHorizontal,
	Circle,
	Pentagon,
	SquareDot,
	OctagonAlert,
	CircleEllipsis,
	RectangleVertical,
	CircleDashed,
	VectorSquare,
	GripVertical,
} from "lucide-react";
import React from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	horizontalListSortingStrategy,
	useSortable,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	CROSS_STAGE_SHAPE_POOL,
	getCrossStageColorById,
	getCrossStageShapeById,
} from "../../utils/crossStageStyles";

/** Map shape name (PascalCase) to Lucide icon for cross-stage badges */
const SHAPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
	Hexagon,
	Diamond,
	CircleDot,
	Crosshair,
	Octagon,
	Square,
	Triangle,
	RectangleHorizontal,
	Circle,
	Pentagon,
	SquareDot,
	OctagonAlert,
	CircleEllipsis,
	RectangleVertical,
	CircleDashed,
	VectorSquare,
};
import { useFunnelInteraction } from "../../hooks/useFunnelInteraction";
import { useFunnelLayout } from "../../hooks/useFunnelLayout";
import { useAutoSaveVisualization } from "../../hooks/useVisualizationPersistence";
import CollapsibleText from "../common/CollapsibleText";
import BlockEditor from "./BlockEditor";
import FunnelCanvas from "./FunnelCanvas";
import FunnelStage from "./FunnelStage";
import TriggerBlock, { type TriggerType } from "./TriggerBlock";

import MobileFunnelView from "./MobileFunnelView";

// Add Option Input Component
interface AddOptionInputProps {
	blockId: string;
	onAdd: (blockId: string, optionText: string) => void;
}

const AddOptionInput: React.FC<AddOptionInputProps> = ({ blockId, onAdd }) => {
	const [newOptionText, setNewOptionText] = React.useState("");

	return (
		<div className="flex items-center gap-2 rounded-xl p-3 border border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
			<button
				onClick={() => {
					if (newOptionText.trim()) {
						onAdd(blockId, newOptionText.trim());
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
			<input
				type="text"
				value={newOptionText}
				onChange={(e) => setNewOptionText(e.target.value)}
				placeholder="Add new option..."
				className="flex-1 text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
				onKeyDown={(e) => {
					if (e.key === "Enter" && newOptionText.trim() && !e.shiftKey) {
						e.preventDefault();
						onAdd(blockId, newOptionText.trim());
						setNewOptionText("");
					}
				}}
			/>
		</div>
	);
};

// Wrapper for horizontal reorder within a stage (uses @dnd-kit useSortable)
const SortableBlockWrapper: React.FC<{
	blockId: string;
	blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
	positionStyle: React.CSSProperties;
	disabled: boolean;
	children: (dragHandleProps: { attributes: Record<string, unknown>; listeners: Record<string, unknown> } | null) => React.ReactNode;
}> = ({ blockId, blockRefs, positionStyle, disabled, children }) => {
	const { setNodeRef, transform, attributes, listeners } = useSortable({
		id: blockId,
		disabled,
	});
	const combinedRef = (el: HTMLDivElement | null) => {
		(blockRefs as React.MutableRefObject<Record<string, HTMLDivElement | null>>).current[blockId] = el;
		setNodeRef(el);
	};
	return (
		<div
			ref={combinedRef}
			style={{
				...positionStyle,
				transform: CSS.Transform.toString(transform),
			}}
		>
			{children(disabled ? null : { attributes: attributes as unknown as Record<string, unknown>, listeners: (listeners ?? {}) as unknown as Record<string, unknown> })}
		</div>
	);
};

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
	cardType?: "qualification" | "product";
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
	selectedCategory?: "Membership" | "App" | null; // Which trigger category is selected in the panel (for deriving selectedTrigger/triggerConfig)
	membershipTriggerType?: TriggerType; // Membership category trigger
	appTriggerType?: TriggerType; // App category trigger
	membershipTriggerConfig?: { resourceId?: string; funnelId?: string; cancelType?: "any" | "specific" }; // Config for membership trigger
	appTriggerConfig?: { resourceId?: string; funnelId?: string; cancelType?: "any" | "specific" }; // Config for app trigger
	delayMinutes?: number; // App trigger delay (backward compatibility)
	membershipDelayMinutes?: number; // Membership trigger delay
	resources?: Array<{ id: string; name: string }>; // For membership_buy trigger
	funnels?: Array<{ id: string; name: string }>; // All funnels (e.g. for delete_merchant_conversation)
	qualificationFunnels?: Array<{ id: string; name: string }>; // Qualification-type funnels for qualification_merchant_complete
	upsellFunnels?: Array<{ id: string; name: string }>; // Upsell-type funnels for upsell_merchant_complete
	loadingResources?: boolean;
	loadingFunnels?: boolean;
	onResourceChange?: (resourceId: string) => void; // For membership_buy, cancel_membership triggers
	onFunnelChange?: (funnelId: string) => void; // For qualification/upsell/delete_merchant_conversation triggers
	onMembershipFilterChange?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void;
	onAppFilterChange?: (updates: { filterResourceIdsRequired?: string[]; filterResourceIdsExclude?: string[] }) => void;
	profiles?: Array<{ id: string; name: string }>;
	onQualificationProfileChange?: (profileId: string) => void;
	onTriggerClick?: () => void; // Callback when trigger block is clicked (backward compatibility)
	onMembershipTriggerClick?: () => void; // Callback when membership trigger is clicked
	onAppTriggerClick?: () => void; // Callback when app trigger is clicked
	onDelayChange?: (minutes: number) => void; // Callback when app delay changes (backward compatibility)
	onMembershipDelayChange?: (minutes: number) => void; // Callback when membership delay changes
	onDelaySave?: (minutes: number) => void; // Callback when app delay is saved (backward compatibility)
	onMembershipDelaySave?: (minutes: number) => void; // Callback when membership delay is saved
	hasUnsavedTriggerConfig?: boolean;
	onTriggerConfigSave?: () => void;
	hasUnsavedAppTriggerConfig?: boolean;
	hasUnsavedMembershipTriggerConfig?: boolean;
	onAppTriggerConfigSave?: () => void;
	onMembershipTriggerConfigSave?: () => void;
	merchantType?: "qualification" | "upsell";
	onUpsellClick?: (blockId: string) => void;
	onDownsellClick?: (blockId: string) => void;
	onAddNewOption?: (blockId: string, optionText: string) => void;
	onStageUpdate?: (stageId: string, updates: { name?: string; explanation?: string; blockIds?: string[] }) => void; // Callback for stage name/explanation or card order
	pendingOptionSelection?: {
		isActive: boolean;
		sourceBlockId: string;
		optionText: string;
		newBlockId: string;
		nextStageBlockIds: string[];
		upsellKind?: "upsell" | "downsell";
		onlyPlaceholderSelectable?: boolean;
		optionIndex?: number;
		previousNextBlockId?: string | null;
	} | null; // Selection mode state
	pendingCardTypeSelection?: {
		newBlockId: string;
		newStageId: string;
		sourceBlockId: string;
		optionText: string;
		optionIndex?: number;
	} | null; // Card type selection state (for new stages)
	onCardTypeSelection?: (cardType: "qualification" | "product") => void; // Callback when card type is selected
	onOptionConnectRequest?: (blockId: string, optionIndex: number) => void; // Callback to enter connect mode (same flow as add new option: new + existing cards)
	onCardSelection?: (blockId: string) => void; // Callback when card is selected in selection mode
	onClearCardSelection?: () => void; // Callback when click outside card (clear upsell/downsell selection)
	pendingDelete?: {
		blockId: string;
		affectedOptions: Array<{ blockId: string; optionIndex: number }>;
		outgoingConnections: Array<{ targetBlockId: string }>;
		orphanedNextStageCards: string[];
		brokenPreviousStageCards: string[];
		invalidOptions: Array<{ blockId: string; optionIndex: number; reason: string }>;
	} | null; // Pending delete state
	onDeleteClick?: (blockId: string) => void; // Callback when delete button is clicked
	onConfirmDelete?: () => void; // Callback when confirm delete is clicked
	onCancelDelete?: () => void; // Callback when delete is cancelled
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
				selectedCategory,
				membershipTriggerType,
				appTriggerType,
				membershipTriggerConfig = {},
				appTriggerConfig = {},
				delayMinutes = 0, // App trigger delay (backward compatibility)
				membershipDelayMinutes = 0, // Membership trigger delay
				resources = [],
				funnels = [],
				qualificationFunnels = [],
				upsellFunnels = [],
				loadingResources = false,
				loadingFunnels = false,
				onResourceChange,
				onFunnelChange,
				onMembershipFilterChange,
				onAppFilterChange,
				profiles,
				onQualificationProfileChange,
				onTriggerClick, // Backward compatibility
				onMembershipTriggerClick,
				onAppTriggerClick,
				onDelayChange, // App trigger delay (backward compatibility)
				onMembershipDelayChange, // Membership trigger delay
				onDelaySave, // App trigger delay (backward compatibility)
				onMembershipDelaySave, // Membership trigger delay
				hasUnsavedTriggerConfig,
				onTriggerConfigSave,
				hasUnsavedAppTriggerConfig,
				hasUnsavedMembershipTriggerConfig,
				onAppTriggerConfigSave,
				onMembershipTriggerConfigSave,
				merchantType,
				onUpsellClick,
				onDownsellClick,
				onAddNewOption,
				pendingOptionSelection,
				onCardSelection,
				onClearCardSelection,
				pendingDelete,
				onDeleteClick,
				onConfirmDelete,
				onCancelDelete,
				onStageUpdate,
				pendingCardTypeSelection,
				onCardTypeSelection,
				onOptionConnectRequest,
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

			// Drag-and-drop: reorder cards horizontally within a stage
			const sensors = useSensors(
				useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
				useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
				useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
			);
			const handleStageBlockReorder = (event: DragEndEvent) => {
				const { active, over } = event;
				if (!over || active.id === over.id || !onStageUpdate || !funnelFlow?.stages) return;
				const stage = funnelFlow.stages.find((s) => s.blockIds?.includes(active.id as string));
				if (!stage || !stage.blockIds.includes(over.id as string)) return;
				const oldIndex = stage.blockIds.indexOf(active.id as string);
				const newIndex = stage.blockIds.indexOf(over.id as string);
				if (oldIndex === -1 || newIndex === -1) return;
				const newBlockIds = arrayMove(stage.blockIds, oldIndex, newIndex);
				onStageUpdate(stage.id, { blockIds: newBlockIds });
			};

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

			const isUpsellDownsellSelectionActive = !!(pendingOptionSelection?.isActive && pendingOptionSelection?.upsellKind);
			const isCardTypeSelectionActive = !!(pendingCardTypeSelection && merchantType !== "upsell");
			const isQualificationOptionSelectionActive = !!(pendingOptionSelection?.isActive && !pendingOptionSelection?.upsellKind);
			const shouldClearOnCanvasClick = isUpsellDownsellSelectionActive || isCardTypeSelectionActive || isQualificationOptionSelectionActive;

			return (
				<div
					className="w-full h-full"
					onClick={shouldClearOnCanvasClick ? () => onClearCardSelection?.() : undefined}
				>
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
						editingBlockId={editingBlockId}
						selectedTrigger={selectedCategory === "App" ? (appTriggerType ?? "on_app_entry") : (membershipTriggerType)}
						membershipTrigger={membershipTriggerType}
						appTrigger={appTriggerType}
						triggerConfig={selectedCategory === "App" ? (appTriggerConfig ?? {}) : (membershipTriggerConfig ?? {})}
						membershipTriggerConfig={membershipTriggerConfig}
						appTriggerConfig={appTriggerConfig}
						delayMinutes={delayMinutes} // App trigger delay (backward compatibility)
						membershipDelayMinutes={membershipDelayMinutes} // Membership trigger delay
						experienceId={user?.experienceId}
						resources={resources}
						funnels={funnels}
						qualificationFunnels={qualificationFunnels}
						upsellFunnels={upsellFunnels}
						loadingResources={loadingResources}
						loadingFunnels={loadingFunnels}
						onResourceChange={onResourceChange}
						onFunnelChange={onFunnelChange}
						onMembershipFilterChange={onMembershipFilterChange}
						onAppFilterChange={onAppFilterChange}
						profiles={profiles}
						onQualificationProfileChange={onQualificationProfileChange}
						onTriggerClick={onTriggerClick} // Backward compatibility
						onMembershipTriggerClick={onMembershipTriggerClick}
						onAppTriggerClick={onAppTriggerClick}
						onDelayChange={onDelayChange} // App trigger delay (backward compatibility)
						onMembershipDelayChange={onMembershipDelayChange} // Membership trigger delay
						onDelaySave={onDelaySave} // App trigger delay (backward compatibility)
						onMembershipDelaySave={onMembershipDelaySave} // Membership trigger delay
						hasUnsavedTriggerConfig={hasUnsavedTriggerConfig}
						onTriggerConfigSave={onTriggerConfigSave}
						hasUnsavedAppTriggerConfig={hasUnsavedAppTriggerConfig}
						hasUnsavedMembershipTriggerConfig={hasUnsavedMembershipTriggerConfig}
						onAppTriggerConfigSave={onAppTriggerConfigSave}
						onMembershipTriggerConfigSave={onMembershipTriggerConfigSave}
						startBlockId={funnelFlow?.startBlockId}
						firstBlockY={positions[funnelFlow?.startBlockId || ""]?.y || 120}
						firstStageY={stageLayouts[0]?.y || 80}
						firstStageHeight={stageLayouts[0]?.height || 150}
					>
						{/* Stage Explanations */}
						<FunnelStage
							stageLayouts={stageLayouts}
							itemCanvasWidth={itemCanvasWidth}
							EXPLANATION_AREA_WIDTH={EXPLANATION_AREA_WIDTH}
							onStageUpdate={onStageUpdate}
							disableStageEditing={!!(pendingOptionSelection?.isActive && pendingOptionSelection?.upsellKind)}
						/>

						{/* Funnel Blocks and Lines */}
						<div
						className="absolute top-0"
							style={{
								left: `${EXPLANATION_AREA_WIDTH}px`,
								width: `${itemCanvasWidth}px`,
							height: `${totalCanvasHeight}px`,
							}}
						>
							{Object.keys(positions).length === 0 && Object.keys(funnelFlow.blocks).length > 0 ? (
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
									{/* Connection Lines SVG - Same coordinate space as blocks */}
									<svg
										className="absolute top-0 left-0 pointer-events-none"
										width={itemCanvasWidth}
										height={totalCanvasHeight}
										style={{ overflow: "visible" }}
									>
										<defs>
											<marker
												id="funnel-arrow"
												viewBox="0 0 10 10"
												refX="9"
												refY="5"
												markerWidth="6"
												markerHeight="6"
												orient="auto-start-reverse"
											>
												<path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
											</marker>
											<marker
												id="funnel-arrow-red"
												viewBox="0 0 10 10"
												refX="9"
												refY="5"
												markerWidth="6"
												markerHeight="6"
												orient="auto-start-reverse"
											>
												<path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
											</marker>
											<marker
												id="funnel-arrow-teal"
												viewBox="0 0 10 10"
												refX="9"
												refY="5"
												markerWidth="6"
												markerHeight="6"
												orient="auto-start-reverse"
											>
												<path d="M 0 0 L 10 5 L 0 10 z" fill="#0d9488" />
											</marker>
											<marker
												id="funnel-arrow-amber"
												viewBox="0 0 10 10"
												refX="9"
												refY="5"
												markerWidth="6"
												markerHeight="6"
												orient="auto-start-reverse"
											>
												<path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
											</marker>
										</defs>
										{lines.map((line) => {
											// Parse line.id: sourceBlockId-targetBlockId-optionIndex (last segment = index, second-to-last = target)
											const parts = line.id.split("-");
											const indexStr = parts[parts.length - 1];
											const optionIndex = parseInt(indexStr, 10);
											const targetBlockId = parts.length >= 2 ? parts[parts.length - 2] : "";
											const sourceBlockId = parts.length >= 3 ? parts.slice(0, -2).join("-") : "";

											// Skip drawing arrow for cross-stage upsell/downsell (target not in stage immediately after source)
											if (funnelFlow?.blocks && funnelFlow?.stages && merchantType === "upsell" && !Number.isNaN(optionIndex) && (optionIndex === 0 || optionIndex === 1)) {
												const sourceBlock = funnelFlow.blocks[sourceBlockId] as { upsellBlockId?: string | null; downsellBlockId?: string | null } | undefined;
												if (sourceBlock && (sourceBlock.upsellBlockId !== undefined || sourceBlock.downsellBlockId !== undefined)) {
													const sourceStageIndex = funnelFlow.stages.findIndex((s) => s.blockIds?.includes(sourceBlockId));
													const targetStageIndex = funnelFlow.stages.findIndex((s) => s.blockIds?.includes(targetBlockId));
													if (targetStageIndex !== sourceStageIndex + 1) {
														return null;
													}
												}
											}

											// Center offset for SVG coordinates (blocks use calc(50% + x))
											const centerX = itemCanvasWidth / 2;
											const x1 = centerX + line.x1;
											const y1 = line.y1;
											const x2 = centerX + line.x2;
											const y2 = line.y2;
											
											// Calculate adaptive control points for smooth curves
											const distance = Math.abs(y2 - y1);
											const controlOffset = Math.min(Math.max(distance * 0.35, 30), 80);
											
											// Create bezier curve path
											const pathD = `M ${x1} ${y1} C ${x1} ${y1 + controlOffset}, ${x2} ${y2 - controlOffset}, ${x2} ${y2}`;
											
											// Check if this line is from deleted card (outgoing connection)
											const isFromDeletedCard = pendingDelete && line.id.startsWith(`${pendingDelete.blockId}-`);
											
											// Check if this line is to deleted card (incoming connection)
											const isToDeletedCard = pendingDelete && line.id.includes(`-${pendingDelete.blockId}-`);
											
											const isRedArrow = isFromDeletedCard || isToDeletedCard;
											
											// Upsell/Downsell line colors: index 0 = upsell (amber), 1 = downsell (teal)
											let stroke = "#6366f1";
											let markerEnd = "url(#funnel-arrow)";
											if (isRedArrow) {
												stroke = "#ef4444";
												markerEnd = "url(#funnel-arrow-red)";
											} else if (funnelFlow?.blocks && merchantType === "upsell") {
												if (Number.isNaN(optionIndex) === false && (optionIndex === 0 || optionIndex === 1)) {
													const blockId = sourceBlockId;
													const block = funnelFlow.blocks[blockId] as { upsellBlockId?: string | null; downsellBlockId?: string | null } | undefined;
													if (block && (block.upsellBlockId !== undefined || block.downsellBlockId !== undefined)) {
														stroke = optionIndex === 0 ? "#d97706" : "#0d9488";
														markerEnd = optionIndex === 0 ? "url(#funnel-arrow-amber)" : "url(#funnel-arrow-teal)";
													}
												}
											}
											
											return (
												<path
													key={line.id}
													d={pathD}
													stroke={stroke}
													strokeWidth="2"
													fill="none"
													markerEnd={markerEnd}
													opacity="0.7"
												/>
											);
										})}
									</svg>
									<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStageBlockReorder}>
									{funnelFlow.stages.map((stage) => (
										<SortableContext key={stage.id} items={stage.blockIds} strategy={horizontalListSortingStrategy}>
										{stage.blockIds.map((blockId) => {
											const block = funnelFlow.blocks[blockId];
											if (!block) return null;
											// Qualification selection (add new option or change connection): selectable = new card + next-stage cards
											const isInSelectionMode = pendingOptionSelection?.isActive && !pendingOptionSelection?.upsellKind && (
												block.id === pendingOptionSelection.newBlockId ||
												pendingOptionSelection.nextStageBlockIds.includes(block.id)
											);

											const isSelectionModeActive = !!pendingOptionSelection?.isActive;
											const blockStage = funnelFlow.stages.find((s) => s.blockIds?.includes(block.id));
										const isInWelcomeStage = blockStage?.name === "WELCOME";
										const isThisBlockSelectable = (() => {
											if (merchantType === "upsell" && pendingOptionSelection?.isActive) {
												if (block.id === pendingOptionSelection.sourceBlockId) return false;
												if (isInWelcomeStage) return false;
												if (pendingOptionSelection.onlyPlaceholderSelectable) {
													const sourceStageIndex = funnelFlow.stages.findIndex((s) => s.blockIds?.includes(pendingOptionSelection.sourceBlockId));
													const blockStageIndex = blockStage != null ? funnelFlow.stages.indexOf(blockStage) : -1;
													if (blockStageIndex >= 0 && sourceStageIndex >= 0 && blockStageIndex < sourceStageIndex) return false;
													return block.id === pendingOptionSelection.newBlockId;
												}
												return true;
											}
											return isInSelectionMode;
										})();
										// Upsell/Downsell selection: treat selectable cards as highlighted (same as qualification)
										const isUpsellDownsellSelectable = !!(pendingOptionSelection?.isActive && pendingOptionSelection?.upsellKind && isThisBlockSelectable);

										// Check if this card should be highlighted red (orphaned or broken)
										const isOrphaned = pendingDelete && pendingDelete.orphanedNextStageCards.includes(block.id);
										const isBroken = pendingDelete && pendingDelete.brokenPreviousStageCards.includes(block.id);
										const isRedHighlighted = isOrphaned || isBroken;

										const blockAny = block as any;
										const hasReferencedCard = !!blockAny.referencedBlockId;
										const isReferencedByOther = !!funnelFlow?.blocks && Object.values(funnelFlow.blocks).some(
											(b: any) => b && b.referencedBlockId === block.id
										);
										const showReferencedVisual = merchantType === "upsell" && (hasReferencedCard || isReferencedByOther);

										// Cross-stage upsell/downsell connections pointing to this block (for badges)
										const targetStageIndex = funnelFlow.stages.findIndex((s) => s.blockIds?.includes(block.id));
										const crossStageBadges: Array<{ kind: "upsell" | "downsell"; colorId: string; shapeId: string }> = [];
										if (merchantType === "upsell" && funnelFlow?.stages) {
											Object.values(funnelFlow.blocks).forEach((src: any) => {
												if (!src) return;
												if (src.upsellBlockId === block.id && src.upsellCrossStageStyle) {
													const sourceStageIndex = funnelFlow.stages.findIndex((s) => s.blockIds?.includes(src.id));
													if (targetStageIndex !== sourceStageIndex + 1) {
														crossStageBadges.push({ kind: "upsell", colorId: src.upsellCrossStageStyle.colorId, shapeId: src.upsellCrossStageStyle.shapeId });
													}
												}
												if (src.downsellBlockId === block.id && src.downsellCrossStageStyle) {
													const sourceStageIndex = funnelFlow.stages.findIndex((s) => s.blockIds?.includes(src.id));
													if (targetStageIndex !== sourceStageIndex + 1) {
														crossStageBadges.push({ kind: "downsell", colorId: src.downsellCrossStageStyle.colorId, shapeId: src.downsellCrossStageStyle.shapeId });
													}
												}
											});
										}

										// Source card: cross-stage state for Upsell/Downsell buttons (use assigned icon + color when cross-stage)
										const sourceStageIndexForBlock = funnelFlow.stages.findIndex((s) => s.blockIds?.includes(block.id));
										const upsellTargetStageIndex = blockAny.upsellBlockId ? funnelFlow.stages.findIndex((s) => s.blockIds?.includes(blockAny.upsellBlockId)) : -1;
										const isUpsellCrossStage = !!(blockAny.upsellBlockId && upsellTargetStageIndex >= 0 && upsellTargetStageIndex !== sourceStageIndexForBlock + 1 && blockAny.upsellCrossStageStyle);
										const downsellTargetStageIndex = blockAny.downsellBlockId ? funnelFlow.stages.findIndex((s) => s.blockIds?.includes(blockAny.downsellBlockId)) : -1;
										const isDownsellCrossStage = !!(blockAny.downsellBlockId && downsellTargetStageIndex >= 0 && downsellTargetStageIndex !== sourceStageIndexForBlock + 1 && blockAny.downsellCrossStageStyle);
										const upsellCrossStageColor = isUpsellCrossStage && blockAny.upsellCrossStageStyle ? getCrossStageColorById(blockAny.upsellCrossStageStyle.colorId) : null;
										const upsellCrossStageShape = isUpsellCrossStage && blockAny.upsellCrossStageStyle ? getCrossStageShapeById(blockAny.upsellCrossStageStyle.shapeId) : null;
										const UpsellIconComponent = upsellCrossStageShape ? SHAPE_ICON_MAP[upsellCrossStageShape.name] : null;
										const downsellCrossStageColor = isDownsellCrossStage && blockAny.downsellCrossStageStyle ? getCrossStageColorById(blockAny.downsellCrossStageStyle.colorId) : null;
										const downsellCrossStageShape = isDownsellCrossStage && blockAny.downsellCrossStageStyle ? getCrossStageShapeById(blockAny.downsellCrossStageStyle.shapeId) : null;
										const DownsellIconComponent = downsellCrossStageShape ? SHAPE_ICON_MAP[downsellCrossStageShape.name] : null;

											const dragDisabled = isDeployed || !!pendingOptionSelection?.isActive || !!pendingCardTypeSelection;
											const positionStyle = {
												left: `calc(50% + ${(positions[block.id]?.x || 0) - (editingBlockId === block.id ? 160 : 112)}px)`,
												top: `${positions[block.id]?.y || 0}px`,
												position: "absolute" as const,
											};
											return (
												<SortableBlockWrapper key={block.id} blockId={block.id} blockRefs={blockRefs} positionStyle={positionStyle} disabled={dragDisabled}>
													{(dragHandleProps) => (
										<div
											onClick={(e) => {
												// Clicks on the type-selection placeholder must not bubble (so canvas click-outside clears it)
												if (pendingCardTypeSelection && block.id === pendingCardTypeSelection.newBlockId) {
													e.stopPropagation();
													return;
												}
												// If in selection mode and this block is selectable, handle selection
												if (isSelectionModeActive && isThisBlockSelectable && onCardSelection) {
													e.stopPropagation();
													onCardSelection(block.id);
													return;
												}
												// Otherwise, normal block click behavior
												if (!isSelectionModeActive) {
													handleBlockClick(block.id);
												}
											}}
											className={`relative bg-surface/95 dark:bg-surface/90 border rounded-2xl shadow-2xl transform transition-all duration-300 backdrop-blur-sm ${
												showReferencedVisual ? "border-teal-500 dark:border-teal-400 ring-1 ring-teal-500/50 " : ""
											}${
												editingBlockId === block.id
													? "border-violet-500 ring-2 ring-violet-500/50 scale-105 w-80"
													: isInSelectionMode || isUpsellDownsellSelectable
														? "w-56 border-amber-500 ring-4 ring-amber-500 animate-pulse shadow-lg shadow-amber-500/50 cursor-pointer"
														: isRedHighlighted
															? "w-56 border-red-500 ring-2 ring-red-500"
															: isThisBlockSelectable && !isInSelectionMode && !isUpsellDownsellSelectable
																? "w-56 border-dashed border-amber-400/60 cursor-pointer hover:border-amber-400/80 " + (highlightedPath.blocks.has(block.id) ? "border-amber-400 shadow-lg shadow-amber-400/20" : "border-border/50 dark:border-border/30")
																: `w-56 hover:scale-105 hover:shadow-violet-500/20 ${
																		isSelectionModeActive
																			? "cursor-not-allowed opacity-50"
																			: "cursor-pointer"
																	} ${
																		highlightedPath.blocks.has(block.id)
																			? "border-amber-400 shadow-lg shadow-amber-400/20"
																			: "border-border/50 dark:border-border/30"
																	}`
											}`}
											style={{
												opacity: positions[block.id]?.opacity ?? 1,
												...((isInSelectionMode || isUpsellDownsellSelectable) && {
													boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.4), 0 0 15px rgba(245, 158, 11, 0.5), 0 0 25px rgba(245, 158, 11, 0.3)",
												}),
											}}
										>
											{editingBlockId === block.id ? (
												<BlockEditor
													block={block}
													funnelFlow={funnelFlow}
													onSave={onBlockUpdate}
													onCancel={() => setEditingBlockId(null)}
													onAddNewOption={merchantType === "qualification" ? onAddNewOption : undefined}
													onOptionConnectRequest={onOptionConnectRequest ? (blockId, optionIndex) => { setEditingBlockId(null); onOptionConnectRequest(blockId, optionIndex); } : undefined}
													pendingDelete={pendingDelete}
													merchantType={merchantType}
													resources={merchantType === "upsell" ? resources : undefined}
												/>
											) : (
												<>
													<div className={`border-b border-border/30 dark:border-border/20 p-3 rounded-t-2xl flex justify-between items-center ${crossStageBadges.length > 0 ? getCrossStageColorById(crossStageBadges[0].colorId)?.bgClass ?? "" : ""} bg-gradient-to-r from-violet-500/5 to-purple-500/5 dark:from-violet-900/10 dark:to-purple-900/10`}>
														{dragHandleProps && !isDeployed && (
															<span
																{...dragHandleProps.attributes}
																{...dragHandleProps.listeners}
																data-no-drag
																className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 flex-shrink-0"
																title="Drag to reorder"
																onClick={(e) => e.stopPropagation()}
															>
																<GripVertical className="w-4 h-4 text-muted-foreground" />
															</span>
														)}
														<div className="flex-1 min-w-0 mr-2 flex flex-wrap items-center gap-1.5">
															{showReferencedVisual && (
																<svg className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
																</svg>
															)}
															{crossStageBadges.length > 0 && crossStageBadges.map((badge, idx) => {
																const color = getCrossStageColorById(badge.colorId);
																const shape = getCrossStageShapeById(badge.shapeId);
																const IconComponent = shape ? SHAPE_ICON_MAP[shape.name] : null;
																return IconComponent && color
																	? <IconComponent key={`${badge.kind}-${badge.colorId}-${badge.shapeId}-${idx}`} className={`w-3 h-3 flex-shrink-0 self-center ${color.textClass}`} />
																	: null;
															})}
															<span className={`text-xs font-bold leading-none min-w-0 truncate ${crossStageBadges.length > 0 ? (getCrossStageColorById(crossStageBadges[0].colorId)?.textClass ?? "text-violet-600 dark:text-violet-400") : "text-violet-600 dark:text-violet-400"}`}>
																<CollapsibleText
																	text={(block as any).headline ?? block.id}
																	maxLength={12}
																/>
															</span>
														</div>
														<div className="flex items-center gap-2">
														<button
															onClick={() => {
																// Prevent editing when in selection mode
																if (isSelectionModeActive) {
																	return;
																}
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
														{onDeleteClick && (
															<button
																onClick={() => {
																	// Prevent deletion when in selection mode
																	if (isSelectionModeActive) {
																		return;
																	}
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
																					<h4 class="font-semibold text-sm mb-1">Cannot delete conversation when Merchant is live</h4>
																					<p class="text-xs text-green-100 mb-2">
																						To make it offline, click Live button below
																					</p>
																				</div>
																			</div>
																		`;
																		document.body.appendChild(notification);
																		setTimeout(() => {
																			notification.remove();
																		}, 4000);
																		return;
																	}
																	// If this card is pending delete, confirm deletion
																	if (pendingDelete && pendingDelete.blockId === block.id) {
																		onConfirmDelete?.();
																	} else {
																		// Otherwise, initiate delete
																		onDeleteClick(block.id);
																	}
																}}
																className={`p-1.5 rounded-lg transition-colors duration-200 flex-shrink-0 ${
																	isDeployed
																		? "text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-not-allowed"
																		: pendingDelete && pendingDelete.blockId === block.id
																		? "bg-red-500 hover:bg-red-600 text-white font-semibold"
																		: "text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
																}`}
																title={pendingDelete && pendingDelete.blockId === block.id ? "Confirm deletion" : "Delete card"}
															>
																{pendingDelete && pendingDelete.blockId === block.id ? (
																	<span className="text-xs">Confirm</span>
																) : (
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
																			d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
																		/>
																	</svg>
																)}
															</button>
														)}
														</div>
													</div>
													<div className="p-4">
														{/* Card Type Selection UI (for new stages - qualification only; upsell always uses product cards) */}
														{pendingCardTypeSelection && block.id === pendingCardTypeSelection.newBlockId && merchantType !== "upsell" ? (
															<div className="flex flex-col gap-2">
																	{/* Qualification Card Option */}
																	<button
																		onClick={() => onCardTypeSelection?.("qualification")}
																		className="p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-500 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group flex flex-col items-center gap-2"
																	>
																		<div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
																			<svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
																			</svg>
																		</div>
																		<span className="text-xs font-semibold text-gray-900 dark:text-white">Qualification</span>
																	</button>

																	{/* Product Card Option */}
																	<button
																		onClick={() => onCardTypeSelection?.("product")}
																		className="p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-violet-500 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all group flex flex-col items-center gap-2"
																	>
																		<div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
																			<svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
																			</svg>
																		</div>
																		<span className="text-xs font-semibold text-gray-900 dark:text-white">Product</span>
																	</button>
															</div>
														) : isInSelectionMode && block.id === pendingOptionSelection?.newBlockId ? (
															<div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	className="w-8 h-8 animate-pulse"
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
																<p className="text-sm font-medium">Click to select this card</p>
															</div>
														) : (
															<p className="text-sm text-foreground text-left whitespace-pre-wrap leading-relaxed">
																{block.message}
															</p>
														)}
													</div>
													{!(pendingCardTypeSelection && block.id === pendingCardTypeSelection.newBlockId && merchantType !== "upsell") && (
													<div className="p-4 border-t border-border/30 dark:border-border/20 space-y-2">
														{/* Product selection: upsell always; qualification when stage is product card (same UX and link resolution as upsell) */}
														{(merchantType === "upsell" || blockStage?.cardType === "product") && (
															<div
																onClick={(e) => e.stopPropagation()}
																onMouseDown={(e) => e.stopPropagation()}
															>
																<div className="text-xs text-violet-600 dark:text-violet-400 font-bold mb-1.5 uppercase tracking-wider">
																	Product
																</div>
																{!isDeployed && !isSelectionModeActive ? (
																	<select
																		value={(block as any).resourceId ?? ""}
																		onChange={(e) => {
																			const v = e.target.value;
																			if (v === "" || !v) {
																				onBlockUpdate({
																					...block,
																					productSelectionType: undefined,
																					resourceId: null,
																					referencedBlockId: null,
																				} as any);
																			} else {
																				onBlockUpdate({
																					...block,
																					productSelectionType: "manual",
																					resourceId: v,
																					referencedBlockId: null,
																				} as any);
																			}
																		}}
																		onClick={(e) => e.stopPropagation()}
																		onMouseDown={(e) => e.stopPropagation()}
																		className="w-full text-xs rounded-xl px-3 py-2 text-foreground bg-surface/50 dark:bg-surface/30 border border-border/50 dark:border-border/30 focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
																	>
																		<option value="">Select product...</option>
																		{(resources ?? []).map((r) => (
																			<option key={r.id} value={r.id}>
																				{r.name}
																			</option>
																		))}
																	</select>
																) : (
																	<div className="text-xs text-foreground rounded-xl px-3 py-2 bg-surface/50 dark:bg-surface/30 border border-border/30 dark:border-border/20">
																		{(block as any).resourceId && (resources?.length ?? 0) > 0
																			? ((resources ?? []).find((r) => r.id === (block as any).resourceId)?.name ?? (block as any).resourceId)
																			: "—"}
																	</div>
																)}
															</div>
														)}
														{merchantType === "upsell" ? (
															<div className="grid grid-cols-2 gap-2">
																{!isDeployed && (onUpsellClick || onDownsellClick) ? (
																	<>
																		<button
																			type="button"
																			disabled={isSelectionModeActive}
																			aria-disabled={isSelectionModeActive}
																			onClick={() => {
																				if (isSelectionModeActive) return;
																				onUpsellClick?.(block.id);
																			}}
																			className={`text-xs font-medium rounded-xl py-3 px-3 transition-all border flex items-center justify-center gap-2 ${
																				isSelectionModeActive
																					? "opacity-50 cursor-not-allowed pointer-events-none"
																					: ""
																			} ${
																				(block as any).upsellBlockId
																					? isUpsellCrossStage && upsellCrossStageColor
																						? `${upsellCrossStageColor.bgClass} ${upsellCrossStageColor.borderClass} ${upsellCrossStageColor.textClass}`
																						: "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300"
																					: "bg-surface/50 dark:bg-surface/30 border-border/30 dark:border-border/20 hover:bg-surface/60 dark:hover:bg-surface/40 text-foreground"
																			}`}
																		>
																			{isUpsellCrossStage && UpsellIconComponent ? <UpsellIconComponent className="w-4 h-4 flex-shrink-0" /> : <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />}
																			Upsell
																		</button>
																		<button
																			type="button"
																			disabled={isSelectionModeActive}
																			aria-disabled={isSelectionModeActive}
																			onClick={() => {
																				if (isSelectionModeActive) return;
																				onDownsellClick?.(block.id);
																			}}
																			className={`text-xs font-medium rounded-xl py-3 pl-1.5 pr-4 text-left transition-all border flex items-center gap-2 ${
																				isSelectionModeActive
																					? "opacity-50 cursor-not-allowed pointer-events-none"
																					: ""
																			} ${
																				(block as any).downsellBlockId
																					? isDownsellCrossStage && downsellCrossStageColor
																						? `${downsellCrossStageColor.bgClass} ${downsellCrossStageColor.borderClass} ${downsellCrossStageColor.textClass}`
																						: "bg-teal-500/15 dark:bg-teal-500/20 border-teal-500/50 text-teal-700 dark:text-teal-300"
																					: "bg-surface/50 dark:bg-surface/30 border-border/30 dark:border-border/20 hover:bg-surface/60 dark:hover:bg-surface/40 text-foreground"
																			}`}
																		>
																			{isDownsellCrossStage && DownsellIconComponent ? <DownsellIconComponent className="w-4 h-4 flex-shrink-0" /> : <ArrowDownCircle className="w-4 h-4 flex-shrink-0" />}
																			Downsell
																		</button>
																	</>
																) : (
																	<>
																		<div
																			className={`text-xs font-medium rounded-xl py-3 px-3 transition-all border flex items-center justify-center gap-2 ${
																				(block as any).upsellBlockId
																					? isUpsellCrossStage && upsellCrossStageColor
																						? `${upsellCrossStageColor.bgClass} ${upsellCrossStageColor.borderClass} ${upsellCrossStageColor.textClass}`
																						: "bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300"
																					: "bg-surface/50 dark:bg-surface/30 border-border/30 dark:border-border/20 text-foreground"
																			}`}
																		>
																			{isUpsellCrossStage && UpsellIconComponent ? <UpsellIconComponent className="w-4 h-4 flex-shrink-0" /> : <ArrowUpCircle className="w-4 h-4 flex-shrink-0" />}
																			Upsell
																		</div>
																		<div
																			className={`text-xs font-medium rounded-xl py-3 pl-1.5 pr-4 text-left transition-all border flex items-center gap-2 ${
																				(block as any).downsellBlockId
																					? isDownsellCrossStage && downsellCrossStageColor
																						? `${downsellCrossStageColor.bgClass} ${downsellCrossStageColor.borderClass} ${downsellCrossStageColor.textClass}`
																						: "bg-teal-500/15 dark:bg-teal-500/20 border-teal-500/50 text-teal-700 dark:text-teal-300"
																					: "bg-surface/50 dark:bg-surface/30 border-border/30 dark:border-border/20 text-foreground"
																			}`}
																		>
																			{isDownsellCrossStage && DownsellIconComponent ? <DownsellIconComponent className="w-4 h-4 flex-shrink-0" /> : <ArrowDownCircle className="w-4 h-4 flex-shrink-0" />}
																			Downsell
																		</div>
																	</>
																)}
															</div>
														) : block.options && block.options.length > 0 && (() => {
															// Check if this block is in a TRANSITION stage
															const isTransitionBlock = funnelFlow.stages.some(
																stage => stage.name === "TRANSITION" && stage.blockIds.includes(block.id)
															);
															
															// Hide options for TRANSITION stage blocks (they represent external links)
															if (isTransitionBlock) {
																return null;
															}
															
															return (
																<>
																	{block.options.map((opt, i) => {
																		// Check if this option is invalid
																		const isInvalidOption = pendingDelete && pendingDelete.invalidOptions.some(
																			invalid => invalid.blockId === block.id && invalid.optionIndex === i
																		);
																		
																		// Check if this option is affected by pending delete (leads to deleted card)
																		const isAffectedOption = pendingDelete && pendingDelete.affectedOptions.some(
																			affected => affected.blockId === block.id && affected.optionIndex === i
																		);
																		
																		const isThisOptionConnecting = pendingOptionSelection?.sourceBlockId === block.id && pendingOptionSelection?.optionIndex === i;
																		return (
																		<div
																			key={`${block.id}-opt-${i}`}
																			className={`text-foreground text-xs rounded-xl p-3 text-left transition-all duration-300 ${
																				isInvalidOption || isAffectedOption
																					? "border-red-500 ring-2 ring-red-500 bg-red-500/10"
																					: highlightedPath.options.has(`${block.id}_${opt.nextBlockId}`)
																					? "bg-amber-500/20 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/20"
																					: isThisOptionConnecting
																					? "bg-amber-500/20 ring-1 ring-amber-500/50"
																					: "bg-surface/50 dark:bg-surface/30 hover:bg-surface/60 dark:hover:bg-surface/40 border border-border/30 dark:border-border/20"
																			}`}
																			onClick={pendingOptionSelection?.isActive && pendingOptionSelection.sourceBlockId !== block.id ? () => onCardSelection?.(block.id) : undefined}
																			role={pendingOptionSelection?.isActive ? "button" : undefined}
																		>
																			<div className="flex items-start gap-2">
																				<div className="flex-shrink-0 w-5 h-5 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
																					<span className="text-xs font-bold text-violet-600 dark:text-violet-400">
																						{i + 1}
																					</span>
																				</div>
																				<div className="flex-1 min-w-0">
																					<p className="whitespace-normal font-medium">
																						{opt.text}
																					</p>
																				</div>
																				{!isDeployed && onOptionConnectRequest && !opt.nextBlockId && (
																					<button
																						type="button"
																						onClick={(e) => {
																							e.stopPropagation();
																							onOptionConnectRequest(block.id, i);
																						}}
																						className="flex-shrink-0 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:underline"
																						title="Connect to a card"
																					>
																						Connect
																					</button>
																				)}
																			</div>
																		</div>
																		);
																	})}
																</>
															);
														})()}
														{/* Always visible "+" option with input field (qualification only) */}
														{!isDeployed && onAddNewOption && merchantType !== "upsell" && (() => {
															// Check if this block is in a TRANSITION stage
															const isTransitionBlock = funnelFlow.stages.some(
																stage => stage.name === "TRANSITION" && stage.blockIds.includes(block.id)
															);
															
															// Hide "+" option for TRANSITION stage blocks
															if (isTransitionBlock) {
																return null;
															}
															
															return <AddOptionInput blockId={block.id} onAdd={onAddNewOption} />;
														})()}
													</div>
													)}
												</>
											)}
										</div>
													)}
												</SortableBlockWrapper>
											);
										})}
										</SortableContext>
									))}
									</DndContext>
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
