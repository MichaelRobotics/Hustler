'use client';

import React from 'react';
import { Home, ArrowLeft, Sun, Moon } from 'lucide-react';
import { EyeIcon, EditIcon, PlusCircleIcon, SettingsIcon } from './Icons';

interface TopNavbarProps {
  onBack?: () => void;
  editorState: {
    isEditorView: boolean;
  };
  showGenerateBgInNavbar: boolean;
  isChatOpen: boolean;
  isGeneratingBackground: boolean;
  loadingState: {
    isImageLoading: boolean;
  };
  promoButton: {
    text: string;
    buttonClass: string;
    ringClass: string;
    ringHoverClass: string;
    icon: string;
  };
  currentSeason: string;
  allThemes: Record<string, any>;
  legacyTheme: any;
  hideEditorButtons?: boolean;
  isStorePreview?: boolean; // New prop to indicate StorePreview context
  highlightSaveButton?: boolean; // New prop to highlight save button after generation
  hasUnsavedChanges?: boolean; // Track if there are unsaved changes
  isTemplateManagerOpen?: boolean; // Track if Shop Manager modal is open
  
  // Handlers
  toggleEditorView: () => void;
  handleGenerateBgClick: () => void;
  handleBgImageUpload: (file: File) => void;
  handleSaveTemplate: () => void;
  toggleAdminSheet: () => void;
  openTemplateManager: () => void;
  handleAddProduct: () => void;
  setIsChatOpen: (open: boolean) => void;
  setCurrentSeason: (season: string) => void;
  getHoverRingClass: (ringClass: string) => string;
  getGlowBgClass: (ringClass: string) => string;
  getGlowBgStrongClass: (ringClass: string) => string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onBack,
  editorState,
  showGenerateBgInNavbar,
  isChatOpen,
  isGeneratingBackground,
  loadingState,
  promoButton,
  currentSeason,
  allThemes,
  legacyTheme,
  hideEditorButtons = false,
  isStorePreview = false,
  highlightSaveButton = false,
  hasUnsavedChanges = false,
  isTemplateManagerOpen = false,
  toggleEditorView,
  handleGenerateBgClick,
  handleBgImageUpload,
  handleSaveTemplate,
  toggleAdminSheet,
  openTemplateManager,
  handleAddProduct,
  setIsChatOpen,
  setCurrentSeason,
  getHoverRingClass,
  getGlowBgClass,
  getGlowBgStrongClass,
}) => {
  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes saveHighlight {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.4);
            transform: scale(1.05);
          }
        }
        @keyframes savePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes tooltipPulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .save-highlight {
          animation: saveHighlight 2s ease-in-out infinite;
        }
        .save-pulse {
          animation: savePulse 1.5s ease-in-out infinite;
        }
        .tooltip-pulse {
          animation: tooltipPulse 2s ease-in-out infinite;
        }
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }
        .shine-animation::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shine 3s ease-in-out infinite;
          border-radius: inherit;
        }
      `}</style>
      
      <div className="sticky top-0 z-30 flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg min-h-[4rem] overflow-y-hidden relative">
      <div className="px-3 py-2 h-full flex items-center overflow-x-auto overflow-y-hidden scrollbar-hide md:overflow-x-visible">
        <div className="flex items-center justify-between w-full md:w-full" style={{ minWidth: 'max-content' }}>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* AI Merchant Button */}
            <button
              onClick={onBack || (() => window.history.back())}
              className="px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25 hover:shadow-green-500/40 text-white flex-shrink-0 flex items-center space-x-2"
              title="AI Merchant"
            >
                {isStorePreview ? (
                  <ArrowLeft className="w-5 h-5" />
                ) : (
                <>
                  <Home className="w-5 h-5" />
                  <span className="font-semibold text-sm hidden sm:inline">AI Merchant</span>
                </>
                )}
            </button>
          </div>

          {/* Center: Save Button (when there are unsaved changes) - Absolutely positioned */}
          {!hideEditorButtons && editorState.isEditorView && hasUnsavedChanges && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button 
                onClick={handleSaveTemplate}
                className={`px-6 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  highlightSaveButton 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white shadow-lg shadow-green-500/50 hover:shadow-green-500/60 save-highlight save-pulse' 
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
                } flex items-center space-x-2`}
                title="Save Changes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="font-semibold">Save</span>
              </button>
            </div>
          )}

          {/* Center: Shop Button (when there are no unsaved changes and Shop Manager is not open) - Absolutely positioned */}
          {!hideEditorButtons && editorState.isEditorView && !hasUnsavedChanges && !isTemplateManagerOpen && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button 
                onClick={openTemplateManager}
                className="px-6 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                title="Shop Manager"
              >
                <span className="font-semibold">Store Manager</span>
              </button>
            </div>
          )}
            
          {/* Center: Hide Chat Button when chat is open and no unsaved changes */}
          {isChatOpen && (!hasUnsavedChanges || hideEditorButtons || !editorState.isEditorView) && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className={`group relative z-10 flex items-center justify-center px-6 py-3 text-sm rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ${promoButton.ringClass} ${getHoverRingClass(promoButton.ringHoverClass)} ${promoButton.buttonClass} shadow-2xl`}
                  title="Hide Chat"
                >
                  {/* Chat Icon with 3 dots for Hide Chat */}
                  <div className="w-5 h-5 text-white relative z-10 mr-2">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {/* 3 Dots inside the circle */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex space-x-0.5">
                        <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                        <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                        <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold">HIDE CHAT</span>
                </button>
                {/* Below-button glow (positioned vertically lower than the button) */}
                <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-3 w-full max-w-[110%] h-6 opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-500 ${getGlowBgClass(promoButton.ringHoverClass)}`}></span>
                <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-full max-w-[90%] h-4 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-500 ${getGlowBgStrongClass(promoButton.ringHoverClass)}`}></span>
              </div>
              </div>
            )}

          {/* Right Side: Admin Controls */}
          {!hideEditorButtons && editorState.isEditorView && (
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Products */}
              <button 
                onClick={handleAddProduct}
                className="px-4 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 flex items-center space-x-2"
                title="Select Products"
              >
                <PlusCircleIcon className="w-5 h-5" />
                <span className="font-semibold text-sm">Select Products</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

