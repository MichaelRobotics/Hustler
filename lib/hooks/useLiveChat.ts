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
  
  // State management
  const [conversations, setConversations] = useState<LiveChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<LiveChatFilters>({
    status: 'open',
    sortBy: 'newest'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch conversations from API
  const fetchConversations = useCallback(async (reset = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const params = new URLSearchParams({
        status: filters.status || 'open',
        sortBy: filters.sortBy || 'newest',
        ...(searchQuery && { search: searchQuery }),
        ...(reset ? {} : { offset: conversations.length.toString() })
      });
      
      const response = await fetch(`/api/live-chat/conversations?${params}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }
      
      const data: GetConversationsResponse = await response.json();
      
      if (reset) {
        setConversations(data.conversations);
      } else {
        setConversations(prev => [...prev, ...data.conversations]);
      }
      
      setHasMore(data.hasMore);
      
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setError(error.message);
        console.error('Failed to fetch conversations:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversations.length, filters, searchQuery, isLoading]);

  // Send message to conversation
  const sendMessage = useCallback(async (conversationId: string, message: CreateMessageRequest) => {
    try {
      const response = await fetch(`/api/live-chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...message,
          conversationId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }
      
      const newMessage: LiveChatMessage = await response.json();
      
      // Update local state optimistically
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                lastMessage: newMessage.text,
                lastMessageAt: newMessage.timestamp,
                messageCount: conv.messageCount + 1,
                updatedAt: new Date()
              }
            : conv
        )
      );
      
      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, []);

  // Update conversation status
  const updateConversation = useCallback(async (conversationId: string, updates: UpdateConversationRequest) => {
    try {
      const response = await fetch(`/api/live-chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update conversation: ${response.statusText}`);
      }
      
      const updatedConversation: LiveChatConversation = await response.json();
      
      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...updatedConversation, updatedAt: new Date() }
            : conv
        )
      );
      
      return updatedConversation;
    } catch (error) {
      console.error('Failed to update conversation:', error);
      throw error;
    }
  }, []);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string, reset = false) => {
    try {
      const params = new URLSearchParams({
        ...(reset ? {} : { offset: '0' })
      });
      
      const response = await fetch(`/api/live-chat/conversations/${conversationId}/messages?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      
      const data: GetMessagesResponse = await response.json();
      
      // Update conversation with messages
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? {
                ...conv,
                messages: reset ? data.messages : [...conv.messages, ...data.messages],
                updatedAt: new Date()
              }
            : conv
        )
      );
      
      return data.messages;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  }, []);

  // Auto-refresh conversations
  useEffect(() => {
    if (!autoRefresh) return;
    
    const refresh = () => {
      fetchConversations(true);
    };
    
    // Initial fetch
    refresh();
    
    // Set up interval
    refreshIntervalRef.current = setInterval(refresh, refreshInterval);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoRefresh, refreshInterval, fetchConversations]);

  // Refetch when filters or search change
  useEffect(() => {
    fetchConversations(true);
  }, [filters, searchQuery]);

  // Get selected conversation
  const selectedConversation = conversations.find(conv => conv.id === selectedConversationId) || null;

  // Filtered conversations
  const filteredConversations = conversations.filter(conv => {
    if (filters.status && conv.status !== filters.status) return false;
    if (searchQuery && !conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Sort conversations
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (filters.sortBy === 'oldest') {
      return new Date(a.lastMessageAt).getTime() - new Date(b.lastMessageAt).getTime();
    } else {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    }
  });

  return {
    // State
    conversations: sortedConversations,
    selectedConversation,
    selectedConversationId,
    filters,
    searchQuery,
    isLoading,
    hasMore,
    error,
    
    // Actions
    setSelectedConversationId,
    setFilters,
    setSearchQuery,
    sendMessage,
    updateConversation,
    fetchMessages,
    fetchConversations,
    
    // Utilities
    retry: () => fetchConversations(true),
    clearError: () => setError(null)
  };
};
