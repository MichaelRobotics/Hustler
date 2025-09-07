'use client';

import React from 'react';
import UserChat from './UserChat';
import { mockFunnelFlow } from './mockData';

/**
 * --- Customer View Component ---
 * This is the entry point for customers to experience the funnel.
 * It matches the FunnelPreviewChat structure exactly for consistency.
 */

interface CustomerViewProps {
  userName?: string;
  experienceId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
}

const CustomerView: React.FC<CustomerViewProps> = ({
  userName,
  experienceId,
  onMessageSent
}) => {
  const conversationId = `customer-${experienceId || 'demo'}-${Date.now()}`;

  const handleMessageSentInternal = (message: string, convId?: string) => {
    console.log('Customer message:', {
      message,
      conversationId: convId || conversationId,
      userName,
      experienceId,
      timestamp: new Date().toISOString()
    });
    if (onMessageSent) {
      onMessageSent(message, convId || conversationId);
    }
  };

  return (
    <UserChat
      funnelFlow={mockFunnelFlow}
      conversationId={conversationId}
      onMessageSent={handleMessageSentInternal}
    />
  );
};

export default CustomerView;
