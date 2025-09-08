'use client';

import React from 'react';
import LiveChatUserInterface from './LiveChatUserInterface';
import { LiveChatViewProps } from '../../types/liveChat';

const LiveChatView: React.FC<LiveChatViewProps> = React.memo(({
  conversation,
  onSendMessage,
  onBack,
  isLoading = false
}) => {
  return (
    <div className="h-full w-full">
      <LiveChatUserInterface
        conversation={conversation}
        onSendMessage={onSendMessage}
        onBack={onBack}
        isLoading={isLoading}
      />
    </div>
  );
});

LiveChatView.displayName = 'LiveChatView';

export default LiveChatView;
