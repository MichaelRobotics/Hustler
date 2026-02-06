import { db, postgresClient } from "@/lib/supabase/db-server";
import { conversations, users, experiences, funnels, messages } from "@/lib/supabase/schema";
import { eq, and, desc, asc, count, sql, or, ilike, inArray } from "drizzle-orm";
import { sendWhopNotification } from "@/lib/helpers/whop-notifications";
import type { AuthenticatedUser } from "@/lib/types/user";
import type { LiveChatConversation, LiveChatFilters, LiveChatPagination, LiveChatConversationResponse } from "@/lib/types/liveChat";
import type { FunnelFlow } from "@/lib/types/funnel";

const TYPING_EXPIRY_MS = 60 * 1000; // 1 min: after this, typing is always treated as false

/**
 * Get the admin user's avatar for an experience (same source as user avatar: users.avatar).
 * Used for LiveChat admin message avatar and for experience-level admin avatar fetch.
 * @param whopExperienceId - Whop experience ID (string)
 * @returns Avatar URL or undefined (same normalization as user context: empty string -> undefined)
 */
export async function getAdminAvatarForExperience(whopExperienceId: string): Promise<string | undefined> {
	const experience = await db.query.experiences.findFirst({
		where: eq(experiences.whopExperienceId, whopExperienceId),
		columns: { id: true },
	});
	if (!experience) return undefined;
	const adminUser = await db.query.users.findFirst({
		where: and(
			eq(users.experienceId, experience.id),
			eq(users.accessLevel, "admin")
		),
		columns: { avatar: true },
	});
	return adminUser?.avatar || undefined;
}

/**
 * Typing = boolean + timestamp. When true, we set *_typing_at to now.
 * After 1 min with no update, we treat typing as false and clear it (so user/admin leaving doesn't leave it stuck).
 */
export async function getConversationTypingState(conversationId: string): Promise<{ user: boolean; admin: boolean }> {
	const conv = await db.query.conversations.findFirst({
		where: eq(conversations.id, conversationId),
		columns: { id: true, userTyping: true, adminTyping: true, userTypingAt: true, adminTypingAt: true },
	});
	if (!conv) return { user: false, admin: false };
	const c = conv as {
		id: string;
		userTyping?: boolean;
		adminTyping?: boolean;
		userTypingAt?: string | null;
		adminTypingAt?: string | null;
	};
	const now = Date.now();
	const userExpired =
		!!c.userTyping &&
		(!c.userTypingAt || now - new Date(c.userTypingAt).getTime() > TYPING_EXPIRY_MS);
	const adminExpired =
		!!c.adminTyping &&
		(!c.adminTypingAt || now - new Date(c.adminTypingAt).getTime() > TYPING_EXPIRY_MS);
	if (userExpired || adminExpired) {
		await db
			.update(conversations)
			.set({
				...(userExpired ? { userTyping: false, userTypingAt: null } : {}),
				...(adminExpired ? { adminTyping: false, adminTypingAt: null } : {}),
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));
	}
	return {
		user: !!c.userTyping && !userExpired,
		admin: !!c.adminTyping && !adminExpired,
	};
}

/**
 * LiveChat Integration Actions
 * 
 * This module integrates livechat with the existing UserChat system by:
 * 1. Checking for existing conversations in the experience
 * 2. Mirroring UserChat TRANSITION stage logic
 * 3. Intercepting WebSocket updates from UserChat conversations
 * 4. Providing real-time conversation management for admins
 */

/**
 * Get last message (content, createdAt) and message count per conversation without loading all messages.
 */
async function getLastMessageAndCountForConversations(
	conversationIds: string[],
): Promise<Map<string, { content: string; createdAt: string; count: number }>> {
	const result = new Map<string, { content: string; createdAt: string; count: number }>();
	if (conversationIds.length === 0) return result;

	// Count per conversation (Drizzle)
	const countRows = await db
		.select({
			conversationId: messages.conversationId,
			count: count(),
		})
		.from(messages)
		.where(inArray(messages.conversationId, conversationIds))
		.groupBy(messages.conversationId);

	for (const id of conversationIds) {
		result.set(id, { content: "No messages yet", createdAt: "", count: 0 });
	}
	for (const row of countRows) {
		const existing = result.get(row.conversationId)!;
		result.set(row.conversationId, { ...existing, count: row.count });
	}

	// Last message per conversation (raw SQL with ROW_NUMBER)
	if (!postgresClient) return result;
	const lastMessageRows = await postgresClient`
		SELECT conversation_id, content, created_at FROM (
			SELECT conversation_id, content, created_at,
				ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) AS rn
			FROM messages
			WHERE conversation_id = ANY(${conversationIds})
		) ranked WHERE rn = 1
	`;
	for (const row of lastMessageRows) {
		const id = row.conversation_id;
		const existing = result.get(id);
		if (existing)
			result.set(id, {
				...existing,
				content: row.content ?? existing.content,
				createdAt: row.created_at != null ? String(row.created_at) : existing.createdAt,
			});
	}
	return result;
}

/**
 * Get all active conversations for an experience (for livechat admin view)
 * Returns list with lastMessage, lastMessageAt, messageCount but no messages array (cards only).
 */
export async function getLiveChatConversations(
	user: AuthenticatedUser,
	experienceId: string,
	filters: LiveChatFilters = {},
	pagination: LiveChatPagination = { page: 1, limit: 20 },
): Promise<LiveChatConversationResponse> {
	try {
		if (user.experienceId !== experienceId) {
			throw new Error("Access denied: Invalid experience ID");
		}

		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});
		if (!experience) {
			throw new Error("Experience not found");
		}

		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		let whereConditions = and(eq(conversations.experienceId, experience.id));
		if (filters.status === "open") {
			whereConditions = and(whereConditions, eq(conversations.status, "active"));
		} else if (filters.status === "closed") {
			whereConditions = and(whereConditions, eq(conversations.status, "closed"));
		}
		if (filters.searchQuery) {
			whereConditions = and(
				whereConditions,
				or(
					ilike(funnels.name, `%${filters.searchQuery}%`),
					sql`EXISTS (
						SELECT 1 FROM messages 
						WHERE messages.conversation_id = conversations.id 
						AND messages.content ILIKE ${"%" + filters.searchQuery + "%"}
					)`,
				),
			)!;
		}

		const [totalResult] = await db
			.select({ count: count() })
			.from(conversations)
			.innerJoin(funnels, eq(conversations.funnelId, funnels.id))
			.where(whereConditions);
		const total = totalResult.count;

		let orderBy;
		switch (filters.sortBy) {
			case "oldest":
				orderBy = [asc(conversations.createdAt)];
				break;
			case "most_messages":
				orderBy = [desc(sql`(
					SELECT COUNT(*) FROM messages 
					WHERE messages.conversation_id = conversations.id
				)`)];
				break;
			case "least_messages":
				orderBy = [asc(sql`(
					SELECT COUNT(*) FROM messages 
					WHERE messages.conversation_id = conversations.id
				)`)];
				break;
			default:
				orderBy = [desc(conversations.updatedAt)];
		}

		// Fetch conversations WITHOUT messages (cards only)
		const conversationsList = await db.query.conversations.findMany({
			where: whereConditions,
			with: { funnel: true },
			orderBy,
			limit,
			offset,
		});

		const ids = conversationsList.map((c: { id: string }) => c.id);
		const lastAndCount = await getLastMessageAndCountForConversations(ids);

		const liveChatConversations: LiveChatConversation[] = await Promise.all(
			conversationsList.map(async (conv: any) => {
				const userData = await db.query.users.findFirst({
					where: and(
						eq(users.whopUserId, conv.whopUserId),
						eq(users.experienceId, experience.id)
					),
					columns: { id: true, name: true, email: true, avatar: true, updatedAt: true },
				});
				const lastActivity = userData?.updatedAt || conv.updatedAt;
				const userInfo = {
					id: userData?.id || conv.whopUserId,
					name: userData?.name || `User ${conv.whopUserId.slice(-8)}`,
					email: userData?.email || `${conv.whopUserId}@whop.com`,
					avatar: userData?.avatar || undefined,
					isOnline: false,
					lastSeen: lastActivity,
				};

				const agg = lastAndCount.get(conv.id) ?? { content: "No messages yet", createdAt: "", count: 0 };
				const lastMessageAt = agg.createdAt || conv.updatedAt;
				const currentStage = determineConversationStage(conv.currentBlockId, conv.funnel?.flow as FunnelFlow);
				const displayStatus = conv.status === "active" ? "open" : "closed";

				const c = conv as { metadata?: { autoCloseAt?: string; isArchived?: boolean }; userLastReadAt?: string | null; adminLastReadAt?: string | null; unreadCountAdmin?: number; unreadCountUser?: number; controlledBy?: string };
				return {
					id: conv.id,
					userId: userInfo.id,
					user: userInfo,
					funnelId: conv.funnelId,
					funnelName: conv.funnel.name,
					status: displayStatus as "open" | "closed",
					startedAt: conv.createdAt,
					lastMessageAt,
					lastMessage: agg.content,
					messageCount: agg.count,
					messages: [], // List API returns no messages; load when conversation is selected
					autoCloseAt: c.metadata?.autoCloseAt || undefined,
					isArchived: c.metadata?.isArchived || false,
					createdAt: conv.createdAt,
					updatedAt: conv.updatedAt,
					currentStage,
					whopUserId: conv.whopUserId,
					experienceId: conv.experienceId,
					userLastReadAt: c.userLastReadAt ?? undefined,
					adminLastReadAt: c.adminLastReadAt ?? undefined,
					unreadCountAdmin: c.unreadCountAdmin ?? 0,
					unreadCountUser: c.unreadCountUser ?? 0,
					controlledBy: c.controlledBy as "bot" | "admin" | undefined,
				};
			})
		);

		return {
			conversations: liveChatConversations,
			total,
			page,
			limit,
			hasMore: offset + limit < total,
		};
	} catch (error) {
		console.error("Error getting livechat conversations:", error);
		throw new Error("Failed to get livechat conversations");
	}
}

/**
 * Get detailed conversation for livechat view
 * This loads the full conversation with all messages and stage information
 */
export async function getLiveChatConversationDetails(
	user: AuthenticatedUser,
	conversationId: string,
	experienceId: string,
): Promise<LiveChatConversation | null> {
	try {
		// Verify user has access to this experience
		if (user.experienceId !== experienceId) {
			throw new Error("Access denied: Invalid experience ID");
		}

		// First, find the database UUID for this Whop experience ID
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			throw new Error("Experience not found");
		}

		// Get conversation with all related data (any status)
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experience.id) // Use database UUID, not Whop ID
				// Removed status filter to allow viewing closed conversations
			),
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
				},
				funnelInteractions: {
					orderBy: [asc(messages.createdAt)],
				},
			},
		});

		if (!conversation) {
			return null;
		}

		// Get user information from database
		const userData = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, conversation.whopUserId),
				eq(users.experienceId, experience.id)
			),
			columns: {
				id: true,
				name: true,
				email: true,
				avatar: true,
				updatedAt: true,
			},
		});

		// Admin avatar from users table (same as user avatar: users.avatar for admin access in this experience)
		const adminAvatar = await getAdminAvatarForExperience(experienceId);

		// Simple online status calculation (not used for display)
		const lastActivity = userData?.updatedAt || conversation.updatedAt;
		const isOnline = false; // Always false since we removed online indicators
		
		const userInfo = {
			id: userData?.id || conversation.whopUserId,
			name: userData?.name || `User ${conversation.whopUserId.slice(-8)}`, // Keep fallback for display purposes
			email: userData?.email || `${conversation.whopUserId}@whop.com`,
			avatar: userData?.avatar || undefined,
			isOnline: isOnline,
			lastSeen: lastActivity,
		};

		// Get last message
		const lastMessage = conversation.messages && conversation.messages.length > 0 
			? conversation.messages[conversation.messages.length - 1] 
			: null;
		const lastMessageText = lastMessage?.content || "No messages yet";

		// Determine conversation stage
		const currentStage = determineConversationStage(conversation.currentBlockId, conversation.funnel?.flow as FunnelFlow);

		// Status mapping: active and completed = open, closed and abandoned = closed
		const displayStatus = conversation.status === "active" ? "open" : "closed";

		const conv = conversation as typeof conversation & { userLastReadAt?: Date | string | null; adminLastReadAt?: Date | string | null };
		const adminLastReadAt = conv.adminLastReadAt ? new Date(conv.adminLastReadAt) : null;
		const userLastReadAt = conv.userLastReadAt ? new Date(conv.userLastReadAt) : null;

		return {
			id: conversation.id,
			userId: userInfo.id,
			user: userInfo,
			funnelId: conversation.funnelId,
			funnelName: conversation.funnel.name,
			status: displayStatus as "open" | "closed",
			startedAt: conversation.createdAt,
			lastMessageAt: lastMessage?.createdAt || conversation.updatedAt,
			lastMessage: lastMessageText,
			messageCount: conversation.messages?.length || 0,
			messages: (conversation.messages || []).map((msg: any) => {
				const msgTime = new Date(msg.createdAt).getTime();
				const isUserMsg = msg.type === "user";
				const isRead = isUserMsg
					? (!!adminLastReadAt && msgTime <= adminLastReadAt.getTime())
					: (!!userLastReadAt && msgTime <= userLastReadAt.getTime());
				const resolvedType =
					msg.type === "user"
						? "user"
						: msg.type === "bot"
							? (msg.metadata?.senderType === "admin" ? "admin" : "bot")
							: "system";
				return {
					id: msg.id,
					conversationId: msg.conversationId,
					type: resolvedType,
					text: msg.content,
					timestamp: msg.createdAt,
					isRead,
					metadata: msg.metadata,
				};
			}),
			// Backend-ready fields
			autoCloseAt: conversation.metadata?.autoCloseAt || undefined,
			isArchived: conversation.metadata?.isArchived || false,
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
			// LiveChat specific fields
			currentStage,
			whopUserId: conversation.whopUserId,
			experienceId: conversation.experienceId,
			userLastReadAt: conv.userLastReadAt ?? null,
			adminLastReadAt: conv.adminLastReadAt ?? null,
			unreadCountAdmin: (conv as { unreadCountAdmin?: number }).unreadCountAdmin ?? 0,
			unreadCountUser: (conv as { unreadCountUser?: number }).unreadCountUser ?? 0,
			controlledBy: ((conv as { controlledBy?: string }).controlledBy as "bot" | "admin") ?? "bot",
			typing: await getConversationTypingState(conversation.id),
			adminAvatar,
		};
	} catch (error) {
		console.error("Error getting livechat conversation details:", error);
		throw new Error("Failed to get livechat conversation details");
	}
}

/**
 * Send a message from admin to user in livechat
 * This integrates with the existing message system
 */
export async function sendLiveChatMessage(
	user: AuthenticatedUser,
	conversationId: string,
	message: string,
	experienceId: string,
): Promise<{ success: boolean; message?: any; error?: string }> {
	try {
		console.log("sendLiveChatMessage: Starting with params:", {
			userId: user.id,
			userExperienceId: user.experienceId,
			requestedExperienceId: experienceId,
			conversationId,
			message
		});

		// Verify user has access to this experience
		if (user.experienceId !== experienceId) {
			console.error("sendLiveChatMessage: Experience ID mismatch:", {
				userExperienceId: user.experienceId,
				requestedExperienceId: experienceId
			});
			throw new Error("Access denied: Invalid experience ID");
		}

		// First, find the database UUID for this Whop experience ID
		console.log("sendLiveChatMessage: Looking up experience:", experienceId);
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			console.error("sendLiveChatMessage: Experience not found for:", experienceId);
			throw new Error("Experience not found");
		}

		console.log("sendLiveChatMessage: Found experience:", {
			id: experience.id,
			whopExperienceId: experience.whopExperienceId
		});

		// Get conversation to verify it exists and get whopUserId
		console.log("sendLiveChatMessage: Looking up conversation:", {
			conversationId,
			experienceId: experience.id
		});
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experience.id) // Use database UUID, not Whop ID
			),
		});

		// Check if conversation exists and is in a valid state for messaging
		if (!conversation) {
			console.error("sendLiveChatMessage: Conversation not found:", {
				conversationId,
				experienceId: experience.id
			});
			throw new Error("Conversation not found");
		}

		// Allow sending messages to active and completed conversations
		if (conversation.status !== "active") {
			console.error("sendLiveChatMessage: Conversation not in valid state for messaging:", {
				conversationId,
				status: conversation.status,
				experienceId: experience.id
			});
			throw new Error("Conversation not found or not active");
		}

		console.log("sendLiveChatMessage: Found conversation:", {
			id: conversation.id,
			whopUserId: conversation.whopUserId,
			status: conversation.status
		});

		// Add message to conversation
		console.log("sendLiveChatMessage: Inserting message to database");
		const [newMessage] = await db.insert(messages).values({
			conversationId,
			type: "bot", // Admin messages are treated as bot messages
			content: message,
			metadata: {
				senderId: user.id,
				senderType: "admin",
				timestamp: new Date().toISOString(),
			},
		}).returning();

		// Increment sends counter for the funnel
		try {
			await db.update(funnels)
				.set({ 
					sends: sql`${funnels.sends} + 1`,
					updatedAt: new Date()
				})
				.where(eq(funnels.id, conversation.funnelId));
			
			console.log(`[livechat-integration] Incremented sends counter for funnel ${conversation.funnelId}`);
		} catch (sendsError) {
			console.error(`[livechat-integration] Error updating sends counter:`, sendsError);
		}

		console.log("sendLiveChatMessage: Message inserted successfully:", {
			messageId: newMessage.id,
			conversationId: newMessage.conversationId
		});

		// Update conversation: timestamp, increment unread for user, and hand over to admin (takeover)
		const now = new Date();
		await db
			.update(conversations)
			.set({
				updatedAt: now,
				unreadCountUser: sql`${conversations.unreadCountUser} + 1`,
				controlledBy: "admin",
			})
			.where(eq(conversations.id, conversationId));

		// Notify the conversation's user via Whop push notification
		if (experience.whopExperienceId) {
			sendWhopNotification({
				experience_id: experience.whopExperienceId,
				user_ids: [conversation.whopUserId],
				title: "New message",
				content: `You have a new message from the team.`,
				rest_path: `/chat/${conversationId}`,
			}).catch((err) => console.warn("[sendLiveChatMessage] Whop notification failed:", err));
		}

		return {
			success: true,
			message: {
				id: newMessage.id,
				conversationId: newMessage.conversationId,
				type: "admin" as const, // Admin-sent messages shown as "admin" in LiveChat to differentiate from bot
				content: newMessage.content,
				createdAt: newMessage.createdAt,
				metadata: newMessage.metadata,
			},
		};
	} catch (error) {
		console.error("Error sending livechat message:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to send message",
		};
	}
}

/**
 * Determine conversation stage based on current block and funnel flow
 * This mirrors the UserChat stage determination logic
 */
function determineConversationStage(currentBlockId: string | null, funnelFlow: FunnelFlow | null): string {
	if (!currentBlockId || !funnelFlow) {
		return "UNKNOWN";
	}

	// Check each stage to see if currentBlockId belongs to it
	for (const stage of funnelFlow.stages) {
		if (stage.blockIds.includes(currentBlockId)) {
			return stage.name;
		}
	}

	// If not in any stage, check if it's a custom block
	const blockExists = funnelFlow.blocks[currentBlockId];
	return blockExists ? "CUSTOM_BLOCK" : "INVALID_BLOCK";
}

/**
 * Check if conversation is in TRANSITION stage
 * This mirrors the UserChat TRANSITION stage check
 */
export function isConversationInTransitionStage(
	currentBlockId: string | null,
	funnelFlow: FunnelFlow | null,
): boolean {
	if (!currentBlockId || !funnelFlow) {
		return false;
	}

	const transitionStage = funnelFlow.stages.find(stage => stage.name === "TRANSITION");
	return transitionStage ? transitionStage.blockIds.includes(currentBlockId) : false;
}

/**
 * Check if conversation is in EXPERIENCE_QUALIFICATION stage
 * This mirrors the UserChat EXPERIENCE_QUALIFICATION stage check
 */
export function isConversationInExperienceQualificationStage(
	currentBlockId: string | null,
	funnelFlow: FunnelFlow | null,
): boolean {
	if (!currentBlockId || !funnelFlow) {
		return false;
	}

	const experienceQualStage = funnelFlow.stages.find(stage => stage.name === "EXPERIENCE_QUALIFICATION");
	return experienceQualStage ? experienceQualStage.blockIds.includes(currentBlockId) : false;
}

/**
 * Get conversation stage information for livechat
 * This provides detailed stage information for admin monitoring
 */
export async function getConversationStageInfo(
	conversationId: string,
	experienceId: string,
): Promise<{
	currentStage: string;
	isTransitionStage: boolean;
	isExperienceQualificationStage: boolean;
	isDMFunnelActive: boolean;
	funnelFlow: FunnelFlow | null;
} | null> {
	try {
		// Get conversation with funnel
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId),
				eq(conversations.status, "active")
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation || !conversation.funnel?.flow) {
			return null;
		}

		const funnelFlow = conversation.funnel.flow as FunnelFlow;
		const currentBlockId = conversation.currentBlockId;

		// Determine stages
		const isTransitionStage = isConversationInTransitionStage(currentBlockId, funnelFlow);
		const isExperienceQualificationStage = isConversationInExperienceQualificationStage(currentBlockId, funnelFlow);
		const isDMFunnelActive = !isTransitionStage && !isExperienceQualificationStage;
		const currentStage = determineConversationStage(currentBlockId, funnelFlow);

		return {
			currentStage,
			isTransitionStage,
			isExperienceQualificationStage,
			isDMFunnelActive,
			funnelFlow,
		};
	} catch (error) {
		console.error("Error getting conversation stage info:", error);
		return null;
	}
}
