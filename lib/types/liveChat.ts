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
	type: "user" | "bot" | "system" | "admin"; // Admin = sent from LiveChat by admin; bot = automated
	text: string;
	timestamp: string;
	isRead: boolean;
	metadata?: {
		blockId?: string;
		optionId?: string;
		funnelStage?: string;
		offerId?: string;
		isOptimistic?: boolean;
		optimisticAddedAt?: number; // timestamp when optimistic message was added (for "not sent" warning)
		failedToSend?: boolean; // set when send API failed so UI can show "Failed to send"
		userId?: string;
		experienceId?: string;
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
	// Read receipts: message is "read by user" when createdAt <= userLastReadAt (bot/admin msgs); "read by admin" when createdAt <= adminLastReadAt (user msgs)
	userLastReadAt?: string | null;
	adminLastReadAt?: string | null;
	// Unread and handover
	unreadCountAdmin?: number;
	unreadCountUser?: number;
	controlledBy?: "bot" | "admin";
	/** Typing indicator: other side is typing when true */
	typing?: { user?: boolean; admin?: boolean };
	/** Avatar URL of the admin user for this experience (from users table) */
	adminAvatar?: string;
	/** When list is grouped by user: number of conversations for this user in the experience (display only) */
	conversationCount?: number;
	/** When list is grouped by user: all conversation ids for this user (so card is selected when viewing any of them) */
	conversationIds?: string[];
}

export interface LiveChatFilters {
	status?: "open" | "auto";
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
	type: "bot" | "system" | "admin";
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
	/** Merchant/bot icon URL for bot messages (optional, fetched from origin template if not provided) */
	merchantIconUrl?: string | null;
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
	/** Merchant/bot icon URL (e.g. from origin_templates.companyLogoUrl) for bot messages */
	merchantIconUrl?: string | null;
	/** Admin avatar URL (from users table, admin for this experience); fallback when conversation.adminAvatar not set */
	adminAvatarUrl?: string | null;
	/** Called when admin opens/views conversation to mark messages as read (sets admin_last_read_at) */
	onMarkAsRead?: (conversationId: string) => void;
	/** Called when admin resolves conversation (back to bot) */
	onResolve?: (conversationId: string) => void;
	/** Called when admin typing state changes (active: true when typing, false when stopped/sent) */
	onTypingChange?: (conversationId: string, active: boolean) => void;
}

export interface ConversationCardProps {
	conversation: LiveChatConversation;
	isSelected: boolean;
	onClick: () => void;
}
