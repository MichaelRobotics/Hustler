'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Text } from 'frosted-ui';
import { Send } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { mockFunnelFlow } from './mockData';
import { UserChatHeader } from './UserChatHeader';
import { ChatOptions } from '../funnelBuilder/components';

interface UserChatExactProps {
  onBack?: () => void;
  onMessageSent?: (message: string, conversationId?: string) => void;
}

export const UserChatExact: React.FC<UserChatExactProps> = ({ 
  onBack, 
  onMessageSent 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    history,
    currentBlockId,
    startConversation,
    handleOptionClick,
    handleCustomInput,
    options
  } = useFunnelPreviewChat(mockFunnelFlow);


  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      handleCustomInput(message.trim());
      if (onMessageSent) {
        onMessageSent(message.trim());
      }
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleUserOptionClick = (option: any, index: number) => {
    handleOptionClick(option, index);
    if (onMessageSent) {
      onMessageSent(`${index + 1}. ${option.text}`);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Top Navigation - Simplified */}
      <UserChatHeader onBack={onBack} />
      
      {/* Main Chat Container - Simplified for proper scrolling */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="fui-CardInner h-full flex flex-col">
          {/* Messages Area - Scrollable */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-full">
                    {history.map((msg, index) => (
                      <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="flex items-end gap-2">
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.type === 'user' ? 'bg-gray-500' : 'bg-violet-500'
                          }`}>
                            <Text size="1" weight="bold" className="text-white">
                              {msg.type === 'user' ? 'You' : 'AI'}
                            </Text>
                          </div>
                          
                          {/* Message Bubble */}
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                            msg.type === 'user' 
                              ? 'bg-violet-500 text-white' 
                              : 'bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30'
                          }`}>
                            <Text 
                              size="2" 
                              className={`whitespace-pre-wrap ${
                                msg.type === 'user' ? 'text-white' : 'text-foreground'
                              }`}
                            >
                              {msg.text}
                            </Text>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
          </div>

          {/* Response Options - Same as preview view */}
          <ChatOptions
            options={options}
            optionsLeadingToOffer={[]}
            selectedOffer={null}
            onOptionClick={handleUserOptionClick}
          />

          {/* Chat Input - LiveChat style */}
          {options.length > 0 && currentBlockId && (
            <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your response or choose from options above..."
                      rows={1}
                      className="w-full px-4 py-3 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 transition-all duration-200 resize-none min-h-[44px] max-h-32"
                      style={{
                        height: 'auto',
                        minHeight: '44px',
                      }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                      }}
                    />
                  </div>
                </div>
                
                <div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200">
                  <Button
                    size="3"
                    variant="ghost"
                    color="violet"
                    onClick={handleSubmit}
                    disabled={!message.trim()}
                    className="px-4 py-3 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Start Over Button when no options */}
          {(options.length === 0 || !currentBlockId) && (
            <div className="flex-shrink-0 p-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
              <div className="flex justify-center py-4">
                <Button
                  size="2"
                  color="violet"
                  onClick={startConversation}
                  className="px-6 py-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300"
                >
                  Start Over
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
