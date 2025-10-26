'use client';

import React from 'react';
import { ZapIcon } from './Icons';

interface LoadingOverlayProps {
  loadingState: {
    isTextLoading: boolean;
    isImageLoading: boolean;
    isUploadingImage: boolean;
    isGeneratingImage: boolean;
  };
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ loadingState }) => {
  if (!loadingState.isTextLoading && !loadingState.isImageLoading && !loadingState.isUploadingImage && !loadingState.isGeneratingImage) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="flex items-center text-white text-2xl p-6 rounded-xl bg-gray-800 shadow-2xl">
        <ZapIcon className="w-8 h-8 mr-4 animate-bounce text-cyan-400" />
        {loadingState.isGeneratingImage ? '🎨 Generating AI Image (nano-banana)...' : 
         loadingState.isUploadingImage ? '📤 Uploading Image to WHOP...' : 
         loadingState.isTextLoading ? '🤖 Refining Text/Emoji (Gemini)...' : 
         loadingState.isImageLoading ? '🎨 Generating AI Image (nano-banana)...' : 
         '✨ Working on AI Magic...'}
      </div>
    </div>
  );
};

