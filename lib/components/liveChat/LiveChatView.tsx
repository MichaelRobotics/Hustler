'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatHeader from './ChatHeader';
import LiveChatInput from './LiveChatInput';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import ErrorBoundary from '../common/ErrorBoundary';
import LoadingSpinner from '../common/LoadingSpinner';
import { LiveChatViewProps } from '../../types/liveChat';

const LiveChatView: React.FC<LiveChatViewProps> = React.memo(({
  conversation,
  onSendMessage,
  onUpdateConversation,
  onBack,
  onTypingChange,
  isLoading = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive - optimized for mobile
  const messageCount = conversation.messages.length;
  const [shouldScroll, setShouldScroll] = useState(true);
  
  useEffect(() => {
    if (messageCount > 0 && shouldScroll) {
      // Use instant scroll on mobile for better performance
      const isMobile = window.innerWidth < 768;
      chatEndRef.current?.scrollIntoView({ 
        behavior: isMobile ? 'instant' : 'smooth',
        block: 'end'
      });
    }
  }, [messageCount, shouldScroll]);


  const handleSendMessage = async () => {
    if (newMessage.trim() && !isSendingMessage) {
      setIsSendingMessage(true);
      try {
        await onSendMessage(newMessage.trim());
        setNewMessage('');
        setIsTyping(true);
        
        // Simulate bot typing indicator
        setTimeout(() => {
          setIsTyping(false);
        }, 2000);
      } catch (error) {
        console.error('Failed to send message:', error);
        // Keep the message in input on error
      } finally {
        setIsSendingMessage(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    onTypingChange?.(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    onTypingChange?.(false);
  };

  // Handle scroll events to detect user scrolling (for auto-scroll control)
  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldScroll(isNearBottom);
    }
  }, []);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl shadow-lg backdrop-blur-sm dark:shadow-2xl dark:shadow-violet-500/20 dark:shadow-black/20 overflow-hidden h-full max-h-full box-border">
        {/* Chat Header */}
        <div className="flex-shrink-0">
          <ErrorBoundary>
            <ChatHeader
              conversation={conversation}
              onBack={onBack}
              onUpdateConversation={onUpdateConversation}
            />
          </ErrorBoundary>
        </div>

        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500"
          style={{
            // Mobile performance optimizations
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            willChange: 'scroll-position'
          }}
          onScroll={handleScroll}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="md" text="Loading messages..." />
            </div>
          ) : (
            <ErrorBoundary>
              {conversation.messages.map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message} 
                  user={conversation.user} 
                />
              ))}
            </ErrorBoundary>
          )}

          {/* Typing Indicator */}
          {isTyping && <TypingIndicator user={conversation.user} />}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30 mt-auto">
          <ErrorBoundary>
            <LiveChatInput
              value={newMessage}
              onChange={handleInputChange}
              onSend={handleSendMessage}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              disabled={isTyping || isSendingMessage}
              placeholder={isSendingMessage ? "Sending..." : `Reply to ${conversation.user.name}...`}
            />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
});

LiveChatView.displayName = 'LiveChatView';

export default LiveChatView;
