'use client';

import React, { useState, useEffect } from 'react';

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
  isPromoButtonReady: boolean; // Updated prop name for promo button-specific loading
  
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
  isPromoButtonReady,
  onOpenProductEditor,
  setIsChatOpen,
  setFixedTextStyles,
  getThemeColors,
  applyThemeColorsToText,
  getHoverRingClass,
  getGlowBgClass,
  getGlowBgStrongClass,
}) => {
  const [showPromoButton, setShowPromoButton] = useState(false);

  // Show promo button after a delay when data is ready
  useEffect(() => {
    if (isPromoButtonReady) {
      const timer = setTimeout(() => {
        setShowPromoButton(true);
      }, 300); // 300ms delay after promo button data is ready
      
      return () => clearTimeout(timer);
    } else {
      setShowPromoButton(false);
    }
  }, [isPromoButtonReady]);

  if (!funnelFlow || !isFunnelActive) {
    return null;
  }

  return (
    <div className={`w-full max-w-3xl my-1 text-center transition-opacity duration-400 ease-out ${
      showPromoButton 
        ? 'opacity-100' 
        : 'opacity-0'
    }`}>
      {/* Claim Button */}
      <div className="relative w-full">
        <button
          onClick={() => {
            if (editorState.isEditorView) {
              onOpenProductEditor(null, 'button');
            } else {
              // Open chat when gift button is clicked
              setIsChatOpen(true);
            }
          }}
          className={`group relative z-10 flex items-center justify-center w-full py-4 text-xl rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-2 ring-offset-2 ring-offset-white ${promoButton.buttonClass} shadow-2xl`}
        >
          {promoButton.icon && (
            <span className="mr-3 text-2xl animate-pulse">
              {promoButton.icon}
            </span>
          )}
          {promoButton.text}
        </button>
      </div>
    </div>
  );
};

