'use client';

import React, { useState, useEffect } from 'react';
import UserChatBackend from './UserChatBackend';

/**
 * --- User Chat Backend Page Component ---
 * Full-page customer-facing chat interface with backend integration.
 * 
 * Features:
 * - Full-screen chat interface
 * - Backend API integration
 * - Conversation tracking
 * - Error handling and loading states
 * - Responsive design
 * - Clean, distraction-free UI
 *
 * @param {UserChatBackendPageProps} props - The props passed to the component.
 * @param {string} props.funnelId - The ID of the funnel to interact with.
 * @param {string} [props.conversationId] - Optional existing conversation ID.
 * @param {string} [props.userId] - Optional user ID for tracking.
 * @param {Function} [props.onMessageSent] - Optional callback when user sends a message.
 * @param {Function} [props.onError] - Optional error callback.
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element} The rendered UserChatBackendPage component.
 */

interface UserChatBackendPageProps {
  funnelId: string;
  conversationId?: string;
  userId?: string;
  onMessageSent?: (message: string, conversationId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const UserChatBackendPage: React.FC<UserChatBackendPageProps> = ({ 
  funnelId,
  conversationId,
  userId,
  onMessageSent,
  onError,
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
      <UserChatBackend
        funnelId={funnelId}
        conversationId={conversationId}
        userId={userId}
        onMessageSent={onMessageSent}
        onError={onError}
      />
    </div>
  );
};

export default UserChatBackendPage;
