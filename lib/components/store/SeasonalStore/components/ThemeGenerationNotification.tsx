import React, { useState, useEffect } from 'react';

interface ThemeGenerationNotificationProps {
  isOpen: boolean;
  isGenerating: boolean;
  themeName: string;
  onClose: () => void;
}

export const ThemeGenerationNotification: React.FC<ThemeGenerationNotificationProps> = ({
  isOpen,
  isGenerating,
  themeName,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Only auto-close if not generating
      if (!isGenerating) {
        const timer = setTimeout(() => {
          handleClose();
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isGenerating]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <>
      <style jsx>{`
        @keyframes slideInBounce {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          60% { transform: translate(-50%, 10px); opacity: 1; }
          80% { transform: translate(-50%, -5px); }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideOutBounce {
          0% { transform: translate(-50%, 0); opacity: 1; }
          20% { transform: translate(-50%, -10px); opacity: 0.8; }
          100% { transform: translate(-50%, -100%); opacity: 0; }
        }
        @keyframes rotateSync {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .slide-in-bounce { animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
        .slide-out-bounce { animation: slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards; }
        .rotate-sync {
          animation: rotateSync 1s linear infinite;
        }
        .popup-container { opacity: 0; transform: translate(-50%, -100%); }
      `}</style>
      
      <div className={`fixed top-0 left-1/2 z-[1000] popup-container ${
        isAnimating ? 'slide-in-bounce' : 'slide-out-bounce'
      }`}>
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-b-xl shadow-2xl border-b-2 border-purple-400 p-3 min-w-[280px] max-w-[350px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                {isGenerating ? (
                  <svg className="w-4 h-4 text-white rotate-sync" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <h3 className="text-sm font-bold text-white">
                {isGenerating ? "Generating AI Theme..." : "AI Theme Generated!"}
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

          {/* Simple Message */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-white text-xs font-medium">
              {isGenerating ? "Please wait..." : themeName}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

