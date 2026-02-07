"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	CreateMessageRequest,
	GetConversationsResponse,
	GetMessagesResponse,
	LiveChatConversation,
	LiveChatFilters,
	LiveChatMessage,
	UpdateConversationRequest,
} from "../types/liveChat";
import { apiGet, apiPost, apiPut } from "../utils/api-client";

interface UseLiveChatOptions {
	autoRefresh?: boolean;
	refreshInterval?: number;
	user?: { experienceId?: string } | null;
}

export const useLiveChat = (options: UseLiveChatOptions = {}) => {
	const { autoRefresh = true, refreshInterval = 30000, user } = options;

	// State management
	const [conversations, setConversations] = useState<LiveChatConversation[]>(
		[],
	);
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const [filters, setFilters] = useState<LiveChatFilters>({
		status: "open",
		sortBy: "newest",
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Refs for cleanup
	const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	// Fetch conversations from API
	const fetchConversations = useCallback(
		async (reset = false) => {
			if (isLoading) return;

			setIsLoading(true);
			setError(null);

		try {
			// Check if user context is available
			if (!user?.experienceId) {
				throw new Error("Experience ID is required");
			}

			// Cancel previous request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}

			abortControllerRef.current = new AbortController();

			const params = new URLSearchParams({
				status: filters.status || "open",
				sortBy: filters.sortBy || "newest",
				...(searchQuery && { search: searchQuery }),
				...(reset ? {} : { offset: conversations.length.toString() }),
			});

			const response = await apiGet(`/api/live-chat/conversations?${params}`, user.experienceId);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch conversations: ${response.statusText}`,
					);
				}

				const data: GetConversationsResponse = await response.json();

				if (reset) {
					setConversations(data.conversations);
				} else {
					setConversations((prev) => [...prev, ...data.conversations]);
				}

				setHasMore(data.hasMore);
			} catch (error) {
				if (error instanceof Error && error.name !== "AbortError") {
					setError(error.message);
					console.error("Failed to fetch conversations:", error);
				}
			} finally {
				setIsLoading(false);
			}
		},
		[conversations.length, filters, searchQuery, isLoading, user?.experienceId],
	);

	// Send message to conversation
	const sendMessage = useCallback(
		async (conversationId: string, message: CreateMessageRequest) => {
			try {
				// Check if user context is available
				if (!user?.experienceId) {
					throw new Error("Experience ID is required");
				}

				const response = await apiPost(`/api/live-chat/messages`, {
					...message,
					conversationId,
				}, user.experienceId);

				if (!response.ok) {
					throw new Error(`Failed to send message: ${response.statusText}`);
				}

				const newMessage: LiveChatMessage = await response.json();

				// Update local state optimistically
				setConversations((prev) =>
					prev.map((conv) =>
						conv.id === conversationId
							? {
									...conv,
									messages: [...conv.messages, newMessage],
									lastMessage: newMessage.text,
									lastMessageAt: newMessage.timestamp,
									messageCount: conv.messageCount + 1,
									updatedAt: new Date().toISOString(),
								}
							: conv,
					),
				);

				return newMessage;
			} catch (error) {
				console.error("Failed to send message:", error);
				throw error;
			}
		},
		[user?.experienceId],
	);

	// Update conversation status
	const updateConversation = useCallback(
		async (conversationId: string, updates: UpdateConversationRequest) => {
			try {
				// Check if user context is available
				if (!user?.experienceId) {
					throw new Error("Experience ID is required");
				}

				const response = await apiPut(
					`/api/live-chat/conversations/${conversationId}`,
					updates,
					user.experienceId
				);

				if (!response.ok) {
					throw new Error(
						`Failed to update conversation: ${response.statusText}`,
					);
				}

				const updatedConversation: LiveChatConversation = await response.json();

				// Update local state
				setConversations((prev) =>
					prev.map((conv) =>
						conv.id === conversationId
							? { ...updatedConversation, updatedAt: new Date().toISOString() }
							: conv,
					),
				);

				return updatedConversation;
			} catch (error) {
				console.error("Failed to update conversation:", error);
				throw error;
			}
		},
		[user?.experienceId],
	);

	// Fetch messages for a specific conversation (optimized - only when needed)
	const fetchMessages = useCallback(
		async (conversationId: string, reset = false) => {
		try {
			// Check if user context is available
			if (!user?.experienceId) {
				throw new Error("Experience ID is required");
			}

			// Check if conversation already has messages loaded
			const existingConversation = conversations.find(conv => conv.id === conversationId);
			if (existingConversation?.messages && existingConversation.messages.length > 0 && !reset) {
				console.log("LiveChat: Messages already loaded for conversation", conversationId);
				return existingConversation.messages;
			}

			const params = new URLSearchParams({
				...(reset ? {} : { offset: "0" }),
			});

			const response = await apiGet(
				`/api/live-chat/conversations/${conversationId}/messages?${params}`,
				user.experienceId
			);

				if (!response.ok) {
					throw new Error(`Failed to fetch messages: ${response.statusText}`);
				}

				const data: GetMessagesResponse = await response.json();

				// Update conversation with messages
				setConversations((prev) =>
					prev.map((conv) =>
						conv.id === conversationId
							? {
									...conv,
									messages: reset
										? data.messages
										: [...conv.messages, ...data.messages],
									updatedAt: new Date().toISOString(),
								}
							: conv,
					),
				);

				return data.messages;
			} catch (error) {
				console.error("Failed to fetch messages:", error);
				throw error;
			}
		},
		[user?.experienceId, conversations],
	);

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
				refreshIntervalRef.current = null;
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
				abortControllerRef.current = null;
			}
		};
	}, [autoRefresh, refreshInterval, fetchConversations]);

	// Refetch when filters or search change
	useEffect(() => {
		fetchConversations(true);
	}, [filters, searchQuery]);

	// Get selected conversation
	const selectedConversation =
		conversations.find((conv) => conv.id === selectedConversationId) || null;

	// Filtered conversations (open/auto = API already filtered by user; show all returned)
	const filteredConversations = conversations.filter((conv) => {
		if (filters.status && filters.status !== "open" && filters.status !== "auto" && conv.status !== filters.status) return false;
		if (
			searchQuery &&
			!conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
			!conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
		) {
			return false;
		}
		return true;
	});

	// Sort conversations
	const sortedConversations = [...filteredConversations].sort((a, b) => {
		if (filters.sortBy === "oldest") {
			return (
				new Date(a.lastMessageAt).getTime() -
				new Date(b.lastMessageAt).getTime()
			);
		} else {
			return (
				new Date(b.lastMessageAt).getTime() -
				new Date(a.lastMessageAt).getTime()
			);
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
		clearError: () => setError(null),
	};
};
