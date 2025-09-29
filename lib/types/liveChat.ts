// Live Chat Types and Interfaces
import type { AuthenticatedUser } from "./user";

export interface LiveChatUser {
	id: string;
	name: string;
	email?: string;
	avatar?: string;
	isOnline: boolean;
	lastSeen?: string;
	timezone?: string;
}

export interface LiveChatMessage {
	id: string;
	conversationId: string;
	type: "user" | "bot" | "system" | "agent"; // Added 'agent' type for agent messages
	text: string;
	timestamp: string;
	isRead: boolean;
	metadata?: {
		blockId?: string;
		optionId?: string;
		funnelStage?: string;
		offerId?: string;
		isOptimistic?: boolean; // ✅ FIXED: Add optimistic flag
		userId?: string; // ✅ FIXED: Add user ID for duplicate prevention
		experienceId?: string; // ✅ FIXED: Add experience ID for multitenancy
	};
}

export interface LiveChatConversation {
	id: string;
	userId: string;
	user: LiveChatUser;
	funnelId: string;
	funnelName: string;
	status: "open" | "closed";
	startedAt: string;
	lastMessageAt: string;
	lastMessage: string;
	messageCount: number;
	messages: LiveChatMessage[];
	// Backend-specific fields
	autoCloseAt?: string; // When conversation will auto-close
	isArchived?: boolean; // If conversation is archived
	createdAt: string; // When conversation was created
	updatedAt: string; // Last update timestamp
	metadata?: {
		completedSteps?: number;
		totalSteps?: number;
		[key: string]: any;
	};
	// LiveChat integration fields
	currentStage?: string; // Current funnel stage (WELCOME, TRANSITION, etc.)
	whopUserId?: string; // Whop user ID for WebSocket integration
	experienceId?: string; // Experience ID for multi-tenancy
}

export interface LiveChatFilters {
	status?: "all" | "open" | "closed";
	sortBy?: "newest" | "oldest" | "most_messages" | "least_messages";
	searchQuery?: string;
}

export interface LiveChatPagination {
	page: number;
	limit: number;
}

export interface LiveChatConversationResponse {
	conversations: LiveChatConversation[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

// Backend API Types
export interface CreateMessageRequest {
	conversationId: string;
	text: string;
	type: "bot" | "system" | "agent";
}

export interface CreateMessageResponse {
	message: LiveChatMessage;
	conversation: LiveChatConversation;
}

export interface UpdateConversationRequest {
	conversationId: string;
	status?: "open" | "closed";
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
	onChatStateChange?: (isInChat: boolean) => void;
	user: AuthenticatedUser | null;
	experienceId: string; // Add experienceId prop for multi-tenant isolation
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
	onBack: () => void;
	isLoading?: boolean;
}

export interface ConversationCardProps {
	conversation: LiveChatConversation;
	isSelected: boolean;
	onClick: () => void;
}
