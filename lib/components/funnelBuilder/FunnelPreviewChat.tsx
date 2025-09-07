'use client';

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelPreviewChatProps } from '../../types/funnel';
import { ChatHeader, ChatMessage, ChatOptions, ChatRestartButton } from './components';
import OptimizedChatInput from './components/OptimizedChatInput';
import PerformanceProfiler from '../common/PerformanceProfiler';

/**
 * --- Ultra-Optimized Funnel Preview Chat Component ---
 * This component simulates a user conversation with the generated chatbot flow with maximum performance.
 * 
 * Performance Features:
 * - GPU-accelerated animations with transform3d()
 * - Virtual scrolling for large message lists (50+ messages)
 * - Pre-computed path cache for instant lookups
 * - Aggressive memoization with React.memo
 * - Intersection Observer for scroll optimization
 * - Reduced DOM operations and re-renders
 * - Memory-efficient message handling
 * - Real-time performance monitoring
 *
 * Features:
 * - Option clicking for normal flow testing
 * - Custom text input for edge case testing
 * - Invalid input handling with friendly reminders
 * - Escalation to creator after multiple invalid inputs
 * - Auto-scrolling and responsive design
 *
 * @param {FunnelPreviewChatProps} props - The props passed to the component.
 * @param {FunnelFlow | null} props.funnelFlow - The generated funnel flow object containing stages and blocks.
 * @returns {JSX.Element} The rendered FunnelPreviewChat component.
 */

// Performance-optimized CSS classes with mobile enhancements
const PERFORMANCE_CLASSES = {
  messageContainer: 'transform-gpu will-change-transform',
  messageSlideIn: 'animate-fade-in-up',
  buttonHover: 'transition-transform duration-150 ease-out hover:scale-[1.01]',
  buttonActive: 'active:scale-[0.99]',
  shadowMinimal: 'shadow-sm',
  containerOptimized: 'contain-layout contain-style',
  // Mobile-specific optimizations
  mobileTouchTarget: 'min-h-[44px] min-w-[44px] touch-manipulation',
  mobileScroll: 'overflow-y-auto overscroll-behavior-contain -webkit-overflow-scrolling-touch',
  mobileSafeArea: 'pb-safe-area-inset-bottom pt-safe-area-inset-top',
  mobileOptimized: 'select-none touch-pan-y',
} as const;

// Mobile detection hook
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      
      setIsMobile(isMobileDevice || isSmallScreen);
      setIsTouch(isTouchDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile, isTouch };
};

// Mobile-optimized virtual scrolling hook
const useVirtualScrolling = (items: any[], itemHeight: number = 80, containerHeight: number = 400, isMobile: boolean = false) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Adjust item height for mobile (larger touch targets)
  const adjustedItemHeight = isMobile ? Math.max(itemHeight, 100) : itemHeight;
  const adjustedContainerHeight = isMobile ? Math.min(containerHeight, window.innerHeight * 0.6) : containerHeight;

  const visibleStart = Math.floor(scrollTop / adjustedItemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(adjustedContainerHeight / adjustedItemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const offsetY = visibleStart * adjustedItemHeight;

  // Throttled scroll handler for mobile performance
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isMobile) {
      // Use RAF for smoother mobile scrolling
      requestAnimationFrame(() => {
        setScrollTop(e.currentTarget.scrollTop);
      });
    } else {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [isMobile]);

  return {
    containerRef,
    visibleItems,
    offsetY,
    handleScroll,
    totalHeight: items.length * adjustedItemHeight,
    adjustedItemHeight
  };
};

// Mobile-optimized message memoization
const MemoizedChatMessage = React.memo(({ message, index, isMobile }: { message: any; index: number; isMobile: boolean }) => {
  return (
    <div 
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} ${PERFORMANCE_CLASSES.messageContainer} ${
        isMobile ? 'px-2 py-1' : 'px-4 py-2'
      }`}
      style={{ 
        animationDelay: `${index * (isMobile ? 10 : 20)}ms`, // Faster animations on mobile
        animationFillMode: 'forwards',
        // Mobile-specific optimizations
        ...(isMobile && {
          minHeight: '44px',
          touchAction: 'manipulation'
        })
      }}
    >
      <ChatMessage message={message} />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.type === nextProps.message.type &&
    prevProps.index === nextProps.index &&
    prevProps.isMobile === nextProps.isMobile
  );
});
const FunnelPreviewChat: React.FC<FunnelPreviewChatProps> = React.memo(({ 
  funnelFlow, 
  selectedOffer, 
  onOfferClick 
}) => {
  const {
    history,
    currentBlockId,
    chatEndRef,
    chatContainerRef,
    optionsLeadingToOffer,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow, selectedOffer);

  // Mobile detection
  const { isMobile, isTouch } = useMobileDetection();

  // Mobile keyboard handling (like Whop's native chat)
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [initialViewportHeight, setInitialViewportHeight] = useState(0);

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    scrollTime: 0,
    memoryUsage: 0
  });

  // Mobile-optimized virtual scrolling
  const shouldUseVirtualScrolling = history.length > (isMobile ? 30 : 50); // Lower threshold for mobile
  const virtualScrolling = useVirtualScrolling(history, 80, 400, isMobile);

  // Ultra-optimized message list with mobile enhancements
  const messageList = useMemo(() => {
    if (shouldUseVirtualScrolling) {
      return (
        <div 
          ref={virtualScrolling.containerRef}
          className={`h-full ${PERFORMANCE_CLASSES.mobileScroll}`}
          onScroll={virtualScrolling.handleScroll}
          style={{ 
            height: isMobile ? '60vh' : '400px',
            // Mobile-specific optimizations
            ...(isMobile && {
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            })
          }}
        >
          <div style={{ height: virtualScrolling.totalHeight, position: 'relative' }}>
            <div style={{ transform: `translate3d(0, ${virtualScrolling.offsetY}px, 0)` }}>
              {virtualScrolling.visibleItems.map((msg, index) => (
                <MemoizedChatMessage 
                  key={`msg-${msg.type}-${index}-${msg.text.slice(0, 10)}`}
                  message={msg} 
                  index={index}
                  isMobile={isMobile}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // For small lists, use regular rendering with mobile optimizations
    return history.map((msg, index) => (
      <MemoizedChatMessage 
        key={`msg-${msg.type}-${index}-${msg.text.slice(0, 10)}`}
        message={msg} 
        index={index}
        isMobile={isMobile}
      />
    ));
  }, [history, shouldUseVirtualScrolling, virtualScrolling, isMobile]);

  // Optimized scroll behavior with throttling
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleOptimizedScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      const startTime = performance.now();
      
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
      
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        ...prev,
        scrollTime: endTime - startTime
      }));
    }, 16); // Throttle to 60fps
  }, [chatEndRef]);

  // Effect for optimized auto-scroll
  useEffect(() => {
    if (history.length > 0) {
      handleOptimizedScroll();
    }
  }, [history.length, handleOptimizedScroll]);

  // Mobile keyboard detection and handling (like Whop's native chat)
  useEffect(() => {
    if (!isMobile) return;

    // Store initial viewport height
    const storeInitialHeight = () => {
      setInitialViewportHeight(window.innerHeight);
    };

    // Handle keyboard open/close with smooth animations
    const handleKeyboardChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // Keyboard is considered open if viewport height decreased significantly
      const keyboardThreshold = 150; // Minimum height difference to consider keyboard open
      const isKeyboardOpenNow = heightDifference > keyboardThreshold;
      
      setIsKeyboardOpen(isKeyboardOpenNow);
      setKeyboardHeight(isKeyboardOpenNow ? heightDifference : 0);
      
      // Auto-scroll to keep input visible when keyboard opens
      if (isKeyboardOpenNow && chatEndRef.current) {
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
          });
        }, 100); // Small delay to allow keyboard animation
      }
    };

    // Handle input focus/blur
    const handleInputFocus = () => {
      setIsInputFocused(true);
      // Small delay to allow keyboard to open
      setTimeout(handleKeyboardChange, 300);
    };

    const handleInputBlur = () => {
      setIsInputFocused(false);
      // Small delay to allow keyboard to close
      setTimeout(handleKeyboardChange, 300);
    };

    // Initialize
    storeInitialHeight();

    // Listen for viewport changes (modern browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleKeyboardChange);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', handleKeyboardChange);
    }

    // Listen for focus/blur events on inputs
    document.addEventListener('focusin', handleInputFocus);
    document.addEventListener('focusout', handleInputBlur);

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        storeInitialHeight();
        handleKeyboardChange();
      }, 500);
    });

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleKeyboardChange);
      } else {
        window.removeEventListener('resize', handleKeyboardChange);
      }
      document.removeEventListener('focusin', handleInputFocus);
      document.removeEventListener('focusout', handleInputBlur);
      window.removeEventListener('orientationchange', storeInitialHeight);
    };
  }, [isMobile, initialViewportHeight, chatEndRef]);

  // Memory usage monitoring
  useEffect(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      setPerformanceMetrics(prev => ({
        ...prev,
        memoryUsage
      }));
    }
  }, [history.length]);

  return (
    <PerformanceProfiler id="FunnelPreviewChat">
      {/* Main Chat Container - No inner wrapper */}
      <div 
        className={`h-full flex flex-col ${PERFORMANCE_CLASSES.containerOptimized} ${PERFORMANCE_CLASSES.mobileOptimized} ${
          isMobile ? PERFORMANCE_CLASSES.mobileSafeArea : ''
        }`}
        style={{
          // Mobile keyboard adjustments (like Whop's native chat)
          ...(isMobile && isKeyboardOpen && {
            height: `calc(100vh - ${keyboardHeight}px)`,
            transition: 'height 0.3s ease-out'
          })
        }}
      >
        {/* Mobile-optimized Chat Header */}
        <PerformanceProfiler id="FunnelPreviewChat-Header">
          <div className={`sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 ${
            isMobile ? 'py-2 px-3' : 'py-3 px-4 sm:px-6 lg:px-8'
          } border-b border-border/30 dark:border-border/20 ${PERFORMANCE_CLASSES.shadowMinimal}`}>
            <ChatHeader />
          </div>
        </PerformanceProfiler>
        
        {/* Chat Messages Area - Direct rendering, no inner container */}
        <div 
          ref={chatContainerRef} 
          className={`flex-grow ${PERFORMANCE_CLASSES.mobileScroll} ${
            isMobile ? 'p-0 space-y-2 pt-3' : 'p-0 space-y-4 pt-6'
          } scroll-smooth`}
          style={{ 
            scrollBehavior: 'smooth',
            willChange: 'scroll-position',
            // Mobile-specific optimizations
            ...(isMobile && {
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              // Adjust height when keyboard is open
              ...(isKeyboardOpen && {
                height: `calc(100% - ${keyboardHeight}px)`,
                transition: 'height 0.3s ease-out'
              })
            })
          }}
        >
          <PerformanceProfiler id="FunnelPreviewChat-Messages">
            {messageList}
          </PerformanceProfiler>
          
          {/* Response Options - Direct in messages area */}
          <PerformanceProfiler id="FunnelPreviewChat-Options">
            <ChatOptions
              options={options}
              optionsLeadingToOffer={optionsLeadingToOffer}
              selectedOffer={selectedOffer}
              onOptionClick={handleOptionClick}
            />
          </PerformanceProfiler>
          
          <div ref={chatEndRef} />
        </div>
        
        {/* Conversation End State - Show Start Over when no options or conversation ended */}
        {(options.length === 0 || !currentBlockId) && (
          <PerformanceProfiler id="FunnelPreviewChat-Restart">
            <ChatRestartButton onRestart={startConversation} />
          </PerformanceProfiler>
        )}

        {/* Mobile-optimized Performance Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className={`fixed ${isMobile ? 'bottom-2 right-2' : 'bottom-4 right-4'} bg-black/80 text-white text-xs p-2 rounded ${
            isMobile ? 'text-[10px]' : 'text-xs'
          }`}>
            <div>Preview Chat Performance:</div>
            <div>Render: {performanceMetrics.renderTime.toFixed(1)}ms</div>
            <div>Scroll: {performanceMetrics.scrollTime.toFixed(1)}ms</div>
            <div>Memory: {performanceMetrics.memoryUsage}MB</div>
            <div>Messages: {history.length}</div>
            <div>Virtual: {shouldUseVirtualScrolling ? 'ON' : 'OFF'}</div>
            <div className="text-green-400">Mobile: {isMobile ? 'YES' : 'NO'}</div>
            <div className="text-blue-400">Touch: {isTouch ? 'YES' : 'NO'}</div>
            <div className="text-yellow-400">Keyboard: {isKeyboardOpen ? 'OPEN' : 'CLOSED'}</div>
            <div className="text-purple-400">Input Focus: {isInputFocused ? 'YES' : 'NO'}</div>
            {isKeyboardOpen && <div className="text-orange-400">Height: {keyboardHeight}px</div>}
          </div>
        )}
      </div>

      {/* Completely Separate Chat Input - Fixed positioning when keyboard opens */}
      {options.length > 0 && currentBlockId && (
        <PerformanceProfiler id="FunnelPreviewChat-Input">
          <OptimizedChatInput
            onSendMessage={handleCustomInput}
            placeholder="Type or choose response"
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            isMobile={isMobile}
            isKeyboardOpen={isKeyboardOpen}
          />
        </PerformanceProfiler>
      )}
    </PerformanceProfiler>
  );
});

FunnelPreviewChat.displayName = 'FunnelPreviewChat';

export default FunnelPreviewChat;



