// Live Chat Types and Interfaces

export interface LiveChatUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  timezone?: string;
}

export interface LiveChatMessage {
  id: string;
  conversationId: string;
  type: 'user' | 'bot' | 'system';
  text: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: {
    blockId?: string;
    optionId?: string;
    funnelStage?: string;
    offerId?: string;
  };
}

export interface LiveChatConversation {
  id: string;
  userId: string;
  user: LiveChatUser;
  funnelId: string;
  funnelName: string;
  status: 'open' | 'closed';
  startedAt: Date;
  lastMessageAt: Date;
  lastMessage: string;
  messageCount: number;
  messages: LiveChatMessage[];
  // Backend-specific fields
  autoCloseAt?: Date; // When conversation will auto-close
  isArchived?: boolean; // If conversation is archived
  createdAt: Date; // When conversation was created
  updatedAt: Date; // Last update timestamp
}

export interface LiveChatFilters {
  status?: 'all' | 'open' | 'closed';
  sortBy?: 'newest' | 'oldest' | 'most_messages' | 'least_messages';
  searchQuery?: string;
}

// Backend API Types
export interface CreateMessageRequest {
  conversationId: string;
  text: string;
  type: 'bot' | 'system';
}

export interface CreateMessageResponse {
  message: LiveChatMessage;
  conversation: LiveChatConversation;
}

export interface UpdateConversationRequest {
  conversationId: string;
  status?: 'open' | 'closed';
  isArchived?: boolean;
}

export interface UpdateConversationResponse {
  conversation: LiveChatConversation;
}

export interface GetConversationsResponse {
  conversations: LiveChatConversation[];
  total: number;
  hasMore: boolean;
}

export interface GetMessagesResponse {
  messages: LiveChatMessage[];
  hasMore: boolean;
}

// Component Props
export interface LiveChatPageProps {
  onBack: () => void;
  onTypingChange?: (isTyping: boolean) => void;
}

export interface ConversationListProps {
  conversations: LiveChatConversation[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  filters: LiveChatFilters;
  onFiltersChange: (filters: LiveChatFilters) => void;
  onSearchReset?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export interface LiveChatViewProps {
  conversation: LiveChatConversation;
  onSendMessage: (message: string) => void;
  onUpdateConversation: (conversation: LiveChatConversation) => void;
  onBack: () => void;
  onTypingChange?: (isTyping: boolean) => void;
  isLoading?: boolean;
}

export interface ConversationCardProps {
  conversation: LiveChatConversation;
  isSelected: boolean;
  onClick: () => void;
}