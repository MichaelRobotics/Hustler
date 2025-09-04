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
  onBack
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

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

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl shadow-lg backdrop-blur-sm dark:shadow-2xl dark:shadow-violet-500/20 dark:shadow-black/20 overflow-hidden h-full">
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
        className="flex-1 overflow-y-auto p-0 space-y-4 pt-6 min-h-0"
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
      <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
        <LiveChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          disabled={isTyping}
          placeholder={`Reply to ${conversation.user.name}...`}
        />
      </div>
    </div>
  );
};

export default LiveChatView;
