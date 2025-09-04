'use client';

import React from 'react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelPreviewChatProps } from '../../types/funnel';
import { ChatHeader, ChatMessage, ChatOptions, ChatRestartButton, ChatInput } from './components';

/**
 * --- Funnel Preview Chat Component ---
 * This component simulates a user conversation with the generated chatbot flow.
 * It allows the user to:
 * - Click through the provided options
 * - Type custom responses to test the funnel's handling of invalid inputs
 * - See how the AI responds to off-script user behavior
 * - Test the escalation logic when users don't follow the expected path
 *
 * Features:
 * - Option clicking for normal flow testing
 * - Custom text input for edge case testing
 * - Invalid input handling with friendly reminders
 * - Escalation to creator after multiple invalid inputs
 * - Auto-scrolling and responsive design
 *
 * @param {FunnelPreviewChatProps} props - The props passed to the component.
 * @param {FunnelFlow | null} props.funnelFlow - The generated funnel flow object containing stages and blocks.
 * @returns {JSX.Element} The rendered FunnelPreviewChat component.
 */
const FunnelPreviewChat: React.FC<FunnelPreviewChatProps> = ({ 
  funnelFlow, 
  selectedOffer, 
  onOfferClick 
}) => {
  const {
    history,
    currentBlockId,
    chatEndRef,
    chatContainerRef,
    optionsLeadingToOffer,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(funnelFlow, selectedOffer);

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
        optionsLeadingToOffer={optionsLeadingToOffer}
        selectedOffer={selectedOffer}
        onOptionClick={handleOptionClick}
      />
      
      {/* Chat Input - Only show when there are options available */}
      {options.length > 0 && currentBlockId && (
        <ChatInput
          onSendMessage={handleCustomInput}
          placeholder="Type your response or choose from options above..."
        />
      )}
      
      {/* Conversation End State - Show Start Over when no options or conversation ended */}
      {(options.length === 0 || !currentBlockId) && (
        <ChatRestartButton onRestart={startConversation} />
      )}
    </div>
  );
};

export default FunnelPreviewChat;



