'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LiveChatConversation, 
  LiveChatMessage, 
  LiveChatFilters,
  CreateMessageRequest,
  UpdateConversationRequest,
  GetConversationsResponse,
  GetMessagesResponse
} from '../types/liveChat';

interface UseLiveChatOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useLiveChat = (options: UseLiveChatOptions = {}) => {
  const { autoRefresh = true, refreshInterval = 30000 } = options;
  
  // State
  const [conversations, setConversations] = useState<LiveChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<LiveChatFilters>({ 
    status: 'open', 
    sortBy: 'newest' 
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  
  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // API Functions
  const fetchConversations = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        status: filters.status || 'open',
        sortBy: filters.sortBy || 'newest',
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`/api/live-chat/conversations?${params}`, {
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data: GetConversationsResponse = await response.json();
      setConversations(data.conversations);
      setHasMore(data.hasMore);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching conversations:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchQuery]);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    try {
      const request: CreateMessageRequest = {
        conversationId,
        text,
        type: 'bot'
      };

      const response = await fetch('/api/live-chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Update local state with the new message and updated conversation
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === conversationId
            ? {
                ...conv,
                messages: [...conv.messages, data.message],
                lastMessage: text,
                lastMessageAt: new Date(),
                messageCount: conv.messageCount + 1,
                updatedAt: new Date()
              }
            : conv
        )
      );

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, []);

  const updateConversation = useCallback(async (conversationId: string, updates: Partial<UpdateConversationRequest>) => {
    try {
      const request: UpdateConversationRequest = {
        conversationId,
        ...updates
      };

      const response = await fetch('/api/live-chat/conversations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to update conversation');
      }

      const data = await response.json();
      
      // Update local state
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, ...data.conversation, updatedAt: new Date() }
            : conv
        )
      );

      return data;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/live-chat/conversations/${conversationId}/messages`, {
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data: GetMessagesResponse = await response.json();
      
      // Update conversation with messages
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, messages: data.messages }
            : conv
        )
      );

      return data;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching messages:', error);
      }
      throw error;
    }
  }, []);

  // Event Handlers
  const handleSelectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId);
    // Fetch messages for the selected conversation
    fetchMessages(conversationId);
  }, [fetchMessages]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!selectedConversationId) return;
    
    try {
      await sendMessage(selectedConversationId, message);
    } catch (error) {
      // Handle error (show toast, etc.)
      console.error('Failed to send message:', error);
    }
  }, [selectedConversationId, sendMessage]);

  const handleUpdateConversation = useCallback(async (updatedConversation: LiveChatConversation) => {
    try {
      await updateConversation(updatedConversation.id, {
        status: updatedConversation.status,
        isArchived: updatedConversation.isArchived
      });
      
      // Auto-switch filter view to match new status
      setFilters(prevFilters => ({
        ...prevFilters,
        status: updatedConversation.status
      }));
    } catch (error) {
      console.error('Failed to update conversation:', error);
    }
  }, [updateConversation]);

  const handleFiltersChange = useCallback((newFilters: LiveChatFilters) => {
    setFilters(newFilters);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchConversations();
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchConversations]);

  // Fetch conversations when filters or search change
  useEffect(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    fetchConversations(abortControllerRef.current.signal);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchConversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Computed values
  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId);

  return {
    // State
    conversations,
    selectedConversationId,
    selectedConversation,
    filters,
    searchQuery,
    isLoading,
    hasMore,
    
    // Actions
    handleSelectConversation,
    handleSendMessage,
    handleUpdateConversation,
    handleFiltersChange,
    handleSearchChange,
    
    // Direct API access (for advanced use cases)
    sendMessage,
    updateConversation,
    fetchConversations,
    fetchMessages,
  };
};
