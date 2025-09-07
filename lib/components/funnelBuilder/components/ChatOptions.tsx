import React from 'react';
import { Text } from 'frosted-ui';
import { FunnelBlockOption } from '../../../types/funnel';

interface ChatOptionsProps {
  options: FunnelBlockOption[];
  optionsLeadingToOffer: number[];
  selectedOffer?: string | null;
  onOptionClick: (option: FunnelBlockOption, index: number) => void;
}

export const ChatOptions: React.FC<ChatOptionsProps> = React.memo(({
  options,
  optionsLeadingToOffer,
  selectedOffer,
  onOptionClick
}) => {
  if (options.length === 0) return null;

  // Mobile detection
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`flex-shrink-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30 ${
      isMobile ? 'p-2' : 'p-0'
    }`}>
      <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
        <div className={`flex flex-col items-end ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
          {options.map((opt, i) => {
            const isLeadingToOffer = optionsLeadingToOffer.includes(i);
            
            return (
              <button
                key={i}
                onClick={() => onOptionClick(opt, i)}
                className={`${
                  isMobile ? 'w-full max-w-none p-4 min-h-[48px]' : 'max-w-xs lg:max-w-md p-3'
                } border rounded-xl transition-all duration-200 text-left group touch-manipulation ${
                  isLeadingToOffer && selectedOffer
                    ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 shadow-lg shadow-amber-500/20' // Highlighted
                    : 'bg-white dark:bg-gray-800 border-border/50 dark:border-border/30 hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50 active:scale-[0.98]' // Normal with mobile touch feedback
                }`}
                style={{
                  // Mobile-specific optimizations
                  ...(isMobile && {
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'manipulation'
                  })
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    isLeadingToOffer && selectedOffer
                      ? 'bg-amber-500 border-amber-600' // Highlighted
                      : 'bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700/30' // Normal
                  }`}>
                    <Text size="1" weight="bold" className={
                      isLeadingToOffer && selectedOffer
                        ? 'text-white' // Highlighted
                        : 'text-violet-700 dark:text-violet-300' // Normal
                    }>
                      {i + 1}
                    </Text>
                  </div>
                  <Text size="2" className={`transition-colors ${
                    isLeadingToOffer && selectedOffer
                      ? 'text-amber-800 dark:text-amber-200 font-medium' // Highlighted
                      : 'text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300' // Normal
                  }`}>
                    {opt.text}
                  </Text>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

ChatOptions.displayName = 'ChatOptions';
