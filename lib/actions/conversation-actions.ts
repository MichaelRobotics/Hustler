import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import type { ConversationWithMessages } from "../types/user";

// Re-export type for backward compatibility
export type { ConversationWithMessages };
import {
	conversations,
	funnelInteractions,
	funnels,
	messages,
} from "../supabase/schema";

export interface CreateConversationInput {
	funnelId: string;
	metadata?: any;
}

export interface UpdateConversationInput {
	status?: "active" | "completed" | "abandoned";
	currentBlockId?: string;
	userPath?: any;
	metadata?: any;
}

export interface CreateMessageInput {
	conversationId: string;
	type: "user" | "bot" | "system";
	content: string;
	metadata?: any;
}

export interface CreateInteractionInput {
	conversationId: string;
	blockId: string;
	optionText: string;
	nextBlockId?: string;
}


export interface ConversationListResponse {
	conversations: ConversationWithMessages[];
	total: number;
	page: number;
	limit: number;
}


/**
 * Create a new conversation
 */
export async function createConversation(
	user: AuthenticatedUser,
	input: CreateConversationInput,
): Promise<ConversationWithMessages> {
	try {
		// Verify funnel exists and belongs to user's company
		const funnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, input.funnelId),
				eq(funnels.experienceId, user.experience.id),
			),
		});

		if (!funnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && funnel.userId !== user.id) {
			throw new Error(
				"Access denied: You can only create conversations for your own funnels",
			);
		}

		// Create the conversation
		const [newConversation] = await db
			.insert(conversations)
			.values({
				experienceId: user.experience.id,
				funnelId: input.funnelId,
				status: "active",
				currentBlockId: null,
				userPath: null,
				metadata: input.metadata || null,
			})
			.returning();

		// Return conversation with empty messages and interactions
		return {
			id: newConversation.id,
			funnelId: newConversation.funnelId,
			status: newConversation.status,
			currentBlockId: newConversation.currentBlockId || undefined,
			userPath: newConversation.userPath,
			metadata: newConversation.metadata,
			createdAt: newConversation.createdAt,
			updatedAt: newConversation.updatedAt,
			messages: [],
			interactions: [],
			funnel: {
				id: funnel.id,
				name: funnel.name,
				isDeployed: funnel.isDeployed,
			},
		};
	} catch (error) {
		console.error("Error creating conversation:", error);
		throw new Error("Failed to create conversation");
	}
}

/**
 * Get conversation by ID with messages and interactions
 */
export async function getConversationById(
	user: AuthenticatedUser,
	conversationId: string,
): Promise<ConversationWithMessages> {
	try {
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				messages: {
					orderBy: [asc(messages.createdAt)],
				},
				funnelInteractions: {
					orderBy: [asc(funnelInteractions.createdAt)],
				},
				funnel: true,
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
			throw new Error(
				"Access denied: You can only access conversations for your own funnels",
			);
		}

		return {
			id: conversation.id,
			funnelId: conversation.funnelId,
			status: conversation.status,
			currentBlockId: conversation.currentBlockId || undefined,
			userPath: conversation.userPath,
			metadata: conversation.metadata,
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
			messages: conversation.messages.map((msg: any) => ({
				id: msg.id,
				type: msg.type,
				content: msg.content,
				metadata: msg.metadata,
				createdAt: msg.createdAt,
			})),
			interactions: conversation.funnelInteractions.map((interaction: any) => ({
				id: interaction.id,
				blockId: interaction.blockId,
				optionText: interaction.optionText,
				nextBlockId: interaction.nextBlockId || undefined,
				createdAt: interaction.createdAt,
			})),
			funnel: {
				id: conversation.funnel.id,
				name: conversation.funnel.name,
				isDeployed: conversation.funnel.isDeployed,
			},
		};
	} catch (error) {
		console.error("Error getting conversation:", error);
		throw error;
	}
}

/**
 * Get all conversations for user/company with pagination
 */
export async function getConversations(
	user: AuthenticatedUser,
	page = 1,
	limit = 10,
	search?: string,
	status?: "active" | "completed" | "abandoned",
	funnelId?: string,
): Promise<ConversationListResponse> {
	try {
		const offset = (page - 1) * limit;

		// Build where conditions
		let whereConditions = eq(conversations.experienceId, user.experience.id);

		// Add funnel filter
		if (funnelId) {
			whereConditions = and(
				whereConditions,
				eq(conversations.funnelId, funnelId),
			)!;
		}

		// Add status filter
		if (status) {
			whereConditions = and(whereConditions, eq(conversations.status, status))!;
		}

		// Add search filter (search in funnel name)
		if (search) {
			whereConditions = and(
				whereConditions,
				sql`EXISTS (
          SELECT 1 FROM funnels 
          WHERE funnels.id = conversations.funnel_id 
          AND funnels.name ILIKE ${"%" + search + "%"}
        )`,
			)!;
		}

		// For customers, filter by their funnels
		if (user.accessLevel === "customer") {
			whereConditions = and(
				whereConditions,
				sql`EXISTS (
          SELECT 1 FROM funnels 
          WHERE funnels.id = conversations.funnel_id 
          AND funnels.user_id = ${user.id}
        )`,
			)!;
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(conversations)
			.where(whereConditions);

		const total = totalResult.count;

		// Get conversations with messages and interactions
		const conversationsList = await db.query.conversations.findMany({
			where: whereConditions,
			with: {
				messages: {
					orderBy: [asc(messages.createdAt)],
					limit: 50, // Limit messages per conversation for performance
				},
				funnelInteractions: {
					orderBy: [asc(funnelInteractions.createdAt)],
				},
				funnel: true,
			},
			orderBy: [desc(conversations.updatedAt)],
			limit: limit,
			offset: offset,
		});

		const conversationsWithMessages: ConversationWithMessages[] =
			conversationsList.map((conversation: any) => ({
				id: conversation.id,
				funnelId: conversation.funnelId,
				status: conversation.status,
				currentBlockId: conversation.currentBlockId || undefined,
				userPath: conversation.userPath,
				metadata: conversation.metadata,
				createdAt: conversation.createdAt,
				updatedAt: conversation.updatedAt,
				messages: conversation.messages.map((msg: any) => ({
					id: msg.id,
					type: msg.type,
					content: msg.content,
					metadata: msg.metadata,
					createdAt: msg.createdAt,
				})),
				interactions: conversation.funnelInteractions.map(
					(interaction: any) => ({
						id: interaction.id,
						blockId: interaction.blockId,
						optionText: interaction.optionText,
						nextBlockId: interaction.nextBlockId || undefined,
						createdAt: interaction.createdAt,
					}),
				),
				funnel: {
					id: conversation.funnel.id,
					name: conversation.funnel.name,
					isDeployed: conversation.funnel.isDeployed,
				},
			}));

		return {
			conversations: conversationsWithMessages,
			total,
			page,
			limit,
		};
	} catch (error) {
		console.error("Error getting conversations:", error);
		throw new Error("Failed to get conversations");
	}
}

/**
 * Update conversation
 */
export async function updateConversation(
	user: AuthenticatedUser,
	conversationId: string,
	input: UpdateConversationInput,
): Promise<ConversationWithMessages> {
	try {
		// Check if conversation exists and user has access
		const existingConversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
			},
		});

		if (!existingConversation) {
			throw new Error("Conversation not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			existingConversation.funnel.userId !== user.id
		) {
			throw new Error(
				"Access denied: You can only update conversations for your own funnels",
			);
		}

		// Update conversation
		const [updatedConversation] = await db
			.update(conversations)
			.set({
				status: input.status || existingConversation.status,
				currentBlockId:
					input.currentBlockId !== undefined
						? input.currentBlockId
						: existingConversation.currentBlockId,
				userPath:
					input.userPath !== undefined
						? input.userPath
						: existingConversation.userPath,
				metadata:
					input.metadata !== undefined
						? input.metadata
						: existingConversation.metadata,
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId))
			.returning();

		// Return updated conversation with messages and interactions
		return await getConversationById(user, conversationId);
	} catch (error) {
		console.error("Error updating conversation:", error);
		throw error;
	}
}

/**
 * Create a message in a conversation
 */
export async function createMessage(
	user: AuthenticatedUser,
	input: CreateMessageInput,
): Promise<{
	id: string;
	type: "user" | "bot" | "system";
	content: string;
	metadata?: any;
	createdAt: Date;
}> {
	try {
		// Verify conversation exists and user has access
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, input.conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
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
			throw new Error(
				"Access denied: You can only add messages to conversations for your own funnels",
			);
		}

		// Create the message
		const [newMessage] = await db
			.insert(messages)
			.values({
				conversationId: input.conversationId,
				type: input.type,
				content: input.content,
				metadata: input.metadata || null,
			})
			.returning();

		// Real-time messaging moved to React hooks
		// Message will be broadcast via WebSocket in the frontend

		return {
			id: newMessage.id,
			type: newMessage.type,
			content: newMessage.content,
			metadata: newMessage.metadata,
			createdAt: newMessage.createdAt,
		};
	} catch (error) {
		console.error("Error creating message:", error);
		throw new Error("Failed to create message");
	}
}

/**
 * Get messages for a conversation
 */
/**
 * Update conversation from UserChat (without user authentication)
 * Used for internal chat sessions where user authentication is handled differently
 */
export async function updateConversationFromUserChat(
	conversationId: string,
	messageContent: string,
	messageType: "user" | "bot" | "system",
	metadata?: any,
): Promise<{ success: boolean; conversation?: ConversationWithMessages; error?: string }> {
	try {
		// Verify conversation exists
		const conversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, conversationId),
			with: {
				funnel: true,
				messages: {
					orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
				},
				interactions: {
					orderBy: (funnelInteractions: any, { asc }: any) => [asc(funnelInteractions.createdAt)],
				},
			},
		});

		if (!conversation) {
			return {
				success: false,
				error: "Conversation not found",
			};
		}

		// Create the message
		const [newMessage] = await db
			.insert(messages)
			.values({
				conversationId: conversationId,
				type: messageType,
				content: messageContent,
				metadata: metadata || null,
			})
			.returning();

		// Update conversation last message timestamp
		await db
			.update(conversations)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		// Return updated conversation
		const updatedConversation: ConversationWithMessages = {
			id: conversation.id,
			funnelId: conversation.funnelId,
			status: conversation.status,
			currentBlockId: conversation.currentBlockId || undefined,
			userPath: conversation.userPath,
			metadata: conversation.metadata,
			createdAt: conversation.createdAt,
			updatedAt: new Date(),
			messages: [...conversation.messages, {
				id: newMessage.id,
				type: newMessage.type as "user" | "bot" | "system",
				content: newMessage.content,
				metadata: newMessage.metadata,
				createdAt: newMessage.createdAt,
			}],
			interactions: conversation.interactions.map((interaction: any) => ({
				id: interaction.id,
				blockId: interaction.blockId,
				response: interaction.response,
				metadata: interaction.metadata,
				createdAt: interaction.createdAt,
			})),
			funnel: {
				id: conversation.funnel.id,
				name: conversation.funnel.name,
				isDeployed: conversation.funnel.isDeployed,
			},
		};

		return {
			success: true,
			conversation: updatedConversation,
		};
	} catch (error) {
		console.error("Error updating conversation from UserChat:", error);
		return {
			success: false,
			error: "Failed to update conversation",
		};
	}
}

export async function getMessages(
	user: AuthenticatedUser,
	conversationId: string,
	page = 1,
	limit = 50,
): Promise<{
	messages: Array<{
		id: string;
		type: "user" | "bot" | "system";
		content: string;
		metadata?: any;
		createdAt: Date;
	}>;
	total: number;
	page: number;
	limit: number;
}> {
	try {
		const offset = (page - 1) * limit;

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
			throw new Error("Conversation not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			conversation.funnel.userId !== user.id
		) {
			throw new Error(
				"Access denied: You can only view messages for conversations of your own funnels",
			);
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(messages)
			.where(eq(messages.conversationId, conversationId));

		const total = totalResult.count;

		// Get messages
		const messagesList = await db.query.messages.findMany({
			where: eq(messages.conversationId, conversationId),
			orderBy: [asc(messages.createdAt)],
			limit: limit,
			offset: offset,
		});

		return {
			messages: messagesList.map((msg: any) => ({
				id: msg.id,
				type: msg.type,
				content: msg.content,
				metadata: msg.metadata,
				createdAt: msg.createdAt,
			})),
			total,
			page,
			limit,
		};
	} catch (error) {
		console.error("Error getting messages:", error);
		throw new Error("Failed to get messages");
	}
}

/**
 * Create a funnel interaction
 */
export async function createInteraction(
	user: AuthenticatedUser,
	input: CreateInteractionInput,
): Promise<{
	id: string;
	blockId: string;
	optionText: string;
	nextBlockId?: string;
	createdAt: Date;
}> {
	try {
		// Verify conversation exists and user has access
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, input.conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
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
			throw new Error(
				"Access denied: You can only add interactions to conversations for your own funnels",
			);
		}

		// Create the interaction
		const [newInteraction] = await db
			.insert(funnelInteractions)
			.values({
				conversationId: input.conversationId,
				blockId: input.blockId,
				optionText: input.optionText,
				nextBlockId: input.nextBlockId || null,
			})
			.returning();

		return {
			id: newInteraction.id,
			blockId: newInteraction.blockId,
			optionText: newInteraction.optionText,
			nextBlockId: newInteraction.nextBlockId || undefined,
			createdAt: newInteraction.createdAt,
		};
	} catch (error) {
		console.error("Error creating interaction:", error);
		throw new Error("Failed to create interaction");
	}
}

/**
 * Get interactions for a conversation
 */
export async function getInteractions(
	user: AuthenticatedUser,
	conversationId: string,
): Promise<
	Array<{
		id: string;
		blockId: string;
		optionText: string;
		nextBlockId?: string;
		createdAt: Date;
	}>
> {
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
			throw new Error("Conversation not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			conversation.funnel.userId !== user.id
		) {
			throw new Error(
				"Access denied: You can only view interactions for conversations of your own funnels",
			);
		}

		// Get interactions
		const interactions = await db.query.funnelInteractions.findMany({
			where: eq(funnelInteractions.conversationId, conversationId),
			orderBy: [asc(funnelInteractions.createdAt)],
		});

		return interactions.map((interaction: any) => ({
			id: interaction.id,
			blockId: interaction.blockId,
			optionText: interaction.optionText,
			nextBlockId: interaction.nextBlockId || undefined,
			createdAt: interaction.createdAt,
		}));
	} catch (error) {
		console.error("Error getting interactions:", error);
		throw new Error("Failed to get interactions");
	}
}

/**
 * Complete a conversation
 */
export async function completeConversation(
	user: AuthenticatedUser,
	conversationId: string,
): Promise<ConversationWithMessages> {
	try {
		// Check if conversation exists and user has access
		const existingConversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
			},
		});

		if (!existingConversation) {
			throw new Error("Conversation not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			existingConversation.funnel.userId !== user.id
		) {
			throw new Error(
				"Access denied: You can only complete conversations for your own funnels",
			);
		}

		// Update conversation status
		const [updatedConversation] = await db
			.update(conversations)
			.set({
				status: "completed",
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId))
			.returning();

		// Return updated conversation with messages and interactions
		return await getConversationById(user, conversationId);
	} catch (error) {
		console.error("Error completing conversation:", error);
		throw error;
	}
}

/**
 * Abandon a conversation
 */
export async function abandonConversation(
	user: AuthenticatedUser,
	conversationId: string,
): Promise<ConversationWithMessages> {
	try {
		// Check if conversation exists and user has access
		const existingConversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, user.experience.id),
			),
			with: {
				funnel: true,
			},
		});

		if (!existingConversation) {
			throw new Error("Conversation not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			existingConversation.funnel.userId !== user.id
		) {
			throw new Error(
				"Access denied: You can only abandon conversations for your own funnels",
			);
		}

		// Update conversation status
		const [updatedConversation] = await db
			.update(conversations)
			.set({
				status: "abandoned",
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId))
			.returning();

		// Return updated conversation with messages and interactions
		return await getConversationById(user, conversationId);
	} catch (error) {
		console.error("Error abandoning conversation:", error);
		throw error;
	}
}

// ============================================================================
// CONSOLIDATED FUNCTIONS FROM userchat-actions.ts AND livechat-actions.ts
// ============================================================================

export interface LoadConversationResult {
	success: boolean;
	conversation?: ConversationWithMessages;
	funnelFlow?: any; // FunnelFlow type
	error?: string;
}

/**
 * Load conversation for user with access validation (consolidated from userchat-actions.ts)
 */
export async function loadConversationForUser(
	conversationId: string,
	experienceId: string,
): Promise<LoadConversationResult> {
	try {
		console.log(`Loading conversation ${conversationId} for experience ${experienceId}`);

		// Query conversation with user access validation
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId),
			),
			with: {
				funnel: true,
				messages: {
					orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
				},
				funnelInteractions: {
					orderBy: (funnelInteractions: any, { asc }: any) => [asc(funnelInteractions.createdAt)],
				},
			},
		});

		if (!conversation) {
			return {
				success: false,
				error: "Conversation not found",
			};
		}

		// Get funnel flow
		const funnelFlow = conversation.funnel?.flow;

		return {
			success: true,
			conversation,
			funnelFlow,
		};
	} catch (error) {
		console.error("Error loading conversation for user:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Navigate funnel in UserChat (consolidated from userchat-actions.ts)
 */
export async function navigateFunnelInUserChat(
	conversationId: string,
	messageContent: string,
	messageType: "user" | "bot" | "system" = "user",
): Promise<{ success: boolean; response?: any; error?: string }> {
	try {
		// Get conversation
		const conversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, conversationId),
			with: {
				funnel: true,
			},
		});

		if (!conversation) {
			return { success: false, error: "Conversation not found" };
		}

		// Record user message
		// Note: This function needs proper user context for full implementation
		// For now, we'll skip message recording in this simplified version
		console.log(`User message: ${messageContent} (type: ${messageType})`);

		// Process through funnel logic (simplified)
		// This would normally call the funnel processing logic
		const response = {
			type: "bot",
			content: "Thank you for your message. Processing...",
			timestamp: new Date(),
		};

		// Record bot response
		// Note: This function needs proper user context for full implementation
		// For now, we'll skip message recording in this simplified version
		console.log(`Bot response: ${response.content}`);

		return { success: true, response };
	} catch (error) {
		console.error("Error navigating funnel in UserChat:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Get conversation messages for UserChat (consolidated from userchat-actions.ts)
 */
export async function getConversationMessagesForUserChat(
	conversationId: string,
): Promise<{ success: boolean; messages?: any[]; error?: string }> {
	try {
		const conversationMessages = await db.query.messages.findMany({
			where: eq(messages.conversationId, conversationId),
			orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
		});

		return { success: true, messages: conversationMessages };
	} catch (error) {
		console.error("Error getting conversation messages for UserChat:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Handle funnel completion in UserChat (consolidated from userchat-actions.ts)
 */
export async function handleFunnelCompletionInUserChat(
	conversationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Update conversation status to completed
		await db
			.update(conversations)
			.set({
				status: "completed",
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		return { success: true };
	} catch (error) {
		console.error("Error handling funnel completion in UserChat:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
