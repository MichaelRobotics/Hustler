'use client';

import React from 'react';
import UserChatBackend from './UserChatBackend';

/**
 * --- User Chat Backend Container Component ---
 * Embeddable chat container with backend integration for use in other pages.
 * 
 * Features:
 * - Flexible sizing with customizable dimensions
 * - Backend API integration
 * - Embeddable in any page or layout
 * - Maintains chat functionality
 * - Error handling and loading states
 * - Responsive design
 *
 * @param {UserChatBackendContainerProps} props - The props passed to the component.
 * @param {string} props.funnelId - The ID of the funnel to interact with.
 * @param {string} [props.conversationId] - Optional existing conversation ID.
 * @param {string} [props.userId] - Optional user ID for tracking.
 * @param {Function} [props.onMessageSent] - Optional callback when user sends a message.
 * @param {Function} [props.onError] - Optional error callback.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {string} [props.height] - Custom height (default: '500px').
 * @returns {JSX.Element} The rendered UserChatBackendContainer component.
 */

interface UserChatBackendContainerProps {
  funnelId: string;
  conversationId?: string;
  userId?: string;
  onMessageSent?: (message: string, conversationId: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  height?: string;
}

const UserChatBackendContainer: React.FC<UserChatBackendContainerProps> = ({ 
  funnelId,
  conversationId,
  userId,
  onMessageSent,
  onError,
  className = '',
  height = '500px'
}) => {
  return (
    <div 
      className={`w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      style={{ height }}
    >
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

export default UserChatBackendContainer;
