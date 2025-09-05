'use client';

import React from 'react';
import { Text } from 'frosted-ui';
import { Circle } from 'lucide-react';
import { ConversationCardProps } from '../../types/liveChat';

const ConversationCard: React.FC<ConversationCardProps> = React.memo(({
  conversation,
  isSelected,
  onClick
}) => {
  // Defensive check for conversation
  if (!conversation || !conversation.user) {
    return null;
  }
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'border-l-green-500';
      case 'closed': return 'border-l-gray-500';
      default: return 'border-l-gray-500';
    }
  };

  const handleClick = () => {
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative bg-gradient-to-br from-white via-gray-50 to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-900/50 border-2 border-border dark:border-violet-500/40 rounded-xl flex flex-col justify-between transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-violet-500/10 hover:border-violet-500/80 dark:hover:border-violet-400/90 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 shadow-lg backdrop-blur-sm dark:hover:shadow-2xl dark:hover:shadow-violet-500/20 dark:shadow-black/20 overflow-hidden ${
        isSelected
          ? 'ring-2 ring-violet-500/50 shadow-xl shadow-violet-500/20'
          : ''
      }`}
    >
      {/* Card Header with Status */}
      <div className="p-4 border-b-2 border-border dark:border-violet-500/30 bg-gradient-to-r from-gray-50 via-gray-100 to-violet-100 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-800/60">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                <Text size="2" weight="bold" className="text-white">
                  {conversation.user.name.charAt(0).toUpperCase()}
                </Text>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Text size="2" weight="semi-bold" className="text-black dark:text-white truncate">
                  {conversation.user.name}
                </Text>
                {conversation.user.isOnline && (
                  <Circle size={6} className="text-green-500 fill-current" />
                )}
              </div>
            </div>
          </div>
          
          {/* Time moved to right corner */}
          <div className="flex-shrink-0">
            <Text size="1" color="gray" className="text-muted-foreground">
              {formatTime(conversation.lastMessageAt)}
            </Text>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1">
        <Text size="1" color="gray" className="text-muted-foreground line-clamp-1">
          {conversation.lastMessage}
        </Text>
      </div>
    </div>
  );
});

ConversationCard.displayName = 'ConversationCard';

export default ConversationCard;
