'use client';

import React from 'react';
import { ZapIcon } from './Icons';
import { Button } from 'frosted-ui';
import { Upload, Square, Circle } from 'lucide-react';

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
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center">
          <div 
            className="relative w-24 h-24 mx-auto overflow-hidden group"
            data-prevent-bg-toggle="true"
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
            <div className="logo-controls absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-0 transition-opacity duration-300 bg-black/50 rounded-full">
              {/* Upload Button - Top */}
              <input 
                type="file" 
                id="logo-upload" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleLogoImageUpload(file);
                  }
                }}
                disabled={loadingState.isUploadingImage}
              />
              <Button
                size="2"
                color="green"
                onClick={() => {
                  const input = document.getElementById('logo-upload') as HTMLInputElement;
                  if (input) {
                    input.click();
                  }
                }}
                className="p-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group"
                disabled={loadingState.isUploadingImage}
                title="Upload Logo"
              >
                <Upload
                  size={16}
                  strokeWidth={2.5}
                  className="group-hover:scale-110 transition-transform duration-300"
                />
              </Button>
              
              {/* Shape Toggle - Bottom */}
              <Button
                size="2"
                color="violet"
                onClick={() => setLogoAsset((prev) => ({ 
                  ...prev, 
                  shape: prev.shape === 'round' ? 'square' : 'round' 
                }))}
                disabled={loadingState.isImageLoading}
                className="p-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
                title={`Switch to ${logoAsset.shape === 'round' ? 'Square' : 'Round'}`}
              >
                {logoAsset.shape === 'round' ? (
                  <Circle
                    size={16}
                    strokeWidth={2.5}
                    className="group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <Square
                    size={16}
                    strokeWidth={2.5}
                    className="group-hover:scale-110 transition-transform duration-300"
                  />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Customer view - just display the logo
  return (
    <div className="w-full max-w-5xl mx-auto pt-2">
      <div 
        className={`w-24 h-24 mx-auto overflow-hidden ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}
        data-prevent-bg-toggle="true"
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
      </div>
    </div>
  );
};




