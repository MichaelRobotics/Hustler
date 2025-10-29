import React, { useState, useEffect } from 'react';
import type { ProductChange, UpdateSyncResult } from '@/lib/sync';

interface SyncChangesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: () => void;
  syncResult: UpdateSyncResult | null;
  isLoading?: boolean;
  isApplying?: boolean; // New prop for when changes are being applied
  onSyncSuccess?: () => void; // Callback for successful sync
}

export const SyncChangesPopup: React.FC<SyncChangesPopupProps> = ({
  isOpen,
  onClose,
  onApplyChanges,
  syncResult,
  isLoading = false,
  isApplying = false,
  onSyncSuccess,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasStartedSync, setHasStartedSync] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      setShowSuccess(false);
      setHasStartedSync(false);
    }
  }, [isOpen]);

  // Track when sync starts
  useEffect(() => {
    if (isApplying) {
      setHasStartedSync(true);
    }
  }, [isApplying]);

  // Handle success animation when sync completes
  useEffect(() => {
    if (isApplying === false && hasStartedSync && syncResult && !isLoading) {
      // Sync completed successfully
      setShowSuccess(true);
      
      // Auto-hide after showing success for 2 seconds
      setTimeout(() => {
        handleClose();
        if (onSyncSuccess) {
          onSyncSuccess();
        }
      }, 2000);
    }
  }, [isApplying, hasStartedSync, syncResult, isLoading]);

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
        
        @keyframes rotateSync {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        @keyframes checkmarkScale {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .slide-in-bounce {
          animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }
        
        .slide-out-bounce {
          animation: slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
        }
        
        .rotate-sync {
          animation: rotateSync 1s linear infinite;
        }
        
        .checkmark-scale {
          animation: checkmarkScale 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
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
                {showSuccess ? (
                  <svg className="w-4 h-4 text-white checkmark-scale" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isApplying ? (
                  <svg className="w-4 h-4 text-white rotate-sync" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </div>
            <h3 className="text-sm font-bold text-white">
              {showSuccess ? "Sync Complete!" : isApplying ? "Syncing Products..." : isLoading ? "Checking..." : "Products Sync Needed"}
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

        {showSuccess ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 text-center">
            <p className="text-white/90 text-xs font-medium">Products synced successfully!</p>
          </div>
        ) : isLoading || isApplying ? (
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
            {hasChanges && !showSuccess && (
              <div className="flex justify-center">
                <button
                  onClick={onApplyChanges}
                  disabled={isApplying}
                  className="px-6 py-2 bg-white text-green-600 text-xs font-bold rounded-lg hover:bg-white/90 hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying ? "Syncing..." : "Sync"}
                </button>
              </div>
            )}

            {/* Debug Toggle */}
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setIsDebugExpanded(!isDebugExpanded)}
                className="flex items-center space-x-1 text-white/70 hover:text-white text-xs transition-colors duration-200"
              >
                <svg 
                  className={`w-3 h-3 transition-transform duration-200 ${isDebugExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Debug Info</span>
              </button>
            </div>

            {/* Debug Section */}
            {isDebugExpanded && syncResult && (
              <div className="mt-3 bg-black/20 backdrop-blur-sm rounded-lg p-3 text-xs text-white/90 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  <div className="font-semibold text-white mb-2">🔍 Update Check Details:</div>
                  
                  {/* What gets checked */}
                  <div className="space-y-1">
                    <div className="font-medium text-white/90">What Update Check Compares:</div>
                    <ul className="ml-2 space-y-1 text-white/80">
                      <li>• <strong>Name:</strong> Database vs Whop API product title</li>
                      <li>• <strong>Description:</strong> Database vs Whop API product description</li>
                      <li>• <strong>Price:</strong> Database vs Whop API product price</li>
                      <li>• <strong>Image:</strong> Database vs Whop API product image</li>
                      <li>• <strong>Existence:</strong> Products that exist in Whop but not in database (created)</li>
                      <li>• <strong>Deletion:</strong> Products that exist in database but not in Whop (deleted)</li>
                    </ul>
                  </div>

                  {/* Current Results */}
                  <div className="space-y-1">
                    <div className="font-medium text-white/90">Current Detection Results:</div>
                    <div className="ml-2 space-y-1">
                      <div>📊 Total Changes: {syncResult.summary.total}</div>
                      <div>✅ Created: {syncResult.summary.created}</div>
                      <div>🔄 Updated: {syncResult.summary.updated}</div>
                      <div>❌ Deleted: {syncResult.summary.deleted}</div>
                      <div>🕒 Last Checked: {syncResult.lastChecked ? (typeof syncResult.lastChecked === 'string' ? new Date(syncResult.lastChecked).toLocaleTimeString() : syncResult.lastChecked.toLocaleTimeString()) : 'Unknown'}</div>
                    </div>
                  </div>

                  {/* Detailed Changes */}
                  {syncResult.changes.length > 0 && (
                    <div className="space-y-1">
                      <div className="font-medium text-white/90">Detailed Changes:</div>
                      <div className="ml-2 space-y-1 max-h-32 overflow-y-auto">
                        {syncResult.changes.map((change, index) => (
                          <div key={index} className="bg-white/10 rounded p-2">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                                change.type === 'created' ? 'bg-green-500/30 text-green-200' :
                                change.type === 'updated' ? 'bg-blue-500/30 text-blue-200' :
                                'bg-red-500/30 text-red-200'
                              }`}>
                                {change.type.toUpperCase()}
                              </span>
                              <span className="font-medium">{change.name}</span>
                              <span className={`px-1 py-0.5 rounded text-xs ${
                                change.category === 'PAID' ? 'bg-yellow-500/30 text-yellow-200' : 'bg-gray-500/30 text-gray-200'
                              }`}>
                                {change.category}
                              </span>
                            </div>
                            {change.changes && Object.keys(change.changes).length > 0 && (
                              <div className="text-xs text-white/70">
                                {Object.entries(change.changes).map(([field, changeData]: [string, any]) => (
                                  <div key={field} className="ml-2">
                                    <strong>{field}:</strong> "{changeData.old}" → "{changeData.new}"
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </>
  );
};
