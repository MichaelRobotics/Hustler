'use client';

import React from 'react';
import { Home, ArrowLeft, Sun, Moon } from 'lucide-react';
import { EyeIcon, EditIcon } from './Icons';

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
  
  // Handlers
  toggleEditorView: () => void;
  handleGenerateBgClick: () => void;
  handleBgImageUpload: (file: File) => void;
  handleSaveTemplate: () => void;
  toggleAdminSheet: () => void;
  openTemplateManager: () => void;
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
  toggleEditorView,
  handleGenerateBgClick,
  handleBgImageUpload,
  handleSaveTemplate,
  toggleAdminSheet,
  openTemplateManager,
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
      
      <div className="sticky top-0 z-30 flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg min-h-[4rem] overflow-y-hidden">
      <div className="px-3 py-2 h-full flex items-center overflow-x-auto overflow-y-hidden scrollbar-hide md:overflow-x-visible">
        <div className="flex items-center justify-between w-full md:w-full" style={{ minWidth: 'max-content' }}>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Home/Back Button */}
            <button
              onClick={onBack || (() => window.history.back())}
              className="p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25 hover:shadow-green-500/40 text-white relative flex-shrink-0"
              title={isStorePreview ? "Go Back" : "Go Home"}
            >
              <div className="flex items-center justify-center">
                {isStorePreview ? (
                  <ArrowLeft className="w-5 h-5" />
                ) : (
                  <Home className="w-5 h-5" />
                )}
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                {isStorePreview ? "Go Back" : "Go Home"}
              </div>
            </button>
          </div>

          {/* Center: Hide Chat Button (Page view) */}
          <div className="flex-1 flex justify-center">
            {/* Generate Background Button hidden in Page View - only available in Editor View */}
            
            {/* Hide Chat Button when chat is open */}
            {isChatOpen && (
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
            )}
          </div>

          {/* Right Side: Admin Controls */}
          {!hideEditorButtons && (
            <div className="p-1 rounded-lg bg-black/50 backdrop-blur text-white text-xs shadow-2xl flex items-center space-x-2 min-h-[2.5rem] h-full flex-shrink-0 overflow-x-auto scrollbar-hide">
              {/* View Toggle */}
              <button 
              onClick={() => {
                toggleEditorView();
                // Close chat when switching to editor view
                if (!editorState.isEditorView && isChatOpen) {
                  setIsChatOpen(false);
                }
              }}
              className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 shadow-lg ${
                editorState.isEditorView 
                ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/25 hover:shadow-red-500/40' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25 hover:shadow-green-500/40'
              } text-white relative`}
              title={editorState.isEditorView ? 'Switch to Customer Page View' : 'Switch to Editor View'}
            >
              <div className="flex items-center justify-center">
                  {editorState.isEditorView ? (
                    <EyeIcon className="w-5 h-5" />
                  ) : (
                    <EditIcon className="w-5 h-5" />
                  )}
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                {editorState.isEditorView ? 'Page View' : 'Editor View'}
              </div>
            </button>

            {/* Generate Background Button - Icon in theme bar (Editor view only) */}
            {editorState.isEditorView && showGenerateBgInNavbar && !isChatOpen && (
              <button 
                onClick={handleGenerateBgClick}
                disabled={loadingState.isImageLoading}
                className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 relative shadow-lg ${
                  loadingState.isImageLoading 
                    ? 'bg-gradient-to-r from-indigo-800 to-purple-800 text-indigo-400 cursor-not-allowed shadow-indigo-500/25' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                }`}
                title="Generate AI Background"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  Generate Background
                </div>
              </button>
            )}

            {editorState.isEditorView && (
              <div className="flex items-center space-x-2 flex-shrink-0 flex-nowrap">
                {/* Background Upload - Moved to left of theme selector */}
                <label htmlFor="bg-upload" className="cursor-pointer p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 relative">
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    Upload Background
                  </div>
                  <input 
                    type="file" 
                    id="bg-upload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleBgImageUpload(e.target.files?.[0]!)}
                    disabled={loadingState.isImageLoading}
                  />
                </label>

                {/* Theme Selector */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="season" className="font-semibold flex-shrink-0 hidden sm:inline text-white">Theme:</label>
                  <select
                    id="season"
                    value={currentSeason}
                    onChange={(e) => { 
                      setCurrentSeason(e.target.value);
                    }}
                    className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    {Object.keys(allThemes).map(s => (
                      <option key={s} value={s}>{allThemes[s].name}</option>
                    ))}
                  </select>
                </div>
                
                
                {/* Background Generate - Icon only when moved from navbar */}
                {!showGenerateBgInNavbar && (
                  <button 
                    onClick={handleGenerateBgClick}
                    disabled={loadingState.isImageLoading}
                    className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 relative shadow-lg ${
                      loadingState.isImageLoading 
                        ? 'bg-gradient-to-r from-indigo-800 to-purple-800 text-indigo-400 cursor-not-allowed shadow-indigo-500/25' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                    }`}
                    title="Generate AI Background"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Generate Background
                    </div>
                  </button>
                )}
                
                {/* Save Template */}
                <button 
                  onClick={handleSaveTemplate}
                  className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 relative ${
                    highlightSaveButton 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white shadow-lg shadow-green-500/50 hover:shadow-green-500/60 save-highlight save-pulse' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
                  }`}
                  title="Save Current Store as Template"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  </div>
                  {/* Tooltip */}
                  <div className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap pointer-events-none ${
                    highlightSaveButton 
                      ? 'tooltip-pulse' 
                      : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200'
                  }`}>
                    Save
                  </div>
                </button>
                
                {/* Elements */}
                <button 
                  onClick={toggleAdminSheet}
                  className="p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 relative"
                  title="Manage Elements & AI Tools"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    Assets
                  </div>
                </button>
                
                {/* Templates */}
                <button 
                  onClick={openTemplateManager}
                  className="p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 relative"
                  title="Manage Shop"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    Shop
                  </div>
                </button>
              </div>
            )}

            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

