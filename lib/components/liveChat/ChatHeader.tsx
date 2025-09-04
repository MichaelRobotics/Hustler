'use client';

import React from 'react';
import { Button } from 'frosted-ui';
import { ArrowLeft, Check, Circle } from 'lucide-react';
import { LiveChatConversation } from '../../types/liveChat';

interface ChatHeaderProps {
  conversation: LiveChatConversation;
  onBack: () => void;
  onUpdateConversation: (conversation: LiveChatConversation) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  onUpdateConversation
}) => {
  const handleToggleStatus = () => {
    const updatedConversation = {
      ...conversation,
      status: (conversation.status === 'open' ? 'closed' : 'open') as 'open' | 'closed'
    };
    onUpdateConversation(updatedConversation);
  };

  const isOpen = conversation.status === 'open';
  const Icon = isOpen ? Check : Circle;
  const ariaLabel = isOpen ? 'Mark as closed' : 'Mark as open';
  return (
    <div className="flex items-center justify-between p-4 border-b border-border/50 dark:border-border/30 bg-surface/50 dark:bg-surface/30">
      <div className="flex items-center gap-3">
        <Button
          size="2"
          variant="ghost"
          color="gray"
          onClick={onBack}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} strokeWidth={2.5} />
        </Button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {conversation.user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{conversation.user.name}</h3>
            <p className="text-sm text-muted-foreground">{conversation.funnelName}</p>
          </div>
        </div>
      </div>
      
      <Button
        size="2"
        variant="ghost"
        color={isOpen ? "green" : "gray"}
        onClick={handleToggleStatus}
        className={`p-2 rounded-lg transition-colors duration-200 ${
          isOpen 
            ? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20' 
            : 'text-muted-foreground hover:text-foreground hover:bg-surface/80 dark:hover:bg-surface/60'
        }`}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <Icon size={20} strokeWidth={2.5} />
      </Button>
    </div>
  );
};

export default ChatHeader;
