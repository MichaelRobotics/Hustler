import React from "react";

interface Position {
	x: number;
	y: number;
	opacity: number;
}

interface Line {
	id: string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

interface FunnelStage {
	id: string;
	name: string;
	explanation: string;
	blockIds: string[];
}

interface FunnelBlock {
	id: string;
	message: string;
	options: {
		text: string;
		nextBlockId: string | null;
	}[];
}

interface FunnelFlow {
	startBlockId: string;
	stages: FunnelStage[];
	blocks: Record<string, FunnelBlock>;
}

interface StageLayout extends FunnelStage {
	y: number;
	height: number;
}

export const useFunnelLayout = (
	funnelFlow: FunnelFlow | null,
	editingBlockId: string | null,
	blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
	funnelId?: string,
) => {
	// State for layout calculations
	const [positions, setPositions] = React.useState<Record<string, Position>>(
		{},
	);
	const [lines, setLines] = React.useState<Line[]>([]);
	const [stageLayouts, setStageLayouts] = React.useState<StageLayout[]>([]);
	const [itemCanvasWidth, setItemCanvasWidth] = React.useState(0);
	const [totalCanvasHeight, setTotalCanvasHeight] = React.useState(0);
	const [layoutPhase, setLayoutPhase] = React.useState<"measure" | "final">(
		"measure",
	);
	const [layoutCompleted, setLayoutCompleted] = React.useState(false);
	const [performanceMode, setPerformanceMode] = React.useState(false);

	const ITEM_WIDTH = 280;
	const STAGE_Y_GAP = 120;
	const ESTIMATED_BLOCK_HEIGHT = 200; // Initial estimate for measurement phase

	// Reset layout when the funnel flow changes.
	React.useEffect(() => {
		// Only reset if not in performance mode
		if (performanceMode) {
			return; // Performance mode active, no more resets
		}

		blockRefs.current = {};
		setLayoutPhase("measure");
		setLayoutCompleted(false);
		setPerformanceMode(false);
	}, [funnelFlow, performanceMode]);

	// Reset layout when editing state changes (blocks change dimensions)
	React.useEffect(() => {
		// Allow recalculations when editing ends, even in performance mode
		// This enables layout updates when blocks are saved
		if (!editingBlockId && Object.keys(positions).length > 0) {
			// When editing ends, trigger final layout calculation
			const timer = setTimeout(() => {
				setLayoutPhase("final");
			}, 100); // Slightly longer delay to ensure DOM updates

			return () => clearTimeout(timer);
		}
	}, [editingBlockId, positions]);

	// Trigger final layout calculation after blocks are rendered and measured
	React.useEffect(() => {
		if (layoutPhase === "measure" && funnelFlow?.blocks) {
			// Check if all blocks have been rendered and can be measured
			const allBlocksRendered = Object.keys(funnelFlow.blocks).every(
				(id) =>
					blockRefs.current[id] && blockRefs.current[id]?.offsetHeight > 0,
			);

			if (allBlocksRendered) {
				// Small delay to ensure DOM is fully updated
				const timer = setTimeout(() => {
					setLayoutPhase("final");
				}, 50);

				return () => clearTimeout(timer);
			}

			// Fallback timeout: force transition to final phase even if blocks aren't measured
			// This ensures layout completes even if ref measurement fails
			const fallbackTimer = setTimeout(() => {
				setLayoutPhase("final");
			}, 500); // 500ms fallback

			return () => clearTimeout(fallbackTimer);
		}
	}, [layoutPhase, funnelFlow]); // Removed positions dependency to avoid circular dependency

	// Layout effect to calculate positions and draw the funnel.
	React.useLayoutEffect(() => {
		if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks) {
			return;
		}

		const hasNoBlocks = Object.keys(funnelFlow.blocks).length === 0;
		const hasNoStages = funnelFlow.stages.length === 0;

		// Upsell minimal flow: empty stages and blocks (trigger-only). Set minimal layout so canvas has valid dimensions.
		if (hasNoStages || hasNoBlocks) {
			setItemCanvasWidth(ITEM_WIDTH);
			setTotalCanvasHeight(0);
			setPositions({});
			setStageLayouts([]);
			setLines([]);
			setLayoutCompleted(true);
			setPerformanceMode(true);
			return;
		}

		// Allow recalculations when layout phase is "final" (block save scenario)
		// This enables layout updates when blocks are saved, even in performance mode
		if (performanceMode && layoutPhase !== "final") {
			return; // Performance mode active, but allow final phase recalculations
		}

		let maxStageWidth = 0;

		// Calculate stage widths first
		funnelFlow.stages.forEach((stage) => {
			const itemsInStage = stage.blockIds;
			const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
			maxStageWidth = Math.max(maxStageWidth, stageWidth);
		});

		if (layoutPhase === "measure") {
			// Phase 1: Set initial positions for measurement
			const measurePositions: Record<string, Position> = {};
			let currentY = 0;

			funnelFlow.stages.forEach((stage) => {
				const itemsInStage = stage.blockIds;
				const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;

				itemsInStage.forEach((blockId, itemIndex) => {
					const xPos = itemIndex * ITEM_WIDTH - stageWidth / 2;
					measurePositions[blockId] = { x: xPos, y: currentY, opacity: 1 };
				});

				currentY += ESTIMATED_BLOCK_HEIGHT + STAGE_Y_GAP;
			});

			setItemCanvasWidth(maxStageWidth + ITEM_WIDTH);
			setTotalCanvasHeight(currentY);
			setPositions(measurePositions);

			// Set temporary stage layouts for measurement
			const tempStageLayouts: StageLayout[] = [];
			let tempY = 0;
			funnelFlow.stages.forEach((stage) => {
				tempStageLayouts.push({
					...stage,
					y: tempY,
					height: ESTIMATED_BLOCK_HEIGHT,
				});
				tempY += ESTIMATED_BLOCK_HEIGHT + STAGE_Y_GAP;
			});
			setStageLayouts(tempStageLayouts);

			// Calculate lines with estimated heights (so arrows are visible immediately)
			const measureLines: Line[] = [];
			Object.values(funnelFlow.blocks).forEach((block) => {
				block.options?.forEach((opt, index) => {
					if (
						opt.nextBlockId &&
						measurePositions[block.id] &&
						measurePositions[opt.nextBlockId]
					) {
						measureLines.push({
							id: `${block.id}-${opt.nextBlockId}-${index}`,
							x1: measurePositions[block.id].x,
							y1: measurePositions[block.id].y + ESTIMATED_BLOCK_HEIGHT,
							x2: measurePositions[opt.nextBlockId].x,
							y2: measurePositions[opt.nextBlockId].y,
						});
					}
				});
			});
			setLines(measureLines);
		} else if (layoutPhase === "final") {
			// Phase 2: Calculate final positions based on actual heights
			const heights: Record<string, number> = {};
			Object.keys(funnelFlow.blocks).forEach((id) => {
				const element = blockRefs.current[id];
				heights[id] = element?.offsetHeight || ESTIMATED_BLOCK_HEIGHT;
			});

			const finalPositions: Record<string, Position> = {};
			const finalStageLayouts: StageLayout[] = [];
			let currentY = 0;

			funnelFlow.stages.forEach((stage) => {
				const itemsInStage = stage.blockIds;
				const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;

				// Calculate the maximum height of blocks in this stage
				const maxBlockHeightInStage = Math.max(
					ESTIMATED_BLOCK_HEIGHT, // Minimum height
					...itemsInStage.map((id) => heights[id] || ESTIMATED_BLOCK_HEIGHT),
				);

				itemsInStage.forEach((blockId, itemIndex) => {
					const xPos = itemIndex * ITEM_WIDTH - stageWidth / 2;
					finalPositions[blockId] = { x: xPos, y: currentY, opacity: 1 };
				});

				finalStageLayouts.push({
					...stage,
					y: currentY,
					height: maxBlockHeightInStage,
				});
				currentY += maxBlockHeightInStage + STAGE_Y_GAP;
			});

			setItemCanvasWidth(maxStageWidth + ITEM_WIDTH);
			setTotalCanvasHeight(currentY);
			setPositions(finalPositions);
			setStageLayouts(finalStageLayouts);

			// Calculate lines with actual heights
			const finalLines: Line[] = [];
			Object.values(funnelFlow.blocks).forEach((block) => {
				block.options?.forEach((opt, index) => {
					if (
						opt.nextBlockId &&
						finalPositions[block.id] &&
						finalPositions[opt.nextBlockId]
					) {
						finalLines.push({
							id: `${block.id}-${opt.nextBlockId}-${index}`,
							x1: finalPositions[block.id].x,
							y1:
								finalPositions[block.id].y +
								(heights[block.id] || ESTIMATED_BLOCK_HEIGHT),
							x2: finalPositions[opt.nextBlockId].x,
							y2: finalPositions[opt.nextBlockId].y,
						});
					}
				});
			});
			setLines(finalLines);

			// Mark layout as completed after final phase calculations are done
			setLayoutCompleted(true);

			// Activate performance mode - freeze all calculations
			setPerformanceMode(true);
		}
	}, [funnelFlow, layoutPhase, editingBlockId, layoutCompleted]);

	// Functions for specific actions - performance mode stays active
	const enableCalculationsForOfferSelection = React.useCallback(() => {
		// Performance mode remains active - no calculations needed for offer selection
		// Highlighting calculations are handled by useFunnelInteraction hook
	}, []);

	const enableCalculationsForBlockHighlight = React.useCallback(() => {
		// Performance mode remains active - no calculations needed for block highlighting
		// Highlighting calculations are handled by useFunnelInteraction hook
	}, []);

	const enableCalculationsForGoLive = React.useCallback(() => {
		// Performance mode remains active - no layout calculations needed for Go Live
		// Deployment validation is handled by useFunnelDeployment hook
	}, []);

	return {
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
	};
};
