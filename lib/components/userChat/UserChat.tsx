'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button, Text } from 'frosted-ui';
import { Send, ArrowLeft } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelFlow } from '../../types/funnel';
import ErrorBoundary from '../common/ErrorBoundary';

interface UserChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  onBack?: () => void;
}

/**
 * --- Simplified High-Performance Chat Component ---
 * 
 * Modern chat flow like Messenger with:
 * - Minimal animations and clutter
 * - Maximum performance
 * - Clean, simple design
 * - Native mobile behavior
 * - Optimized for speed
 */
const UserChat: React.FC<UserChatProps> = React.memo(({ 
  funnelFlow, 
  conversationId,
  onMessageSent,
  onBack
}) => {
  const [message, setMessage] = useState('');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [inputPosition, setInputPosition] = useState(0);
  const [messagesPosition, setMessagesPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const {
    history,
    currentBlockId,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow);

  // Keyboard interaction sequence
  const handleInputFocus = useCallback(() => {
    if (isKeyboardOpen) return;
    
    setIsKeyboardOpen(true);
    
    // Step 1: Move input box up first
    const keyboardHeight = window.innerHeight * 0.4; // Estimate keyboard height
    setInputPosition(-keyboardHeight);
    
    // Step 2: After input moves, move messages container
    setTimeout(() => {
      setMessagesPosition(-keyboardHeight);
    }, 150);
    
    // Step 3: Keyboard will appear naturally in the space created
  }, [isKeyboardOpen]);

  const handleInputBlur = useCallback(() => {
    if (!isKeyboardOpen) return;
    
    // Step 1: Keyboard hides first (natural browser behavior)
    // Step 2: Move input back to start position
    setTimeout(() => {
      setInputPosition(0);
    }, 100);
    
    // Step 3: Move messages back to start position
    setTimeout(() => {
      setMessagesPosition(0);
      setIsKeyboardOpen(false);
    }, 250);
  }, [isKeyboardOpen]);

  // Simple auto-scroll for keyboard
  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Message handlers
  const handleUserMessage = useCallback((message: string) => {
    handleCustomInput(message);
    onMessageSent?.(message, conversationId);
  }, [handleCustomInput, onMessageSent, conversationId]);

  const handleUserOptionClick = useCallback((option: any, index: number) => {
    handleOptionClick(option, index);
    onMessageSent?.(`${index + 1}. ${option.text}`, conversationId);
  }, [handleOptionClick, onMessageSent, conversationId]);

  // Form handling
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

  // Simple textarea resize
  const handleTextareaInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  }, []);

  // Simple message list
  const messageList = useMemo(() => 
    history.map((msg, index) => (
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
    )), [history]
  );

  // Simple options list
  const optionsList = useMemo(() => 
    options.map((opt, i) => (
      <button
        key={`option-${i}`}
        onClick={() => handleUserOptionClick(opt, i)}
        className="w-full p-3 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Text size="2" className="text-gray-900 dark:text-gray-100">
          {opt.text}
        </Text>
      </button>
    )), [options, handleUserOptionClick]
  );

  return (
    <ErrorBoundary>
      <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-900">
        {/* Simple Header */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
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
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4"
            style={{
              transform: `translateY(${messagesPosition}px)`,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {messageList}
            
            {/* Options */}
            {history.length > 0 && history[history.length - 1].type === 'bot' && options.length > 0 && (
              <div className="space-y-2 mt-4">
                {optionsList}
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          {options.length > 0 && currentBlockId && (
            <div 
              ref={inputContainerRef}
              className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
              style={{
                transform: `translateY(${inputPosition}px)`,
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onInput={handleTextareaInput}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-32"
                    style={{
                      height: 'auto',
                      minHeight: '40px',
                    }}
                  />
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim()}
                  className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
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
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Start Conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
});

UserChat.displayName = 'UserChat';

export default UserChat;
