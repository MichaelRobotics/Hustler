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
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3), 0 0 40px rgba(99, 102, 241, 0.2); }
          50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.5), 0 0 60px rgba(99, 102, 241, 0.3); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes blurIn {
          0% { filter: blur(20px); opacity: 0; }
          100% { filter: blur(0px); opacity: 1; }
        }
        @keyframes blurOut {
          0% { filter: blur(0px); opacity: 1; }
          100% { filter: blur(20px); opacity: 0; }
        }
        .float-animation { animation: float 3s ease-in-out infinite; }
        .glow-animation { animation: glow 2s ease-in-out infinite; }
        .shimmer-animation {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .blur-in-animation {
          animation: blurIn 0.8s ease-out forwards;
        }
        .blur-out-animation {
          animation: blurOut 0.6s ease-in forwards;
        }
      `}</style>
      
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
        {/* Pulse rings */}
        <div className="absolute w-32 h-32 border-2 border-indigo-400/30 rounded-full pulse-ring"></div>
        <div className="absolute w-32 h-32 border-2 border-purple-400/30 rounded-full pulse-ring" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Main popup */}
        <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden float-animation glow-animation blur-in-animation">
          {/* Shimmer effect */}
          <div className="absolute inset-0 shimmer-animation"></div>
          
          {/* Content */}
          <div className="relative px-8 py-6 flex items-center space-x-4">
            {/* Icon with gradient background */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <ZapIcon className="w-6 h-6 text-white animate-bounce" />
              </div>
            </div>
            
            {/* Text content */}
            <div className="flex flex-col space-y-1">
              <div className="text-white text-lg font-semibold">
                {loadingState.isGeneratingImage ? '🎨 Creating Magic' : 
                 loadingState.isUploadingImage ? '📤 Uploading to WHOP' : 
                 loadingState.isTextLoading ? '🤖 Refining Content' : 
                 loadingState.isImageLoading ? '🎨 Generating Background' : 
                 '✨ AI Working'}
              </div>
              <div className="text-gray-300 text-sm">
                {loadingState.isGeneratingImage ? 'Generating stunning visuals...' : 
                 loadingState.isUploadingImage ? 'Securing your image in WHOP storage...' : 
                 loadingState.isTextLoading ? 'Optimizing text and emojis with Gemini...' : 
                 loadingState.isImageLoading ? 'Creating your perfect background...' : 
                 'Working on AI magic...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

