'use client';

/**
 * LiveChatPage - Real-Time WebSocket Integration
 * 
 * This component integrates with the real-time WebSocket system for live chat functionality.
 * Replaces mock data with actual API calls and real-time updates.
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
import { useWebSocket } from '../../hooks/useWebSocket';
import { ChatMessage, TypingIndicator, UserPresence } from '../../websocket';

interface LiveChatPageRealTimeProps extends LiveChatPageProps {
  user: {
    id: string;
    companyId: string;
    name: string;
    accessLevel: 'admin' | 'customer';
  };
}

const LiveChatPageRealTime: React.FC<LiveChatPageRealTimeProps> = React.memo(({ 
  onBack, 
  onTypingChange, 
  user 
}) => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<LiveChatConversation[]>([]);
  const [filters, setFilters] = useState<LiveChatFilters>({
    status: 'open',
    sortBy: 'newest',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Backend state
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // WebSocket integration
  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage: wsSendMessage,
    sendTypingIndicator,
    subscribeToConversation,
    subscribeToTyping,
    subscribeToPresence,
    getTypingUsers: wsGetTypingUsers,
    getUserPresence,
    getOnlineUsers
  } = useWebSocket({
    autoConnect: true,
    onConnectionChange: (connected) => {
      console.log('WebSocket connection changed:', connected);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setError(error.message);
    }
  });

  const selectedConversation = useMemo(() => {
    return conversations.find(c => c.id === selectedConversationId) || null;
  }, [selectedConversationId, conversations]);

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('whop-token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load conversations');
      }
      
      const data = await response.json();
      setConversations(data.conversations || []);
      setHasMore(data.hasMore || false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('whop-token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      
      // Update conversation with messages
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: data.messages || [] }
          : conv
      ));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  // Initialize WebSocket subscriptions
  useEffect(() => {
    if (isConnected && selectedConversationId) {
      // Subscribe to conversation messages
      subscribeToConversation(selectedConversationId, (message: ChatMessage) => {
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversationId 
            ? {
                ...conv,
                messages: [...conv.messages, {
                  id: message.id,
                  conversationId: message.conversationId,
                  type: message.type,
                  text: message.content,
                  timestamp: message.timestamp,
                  isRead: message.isRead,
                  metadata: message.metadata
                }],
                lastMessage: message.content,
                lastMessageAt: message.timestamp,
                messageCount: conv.messageCount + 1,
                updatedAt: message.timestamp
              }
            : conv
        ));
      });

      // Subscribe to typing indicators
      subscribeToTyping(selectedConversationId, (typing: TypingIndicator) => {
        if (typing.isTyping) {
          setTypingUsers(prev => new Set([...prev, typing.userId]));
        } else {
          setTypingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(typing.userId);
            return newSet;
          });
        }
      });
    }
  }, [isConnected, selectedConversationId, subscribeToConversation, subscribeToTyping]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId, loadMessages]);

  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedConversationId) return;
    
    try {
      // Send message via WebSocket
      await wsSendMessage(selectedConversationId, message, 'bot');
      
      // Also send via API for persistence
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('whop-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'bot',
          content: message
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    }
  }, [selectedConversationId, wsSendMessage]);

  const handleUpdateConversation = async (updatedConversation: LiveChatConversation) => {
    try {
      const response = await fetch(`/api/conversations/${updatedConversation.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('whop-token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: updatedConversation.status,
          isArchived: updatedConversation.isArchived
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update conversation');
      }
      
      // Update local state
      setConversations(prev => prev.map(conv => 
        conv.id === updatedConversation.id 
          ? { ...updatedConversation, updatedAt: new Date() }
          : conv
      ));
      
      // Auto-switch the filter view to match the new conversation status
      setFilters(prevFilters => ({
        ...prevFilters,
        status: updatedConversation.status
      }));
    } catch (error) {
      console.error('Error updating conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to update conversation');
    }
  };

  const handleTypingStart = useCallback(() => {
    if (selectedConversationId) {
      sendTypingIndicator(selectedConversationId, true);
    }
  }, [selectedConversationId, sendTypingIndicator]);

  const handleTypingStop = useCallback(() => {
    if (selectedConversationId) {
      sendTypingIndicator(selectedConversationId, false);
    }
  }, [selectedConversationId, sendTypingIndicator]);

  // Handle search reset
  const handleSearchReset = () => {
    setSearchQuery('');
  };

  // Handle search state change
  const handleSearchStateChange = (isOpen: boolean) => {
    setIsSearchOpen(isOpen);
  };

  // Filter conversations based on current filters and search
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(conv => conv.status === filters.status);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.user.name.toLowerCase().includes(query) ||
        conv.funnelName.toLowerCase().includes(query) ||
        conv.lastMessage?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'oldest':
          return a.updatedAt.getTime() - b.updatedAt.getTime();
        case 'most_messages':
          return b.messageCount - a.messageCount;
        case 'least_messages':
          return a.messageCount - b.messageCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [conversations, filters, searchQuery]);

  // Connection status indicator
  const connectionStatus = isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected';

  return (
    <div className="flex flex-col h-full bg-background">
      <PerformanceProfiler id="LiveChatPageRealTime">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="2"
              onClick={onBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <Heading size="4">Live Chat</Heading>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
                              <Text size="2" className="text-muted-foreground">
                {connectionStatus}
              </Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="2"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2"
            >
              <Search className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <Text className="text-red-600">{error}</Text>
            <Button
              variant="ghost"
              size="2"
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversation List */}
          <div className="w-80 border-r border-border flex flex-col">
            <ConversationList
              conversations={filteredConversations}
              selectedConversationId={selectedConversationId || undefined}
              onSelectConversation={handleSelectConversation}
              filters={filters}
              onFiltersChange={setFilters}
              onSearchReset={handleSearchReset}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={() => {/* TODO: Implement pagination */}}
            />
          </div>

          {/* Chat View */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <LiveChatView
                conversation={selectedConversation}
                onSendMessage={handleSendMessage}
                onUpdateConversation={handleUpdateConversation}
                onBack={onBack}
                onTypingChange={onTypingChange}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Card className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <Heading size="4" className="mb-2">No Conversation Selected</Heading>
                  <Text className="text-muted-foreground">
                    Select a conversation from the list to start chatting
                  </Text>
                </Card>
              </div>
            )}
          </div>
        </div>
      </PerformanceProfiler>
    </div>
  );
});

LiveChatPageRealTime.displayName = 'LiveChatPageRealTime';

export default LiveChatPageRealTime;
