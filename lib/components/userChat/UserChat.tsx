'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button, Text } from 'frosted-ui';
import { Send, ArrowLeft } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { useOptimizedKeyboardDetection } from '../../hooks/useOptimizedKeyboardDetection';
import { FunnelFlow } from '../../types/funnel';
import ErrorBoundary from '../common/ErrorBoundary';

interface UserChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  onBack?: () => void;
}

/**
 * --- Ultra-Optimized Native Whop Chat Component ---
 * 
 * This is an ultra-optimized version with:
 * - Lightning-fast keyboard detection (RAF throttled)
 * - Native Whop DM chat design
 * - Minimal re-renders and maximum performance
 * - Hardware-accelerated animations
 * - WhatsApp-like smooth transitions
 * 
 * Performance Optimizations:
 * - RAF-throttled keyboard detection
 * - Minimal state updates
 * - Hardware-accelerated transforms
 * - Optimized memoization
 * - Native driver animations
 */
const UserChat: React.FC<UserChatProps> = React.memo(({ 
  funnelFlow, 
  conversationId,
  onMessageSent,
  onBack
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Ultra-optimized keyboard detection
  const keyboardState = useOptimizedKeyboardDetection();

  const {
    history,
    currentBlockId,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow);

  // Ultra-fast auto-scroll with RAF
  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  // Optimized message handlers
  const handleUserMessage = useCallback((message: string) => {
    handleCustomInput(message);
    onMessageSent?.(message, conversationId);
  }, [handleCustomInput, onMessageSent, conversationId]);

  const handleUserOptionClick = useCallback((option: any, index: number) => {
    handleOptionClick(option, index);
    onMessageSent?.(`${index + 1}. ${option.text}`, conversationId);
  }, [handleOptionClick, onMessageSent, conversationId]);

  // Ultra-fast form handling
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim()) {
      handleUserMessage(message.trim());
      setMessage('');
    }
  }, [message, handleUserMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Optimized textarea resize
  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  }, []);

  // Ultra-optimized message list with minimal re-renders
  const messageList = useMemo(() => 
    history.map((msg, index) => (
      <div 
        key={`${msg.type}-${index}-${msg.text.length}`} 
        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
        style={{ willChange: 'transform' }}
      >
        <div className="flex items-end gap-2 max-w-[85%]">
          {/* Avatar - Only show for bot messages */}
          {msg.type === 'bot' && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Text size="1" weight="bold" className="text-white">
                AI
              </Text>
            </div>
          )}
          
          {/* Message Bubble - Native Whop DM Style */}
          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
            msg.type === 'user' 
              ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white rounded-br-md' 
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-bl-md'
          }`}>
            <Text 
              size="2" 
              className={`whitespace-pre-wrap leading-relaxed ${
                msg.type === 'user' ? 'text-white' : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {msg.text}
            </Text>
          </div>

          {/* User Avatar - Only show for user messages */}
          {msg.type === 'user' && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Text size="1" weight="bold" className="text-white">
                You
              </Text>
            </div>
          )}
        </div>
      </div>
    )), [history]
  );

  // Ultra-optimized options list
  const optionsList = useMemo(() => 
    options.map((opt, i) => (
      <button
        key={`option-${i}-${opt.text.length}`}
        onClick={() => handleUserOptionClick(opt, i)}
        className="w-full p-4 border rounded-2xl transition-all duration-200 text-left group bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 border-violet-400 hover:border-violet-500 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
        style={{ willChange: 'transform' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white/20 border-white/30">
            <Text size="1" weight="bold" className="text-white">
              {i + 1}
            </Text>
          </div>
          <Text size="2" className="text-white group-hover:text-white transition-colors font-medium">
            {opt.text}
          </Text>
        </div>
      </button>
    )), [options, handleUserOptionClick]
  );

  return (
    <ErrorBoundary>
      <div className="h-screen w-full flex flex-col relative bg-gray-50 dark:bg-gray-900">
        {/* Native Whop Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <div className="flex-1">
              <Text size="3" weight="semibold" className="text-gray-900 dark:text-gray-100">
                AI Assistant
              </Text>
              <Text size="1" className="text-gray-500 dark:text-gray-400">
                Online
              </Text>
            </div>
          </div>
        </div>

        {/* Main Chat Container - Ultra-optimized with hardware acceleration */}
        <div 
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
          style={{
            height: keyboardState.isVisible 
              ? `calc(100vh - ${keyboardState.height}px - 73px)` 
              : 'calc(100vh - 73px)',
            transform: keyboardState.isVisible 
              ? `translate3d(0, -${keyboardState.height}px, 0)` 
              : 'translate3d(0, 0, 0)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
          }}
        >
          {/* Messages Area - Optimized scrolling */}
          <div 
            ref={chatContainerRef} 
            className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0"
            style={{ 
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <ErrorBoundary>
              {messageList}
            </ErrorBoundary>
            
            {/* Options - Native Whop DM Style */}
            {history.length > 0 && history[history.length - 1].type === 'bot' && options.length > 0 && (
              <ErrorBoundary>
                <div className="flex justify-end mb-3">
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="max-w-full">
                      <div className="space-y-2">
                        {optionsList}
                      </div>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center flex-shrink-0 shadow-sm">
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

          {/* Native Whop Input Area - Ultra-optimized */}
          {options.length > 0 && currentBlockId && (
            <div 
              className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
              style={{ willChange: 'transform' }}
            >
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onInput={handleTextareaInput}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 pr-12 bg-gray-100 dark:bg-gray-700 border-0 rounded-2xl text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white dark:focus:bg-gray-600 transition-all duration-200 resize-none min-h-[44px] max-h-32 overflow-hidden"
                      style={{
                        height: 'auto',
                        minHeight: '44px',
                      }}
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim()}
                  className="p-3 rounded-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                  style={{ willChange: 'transform' }}
                >
                  <Send size={18} strokeWidth={2.5} className="text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Start Over Button - Native Style */}
          {(options.length === 0 || !currentBlockId) && (
            <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-center">
                <button
                  onClick={startConversation}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white rounded-2xl font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
                  style={{ willChange: 'transform' }}
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reserved Keyboard Space - Ultra-smooth */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900"
          style={{
            height: keyboardState.isVisible ? `${keyboardState.height}px` : '0px',
            opacity: keyboardState.isVisible ? 1 : 0,
            transform: keyboardState.isVisible 
              ? 'translate3d(0, 0, 0)' 
              : `translate3d(0, ${keyboardState.height}px, 0)`,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform, opacity, height',
          }}
        />
      </div>
    </ErrorBoundary>
  );
});

UserChat.displayName = 'UserChat';

export default UserChat;
