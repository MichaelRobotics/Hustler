import { db } from "@/lib/supabase/db-server";
import { conversations, users, experiences, funnels, messages } from "@/lib/supabase/schema";
import { eq, and, desc, asc, count, sql, or, ilike, inArray } from "drizzle-orm";
import type { AuthenticatedUser } from "@/lib/types/user";
import type { LiveChatConversation, LiveChatFilters, LiveChatPagination, LiveChatConversationResponse } from "@/lib/types/liveChat";
import type { FunnelFlow } from "@/lib/types/funnel";

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
 * Get all active conversations for an experience (for livechat admin view)
 * This mirrors the UserChat conversation lookup but returns all conversations
 */
export async function getLiveChatConversations(
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

		// First, find the database UUID for this Whop experience ID
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			throw new Error("Experience not found");
		}

		const { page, limit } = pagination;
		const offset = (page - 1) * limit;

		// Build where conditions - get ALL active conversations in this experience
		let whereConditions = and(
			eq(conversations.experienceId, experience.id), // Use database UUID, not Whop ID
			eq(conversations.status, "active")
		);

		// Add search filter
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

		// Get conversations with related data including user information
		const conversationsList = await db.query.conversations.findMany({
			where: whereConditions,
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
					// Load ALL messages for accurate last message display
				},
			},
			orderBy,
			limit,
			offset,
		});

		// Transform to LiveChat format
		const liveChatConversations: LiveChatConversation[] = await Promise.all(
			conversationsList.map(async (conv: any) => {
				// Get user data from database for this specific user
				const userData = await db.query.users.findFirst({
					where: and(
						eq(users.whopUserId, conv.whopUserId),
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
				
				// Simple online status calculation (not used for display)
				const lastActivity = userData?.updatedAt || conv.updatedAt;
				const isOnline = false; // Always false since we removed online indicators
				
				const userInfo = {
					id: userData?.id || conv.whopUserId,
					name: userData?.name || `User ${conv.whopUserId.slice(-8)}`,
					email: userData?.email || `${conv.whopUserId}@whop.com`,
					avatar: userData?.avatar || undefined,
					isOnline: isOnline,
					lastSeen: lastActivity,
				};

				// Get last message - ensure we have messages and they're properly ordered
				const messages = conv.messages || [];
				console.log(`[CONV-LIST] Conversation ${conv.id}: ${messages.length} messages loaded`);
				
				// Sort messages by createdAt to ensure proper order (safety check)
				const sortedMessages = messages.sort((a: any, b: any) => 
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
				);
				
				const lastMessage = sortedMessages[sortedMessages.length - 1];
				const lastMessageText = lastMessage?.content || "No messages yet";
				
				console.log(`[CONV-LIST] Conversation ${conv.id}: Last message = "${lastMessageText}"`);

				// Calculate message count
				const messageCount = sortedMessages.length;

				// Determine conversation stage based on current block
				const currentStage = determineConversationStage(conv.currentBlockId, conv.funnel?.flow as FunnelFlow);

				return {
					id: conv.id,
					userId: userInfo.id,
					user: userInfo,
					funnelId: conv.funnelId,
					funnelName: conv.funnel.name,
					status: "open" as const, // All active conversations are "open" for livechat
					startedAt: conv.createdAt,
					lastMessageAt: lastMessage?.createdAt || conv.updatedAt,
					lastMessage: lastMessageText,
					messages: sortedMessages.map((msg: any) => ({
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
					// LiveChat specific fields
					currentStage,
					whopUserId: conv.whopUserId,
					experienceId: conv.experienceId,
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

		// Get conversation with all related data
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experience.id), // Use database UUID, not Whop ID
				eq(conversations.status, "active")
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

		// Simple online status calculation (not used for display)
		const lastActivity = userData?.updatedAt || conversation.updatedAt;
		const isOnline = false; // Always false since we removed online indicators
		
		const userInfo = {
			id: userData?.id || conversation.whopUserId,
			name: userData?.name || `User ${conversation.whopUserId.slice(-8)}`,
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

		return {
			id: conversation.id,
			userId: userInfo.id,
			user: userInfo,
			funnelId: conversation.funnelId,
			funnelName: conversation.funnel.name,
			status: "open" as const,
			startedAt: conversation.createdAt,
			lastMessageAt: lastMessage?.createdAt || conversation.updatedAt,
			lastMessage: lastMessageText,
			messageCount: conversation.messages?.length || 0,
			messages: (conversation.messages || []).map((msg: any) => ({
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
			// LiveChat specific fields
			currentStage,
			whopUserId: conversation.whopUserId,
			experienceId: conversation.experienceId,
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

		// Get conversation to verify it exists and get whopUserId
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experience.id), // Use database UUID, not Whop ID
				eq(conversations.status, "active")
			),
		});

		if (!conversation) {
			throw new Error("Conversation not found");
		}

		// Add message to conversation
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

		// Update conversation timestamp
		await db
			.update(conversations)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		return {
			success: true,
			message: {
				id: newMessage.id,
				conversationId: newMessage.conversationId,
				type: newMessage.type,
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
