'use client';

/**
 * LiveChatPage - Backend Integration Ready
 * 
 * This component is prepared for backend integration with the following features:
 * 
 * Backend Integration Points:
 * - handleSendMessage: Ready for API call to POST /api/live-chat/messages
 * - handleUpdateConversation: Ready for API call to PATCH /api/live-chat/conversations
 * - State management: Includes isLoading, hasMore, error states for API calls
 * - Auto-refresh: Ready for periodic conversation updates
 * - Real-time updates: Prepared for WebSocket integration
 * 
 * Backend Requirements:
 * - Conversations auto-close after inactivity (autoCloseAt field)
 * - Conversations are archived after being closed for some time
 * - Real-time message updates via WebSocket or polling
 * - Pagination support for conversations and messages
 * 
 * Current Implementation:
 * - Uses mock data for development
 * - All backend-ready fields are included in mock data
 * - Async handlers are prepared for API integration
 * - Error handling structure is in place
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, Text, Heading, Button } from 'frosted-ui';
import { ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { ThemeToggle } from '../common/ThemeToggle';
import ConversationList from './ConversationList';
import LiveChatView from './LiveChatView';
import LiveChatHeader from './LiveChatHeader';
import PerformanceProfiler from '../common/PerformanceProfiler';
import { LiveChatPageProps, LiveChatConversation, LiveChatFilters } from '../../types/liveChat';

// Mock data for development - replace with real data fetching
const mockConversations: LiveChatConversation[] = [
  {
    id: 'conv-1',
    userId: 'user-1',
    user: {
      id: 'user-1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      isOnline: true,
      lastSeen: new Date(),
    },
    funnelId: 'funnel-1',
    funnelName: 'E-commerce Funnel',
    status: 'open',
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    lastMessageAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    lastMessage: 'I\'m looking for a better way to manage my online store inventory.',
    messageCount: 12,
    // Backend-ready fields
    autoCloseAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Auto-close in 2 days
    isArchived: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000),
    messages: [
      {
        id: 'msg-1',
        conversationId: 'conv-1',
        type: 'bot',
        text: 'Hi! I\'m here to help you find the perfect solution. What brings you here today?',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: true,
        metadata: { blockId: 'block-1' },
      },
      {
        id: 'msg-2',
        conversationId: 'conv-1',
        type: 'user',
        text: 'I\'m looking for a better way to manage my online store inventory.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 60000),
        isRead: true,
      },
    ],
  },
  {
    id: 'conv-2',
    userId: 'user-2',
    user: {
      id: 'user-2',
      name: 'Mike Chen',
      email: 'mike@example.com',
      isOnline: false,
      lastSeen: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
    funnelId: 'funnel-1',
    funnelName: 'E-commerce Funnel',
    status: 'closed',
    startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
    lastMessage: 'Thank you for your help! I\'ll think about it.',
    messageCount: 8,
    // Backend-ready fields
    autoCloseAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Auto-close in 1 day
    isArchived: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    messages: [],
  },
];

// Utility function to simulate backend auto-closing logic
const simulateAutoClose = (conversations: LiveChatConversation[]): LiveChatConversation[] => {
  const now = new Date();
  return conversations.map(conv => {
    // Auto-close conversations that have passed their autoCloseAt time
    if (conv.autoCloseAt && now > conv.autoCloseAt && conv.status === 'open') {
      return {
        ...conv,
        status: 'closed' as const,
        updatedAt: now
      };
    }
    return conv;
  });
};

const LiveChatPage: React.FC<LiveChatPageProps> = React.memo(({ onBack, onTypingChange, onChatStateChange }) => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<LiveChatConversation[]>(mockConversations);
  const [filters, setFilters] = useState<LiveChatFilters>({
    status: 'open',
    sortBy: 'newest',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Backend-ready state (currently unused with mock data)
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = useMemo(() => {
    return conversations.find(c => c.id === selectedConversationId) || null;
  }, [selectedConversationId, conversations]);

  // Notify parent when we're in a chat conversation
  useEffect(() => {
    onChatStateChange?.(!!selectedConversation);
  }, [selectedConversation, onChatStateChange]);

  // Simulate backend auto-closing behavior
  useEffect(() => {
    const interval = setInterval(() => {
      setConversations(prevConversations => {
        const updatedConversations = simulateAutoClose(prevConversations);
        // Only update if there were changes - use shallow comparison instead of JSON.stringify
        const hasChanges = updatedConversations.some((conv, index) => 
          conv.status !== prevConversations[index]?.status ||
          conv.updatedAt.getTime() !== prevConversations[index]?.updatedAt.getTime()
        );
        
        return hasChanges ? updatedConversations : prevConversations;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedConversationId) return;
    
    // TODO: Replace with actual API call when backend is ready
    // const response = await sendMessage(selectedConversationId, message);
    
    // For now, simulate API call with mock data
    const newMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selectedConversationId,
      type: 'bot' as const, // Agent messages are 'bot' type to appear on left
      text: message,
      timestamp: new Date(),
      isRead: true,
    };

    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === selectedConversationId 
          ? {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: message,
              lastMessageAt: new Date(),
              messageCount: conv.messageCount + 1,
              updatedAt: new Date() // Backend-ready field
            }
          : conv
      )
    );
  }, [selectedConversationId]);

  const handleUpdateConversation = async (updatedConversation: LiveChatConversation) => {
    // TODO: Replace with actual API call when backend is ready
    // const response = await updateConversation(updatedConversation.id, {
    //   status: updatedConversation.status,
    //   isArchived: updatedConversation.isArchived
    // });
    
    // For now, update local state directly
    setConversations(prevConversations => 
      prevConversations.map(conv => 
        conv.id === updatedConversation.id 
          ? { ...updatedConversation, updatedAt: new Date() } // Backend-ready field
          : conv
      )
    );
    
    // Auto-switch the filter view to match the new conversation status
    setFilters(prevFilters => ({
      ...prevFilters,
      status: updatedConversation.status
    }));
  };

  // Handle search reset
  const handleSearchReset = () => {
    setSearchQuery('');
  };

  // Handle search state change
  const handleSearchStateChange = (isOpen: boolean) => {
    setIsSearchOpen(isOpen);
    // Notify parent component about the combined state (input focus OR search open)
    onTypingChange?.(isOpen);
  };

  // Handle input focus/blur from chat view
  const handleInputFocusChange = (isFocused: boolean) => {
    // Notify parent component about the combined state (input focus OR search open)
    onTypingChange?.(isFocused || isSearchOpen);
  };

  return (
    <div className={`relative ${selectedConversation ? 'lg:p-4 lg:pb-8' : 'p-4 sm:p-6 lg:p-8'} pb-20 lg:pb-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header with Whop Design Patterns - Hidden on mobile when in chat */}
        <div className={`${selectedConversation ? 'hidden lg:block' : 'block'}`}>
          <LiveChatHeader
            onBack={onBack}
            filters={filters}
            searchQuery={searchQuery}
            onFiltersChange={setFilters}
            onSearchChange={setSearchQuery}
            onSearchStateChange={handleSearchStateChange}
          />
        </div>

        {/* Main Content Area */}
        <div className={`flex-grow flex flex-col md:overflow-hidden gap-6 ${selectedConversation ? 'lg:mt-8' : 'mt-8'}`}>
          {/* Mobile: Show conversation list or chat view */}
          <div className={`lg:hidden ${selectedConversation ? 'h-[calc(100vh-120px)]' : 'h-[calc(100vh-300px)]'} min-h-[400px] overflow-hidden`}>
            {selectedConversation ? (
              <div className="h-full animate-in fade-in duration-0">
                <LiveChatView
                  conversation={selectedConversation}
                  onSendMessage={handleSendMessage}
                  onUpdateConversation={handleUpdateConversation}
                  onBack={() => setSelectedConversationId(null)}
                  onTypingChange={handleInputFocusChange}
                />
              </div>
            ) : (
              <div className="h-full animate-in fade-in duration-0">
                <ConversationList
                  conversations={conversations}
                  selectedConversationId={selectedConversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  filters={{ ...filters, searchQuery }}
                  onFiltersChange={setFilters}
                  onSearchReset={handleSearchReset}
                />
              </div>
            )}
          </div>

          {/* Desktop: Show both side by side */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-6 h-[calc(100vh-300px)] min-h-[500px] max-h-[calc(100vh-300px)]">
            {/* Conversation List */}
            <div className="lg:col-span-1 overflow-hidden">
              <PerformanceProfiler id="ConversationList">
                <ConversationList
                  conversations={conversations}
                  selectedConversationId={selectedConversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  filters={{ ...filters, searchQuery }}
                  onFiltersChange={setFilters}
                  onSearchReset={handleSearchReset}
                  isLoading={isLoading}
                />
              </PerformanceProfiler>
            </div>

            {/* Chat View */}
            <div className="lg:col-span-2 overflow-hidden h-full">
              {selectedConversation ? (
                <div className="h-full animate-in fade-in duration-0">
                  <PerformanceProfiler id="LiveChatView">
                    <LiveChatView
                      conversation={selectedConversation}
                      onSendMessage={handleSendMessage}
                      onUpdateConversation={handleUpdateConversation}
                      onBack={() => setSelectedConversationId(null)}
                      onTypingChange={handleInputFocusChange}
                      isLoading={isLoading}
                    />
                  </PerformanceProfiler>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="p-6 rounded-full bg-gray-100 dark:bg-gray-800 w-20 h-20 mb-6 flex items-center justify-center mx-auto">
                      <MessageCircle size={32} className="text-gray-400" />
                    </div>
                    <Text size="3" weight="medium" className="text-foreground mb-2">
                      No conversation selected
                    </Text>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

LiveChatPage.displayName = 'LiveChatPage';

export default LiveChatPage;
