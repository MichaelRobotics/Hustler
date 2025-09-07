'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Text } from 'frosted-ui';
import { Send, ArrowLeft } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelFlow } from '../../types/funnel';

interface UserChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  onBack?: () => void;
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
  onBack
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Handle keyboard fold/unfold with smooth scroll
  useEffect(() => {
    const handleViewportChange = () => {
      // Timeout to let keyboard animation complete (longer for unfold)
      setTimeout(scrollToBottom, 300);
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
      className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[80%] px-4 py-2 rounded-lg ${
        msg.type === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
      }`}>
        <Text size="2" className="whitespace-pre-wrap">
          {msg.text}
        </Text>
      </div>
    </div>
  ));

  const optionsList = options.map((opt, i) => (
    <button
      key={`option-${i}`}
      onClick={() => handleOptionClickLocal(opt, i)}
      className="max-w-[80%] px-4 py-2 rounded-lg bg-blue-500 text-white text-left"
    >
      <Text size="2" className="text-white">
        {opt.text}
      </Text>
    </button>
  ));

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-full">
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <div>
            <Text size="3" weight="semi-bold" className="text-gray-900 dark:text-gray-100">
              AI Assistant
            </Text>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {messageList}
          
          {/* Options - User side (right side) */}
          {history.length > 0 && history[history.length - 1].type === 'bot' && options.length > 0 && (
            <div className="flex justify-end mb-4">
              <div className="space-y-2">
                {optionsList}
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        {options.length > 0 && currentBlockId && (
          <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
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
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none resize-none min-h-[40px] max-h-32"
                  style={{
                    height: 'auto',
                    minHeight: '40px',
                  }}
                />
              </div>
              
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className="p-2 rounded-lg bg-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Start Button */}
        {(options.length === 0 || !currentBlockId) && (
          <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={startConversation}
              className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
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
