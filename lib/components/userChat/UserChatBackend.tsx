'use client';

import React from 'react';
import { useUserChat, UseUserChatOptions } from '../../hooks/useUserChat';
import { ChatHeader, ChatMessage, ChatInput } from '../funnelBuilder/components';
import { Text } from 'frosted-ui';

/**
 * --- User Chat Backend Component ---
 * Backend-ready version of UserChat that uses real API calls instead of mock data.
 * 
 * Features:
 * - Real-time conversation with backend API
 * - Option clicking for guided flow
 * - Custom text input for user responses
 * - Error handling and loading states
 * - Conversation persistence
 * - Auto-scrolling and responsive design
 *
 * @param {UserChatBackendProps} props - The props passed to the component.
 * @param {string} props.funnelId - The ID of the funnel to interact with.
 * @param {string} [props.conversationId] - Optional existing conversation ID.
 * @param {string} [props.userId] - Optional user ID for tracking.
 * @param {Function} [props.onMessageSent] - Optional callback when user sends a message.
 * @param {Function} [props.onError] - Optional error callback.
 * @returns {JSX.Element} The rendered UserChatBackend component.
 */

interface UserChatBackendProps {
  funnelId: string;
  conversationId?: string;
  userId?: string;
  onMessageSent?: (message: string, conversationId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const UserChatBackend: React.FC<UserChatBackendProps> = ({ 
  funnelId,
  conversationId,
  userId,
  onMessageSent,
  onError,
  className = ''
}) => {
  const {
    messages,
    options,
    currentBlockId,
    isComplete,
    isLoading,
    isSending,
    isInitializing,
    error,
    sendMessage,
    selectOption,
    chatEndRef,
    chatContainerRef
  } = useUserChat({
    funnelId,
    conversationId,
    userId,
    onMessageSent,
    onError
  });

  // Handle custom text input
  const handleCustomInput = async (message: string) => {
    if (!message.trim() || isSending) return;
    await sendMessage(message.trim());
  };

  // Handle option selection
  const handleOptionClick = async (option: any, index: number) => {
    if (isSending) return;
    await selectOption(option);
  };

  // Show loading state
  if (isInitializing) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <ChatHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <Text size="2" className="text-muted-foreground">Initializing chat...</Text>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`h-full flex flex-col ${className}`}>
        <ChatHeader />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Text size="3" className="text-red-600 dark:text-red-400">⚠️</Text>
            </div>
            <Text size="3" weight="bold" className="text-red-600 dark:text-red-400 mb-2">
              Connection Error
            </Text>
            <Text size="2" className="text-muted-foreground mb-4">
              {error.message}
            </Text>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Chat Header */}
      <ChatHeader />
      
      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-0 space-y-4 pt-6">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <ChatMessage message={msg} />
          </div>
        ))}
        
        {/* Show clickable options below the last bot message - on user side */}
        {messages.length > 0 && messages[messages.length - 1].type === 'bot' && options.length > 0 && (
          <div className="flex justify-end">
            <div className="flex items-end gap-2">
              {/* Options Container */}
              <div className="max-w-xs lg:max-w-md">
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <button
                      key={opt.id || i}
                      onClick={() => handleOptionClick(opt, i)}
                      disabled={isSending}
                      className="w-full p-3 border rounded-xl transition-all duration-200 text-left group bg-violet-500 hover:bg-violet-600 border-violet-400 hover:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 bg-white/20 border-white/30">
                          <Text size="1" weight="bold" className="text-white">
                            {i + 1}
                          </Text>
                        </div>
                        <Text size="2" className="text-white group-hover:text-white transition-colors">
                          {opt.text}
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* User Avatar */}
              <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                <Text size="1" weight="bold" className="text-white">
                  You
                </Text>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>
      
      {/* Chat Input - Only show when there are options available and not complete */}
      {options.length > 0 && currentBlockId && !isComplete && (
        <ChatInput
          onSendMessage={handleCustomInput}
          placeholder="Type or choose response"
          disabled={isSending}
        />
      )}

      {/* Conversation Complete State */}
      {isComplete && (
        <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
          <div className="text-center">
            <Text size="2" className="text-muted-foreground">
              Conversation completed. Thank you for chatting with us!
            </Text>
          </div>
        </div>
      )}

      {/* Loading indicator for sending messages */}
      {isSending && (
        <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
            <Text size="2" className="text-muted-foreground">Sending...</Text>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserChatBackend;
