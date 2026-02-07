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
	LiveChatMessage,
} from "../../types/liveChat";
import { get as getConversationMessageCache, set as setConversationMessageCache } from "@/lib/cache/conversation-message-cache";
import { ThemeToggle } from "../common/ThemeToggle";
import ConversationList from "./ConversationList";
import LiveChatHeader from "./LiveChatHeader";
import LiveChatView from "./LiveChatView";
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

const FAILED_SEND_AGE_MS = 15000;

/** Merge server conversation messages into existing detail; never replace the full list. Marks old unmatched optimistic messages as failedToSend. */
function mergeServerMessagesIntoPrev(
	prev: LiveChatConversation,
	serverConv: LiveChatConversation & { messages?: unknown[] },
	conversationId: string
): LiveChatConversation {
	const rawServer = Array.isArray(serverConv.messages) ? serverConv.messages : [];
	const serverMessages: LiveChatMessage[] = rawServer.map((m: LiveChatMessage & { content?: string }) => ({
		id: m.id,
		conversationId: m.conversationId ?? conversationId,
		type: m.type,
		text: m.text ?? (m as { content?: string }).content ?? "",
		timestamp: m.timestamp,
		isRead: m.isRead ?? false,
		metadata: m.metadata,
	}));
	const prevMessages = prev.messages ?? [];
	const existingIds = new Set(prevMessages.map((m) => m.id));
	const newFromServer = serverMessages.filter((s) => !existingIds.has(s.id));
	const isOptimistic = (m: LiveChatMessage) => m.metadata?.isOptimistic === true;
	const sameText = (a: string, b: string) => (a || "").trim() === (b || "").trim();
	const within60s = (t1: string, t2: string) => Math.abs(new Date(t1).getTime() - new Date(t2).getTime()) <= 60000;
	const withoutDupedOptimistic = prevMessages.filter((local) => {
		if (!isOptimistic(local)) return true;
		const matched = serverMessages.some(
			(s) =>
				s.type === local.type &&
				sameText(s.text, local.text) &&
				within60s(s.timestamp, local.timestamp)
		);
		return !matched;
	});
	const withFailedMark = withoutDupedOptimistic.map((local) => {
		if (!isOptimistic(local)) return local;
		const addedAt = local.metadata?.optimisticAddedAt ?? new Date(local.timestamp).getTime();
		if (Date.now() - addedAt <= FAILED_SEND_AGE_MS) return local;
		return { ...local, metadata: { ...local.metadata, failedToSend: true } };
	});
	const serverById = new Map(serverMessages.map((m) => [m.id, m]));
	const withUpdatedReadStatus = withFailedMark.map((local) => {
		const serverMsg = serverById.get(local.id);
		if (serverMsg != null) return { ...local, isRead: serverMsg.isRead };
		return local;
	});
	const mergedIds = new Set(withUpdatedReadStatus.map((m) => m.id));
	const reallyNew = newFromServer.filter((s) => !mergedIds.has(s.id));
	const merged = [...withUpdatedReadStatus, ...reallyNew].sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	);
	return {
		...prev,
		messages: merged,
		lastMessage: serverConv.lastMessage ?? prev.lastMessage,
		lastMessageAt: serverConv.lastMessageAt ?? prev.lastMessageAt,
		messageCount: serverConv.messageCount ?? merged.length,
		updatedAt: serverConv.updatedAt ?? prev.updatedAt,
		adminAvatar: serverConv.adminAvatar ?? prev.adminAvatar,
		controlledBy: serverConv.controlledBy ?? prev.controlledBy,
	};
}

const LiveChatPage: React.FC<LiveChatPageProps> = React.memo(({ onBack, experienceId, user }) => {
	// User is now passed as prop (same pattern as ResourceLibrary)
	const [loading, setLoading] = useState(false);
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
	const [merchantIconUrl, setMerchantIconUrl] = useState<string | null>(null);
	const [adminAvatarUrl, setAdminAvatarUrl] = useState<string | null>(null);
	// Selected conversation detail: loaded once on select, then only merged (detail poll, send, resolve, typing)
	const [selectedConversationDetail, setSelectedConversationDetail] = useState<LiveChatConversation | null>(null);

	// Performance optimizations
	const debouncedSearchQuery = useDebounce(searchQuery, 300);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const lastUpdateRef = useRef<number>(0);
	// Stable order: set on initial load and when user changes sort; list poll merges by id and preserves this order.
	const conversationOrderIdsRef = useRef<string[]>([]);
	const selectedConversationIdRef = useRef<string | null>(null);
	selectedConversationIdRef.current = selectedConversationId;

	// User is passed as prop - no need to fetch (same pattern as ResourceLibrary)
	useEffect(() => {
		if (!user) {
			setAuthError("User not available");
		}
	}, [user]);

	// Fetch merchant (company) logo from origin template for bot avatar in chat
	useEffect(() => {
		if (!experienceId || !user) return;
		let cancelled = false;
		(async () => {
			try {
				const response = await apiGet(`/api/origin-templates/${experienceId}`, experienceId);
				const data = await response.json();
				if (!cancelled && data?.originTemplate?.companyLogoUrl) {
					setMerchantIconUrl(data.originTemplate.companyLogoUrl);
				} else if (!cancelled) {
					setMerchantIconUrl(null);
				}
			} catch {
				if (!cancelled) setMerchantIconUrl(null);
			}
		})();
		return () => { cancelled = true; };
	}, [experienceId, user]);

	// Fetch admin avatar from users table (same source as user avatar: admin for this experience)
	useEffect(() => {
		if (!experienceId || !user) return;
		let cancelled = false;
		(async () => {
			try {
				const response = await apiGet(`/api/experience/${experienceId}/admin-avatar`, experienceId);
				const data = await response.json();
				if (!cancelled && data?.success && data?.data?.avatar != null) {
					setAdminAvatarUrl(data.data.avatar);
				} else if (!cancelled) {
					setAdminAvatarUrl(null);
				}
			} catch {
				if (!cancelled) setAdminAvatarUrl(null);
			}
		})();
		return () => { cancelled = true; };
	}, [experienceId, user]);

	// Polling state for new messages
	const lastConversationUpdateRef = useRef<Map<string, number>>(new Map());
	// Latest typing from typing poll (used when list poll merges so we don't lose typing to batching)
	const lastTypingRef = useRef<{ conversationId: string; typing: { user?: boolean; admin?: boolean } } | null>(null);

	// List poll: merge by id, preserve stable order (no re-sort). Use same status filter as current view so we don't merge in Open/Auto-mismatched cards.
	useEffect(() => {
		if (!user || !experienceId) return;

		const statusParam = filters.status ?? "open";

		const pollForUpdates = async () => {
			try {
				const params = new URLSearchParams({
					experienceId,
					status: statusParam,
					page: "1",
					limit: "50",
				});
				const response = await apiGet(`/api/livechat/conversations?${params.toString()}`, experienceId);
				if (!response.ok) return;
				const result = await response.json();
				if (!result.success || !result.data?.conversations) return;

				const serverConversations = result.data.conversations as LiveChatConversation[];
				serverConversations.forEach((serverConv) => {
					const lastUpdate = lastConversationUpdateRef.current.get(serverConv.id) ?? 0;
					const serverUpdate = new Date(serverConv.updatedAt).getTime();
					if (serverUpdate > lastUpdate) {
						lastConversationUpdateRef.current.set(serverConv.id, serverUpdate);
					}
				});

				const selectedId = selectedConversationIdRef.current;
				const serverMap = new Map(serverConversations.map((c) => [c.id, c]));

				setConversations((prev) => {
					const orderIds = conversationOrderIdsRef.current.length > 0
						? conversationOrderIdsRef.current
						: prev.map((c) => c.id);
					const merged: LiveChatConversation[] = [];
					const usedIds = new Set<string>();

					for (const id of orderIds) {
						const serverConv = serverMap.get(id);
						if (!serverConv) continue;
						usedIds.add(id);
						const existingConv = prev.find((c) => c.id === id);
						const isSelected = id === selectedId;
						const fromRef = lastTypingRef.current?.conversationId === id ? lastTypingRef.current?.typing : undefined;
						const typing = isSelected ? (existingConv?.typing ?? fromRef ?? serverConv.typing) : (serverConv.typing ?? existingConv?.typing);
						const messages = isSelected && existingConv?.messages?.length != null ? existingConv.messages : (serverConv.messages ?? []);
						merged.push({ ...serverConv, messages, typing });
					}

					for (const serverConv of serverConversations) {
						if (usedIds.has(serverConv.id)) continue;
						merged.push(serverConv);
						conversationOrderIdsRef.current = [...conversationOrderIdsRef.current, serverConv.id];
					}

					return merged;
				});
			} catch (error) {
				console.error("[LiveChat] List poll error:", error);
			}
		};

		const pollInterval = setInterval(pollForUpdates, 2000);
		return () => clearInterval(pollInterval);
	}, [user, experienceId, filters.status]);

	// Detail poll: merge into selectedConversationDetail only (load was already done once on select).
	useEffect(() => {
		if (!selectedConversationId || !user?.experienceId) return;

		const pollDetail = async () => {
			try {
				const response = await apiGet(
					`/api/livechat/conversations/${selectedConversationId}?experienceId=${encodeURIComponent(experienceId)}`,
					experienceId,
					{ "x-on-behalf-of": user.whopUserId, "x-company-id": user.experience.whopCompanyId }
				);
				if (!response.ok) return;
				const result = await response.json();
				if (!result.success) return;
				const serverConv = result.data?.conversation ?? result.conversation;
				if (!serverConv?.id) return;

				setSelectedConversationDetail((prev) => {
					if (!prev || prev.id !== selectedConversationId) return prev;
					return mergeServerMessagesIntoPrev(prev, serverConv as LiveChatConversation & { messages?: unknown[] }, selectedConversationId);
				});

				// Sync card in list for sidebar. Preserve unread counts so detail poll never overwrites them (avoids wrong 0 when switching cards).
				setConversations((prev) =>
					prev.map((c) =>
						c.id === selectedConversationId
							? {
									...c,
									lastMessage: serverConv.lastMessage ?? c.lastMessage,
									lastMessageAt: serverConv.lastMessageAt ?? c.lastMessageAt,
									messageCount: serverConv.messageCount ?? c.messageCount,
									updatedAt: serverConv.updatedAt ?? c.updatedAt,
									unreadCountUser: c.unreadCountUser,
									unreadCountAdmin: c.unreadCountAdmin,
								}
							: c
					)
				);
			} catch (error) {
				console.error("[LiveChat] Detail poll error:", error);
			}
		};

		pollDetail();
		const interval = setInterval(pollDetail, 2000);
		return () => clearInterval(interval);
	}, [selectedConversationId, user, experienceId]);

	// Poll typing for selected conversation: merge into selectedConversationDetail (and list card).
	useEffect(() => {
		if (!selectedConversationId || !user?.experienceId) return;
		const pollTyping = async () => {
			try {
				const response = await apiGet(
					`/api/livechat/conversations/${selectedConversationId}/typing`,
					experienceId,
					{ 'x-on-behalf-of': user.whopUserId, 'x-company-id': user.experience.whopCompanyId }
				);
				const result = response.ok ? await response.json().catch(() => null) : null;
				const data = result?.data ?? result;
				const userTyping = !!(data && data.user === true);
				const adminTyping = !!(data && data.admin === true);
				const typing = { user: userTyping, admin: adminTyping };
				lastTypingRef.current = { conversationId: selectedConversationId, typing };
				setSelectedConversationDetail((prev) => (prev && prev.id === selectedConversationId ? { ...prev, typing } : prev));
				setConversations((prev) =>
					prev.map((c) => (c.id === selectedConversationId ? { ...c, typing } : c))
				);
			} catch (e) {
				console.log(`⌨️ [LiveChat] Typing poll error:`, e);
			}
		};
		pollTyping();
		const interval = setInterval(pollTyping, 2000);
		return () => clearInterval(interval);
	}, [selectedConversationId, user, experienceId]);

	// View uses selectedConversationDetail (loaded once, then only merged); fallback to list for loading state.
	const selectedConversation = useMemo(() => {
		if (selectedConversationId && selectedConversationDetail?.id === selectedConversationId) {
			return selectedConversationDetail;
		}
		return conversations?.find((c) => c.id === selectedConversationId) || null;
	}, [selectedConversationId, selectedConversationDetail, conversations]);

	const handleDeselectConversation = useCallback(() => {
		setSelectedConversationId(null);
		setSelectedConversationDetail(null);
	}, []);

	// Sort helper: order only on page load / sort change
	const sortConversationsByFilter = useCallback((list: LiveChatConversation[], sortBy: "newest" | "oldest") => {
		return [...list].sort((a, b) => {
			const timeA = new Date(a.lastMessageAt ?? 0).getTime();
			const timeB = new Date(b.lastMessageAt ?? 0).getTime();
			return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
		});
	}, []);

	// One card per user (per experience): group conversations by whopUserId; each card shows user and primary conversation
	const userGroupedConversations = useMemo((): LiveChatConversation[] => {
		if (!conversations.length) return [];
		const byUser = new Map<string, LiveChatConversation[]>();
		for (const c of conversations) {
			const key = c.whopUserId ?? c.userId ?? c.id;
			if (!byUser.has(key)) byUser.set(key, []);
			byUser.get(key)!.push(c);
		}
		const result: LiveChatConversation[] = [];
		for (const [, convs] of byUser) {
			const primary = convs.find((c) => c.status === "open") ?? convs.sort((a, b) =>
				new Date(b.lastMessageAt ?? b.updatedAt ?? 0).getTime() - new Date(a.lastMessageAt ?? a.updatedAt ?? 0).getTime()
			)[0];
			if (!primary) continue;
			const lastMessageAt = convs.reduce((best, c) => {
				const t = new Date(c.lastMessageAt ?? c.updatedAt ?? 0).getTime();
				return t > best ? t : best;
			}, 0);
			const lastMessageConv = convs.find((c) => new Date(c.lastMessageAt ?? c.updatedAt ?? 0).getTime() === lastMessageAt) ?? primary;
			result.push({
				...primary,
				id: primary.id,
				lastMessage: lastMessageConv.lastMessage ?? primary.lastMessage,
				lastMessageAt: new Date(lastMessageAt).toISOString(),
				messageCount: convs.reduce((s, c) => s + (c.messageCount ?? 0), 0),
				unreadCountAdmin: convs.reduce((s, c) => s + (c.unreadCountAdmin ?? 0), 0),
				conversationCount: convs.length,
				conversationIds: convs.map((c) => c.id),
			});
		}
		return sortConversationsByFilter(result, filters.sortBy === "oldest" ? "oldest" : "newest");
	}, [conversations, filters.sortBy, sortConversationsByFilter]);

	// Load conversations from database (statusOverride used when refetching after filter change so request uses new filter)
	const loadConversations = useCallback(async (page = 1, reset = false, statusOverride?: "open" | "auto") => {
		if (!user) return;

		setIsLoading(true);
		setError(null);

		const statusParam = statusOverride ?? filters.status ?? "open";
		try {
			const params = new URLSearchParams({
				experienceId: experienceId,
				status: statusParam,
				page: page.toString(),
				limit: "50",
			});

			const response = await apiGet(`/api/livechat/conversations?${params}`, experienceId, {
				'x-on-behalf-of': user.whopUserId,
				'x-company-id': user.experience.whopCompanyId
			});
			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || "Failed to load conversations");
			}

			const raw = result.data?.conversations || result.conversations || [];
			if (reset) {
				const sortBy = filters.sortBy === "oldest" ? "oldest" : "newest";
				const sorted = sortConversationsByFilter(raw, sortBy);
				conversationOrderIdsRef.current = sorted.map((c) => c.id);
				setConversations(sorted);
			} else {
				setConversations((prev) => {
					const appended = [...prev, ...raw];
					conversationOrderIdsRef.current = appended.map((c) => c.id);
					return appended;
				});
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
	}, [user, experienceId, filters.status, filters.sortBy, sortConversationsByFilter]);

	// Load conversation details once on select; when user has multiple conversations, fetch all and show aggregated timeline.
	const loadConversationDetailsCallback = useCallback(async (primaryConversationId: string, allConversationIdsForUser?: string[]) => {
		if (!user) return;

		const idsToLoad = (allConversationIdsForUser?.length ? allConversationIdsForUser : [primaryConversationId]).filter(Boolean);
		const isAggregated = idsToLoad.length > 1;

		try {
			if (!isAggregated) {
				// Single conversation: restore from cache for instant display when returning
				const cached = getConversationMessageCache(experienceId, primaryConversationId);
				const hadCacheHit = !!(cached?.messages?.length);
				if (hadCacheHit) {
					const listCard = conversations.find((c) => c.id === primaryConversationId);
					const cachedDetail: LiveChatConversation = {
						id: primaryConversationId,
						userId: listCard?.userId ?? "",
						user: listCard?.user ?? { id: "", name: "", isOnline: false },
						funnelId: listCard?.funnelId ?? "",
						funnelName: listCard?.funnelName ?? "",
						status: listCard?.status ?? "open",
						startedAt: listCard?.startedAt ?? new Date().toISOString(),
						lastMessageAt: listCard?.lastMessageAt ?? cached.updatedAt ?? new Date().toISOString(),
						lastMessage: listCard?.lastMessage ?? "",
						messageCount: cached.messages.length,
						messages: cached.messages.map((m) => ({
							id: m.id,
							conversationId: primaryConversationId,
							type: (m.type === "admin" ? "admin" : m.type) as "user" | "bot" | "system" | "admin",
							text: m.text ?? m.content ?? "",
							timestamp: typeof m.timestamp === "string" ? m.timestamp : (m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString()),
							isRead: false,
							metadata: m.metadata as LiveChatMessage["metadata"],
						})),
						createdAt: listCard?.createdAt ?? new Date().toISOString(),
						updatedAt: cached.updatedAt ?? new Date().toISOString(),
						currentStage: cached.meta?.currentStage,
						adminAvatar: cached.adminAvatar,
						controlledBy: cached.controlledBy ?? listCard?.controlledBy ?? "bot",
					};
					setSelectedConversationDetail(cachedDetail);
				}

				const response = await apiGet(`/api/livechat/conversations/${primaryConversationId}?experienceId=${encodeURIComponent(experienceId)}`, experienceId, {
					'x-on-behalf-of': user.whopUserId,
					'x-company-id': user.experience.whopCompanyId
				});
				const result = await response.json();
				if (!result.success) throw new Error(result.error || "Failed to load conversation details");
				const conversation = result.data?.conversation || result.conversation;

				if (hadCacheHit) {
					setSelectedConversationDetail((prev) =>
						prev && prev.id === primaryConversationId
							? mergeServerMessagesIntoPrev(prev, conversation as LiveChatConversation & { messages?: unknown[] }, primaryConversationId)
							: prev
					);
				} else {
					setSelectedConversationDetail(conversation);
				}
				setConversations((prev) =>
					prev.map((conv) =>
						conv.id === primaryConversationId
							? { ...conv, lastMessage: conversation.lastMessage, lastMessageAt: conversation.lastMessageAt, messageCount: conversation.messageCount ?? conv.messageCount, updatedAt: conversation.updatedAt ?? conv.updatedAt, unreadCountUser: conv.unreadCountUser, unreadCountAdmin: conv.unreadCountAdmin }
							: conv
					)
				);
				if (conversation?.messages?.length) {
					setConversationMessageCache(experienceId, primaryConversationId, {
						messages: conversation.messages.map((m: LiveChatMessage) => ({ id: m.id, type: m.type as "user" | "bot" | "system" | "admin", text: m.text, content: m.text, metadata: m.metadata, timestamp: m.timestamp, createdAt: m.timestamp })),
						updatedAt: conversation.updatedAt ?? new Date().toISOString(),
						adminAvatar: conversation.adminAvatar,
						controlledBy: conversation.controlledBy,
						meta: { currentStage: conversation.currentStage },
					});
				}
				return;
			}

			// Aggregated: fetch all conversations for this user, merge messages, sort by time
			const listCard = conversations.find((c) => c.id === primaryConversationId);
			const responses = await Promise.all(
				idsToLoad.map((id) =>
					apiGet(`/api/livechat/conversations/${id}?experienceId=${encodeURIComponent(experienceId)}`, experienceId, {
						'x-on-behalf-of': user.whopUserId,
						'x-company-id': user.experience.whopCompanyId
					}).then((r) => r.json())
				)
			);

			const allMessages: LiveChatMessage[] = [];
			let primaryConv: LiveChatConversation | null = null;

			for (let i = 0; i < idsToLoad.length; i++) {
				const res = responses[i];
				const conv = res?.data?.conversation ?? res?.conversation;
				if (!res?.success || !conv) continue;
				if (conv.id === primaryConversationId) primaryConv = conv;
				const msgs = Array.isArray(conv.messages) ? conv.messages : [];
				for (const m of msgs) {
					const ts = m.timestamp ?? m.createdAt ?? new Date().toISOString();
					allMessages.push({
						id: m.id,
						conversationId: conv.id,
						type: (m.type === "admin" ? "admin" : m.type) as "user" | "bot" | "system" | "admin",
						text: m.text ?? m.content ?? "",
						timestamp: typeof ts === "string" ? ts : new Date(ts).toISOString(),
						isRead: m.isRead ?? false,
						metadata: { ...(m.metadata || {}), _conversationId: conv.id, _funnelName: conv.funnelName },
					});
				}
			}

			allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
			const seen = new Set<string>();
			const deduped = allMessages.filter((m) => {
				if (seen.has(m.id)) return false;
				seen.add(m.id);
				return true;
			});

			const primary = primaryConv ?? (responses.find((r) => r?.data?.conversation ?? r?.conversation) as { data?: { conversation: LiveChatConversation }; conversation?: LiveChatConversation })?.data?.conversation ?? (responses[0] as { data?: { conversation: LiveChatConversation }; conversation?: LiveChatConversation })?.conversation;
			if (!primary) {
				setError("Failed to load conversation details");
				return;
			}

			const synthetic: LiveChatConversation = {
				...primary,
				id: primaryConversationId,
				messages: deduped,
				messageCount: deduped.length,
				lastMessage: deduped.length ? deduped[deduped.length - 1].text : primary.lastMessage ?? "",
				lastMessageAt: deduped.length ? deduped[deduped.length - 1].timestamp : primary.lastMessageAt ?? primary.updatedAt ?? "",
			};
			setSelectedConversationDetail(synthetic);

			// Cache each conversation's messages individually
			for (let i = 0; i < idsToLoad.length; i++) {
				const conv = (responses[i]?.data?.conversation ?? responses[i]?.conversation) as LiveChatConversation | undefined;
				if (conv?.messages?.length) {
					setConversationMessageCache(experienceId, idsToLoad[i], {
						messages: conv.messages.map((m: LiveChatMessage) => ({ id: m.id, type: m.type, text: m.text, content: m.text, metadata: m.metadata, timestamp: m.timestamp, createdAt: m.timestamp })),
						updatedAt: conv.updatedAt ?? new Date().toISOString(),
						adminAvatar: conv.adminAvatar,
						controlledBy: conv.controlledBy,
						meta: { currentStage: conv.currentStage },
					});
				}
			}
		} catch (err) {
			console.error("Error loading conversation details:", err);
			setError("Failed to load conversation details");
		}
	}, [user, experienceId, conversations]);

	const loadConversationDetailsRef = useRef(loadConversationDetailsCallback);
	loadConversationDetailsRef.current = loadConversationDetailsCallback;

	// Persist selected conversation messages to cache when they change; debounce to avoid write on every poll tick
	const cacheWriteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (!experienceId || !selectedConversationId || !selectedConversationDetail?.messages?.length) return;
		const conv = selectedConversationDetail;
		if (cacheWriteTimeoutRef.current) clearTimeout(cacheWriteTimeoutRef.current);
		cacheWriteTimeoutRef.current = setTimeout(() => {
			cacheWriteTimeoutRef.current = null;
			setConversationMessageCache(experienceId, selectedConversationId, {
				messages: conv.messages.map((m) => ({
					id: m.id,
					type: m.type as "user" | "bot" | "system" | "admin",
					text: m.text,
					content: m.text,
					metadata: m.metadata,
					timestamp: m.timestamp,
					createdAt: m.timestamp,
				})),
				updatedAt: conv.updatedAt ?? new Date().toISOString(),
				adminAvatar: conv.adminAvatar,
				controlledBy: conv.controlledBy,
				meta: conv.currentStage ? { currentStage: conv.currentStage } : undefined,
			});
		}, 1500);
		return () => {
			if (cacheWriteTimeoutRef.current) clearTimeout(cacheWriteTimeoutRef.current);
		};
	}, [experienceId, selectedConversationId, selectedConversationDetail?.messages, selectedConversationDetail?.updatedAt, selectedConversationDetail?.controlledBy]);

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
		setSelectedConversationDetail(null);
		setSelectedConversationId(conversationId);
		// useEffect will load details once for the new selection
	}, []);

	const handleMarkAsRead = useCallback(
		async (conversationId: string) => {
			if (!user?.experienceId) return;
			try {
				await apiPost(
					`/api/livechat/conversations/${conversationId}/read`,
					{ side: "admin" },
					user.experienceId
				);
			} catch (e) {
				console.warn("Mark conversation read failed:", e);
			}
		},
		[user?.experienceId]
	);

	const handleResolve = useCallback(
		async (conversationId: string) => {
			if (!user?.experienceId) return;
			try {
				const res = await apiPost(
					`/api/livechat/conversations/${conversationId}`,
					{ action: "resolve" },
					user.experienceId
				);
				if (res.ok) {
					const merge = { controlledBy: "bot" as const, unreadCountAdmin: 0 };
					setSelectedConversationDetail((prev) => (prev && prev.id === conversationId ? { ...prev, ...merge } : prev));
					setConversations((prev) =>
						prev.map((c) => (c.id === conversationId ? { ...c, ...merge } : c))
					);
					// Conversation is now bot-controlled; switch view to Auto
					setFilters((f) => ({ ...f, status: "auto" as const }));
					loadConversations(1, true, "auto");
				}
			} catch (e) {
				console.warn("Resolve conversation failed:", e);
			}
		},
		[user?.experienceId, loadConversations]
	);

	const handleTypingChange = useCallback(
		async (conversationId: string, active: boolean) => {
			if (!user?.experienceId) return;
			try {
				await apiPost(
					`/api/livechat/conversations/${conversationId}/typing`,
					{ side: "admin", active },
					user.experienceId
				);
			} catch (e) {
				// ignore
			}
		},
		[user?.experienceId]
	);

	const handleSendMessage = useCallback(
		async (message: string) => {
			if (!selectedConversationId || !user) return;

			// IMMEDIATE UI UPDATE: Add message to conversation immediately (optimistic)
			const now = Date.now();
			const messageId = `msg-${now}-${Math.random().toString(36).substr(2, 9)}`;
			const tempMessage: LiveChatMessage = {
				id: messageId,
				conversationId: selectedConversationId,
				type: "admin" as const,
				text: message,
				timestamp: new Date(now).toISOString(),
				isRead: false,
				metadata: {
					funnelStage: "LIVECHAT",
					isOptimistic: true,
					optimisticAddedAt: now,
					userId: user.id,
				},
			};

			const optimisticUpdate = {
				messages: [] as LiveChatMessage[],
				lastMessage: message,
				lastMessageAt: new Date().toISOString(),
				messageCount: 0,
				updatedAt: new Date().toISOString(),
			};
			setSelectedConversationDetail((prev) => {
				if (!prev || prev.id !== selectedConversationId) return prev;
				const nextMessages = [...(prev.messages ?? []), tempMessage];
				optimisticUpdate.messages = nextMessages;
				optimisticUpdate.messageCount = (prev.messageCount ?? 0) + 1;
				return { ...prev, ...optimisticUpdate };
			});
			setConversations((prev) =>
				prev.map((conv) =>
					conv.id === selectedConversationId
						? { ...conv, messages: [...(conv.messages ?? []), tempMessage], lastMessage: message, lastMessageAt: optimisticUpdate.lastMessageAt, messageCount: (conv.messageCount || 0) + 1, updatedAt: optimisticUpdate.updatedAt }
						: conv
				)
			);

			try {
				console.log("LiveChat: Sending message via API (server broadcasts via WebSocket):", {
					message,
					selectedConversationId,
					experienceId: user.experienceId,
				});

				// Send message via API - server handles DB save + WebSocket broadcast
				const response = await apiPost(`/api/livechat/conversations/${selectedConversationId}`, {
					action: 'send_message',
					message,
					messageType: 'bot',
					experienceId: user.experienceId,
				}, user.experienceId);

				console.log("LiveChat: API response status:", response.status);

				if (!response.ok) {
					console.error("LiveChat: API request failed with status:", response.status);
					const errorText = await response.text();
					console.error("LiveChat: API error response:", errorText);
					setError(`API request failed: ${response.status} ${response.statusText}`);
					setSelectedConversationDetail((prev) =>
						prev && prev.id === selectedConversationId
							? {
									...prev,
									messages: (prev.messages ?? []).map((msg) =>
										msg.id === messageId ? { ...msg, metadata: { ...msg.metadata, failedToSend: true } } : msg
									),
								}
							: prev
					);
					setConversations((prev) =>
						prev.map((conv) =>
							conv.id === selectedConversationId
								? {
										...conv,
										messages: (conv.messages ?? []).map((msg) =>
											msg.id === messageId ? { ...msg, metadata: { ...msg.metadata, failedToSend: true } } : msg
										),
									}
								: conv
						)
					);
					return;
				}

				const result = await response.json();
				console.log("LiveChat send message response:", result);

				if (result.success && result.data?.message) {
					const serverMsg = result.data.message;
					const realMessage: LiveChatMessage = {
						id: serverMsg.id || messageId,
						conversationId: serverMsg.conversationId ?? selectedConversationId,
						type: (serverMsg.type as "user" | "bot" | "system" | "admin") ?? "admin",
						text: serverMsg.content ?? message,
						timestamp: serverMsg.createdAt,
						isRead: serverMsg.isRead ?? false,
						metadata: { ...serverMsg.metadata, isOptimistic: false },
					};
					setSelectedConversationDetail((prev) => {
						if (!prev || prev.id !== selectedConversationId) return prev;
						return {
							...prev,
							messages: (prev.messages ?? []).map((msg) => (msg.id === messageId ? realMessage : msg)),
							lastMessage: message,
							lastMessageAt: serverMsg.createdAt,
							updatedAt: new Date().toISOString(),
						};
					});
					setConversations((prev) =>
						prev.map((conv) =>
							conv.id === selectedConversationId
								? {
										...conv,
										messages: (conv.messages ?? []).map((msg) => (msg.id === messageId ? realMessage : msg)),
										lastMessage: message,
										lastMessageAt: serverMsg.createdAt,
										updatedAt: new Date().toISOString(),
									}
								: conv
						)
					);
					// Merchant sent a message → conversation is now admin-controlled; switch view to Open
					setFilters((f) => (f.status === "auto" ? { ...f, status: "open" as const } : f));
					if (filters.status === "auto") {
						loadConversations(1, true, "open");
					}
					console.log("✅ [LiveChat] Message sent successfully, server will broadcast via WebSocket");
				} else {
					console.error("LiveChat: API returned error:", {
						success: result.success,
						error: result.error,
						data: result.data,
					});
					setError("Failed to send message");
					setSelectedConversationDetail((prev) =>
						prev && prev.id === selectedConversationId
							? {
									...prev,
									messages: (prev.messages ?? []).map((msg) =>
										msg.id === messageId ? { ...msg, metadata: { ...msg.metadata, failedToSend: true } } : msg
									),
								}
							: prev
					);
					setConversations((prev) =>
						prev.map((conv) =>
							conv.id === selectedConversationId
								? {
										...conv,
										messages: (conv.messages ?? []).map((msg) =>
											msg.id === messageId ? { ...msg, metadata: { ...msg.metadata, failedToSend: true } } : msg
										),
									}
								: conv
						)
					);
				}
			} catch (err) {
				console.error("LiveChat: Exception during message send:", err);
				setError("Failed to send message");
				setSelectedConversationDetail((prev) =>
					prev && prev.id === selectedConversationId
						? {
								...prev,
								messages: (prev.messages ?? []).map((msg) =>
									msg.id === messageId ? { ...msg, metadata: { ...msg.metadata, failedToSend: true } } : msg
								),
							}
						: prev
				);
				setConversations((prev) =>
					prev.map((conv) =>
						conv.id === selectedConversationId
							? {
									...conv,
									messages: (conv.messages ?? []).map((msg) =>
										msg.id === messageId ? { ...msg, metadata: { ...msg.metadata, failedToSend: true } } : msg
									),
								}
							: conv
					)
				);
			}
		},
		[selectedConversationId, user, filters.status, loadConversations],
	);

	// Memoized handlers for better performance
	const handleSearchReset = useCallback(() => {
		setSearchQuery("");
	}, []);

	const handleSearchStateChange = useCallback((isOpen: boolean) => {
		setIsSearchOpen(isOpen);
	}, []);

	const handleFiltersChange = useCallback((newFilters: LiveChatFilters) => {
		if (selectedConversationId) {
			setSelectedConversationId(null);
			setSelectedConversationDetail(null);
		}
		// Open/Auto change: refetch from API (server filters by user's last convo controlled_by)
		if (newFilters.status !== filters.status) {
			setFilters(newFilters);
			loadConversations(1, true, newFilters.status ?? "open");
			return;
		}
		// Re-sort list once when user changes sort (no refetch)
		if (newFilters.sortBy !== filters.sortBy) {
			setConversations((prev) => {
				const sortBy = newFilters.sortBy === "oldest" ? "oldest" : "newest";
				const sorted = sortConversationsByFilter(prev, sortBy);
				conversationOrderIdsRef.current = sorted.map((c) => c.id);
				return sorted;
			});
		}
		setFilters(newFilters);
	}, [selectedConversationId, filters.status, filters.sortBy, sortConversationsByFilter, loadConversations]);

	const handleSearchChange = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	// Load conversations on mount (both open and closed for instant switching)
	useEffect(() => {
		loadConversations(1, true);
	}, [user]);

	// Load conversation details only when selection changes; pass all conversation ids for this user to show aggregated timeline
	useEffect(() => {
		if (!selectedConversationId) return;
		const userCard = userGroupedConversations.find(
			(c) => c.id === selectedConversationId || (c.conversationIds && c.conversationIds.includes(selectedConversationId))
		);
		const conversationIds = userCard?.conversationIds ?? [selectedConversationId];
		loadConversationDetailsRef.current(selectedConversationId, conversationIds);
	}, [selectedConversationId, userGroupedConversations]);

	// Show loading state only if user is not available (same pattern as ResourceLibrary)
	if (!user) {
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
					className={`${selectedConversation ? "hidden lg:block" : "block"} sticky top-0 z-40 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm py-0 -mx-0 sm:-mx-0 lg:-mx-0 px-4 sm:px-6 lg:px-8 border-b border-border/30 dark:border-border/20 shadow-lg`}
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
					className={`flex-grow flex flex-col md:overflow-hidden lg:gap-6 lg:mt-4`}
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
									onBack={handleDeselectConversation}
									merchantIconUrl={merchantIconUrl}
									adminAvatarUrl={adminAvatarUrl}
									onMarkAsRead={handleMarkAsRead}
									onResolve={handleResolve}
									onTypingChange={handleTypingChange}
								/>
							</div>
						) : (
							<div className="h-full animate-in fade-in duration-0">
								<ConversationList
									conversations={userGroupedConversations}
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
						)}
					</div>

					{/* Desktop: Show both side by side */}
					<div className="hidden lg:grid lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-[500px] max-h-[calc(100vh-200px)]">
						{/* Conversation List */}
						<div className="lg:col-span-1 overflow-hidden">
							<ConversationList
								conversations={userGroupedConversations}
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
										onBack={handleDeselectConversation}
										isLoading={isLoading}
										merchantIconUrl={merchantIconUrl}
										adminAvatarUrl={adminAvatarUrl}
										onMarkAsRead={handleMarkAsRead}
										onResolve={handleResolve}
										onTypingChange={handleTypingChange}
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
