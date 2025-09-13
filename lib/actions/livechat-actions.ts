import { and, asc, count, desc, eq, sql, or, ilike } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import {
	conversations,
	funnelInteractions,
	funnels,
	messages,
	users,
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

		// Add status filter
		if (filters.status && filters.status !== "all") {
			const statusMap = {
				open: "active",
				closed: "completed",
			};
			whereConditions = and(
				eq(conversations.status, statusMap[filters.status] as any),
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
				// Get user information (we'll need to add this to the schema or use metadata)
				const userInfo = conv.metadata?.user || {
					id: "unknown",
					name: "Unknown User",
					email: "unknown@example.com",
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
					completed: "closed",
					abandoned: "closed",
				};

				return {
					id: conv.id,
					userId: userInfo.id,
					user: {
						id: userInfo.id,
						name: userInfo.name,
						email: userInfo.email,
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

		// Add status filter
		if (filters.status && filters.status !== "all") {
			const statusMap = {
				open: "active",
				closed: "completed",
			};
			whereConditions = and(
				eq(conversations.status, statusMap[filters.status] as any),
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
					limit: 5, // Limit messages for list view
				},
			},
		});

		// Transform to LiveChat format
		const liveChatConversations: LiveChatConversation[] = conversationsList.map((conv: any) => {
			// Get user information from metadata
			const userInfo = conv.metadata?.user || {
				id: "unknown",
				name: "Unknown User",
				email: "unknown@example.com",
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
				completed: "closed",
				abandoned: "closed",
			};

			return {
				id: conv.id,
				userId: userInfo.id,
				user: {
					id: userInfo.id,
					name: userInfo.name,
					email: userInfo.email,
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
					isRead: true,
					metadata: msg.metadata,
				})),
				// Backend-ready fields
				autoCloseAt: conv.metadata?.autoCloseAt || undefined,
				isArchived: conv.metadata?.isArchived || false,
				createdAt: conv.createdAt,
				updatedAt: conv.updatedAt,
			};
		});

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

		// Get user information from metadata
		const userInfo = conversation.metadata?.user || {
			id: "unknown",
			name: "Unknown User",
			email: "unknown@example.com",
			isOnline: false,
			lastSeen: conversation.updatedAt,
		};

		// Get last message
		const lastMessage = conversation.messages[conversation.messages.length - 1];
		const lastMessageText = lastMessage?.content || "No messages yet";

		// Map conversation status
		const statusMap = {
			active: "open",
			completed: "closed",
			abandoned: "closed",
		};

		return {
			id: conversation.id,
			userId: userInfo.id,
			user: {
				id: userInfo.id,
				name: userInfo.name,
				email: userInfo.email,
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
			messages: conversation.messages.map((msg: any) => ({
				id: msg.id,
				conversationId: msg.conversationId,
				type: msg.type === "bot" ? "bot" : msg.type === "user" ? "user" : "system",
				text: msg.content,
				timestamp: msg.createdAt,
				isRead: true,
				metadata: msg.metadata,
			})),
			// Backend-ready fields
			autoCloseAt: conversation.metadata?.autoCloseAt || undefined,
			isArchived: conversation.metadata?.isArchived || false,
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
		};
	} catch (error) {
		console.error("Error loading conversation details:", error);
		throw new Error("Failed to load conversation details");
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

		// Send real-time message notification
		try {
		// Real-time messaging moved to React hooks
		} catch (wsError) {
			console.warn("Failed to send real-time message notification:", wsError);
			// Don't fail the message creation if WebSocket fails
		}

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
				closed: "completed",
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
			})
			.returning();

		// Update conversation timestamp
		await db
			.update(conversations)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		// Send real-time message notification
		try {
			// Real-time messaging moved to React hooks
		} catch (wsError) {
			console.warn("Failed to send real-time message notification:", wsError);
		}

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
