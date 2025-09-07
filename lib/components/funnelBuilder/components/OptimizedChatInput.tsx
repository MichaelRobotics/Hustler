'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from 'frosted-ui';

interface OptimizedChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  isMobile?: boolean;
  isKeyboardOpen?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * --- Optimized Chat Input Component ---
 * Completely separate from message container with proper mobile keyboard handling
 * 
 * Features:
 * - Fixed positioning when keyboard opens
 * - Smooth animations matching Whop's native chat
 * - Auto-resize textarea
 * - Mobile-optimized touch targets
 * - Proper safe area handling
 */
export const OptimizedChatInput: React.FC<OptimizedChatInputProps> = React.memo(({ 
  onSendMessage, 
  placeholder = "Type your message...",
  isMobile = false,
  isKeyboardOpen = false,
  onFocus,
  onBlur
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = isMobile ? 120 : 100; // Smaller max height on mobile
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [isMobile]);

  // Handle message send
  const handleSend = useCallback(async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setIsSending(false);
    }
  }, [message, isSending, onSendMessage]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle message change and auto-resize
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  // Auto-resize on mount and when message changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Focus handling
  const handleFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  return (
    <div 
      className={`
        w-full border-t border-border/30 dark:border-border/20 
        bg-surface/95 dark:bg-surface/90 backdrop-blur-sm
        ${isMobile ? 'p-3' : 'p-4'}
      `}
      style={{
        // Mobile keyboard positioning
        ...(isMobile && isKeyboardOpen && {
          position: 'fixed',
          bottom: '0px',
          left: '0px',
          right: '0px',
          zIndex: 50,
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          transition: 'all 0.3s ease-out',
          paddingBottom: 'env(safe-area-inset-bottom)'
        })
      }}
    >
      <div className="flex items-end gap-3">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isSending}
            className={`
              w-full resize-none border border-border/30 dark:border-border/20 
              rounded-xl bg-background/50 dark:bg-background/30 
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
              transition-all duration-200
              ${isMobile ? 'px-3 py-2 text-base min-h-[44px]' : 'px-4 py-3 text-sm min-h-[40px]'}
            `}
            style={{
              fontSize: isMobile ? '16px' : '14px', // Prevent iOS zoom
              lineHeight: '1.4',
              maxHeight: isMobile ? '120px' : '100px'
            }}
            rows={1}
          />
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          size={isMobile ? "2" : "1"}
          className={`
            flex-shrink-0 transition-all duration-200
            ${isMobile ? 'min-h-[44px] min-w-[44px]' : 'min-h-[40px] min-w-[40px]'}
            ${!message.trim() || isSending 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 active:scale-95'
            }
          `}
          style={{
            touchAction: 'manipulation'
          }}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg 
              className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
              />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
});

OptimizedChatInput.displayName = 'OptimizedChatInput';

export default OptimizedChatInput;
