'use client';

import React from 'react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelFlow } from '../../types/funnel';
import { ChatHeader, ChatMessage, ChatInput, ChatOptions } from '../funnelBuilder/components';

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

const UserChat: React.FC<UserChatProps> = ({ 
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
  const handleUserMessage = (message: string) => {
    // Call the original handler
    handleCustomInput(message);
    
    // Notify parent component if callback provided
    if (onMessageSent) {
      onMessageSent(message, conversationId);
    }
  };

  // Enhanced option click handler
  const handleUserOptionClick = (option: any, index: number) => {
    // Call the original handler
    handleOptionClick(option, index);
    
    // Notify parent component if callback provided
    if (onMessageSent) {
      onMessageSent(`${index + 1}. ${option.text}`, conversationId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <ChatHeader />
      
      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-0 space-y-4 pt-6">
        {history.map((msg, index) => (
          <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <ChatMessage message={msg} />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      
      {/* Response Options */}
      <ChatOptions
        options={options}
        optionsLeadingToOffer={[]}
        selectedOffer={null}
        onOptionClick={handleUserOptionClick}
      />
      
      {/* Chat Input - Only show when there are options available */}
      {options.length > 0 && currentBlockId && (
        <ChatInput
          onSendMessage={handleUserMessage}
          placeholder="Type your response..."
        />
      )}
    </div>
  );
};

export default UserChat;
