'use client';

import React from 'react';
import { FunnelFlow } from '../../types/funnel';
import UserChat from './UserChat';

/**
 * --- User Chat Container Component ---
 * This is a container component for embedding the chat interface in other pages.
 * It provides a flexible wrapper that can be sized and positioned as needed.
 * 
 * Features:
 * - Flexible sizing with customizable dimensions
 * - Embeddable in any page or layout
 * - Maintains chat functionality
 * - Responsive design
 *
 * @param {UserChatContainerProps} props - The props passed to the component.
 * @param {FunnelFlow} props.funnelFlow - The funnel flow to interact with.
 * @param {string} [props.conversationId] - Optional conversation ID for tracking.
 * @param {Function} [props.onMessageSent] - Optional callback when user sends a message.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {string} [props.height] - Custom height (default: '500px').
 * @returns {JSX.Element} The rendered UserChatContainer component.
 */

interface UserChatContainerProps {
  funnelFlow: FunnelFlow;
  conversationId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  className?: string;
  height?: string;
}

const UserChatContainer: React.FC<UserChatContainerProps> = ({ 
  funnelFlow, 
  conversationId,
  onMessageSent,
  className = '',
  height = '500px'
}) => {
  return (
    <div 
      className={`w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      style={{ height }}
    >
      <UserChat
        funnelFlow={funnelFlow}
        conversationId={conversationId}
        onMessageSent={onMessageSent}
      />
    </div>
  );
};

export default UserChatContainer;
