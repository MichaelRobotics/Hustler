'use client';

import React from 'react';

interface PromoButtonProps {
  funnelFlow: any;
  isFunnelActive: boolean;
  editorState: {
    isEditorView: boolean;
  };
  promoButton: {
    text: string;
    buttonClass: string;
    ringClass: string;
    ringHoverClass: string;
    icon: string;
  };
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  fixedTextStyles: {
    promoMessage?: {
      content: string;
      color: string;
      styleClass: string;
    };
  };
  legacyTheme: any;
  
  // Handlers
  onOpenProductEditor: (id: number | string | null, target: string) => void;
  setIsChatOpen: (open: boolean) => void;
  setFixedTextStyles: (fn: (prev: any) => any) => void;
  getThemeColors: any;
  applyThemeColorsToText: (textStyle: any, type: string) => string;
  getHoverRingClass: (ringClass: string) => string;
  getGlowBgClass: (ringClass: string) => string;
  getGlowBgStrongClass: (ringClass: string) => string;
}

export const PromoButton: React.FC<PromoButtonProps> = ({
  funnelFlow,
  isFunnelActive,
  editorState,
  promoButton,
  backgroundAnalysis,
  fixedTextStyles,
  legacyTheme,
  onOpenProductEditor,
  setIsChatOpen,
  setFixedTextStyles,
  getThemeColors,
  applyThemeColorsToText,
  getHoverRingClass,
  getGlowBgClass,
  getGlowBgStrongClass,
}) => {
  if (!funnelFlow || !isFunnelActive) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl my-1 text-center">
      {/* Promo Message */}
      <p
        onClick={() => {
          if (editorState.isEditorView) {
            // If modal is open for any text, don't handle clicks on page text elements
            if (false) { // editingText.isOpen check would go here
              return; // Do nothing when modal is open
            }
            // First click: open modal and immediately activate inline editing
            // setEditingText({ isOpen: true, targetId: 'promoMessage' });
            // setTimeout(() => setInlineEditTarget('promoMessage'), 100);
          }
        }}
        className={`${applyThemeColorsToText(fixedTextStyles.promoMessage, 'promo')} mb-8 drop-shadow-md ${editorState.isEditorView ? 'cursor-pointer hover:bg-white/10 rounded-lg p-2 transition-colors duration-200' : ''}`}
        style={{ 
          color: fixedTextStyles.promoMessage?.color, 
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)' 
        }}
      >
        {fixedTextStyles.promoMessage?.content || ''}
      </p>
      
      {/* Claim Button */}
      <div className="relative w-full mt-8">
        <button
          onClick={() => {
            if (editorState.isEditorView) {
              onOpenProductEditor(null, 'button');
            } else {
              // Open chat when gift button is clicked
              setIsChatOpen(true);
            }
          }}
          className={`group relative z-10 flex items-center justify-center w-full py-4 text-xl rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ${promoButton.ringClass} ${getHoverRingClass(promoButton.ringHoverClass)} ${promoButton.buttonClass} shadow-2xl`}
        >
          {promoButton.icon && (
            <span className="mr-3 text-2xl animate-pulse">
              {promoButton.icon}
            </span>
          )}
          {promoButton.text}
        </button>
        {/* Below-button glow (positioned vertically lower than the button) */}
        <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-6 w-full max-w-[110%] h-10 opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500 ${getGlowBgClass(promoButton.ringHoverClass)}`}></span>
        <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-4 w-full max-w-[90%] h-8 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-500 ${getGlowBgStrongClass(promoButton.ringHoverClass)}`}></span>
      </div>
    </div>
  );
};

