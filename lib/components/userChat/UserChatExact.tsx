'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Text } from 'frosted-ui';
import { Send } from 'lucide-react';
import { useFunnelPreviewChat } from '../../hooks/useFunnelPreviewChat';
import { mockFunnelFlow } from './mockData';
import { UserChatHeader } from './UserChatHeader';

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

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

          {/* Response Options - Exact structure */}
          {options.length > 0 && (
            <div className="flex-shrink-0 p-0 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
              <div className="space-y-3">
                <div className="flex flex-col items-end space-y-2">
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleUserOptionClick(opt, i)}
                      className="max-w-xs lg:max-w-md p-3 border rounded-xl transition-all duration-200 text-left group bg-white dark:bg-gray-800 border-border/50 dark:border-border/30 hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:border-violet-200 dark:hover:border-violet-500/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700/30">
                          <Text size="1" weight="bold" className="text-violet-700 dark:text-violet-300">
                            {i + 1}
                          </Text>
                        </div>
                        <Text size="2" className="transition-colors text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300">
                          {opt.text}
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Input - Exact structure */}
          {options.length > 0 && currentBlockId && (
            <div className="flex-shrink-0 p-4 border-t border-border/30 dark:border-border/20 bg-surface/50 dark:bg-surface/30">
              <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your response or choose from options above..."
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-border/50 dark:border-border/30 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:hover:border-gray-500 resize-none min-h-[48px] max-h-[120px]"
                    rows={1}
                    style={{ height: '48px' }}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!message.trim()}
                  className="p-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Send message"
                >
                  <Send size={20} />
                </Button>
              </form>
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
