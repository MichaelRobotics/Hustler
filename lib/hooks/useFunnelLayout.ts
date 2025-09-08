import React from 'react';

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
  funnelId?: string
) => {
  // State for layout calculations
  const [positions, setPositions] = React.useState<Record<string, Position>>({});
  const [lines, setLines] = React.useState<Line[]>([]);
  const [stageLayouts, setStageLayouts] = React.useState<StageLayout[]>([]);
  const [itemCanvasWidth, setItemCanvasWidth] = React.useState(0);
  const [totalCanvasHeight, setTotalCanvasHeight] = React.useState(0);
  const [layoutPhase, setLayoutPhase] = React.useState<'measure' | 'final'>('measure');
  const [layoutCompleted, setLayoutCompleted] = React.useState(false);

  const ITEM_WIDTH = 280;
  const STAGE_Y_GAP = 120;
  const ESTIMATED_BLOCK_HEIGHT = 200; // Initial estimate for measurement phase

  // Reset layout when the funnel flow changes.
  React.useEffect(() => {
    // Only reset if layout is not completed
    if (layoutCompleted) {
      return; // Layout is completed, no more resets
    }
    
    blockRefs.current = {};
    setLayoutPhase('measure');
    setLayoutCompleted(false);
  }, [funnelFlow, layoutCompleted]);

  // Reset layout when editing state changes (blocks change dimensions)
  React.useEffect(() => {
    // Only allow recalculations if layout is not completed
    if (layoutCompleted) {
      return; // Layout is completed, no more recalculations
    }

    if (editingBlockId) {
      // When editing starts, we need to recalculate layout
      setLayoutPhase('measure');
      setLayoutCompleted(false);
    } else {
      // When editing ends, trigger final layout calculation
      if (Object.keys(positions).length > 0) {
        const timer = setTimeout(() => {
          setLayoutPhase('final');
        }, 100); // Slightly longer delay to ensure DOM updates
        
        return () => clearTimeout(timer);
      }
    }
  }, [editingBlockId, positions, layoutCompleted]);

  // Trigger final layout calculation after blocks are rendered and measured
  React.useEffect(() => {
    if (layoutPhase === 'measure' && funnelFlow?.blocks) {
      // Check if all blocks have been rendered and can be measured
      const allBlocksRendered = Object.keys(funnelFlow.blocks).every(id => 
        blockRefs.current[id] && blockRefs.current[id]?.offsetHeight > 0
      );
      
      if (allBlocksRendered) {
        // Small delay to ensure DOM is fully updated
        const timer = setTimeout(() => {
          setLayoutPhase('final');
        }, 50);
        
        return () => clearTimeout(timer);
      }
    }
  }, [layoutPhase, funnelFlow]); // Removed positions dependency to avoid circular dependency

  // Layout effect to calculate positions and draw the funnel.
  React.useLayoutEffect(() => {
    if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks || Object.keys(funnelFlow.blocks).length === 0) {
      return;
    }

    // Prevent any recalculations after layout is completed
    if (layoutCompleted) {
      return; // Layout is already completed, no more calculations
    }

    let maxStageWidth = 0;

    // Calculate stage widths first
    funnelFlow.stages.forEach((stage) => {
      const itemsInStage = stage.blockIds;
      const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
      maxStageWidth = Math.max(maxStageWidth, stageWidth);
    });

    if (layoutPhase === 'measure') {
      // Phase 1: Set initial positions for measurement
      const measurePositions: Record<string, Position> = {};
      let currentY = 0;

      funnelFlow.stages.forEach((stage) => {
        const itemsInStage = stage.blockIds;
        const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
        
        itemsInStage.forEach((blockId, itemIndex) => {
          const xPos = (itemIndex * ITEM_WIDTH) - (stageWidth / 2);
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
        tempStageLayouts.push({ ...stage, y: tempY, height: ESTIMATED_BLOCK_HEIGHT });
        tempY += ESTIMATED_BLOCK_HEIGHT + STAGE_Y_GAP;
      });
      setStageLayouts(tempStageLayouts);
      setLines([]);
      
    } else if (layoutPhase === 'final') {
      // Phase 2: Calculate final positions based on actual heights
      const heights: Record<string, number> = {};
      Object.keys(funnelFlow.blocks).forEach(id => {
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
          ...itemsInStage.map(id => heights[id] || ESTIMATED_BLOCK_HEIGHT)
        );
        
        itemsInStage.forEach((blockId, itemIndex) => {
          const xPos = (itemIndex * ITEM_WIDTH) - (stageWidth / 2);
          finalPositions[blockId] = { x: xPos, y: currentY, opacity: 1 };
        });
        
        finalStageLayouts.push({ ...stage, y: currentY, height: maxBlockHeightInStage });
        currentY += maxBlockHeightInStage + STAGE_Y_GAP;
      });
      
      setItemCanvasWidth(maxStageWidth + ITEM_WIDTH);
      setTotalCanvasHeight(currentY);
      setPositions(finalPositions);
      setStageLayouts(finalStageLayouts);

      // Calculate lines with actual heights
      const finalLines: Line[] = [];
      Object.values(funnelFlow.blocks).forEach(block => {
        block.options?.forEach((opt, index) => {
          if (opt.nextBlockId && finalPositions[block.id] && finalPositions[opt.nextBlockId]) {
            finalLines.push({
              id: `${block.id}-${opt.nextBlockId}-${index}`,
              x1: finalPositions[block.id].x,
              y1: finalPositions[block.id].y + (heights[block.id] || ESTIMATED_BLOCK_HEIGHT),
              x2: finalPositions[opt.nextBlockId].x,
              y2: finalPositions[opt.nextBlockId].y,
            });
          }
        });
      });
      setLines(finalLines);
      
      // Mark layout as completed after final phase calculations are done
      setLayoutCompleted(true);
    }
  }, [funnelFlow, layoutPhase, editingBlockId, layoutCompleted]);

  return {
    positions,
    lines,
    stageLayouts,
    itemCanvasWidth,
    totalCanvasHeight,
    layoutPhase
  };
};
