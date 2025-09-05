'use client';

import React from 'react';
import { Text } from 'frosted-ui';
import { LiveChatMessage, LiveChatUser } from '../../types/liveChat';

interface ChatMessageProps {
  message: LiveChatMessage;
  user: LiveChatUser;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, user }) => {
  const isUserMessage = message.type === 'user';
  const isBotMessage = message.type === 'bot';

  return (
    <div className={`flex ${isUserMessage ? 'justify-start' : 'justify-end'} px-4`}>
      <div className={`flex items-end gap-2 max-w-xs lg:max-w-md ${isUserMessage ? '' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-violet-500">
          <Text size="1" weight="bold" className="text-white">
            {isUserMessage ? user.name.charAt(0).toUpperCase() : 'You'}
          </Text>
        </div>

        {/* Message Bubble */}
        <div className={`px-4 py-3 rounded-2xl shadow-sm ${
          isUserMessage
            ? 'bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30'
            : 'bg-violet-500 text-white'
        }`}>
          <Text size="2" className={`whitespace-pre-wrap ${
            isUserMessage ? 'text-foreground' : 'text-white'
          }`}>
            {message.text}
          </Text>
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
