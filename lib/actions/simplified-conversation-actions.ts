/**
 * Simplified Conversation Actions
 * 
 * Consolidated conversation management with minimal complexity.
 * Handles all conversation operations in one place.
 */

import { and, eq, desc, asc } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, messages, funnelInteractions, funnels } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import type { FunnelFlow } from "../types/funnel";

export interface Conversation {
	id: string;
	experienceId: string;
	funnelId: string;
	whopUserId: string;
	status: "active" | "completed" | "abandoned";
	currentBlockId?: string;
	userPath?: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Message {
	id: string;
	conversationId: string;
	type: "user" | "bot";
	content: string;
	createdAt: Date;
}

export interface ConversationWithMessages extends Conversation {
	messages: Message[];
	funnel: {
		id: string;
		name: string;
		isDeployed: boolean;
	};
}

/**
 * Get conversation by ID with messages
 */
export async function getConversationById(
	conversationId: string,
	experienceId: string,
): Promise<ConversationWithMessages | null> {
	try {
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId),
			),
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
				},
			},
		});

		if (!conversation) {
			return null;
		}

		return {
			id: conversation.id,
			experienceId: conversation.experienceId,
			funnelId: conversation.funnelId,
			whopUserId: conversation.whopUserId,
			status: conversation.status,
			currentBlockId: conversation.currentBlockId,
			userPath: conversation.userPath as string[],
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
			messages: conversation.messages.map((msg: any) => ({
				id: msg.id,
				conversationId: msg.conversationId,
				type: msg.type as "user" | "bot",
				content: msg.content,
				createdAt: msg.createdAt,
			})),
			funnel: {
				id: conversation.funnel.id,
				name: conversation.funnel.name,
				isDeployed: conversation.funnel.isDeployed,
			},
		};
	} catch (error) {
		console.error("Error getting conversation by ID:", error);
		throw error;
	}
}

/**
 * Find user conversation by whopUserId and experienceId
 */
export async function findUserConversation(
	whopUserId: string,
	experienceId: string,
): Promise<ConversationWithMessages | null> {
	try {
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.whopUserId, whopUserId),
				eq(conversations.experienceId, experienceId),
				eq(conversations.status, "active"),
			),
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
				},
			},
		});

		if (!conversation) {
			return null;
		}

		return {
			id: conversation.id,
			experienceId: conversation.experienceId,
			funnelId: conversation.funnelId,
			whopUserId: conversation.whopUserId,
			status: conversation.status,
			currentBlockId: conversation.currentBlockId,
			userPath: conversation.userPath as string[],
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
			messages: conversation.messages.map((msg: any) => ({
				id: msg.id,
				conversationId: msg.conversationId,
				type: msg.type as "user" | "bot",
				content: msg.content,
				createdAt: msg.createdAt,
			})),
			funnel: {
				id: conversation.funnel.id,
				name: conversation.funnel.name,
				isDeployed: conversation.funnel.isDeployed,
			},
		};
	} catch (error) {
		console.error("Error finding user conversation:", error);
		throw error;
	}
}

/**
 * Create a new conversation
 */
export async function createConversation(
	experienceId: string,
	funnelId: string,
	whopUserId: string,
	startBlockId: string,
): Promise<string> {
	try {
		// Close any existing active conversations for this user
		await db.update(conversations)
			.set({
				status: "completed",
				updatedAt: new Date(),
			})
			.where(and(
				eq(conversations.whopUserId, whopUserId),
				eq(conversations.experienceId, experienceId),
				eq(conversations.status, "active"),
			));

		// Create new conversation
		const [newConversation] = await db.insert(conversations).values({
			experienceId,
			funnelId,
			whopUserId,
			status: "active",
			currentBlockId: startBlockId,
			userPath: [startBlockId],
		}).returning();

		return newConversation.id;
	} catch (error) {
		console.error("Error creating conversation:", error);
		throw error;
	}
}

/**
 * Add message to conversation
 */
export async function addMessage(
	conversationId: string,
	type: "user" | "bot",
	content: string,
): Promise<string> {
	try {
		const [newMessage] = await db.insert(messages).values({
			conversationId,
			type,
			content,
		}).returning();

		return newMessage.id;
	} catch (error) {
		console.error("Error adding message:", error);
		throw error;
	}
}

/**
 * Update conversation current block and user path
 */
export async function updateConversationBlock(
	conversationId: string,
	blockId: string,
	userPath: string[],
	experienceId: string,
): Promise<void> {
	try {
		await db.update(conversations)
			.set({
				currentBlockId: blockId,
				userPath,
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));
	} catch (error) {
		console.error("Error updating conversation block:", error);
		throw error;
	}
}

/**
 * Complete conversation
 */
export async function completeConversation(conversationId: string): Promise<void> {
	try {
		await db.update(conversations)
			.set({
				status: "completed",
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));
	} catch (error) {
		console.error("Error completing conversation:", error);
		throw error;
	}
}

/**
 * Process user message through funnel system
 */
export async function processUserMessage(
	conversationId: string,
	messageContent: string,
	experienceId: string,
): Promise<{
	success: boolean;
	botMessage?: string;
	nextBlockId?: string;
	error?: string;
}> {
	try {
		// Get conversation with funnel (filtered by experience for multi-tenancy)
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId)
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation || !conversation.funnel?.flow) {
			return { success: false, error: "Conversation or funnel not found" };
		}

		const funnelFlow = conversation.funnel.flow as FunnelFlow;
		const currentBlock = funnelFlow.blocks[conversation.currentBlockId || ""];

		if (!currentBlock) {
			return { success: false, error: "Current block not found" };
		}

		// Add user message
		await addMessage(conversationId, "user", messageContent);

		// Validate user response
		const validationResult = validateUserResponse(messageContent, currentBlock);

		if (!validationResult.isValid) {
			return {
				success: true,
				botMessage: validationResult.errorMessage || "Please select a valid option.",
			};
		}

		// Navigate to next block
		if (validationResult.selectedOption) {
			const nextBlockId = validationResult.selectedOption.nextBlockId;
			
			// Update conversation
			const newUserPath = [...(conversation.userPath || []), nextBlockId].filter(Boolean);
			await updateConversationBlock(conversationId, nextBlockId, newUserPath, conversation.experienceId);

			// Record interaction
			await db.insert(funnelInteractions).values({
				conversationId,
				blockId: conversation.currentBlockId!,
				optionText: validationResult.selectedOption.text,
				nextBlockId,
			});

			// Get next block message
			const nextBlock = nextBlockId ? funnelFlow.blocks[nextBlockId] : null;
			const botMessage = nextBlock?.message || "Thank you for your response!";

			// Add bot message
			await addMessage(conversationId, "bot", botMessage);

			return {
				success: true,
				botMessage,
				nextBlockId,
			};
		}

		return { success: false, error: "No valid option selected" };
	} catch (error) {
		console.error("Error processing user message:", error);
		return { success: false, error: "Failed to process message" };
	}
}

/**
 * Validate user response against current block options
 */
function validateUserResponse(
	userMessage: string,
	currentBlock: any,
): {
	isValid: boolean;
	selectedOption?: any;
	errorMessage?: string;
} {
	try {
		const normalizedInput = userMessage.trim().toLowerCase();

		// Check for exact text matches
		for (const option of currentBlock.options || []) {
			if (option.text.toLowerCase() === normalizedInput) {
				return {
					isValid: true,
					selectedOption: option,
				};
			}
		}

		// Check for number selection (1, 2, 3...)
		const numberMatch = normalizedInput.match(/^(\d+)$/);
		if (numberMatch) {
			const optionIndex = parseInt(numberMatch[1]) - 1;
			if (optionIndex >= 0 && optionIndex < (currentBlock.options || []).length) {
				return {
					isValid: true,
					selectedOption: currentBlock.options[optionIndex],
				};
			}
		}

		// Invalid response
		return {
			isValid: false,
			errorMessage: `Please select one of the following options:\n${(currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. ${opt.text}`).join('\n')}`,
		};
	} catch (error) {
		console.error("Error validating user response:", error);
		return {
			isValid: false,
			errorMessage: "Invalid response. Please try again.",
		};
	}
}

/**
 * Transition conversation to EXPERIENCE_QUALIFICATION stage
 * 
 * @param conversationId - ID of the conversation to transition
 * @param experienceId - Experience ID for multi-tenant isolation
 * @returns Success status
 */
export async function transitionToInternalChat(
	conversationId: string,
	experienceId: string,
): Promise<boolean> {
	try {
		console.log(`Transitioning conversation ${conversationId} to EXPERIENCE_QUALIFICATION stage`);

		// Get the conversation
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId),
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation) {
			throw new Error(`Conversation ${conversationId} not found`);
		}

		if (!conversation.funnel || !conversation.funnel.flow) {
			throw new Error(`Funnel not found or has no flow for conversation ${conversationId}`);
		}

		const funnelFlow = conversation.funnel.flow as FunnelFlow;

		// Find the first EXPERIENCE_QUALIFICATION block (start of Funnel 2)
		const experienceQualStage = funnelFlow.stages.find(
			stage => stage.name === "EXPERIENCE_QUALIFICATION"
		);

		if (!experienceQualStage || experienceQualStage.blockIds.length === 0) {
			throw new Error("No EXPERIENCE_QUALIFICATION stage found in funnel flow");
		}

		const firstExperienceQualBlockId = experienceQualStage.blockIds[0];

		// Update conversation to EXPERIENCE_QUALIFICATION stage
		await updateConversationBlock(conversationId, firstExperienceQualBlockId, [...(conversation.userPath || []), firstExperienceQualBlockId], conversation.experienceId);

		console.log(`Successfully transitioned conversation ${conversationId} to EXPERIENCE_QUALIFICATION stage`);

		return true;

	} catch (error) {
		console.error(`Error transitioning conversation ${conversationId} to internal chat:`, error);
		throw error;
	}
}

/**
 * Generate transition message with chat link
 * 
 * @param baseMessage - Base message template
 * @param conversationId - Conversation ID for the chat link
 * @param experienceId - Experience ID for the chat link
 * @returns Personalized transition message with working link
 */
export async function generateTransitionMessage(
	baseMessage: string,
	conversationId: string,
	experienceId: string,
): Promise<string> {
	try {
		// Generate the chat link
		const chatLink = await generateChatLink(conversationId, experienceId);

		// Replace placeholder with actual link
		const transitionMessage = baseMessage.replace(
			/\[LINK_TO_PRIVATE_CHAT\]/g,
			chatLink
		);

		return transitionMessage;

	} catch (error) {
		console.error(`Error generating transition message for conversation ${conversationId}:`, error);
		throw error;
	}
}

/**
 * Generate chat link for conversation
 * 
 * @param conversationId - Conversation ID
 * @param experienceId - Experience ID
 * @returns Full URL to the chat
 */
export async function generateChatLink(conversationId: string, experienceId: string): Promise<string> {
	try {
		// Get base URL from environment or use default
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
		
		// Construct the chat URL
		// Format: /experiences/[experienceId]/chat/[conversationId]
		const chatUrl = `${baseUrl}/experiences/${experienceId}/chat/${conversationId}`;
		
		// Validate URL format
		try {
			new URL(chatUrl);
			return chatUrl;
		} catch (urlError) {
			throw new Error(`Invalid chat URL generated: ${chatUrl}`);
		}

	} catch (error) {
		console.error(`Error generating chat link for conversation ${conversationId}:`, error);
		throw error;
	}
}

/**
 * Send transition message to user via DM
 * 
 * @param whopUserId - Whop user ID
 * @param message - Transition message to send
 * @returns Success status
 */
export async function sendTransitionMessage(
	whopUserId: string,
	message: string,
	experienceId: string,
): Promise<boolean> {
	try {
		console.log(`Sending transition message to user ${whopUserId}`);

		// Send DM using existing Whop SDK
		await whopSdk.messages.sendDirectMessageToUser({
			toUserIdOrUsername: whopUserId,
			message: message,
		});

		console.log(`Successfully sent transition message to user ${whopUserId}`);
		return true;

	} catch (error) {
		console.error(`Error sending transition message to user ${whopUserId}:`, error);
		return false;
	}
}

/**
 * Complete transition from DM to internal chat
 * 
 * @param conversationId - ID of the conversation to transition
 * @param experienceId - Experience ID
 * @param transitionMessage - Message to send to user
 * @returns Success status
 */
export async function completeDMToInternalTransition(
	conversationId: string,
	experienceId: string,
	transitionMessage: string,
): Promise<boolean> {
	try {
		console.log(`Completing DM to internal chat transition for conversation ${conversationId}`);

		// Step 1: Transition conversation to EXPERIENCE_QUALIFICATION stage
		await transitionToInternalChat(conversationId, experienceId);

		// Step 2: Generate and send transition message
		const personalizedMessage = await generateTransitionMessage(
			transitionMessage,
			conversationId,
			experienceId,
		);

		// Get user ID from conversation (filtered by experience for multi-tenancy)
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId)
			),
		});

		if (conversation?.whopUserId) {
			await sendTransitionMessage(
				conversation.whopUserId,
				personalizedMessage,
				experienceId,
			);
		}

		console.log(`Successfully completed DM to internal chat transition for conversation ${conversationId}`);

		return true;

	} catch (error) {
		console.error(`Error completing DM to internal chat transition:`, error);
		throw error;
	}
}

/**
 * Handle funnel completion in UserChat
 * 
 * @param conversationId - ID of the conversation to complete
 * @returns Success status
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

/**
 * Abandon conversation (set status to abandoned)
 * 
 * @param conversationId - ID of the conversation to abandon
 * @returns Success status
 */
export async function abandonConversation(
	conversationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		await db
			.update(conversations)
			.set({
				status: "abandoned",
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		return { success: true };
	} catch (error) {
		console.error("Error abandoning conversation:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Update conversation (simplified version)
 * 
 * @param conversationId - ID of the conversation to update
 * @param updates - Updates to apply
 * @returns Updated conversation
 */
export async function updateConversation(
	conversationId: string,
	experienceId: string,
	updates: {
		status?: "active" | "completed" | "abandoned";
		currentBlockId?: string;
		userPath?: string[];
	},
): Promise<ConversationWithMessages | null> {
	try {
		await db
			.update(conversations)
			.set({
				...updates,
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		// Get the updated conversation (filtered by experience for multi-tenancy)
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId)
			),
			with: {
				funnel: true,
				messages: {
					orderBy: [asc(messages.createdAt)],
				},
			},
		});

		if (!conversation) {
			return null;
		}

		return {
			id: conversation.id,
			experienceId: conversation.experienceId,
			funnelId: conversation.funnelId,
			whopUserId: conversation.whopUserId,
			status: conversation.status,
			currentBlockId: conversation.currentBlockId,
			userPath: conversation.userPath as string[],
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
			messages: conversation.messages.map((msg: any) => ({
				id: msg.id,
				conversationId: msg.conversationId,
				type: msg.type as "user" | "bot",
				content: msg.content,
				createdAt: msg.createdAt,
			})),
			funnel: {
				id: conversation.funnel.id,
				name: conversation.funnel.name,
				isDeployed: conversation.funnel.isDeployed,
			},
		};
	} catch (error) {
		console.error("Error updating conversation:", error);
		throw error;
	}
}
