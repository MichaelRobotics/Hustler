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
	sendDmCardVisible?: boolean,
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
	const SEND_DM_ESTIMATED_HEIGHT = 48; // Small icon (40px + 8px padding); used for SEND_DM stage

	// Track funnelFlow identity to detect actual data changes (block saves)
	const prevFunnelFlowRef = React.useRef(funnelFlow);
	React.useEffect(() => {
		if (prevFunnelFlowRef.current === funnelFlow) return; // same reference, skip
		prevFunnelFlowRef.current = funnelFlow;

		if (performanceMode) {
			// Data changed after initial layout (e.g. block save) — unlock for one recalc
			setLayoutPhase("final");
			setPerformanceMode(false);
			return;
		}

		blockRefs.current = {};
		setLayoutPhase("measure");
		setLayoutCompleted(false);
		setPerformanceMode(false);
	}, [funnelFlow, performanceMode]);

	// Recalculate layout when Send DM card changes height:
	// - icon ↔ card toggle (sendDmCardVisible)
	// - card ↔ editor toggle (editingBlockId) — editor is taller, cards below must move
	const prevSendDmCardVisibleRef = React.useRef(sendDmCardVisible);
	const prevEditingBlockIdRef = React.useRef(editingBlockId);
	React.useEffect(() => {
		const cardVisChanged = prevSendDmCardVisibleRef.current !== sendDmCardVisible;
		const editChanged = prevEditingBlockIdRef.current !== editingBlockId;
		prevSendDmCardVisibleRef.current = sendDmCardVisible;
		prevEditingBlockIdRef.current = editingBlockId;
		if (!cardVisChanged && !editChanged) return; // skip mount
		const timer = setTimeout(() => {
			setLayoutPhase("final");
			setPerformanceMode(false);
		}, 50);
		return () => clearTimeout(timer);
	}, [sendDmCardVisible, editingBlockId]);

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

		// Performance mode: skip recalculation entirely until explicitly unlocked
		if (performanceMode) {
			return;
		}

		let maxStageWidth = 0;

		// Calculate stage widths first
		funnelFlow.stages.forEach((stage) => {
			const itemsInStage = stage.blockIds;
			const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
			maxStageWidth = Math.max(maxStageWidth, stageWidth);
		});

		// Helper: get estimated height for a stage (SEND_DM is small icon; others use default)
		const isSendDmStage = (stage: FunnelStage) => stage.name === "SEND_DM";
		const estimatedHeightForStage = (stage: FunnelStage) =>
			isSendDmStage(stage) ? SEND_DM_ESTIMATED_HEIGHT : ESTIMATED_BLOCK_HEIGHT;

		if (layoutPhase === "measure") {
			// Phase 1: Set initial positions for measurement
			const measurePositions: Record<string, Position> = {};
			let currentY = 0;

			funnelFlow.stages.forEach((stage) => {
				const itemsInStage = stage.blockIds;
				const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
				const stageEstHeight = estimatedHeightForStage(stage);

				itemsInStage.forEach((blockId, itemIndex) => {
					const xPos = itemIndex * ITEM_WIDTH - stageWidth / 2;
					measurePositions[blockId] = { x: xPos, y: currentY, opacity: 1 };
				});

				currentY += stageEstHeight + STAGE_Y_GAP;
			});

			setItemCanvasWidth(maxStageWidth + ITEM_WIDTH);
			setTotalCanvasHeight(currentY);
			setPositions(measurePositions);

			// Set temporary stage layouts for measurement
			const tempStageLayouts: StageLayout[] = [];
			let tempY = 0;
			funnelFlow.stages.forEach((stage) => {
				const stageEstHeight = estimatedHeightForStage(stage);
				tempStageLayouts.push({
					...stage,
					y: tempY,
					height: stageEstHeight,
				});
				tempY += stageEstHeight + STAGE_Y_GAP;
			});
			setStageLayouts(tempStageLayouts);

			// Calculate lines with estimated heights (so arrows are visible immediately)
			// Build a map of blockId → stage for quick lookup
			const blockStageMap = new Map<string, FunnelStage>();
			funnelFlow.stages.forEach((stage) => {
				stage.blockIds.forEach((bid) => blockStageMap.set(bid, stage));
			});
			const measureLines: Line[] = [];
			Object.values(funnelFlow.blocks).forEach((block) => {
				const blockStage = blockStageMap.get(block.id);
				const blockEstHeight = blockStage ? estimatedHeightForStage(blockStage) : ESTIMATED_BLOCK_HEIGHT;
				block.options?.forEach((opt, index) => {
					if (
						opt.nextBlockId &&
						measurePositions[block.id] &&
						measurePositions[opt.nextBlockId]
					) {
						measureLines.push({
							id: `${block.id}-${opt.nextBlockId}-${index}`,
							x1: measurePositions[block.id].x,
							y1: measurePositions[block.id].y + blockEstHeight,
							x2: measurePositions[opt.nextBlockId].x,
							y2: measurePositions[opt.nextBlockId].y,
						});
					}
				});
			});
			setLines(measureLines);
		} else if (layoutPhase === "final") {
			// Phase 2: Calculate final positions based on actual heights
			// Build a map of blockId → stage for correct fallback heights
			const blockStageMapFinal = new Map<string, FunnelStage>();
			funnelFlow.stages.forEach((stage) => {
				stage.blockIds.forEach((bid) => blockStageMapFinal.set(bid, stage));
			});
			const heights: Record<string, number> = {};
			Object.keys(funnelFlow.blocks).forEach((id) => {
				const element = blockRefs.current[id];
				const stg = blockStageMapFinal.get(id);
				const fallback = stg && isSendDmStage(stg) ? SEND_DM_ESTIMATED_HEIGHT : ESTIMATED_BLOCK_HEIGHT;
				heights[id] = element?.offsetHeight || fallback;
			});

			const finalPositions: Record<string, Position> = {};
			const finalStageLayouts: StageLayout[] = [];
			let currentY = 0;

			funnelFlow.stages.forEach((stage) => {
				const itemsInStage = stage.blockIds;
				const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
				const minHeight = isSendDmStage(stage) ? SEND_DM_ESTIMATED_HEIGHT : ESTIMATED_BLOCK_HEIGHT;

				// Calculate the maximum height of blocks in this stage
				const maxBlockHeightInStage = Math.max(
					minHeight, // Minimum height (smaller for SEND_DM icon)
					...itemsInStage.map((id) => heights[id] || minHeight),
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

			// Calculate lines with actual heights (heights map already has correct fallbacks per stage)
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
							y1: finalPositions[block.id].y + heights[block.id],
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
	}, [funnelFlow, layoutPhase, layoutCompleted, performanceMode]);

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
