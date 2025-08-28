'use client';

import React from 'react';
import BlockEditor from './BlockEditor';

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
  onBlockUpdate 
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
        if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks || Object.keys(funnelFlow.blocks).length === 0) {
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
        }
    }, [funnelFlow, layoutPhase, editingBlockId]);

    if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks) {
        return <div className="flex items-center justify-center h-full text-gray-400 p-8 text-center">Add resources and click 'Generate' to build and visualize your new funnel.</div>;
    }

    const getPathD = (line: Line): string => `M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + 60}, ${line.x2} ${line.y2 - 60}, ${line.x2} ${line.y2}`;

    return (
        <div className="w-full h-full">

            
            {/* Mobile View */}
            <div className="md:hidden p-4">
                <div className="space-y-8">
                    {/* Mobile Path Selector */}
                    {offerBlocks.length > 0 && (
                        <div className="mb-6">
                            <label htmlFor="sequence-select" className="block text-sm font-medium text-gray-400 mb-2">
                                Showing DM Sequence For:
                            </label>
                            <select 
                                id="sequence-select" 
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                                value={selectedOfferBlockId || ''}
                                onChange={(e) => setSelectedOfferBlockId(e.target.value)}
                            >
                                {offerBlocks.map(block => {
                                    // Extract a readable name from the offer message
                                    const message = block.message;
                                    const resourceMatch = message.match(/✅\s*([^:]+)/);
                                    const resourceName = resourceMatch ? resourceMatch[1].trim() : block.id.replace('offer_', '').replace('_final', '');
                                    
                                    return (
                                        <option key={block.id} value={block.id}>
                                            {resourceName}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* Mobile Funnel Flow - Only show blocks in selected path */}
                    {selectedOfferBlockId && (
                        <div className="space-y-8">
                            {funnelFlow.stages.map((stage, stageIndex) => {
                                // Filter blocks to only show those in the selected path
                                const pathBlocks = stage.blockIds.filter(blockId => selectedPath.blocks.has(blockId));
                                
                                if (pathBlocks.length === 0) return null;
                                
                                return (
                                    <div key={stage.id}>
                                        <div className="text-center mb-4">
                                            <h3 className="text-lg font-bold text-violet-400 uppercase tracking-wider">{stage.name}</h3>
                                            <p className="text-sm text-gray-400 mt-1">{stage.explanation}</p>
                                        </div>
                                        <div className="space-y-4 flex flex-col items-center">
                                            {pathBlocks.map(blockId => {
                                                const block = funnelFlow.blocks[blockId];
                                                
                                                return (
                                                    <div
                                                        key={blockId}
                                                        ref={el => { blockRefs.current[blockId] = el; }}
                                                        onClick={() => handleBlockClick(blockId)}
                                                        className={`bg-gray-800 border rounded-lg shadow-lg w-full max-w-sm transition-all duration-300 border-gray-700 ${editingBlockId === blockId ? 'ring-2 ring-violet-500' : ''}`}
                                                    >
                                                        {editingBlockId === blockId ? (
                                                            <BlockEditor 
                                                                block={block} 
                                                                onSave={onBlockUpdate} 
                                                                onCancel={() => setEditingBlockId(null)} 
                                                            />
                                                        ) : (
                                                            <>
                                                                {/* Block Header */}
                                                                <div className="border-b border-gray-700 p-2 bg-gray-900/50 rounded-t-lg flex justify-between items-center">
                                                                    <p className="text-xs font-bold text-violet-400 text-left">{block.id}</p>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingBlockId(blockId);
                                                                        }} 
                                                                        className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                                
                                                                {/* Block Message */}
                                                                <div className="p-3">
                                                                    <p className="text-sm text-gray-200 text-left whitespace-pre-wrap">{block.message}</p>
                                                                </div>
                                                                
                                                                {/* Block Options */}
                                                                {block.options && block.options.length > 0 && (
                                                                    <div className="p-3 border-t border-gray-700 space-y-2">
                                                                        {block.options.map((opt, i) => (
                                                                            <div 
                                                                                key={`${blockId}-opt-${i}`} 
                                                                                className={`text-gray-300 text-xs rounded p-3 text-left transition-colors duration-300 ${
                                                                                    selectedPath.options.has(`${blockId}_${opt.nextBlockId}`) 
                                                                                        ? 'bg-yellow-500/20 ring-1 ring-yellow-500' 
                                                                                        : 'bg-gray-700/50'
                                                                                }`}
                                                                            >
                                                                                <p className="whitespace-normal">{opt.text}</p>
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
                                        
                                        {/* Arrow separator between stages */}
                                        {stageIndex < funnelFlow.stages.length - 1 && (
                                            <div className="flex justify-center my-6">
                                                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:flex items-start justify-center p-4 md:p-8">
                <div className="relative" style={{ width: `${itemCanvasWidth + EXPLANATION_AREA_WIDTH}px`, height: `${totalCanvasHeight}px` }}>
                    {/* Stage Explanations */}
                    {stageLayouts.map((layout, index) => (
                        <React.Fragment key={layout.id}>
                            <div className="absolute text-left p-4" style={{ left: 0, top: `${layout.y}px`, width: `200px`, height: `${layout.height}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h3 className="text-lg font-bold text-violet-400 uppercase tracking-wider">{layout.name}</h3>
                                <p className="text-sm text-gray-400 mt-1">{layout.explanation}</p>
                            </div>
                            {index < stageLayouts.length - 1 && <div className="absolute border-t-2 border-dashed border-gray-700" style={{ left: 0, top: `${layout.y + layout.height + 60}px`, width: '100%' }}></div>}
                        </React.Fragment>
                    ))}
                    {/* Funnel Blocks and Lines */}
                    <div className="absolute top-0 h-full" style={{ left: `${EXPLANATION_AREA_WIDTH}px`, width: `${itemCanvasWidth}px` }}>
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
                                className={`absolute bg-gray-800 border rounded-lg shadow-2xl w-56 transform transition-all duration-300 ${editingBlockId === block.id ? 'border-violet-500 ring-2 ring-violet-500 scale-105' : `hover:scale-105 hover:shadow-violet-500/20 cursor-pointer ${highlightedPath.blocks.has(block.id) ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-gray-700'}`}`}
                                style={{
                                    left: `calc(50% + ${(positions[block.id]?.x || 0) - 112}px)`,
                                    top: `${positions[block.id]?.y || 0}px`,
                                    opacity: positions[block.id]?.opacity ?? 1
                                }}
                            >
                                {editingBlockId === block.id ? (
                                    <BlockEditor block={block} onSave={onBlockUpdate} onCancel={() => setEditingBlockId(null)} />
                                ) : (
                                    <>
                                        <div className="border-b border-gray-700 p-2 bg-gray-900/50 rounded-t-lg flex justify-between items-center"><p className="text-xs font-bold text-violet-400 text-left">{block.id}</p><button onClick={() => setEditingBlockId(block.id)} className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-gray-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.536L16.732 3.732z" /></svg></button></div>
                                        <div className="p-3"><p className="text-sm text-gray-200 text-left whitespace-pre-wrap">{block.message}</p></div>
                                        {block.options && block.options.length > 0 && <div className="p-3 border-t border-gray-700 space-y-2">{block.options.map((opt, i) => (<div key={`${block.id}-opt-${i}`} className={`text-gray-300 text-xs rounded p-3 text-left transition-colors duration-300 ${highlightedPath.options.has(`${block.id}_${opt.nextBlockId}`) ? 'bg-yellow-500/20 ring-1 ring-yellow-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}><p className="whitespace-normal">{opt.text}</p></div>))}</div>}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FunnelVisualizer;

