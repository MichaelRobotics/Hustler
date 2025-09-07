'use client';

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useFunnelPreviewChat } from '../../../hooks/useFunnelPreviewChat';
import { FunnelFlow } from '../../../types/funnel';
import { ChatHeader, ChatMessage, ChatInput } from '../../funnelBuilder/components';
import ErrorBoundary from '../../common/ErrorBoundary';
import { Text } from 'frosted-ui';

/**
 * Ultra-Optimized UserChat Component
 * 
 * Based on performance test results, this version implements:
 * - Virtual scrolling for large message lists
 * - Aggressive memoization and caching
 * - Reduced DOM operations
 * - Optimized re-render prevention
 * - Memory-efficient message handling
 */

interface UltraOptimizedChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
}

// Ultra-performance CSS classes
const ULTRA_PERFORMANCE_CLASSES = {
  // Minimal animations for maximum performance
  messageContainer: 'transform-gpu will-change-transform',
  messageSlideIn: 'animate-fade-in-up',
  
  // Optimized hover effects
  buttonHover: 'transition-transform duration-150 ease-out hover:scale-[1.01]',
  buttonActive: 'active:scale-[0.99]',
  
  // Minimal shadows and effects
  shadowMinimal: 'shadow-sm',
  
  // Performance-optimized containers
  containerOptimized: 'contain-layout contain-style',
} as const;

// Virtual scrolling hook for large message lists
const useVirtualScrolling = (items: any[], itemHeight: number = 80, containerHeight: number = 400) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    containerRef,
    visibleItems,
    offsetY,
    handleScroll,
    totalHeight: items.length * itemHeight
  };
};

// Message memoization for preventing unnecessary re-renders
const MemoizedChatMessage = React.memo(({ message, index }: { message: any; index: number }) => {
  return (
    <div 
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} ${ULTRA_PERFORMANCE_CLASSES.messageContainer}`}
      style={{ 
        animationDelay: `${index * 20}ms`,
        animationFillMode: 'forwards'
      }}
    >
      <ChatMessage message={message} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for maximum performance
  return (
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.type === nextProps.message.type &&
    prevProps.index === nextProps.index
  );
});

// Options memoization
const MemoizedOption = React.memo(({ 
  option, 
  index, 
  onClick 
}: { 
  option: any; 
  index: number; 
  onClick: (option: any, index: number) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick(option, index);
  }, [option, index, onClick]);

  return (
    <button
      onClick={handleClick}
      className={`
        w-full p-3 border rounded-xl text-left group 
        bg-violet-500 hover:bg-violet-600 border-violet-400 hover:border-violet-500
        ${ULTRA_PERFORMANCE_CLASSES.buttonHover} ${ULTRA_PERFORMANCE_CLASSES.buttonActive}
        ${ULTRA_PERFORMANCE_CLASSES.shadowMinimal}
      `}
      style={{ willChange: 'transform' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 bg-white/20 border-white/30">
          <Text size="1" weight="bold" className="text-white">
            {index + 1}
          </Text>
        </div>
        <Text size="2" className="text-white group-hover:text-white transition-colors duration-150">
          {option.text}
        </Text>
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.option.text === nextProps.option.text &&
    prevProps.index === nextProps.index
  );
});

const UltraOptimizedChat: React.FC<UltraOptimizedChatProps> = React.memo(({ 
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

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    scrollTime: 0,
    memoryUsage: 0
  });

  // Virtual scrolling for large message lists
  const shouldUseVirtualScrolling = history.length > 50;
  const virtualScrolling = useVirtualScrolling(
    history, 
    80, // Estimated message height
    400 // Container height
  );

  // Aggressive memoization of message handlers
  const handleUserMessage = useCallback((message: string) => {
    const startTime = performance.now();
    
    handleCustomInput(message);
    
    if (onMessageSent) {
      onMessageSent(message, conversationId);
    }
    
    const endTime = performance.now();
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime
    }));
  }, [handleCustomInput, onMessageSent, conversationId]);

  const handleUserOptionClick = useCallback((option: any, index: number) => {
    const startTime = performance.now();
    
    handleOptionClick(option, index);
    
    if (onMessageSent) {
      onMessageSent(`${index + 1}. ${option.text}`, conversationId);
    }
    
    const endTime = performance.now();
    setPerformanceMetrics(prev => ({
      ...prev,
      renderTime: endTime - startTime
    }));
  }, [handleOptionClick, onMessageSent, conversationId]);

  // Ultra-optimized message list with virtual scrolling
  const messageList = useMemo(() => {
    if (shouldUseVirtualScrolling) {
      return (
        <div 
          ref={virtualScrolling.containerRef}
          className="h-full overflow-y-auto"
          onScroll={virtualScrolling.handleScroll}
          style={{ height: '400px' }}
        >
          <div style={{ height: virtualScrolling.totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${virtualScrolling.offsetY}px)` }}>
              {virtualScrolling.visibleItems.map((msg, index) => (
                <MemoizedChatMessage 
                  key={`msg-${msg.type}-${index}-${msg.text.slice(0, 10)}`}
                  message={msg} 
                  index={index} 
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // For small lists, use regular rendering
    return history.map((msg, index) => (
      <MemoizedChatMessage 
        key={`msg-${msg.type}-${index}-${msg.text.slice(0, 10)}`}
        message={msg} 
        index={index} 
      />
    ));
  }, [history, shouldUseVirtualScrolling, virtualScrolling]);

  // Ultra-optimized options list
  const optionsList = useMemo(() => 
    options.map((opt, i) => (
      <MemoizedOption
        key={`option-${i}-${opt.text.slice(0, 15)}`}
        option={opt}
        index={i}
        onClick={handleUserOptionClick}
      />
    )), [options, handleUserOptionClick]
  );

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
    <ErrorBoundary>
      <div className={`h-full flex flex-col ${ULTRA_PERFORMANCE_CLASSES.containerOptimized}`}>
        {/* Ultra-optimized Chat Header */}
        <ErrorBoundary>
          <div className={`sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 py-3 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 ${ULTRA_PERFORMANCE_CLASSES.shadowMinimal}`}>
            <ChatHeader />
          </div>
        </ErrorBoundary>
        
        {/* Ultra-optimized Chat Messages Area */}
        <div 
          ref={chatContainerRef} 
          className="flex-grow overflow-y-auto p-0 space-y-4 pt-6 scroll-smooth"
          style={{ 
            scrollBehavior: 'smooth',
            willChange: 'scroll-position'
          }}
        >
          <ErrorBoundary>
            {messageList}
          </ErrorBoundary>
          
          {/* Ultra-optimized Options Display */}
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
        
        {/* Ultra-optimized Chat Input */}
        {options.length > 0 && currentBlockId && (
          <ErrorBoundary>
            <ChatInput
              onSendMessage={handleUserMessage}
              placeholder="Type or choose response"
            />
          </ErrorBoundary>
        )}

        {/* Performance Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black/80 text-white text-xs p-2 rounded">
            <div>Render: {performanceMetrics.renderTime.toFixed(1)}ms</div>
            <div>Scroll: {performanceMetrics.scrollTime.toFixed(1)}ms</div>
            <div>Memory: {performanceMetrics.memoryUsage}MB</div>
            <div>Messages: {history.length}</div>
            <div>Virtual: {shouldUseVirtualScrolling ? 'ON' : 'OFF'}</div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
});

UltraOptimizedChat.displayName = 'UltraOptimizedChat';

export default UltraOptimizedChat;
