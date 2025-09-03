'use client';

import React from 'react';
import BlockEditor from './BlockEditor';
import CollapsibleText from '../common/CollapsibleText';

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
  isDeployed = false
}) => {
  return (
    <div className="md:hidden p-4 space-y-6">
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
                                {!isDeployed && (
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
                                )}
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
  );
};

export default MobileFunnelView;


