'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from 'frosted-ui';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = React.memo(({ 
  onSendMessage, 
  disabled = false,
  placeholder = "Type or choose response",
  onFocus,
  onBlur
}) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (message.trim() && !disabled && !isSending) {
      setIsSending(true);
      onSendMessage(message.trim());
      setMessage('');
      // Reset sending state after a brief delay
      setTimeout(() => setIsSending(false), 100);
    }
  }, [message, disabled, isSending, onSendMessage]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    // Throttle height calculation for better mobile performance
    requestAnimationFrame(() => {
      target.style.height = 'auto';
      target.style.height = Math.min(target.scrollHeight, 128) + 'px';
    });
  }, []);

  return (
    <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={disabled || isSending}
              rows={1}
              className="w-full px-4 py-3 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 resize-none min-h-[44px] max-h-32 overflow-hidden"
              style={{
                height: 'auto',
                minHeight: '44px',
              }}
              onInput={handleInput}
            />
          </div>
        </div>
        
        <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200">
          <Button
            size="3"
            variant="ghost"
            color="violet"
            onClick={handleSend}
            disabled={!message.trim() || disabled || isSending}
            className="px-4 py-3 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
