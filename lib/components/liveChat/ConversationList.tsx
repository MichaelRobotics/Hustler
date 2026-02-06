"use client";

import { Button, Card, Text } from "frosted-ui";
import { ArrowUpDown, Search } from "lucide-react";
import React, { useMemo, useCallback, useRef } from "react";
import {
	type ConversationListProps,
	LiveChatConversation,
} from "../../types/liveChat";
import LoadingSpinner from "../common/LoadingSpinner";
import ConversationCard from "./ConversationCard";

const ConversationList: React.FC<ConversationListProps> = React.memo(
	({
		conversations,
		selectedConversationId,
		onSelectConversation,
		filters,
		onFiltersChange,
		onSearchReset,
		isLoading = false,
	}) => {
		// Performance optimization: cache search query
		const searchQuery = useMemo(
			() => filters.searchQuery?.trim().toLowerCase() || "",
			[filters.searchQuery],
		);

		// Filter only; order comes from parent (sorted once on page load / sort change).
		const filteredConversations = useMemo(() => {
			let filtered = conversations.filter((conv) => conv && conv.status); // Add defensive check

			// Filter by status
			if (filters.status) {
				filtered = filtered.filter((conv) => conv.status === filters.status);
			}

			// Filter by search query (optimized with cached query)
			if (searchQuery) {
				filtered = filtered.filter(
					(conv) =>
						conv.user.name.toLowerCase().includes(searchQuery) ||
						conv.user.email?.toLowerCase().includes(searchQuery) ||
						conv.funnelName.toLowerCase().includes(searchQuery),
				);
			}

			return filtered;
		}, [conversations, filters.status, searchQuery]);

		const handleSortChange = useCallback(
			(sortBy: "newest" | "oldest") => {
				onFiltersChange({ ...filters, sortBy });
			},
			[filters, onFiltersChange],
		);

		const handleConversationClick = useCallback(
			(conversationId: string) => {
				onSelectConversation(conversationId);
				onSearchReset?.();
			},
			[onSelectConversation, onSearchReset],
		);

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
								{filters.searchQuery ? "Try adjusting your search" : ""}
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
	},
);

ConversationList.displayName = "ConversationList";

export default ConversationList;
