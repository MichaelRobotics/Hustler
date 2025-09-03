'use client';

import React from 'react';

interface FunnelStageProps {
  stageLayouts: Array<{
    id: string;
    name: string;
    explanation: string;
    blockIds: string[];
    y: number;
    height: number;
  }>;
  itemCanvasWidth: number;
  EXPLANATION_AREA_WIDTH: number;
}

const FunnelStage: React.FC<FunnelStageProps> = ({
  stageLayouts,
  itemCanvasWidth,
  EXPLANATION_AREA_WIDTH
}) => {
  return (
    <>
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
    </>
  );
};

export default FunnelStage;


