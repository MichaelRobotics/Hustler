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
    const [layoutVersion, setLayoutVersion] = React.useState(0);
    
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
        setLayoutVersion(0);
        blockRefs.current = {};
    }, [funnelFlow]);

    // Layout effect to calculate positions and draw the funnel.
    React.useLayoutEffect(() => {
        if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks || Object.keys(funnelFlow.blocks).length === 0) return;

        // Step 1: Render invisible placeholders to measure dimensions.
        if (layoutVersion === 0) {
            const placeholderPositions: Record<string, Position> = {};
            Object.keys(funnelFlow.blocks).forEach(id => {
                placeholderPositions[id] = { x: 0, y: 0, opacity: 0 };
            });
            setPositions(placeholderPositions);
            setLayoutVersion(1);
            return;
        }

        // Step 2: Once refs are available, calculate the final positions.
        if (layoutVersion === 1) {
            const allRefsAvailable = funnelFlow.stages.every(stage => stage.blockIds.every(id => blockRefs.current[id]));
            if (!allRefsAvailable) return;

            const heights: Record<string, number> = {};
            Object.keys(funnelFlow.blocks).forEach(id => {
                heights[id] = blockRefs.current[id]?.offsetHeight || 0;
            });

            const newPositions: Record<string, Position> = {};
            const newStageLayouts: StageLayout[] = [];
            const ITEM_WIDTH = 280;
            const STAGE_Y_GAP = 120;
            let currentY = 0;
            let maxStageWidth = 0;

            funnelFlow.stages.forEach((stage) => {
                const itemsInStage = stage.blockIds;
                const stageWidth = (itemsInStage.length - 1) * ITEM_WIDTH;
                maxStageWidth = Math.max(maxStageWidth, stageWidth);
                let maxBlockHeightInStage = Math.max(0, ...itemsInStage.map(id => heights[id] || 0));
                itemsInStage.forEach((blockId, itemIndex) => {
                    const xPos = (itemIndex * ITEM_WIDTH) - (stageWidth / 2);
                    newPositions[blockId] = { x: xPos, y: currentY, opacity: 1 };
                });
                newStageLayouts.push({ ...stage, y: currentY, height: maxBlockHeightInStage });
                currentY += maxBlockHeightInStage + STAGE_Y_GAP;
            });
            
            setItemCanvasWidth(maxStageWidth + ITEM_WIDTH);
            setTotalCanvasHeight(currentY);
            setPositions(newPositions);
            setStageLayouts(newStageLayouts);

            const newLines: Line[] = [];
            Object.values(funnelFlow.blocks).forEach(block => {
                block.options?.forEach((opt, index) => {
                    if (opt.nextBlockId && newPositions[block.id] && newPositions[opt.nextBlockId]) {
                        newLines.push({
                            id: `${block.id}-${opt.nextBlockId}-${index}`,
                            x1: newPositions[block.id].x,
                            y1: newPositions[block.id].y + (heights[block.id] || 0),
                            x2: newPositions[opt.nextBlockId].x,
                            y2: newPositions[opt.nextBlockId].y,
                        });
                    }
                });
            });
            setLines(newLines);
            setLayoutVersion(2);
        }
    }, [funnelFlow, layoutVersion, editingBlockId]);

    if (!funnelFlow || !funnelFlow.stages || !funnelFlow.blocks) {
        return <div className="flex items-center justify-center h-full text-gray-400 p-8 text-center">Add resources and click 'Generate' to build and visualize your new funnel.</div>;
    }

    const getPathD = (line: Line): string => `M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + 60}, ${line.x2} ${line.y2 - 60}, ${line.x2} ${line.y2}`;

    return (
        <div className="w-full h-full">
            {/* Mobile View */}
            <div className="md:hidden p-4">
                {/* Mobile path selector */}
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

