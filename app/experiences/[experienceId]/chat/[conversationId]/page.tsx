"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { get as getConversationMessageCache, set as setConversationMessageCache } from "@/lib/cache/conversation-message-cache";
import { UserChat } from "@/lib/components/userChat";
import type { FunnelFlow } from "@/lib/types/funnel";
import type { ConversationWithMessages } from "@/lib/types/user";
import { apiGet, apiPost } from "@/lib/utils/api-client";

interface UserChatPageProps {
	params: Promise<{
		experienceId: string;
		conversationId: string;
	}>;
}

type ConversationListItem = {
	id: string;
	status: string;
	funnelId: string | null;
	funnelName: string | null;
	merchantType: string;
	createdAt: string;
	updatedAt: string;
};

type AggregatedMessage = ConversationWithMessages["messages"][number];

/**
 * UserChat Page Component
 *
 * Handles user-facing chat interface with conversation list sidebar and
 * aggregated (merged) message timeline across all non-archived conversations.
 */
export default function UserChatPage({ params }: UserChatPageProps) {
	const router = useRouter();
	const [experienceId, setExperienceId] = useState<string>("");
	const [conversationId, setConversationId] = useState<string | null>(null);

	const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
	const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [stageInfo, setStageInfo] = useState<{
		currentStage: string;
		isExperienceQualificationStage: boolean;
	} | null>(null);

	const [conversationList, setConversationList] = useState<ConversationListItem[]>([]);
	const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
	const [aggregatedMessages, setAggregatedMessages] = useState<AggregatedMessage[]>([]);
	const [isChatReadOnly, setIsChatReadOnly] = useState(false);
	const [funnelResources, setFunnelResources] = useState<Array<{ id: string; name: string; link?: string; [key: string]: unknown }>>([]);
	const [merchantType, setMerchantType] = useState<"qualification" | "upsell">("qualification");

	// Resolve async params
	useEffect(() => {
		params.then((resolvedParams) => {
			console.log("[UserChatPage] Params resolved", { experienceId: resolvedParams.experienceId, conversationId: resolvedParams.conversationId });
			setExperienceId(resolvedParams.experienceId);
			setConversationId(resolvedParams.conversationId);
		});
	}, [params]);

	const mergeAndSortMessages = useCallback(
		(
			all: Array<{
				id?: string;
				type?: string;
				text?: string;
				content?: string;
				timestamp?: string;
				createdAt?: string | Date;
				metadata?: unknown;
			}>
		): AggregatedMessage[] => {
			const toAggregated = (m: (typeof all)[0]): AggregatedMessage | null => {
				if (!m?.id) return null;
				const content = (m.text ?? m.content ?? "").trim();
				const ts = m.timestamp ?? m.createdAt;
				const createdAt = ts instanceof Date ? ts : new Date(ts ?? 0);
				const type = (m.type === "user" || m.type === "bot" || m.type === "system" || m.type === "admin" ? m.type : "bot") as AggregatedMessage["type"];
				return { id: m.id, type, content, metadata: m.metadata, createdAt };
			};
			const byId = new Map<string, AggregatedMessage>();
			for (const m of all) {
				const norm = toAggregated(m);
				if (!norm) continue;
				const existing = byId.get(norm.id);
				if (!existing || norm.createdAt.getTime() >= existing.createdAt.getTime()) byId.set(norm.id, norm);
			}
			return Array.from(byId.values()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
		},
		[]
	);

	const fetchConversationList = useCallback(async (): Promise<ConversationListItem[]> => {
		if (!experienceId) return [];
		console.log("[UserChatPage] fetchConversationList", { experienceId });
		try {
			const response = await apiGet("/api/userchat/conversations", experienceId);
			if (!response.ok) {
				console.warn("[UserChatPage] fetchConversationList response not ok", response.status);
				return [];
			}
			const json = await response.json();
			const data = json.data ?? json;
			const list = Array.isArray(data.conversations) ? data.conversations : [];
			const filtered = list.filter((c: ConversationListItem) => c.status !== "archived");
			const activeId = data.activeId ?? null;
			console.log("[UserChatPage] fetchConversationList done", { total: list.length, afterFilter: filtered.length, activeId });
			setConversationList(filtered);
			setActiveConversationId(activeId);
			if (filtered.length === 0) setAggregatedMessages([]);
			return filtered;
		} catch (e) {
			console.error("[UserChatPage] Error fetching conversation list:", e);
			return [];
		}
	}, [experienceId]);

	const loadAllConversationsMessages = useCallback(
		async (conversationIds: string[]) => {
			if (!experienceId || conversationIds.length === 0) return;
			console.log("[UserChatPage] loadAllConversationsMessages", { experienceId, count: conversationIds.length, ids: conversationIds });
			try {
				const results = await Promise.all(
					conversationIds.map((id) =>
						apiPost("/api/userchat/load-conversation", { conversationId: id, userType: "customer" }, experienceId).then((r) => r.json())
					)
				);
				const messages: Array<{
					id: string;
					type?: string;
					text?: string;
					content?: string;
					timestamp?: string;
					createdAt?: string;
					isRead?: boolean;
					metadata?: unknown;
				}> = [];
				for (const res of results) {
					const data = res.data ?? res;
					const conv = data.conversation ?? res.conversation;
					if (conv?.messages?.length) {
						for (const m of conv.messages) {
							messages.push({
								id: m.id,
								type: m.type,
								text: m.text ?? m.content,
								content: m.content ?? m.text,
								timestamp: m.timestamp ?? m.createdAt,
								createdAt: m.createdAt ?? m.timestamp,
								isRead: m.isRead,
								metadata: m.metadata,
							});
						}
					}
				}
				const merged = mergeAndSortMessages(messages);
				setAggregatedMessages(merged);
				console.log("[UserChatPage] loadAllConversationsMessages done", { totalMessages: merged.length });
			} catch (e) {
				console.error("[UserChatPage] Error loading all conversations messages:", e);
			}
		},
		[experienceId, mergeAndSortMessages]
	);

	const loadConversationById = useCallback(
		async (
			convId: string
		): Promise<{ readOnly: boolean; conversation?: ConversationWithMessages; funnelFlow?: FunnelFlow; stageInfo?: typeof stageInfo }> => {
			if (!experienceId) return { readOnly: true };
			console.log("[UserChatPage] loadConversationById", { experienceId, convId });
			try {
				const loadResponse = await apiPost(
					"/api/userchat/load-conversation",
					{ conversationId: convId, userType: "customer" },
					experienceId
				);
				const loadResult = await loadResponse.json();
				const data = loadResult.data ?? loadResult;
				const ok = loadResult.success === true || data.success === true;
				if (!ok || !(data.conversation ?? loadResult.conversation)) {
					if (data.code === "ARCHIVED" || data.error === "Conversation is archived") {
						console.log("[UserChatPage] loadConversationById archived", { convId });
						setConversationId(null);
						setConversation(null);
						fetchConversationList();
					} else {
						console.error("[UserChatPage] Failed to load conversation:", data.error ?? loadResult.error);
					}
					return { readOnly: true };
				}
				const conv = data.conversation ?? loadResult.conversation;
				const funnelFlowData = data.funnelFlow ?? loadResult.funnelFlow;
				const stageInfoData = data.stageInfo ?? loadResult.stageInfo;
				const merchantTypeData = data.merchantType ?? loadResult.merchantType;
				const resourcesData = data.resources ?? loadResult.resources;
				setConversation(conv);
				setConversationId(convId);
				if (funnelFlowData) setFunnelFlow(funnelFlowData);
				if (stageInfoData) setStageInfo(stageInfoData);
				if (merchantTypeData === "upsell" || merchantTypeData === "qualification") setMerchantType(merchantTypeData);
				setFunnelResources(Array.isArray(resourcesData) ? resourcesData : []);
				const convMessages =
					(conv as {
						messages?: Array<{
							id: string;
							type?: string;
							text?: string;
							content?: string;
							timestamp?: string;
							createdAt?: string;
							isRead?: boolean;
							metadata?: unknown;
						}>;
					}).messages ?? [];
				if (convMessages.length > 0) {
					setAggregatedMessages((prev) =>
						mergeAndSortMessages([
							...prev,
							...convMessages.map((m) => ({
								id: m.id,
								type: m.type,
								text: m.text ?? m.content,
								content: m.content ?? m.text,
								timestamp: m.timestamp ?? m.createdAt,
								createdAt: m.createdAt ?? m.timestamp,
								isRead: m.isRead,
								metadata: m.metadata,
							})),
						])
					);
				}
				const status = (conv as { status?: string } | undefined)?.status;
				const readOnly = status === "closed";
				console.log("[UserChatPage] loadConversationById done", { convId, readOnly, messageCount: convMessages.length });
				return {
					readOnly,
					conversation: conv as ConversationWithMessages,
					funnelFlow: funnelFlowData as FunnelFlow | undefined,
					stageInfo: stageInfoData ?? undefined,
				};
			} catch (err) {
				console.error("[UserChatPage] Error loading conversation by id:", err);
				return { readOnly: true };
			}
		},
		[experienceId, fetchConversationList, mergeAndSortMessages]
	);

	const handleSelectConversation = useCallback(
		async (convId: string) => {
			console.log("[UserChatPage] handleSelectConversation", { convId, experienceId });
			const { readOnly } = await loadConversationById(convId);
			setIsChatReadOnly(readOnly);
			if (experienceId) {
				apiPost(`/api/livechat/conversations/${convId}/read`, { side: "user" }, experienceId).catch((e) =>
					console.warn("[UserChatPage] Mark conversation read (user) failed:", e)
				);
			}
			router.replace(`/experiences/${experienceId}/chat/${convId}`);
		},
		[loadConversationById, experienceId, router]
	);

	// Initial load: list, then URL conversation, then all messages; optional cache for fast paint
	useEffect(() => {
		if (!experienceId || !conversationId) return;

		const loadData = async (backgroundRefresh = false) => {
			try {
				if (!backgroundRefresh) {
					setError(null);
					setLoading(true);
				}

				const cached = getConversationMessageCache(experienceId, conversationId);
				if (cached?.messages?.length && !backgroundRefresh && cached.funnelFlow != null && cached.conversationSnapshot != null) {
					const snapshot = cached.conversationSnapshot;
					const conversationFromCache: ConversationWithMessages = {
						...snapshot,
						id: snapshot.id,
						funnelId: snapshot.funnelId,
						status: snapshot.status,
						currentBlockId: snapshot.currentBlockId,
						funnel: snapshot.funnel,
						interactions: snapshot.interactions ?? [],
						createdAt: snapshot.createdAt ? new Date(snapshot.createdAt) : new Date(),
						updatedAt: snapshot.updatedAt ? new Date(snapshot.updatedAt) : new Date(),
						messages: (cached.messages ?? []).map((m) => ({
							id: m.id,
							type: m.type,
							content: m.text ?? m.content ?? "",
							metadata: m.metadata,
							createdAt: (m.createdAt ?? m.timestamp) ? new Date(String(m.createdAt ?? m.timestamp)) : new Date(),
						})),
					};
					setConversation(conversationFromCache);
					if (cached.funnelFlow != null) setFunnelFlow(cached.funnelFlow as FunnelFlow);
					if (cached.stageInfo != null) setStageInfo(cached.stageInfo as typeof stageInfo);
					setLoading(false);
				} else if (!backgroundRefresh) {
					console.log("[UserChatPage] No cache or cache incomplete, loading from API");
				}

				const list = await fetchConversationList();
				// Load aggregated timeline first so conversation.messages we pass to UserChat is the full timeline, not single-conversation only
				if (list.length > 0) {
					await loadAllConversationsMessages(list.map((c) => c.id));
				}
				const loadResult = await loadConversationById(conversationId);

				// Persist to cache using data returned from loadConversationById
				const conv = loadResult.conversation;
				const flow = loadResult.funnelFlow;
				const info = loadResult.stageInfo;
				if (conv?.messages && flow != null && conv.id === conversationId && conversationId) {
					const snapshot = conv as ConversationWithMessages;
					const msgType = (t: string): "user" | "bot" | "system" | "admin" =>
						t === "user" || t === "bot" || t === "system" || t === "admin" ? t : "bot";
					setConversationMessageCache(experienceId, conversationId, {
						messages: conv.messages.map((m: { id: string; type: string; content?: string; text?: string; metadata?: unknown; createdAt?: unknown; timestamp?: unknown }) => ({
							id: m.id,
							type: msgType(m.type),
							text: m.text ?? m.content,
							content: m.content ?? m.text,
							metadata: m.metadata,
							createdAt: (m.createdAt ?? m.timestamp) as string | Date | undefined,
							timestamp: (m.timestamp ?? m.createdAt) as string | Date | undefined,
						})),
						updatedAt: new Date().toISOString(),
						meta: { currentBlockId: conv.currentBlockId, currentStage: info?.currentStage },
						funnelFlow: flow,
						stageInfo: info ?? undefined,
						conversationSnapshot: {
							id: snapshot.id,
							funnelId: snapshot.funnelId,
							status: snapshot.status,
							currentBlockId: snapshot.currentBlockId,
							funnel: snapshot.funnel,
							interactions: snapshot.interactions,
							createdAt: typeof snapshot.createdAt === "string" ? snapshot.createdAt : snapshot.createdAt?.toISOString?.(),
							updatedAt: typeof snapshot.updatedAt === "string" ? snapshot.updatedAt : snapshot.updatedAt?.toISOString?.(),
						},
					});
					console.log("[UserChatPage] Cache written", { experienceId, conversationId });
				}
			} catch (err) {
				console.error("[UserChatPage] Error loading conversation:", err);
				setError("An unexpected error occurred");
			} finally {
				setLoading(false);
				console.log("[UserChatPage] Initial load done", { experienceId, conversationId });
			}
		};

		loadData(false);
	}, [experienceId, conversationId]);

	// Mark conversation as read when user has a conversation selected
	const lastMarkedReadRef = useRef<string | null>(null);
	useEffect(() => {
		if (!conversationId || !conversation?.id || !experienceId) return;
		if (lastMarkedReadRef.current === conversationId) return;
		lastMarkedReadRef.current = conversationId;
		console.log("[UserChatPage] Mark conversation read (user)", { conversationId, experienceId });
		apiPost(`/api/livechat/conversations/${conversationId}/read`, { side: "user" }, experienceId).catch((e) =>
			console.warn("[UserChatPage] Mark conversation read (user) failed:", e)
		);
	}, [conversationId, conversation?.id, experienceId]);

	const handleMessageSent = async (message: string, convId?: string) => {
		try {
			console.log("[UserChatPage] Message sent", { message: message.slice(0, 50), conversationId: convId });
		} catch (err) {
			console.error("[UserChatPage] Error handling message sent:", err);
		}
	};

	const handleBack = () => {
		router.back();
	};

	if (loading) return null;
	if (error) return null;

	// List has items but no conversation selected (e.g. archived URL)
	if (conversationList.length > 0 && !conversation && !funnelFlow) {
		return (
			<div className="flex h-screen w-full">
				<div className="flex w-48 flex-shrink-0 flex-col border-r border-border/30 bg-surface/50 overflow-y-auto dark:border-border/20">
					<div className="sticky top-0 bg-surface/95 p-2 py-2 text-xs font-medium uppercase tracking-wider text-foreground/70 backdrop-blur">
						Chats
					</div>
					<nav className="space-y-0.5 p-2">
						{(() => {
							const active = conversationList.find((c) => c.status === "active");
							const closed = conversationList.filter((c) => c.status === "closed");
							const ordered = active ? [active, ...closed] : closed;
							return ordered.map((c) => (
								<button
									key={c.id}
									type="button"
									onClick={() => handleSelectConversation(c.id)}
									className="w-full rounded-lg px-3 py-2 text-left text-sm text-foreground/80 transition-colors hover:bg-surface/80"
								>
									<span className="block truncate">{c.status === "active" ? "Current chat" : (c.funnelName || "Past chat")}</span>
									{c.status !== "active" && (
										<span className="mt-0.5 block truncate text-xs text-foreground/60">{new Date(c.createdAt).toLocaleDateString()}</span>
									)}
								</button>
							));
						})()}
					</nav>
				</div>
				<div className="flex min-w-0 flex-1 items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90 p-4">
					<p className="text-center text-sm text-foreground/80">Select a chat from the list.</p>
				</div>
			</div>
		);
	}

	// Conversation loaded but no funnel (unexpected)
	if (conversation && !funnelFlow) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="mx-auto max-w-md p-6 text-center">
					<div className="text-6xl text-gray-500 mb-4">💬</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Conversation Not Found</h1>
					<p className="text-gray-600 dark:text-gray-400 mb-6">This conversation may have expired or you may not have access to it.</p>
					<button onClick={handleBack} className="rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600">
						Go Back
					</button>
				</div>
			</div>
		);
	}

	// Conversation not ready (no current block)
	if (conversation && funnelFlow && !conversation.currentBlockId) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="mx-auto max-w-md p-6 text-center">
					<div className="text-6xl text-yellow-500 mb-4">⏳</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Conversation Not Ready</h1>
					<p className="text-gray-600 dark:text-gray-400 mb-6">
						This conversation is not yet ready for the chat interface. Please complete the initial setup first.
					</p>
					<button onClick={handleBack} className="rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600">
						Go Back
					</button>
				</div>
			</div>
		);
	}

	// No conversation and no list (e.g. no convs at all)
	if (!conversation && !funnelFlow && conversationList.length === 0) {
		return (
			<div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="mx-auto max-w-md p-6 text-center">
					<div className="text-6xl text-gray-500 mb-4">💬</div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Conversation Not Found</h1>
					<p className="text-gray-600 dark:text-gray-400 mb-6">This conversation may have expired or you may not have access to it.</p>
					<button onClick={handleBack} className="rounded-lg bg-blue-500 px-6 py-3 text-white transition-colors hover:bg-blue-600">
						Go Back
					</button>
				</div>
			</div>
		);
	}

	// Main: sidebar (if list non-empty) + UserChat
	const showSidebar = conversationList.length > 0;
	const orderedList = (() => {
		const active = conversationList.find((c) => c.status === "active");
		const closed = conversationList.filter((c) => c.status === "closed");
		return active ? [active, ...closed] : closed;
	})();

	return (
		<div className="flex h-screen w-full">
			{showSidebar && (
				<div className="flex w-48 flex-shrink-0 flex-col border-r border-border/30 bg-surface/50 overflow-y-auto dark:border-border/20">
					<div className="sticky top-0 bg-surface/95 p-2 py-2 text-xs font-medium uppercase tracking-wider text-foreground/70 backdrop-blur">
						Chats
					</div>
					<nav className="space-y-0.5 p-2">
						{orderedList.map((c) => {
							const isActive = c.id === conversationId;
							const isCurrentChat = c.status === "active";
							return (
								<button
									key={c.id}
									type="button"
									onClick={() => handleSelectConversation(c.id)}
									className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
										isActive ? "bg-blue-500/20 font-medium text-blue-700 dark:text-blue-300" : "text-foreground/80 hover:bg-surface/80"
									}`}
								>
									<span className="block truncate">{isCurrentChat ? "Current chat" : (c.funnelName || "Past chat")}</span>
									{!isCurrentChat && (
										<span className="mt-0.5 block truncate text-xs text-foreground/60">{new Date(c.createdAt).toLocaleDateString()}</span>
									)}
								</button>
							);
						})}
					</nav>
				</div>
			)}
			<div className="min-w-0 flex-1">
				{funnelFlow && (conversationId || conversation) && conversation ? (
					<UserChat
						funnelFlow={funnelFlow}
						conversationId={(conversationId ?? conversation.id) as string}
						conversation={{
							...conversation,
							messages: aggregatedMessages.length > 0 ? aggregatedMessages : (conversation.messages ?? []),
						}}
						experienceId={experienceId}
						onMessageSent={handleMessageSent}
						onBack={handleBack}
						hideAvatar={false}
						stageInfo={stageInfo ?? undefined}
						merchantType={merchantType}
						readOnly={isChatReadOnly}
						resources={funnelResources}
						adminAvatarUrl={conversation?.adminAvatar ?? undefined}
					/>
				) : showSidebar ? (
					<div className="flex h-full items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90 p-4">
						<p className="text-center text-sm text-foreground/80">Select a chat from the list.</p>
					</div>
				) : null}
			</div>
		</div>
	);
}
