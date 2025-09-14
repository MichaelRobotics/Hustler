"use client";

/**
 * LiveChatPage - Phase 6 Real Data Integration
 *
 * This component now integrates with real data from the database:
 *
 * Real Data Integration:
 * - loadRealConversations: Loads conversations from database with filters
 * - getConversationList: Handles pagination and search
 * - loadConversationDetails: Loads full conversation with message history
 * - sendOwnerMessage: Sends messages from owner to user
 * - Real-time updates: WebSocket integration for live messaging
 * - Conversation management: Status changes, notes, archiving
 *
 * Features:
 * - Real-time messaging with typing indicators
 * - Conversation analytics and insights
 * - Owner experience enhancements
 * - Multi-tenant isolation
 * - Performance optimized
 */

import { Button, Card, Heading, Text } from "frosted-ui";
import { ArrowLeft, MessageCircle, Search, AlertCircle } from "lucide-react";
import React, {
	useState,
	useMemo,
	useEffect,
	useCallback,
	useRef,
} from "react";
import type {
	LiveChatConversation,
	LiveChatFilters,
	LiveChatPageProps,
} from "../../types/liveChat";
import { ThemeToggle } from "../common/ThemeToggle";
import ConversationList from "./ConversationList";
import LiveChatHeader from "./LiveChatHeader";
import LiveChatView from "./LiveChatView";
import { useLiveChatIntegration } from "../../hooks/useLiveChatIntegration";
import type { AuthenticatedUser } from "../../types/user";
import { apiGet, apiPost } from "../../utils/api-client";
// Database actions moved to API routes to avoid client-side imports

// Real data integration - no more mock data

// Optimized utility function to simulate backend auto-closing logic
const simulateAutoClose = (
	conversations: LiveChatConversation[],
): LiveChatConversation[] => {
	const now = new Date();
	return conversations.map((conv) => {
		// Auto-close conversations that have passed their autoCloseAt time
		if (conv.autoCloseAt && now > new Date(conv.autoCloseAt) && conv.status === "open") {
			return {
				...conv,
				status: "closed" as const,
				updatedAt: now.toISOString(),
			};
		}
		return conv;
	});
};

// Debounce utility for search
const useDebounce = (value: string, delay: number) => {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
};

const LiveChatPage: React.FC<LiveChatPageProps> = React.memo(({ onBack, experienceId }) => {
	// Get user context from authentication (same pattern as UserChat)
	const [user, setUser] = useState<AuthenticatedUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [authError, setAuthError] = useState<string | null>(null);
	
	// All other state hooks must be declared before any conditional returns
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | null
	>(null);
	const [conversations, setConversations] = useState<LiveChatConversation[]>([]);
	const [filters, setFilters] = useState<LiveChatFilters>({
		status: "open",
		sortBy: "newest",
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [totalConversations, setTotalConversations] = useState(0);
	const [isUserTyping, setIsUserTyping] = useState(false);
	const [isInChat, setIsInChat] = useState(false);

	// Performance optimizations
	const debouncedSearchQuery = useDebounce(searchQuery, 300);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const lastUpdateRef = useRef<number>(0);

	// Fetch user context on component mount (same pattern as ExperiencePage)
	useEffect(() => {
		const fetchUserContext = async () => {
			try {
				setLoading(true);
				const response = await apiGet(`/api/user/context?experienceId=${experienceId}`, experienceId);
				
				if (!response.ok) {
					if (response.status === 403) {
						setAuthError("Access denied");
					} else if (response.status === 401) {
						setAuthError("Authentication required");
					} else {
						setAuthError("Failed to load user context");
					}
					return;
				}

				const data = await response.json();
				if (data.user) {
					setUser(data.user);
				}
			} catch (err) {
				console.error("Error fetching user context:", err);
				setAuthError("Failed to load user context");
			} finally {
				setLoading(false);
			}
		};

		fetchUserContext();
	}, [experienceId]);

	// WebSocket integration with UserChat system
	const {
		isConnected,
		connectionStatus,
		sendMessage: sendWebSocketMessage,
		sendTyping,
		error: wsError,
		reconnect,
	} = useLiveChatIntegration({
		user: user || {
			id: "",
			whopUserId: "",
			experienceId: experienceId,
			email: "",
			name: "",
			credits: 0,
			accessLevel: "no_access" as const,
			experience: {
				id: "",
				whopExperienceId: experienceId,
				whopCompanyId: "",
				name: "",
			},
		}, // Provide default user when null
		experienceId: experienceId, // Use the prop instead of user.experienceId
		conversationId: selectedConversationId || undefined,
		onMessage: (message) => {
			if (message.type === "message" && message.message) {
				// Update conversation with new message
				setConversations(prev => 
					prev.map(conv => 
						conv.id === message.conversationId
							? {
								...conv,
								messages: [...conv.messages, {
									id: message.message!.id,
									conversationId: conv.id,
									type: message.message!.type,
									text: message.message!.content,
									timestamp: message.message!.timestamp,
									isRead: true,
									metadata: message.message!.metadata,
								}],
								lastMessage: message.message!.content,
								lastMessageAt: message.message!.timestamp,
								messageCount: conv.messageCount + 1,
								updatedAt: message.message!.timestamp,
							}
							: conv
					)
				);
			}
		},
		onConversationUpdate: (updatedConversation) => {
			// Update conversation in list
			setConversations(prev => 
				prev.map(conv => 
					conv.id === updatedConversation.id ? updatedConversation : conv
				)
			);
		},
		onStageTransition: (stageInfo) => {
			// Handle stage transitions (TRANSITION -> EXPERIENCE_QUALIFICATION)
			console.log("LiveChat: Stage transition detected:", stageInfo);
			// Update only the specific conversation instead of reloading all
			if (stageInfo.conversationId) {
				console.log(`[LIVECHAT] Updating conversation ${stageInfo.conversationId} with stage transition`);
				setConversations(prev => 
					prev.map(conv => 
						conv.id === stageInfo.conversationId 
							? { ...conv, ...stageInfo.conversation }
							: conv
					)
				);
			}
		},
		onConnectionChange: (status) => {
			console.log("LiveChat Integration status:", status);
		},
	});

	const selectedConversation = useMemo(() => {
		return conversations?.find((c) => c.id === selectedConversationId) || null;
	}, [selectedConversationId, conversations]);

	// Load conversations from database
	const loadConversations = useCallback(async (page = 1, reset = false, searchQuery = "") => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		try {
			// Call API route for conversation list
			const params = new URLSearchParams({
				experienceId: experienceId, // Use the prop instead of user.experienceId
				status: filters.status || "all",
				sortBy: filters.sortBy || "newest",
				search: searchQuery || "",
				page: page.toString(),
				limit: "20",
			});

			const response = await apiGet(`/api/livechat/conversations?${params}`, experienceId, {
				'x-on-behalf-of': user.whopUserId,
				'x-company-id': user.experience.whopCompanyId
			});
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || "Failed to load conversations");
			}

			if (reset) {
				setConversations(result.data?.conversations || result.conversations || []);
			} else {
				setConversations(prev => [...prev, ...(result.data?.conversations || result.conversations || [])]);
			}

			setTotalConversations(result.data?.total || result.total || 0);
			setHasMore(result.data?.hasMore || result.hasMore || false);
			setCurrentPage(page);
		} catch (err) {
			console.error("Error loading conversations:", err);
			setError("Failed to load conversations");
		} finally {
			setIsLoading(false);
		}
	}, [user, experienceId, filters.status, filters.sortBy]);

	// Load conversation details (optimized - messages included)
	const loadConversationDetailsCallback = useCallback(async (conversationId: string) => {
		if (!user) return;

		try {
			console.log(`[LIVECHAT] Loading conversation details for: ${conversationId}`);
			// Call API route for conversation details (includes messages)
			const response = await apiGet(`/api/livechat/conversations/${conversationId}?experienceId=${encodeURIComponent(experienceId)}`, experienceId, {
				'x-on-behalf-of': user.whopUserId,
				'x-company-id': user.experience.whopCompanyId
			});
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || "Failed to load conversation details");
			}

			const conversation = result.data?.conversation || result.conversation;
			console.log(`[LIVECHAT] Loaded conversation details - stage: ${conversation?.currentStage}, messages: ${conversation?.messages?.length || 0}`);
			
			// Update conversation in list (messages are already included)
			setConversations(prev => 
				prev.map(conv => 
					conv.id === conversationId ? conversation : conv
				)
			);
			
			console.log("LiveChat: Loaded conversation details with messages:", conversation.messages?.length || 0);
		} catch (err) {
			console.error("Error loading conversation details:", err);
			setError("Failed to load conversation details");
		}
	}, [user, experienceId]);

	// Optimized backend auto-closing behavior with throttling
	useEffect(() => {
		const updateConversations = () => {
			const now = performance.now();
			// Throttle updates to prevent excessive re-renders
			if (now - lastUpdateRef.current < 5000) {
				// 5 second throttle
				return;
			}
			lastUpdateRef.current = now;

			setConversations((prevConversations) => {
				const updatedConversations = simulateAutoClose(prevConversations);
				// Only update if there were changes - use shallow comparison instead of JSON.stringify
				const hasChanges = updatedConversations.some(
					(conv, index) =>
						conv.status !== prevConversations[index]?.status ||
						conv.updatedAt !== prevConversations[index]?.updatedAt,
				);

				return hasChanges ? updatedConversations : prevConversations;
			});
		};

		// Reduced frequency from 60s to 2 minutes for better performance
		intervalRef.current = setInterval(updateConversations, 120000); // Check every 2 minutes

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, []);

	const handleSelectConversation = useCallback((conversationId: string) => {
		console.log(`[LIVECHAT] Selecting conversation: ${conversationId}`);
		setSelectedConversationId(conversationId);
		// Load fresh conversation details when selecting (only if different conversation)
		if (conversationId !== selectedConversationId) {
			loadConversationDetailsCallback(conversationId);
		}
	}, [loadConversationDetailsCallback, selectedConversationId]);

	const handleSendMessage = useCallback(
		async (message: string) => {
			if (!selectedConversationId || !user) return;

			try {
				// Send message via WebSocket
				await sendWebSocketMessage(message, "bot");

				// Also send via API for persistence
				const response = await apiPost(`/api/livechat/conversations/${selectedConversationId}`, {
					action: 'send_message',
					message,
					messageType: 'bot',
					experienceId: user.experienceId,
				}, user.experienceId);

				const result = await response.json();

				if (result.success && result.message) {
					// Update conversation with new message
					setConversations(prev => 
						prev.map(conv => 
							conv.id === selectedConversationId
								? {
									...conv,
									messages: [...conv.messages, {
										id: result.message!.id,
										conversationId: result.message!.conversationId,
										type: result.message!.type as "user" | "bot" | "system",
										text: result.message!.content,
									timestamp: result.message!.createdAt,
									isRead: true,
									metadata: result.message!.metadata,
								}],
								lastMessage: message,
								lastMessageAt: result.message!.createdAt,
								messageCount: conv.messageCount + 1,
								updatedAt: new Date().toISOString(),
								}
								: conv
						)
					);
				} else {
					setError(result.error || "Failed to send message");
				}
			} catch (err) {
				console.error("Error sending message:", err);
				setError("Failed to send message");
			}
		},
		[selectedConversationId, user, sendWebSocketMessage],
	);

	// Memoized handlers for better performance
	const handleSearchReset = useCallback(() => {
		setSearchQuery("");
	}, []);

	const handleSearchStateChange = useCallback((isOpen: boolean) => {
		setIsSearchOpen(isOpen);
	}, []);

	const handleFiltersChange = useCallback((newFilters: LiveChatFilters) => {
		setFilters(newFilters);
	}, []);

	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	// Load conversations on mount and when filters change
	useEffect(() => {
		loadConversations(1, true, debouncedSearchQuery);
	}, [user, filters.status, filters.sortBy, loadConversations]);

	// Handle search with debouncing
	useEffect(() => {
		loadConversations(1, true, debouncedSearchQuery);
	}, [debouncedSearchQuery, loadConversations]);

	// Load conversation details when selected
	useEffect(() => {
		if (selectedConversationId) {
			loadConversationDetailsCallback(selectedConversationId);
		}
	}, [selectedConversationId, loadConversationDetailsCallback]);

	// Show loading state
	if (loading) {
		return (
			<div className="flex justify-center items-center h-screen px-8 bg-gray-900">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">Loading LiveChat...</h1>
					<p className="text-gray-300">
						Please wait while we prepare your live chat experience.
					</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (authError || !user) {
		return (
			<div className="flex justify-center items-center h-screen px-8 bg-gray-900">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-white mb-4">Error</h1>
					<p className="text-gray-300 mb-4">{authError || "Failed to load user context"}</p>
					<Button onClick={onBack} variant="ghost">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Go Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`relative h-full w-full ${selectedConversation ? "lg:p-4 lg:pb-8" : "p-4 sm:p-6 lg:p-8"} pb-20 lg:pb-8`}
		>
			{/* Connection Status Indicator */}
			{!isConnected && (
				<div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-md flex items-center gap-2">
					<AlertCircle className="w-4 h-4" />
					<span className="text-sm">Reconnecting...</span>
					<button
						onClick={reconnect}
						className="text-xs underline hover:no-underline"
					>
						Retry
					</button>
				</div>
			)}

			{/* Error Display */}
			{error && (
				<div className="fixed top-4 left-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md flex items-center justify-between">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4" />
						<span className="text-sm">{error}</span>
					</div>
					<button
						onClick={() => setError(null)}
						className="text-xs underline hover:no-underline"
					>
						Dismiss
					</button>
				</div>
			)}
			<div className="h-full w-full">
				{/* Enhanced Header with Whop Design Patterns - Hidden on mobile when in chat */}
				<div
					className={`${selectedConversation ? "hidden lg:block" : "block"}`}
				>
					<LiveChatHeader
						onBack={onBack}
						filters={filters}
						searchQuery={searchQuery}
						onFiltersChange={handleFiltersChange}
						onSearchChange={handleSearchChange}
						onSearchStateChange={handleSearchStateChange}
					/>
				</div>

				{/* Main Content Area */}
				<div
					className={`flex-grow flex flex-col md:overflow-hidden ${selectedConversation ? "lg:gap-6 lg:mt-8" : "gap-6 mt-8"}`}
				>
					{/* Mobile: Show conversation list or chat view */}
					<div
						className={`lg:hidden ${selectedConversation ? "fixed inset-0 top-0 left-0 right-0 bottom-0 z-40" : "h-[calc(100vh-300px)]"} min-h-[400px] overflow-hidden`}
					>
						{selectedConversation ? (
							<div className="h-full animate-in fade-in duration-0">
								<LiveChatView
									conversation={selectedConversation}
									onSendMessage={handleSendMessage}
									onBack={() => setSelectedConversationId(null)}
								/>
							</div>
						) : (
							<div className="h-full animate-in fade-in duration-0">
								<ConversationList
									conversations={conversations}
									selectedConversationId={selectedConversationId || undefined}
									onSelectConversation={handleSelectConversation}
									filters={{ ...filters, searchQuery: debouncedSearchQuery }}
									onFiltersChange={handleFiltersChange}
									onSearchReset={handleSearchReset}
									isLoading={isLoading}
									hasMore={hasMore}
									onLoadMore={() => loadConversations(currentPage + 1, false, debouncedSearchQuery)}
								/>
							</div>
						)}
					</div>

					{/* Desktop: Show both side by side */}
					<div className="hidden lg:grid lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-[500px] max-h-[calc(100vh-200px)]">
						{/* Conversation List */}
						<div className="lg:col-span-1 overflow-hidden">
							<ConversationList
								conversations={conversations}
								selectedConversationId={selectedConversationId || undefined}
								onSelectConversation={handleSelectConversation}
								filters={{ ...filters, searchQuery: debouncedSearchQuery }}
								onFiltersChange={handleFiltersChange}
								onSearchReset={handleSearchReset}
								isLoading={isLoading}
								hasMore={hasMore}
								onLoadMore={() => loadConversations(currentPage + 1, false)}
							/>
						</div>

						{/* Chat View */}
						<div className="lg:col-span-3 overflow-hidden h-full">
							{selectedConversation ? (
								<div className="h-full animate-in fade-in duration-0">
									<LiveChatView
										conversation={selectedConversation}
										onSendMessage={handleSendMessage}
										onBack={() => setSelectedConversationId(null)}
										isLoading={isLoading}
									/>
								</div>
							) : (
								<div className="h-full flex items-center justify-center">
									<div className="text-center">
										<div className="p-6 rounded-full bg-gray-100 dark:bg-gray-800 w-20 h-20 mb-6 flex items-center justify-center mx-auto">
											<MessageCircle size={32} className="text-gray-400" />
										</div>
										<Text
											size="3"
											weight="medium"
											className="text-foreground mb-2"
										>
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

LiveChatPage.displayName = "LiveChatPage";

export default LiveChatPage;
