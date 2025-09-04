'use client';

import React from 'react';
import { mockFunnelFlow } from './mockData';
import { UserChatPage } from './index';

/**
 * --- User Chat Demo Component ---
 * Simple demo page for testing the UserChat with mock data.
 * This can be used as a standalone page for customer testing.
 */

const UserChatDemo: React.FC = () => {
  const handleMessageSent = (message: string, conversationId?: string) => {
    // Log messages for development/testing
    console.log('Customer message:', message, 'Conversation:', conversationId);
    
    // In a real app, you would send this to your backend:
    // await sendMessageToBackend(message, conversationId);
  };

  return (
    <UserChatPage
      funnelFlow={mockFunnelFlow}
      conversationId={`demo-${Date.now()}`}
      onMessageSent={handleMessageSent}
    />
  );
};

export default UserChatDemo;
