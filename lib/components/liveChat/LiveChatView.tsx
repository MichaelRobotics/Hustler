'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import LiveChatInput from './LiveChatInput';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { LiveChatViewProps } from '../../types/liveChat';

const LiveChatView: React.FC<LiveChatViewProps> = ({
  conversation,
  onSendMessage,
  onUpdateConversation,
  onBack,
  onTypingChange
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
      setIsTyping(true);
      
      // Simulate bot typing indicator
      setTimeout(() => {
        setIsTyping(false);
      }, 2000);
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
    // Always set typing to true when user is interacting with input
    setIsUserTyping(true);
    onTypingChange?.(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
      onTypingChange?.(false);
    }, 2000);
  };

  const handleInputFocus = () => {
    setIsUserTyping(true);
    onTypingChange?.(true);
  };

  const handleInputBlur = () => {
    // Clear timeout when user blurs input
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setIsUserTyping(false);
    onTypingChange?.(false);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl shadow-lg backdrop-blur-sm dark:shadow-2xl dark:shadow-violet-500/20 dark:shadow-black/20 overflow-hidden h-full max-h-full box-border">
      {/* Chat Header */}
      <div className="flex-shrink-0">
        <ChatHeader
          conversation={conversation}
          onBack={onBack}
          onUpdateConversation={onUpdateConversation}
        />
      </div>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500"
      >
        {conversation.messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            user={conversation.user} 
          />
        ))}

        {/* Typing Indicator */}
        {isTyping && <TypingIndicator user={conversation.user} />}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30 mt-auto">
        <LiveChatInput
          value={newMessage}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={isTyping}
          placeholder={`Reply to ${conversation.user.name}...`}
        />
      </div>
    </div>
  );
};

export default LiveChatView;
