'use client';

import React from 'react';
import { Heading, Text, Button } from 'frosted-ui';
import { Edit3, ChevronDown, Move } from 'lucide-react';
import BlockEditor from './BlockEditor';
import CollapsibleText from '../common/CollapsibleText';

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
  className = '',
  isMobile = false
}) => {
  const [position, setPosition] = React.useState(initialPosition);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button only
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
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
      y: touch.clientY - rect.top
    });
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  const handleTouchMove = React.useCallback((e: TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y
      });
      e.preventDefault();
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div
      className={`${isMobile ? 'fixed' : 'absolute'} z-10 select-none ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'move'
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

interface StageLayout extends FunnelStage {
  y: number;
  height: number;
}

interface FunnelVisualizerProps {
  funnelFlow: FunnelFlow | null;
  editingBlockId: string | null;
  setEditingBlockId: (blockId: string | null) => void;
  onBlockUpdate: (block: FunnelBlock) => void;
  selectedOffer?: string | null;
  onOfferSelect?: (offerId: string) => void; // New: callback when offer is selected from visualization
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
const FunnelVisualizer: React.FC<FunnelVisualizerProps> = ({ 
  funnelFlow, 
  editingBlockId, 
  setEditingBlockId, 
  onBlockUpdate,
  selectedOffer,
  onOfferSelect
}) => {
    // State for layout calculations
    const [positions, setPositions] = React.useState<Record<string, Position>>({});
    const [lines, setLines] = React.useState<Line[]>([]);
    const [stageLayouts, setStageLayouts] = React.useState<StageLayout[]>([]);
    const [itemCanvasWidth, setItemCanvasWidth] = React.useState(0);
    const [totalCanvasHeight, setTotalCanvasHeight] = React.useState(0);
    const [layoutPhase, setLayoutPhase] = React.useState<'measure' | 'final'>('measure');
    
    // State for user interaction
    const [selectedOfferBlockId, setSelectedOfferBlockId] = React.useState<string | null>(null);
    const [selectedBlockForHighlight, setSelectedBlockForHighlight] = React.useState<string | null>(null);
    
    // Ref to store DOM elements for measurement
    const blockRefs = React.useRef<Record<string, HTMLDivElement | null>>({});



    const EXPLANATION_AREA_WIDTH = 250;

    // Memoized calculation to find all blocks in the 'OFFER' stage.
    const offerBlocks = React.useMemo(() => {
        if (!funnelFlow || !funnelFlow.stages) return [];
        const offerStage = funnelFlow.stages.find(s => s.name.toUpperCase().includes('OFFER'));
        if (!offerStage) return [];
        return offerStage.blockIds.map(id => funnelFlow.blocks[id]);
    }, [funnelFlow]);

    // Memoized calculation to determine the path to a highlighted block.
    const highlightedPath = React.useMemo(() => {
        const path = { blocks: new Set<string>(), options: new Set<string>() };
        if (!funnelFlow || !selectedBlockForHighlight) return path;

        const reverseMap: Record<string, string[]> = {};
        Object.values(funnelFlow.blocks).forEach(block => {
            if (block.options) {
                block.options.forEach(opt => {
                    if (opt.nextBlockId) {
                        if (!reverseMap[opt.nextBlockId]) reverseMap[opt.nextBlockId] = [];
                        reverseMap[opt.nextBlockId].push(block.id);
                    }
                });
            }
        });

        const queue = [selectedBlockForHighlight];
        const visited = new Set([selectedBlockForHighlight]);
        path.blocks.add(selectedBlockForHighlight);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const parents = reverseMap[currentId] || [];
            for (const parentId of parents) {
                if (!visited.has(parentId)) {
                    visited.add(parentId);
                    path.blocks.add(parentId);
                    path.options.add(`${parentId}_${currentId}`);
                    queue.push(parentId);
                }
            }
        }
        return path;
    }, [funnelFlow, selectedBlockForHighlight]);

    const handleBlockClick = (blockId: string) => {
        if (editingBlockId) return; // Don't allow highlighting when editing
        setSelectedBlockForHighlight(prev => (prev === blockId ? null : blockId));
    };

    // Effect to set the default selected offer for the mobile view.
    React.useEffect(() => {
        if (offerBlocks.length > 0 && !offerBlocks.some(b => b.id === selectedOfferBlockId)) {
            setSelectedOfferBlockId(offerBlocks[0].id);
        }
    }, [offerBlocks, selectedOfferBlockId]);

    // Effect to highlight the path to the selected offer when it's chosen from the modal
    React.useEffect(() => {
        if (selectedOffer && funnelFlow) {
            console.log('=== OFFER PATH HIGHLIGHTING DEBUG ===');
            console.log('selectedOffer:', selectedOffer);
            console.log('funnelFlow.blocks:', Object.keys(funnelFlow.blocks));
            
            // Find the offer block in the flow
            // The offer block should have an ID like "offer_[resource_id]" based on our Gemini prompt
            let offerBlock = Object.values(funnelFlow.blocks).find(block => 
                block.id === `offer_${selectedOffer}` || // Direct match with offer_ prefix
                block.id === selectedOffer || // Direct match (fallback)
                (block.options && block.options.some(opt => opt.nextBlockId === selectedOffer)) // Option pointing to offer
            );
            
            // If not found with offer_ prefix, try to find any block that might be an offer
            if (!offerBlock) {
                offerBlock = Object.values(funnelFlow.blocks).find(block => 
                    block.id.includes('offer') || // Contains 'offer' in ID
                    block.id.includes(selectedOffer) // Contains the resource ID
                );
            }
            
            console.log('Found offerBlock:', offerBlock);
            
            if (offerBlock) {
                // Highlight the path to this offer
                console.log('Setting selectedBlockForHighlight to:', offerBlock.id);
                setSelectedBlockForHighlight(offerBlock.id);
            } else {
                console.log('No offerBlock found for selectedOffer:', selectedOffer);
                console.log('Available blocks:', Object.values(funnelFlow.blocks).map(b => ({ id: b.id, message: b.message?.substring(0, 50) })));
            }
        } else if (!selectedOffer) {
            // Clear highlighting when no offer is selected
            console.log('Clearing selectedBlockForHighlight - no offer selected');
            setSelectedBlockForHighlight(null);
        }
    }, [selectedOffer, funnelFlow]);

    // Effect to update selected offer when prop changes (for web view highlighting)
    React.useEffect(() => {
        if (selectedOffer) {
            setSelectedOfferBlockId(selectedOffer);
        }
    }, [selectedOffer]);

    // Memoized calculation for the path in the mobile view.
    const selectedPath = React.useMemo(() => {
        const path = { blocks: new Set<string>(), options: new Set<string>() };
        if (!funnelFlow || !selectedOfferBlockId) return path;
        const reverseMap: Record<string, string[]> = {};
        Object.values(funnelFlow.blocks).forEach(block => {
            if (block.options) {
                block.options.forEach(opt => {
                    if (opt.nextBlockId) {
                        if (!reverseMap[opt.nextBlockId]) reverseMap[opt.nextBlockId] = [];
                        reverseMap[opt.nextBlockId].push(block.id);
                    }
                });
            }
        });
        const queue = [selectedOfferBlockId];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            path.blocks.add(currentId);
            const parents = reverseMap[currentId] || [];
            parents.forEach(parentId => {
                if (!visited.has(parentId)) {
                    path.options.add(`${parentId}_${currentId}`);
                    queue.push(parentId);
                }
            });
        }
        return path;
    }, [funnelFlow, selectedOfferBlockId]);

    // Reset layout when the funnel flow changes.
    React.useEffect(() => {
        blockRefs.current = {};
        setLayoutPhase('measure');
    }, [funnelFlow]);

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
    }, [layoutPhase, funnelFlow, positions]);

    // Layout effect to calculate positions and draw the funnel.
    React.useLayoutEffect(() => {
        console.log('=== LAYOUT EFFECT DEBUG ===');
        console.log('layoutPhase:', layoutPhase);
        console.log('funnelFlow exists:', !!funnelFlow);
        console.log('funnelFlow.stages exists:', !!funnelFlow?.stages);
        console.log('funnelFlow.blocks exists:', !!funnelFlow?.blocks);
        console.log('blocks count:', Object.keys(funnelFlow?.blocks || {}).length);
        
        if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks || Object.keys(funnelFlow.blocks).length === 0) {
            console.log('Layout effect early return - missing data');
            return;
        }

        const ITEM_WIDTH = 280;
        const STAGE_Y_GAP = 120;
        const ESTIMATED_BLOCK_HEIGHT = 200; // Initial estimate for measurement phase
        let maxStageWidth = 0;

        // Calculate stage widths first
        funnelFlow.stages.forEach((stage) => {
            const itemsInStage = stage.blockIds;
            const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
            maxStageWidth = Math.max(maxStageWidth, stageWidth);
        });

        if (layoutPhase === 'measure') {
            console.log('=== MEASURE PHASE ===');
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
            console.log('=== FINAL PHASE ===');
            // Phase 2: Calculate final positions based on actual heights
            const heights: Record<string, number> = {};
            Object.keys(funnelFlow.blocks).forEach(id => {
                const element = blockRefs.current[id];
                heights[id] = element?.offsetHeight || ESTIMATED_BLOCK_HEIGHT;
            });
            console.log('Measured heights:', heights);
            


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
        }
    }, [funnelFlow, layoutPhase, editingBlockId]);

    // Debug: Log the funnelFlow prop and state
    console.log('=== FUNNEL VISUALIZER DEBUG ===');
    console.log('funnelFlow:', funnelFlow);
    console.log('funnelFlow type:', typeof funnelFlow);
    console.log('funnelFlow stages:', funnelFlow?.stages);
    console.log('funnelFlow blocks:', funnelFlow?.blocks);
    console.log('selectedOfferBlockId:', selectedOfferBlockId);
    console.log('selectedPath:', selectedPath);
    console.log('highlightedPath:', highlightedPath);
    console.log('layoutPhase:', layoutPhase);
    console.log('positions:', positions);
    console.log('stageLayouts:', stageLayouts);
    console.log('itemCanvasWidth:', itemCanvasWidth);
    console.log('totalCanvasHeight:', totalCanvasHeight);
    console.log('=== END FUNNEL VISUALIZER DEBUG ===');

    if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 p-8 text-center">
                <div className="text-center">
                    <div className="text-lg mb-2">Add resources and click 'Generate' to build and visualize your new funnel.</div>
                    <div className="text-sm text-gray-500">
                        {!funnelFlow ? 'Flow is null/undefined' : 
                         !funnelFlow.stages ? 'No stages found' : 
                         !funnelFlow.blocks ? 'No blocks found' : 'Unknown error'}
                    </div>
                </div>
            </div>
        );
    }

    const getPathD = (line: Line): string => `M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + 60}, ${line.x2} ${line.y2 - 60}, ${line.x2} ${line.y2}`;

    // Guard clause: if no funnelFlow, show loading or empty state
    if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks) {
        return (
            <div className="w-full h-full bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl text-gray-400 mb-4">No Funnel Flow Available</div>
                    <div className="text-sm text-gray-500">
                        {!funnelFlow ? 'Flow is null/undefined' : 
                         !funnelFlow.stages ? 'No stages found' : 
                         !funnelFlow.blocks ? 'No blocks found' : 'Unknown error'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            {/* Fallback: Show raw funnel data if visualization fails */}
            {(!selectedOfferBlockId || Object.keys(positions).length === 0) && (
                <div className="mb-4 p-4 bg-gray-800 rounded text-sm text-gray-300">
                    <div className="font-bold mb-2">Raw Funnel Data (Debug):</div>
                    <div className="space-y-2">
                        <div>Start Block: {funnelFlow.startBlockId}</div>
                        <div>Stages: {funnelFlow.stages.map(s => s.name).join(' → ')}</div>
                        <div>Blocks: {Object.keys(funnelFlow.blocks).join(', ')}</div>
                    </div>
                    <button 
                        onClick={() => {
                            console.log('Manual layout trigger');
                            setLayoutPhase('measure');
                        }}
                        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                        Force Layout Recalc
                    </button>
                </div>
            )}

            
            {/* Enhanced Mobile View with Frosted UI Design */}
            <div className="md:hidden p-4 space-y-6">
                {/* Draggable Debug Info for Mobile with Whop Design */}
                {/* Mobile Debug Panel - Hidden for production */}
                {/* <DraggableDebugPanel
                    initialPosition={{ x: 16, y: 16 }}
                    className="mb-6 p-4 bg-surface/95 dark:bg-surface/90 rounded-2xl text-xs border border-border/50 dark:border-border/30 shadow-lg backdrop-blur-sm cursor-move"
                    isMobile={true}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                        <span className="font-semibold text-violet-500">Mobile Debug</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                        <div>Selected Offer: {selectedOfferBlockId || 'None'}</div>
                        <div>Path Blocks: {selectedPath?.blocks?.size || 0}</div>
                        <div>Layout Phase: {layoutPhase}</div>
                        <div>Stages: {funnelFlow?.stages?.length || 0}</div>
                        <div>Total Blocks: {Object.keys(funnelFlow?.blocks || {}).length}</div>
                    </div>
                </DraggableDebugPanel> */}
                
                <div className="space-y-8">


                    {/* Mobile Funnel Flow - Only show blocks in selected path */}
                    {selectedOfferBlockId ? (
                        <div className="space-y-8">
                            {funnelFlow.stages.map((stage, stageIndex) => {
                                // Filter blocks to only show those in the selected path
                                const pathBlocks = stage.blockIds.filter(blockId => selectedPath.blocks.has(blockId));
                                
                                if (pathBlocks.length === 0) return null;
                                
                                return (
                                    <div key={stage.id}>
                                        <div className="text-center mb-6">
                                            <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200/50 dark:border-violet-700/30 rounded-xl p-4 mb-3">
                                                <h3 className="text-lg font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">{stage.name}</h3>
                                                <p className="text-sm text-muted-foreground leading-relaxed">{stage.explanation}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 flex flex-col items-center">
                                            {pathBlocks.map(blockId => {
                                                const block = funnelFlow.blocks[blockId];
                                                
                                                return (
                                                    <div
                                                        key={blockId}
                                                        ref={el => { blockRefs.current[blockId] = el; }}
                                                        onClick={() => handleBlockClick(blockId)}
                                                        className={`bg-surface/95 dark:bg-surface/90 border rounded-2xl shadow-xl w-full max-w-sm transition-all duration-300 backdrop-blur-sm ${
                                                            editingBlockId === blockId 
                                                                ? 'border-violet-500 ring-2 ring-violet-500/50 scale-105' 
                                                                : 'border-border/50 dark:border-border/30 hover:scale-105 hover:shadow-violet-500/20'
                                                        }`}
                                                    >
                                                        {editingBlockId === blockId ? (
                                                            <BlockEditor 
                                                                block={block} 
                                                                onSave={onBlockUpdate} 
                                                                onCancel={() => setEditingBlockId(null)} 
                                                            />
                                                        ) : (
                                                            <>
                                                                {/* Enhanced Block Header with Frosted UI */}
                                                                <div className="border-b border-border/30 dark:border-border/20 p-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5 dark:from-violet-900/10 dark:to-purple-900/10 rounded-t-2xl flex justify-between items-center">
                                                                    <div className="flex-1 min-w-0 mr-2">
                                                                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                                                                            <CollapsibleText text={block.id} maxLength={20} />
                                                                        </span>
                                                                    </div>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingBlockId(blockId);
                                                                        }} 
                                                                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors duration-200 flex-shrink-0"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Enhanced Block Message with Frosted UI */}
                                                                <div className="p-4">
                                                                    <p className="text-sm text-foreground text-left whitespace-pre-wrap leading-relaxed">{block.message}</p>
                                                                </div>
                                                                
                                                                {/* Enhanced Block Options with Frosted UI */}
                                                                {block.options && block.options.length > 0 && (
                                                                    <div className="p-4 border-t border-border/30 dark:border-border/20 space-y-2">
                                                                        {block.options.map((opt, i) => (
                                                                            <div 
                                                                                key={`${blockId}-opt-${i}`} 
                                                                                className={`text-foreground text-xs rounded-xl p-3 text-left transition-all duration-300 ${
                                                                                    selectedPath.options.has(`${blockId}_${opt.nextBlockId}`) 
                                                                                        ? 'bg-amber-500/20 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/20' 
                                                                                        : 'bg-surface/50 dark:bg-surface/30 hover:bg-surface/60 dark:hover:bg-surface/40 border border-border/30 dark:border-border/20'
                                                                                }`}
                                                                            >
                                                                                <div className="flex items-start gap-2">
                                                                                    <div className="flex-shrink-0 w-5 h-5 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
                                                                                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{i + 1}</span>
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <p className="whitespace-normal font-medium">{opt.text}</p>
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
                                            })}
                                        </div>
                                        
                                        {/* Enhanced Arrow separator between stages */}
                                        {stageIndex < funnelFlow.stages.length - 1 && (
                                            <div className="flex justify-center my-8">
                                                <div className="p-2 rounded-full bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50">
                                                    <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
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
                                    <svg className="w-8 h-8 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-foreground font-medium mb-2">No offer blocks found</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div>Available stages: {funnelFlow.stages.map(s => s.name).join(', ')}</div>
                                    <div>Total blocks: {Object.keys(funnelFlow.blocks).length}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Desktop View with Whop Design */}
            <div className="hidden md:flex items-start justify-center p-6 md:p-8 h-full overflow-auto relative">
                {/* Canvas Info - Hidden for production */}
                {/* <DraggableDebugPanel
                    initialPosition={{ x: 16, y: 16 }}
                    className="bg-surface/95 dark:bg-surface/90 text-foreground px-3 py-2 rounded-xl text-xs border border-border/50 dark:border-border/30 shadow-lg backdrop-blur-sm cursor-move"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                        <span className="font-semibold text-violet-500">Canvas Info</span>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                        <div>Size: {itemCanvasWidth}x{totalCanvasHeight}</div>
                        <div>Stages: {stageLayouts.length}</div>
                        <div>Blocks: {Object.keys(positions).length}</div>
                        <div>Connections: {lines.length}</div>
                    </div>
                </DraggableDebugPanel> */}
                
                {/* Draggable Drag Indicator with Whop Design */}
                <DraggableDebugPanel
                    initialPosition={{ x: 16, y: 80 }}
                    className="bg-surface/95 dark:bg-surface/90 text-foreground px-3 py-2 rounded-xl text-xs border border-border/50 dark:border-border/30 shadow-lg backdrop-blur-sm cursor-move"
                >
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-violet-100 dark:bg-violet-800/50">
                            <svg className="w-3 h-3 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </div>
                        <span className="font-medium">Drag to pan</span>
                    </div>
                </DraggableDebugPanel>
                <div 
                    className="relative transition-all duration-200"
                    style={{ 
                        width: `${itemCanvasWidth + EXPLANATION_AREA_WIDTH}px`, 
                        height: `${totalCanvasHeight}px`,
                        minWidth: 'fit-content',
                        minHeight: 'fit-content',
                        cursor: 'grab'
                    }}
                    onMouseDown={(e) => {
                        if (e.button === 0 && e.currentTarget) { // Left mouse button only
                            const target = e.currentTarget;
                            const parent = target.parentElement;
                            
                            if (!parent) return;
                            
                            target.style.cursor = 'grabbing';
                            const startX = e.clientX;
                            const startScrollLeft = parent.scrollLeft || 0;
                            
                            const handleMouseMove = (moveEvent: MouseEvent) => {
                                try {
                                    const deltaX = moveEvent.clientX - startX;
                                    if (parent && parent.scrollLeft !== undefined) {
                                        parent.scrollLeft = startScrollLeft - deltaX;
                                    }
                                } catch (error) {
                                    console.warn('Error during mouse move:', error);
                                }
                            };
                            
                            const handleMouseUp = () => {
                                if (target) {
                                    target.style.cursor = 'grab';
                                }
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (e.currentTarget) {
                            e.currentTarget.style.cursor = 'grab';
                        }
                    }}
                >
                    {/* Stage Explanations */}
                    {stageLayouts.map((layout, index) => (
                        <React.Fragment key={layout.id}>
                                                         <div 
                                 className="absolute text-left p-4" 
                                 style={{ 
                                     left: 0, 
                                     top: `${layout.y}px`, 
                                     width: `${EXPLANATION_AREA_WIDTH}px`, 
                                     height: `${layout.height}px`, 
                                     display: 'flex', 
                                     flexDirection: 'column', 
                                     justifyContent: 'center' 
                                 }}
                             >
                                <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200/50 dark:border-violet-700/30 rounded-xl p-3">
                                    <h3 className="text-lg font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">{layout.name}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{layout.explanation}</p>
                                </div>
                            </div>
                                                         {index < stageLayouts.length - 1 && (
                                 <div 
                                     className="absolute border-t-2 border-dashed border-violet-300 dark:border-violet-600 opacity-40" 
                                     style={{ 
                                         left: `${EXPLANATION_AREA_WIDTH}px`, 
                                         top: `${layout.y + layout.height + 60}px`, 
                                         width: `${itemCanvasWidth}px`,
                                         marginLeft: '20px',
                                         marginRight: '20px'
                                     }}
                                 />
                             )}
                        </React.Fragment>
                    ))}
                    {/* Funnel Blocks and Lines */}
                    <div className="absolute top-0 h-full" style={{ left: `${EXPLANATION_AREA_WIDTH}px`, width: `${itemCanvasWidth}px` }}>
                        {Object.keys(positions).length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="text-center">
                                    <div className="text-lg mb-2">Calculating layout...</div>
                                    <div className="text-sm">Layout phase: {layoutPhase}</div>
                                    <div className="text-sm">Positions: {Object.keys(positions).length}</div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <svg className="absolute top-0 left-0 w-full h-full" style={{ overflow: 'visible' }}>
                                    <g style={{ transform: `translateX(50%)` }}>
                                        <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#4a5568" /></marker></defs>
                                        {lines.map(line => <path key={line.id} d={getPathD(line)} stroke="#4a5568" strokeWidth="2" fill="none" markerEnd="url(#arrow)" />)}
                                    </g>
                                </svg>
                                {Object.values(funnelFlow.blocks).map(block => (
                                    <div
                                        key={block.id}
                                        ref={el => { blockRefs.current[block.id] = el; }}
                                        onClick={() => handleBlockClick(block.id)}
                                        className={`absolute bg-surface/95 dark:bg-surface/90 border rounded-2xl shadow-2xl transform transition-all duration-300 backdrop-blur-sm ${
                                            editingBlockId === block.id 
                                                ? 'border-violet-500 ring-2 ring-violet-500/50 scale-105 w-80' 
                                                : `w-56 hover:scale-105 hover:shadow-violet-500/20 cursor-pointer ${
                                                    highlightedPath.blocks.has(block.id) 
                                                        ? 'border-amber-400 shadow-lg shadow-amber-400/20' 
                                                        : 'border-border/50 dark:border-border/30'
                                                }`
                                        }`}
                                        style={{
                                            left: `calc(50% + ${(positions[block.id]?.x || 0) - (editingBlockId === block.id ? 160 : 112)}px)`,
                                            top: `${positions[block.id]?.y || 0}px`,
                                            opacity: positions[block.id]?.opacity ?? 1
                                        }}
                                    >
                                        {editingBlockId === block.id ? (
                                            <BlockEditor block={block} onSave={onBlockUpdate} onCancel={() => setEditingBlockId(null)} />
                                        ) : (
                                            <>
                                                <div className="border-b border-border/30 dark:border-border/20 p-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5 dark:from-violet-900/10 dark:to-purple-900/10 rounded-t-2xl flex justify-between items-center">
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                                                            <CollapsibleText text={block.id} maxLength={20} />
                                                        </span>
                                                    </div>
                                                    <button onClick={() => setEditingBlockId(block.id)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-violet-100 dark:hover:bg-violet-800/50 transition-colors duration-200 flex-shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="p-4">
                                                    <p className="text-sm text-foreground text-left whitespace-pre-wrap leading-relaxed">{block.message}</p>
                                                </div>
                                                {block.options && block.options.length > 0 && (
                                                    <div className="p-4 border-t border-border/30 dark:border-border/20 space-y-2">
                                                        {block.options.map((opt, i) => (
                                                            <div key={`${block.id}-opt-${i}`} className={`text-foreground text-xs rounded-xl p-3 text-left transition-all duration-300 ${highlightedPath.options.has(`${block.id}_${opt.nextBlockId}`) ? 'bg-amber-500/20 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/20' : 'bg-surface/50 dark:bg-surface/30 hover:bg-surface/60 dark:hover:bg-surface/40 border border-border/30 dark:border-border/20'}`}>
                                                                <div className="flex items-start gap-2">
                                                                    <div className="flex-shrink-0 w-5 h-5 bg-violet-100 dark:bg-violet-800/50 border border-violet-200 dark:border-violet-700/50 rounded-full flex items-center justify-center">
                                                                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{i + 1}</span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="whitespace-normal font-medium">{opt.text}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FunnelVisualizer;

