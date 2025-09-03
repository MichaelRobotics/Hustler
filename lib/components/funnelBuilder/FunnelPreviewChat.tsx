'use client';

import React from 'react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { FunnelPreviewChatProps } from '../../types/funnel';
import { ChatHeader, ChatMessage, ChatOptions, ChatRestartButton } from './components';

/**
 * --- Funnel Preview Chat Component ---
 * This component simulates a user conversation with the generated chatbot flow.
 * It allows the user to click through the options and see the conversation unfold,
 * providing a way to test and validate the funnel's logic and messaging.
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
      
      {/* Conversation End State - Show Start Over when no options or conversation ended */}
      {(options.length === 0 || !currentBlockId) && (
        <ChatRestartButton onRestart={startConversation} />
      )}
    </div>
  );
};

export default FunnelPreviewChat;



