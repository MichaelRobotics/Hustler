import { and, asc, count, desc, eq, sql, or, ilike, inArray } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { startConversationForMerchantClosedTrigger } from "./simplified-conversation-actions";
import { db } from "../supabase/db-server";
import {
	conversations,
	funnelInteractions,
	funnels,
	messages,
	users,
	experiences,
} from "../supabase/schema";
import type { LiveChatConversation, LiveChatFilters } from "../types/liveChat";

export interface LiveChatPagination {
	page: number;
	limit: number;
}

export interface LiveChatConversationResponse {
	conversations: LiveChatConversation[];
	total: number;
	hasMore: boolean;
	page: number;
	limit: number;
}

export interface LiveChatAnalytics {
	conversationId: string;
	totalMessages: number;
	userMessages: number;
	botMessages: number;
	avgResponseTime: number;
	conversationDuration: number;
	funnelProgress: number;
	lastActivity: Date;
	engagementScore: number;
}


/**
 * 6.1.1 Load real conversations with filters
 * Query conversations from database with proper filtering and user data
 */
export async function loadRealConversations(
	user: AuthenticatedUser,
	experienceId: string,
	filters: LiveChatFilters = {},
): Promise<LiveChatConversationResponse> {
	try {
		// Verify user has access to this experience
		if (user.experienceId !== experienceId) {
			throw new Error("Access denied: Invalid experience ID");
		}

		const page = 1;
		const limit = 50;

		// Build where conditions
		let whereConditions = eq(conversations.experienceId, experienceId);

		// Align with integration: open param → bot users; auto param → admin users (UI labels Open=admin, Auto=bot)
		if (filters.status === "open") {
			whereConditions = and(
				whereConditions,
				inArray(conversations.status, ["active", "closed"]),
				sql`EXISTS (
					SELECT 1 FROM conversations c2
					WHERE c2.experience_id = ${experienceId}
					AND c2.whop_user_id = conversations.whop_user_id
					AND c2.status IN ('active', 'closed')
					AND c2.controlled_by = 'bot'
					AND NOT EXISTS (
						SELECT 1 FROM conversations c3
						WHERE c3.experience_id = c2.experience_id
						AND c3.whop_user_id = c2.whop_user_id
						AND c3.status IN ('active', 'closed')
						AND c3.updated_at > c2.updated_at
					)
				)`
			)!;
		} else if (filters.status === "auto") {
			whereConditions = and(
				whereConditions,
				inArray(conversations.status, ["active", "closed"]),
				sql`EXISTS (
					SELECT 1 FROM conversations c2
					WHERE c2.experience_id = ${experienceId}
					AND c2.whop_user_id = conversations.whop_user_id
					AND c2.status IN ('active', 'closed')
					AND c2.controlled_by = 'admin'
					AND NOT EXISTS (
						SELECT 1 FROM conversations c3
						WHERE c3.experience_id = c2.experience_id
						AND c3.whop_user_id = c2.whop_user_id
						AND c3.status IN ('active', 'closed')
						AND c3.updated_at > c2.updated_at
					)
				)`
			)!;
		}

		// Add search filter
		if (filters.searchQuery) {
			whereConditions = and(
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

		// For customers, filter by their funnels
		if (user.accessLevel === "customer") {
			whereConditions = and(
				eq(funnels.userId, user.id),
			)!;
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(conversations)
			.innerJoin(funnels, eq(conversations.funnelId, funnels.id))
			.where(whereConditions);

		const total = totalResult.count;

		// Determine sort order
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
			default: // newest
				orderBy = [desc(conversations.updatedAt)];
		}

		// Get conversations with related data
		const conversationsList = await db.query.conversations.findMany({
			where: whereConditions,
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
					limit: 10, // Limit messages for performance
				},
				funnelInteractions: {
					orderBy: [asc(funnelInteractions.createdAt)],
				},
			},
		});

		// Transform to LiveChat format
		const liveChatConversations: LiveChatConversation[] = await Promise.all(
			conversationsList.map(async (conv: any) => {
				// Resolve user from users table by (whopUserId, experienceId)
				const dbUser = await db.query.users.findFirst({
					where: and(
						eq(users.whopUserId, conv.whopUserId),
						eq(users.experienceId, conv.experienceId),
					),
					columns: { id: true, name: true, email: true, avatar: true },
				});
				const userInfo = dbUser
					? {
							id: dbUser.id,
							name: dbUser.name,
							email: dbUser.email ?? "unknown@example.com",
							avatar: dbUser.avatar ?? undefined,
							isOnline: false,
							lastSeen: conv.updatedAt,
						}
					: {
							id: conv.whopUserId,
							name: "Unknown User",
							email: "unknown@example.com",
							avatar: undefined,
							isOnline: false,
							lastSeen: conv.updatedAt,
						};

				// Get last message
				const lastMessage = conv.messages[conv.messages.length - 1];
				const lastMessageText = lastMessage?.content || "No messages yet";

				// Calculate message count
				const messageCount = conv.messages.length;

				// Map conversation status
				const statusMap = {
					active: "open",
					closed: "closed",
					archived: "closed",
				};

				return {
					id: conv.id,
					userId: userInfo.id,
					user: {
						id: userInfo.id,
						name: userInfo.name,
						email: userInfo.email,
						avatar: userInfo.avatar,
						isOnline: userInfo.isOnline || false,
						lastSeen: userInfo.lastSeen || conv.updatedAt,
					},
					funnelId: conv.funnelId,
					funnelName: conv.funnel.name,
					status: statusMap[conv.status as keyof typeof statusMap] as "open" | "closed",
					startedAt: conv.createdAt,
					lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
					lastMessage: lastMessageText,
					messages: conv.messages.map((msg: any) => ({
						id: msg.id,
						conversationId: msg.conversationId,
						type: msg.type === "bot" ? "bot" : msg.type === "user" ? "user" : "system",
						text: msg.content,
						timestamp: msg.createdAt,
						isRead: true, // For now, assume all messages are read
						metadata: msg.metadata,
					})),
					// Backend-ready fields
					autoCloseAt: conv.metadata?.autoCloseAt || undefined,
					isArchived: conv.metadata?.isArchived || false,
					createdAt: conv.createdAt,
					updatedAt: conv.updatedAt,
				};
			}),
		);

		return {
			conversations: liveChatConversations,
			total,
			page,
			limit,
			hasMore: total > limit,
		};
	} catch (error) {
		console.error("Error loading real conversations:", error);
		throw new Error("Failed to load conversations");
	}
}

/**
 * 6.1.2 Get conversation list with pagination
 * Load conversations with proper filtering, sorting, and pagination
 */
export async function getConversationList(
	user: AuthenticatedUser,
	experienceId: string,
	filters: LiveChatFilters = {},
	pagination: LiveChatPagination = { page: 1, limit: 20 },
): Promise<LiveChatConversationResponse> {
	try {
		// Verify user has access to this experience
		if (user.experienceId !== experienceId) {
			throw new Error("Access denied: Invalid experience ID");
		}

		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		// Build where conditions
		let whereConditions = eq(conversations.experienceId, experienceId);

		// Align with integration: open param → bot users; auto param → admin users (UI labels Open=admin, Auto=bot)
		if (filters.status === "open") {
			whereConditions = and(
				whereConditions,
				inArray(conversations.status, ["active", "closed"]),
				sql`EXISTS (
					SELECT 1 FROM conversations c2
					WHERE c2.experience_id = ${experienceId}
					AND c2.whop_user_id = conversations.whop_user_id
					AND c2.status IN ('active', 'closed')
					AND c2.controlled_by = 'bot'
					AND NOT EXISTS (
						SELECT 1 FROM conversations c3
						WHERE c3.experience_id = c2.experience_id
						AND c3.whop_user_id = c2.whop_user_id
						AND c3.status IN ('active', 'closed')
						AND c3.updated_at > c2.updated_at
					)
				)`
			)!;
		} else if (filters.status === "auto") {
			whereConditions = and(
				whereConditions,
				inArray(conversations.status, ["active", "closed"]),
				sql`EXISTS (
					SELECT 1 FROM conversations c2
					WHERE c2.experience_id = ${experienceId}
					AND c2.whop_user_id = conversations.whop_user_id
					AND c2.status IN ('active', 'closed')
					AND c2.controlled_by = 'admin'
					AND NOT EXISTS (
						SELECT 1 FROM conversations c3
						WHERE c3.experience_id = c2.experience_id
						AND c3.whop_user_id = c2.whop_user_id
						AND c3.status IN ('active', 'closed')
						AND c3.updated_at > c2.updated_at
					)
				)`
			)!;
		}

		// Add search filter
		if (filters.searchQuery) {
			whereConditions = and(
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

		// For customers, filter by their funnels
		if (user.accessLevel === "customer") {
			whereConditions = and(
				eq(funnels.userId, user.id),
			)!;
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(conversations)
			.innerJoin(funnels, eq(conversations.funnelId, funnels.id))
			.where(whereConditions);

		const total = totalResult.count;

		// Determine sort order
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
			default: // newest
				orderBy = [desc(conversations.updatedAt)];
		}

		// Get conversations with related data
		const conversationsList = await db.query.conversations.findMany({
			where: whereConditions,
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
					// Load ALL messages for accurate last message display
				},
			},
		});

		// Transform to LiveChat format (resolve user from users table)
		const liveChatConversations: LiveChatConversation[] = await Promise.all(
			conversationsList.map(async (conv: any) => {
				const dbUser = await db.query.users.findFirst({
					where: and(
						eq(users.whopUserId, conv.whopUserId),
						eq(users.experienceId, conv.experienceId),
					),
					columns: { id: true, name: true, email: true, avatar: true },
				});
				const userInfo = dbUser
					? {
							id: dbUser.id,
							name: dbUser.name,
							email: dbUser.email ?? "unknown@example.com",
							avatar: dbUser.avatar ?? undefined,
							isOnline: false,
							lastSeen: conv.updatedAt,
						}
					: {
							id: conv.whopUserId,
							name: "Unknown User",
							email: "unknown@example.com",
							avatar: undefined,
							isOnline: false,
							lastSeen: conv.updatedAt,
						};

			// Get last message - ensure we have messages and they're properly ordered
			const messages = conv.messages || [];
			console.log(`[CONV-LIST-ALT] Conversation ${conv.id}: ${messages.length} messages loaded`);
			
			// Sort messages by createdAt to ensure proper order (safety check)
			const sortedMessages = messages.sort((a: any, b: any) => 
				new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);
			
			const lastMessage = sortedMessages[sortedMessages.length - 1];
			const lastMessageText = lastMessage?.content || "No messages yet";
			
			console.log(`[CONV-LIST-ALT] Conversation ${conv.id}: Last message = "${lastMessageText}"`);

			// Calculate message count
			const messageCount = sortedMessages.length;

			// Map conversation status
			const statusMap = {
				active: "open",
				closed: "closed",
				archived: "closed",
			};

			const adminLastReadAt = conv.adminLastReadAt ? new Date(conv.adminLastReadAt) : null;
			const userLastReadAt = conv.userLastReadAt ? new Date(conv.userLastReadAt) : null;

			return {
				id: conv.id,
				userId: userInfo.id,
				user: {
					id: userInfo.id,
					name: userInfo.name,
					email: userInfo.email,
					avatar: userInfo.avatar,
					isOnline: userInfo.isOnline || false,
					lastSeen: userInfo.lastSeen || conv.updatedAt,
				},
				funnelId: conv.funnelId,
				funnelName: conv.funnel.name,
				status: statusMap[conv.status as keyof typeof statusMap] as "open" | "closed",
				startedAt: conv.createdAt,
				lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
				lastMessage: lastMessageText,
				messages: sortedMessages.map((msg: any) => {
					const msgTime = new Date(msg.createdAt).getTime();
					const isUserMsg = msg.type === "user";
					const isRead = isUserMsg
						? (!!adminLastReadAt && msgTime <= adminLastReadAt.getTime())
						: (!!userLastReadAt && msgTime <= userLastReadAt.getTime());
					return {
						id: msg.id,
						conversationId: msg.conversationId,
						type: msg.type === "bot" ? "bot" : msg.type === "user" ? "user" : msg.type === "admin" ? "admin" : "system",
						text: msg.content,
						timestamp: msg.createdAt,
						isRead,
						metadata: msg.metadata,
					};
				}),
				// Backend-ready fields
				autoCloseAt: conv.metadata?.autoCloseAt || undefined,
				isArchived: conv.metadata?.isArchived || false,
				createdAt: conv.createdAt,
				updatedAt: conv.updatedAt,
				userLastReadAt: conv.userLastReadAt ?? null,
				adminLastReadAt: conv.adminLastReadAt ?? null,
				unreadCountAdmin: (conv as any).unreadCountAdmin ?? 0,
				unreadCountUser: (conv as any).unreadCountUser ?? 0,
				controlledBy: ((conv as any).controlledBy as "bot" | "admin") ?? "bot",
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
		console.error("Error getting conversation list:", error);
		throw new Error("Failed to get conversation list");
	}
}

/**
 * 6.1.3 Load conversation details with full message history
 * Load full conversation with messages, funnel interactions, and user profile
 */
export async function loadConversationDetails(
	user: AuthenticatedUser,
	conversationId: string,
): Promise<LiveChatConversation> {
	try {
		// Get conversation with all related data
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
				},
				funnelInteractions: {
					orderBy: [asc(funnelInteractions.createdAt)],
				},
			},
		});

		if (!conversation) {
			throw new Error("Conversation not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			conversation.funnel.userId !== user.id
		) {
			throw new Error("Access denied: You can only access conversations for your own funnels");
		}

		// Resolve user from users table by (whopUserId, experienceId)
		const dbUser = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, conversation.whopUserId),
				eq(users.experienceId, conversation.experienceId),
			),
			columns: { id: true, name: true, email: true, avatar: true },
		});
		const userInfo = dbUser
			? {
					id: dbUser.id,
					name: dbUser.name,
					email: dbUser.email ?? "unknown@example.com",
					avatar: dbUser.avatar ?? undefined,
					isOnline: false,
					lastSeen: conversation.updatedAt,
				}
			: {
					id: conversation.whopUserId,
					name: "Unknown User",
					email: "unknown@example.com",
					avatar: undefined,
					isOnline: false,
					lastSeen: conversation.updatedAt,
				};

		// Get last message
		const lastMessage = conversation.messages[conversation.messages.length - 1];
		const lastMessageText = lastMessage?.content || "No messages yet";

		// Map conversation status
		const statusMap = {
			active: "open",
			closed: "closed",
			archived: "closed",
		};

		const now = new Date();
		const adminLastReadAt = (conversation as any).adminLastReadAt ? new Date((conversation as any).adminLastReadAt) : null;
		const userLastReadAt = (conversation as any).userLastReadAt ? new Date((conversation as any).userLastReadAt) : null;

		return {
			id: conversation.id,
			userId: userInfo.id,
			user: {
				id: userInfo.id,
				name: userInfo.name,
				email: userInfo.email,
				avatar: userInfo.avatar,
				isOnline: userInfo.isOnline || false,
				lastSeen: userInfo.lastSeen || conversation.updatedAt,
			},
			funnelId: conversation.funnelId,
			funnelName: conversation.funnel.name,
			status: statusMap[conversation.status as keyof typeof statusMap] as "open" | "closed",
			startedAt: conversation.createdAt,
			lastMessageAt: lastMessage?.createdAt || conversation.updatedAt,
			lastMessage: lastMessageText,
			messageCount: conversation.messages.length,
			messages: conversation.messages.map((msg: any) => {
				const msgTime = new Date(msg.createdAt).getTime();
				const isUserMsg = msg.type === "user";
				const isRead = isUserMsg
					? (!!adminLastReadAt && msgTime <= adminLastReadAt.getTime())
					: (!!userLastReadAt && msgTime <= userLastReadAt.getTime());
				return {
					id: msg.id,
					conversationId: msg.conversationId,
					type: msg.type === "bot" ? "bot" : msg.type === "user" ? "user" : msg.type === "admin" ? "admin" : "system",
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
			userLastReadAt: (conversation as any).userLastReadAt ?? null,
			adminLastReadAt: (conversation as any).adminLastReadAt ?? null,
			unreadCountAdmin: (conversation as any).unreadCountAdmin ?? 0,
			unreadCountUser: (conversation as any).unreadCountUser ?? 0,
			controlledBy: ((conversation as any).controlledBy as "bot" | "admin") ?? "bot",
		};
	} catch (error) {
		console.error("Error loading conversation details:", error);
		throw new Error("Failed to load conversation details");
	}
}

/**
 * Mark conversation as read by user or admin (for read receipts)
 */
export async function markConversationRead(
	user: AuthenticatedUser,
	conversationId: string,
	side: "user" | "admin",
): Promise<{ success: boolean; error?: string }> {
	try {
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			columns: { id: true, whopUserId: true },
		});
		if (!conversation) {
			return { success: false, error: "Conversation not found" };
		}
		const now = new Date();
		if (side === "admin") {
			if (user.accessLevel !== "admin") {
				return { success: false, error: "Only admins can mark as read (admin)" };
			}
			await db
				.update(conversations)
				.set({
					adminLastReadAt: now,
					updatedAt: now,
					unreadCountAdmin: 0,
				})
				.where(eq(conversations.id, conversationId));
		} else {
			if (user.whopUserId !== conversation.whopUserId) {
				return { success: false, error: "Only the conversation user can mark as read (user)" };
			}
			await db
				.update(conversations)
				.set({
					userLastReadAt: now,
					updatedAt: now,
					unreadCountUser: 0,
				})
				.where(eq(conversations.id, conversationId));
		}
		return { success: true };
	} catch (error) {
		console.error("Error marking conversation read:", error);
		return { success: false, error: (error as Error).message };
	}
}

/**
 * Resolve conversation (back to bot): set controlled_by = 'bot', unread_count_admin = 0. Admin only.
 */
export async function resolveConversation(
	user: AuthenticatedUser,
	conversationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		if (user.accessLevel !== "admin") {
			return { success: false, error: "Only admins can resolve" };
		}
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			columns: { id: true },
		});
		if (!conversation) {
			return { success: false, error: "Conversation not found" };
		}
		const now = new Date();
		await db
			.update(conversations)
			.set({
				controlledBy: "bot",
				unreadCountAdmin: 0,
				updatedAt: now,
			})
			.where(eq(conversations.id, conversationId));
		return { success: true };
	} catch (error) {
		console.error("Error resolving conversation:", error);
		return { success: false, error: (error as Error).message };
	}
}

/**
 * 6.1.5 Send owner message to user
 * Send messages from owner to user and broadcast via WebSocket
 */
export async function sendOwnerMessage(
	user: AuthenticatedUser,
	conversationId: string,
	message: string,
	ownerId: string,
): Promise<{
	success: boolean;
	message?: any;
	error?: string;
}> {
	try {
		// Verify conversation exists and user has access
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation) {
			return {
				success: false,
				error: "Conversation not found",
			};
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			conversation.funnel.userId !== user.id
		) {
			return {
				success: false,
				error: "Access denied: You can only send messages to conversations for your own funnels",
			};
		}

		// Create the message
		const [newMessage] = await db
			.insert(messages)
			.values({
				conversationId: conversationId,
				type: "bot", // Owner messages are 'bot' type
				content: message,
				metadata: {
					senderId: ownerId,
					senderType: "owner",
					timestamp: new Date().toISOString(),
				},
			})
			.returning();

		// Update conversation timestamp
		await db
			.update(conversations)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		// Get experience for WebSocket targeting
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, user.experience.id),
		});

		console.log(`[LiveChat] ✅ Owner message saved`);

		return {
			success: true,
			message: {
				id: newMessage.id,
				conversationId: newMessage.conversationId,
				type: newMessage.type,
				content: newMessage.content,
				metadata: newMessage.metadata,
				createdAt: newMessage.createdAt,
			},
		};
	} catch (error) {
		console.error("Error sending owner message:", error);
		return {
			success: false,
			error: "Failed to send message",
		};
	}
}

/**
 * 6.2.2 Manage conversation (status changes, notes, archiving)
 */
export async function manageConversation(
	user: AuthenticatedUser,
	conversationId: string,
	action: {
		status?: "open" | "closed";
		notes?: string;
		archive?: boolean;
		assignTo?: string;
	},
): Promise<{
	success: boolean;
	conversation?: LiveChatConversation;
	error?: string;
}> {
	try {
		// Verify conversation exists and user has access
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation) {
			return {
				success: false,
				error: "Conversation not found",
			};
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			conversation.funnel.userId !== user.id
		) {
			return {
				success: false,
				error: "Access denied: You can only manage conversations for your own funnels",
			};
		}

		// Prepare update data
		const updateData: any = {
			updatedAt: new Date(),
		};

		// Handle status change
		if (action.status) {
			const statusMap = {
				open: "active",
				closed: "closed",
			};
			updateData.status = statusMap[action.status];
		}

		// Handle metadata updates
		const currentMetadata = conversation.metadata || {};
		const newMetadata = { ...currentMetadata };

		if (action.notes !== undefined) {
			newMetadata.notes = action.notes;
		}

		if (action.archive !== undefined) {
			newMetadata.isArchived = action.archive;
		}

		if (action.assignTo !== undefined) {
			newMetadata.assignedTo = action.assignTo;
		}

		updateData.metadata = newMetadata;

		// Update conversation
		await db
			.update(conversations)
			.set(updateData)
			.where(eq(conversations.id, conversationId));

		// When merchant closes conversation, optionally start a new one if a funnel has delete_merchant_conversation trigger
		if (action.status === "closed") {
			startConversationForMerchantClosedTrigger(conversation.experienceId, conversation.whopUserId).catch((err) => {
				console.error("[manageConversation] startConversationForMerchantClosedTrigger failed:", err);
			});
		}

		// Return updated conversation
		const updatedConversation = await loadConversationDetails(user, conversationId);

		return {
			success: true,
			conversation: updatedConversation,
		};
	} catch (error) {
		console.error("Error managing conversation:", error);
		return {
			success: false,
			error: "Failed to manage conversation",
		};
	}
}

/**
 * 6.2.3 Send owner response with different types
 */
export async function sendOwnerResponse(
	user: AuthenticatedUser,
	conversationId: string,
	message: string,
	type: "text" | "template" | "quick_response" | "scheduled" = "text",
): Promise<{
	success: boolean;
	message?: any;
	error?: string;
}> {
	try {
		// Verify conversation exists and user has access
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation) {
			return {
				success: false,
				error: "Conversation not found",
			};
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			conversation.funnel.userId !== user.id
		) {
			return {
				success: false,
				error: "Access denied: You can only send responses to conversations for your own funnels",
			};
		}

		// Prepare message metadata based on type
		const metadata: any = {
			senderId: user.id,
			senderType: "owner",
			responseType: type,
			timestamp: new Date().toISOString(),
		};

		// Handle different response types
		switch (type) {
			case "template":
				metadata.templateId = message; // Assuming message contains template ID
				break;
			case "quick_response":
				metadata.quickResponseId = message; // Assuming message contains quick response ID
				break;
			case "scheduled":
				metadata.scheduledFor = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes from now
				break;
		}

		// Create the message
		const [newMessage] = await db
			.insert(messages)
			.values({
				conversationId: conversationId,
				type: "bot", // Owner responses are 'bot' type
				content: message,
				metadata: metadata,
			})
			.returning();

		// Update conversation timestamp
		await db
			.update(conversations)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		console.log(`[LiveChat] ✅ Owner response saved`);

		return {
			success: true,
			message: {
				id: newMessage.id,
				conversationId: newMessage.conversationId,
				type: newMessage.type,
				content: newMessage.content,
				metadata: newMessage.metadata,
				createdAt: newMessage.createdAt,
			},
		};
	} catch (error) {
		console.error("Error sending owner response:", error);
		return {
			success: false,
			error: "Failed to send response",
		};
	}
}

/**
 * 6.2.4 Get conversation analytics
 */
export async function getConversationAnalytics(
	user: AuthenticatedUser,
	conversationId: string,
): Promise<{
	success: boolean;
	analytics?: LiveChatAnalytics;
	error?: string;
}> {
	try {
		// Verify conversation exists and user has access
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
				},
				funnelInteractions: {
					orderBy: [asc(funnelInteractions.createdAt)],
				},
			},
		});

		if (!conversation) {
			return {
				success: false,
				error: "Conversation not found",
			};
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			conversation.funnel.userId !== user.id
		) {
			return {
				success: false,
				error: "Access denied: You can only view analytics for conversations of your own funnels",
			};
		}

		// Calculate analytics
		const totalMessages = conversation.messages.length;
		const userMessages = conversation.messages.filter((msg: any) => msg.type === "user").length;
		const botMessages = conversation.messages.filter((msg: any) => msg.type === "bot").length;

		// Calculate average response time (simplified)
		let avgResponseTime = 0;
		if (conversation.messages.length > 1) {
			const responseTimes: number[] = [];
			for (let i = 1; i < conversation.messages.length; i++) {
				const prevMsg = conversation.messages[i - 1];
				const currMsg = conversation.messages[i];
				
				if (prevMsg.type === "user" && currMsg.type === "bot") {
					const responseTime = currMsg.createdAt.getTime() - prevMsg.createdAt.getTime();
					responseTimes.push(responseTime);
				}
			}
			
			if (responseTimes.length > 0) {
				avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
			}
		}

		// Calculate conversation duration
		const conversationDuration = conversation.updatedAt.getTime() - conversation.createdAt.getTime();

		// Calculate funnel progress
		const funnelProgress = conversation.funnelInteractions.length > 0 ? 
			(conversation.funnelInteractions.length / 10) * 100 : 0; // Assuming 10 steps max

		// Get last activity
		const lastActivity = conversation.updatedAt;

		// Calculate engagement score (simplified)
		const engagementScore = Math.min(100, (userMessages * 10) + (funnelProgress * 0.5));

		const analytics: LiveChatAnalytics = {
			conversationId,
			totalMessages,
			userMessages,
			botMessages,
			avgResponseTime: 0, // TODO: Calculate actual response time
			conversationDuration: 0, // TODO: Calculate actual duration
			funnelProgress,
			lastActivity: new Date(),
			engagementScore,
		};

		return {
			success: true,
		};
	} catch (error) {
		console.error("Error getting conversation analytics:", error);
		return {
			success: false,
			error: "Failed to get analytics",
		};
	}
}
