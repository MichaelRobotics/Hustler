import React, { useState, useEffect } from 'react';

interface MakePublicNotificationProps {
  isOpen: boolean;
  templateName: string;
  onClose: () => void;
}

export const MakePublicNotification: React.FC<MakePublicNotificationProps> = ({
  isOpen,
  templateName,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
          0% {
            transform: translateY(-100%) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: translateY(10px) scale(1.05);
            opacity: 0.8;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes slideOutBounce {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-10px) scale(0.95);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-100%) scale(0.8);
            opacity: 0;
          }
        }

        .slide-in-bounce {
          animation: slideInBounce 0.4s ease-out forwards;
        }

        .slide-out-bounce {
          animation: slideOutBounce 0.3s ease-in forwards;
        }
      `}</style>
      
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className={`bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg border border-green-400 ${
          isAnimating ? 'slide-in-bounce' : 'slide-out-bounce'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <div>
                <div className="font-semibold text-sm">Shop Made Public!</div>
                <div className="text-xs opacity-90">{templateName}</div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="ml-3 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
