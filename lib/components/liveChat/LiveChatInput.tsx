'use client';

import React from 'react';
import { Button } from 'frosted-ui';
import { Send } from 'lucide-react';

interface LiveChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const LiveChatInput: React.FC<LiveChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  onFocus,
  onBlur,
  disabled = false,
  placeholder = "Type a message..."
}) => {
  return (
    <div className="flex items-end gap-3">
      <div className="flex-1">
        <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-3 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 resize-none min-h-[44px] max-h-32 overflow-hidden"
            style={{
              height: 'auto',
              minHeight: '44px',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />
        </div>
      </div>
      
      <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200">
        <Button
          size="3"
          variant="ghost"
          color="violet"
          onClick={onSend}
          disabled={!value.trim() || disabled}
          className="px-4 py-3 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
        </Button>
      </div>
    </div>
  );
};

export default LiveChatInput;