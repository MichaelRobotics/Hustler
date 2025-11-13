import React, { useState, useEffect } from 'react';

interface TemplateLimitNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShopManager: () => void;
}

export const TemplateLimitNotification: React.FC<TemplateLimitNotificationProps> = ({
  isOpen,
  onClose,
  onOpenShopManager,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Automatically open Shop Manager after a brief delay to show notification
      const openTimer = setTimeout(() => {
        onOpenShopManager();
      }, 1500); // Show notification for 1.5 seconds before opening Shop Manager
      
      // Auto-close after 3 seconds
      const closeTimer = setTimeout(() => {
        handleClose();
      }, 3000);
      
      return () => {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
      };
    } else {
      // Reset visibility when closed
      setIsVisible(false);
      setIsAnimating(false);
    }
  }, [isOpen, onOpenShopManager]);

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
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-b-xl shadow-2xl border-b-2 border-orange-400 p-3 min-w-[280px] max-w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white">
                Template Limit Reached
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

          {/* Message */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-white text-xs font-medium text-center">
              Maximum of 10 templates allowed. Please delete a template to create a new one.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

