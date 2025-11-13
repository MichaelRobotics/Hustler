'use client';

import React from 'react';
import { ZapIcon } from './Icons';

interface LogoAsset {
  src: string;
  shape: 'round' | 'square';
}

interface LogoSectionProps {
  editorState: {
    isEditorView: boolean;
  };
  logoAsset: LogoAsset;
  currentSeason: string;
  legacyTheme: {
    name: string;
  };
  loadingState: {
    isUploadingImage: boolean;
    isGeneratingImage: boolean;
    isTextLoading: boolean;
    isImageLoading: boolean;
  };
  
  // Handlers
  handleLogoImageUpload: (file: File) => void;
  handleLogoGeneration: (logoAsset: LogoAsset, shape: string, themeName: string) => void;
  setLogoAsset: (fn: (prev: LogoAsset) => LogoAsset) => void;
}

export const LogoSection: React.FC<LogoSectionProps> = ({
  editorState,
  logoAsset,
  currentSeason,
  legacyTheme,
  loadingState,
  handleLogoImageUpload,
  handleLogoGeneration,
  setLogoAsset,
}) => {
  if (editorState.isEditorView) {
    return (
      <div className="w-full max-w-5xl mx-auto mb-4">
        <div className="text-center">
          <div 
            className="relative w-24 h-24 mb-2 mx-auto overflow-hidden group"
            onMouseEnter={() => {
              // Show controls when hovering over entire logo
              const controls = document.querySelector('.logo-controls') as HTMLElement;
              if (controls) controls.style.opacity = '1';
            }}
            onMouseLeave={() => {
              // Hide controls when leaving entire logo
              const controls = document.querySelector('.logo-controls') as HTMLElement;
              if (controls) controls.style.opacity = '0';
            }}
          >
            <div 
              className={`w-full h-full ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}
              style={{
                backgroundImage: `url(${logoAsset.src})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
            
            {/* Logo Controls - Only visible when hovering over entire logo */}
            <div className="logo-controls absolute inset-0 flex flex-col items-center justify-center space-y-2 opacity-0 transition-opacity duration-300 bg-black/50 rounded-full">
              {/* Upload Button - Top */}
              <label htmlFor="logo-upload" className="cursor-pointer p-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <input 
                  type="file" 
                  id="logo-upload" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleLogoImageUpload(e.target.files?.[0]!)}
                  disabled={loadingState.isUploadingImage}
                />
              </label>
              
              {/* Shape Toggle - Bottom */}
              <button
                onClick={() => setLogoAsset((prev) => ({ 
                  ...prev, 
                  shape: prev.shape === 'round' ? 'square' : 'round' 
                }))}
                className="px-3 py-1 text-xs font-medium rounded-xl transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
                disabled={loadingState.isImageLoading}
                title={`Switch to ${logoAsset.shape === 'round' ? 'Square' : 'Round'}`}
              >
                {logoAsset.shape === 'round' ? 'Round' : 'Square'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer view - just display the logo
  return (
    <div className="w-full max-w-5xl mx-auto mb-4 pt-2">
      <div className={`w-24 h-24 mx-auto overflow-hidden ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}>
        <div 
          className={`w-full h-full ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}
          style={{
            backgroundImage: `url(${logoAsset.src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      </div>
    </div>
  );
};




