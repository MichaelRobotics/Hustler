'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button, Text } from 'frosted-ui';
import { Send, Bot, User, RotateCcw } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';

// Whop-style chat message types
interface ChatMessage {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: number;
  user?: {
    id: string;
    name: string;
    username: string;
    profilePicture?: {
      sourceUrl: string;
    };
  };
  isEdited?: boolean;
  isPinned?: boolean;
  attachments?: Array<{
    id: string;
    contentType: string;
    sourceUrl: string;
  }>;
}

// Whop-style chat options
interface ChatOption {
  id: string;
  text: string;
  leadingToOffer?: boolean;
}

interface FunnelPreviewChatProps {
  funnelFlow: any;
  selectedOffer?: string;
  onOfferClick?: (offerId: string) => void;
}

// Whop-style message component
const WhopChatMessage: React.FC<{ message: ChatMessage; isMobile: boolean }> = React.memo(({ message, isMobile }) => {
  const isUser = message.type === 'user';
  const isBot = message.type === 'bot';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm px-3 py-1 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${isMobile ? 'px-3' : 'px-4'}`}>
      <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-blue-500' 
            : isBot 
            ? 'bg-violet-500' 
            : 'bg-gray-500'
        }`}>
          {isUser ? (
            <User size={16} className="text-white" />
          ) : isBot ? (
            <Bot size={16} className="text-white" />
          ) : (
            <Text size="1" weight="bold" className="text-white">
              {message.user?.name?.charAt(0) || 'U'}
            </Text>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* User Info */}
          {!isUser && message.user && (
            <div className="flex items-center gap-2 mb-1">
              <Text size="2" weight="medium" className="text-gray-900 dark:text-gray-100">
                {message.user.name}
              </Text>
              <Text size="1" className="text-gray-500 dark:text-gray-400">
                @{message.user.username}
              </Text>
            </div>
          )}

          {/* Message Bubble */}
          <div className={`px-4 py-2 rounded-2xl ${
            isUser 
              ? 'bg-blue-500 text-white rounded-br-md' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          } ${isMobile ? 'text-sm' : 'text-base'}`}>
            <Text size={isMobile ? "2" : "3"} className="whitespace-pre-wrap">
              {message.content}
            </Text>
          </div>

          {/* Timestamp */}
          <Text size="1" className={`text-gray-500 dark:text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </div>
      </div>
    </div>
  );
});

WhopChatMessage.displayName = 'WhopChatMessage';

// Whop-style chat input component
const WhopChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  placeholder?: string;
  isMobile: boolean;
  isKeyboardOpen: boolean;
}> = React.memo(({ onSendMessage, placeholder = "Type a message...", isMobile, isKeyboardOpen }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <div className={`bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl shadow-lg backdrop-blur-sm dark:shadow-black/20 ${
      isMobile ? 'p-3' : 'p-4'
    } ${isKeyboardOpen ? 'fixed bottom-0 left-0 right-0 z-50' : ''}`}>
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <div className="flex-1">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-violet-500 dark:focus-within:border-violet-400 transition-colors">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className={`w-full px-4 py-3 bg-transparent border-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none resize-none overflow-hidden ${
                isMobile ? 'text-base' : 'text-sm'
              }`}
              style={{
                height: 'auto',
                minHeight: '44px',
                WebkitTapHighlightColor: 'transparent',
              }}
            />
          </div>
        </div>
        
        <Button
          type="submit"
          disabled={!message.trim()}
          className={`bg-violet-500 hover:bg-violet-600 text-white rounded-full p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isMobile ? 'w-12 h-12' : 'w-10 h-10'
          }`}
        >
          <Send size={isMobile ? 20 : 18} />
        </Button>
      </form>
    </div>
  );
});

WhopChatInput.displayName = 'WhopChatInput';

// Whop-style chat options component
const WhopChatOptions: React.FC<{
  options: ChatOption[];
  onOptionClick: (option: ChatOption) => void;
  isMobile: boolean;
}> = React.memo(({ options, onOptionClick, isMobile }) => {
  if (options.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${isMobile ? 'px-3 pb-3' : 'px-4 pb-4'}`}>
      {options.map((option) => (
        <Button
          key={option.id}
          onClick={() => onOptionClick(option)}
          variant="surface"
          className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full px-4 py-2 text-sm transition-colors ${
            option.leadingToOffer ? 'border-violet-300 dark:border-violet-600 text-violet-600 dark:text-violet-400' : ''
          }`}
        >
          {option.text}
        </Button>
      ))}
    </div>
  );
});

WhopChatOptions.displayName = 'WhopChatOptions';

// Main Whop-style chat component
const FunnelPreviewChat: React.FC<FunnelPreviewChatProps> = React.memo(({ 
  funnelFlow, 
  selectedOffer, 
  onOfferClick 
}) => {
  const {
    history,
    options,
    currentBlockId,
    startConversation,
    handleOptionClick,
    handleCustomInput
  } = useFunnelPreviewChat(funnelFlow, selectedOffer);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile keyboard detection
  useEffect(() => {
    if (!isMobile) return;

    const handleKeyboardChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = window.innerHeight - currentHeight;
      
      const keyboardThreshold = 150;
      const isKeyboardOpenNow = heightDifference > keyboardThreshold;
      
      setIsKeyboardOpen(isKeyboardOpenNow);
      setKeyboardHeight(isKeyboardOpenNow ? heightDifference : 0);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleKeyboardChange);
    } else {
      window.addEventListener('resize', handleKeyboardChange);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleKeyboardChange);
      } else {
        window.removeEventListener('resize', handleKeyboardChange);
      }
    };
  }, [isMobile]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Convert history to Whop-style messages
  const whopMessages: ChatMessage[] = useMemo(() => {
    return history.map((msg, index) => ({
      id: `msg-${index}`,
      type: msg.type as 'user' | 'bot' | 'system',
      content: msg.text,
      timestamp: Date.now() - (history.length - index) * 1000,
      user: msg.type === 'bot' ? {
        id: 'bot',
        name: 'AI Assistant',
        username: 'ai_assistant'
      } : msg.type === 'user' ? {
        id: 'user',
        name: 'You',
        username: 'you'
      } : undefined
    }));
  }, [history]);

  // Convert options to Whop-style options
  const whopOptions: ChatOption[] = useMemo(() => {
    return options.map((option, index) => ({
      id: `option-${index}`,
      text: option.text,
      leadingToOffer: false // Default to false since FunnelBlockOption doesn't have this property
    }));
  }, [options]);

  return (
    <>
      {/* Chat Header - Whop Style - Direct on background */}
      <div className="flex-shrink-0 bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl mb-6 p-4 shadow-lg backdrop-blur-sm dark:shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <Text size="3" weight="semi-bold" className="text-gray-900 dark:text-gray-100">
              AI Assistant
            </Text>
            <Text size="2" className="text-gray-500 dark:text-gray-400">
              Online
            </Text>
          </div>
        </div>
      </div>

      {/* Chat Messages - Whop Style - Direct on background */}
      <div 
        ref={chatContainerRef}
        className={`bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl shadow-lg backdrop-blur-sm dark:shadow-black/20 ${
          isKeyboardOpen ? `pb-[${keyboardHeight}px]` : ''
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          height: 'calc(100vh - 200px)',
          overflowY: 'auto',
          ...(isKeyboardOpen && {
            paddingBottom: `${keyboardHeight}px`,
            transition: 'padding-bottom 0.3s ease-out'
          })
        }}
      >
        {whopMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900 rounded-full flex items-center justify-center mb-4">
              <Bot size={32} className="text-violet-600 dark:text-violet-400" />
            </div>
            <Text size="4" weight="semi-bold" className="text-gray-900 dark:text-gray-100 mb-2">
              Welcome to the AI Assistant
            </Text>
            <Text size="3" className="text-gray-500 dark:text-gray-400 mb-6">
              Start a conversation by typing a message or choosing from the options below.
            </Text>
            <Button
              onClick={() => startConversation()}
              className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-full"
            >
              <RotateCcw size={16} className="mr-2" />
              Start Conversation
            </Button>
          </div>
        ) : (
          <div className="py-4">
            {whopMessages.map((message) => (
              <WhopChatMessage
                key={message.id}
                message={message}
                isMobile={isMobile}
              />
            ))}
            
            {/* Chat Options */}
            {whopOptions.length > 0 && (
              <WhopChatOptions
                options={whopOptions}
                onOptionClick={(option) => {
                  const originalOptionIndex = options.findIndex(opt => opt.text === option.text);
                  if (originalOptionIndex !== -1) {
                    const originalOption = options[originalOptionIndex];
                    handleOptionClick(originalOption, originalOptionIndex);
                  }
                }}
                isMobile={isMobile}
              />
            )}
            
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input - Whop Style - Direct on background */}
      {whopMessages.length > 0 && currentBlockId && (
        <div className="mt-6">
          <WhopChatInput
            onSendMessage={handleCustomInput}
            placeholder="Type a message..."
            isMobile={isMobile}
            isKeyboardOpen={isKeyboardOpen}
          />
        </div>
      )}
    </>
  );
});

FunnelPreviewChat.displayName = 'FunnelPreviewChat';

export default FunnelPreviewChat;