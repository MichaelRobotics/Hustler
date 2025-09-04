'use client';

import React, { useState, useEffect } from 'react';
import { FunnelFlow } from '../../types/funnel';
import UserChat from './UserChat';

/**
 * --- User Chat Page Component ---
 * This is the full-page customer-facing chat interface.
 * It provides a clean, focused chat experience for customers interacting with funnels.
 * 
 * Features:
 * - Full-screen chat interface
 * - Funnel flow integration
 * - Conversation tracking
 * - Responsive design
 * - Clean, distraction-free UI
 *
 * @param {UserChatPageProps} props - The props passed to the component.
 * @param {FunnelFlow} props.funnelFlow - The funnel flow to interact with.
 * @param {string} [props.conversationId] - Optional conversation ID for tracking.
 * @param {Function} [props.onMessageSent] - Optional callback when user sends a message.
 * @returns {JSX.Element} The rendered UserChatPage component.
 */

interface UserChatPageProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  className?: string;
}

const UserChatPage: React.FC<UserChatPageProps> = ({ 
  funnelFlow, 
  conversationId,
  onMessageSent,
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Simulate loading state for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading chat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full bg-white dark:bg-gray-900 ${className}`}>
      <UserChat
        funnelFlow={funnelFlow}
        conversationId={conversationId}
        onMessageSent={onMessageSent}
      />
    </div>
  );
};

export default UserChatPage;
