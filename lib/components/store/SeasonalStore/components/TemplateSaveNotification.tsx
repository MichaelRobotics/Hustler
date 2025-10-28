import React, { useState, useEffect } from 'react';

interface TemplateSaveNotificationProps {
  isOpen: boolean;
  isSaving: boolean;
  templateName: string;
  onClose: () => void;
}

export const TemplateSaveNotification: React.FC<TemplateSaveNotificationProps> = ({
  isOpen,
  isSaving,
  templateName,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Only auto-close if not saving
      if (!isSaving) {
        const timer = setTimeout(() => {
          handleClose();
        }, 2000); // Shorter time for saved state
        
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, isSaving]);

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
        .slide-in-bounce { animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
        .slide-out-bounce { animation: slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards; }
        .popup-container { opacity: 0; transform: translate(-50%, -100%); }
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white">
                {isSaving ? "Saving Template..." : "Template Saved!"}
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
              {isSaving ? "Please wait..." : templateName}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

