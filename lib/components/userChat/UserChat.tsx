'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button, Text } from 'frosted-ui';
import { Send } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { useKeyboardDetection } from '../../hooks/useKeyboardDetection';
import { FunnelFlow } from '../../types/funnel';
import ErrorBoundary from '../common/ErrorBoundary';

interface UserChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
}

/**
 * --- Reworked User Chat Component ---
 * 
 * This is a completely reworked version of the UserChat component with:
 * - Smart keyboard detection and space reservation
 * - No jarring animations when keyboard appears
 * - Smooth transitions with prepared space
 * - Theme-aware keyboard space background
 * - Optimized mobile experience
 * 
 * Key Features:
 * - Calculates keyboard space before it appears
 * - Reserves space at bottom with appropriate background
 * - Moves chat content above reserved space
 * - Smooth keyboard slide-in animation
 * - No content jumping or layout shifts
 */
const UserChat: React.FC<UserChatProps> = React.memo(({ 
  funnelFlow, 
  conversationId,
  onMessageSent 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Keyboard detection hook
  const keyboardState = useKeyboardDetection();

  const {
    history,
    currentBlockId,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Enhanced message handler with conversation tracking
  const handleUserMessage = useCallback((message: string) => {
    handleCustomInput(message);
    
    if (onMessageSent) {
      onMessageSent(message, conversationId);
    }
  }, [handleCustomInput, onMessageSent, conversationId]);

  // Enhanced option click handler
  const handleUserOptionClick = useCallback((option: any, index: number) => {
    handleOptionClick(option, index);
    
    if (onMessageSent) {
      onMessageSent(`${index + 1}. ${option.text}`, conversationId);
    }
  }, [handleOptionClick, onMessageSent, conversationId]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      handleUserMessage(message.trim());
      setMessage('');
    }
  }, [message, handleUserMessage]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // Auto-resize textarea
  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
  }, []);

  // Memoize message list to prevent unnecessary re-renders
  const messageList = useMemo(() => 
    history.map((msg, index) => (
      <div key={`${msg.type}-${index}-${msg.text.length}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className="flex items-end gap-2">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            msg.type === 'user' ? 'bg-gray-500' : 'bg-violet-500'
          }`}>
            <Text size="1" weight="bold" className="text-white">
              {msg.type === 'user' ? 'You' : 'AI'}
            </Text>
          </div>
          
          {/* Message Bubble */}
          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
            msg.type === 'user' 
              ? 'bg-violet-500 text-white' 
              : 'bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30'
          }`}>
            <Text 
              size="2" 
              className={`whitespace-pre-wrap ${
                msg.type === 'user' ? 'text-white' : 'text-foreground'
              }`}
            >
              {msg.text}
            </Text>
          </div>
        </div>
      </div>
    )), [history]
  );

  // Memoize options list to prevent unnecessary re-renders
  const optionsList = useMemo(() => 
    options.map((opt, i) => (
      <button
        key={`option-${i}-${opt.text.length}`}
        onClick={() => handleUserOptionClick(opt, i)}
        className="w-full p-3 border rounded-xl transition-all duration-200 text-left group bg-violet-500 hover:bg-violet-600 border-violet-400 hover:border-violet-500"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 bg-white/20 border-white/30">
            <Text size="1" weight="bold" className="text-white">
              {i + 1}
            </Text>
          </div>
          <Text size="2" className="text-white group-hover:text-white transition-colors">
            {opt.text}
          </Text>
        </div>
      </button>
    )), [options, handleUserOptionClick]
  );

  return (
    <ErrorBoundary>
      <div className="h-screen w-full flex flex-col relative">
        {/* Main Chat Container - Uses calculated space above keyboard */}
        <div 
          className="flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            height: keyboardState.isVisible 
              ? `calc(100vh - ${keyboardState.height}px)` 
              : '100vh',
            transform: keyboardState.isVisible 
              ? `translateY(-${keyboardState.height}px)` 
              : 'translateY(0)',
          }}
        >
          {/* Messages Area - Scrollable */}
          <div 
            ref={chatContainerRef} 
            className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
          >
            <ErrorBoundary>
              {messageList}
            </ErrorBoundary>
            
            {/* Show clickable options below the last bot message */}
            {history.length > 0 && history[history.length - 1].type === 'bot' && options.length > 0 && (
              <ErrorBoundary>
                <div className="flex justify-end">
                  <div className="flex items-end gap-2">
                    {/* Options Container */}
                    <div className="max-w-xs lg:max-w-md">
                      <div className="space-y-2">
                        {optionsList}
                      </div>
                    </div>
                    
                    {/* User Avatar */}
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

          {/* Chat Input Area - Fixed at bottom of chat container */}
          {options.length > 0 && currentBlockId && (
            <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onInput={handleTextareaInput}
                      placeholder="Type or choose response"
                      rows={1}
                      className="w-full px-4 py-3 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 resize-none min-h-[44px] max-h-32 overflow-hidden"
                      style={{
                        height: 'auto',
                        minHeight: '44px',
                      }}
                    />
                  </div>
                </div>
                
                <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200">
                  <Button
                    size="3"
                    variant="ghost"
                    color="violet"
                    onClick={handleSubmit}
                    disabled={!message.trim()}
                    className="px-4 py-3 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Start Over Button when no options */}
          {(options.length === 0 || !currentBlockId) && (
            <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
              <div className="flex justify-center">
                <Button
                  size="2"
                  color="violet"
                  onClick={startConversation}
                  className="px-6 py-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
                >
                  Start Over
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Reserved Keyboard Space - Theme-aware background */}
        <div 
          className="absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out bg-white dark:bg-gray-900"
          style={{
            height: keyboardState.isVisible ? `${keyboardState.height}px` : '0px',
            opacity: keyboardState.isVisible ? 1 : 0,
            transform: keyboardState.isVisible 
              ? 'translateY(0)' 
              : `translateY(${keyboardState.height}px)`,
          }}
        >
          {/* Optional: Add subtle gradient or pattern to keyboard space */}
          <div className="w-full h-full bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-800 dark:to-transparent opacity-50" />
        </div>
      </div>
    </ErrorBoundary>
  );
});

UserChat.displayName = 'UserChat';

export default UserChat;
