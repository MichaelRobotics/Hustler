'use client';

import React, { memo } from 'react';

interface StoreHeaderProps {
  editorState: {
    isEditorView: boolean;
  };
  fixedTextStyles: {
    headerMessage?: {
      content: string;
      color: string;
      styleClass: string;
    };
    subHeader?: {
      content: string;
      color: string;
      styleClass: string;
    };
  };
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  legacyTheme: any;
  
  // Handlers
  setFixedTextStyles: (fn: (prev: any) => any) => void;
  applyThemeColorsToText: (textStyle: any, type: string) => string;
  getThemeColors: any;
  setEditingText: (text: any) => void;
  setInlineEditTarget: (target: string | null) => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = memo(({
  editorState,
  fixedTextStyles,
  backgroundAnalysis,
  legacyTheme,
  setFixedTextStyles,
  applyThemeColorsToText,
  getThemeColors,
  setEditingText,
  setInlineEditTarget,
}) => {
  const { headerMessage, subHeader } = fixedTextStyles || {};

  return (
    <div 
      className="text-center mb-2 relative w-full"
      onClick={(e) => {
        // Stop propagation to prevent background modal from opening when clicking on header area
        e.stopPropagation();
      }}
    >
      {/* Header Message */}
      <p 
        className={`${applyThemeColorsToText(headerMessage, 'header')} text-2xl md:text-4xl lg:text-5xl xl:text-6xl ${editorState.isEditorView ? 'cursor-pointer hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1' : ''}`}
        style={{ 
          color: headerMessage?.color, 
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent background modal from opening
          if (editorState.isEditorView) {
            // If modal is open for any text, don't handle clicks on page text elements
            if (false) { // editingText.isOpen check would go here
              return; // Do nothing when modal is open
            }
            // First click: open modal and immediately activate inline editing
            setEditingText({ isOpen: true, targetId: 'headerMessage' });
            setTimeout(() => setInlineEditTarget('headerMessage'), 100);
          }
        }}
      >
        {headerMessage?.content || ''}
      </p>
      
      {/* Sub Header */}
      <p 
        className={`${applyThemeColorsToText(subHeader, 'subheader')} text-sm md:text-base lg:text-lg xl:text-xl ${editorState.isEditorView ? 'cursor-pointer hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1' : ''}`}
        style={{ 
          color: subHeader?.color, 
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent background modal from opening
          if (editorState.isEditorView) {
            // If modal is open for any text, don't handle clicks on page text elements
            if (false) { // editingText.isOpen check would go here
              return; // Do nothing when modal is open
            }
            // First click: open modal and immediately activate inline editing
            setEditingText({ isOpen: true, targetId: 'subHeader' });
            setTimeout(() => setInlineEditTarget('subHeader'), 100);
          }
        }}
      >
        {subHeader?.content || ''}
      </p>
    </div>
  );
});

StoreHeader.displayName = 'StoreHeader';

