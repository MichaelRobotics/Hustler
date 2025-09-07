'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Text } from 'frosted-ui';
import { Send, ArrowLeft, Sun, Moon, User } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelFlow } from '../../types/funnel';
import { useTheme } from '../common/ThemeProvider';

interface UserChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  onBack?: () => void;
  hideAvatar?: boolean;
}

/**
 * --- Ultra-High-Performance Chat Component ---
 * 
 * Maximum performance with:
 * - No unnecessary re-renders
 * - Minimal hooks and callbacks
 * - Direct DOM manipulation
 * - Zero animations
 * - Native browser behavior only
 */
const UserChat: React.FC<UserChatProps> = ({ 
  funnelFlow, 
  conversationId,
  onMessageSent,
  onBack,
  hideAvatar = false
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { appearance, toggleTheme } = useTheme();

  const {
    history,
    currentBlockId,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow);

  // Direct handlers - no callbacks for maximum performance
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim()) {
      handleCustomInput(message.trim());
      onMessageSent?.(message.trim(), conversationId);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  const handleOptionClickLocal = (option: any, index: number) => {
    handleOptionClick(option, index);
    onMessageSent?.(`${index + 1}. ${option.text}`, conversationId);
    // Smooth scroll after option click
    setTimeout(scrollToBottom, 100);
  };

  // Smooth scroll to bottom after keyboard animation
  const scrollToBottom = () => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  // Handle keyboard fold/unfold with smooth scroll (only on fold)
  useEffect(() => {
    let previousViewportHeight = window.visualViewport?.height || window.innerHeight;
    
    const handleViewportChange = () => {
      const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
      
      // Only scroll when keyboard appears (viewport height decreases)
      if (currentViewportHeight < previousViewportHeight) {
        // Timeout to let keyboard animation complete
        setTimeout(scrollToBottom, 250);
      }
      
      previousViewportHeight = currentViewportHeight;
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

  // Direct rendering - no memoization for maximum performance
  const messageList = history.map((msg, index) => (
    <div 
      key={`${msg.type}-${index}`} 
      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-4 px-1`}
    >
      <div className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-xl ${
        msg.type === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 text-gray-900 dark:text-gray-100 shadow-sm'
      }`}>
        <Text size="2" className="whitespace-pre-wrap leading-relaxed text-base">
          {msg.text}
        </Text>
      </div>
    </div>
  ));

  const optionsList = options.map((opt, i) => (
    <button
      key={`option-${i}`}
      onClick={() => handleOptionClickLocal(opt, i)}
      className="inline-flex items-center gap-3 pl-4 pr-4 py-3 rounded-lg bg-blue-500 text-white text-left touch-manipulation active:bg-blue-600 active:scale-95 transition-all duration-150"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
        {i + 1}
      </span>
      <Text size="2" className="text-white leading-relaxed">
        {opt.text}
      </Text>
    </button>
  ));

  return (
    <div className="h-screen w-full flex flex-col bg-surface dark:bg-surface touch-manipulation">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack} 
                className="p-2 rounded-lg touch-manipulation text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
              </button>
            )}
            
            {/* Avatar Icon - only show if not hidden */}
            {!hideAvatar && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
            )}
            
            <div>
              <Text size="3" weight="semi-bold" className="text-black dark:text-white">
                Hustler
              </Text>
            </div>
          </div>
          
          {/* Theme Toggle Button */}
          <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg touch-manipulation transition-all duration-200 hover:scale-105"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title={appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {appearance === 'dark' ? (
                <Sun size={20} className="text-foreground/70 dark:text-foreground/70" />
              ) : (
                <Moon size={20} className="text-foreground/70 dark:text-foreground/70" />
              )}
            </button>
          </div>
        </div>
        
        {/* Subtle Separator Line */}
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-violet-300/40 dark:via-violet-600/40 to-transparent mt-3" />
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 touch-pan-y"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain'
          }}
        >
          {messageList}
          
          {/* Options - User side (right side) */}
          {history.length > 0 && history[history.length - 1].type === 'bot' && options.length > 0 && (
            <div className="flex justify-end mb-4 pr-0">
              <div className="space-y-2 flex flex-col items-end">
                {optionsList}
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        {options.length > 0 && currentBlockId && (
          <div className="flex-shrink-0 p-4 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-t border-border/30 dark:border-border/20 shadow-lg safe-area-bottom">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onInput={handleTextareaInput}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-border/30 dark:border-border/20 rounded-xl text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[48px] max-h-32 touch-manipulation shadow-sm"
                  style={{
                    height: 'auto',
                    minHeight: '48px',
                    fontSize: '16px', // Prevents zoom on iOS
                  }}
                />
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className="p-3 rounded-xl bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed touch-manipulation active:bg-blue-600 active:scale-95 transition-all duration-150"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Send size={18} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Start Button */}
        {(options.length === 0 || !currentBlockId) && (
          <div className="flex-shrink-0 p-4 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-t border-border/30 dark:border-border/20 shadow-lg safe-area-bottom">
            <button
              onClick={startConversation}
              className="w-full py-4 bg-blue-500 text-white rounded-xl font-medium text-base touch-manipulation active:bg-blue-600 active:scale-95 transition-all duration-150"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Start Conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

UserChat.displayName = 'UserChat';

export default UserChat;
