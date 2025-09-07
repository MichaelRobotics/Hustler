'use client';

import React, { useCallback, useMemo } from 'react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelFlow } from '../../types/funnel';
import { ChatHeader, ChatMessage, ChatInput } from '../funnelBuilder/components';
import ErrorBoundary from '../common/ErrorBoundary';
import { Text } from 'frosted-ui';

/**
 * --- User Chat Component ---
 * This is the customer-facing chat interface that works exactly like the preview mode.
 * Customers interact with the funnel through this chat interface.
 * 
 * Features:
 * - Real-time conversation with the funnel bot
 * - Option clicking for guided flow
 * - Custom text input for user responses
 * - Invalid input handling with friendly responses
 * - Escalation to creator when needed
 * - Auto-scrolling and responsive design
 *
 * @param {UserChatProps} props - The props passed to the component.
 * @param {FunnelFlow} props.funnelFlow - The funnel flow to interact with.
 * @param {string} [props.conversationId] - Optional conversation ID for tracking.
 * @param {Function} [props.onMessageSent] - Optional callback when user sends a message.
 * @returns {JSX.Element} The rendered UserChat component.
 */

interface UserChatProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
}

const UserChat: React.FC<UserChatProps> = React.memo(({ 
  funnelFlow, 
  conversationId,
  onMessageSent 
}) => {
  const {
    history,
    currentBlockId,
    chatEndRef,
    chatContainerRef,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow);

  // Enhanced message handler that includes conversation tracking
  const handleUserMessage = useCallback((message: string) => {
    // Call the original handler
    handleCustomInput(message);
    
    // Notify parent component if callback provided
    if (onMessageSent) {
      onMessageSent(message, conversationId);
    }
  }, [handleCustomInput, onMessageSent, conversationId]);

  // Enhanced option click handler
  const handleUserOptionClick = useCallback((option: any, index: number) => {
    // Call the original handler
    handleOptionClick(option, index);
    
    // Notify parent component if callback provided
    if (onMessageSent) {
      onMessageSent(`${index + 1}. ${option.text}`, conversationId);
    }
  }, [handleOptionClick, onMessageSent, conversationId]);

  // Memoize message list to prevent unnecessary re-renders
  const messageList = useMemo(() => 
    history.map((msg, index) => (
      <div key={`${msg.type}-${index}-${msg.text.length}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
        <ChatMessage message={msg} />
      </div>
    )), [history]
  );

  // Memoize options list to prevent unnecessary re-renders
  const optionsList = useMemo(() => 
    options.map((opt, i) => (
      <button
        key={`option-${i}-${opt.text.length}`}
        onClick={() => handleUserOptionClick(opt, i)}
        className="w-full p-3 border rounded-xl transition-all duration-200 text-left group bg-violet-500 hover:bg-violet-600 border-violet-400 hover:border-violet-500"
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
    )), [options, handleUserOptionClick]
  );

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <ErrorBoundary>
          <ChatHeader />
        </ErrorBoundary>
        
        {/* Chat Messages Area */}
        <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-0 space-y-4 pt-6">
          <ErrorBoundary>
            {messageList}
          </ErrorBoundary>
          
          {/* Show clickable options below the last bot message - on user side */}
          {history.length > 0 && history[history.length - 1].type === 'bot' && options.length > 0 && (
            <ErrorBoundary>
              <div className="flex justify-end">
                <div className="flex items-end gap-2">
                  {/* Options Container */}
                  <div className="max-w-xs lg:max-w-md">
                    <div className="space-y-2">
                      {optionsList}
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
            </ErrorBoundary>
          )}
          
          <div ref={chatEndRef} />
        </div>
        
        {/* Chat Input - Only show when there are options available */}
        {options.length > 0 && currentBlockId && (
          <ErrorBoundary>
            <ChatInput
              onSendMessage={handleUserMessage}
              placeholder="Type or choose response"
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
});

UserChat.displayName = 'UserChat';

export default UserChat;
