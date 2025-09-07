'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button, Text } from 'frosted-ui';
import { Send, Bot, User, RotateCcw } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { useKeyboard } from '../../context/KeyboardContext';

// Optimized chat message types
interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: number;
}

// Optimized chat options
interface ChatOption {
  id: string;
  text: string;
  leadingToOffer?: boolean;
}

interface FunnelPreviewChatProps {
  funnelFlow: any;
  selectedOffer?: string;
  onOfferClick: (offerId: string) => void;
}

// Optimized Chat Message Component
const OptimizedChatMessage: React.FC<{ message: ChatMessage }> = React.memo(({ message }) => {
  const isUser = message.type === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`flex items-start gap-2 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-blue-500' : 'bg-gray-500'
        }`}>
          {isUser ? <User size={12} className="text-white" /> : <Bot size={12} className="text-white" />}
        </div>
        
        {/* Message Content */}
        <div className={`px-3 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}>
          <Text size="2" className="whitespace-pre-wrap">
            {message.content}
          </Text>
        </div>
      </div>
    </div>
  );
});

// Optimized Chat Options Component
const OptimizedChatOptions: React.FC<{
  options: ChatOption[];
  onOptionClick: (option: ChatOption) => void;
}> = React.memo(({ options, onOptionClick }) => {
  if (options.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onOptionClick(option)}
          className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Text size="2" className="text-gray-900 dark:text-gray-100">
            {option.text}
          </Text>
        </button>
      ))}
    </div>
  );
});

// Optimized Chat Input Component
const OptimizedChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  placeholder?: string;
}> = React.memo(({ onSendMessage, placeholder = "Type your message..." }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setIsTyping } = useKeyboard();

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
    }
  }, [message, onSendMessage, setIsTyping]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle typing detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsTyping(e.target.value.length > 0);
  }, [setIsTyping]);

  const handleFocus = useCallback(() => {
    setIsTyping(true);
  }, [setIsTyping]);

  const handleBlur = useCallback(() => {
    if (message.length === 0) {
      setIsTyping(false);
    }
  }, [message.length, setIsTyping]);

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={1}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
        />
      </div>
      <Button
        type="submit"
        disabled={!message.trim()}
        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
      >
        <Send size={16} />
      </Button>
    </form>
  );
});

// Main FunnelPreviewChat Component
const FunnelPreviewChat: React.FC<FunnelPreviewChatProps> = ({
  funnelFlow,
  selectedOffer,
  onOfferClick
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    history,
    options,
    currentBlockId,
    handleCustomInput,
    handleOptionClick,
    startConversation
  } = useFunnelPreviewChat(funnelFlow, selectedOffer);

  // Convert history to optimized messages
  const messages: ChatMessage[] = useMemo(() => {
    return history.map((item, index) => ({
      id: `msg-${index}`,
      type: item.type === 'user' ? 'user' : 'bot',
      content: item.text,
      timestamp: Date.now()
    }));
  }, [history]);

  // Convert options to optimized options
  const optimizedOptions: ChatOption[] = useMemo(() => {
    return options.map((option, index) => ({
      id: `option-${index}`,
      text: option.text,
      leadingToOffer: false
    }));
  }, [options]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Handle option click
  const handleOptimizedOptionClick = useCallback((option: ChatOption) => {
    const originalOptionIndex = options.findIndex(opt => opt.text === option.text);
    if (originalOptionIndex !== -1) {
      const originalOption = options[originalOptionIndex];
      handleOptionClick(originalOption, originalOptionIndex);
    }
  }, [options, handleOptionClick]);

  return (
    <>
      {/* Chat Messages Area - Direct rendering, no containers */}
      <div
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-3"
        style={{
          scrollBehavior: 'smooth',
          willChange: 'scroll-position'
        }}
      >
        {messages.map((message) => (
          <OptimizedChatMessage key={message.id} message={message} />
        ))}

        {/* Options Display */}
        <OptimizedChatOptions
          options={optimizedOptions}
          onOptionClick={handleOptimizedOptionClick}
        />

        <div ref={chatEndRef} />
      </div>

      {/* Conversation End State - Show Start Over when no options */}
      {options.length === 0 && (
        <div className="p-4 text-center">
          <Button
            onClick={() => startConversation()}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            <RotateCcw size={16} className="mr-2" />
            Start Over
          </Button>
        </div>
      )}

      {/* Chat Input - Only show when there are options */}
      {options.length > 0 && currentBlockId && (
        <OptimizedChatInput
          onSendMessage={handleCustomInput}
          placeholder="Type or choose response"
        />
      )}
    </>
  );
};

export default FunnelPreviewChat;