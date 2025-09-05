'use client';

import React, { useMemo, useCallback } from 'react';
import { Card, Text, Button } from 'frosted-ui';
import { ArrowUpDown, Search } from 'lucide-react';
import ConversationCard from './ConversationCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { ConversationListProps, LiveChatConversation } from '../../types/liveChat';

const ConversationList: React.FC<ConversationListProps> = React.memo(({
  conversations,
  selectedConversationId,
  onSelectConversation,
  filters,
  onFiltersChange,
  onSearchReset,
  isLoading = false
}) => {

  // Filter and sort conversations based on current filters
  const filteredConversations = useMemo(() => {
    let filtered = conversations.filter(conv => conv && conv.status); // Add defensive check

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(conv => conv.status === filters.status);
    }

    // Filter by search query
    if (filters.searchQuery?.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(conv => 
        conv.user.name.toLowerCase().includes(query) ||
        conv.user.email?.toLowerCase().includes(query) ||
        conv.funnelName.toLowerCase().includes(query)
      );
    }

    // Sort by last message time
    return filtered.sort((a, b) => {
      const timeA = new Date(a.lastMessageAt).getTime();
      const timeB = new Date(b.lastMessageAt).getTime();
      return filters.sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [conversations, filters]);

  const handleSortChange = useCallback((sortBy: 'newest' | 'oldest') => {
    onFiltersChange({ ...filters, sortBy });
  }, [filters, onFiltersChange]);

  const handleConversationClick = useCallback((conversationId: string) => {
    onSelectConversation(conversationId);
    onSearchReset?.();
  }, [onSelectConversation, onSearchReset]);

  return (
    <div className="h-full flex flex-col min-h-[400px] lg:max-h-[500px]">
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner size="md" text="Loading conversations..." />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800 w-16 h-16 mb-4 flex items-center justify-center">
              <Search size={24} className="text-gray-400" />
            </div>
            <Text size="2" weight="medium" className="text-foreground mb-1">
              No conversations found
            </Text>
            <Text size="1" color="gray" className="text-muted-foreground">
              {filters.searchQuery ? 'Try adjusting your search' : ''}
            </Text>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';

export default ConversationList;
