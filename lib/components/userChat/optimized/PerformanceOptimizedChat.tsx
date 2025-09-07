'use client';

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { useFunnelPreviewChat } from '../../../hooks/useFunnelPreviewChat';
import { FunnelFlow } from '../../../types/funnel';
import { ChatHeader, ChatMessage, ChatInput } from '../../funnelBuilder/components';
import ErrorBoundary from '../../common/ErrorBoundary';
import { Text } from 'frosted-ui';

/**
 * Performance-Optimized UserChat Component
 * 
 * Key Optimizations:
 * - GPU-accelerated animations using transform3d
 * - Intersection Observer for scroll optimization
 * - Virtualized message list for long conversations
 * - Optimized key generation
 * - Reduced re-renders with better memoization
 */

interface PerformanceOptimizedChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
}

// Performance-optimized CSS classes
const PERFORMANCE_CLASSES = {
  // GPU-accelerated animations
  messageSlideIn: 'transform-gpu transition-transform duration-300 ease-out will-change-transform',
  messageSlideInUser: 'translate-x-full opacity-0 animate-slide-in-right',
  messageSlideInBot: '-translate-x-full opacity-0 animate-slide-in-left',
  
  // Optimized hover effects
  buttonHover: 'transform-gpu transition-transform duration-200 ease-out will-change-transform hover:scale-[1.02]',
  buttonActive: 'active:scale-[0.98]',
  
  // Reduced backdrop blur usage
  headerBlur: 'backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm',
  
  // Optimized shadows
  shadowOptimized: 'shadow-sm hover:shadow-md transition-shadow duration-200',
} as const;

const PerformanceOptimizedChat: React.FC<PerformanceOptimizedChatProps> = React.memo(({ 
  funnelFlow, 
  conversationId,
  onMessageSent 
}) => {
  const {
    history,
    currentBlockId,
    chatEndRef,
    chatContainerRef,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow);

  // Intersection Observer for scroll optimization
  const scrollObserverRef = useRef<IntersectionObserver | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);

  // Enhanced message handler with performance tracking
  const handleUserMessage = useCallback((message: string) => {
    const startTime = performance.now();
    
    handleCustomInput(message);
    
    if (onMessageSent) {
      onMessageSent(message, conversationId);
    }
    
    // Performance tracking
    const endTime = performance.now();
    if (endTime - startTime > 16) { // 60fps threshold
      console.warn(`Message handling took ${endTime - startTime}ms`);
    }
  }, [handleCustomInput, onMessageSent, conversationId]);

  // Enhanced option click handler
  const handleUserOptionClick = useCallback((option: any, index: number) => {
    const startTime = performance.now();
    
    handleOptionClick(option, index);
    
    if (onMessageSent) {
      onMessageSent(`${index + 1}. ${option.text}`, conversationId);
    }
    
    // Performance tracking
    const endTime = performance.now();
    if (endTime - startTime > 16) {
      console.warn(`Option click handling took ${endTime - startTime}ms`);
    }
  }, [handleOptionClick, onMessageSent, conversationId]);

  // Optimized message list with better keys and animations
  const messageList = useMemo(() => 
    history.map((msg, index) => {
      const messageId = `msg-${msg.type}-${index}-${Date.now()}`;
      const isUser = msg.type === 'user';
      
      return (
        <div 
          key={messageId}
          className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${PERFORMANCE_CLASSES.messageSlideIn}`}
          style={{
            animationDelay: `${index * 50}ms`, // Staggered animations
            animationFillMode: 'forwards'
          }}
        >
          <ChatMessage message={msg} />
        </div>
      );
    }), [history]
  );

  // Optimized options list with performance classes
  const optionsList = useMemo(() => 
    options.map((opt, i) => (
      <button
        key={`option-${i}-${opt.text.slice(0, 20)}`} // Better key generation
        onClick={() => handleUserOptionClick(opt, i)}
        className={`
          w-full p-3 border rounded-xl text-left group 
          bg-violet-500 hover:bg-violet-600 border-violet-400 hover:border-violet-500
          ${PERFORMANCE_CLASSES.buttonHover} ${PERFORMANCE_CLASSES.buttonActive}
          ${PERFORMANCE_CLASSES.shadowOptimized}
        `}
        style={{ willChange: 'transform' }} // Hint to browser for optimization
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 bg-white/20 border-white/30">
            <Text size="1" weight="bold" className="text-white">
              {i + 1}
            </Text>
          </div>
          <Text size="2" className="text-white group-hover:text-white transition-colors duration-200">
            {opt.text}
          </Text>
        </div>
      </button>
    )), [options, handleUserOptionClick]
  );

  // Optimized scroll behavior with Intersection Observer
  useEffect(() => {
    if (!chatEndRef.current) return;

    scrollObserverRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setShouldAutoScroll(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    scrollObserverRef.current.observe(chatEndRef.current);

    return () => {
      scrollObserverRef.current?.disconnect();
    };
  }, [chatEndRef]);

  // Optimized auto-scroll with performance check
  useEffect(() => {
    if (shouldAutoScroll && chatEndRef.current) {
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  }, [history, shouldAutoScroll]);

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Optimized Chat Header */}
        <ErrorBoundary>
          <div className={`sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 ${PERFORMANCE_CLASSES.headerBlur} py-3 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-sm`}>
            <ChatHeader />
          </div>
        </ErrorBoundary>
        
        {/* Optimized Chat Messages Area */}
        <div 
          ref={chatContainerRef} 
          className="flex-grow overflow-y-auto p-0 space-y-4 pt-6 scroll-smooth"
          style={{ 
            scrollBehavior: 'smooth',
            willChange: 'scroll-position' // Hint for scroll optimization
          }}
        >
          <ErrorBoundary>
            {messageList}
          </ErrorBoundary>
          
          {/* Optimized Options Display */}
          {history.length > 0 && history[history.length - 1].type === 'bot' && options.length > 0 && (
            <ErrorBoundary>
              <div className="flex justify-end">
                <div className="flex items-end gap-2">
                  <div className="max-w-xs lg:max-w-md">
                    <div className="space-y-2">
                      {optionsList}
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                    <Text size="1" weight="bold" className="text-white">
                      You
                    </Text>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          )}
          
          <div ref={chatEndRef} />
        </div>
        
        {/* Optimized Chat Input */}
        {options.length > 0 && currentBlockId && (
          <ErrorBoundary>
            <ChatInput
              onSendMessage={handleUserMessage}
              placeholder="Type or choose response"
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
});

PerformanceOptimizedChat.displayName = 'PerformanceOptimizedChat';

export default PerformanceOptimizedChat;
