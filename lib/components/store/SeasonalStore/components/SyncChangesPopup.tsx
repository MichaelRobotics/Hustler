import React, { useState, useEffect } from 'react';
import type { ProductChange, UpdateSyncResult } from '@/lib/sync';

interface SyncChangesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: () => void;
  syncResult: UpdateSyncResult | null;
  isLoading?: boolean;
}

export const SyncChangesPopup: React.FC<SyncChangesPopupProps> = ({
  isOpen,
  onClose,
  onApplyChanges,
  syncResult,
  isLoading = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const hasChanges = syncResult?.hasChanges;
  const summary = syncResult?.summary;

  return (
    <>
      <style jsx>{`
        @keyframes slideInBounce {
          0% {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          60% {
            transform: translate(-50%, 10px);
            opacity: 1;
          }
          80% {
            transform: translate(-50%, -5px);
          }
          100% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutBounce {
          0% {
            transform: translate(-50%, 0);
            opacity: 1;
          }
          20% {
            transform: translate(-50%, -10px);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
        }
        
        .slide-in-bounce {
          animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        
        .slide-out-bounce {
          animation: slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
        }
        
        .popup-container {
          opacity: 0;
          transform: translate(-50%, -100%);
        }
      `}</style>
      
      <div className={`fixed top-0 left-1/2 z-[1000] popup-container ${
        isAnimating ? 'slide-in-bounce' : 'slide-out-bounce'
      }`}>
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-b-xl shadow-2xl border-b-2 border-green-400 p-3 min-w-[280px] max-w-[350px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            <h3 className="text-sm font-bold text-white">
              {isLoading ? "Checking..." : "Products Sync Needed"}
            </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {/* Summary */}
            {hasChanges ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3">
                <div className="space-y-2 text-white text-xs">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="font-semibold">{Number(summary?.created || 0)}</span>
                    <span className="text-white/80">created</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-200 rounded-full"></div>
                    <span className="font-semibold">{Number(summary?.updated || 0)}</span>
                    <span className="text-white/80">updated</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-red-200 rounded-full"></div>
                    <span className="font-semibold">{Number(summary?.deleted || 0)}</span>
                    <span className="text-white/80">deleted</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 text-center">
                <p className="text-white/90 text-xs font-medium">No updates available</p>
              </div>
            )}

            {/* Sync Button */}
            {hasChanges && (
              <div className="flex justify-center">
                <button
                  onClick={onApplyChanges}
                  className="px-6 py-2 bg-white text-green-600 text-xs font-bold rounded-lg hover:bg-white/90 hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Sync
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </>
  );
};
