/**
 * Simplified Conversation Actions
 * 
 * Consolidated conversation management with minimal complexity.
 * Handles all conversation operations in one place.
 */

import { and, eq, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, messages, funnelInteractions, funnels, funnelAnalytics, experiences, users } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import type { FunnelFlow, FunnelBlock } from "../types/funnel";
import { updateFunnelGrowthPercentages } from "./funnel-actions";
import { safeBackgroundTracking, trackInterestBackground } from "../analytics/background-tracking";

export interface Conversation {
	id: string;
	experienceId: string;
	funnelId: string;
	whopUserId: string;
	status: "active" | "closed" | "abandoned";
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
	whopProductId?: string;
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
			whopProductId: conversation.whopProductId,
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
 * Create a new conversation
 */
export async function createConversation(
	experienceId: string,
	funnelId: string,
	whopUserId: string,
	startBlockId: string,
	membershipId?: string,
	whopProductId?: string,
): Promise<string> {
	try {
		console.log(`[CREATE-CONVERSATION] Starting conversation creation for whopUserId ${whopUserId} in experience ${experienceId}`);
		
		// Delete any existing conversations for this user
		// First, get conversation IDs to delete related data
		const existingConversations = await db.query.conversations.findMany({
			where: and(
				eq(conversations.whopUserId, whopUserId),
				eq(conversations.experienceId, experienceId)
			),
			columns: { id: true }
		});

		if (existingConversations.length > 0) {
			const conversationIds = existingConversations.map((c: any) => c.id);

			// Delete related data first (foreign key constraints)
			await db.delete(messages).where(inArray(messages.conversationId, conversationIds));
			await db.delete(funnelInteractions).where(inArray(funnelInteractions.conversationId, conversationIds));

			// Delete conversations
			const deleteResult = await db
				.delete(conversations)
				.where(and(
					eq(conversations.whopUserId, whopUserId),
					eq(conversations.experienceId, experienceId)
				));
			
			console.log(`[CREATE-CONVERSATION] Deleted ${deleteResult.rowCount || 0} existing conversations for whopUserId ${whopUserId}`);
		} else {
			console.log(`[CREATE-CONVERSATION] No existing conversations found for whopUserId ${whopUserId}`);
		}

		// Create new conversation
		console.log(`[CREATE-CONVERSATION] Creating new conversation with funnelId ${funnelId}, startBlockId ${startBlockId}, whopProductId ${whopProductId}`);
		const [newConversation] = await db.insert(conversations).values({
			experienceId,
			funnelId,
			whopUserId,
			membershipId,
			whopProductId,
			status: "active",
			currentBlockId: startBlockId,
			userPath: [startBlockId],
		}).returning();

		console.log(`[CREATE-CONVERSATION] Successfully created conversation ${newConversation.id} for whopUserId ${whopUserId}`);
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
		console.log(`[addMessage] Inserting message for conversation ${conversationId}:`, {
			type,
			content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
		});

		const [newMessage] = await db.insert(messages).values({
			conversationId,
			type,
			content,
		}).returning();

		// If this is a bot message, increment the sends counter for the funnel
		if (type === "bot") {
			try {
				// Get the conversation to find the funnelId
				const conversation = await db.query.conversations.findFirst({
					where: eq(conversations.id, conversationId),
				});

				if (conversation?.funnelId) {
					// Increment the sends field for this funnel
					await db.update(funnels)
						.set({ 
							sends: sql`${funnels.sends} + 1`,
							updatedAt: new Date()
						})
						.where(eq(funnels.id, conversation.funnelId));
					
					console.log(`[addMessage] Incremented sends counter for funnel ${conversation.funnelId}`);
				} else {
					console.warn(`[addMessage] No funnelId found for conversation ${conversationId}`);
				}
			} catch (sendsError) {
				// Don't fail the message insertion if sends update fails
				console.error(`[addMessage] Error updating sends counter:`, sendsError);
			}
		}

		console.log(`[addMessage] Message inserted successfully with ID: ${newMessage.id}`);
		return newMessage.id;
	} catch (error) {
		console.error("Error adding message:", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			conversationId,
			type,
			content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
		});
		throw error;
	}
}




/**
 * Process user message through funnel system
 * This function handles both valid funnel navigation and escalation logic
 */
export async function processUserMessage(
	conversationId: string,
	messageContent: string,
	experienceId: string,
): Promise<{
	success: boolean;
	botMessage?: string;
	nextBlockId?: string;
	escalationLevel?: number;
	error?: string;
}> {
	try {
		console.log(`[processUserMessage] Processing message for conversation ${conversationId}:`, messageContent);
		
		// Get conversation with funnel data (same as navigate-funnel)
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId)
			),
			with: {
				funnel: true,
				messages: {
					orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)],
				},
			},
		});

		if (!conversation) {
			console.error(`[processUserMessage] Conversation not found for ${conversationId}`);
			return { success: false, error: "Conversation not found" };
		}

		if (!conversation.funnel?.flow) {
			console.error(`[processUserMessage] Funnel flow not found for conversation ${conversationId}`);
			return { success: false, error: "Funnel flow not found" };
		}

		const funnelFlow = conversation.funnel.flow as FunnelFlow;
		const currentBlockId = conversation.currentBlockId;

		if (!currentBlockId) {
			console.error(`[processUserMessage] No current block ID for conversation ${conversationId}`);
			return { success: false, error: "No current block ID" };
		}

		// Find the current block
		const currentBlock = funnelFlow.blocks[currentBlockId];
		if (!currentBlock) {
			console.error(`[processUserMessage] Current block ${currentBlockId} not found`);
			return { success: false, error: "Current block not found" };
		}

		// Check if current block is in OFFER stage
		const isOfferStage = funnelFlow.stages.some(
			stage => stage.name === 'OFFER' && stage.blockIds.includes(currentBlockId)
		);

		console.log(`[processUserMessage] Current block: ${currentBlockId}`, {
			message: currentBlock.message?.substring(0, 100),
			optionsCount: currentBlock.options?.length || 0,
			isOfferStage: isOfferStage
		});

		// First, add the user message to the database
		console.log(`[processUserMessage] Adding user message to conversation ${conversationId}:`, messageContent);
		const userMessageId = await addMessage(conversationId, "user", messageContent);
		console.log(`[processUserMessage] User message added with ID: ${userMessageId}`);

		// Try to find a matching option (same logic as navigate-funnel)
		const selectedOption = currentBlock.options?.find(opt => {
			const optionText = opt.text.toLowerCase().trim();
			const searchText = messageContent.toLowerCase().trim();
			
			return optionText === searchText || 
				   optionText.includes(searchText) ||
				   searchText.includes(optionText);
		});

		// Check for number selection (1, 2, 3...)
		if (!selectedOption) {
			const numberMatch = messageContent.trim().match(/^(\d+)$/);
			if (numberMatch) {
				const optionIndex = parseInt(numberMatch[1]) - 1;
				if (optionIndex >= 0 && optionIndex < (currentBlock.options || []).length) {
					const foundOption = currentBlock.options[optionIndex];
					console.log(`[processUserMessage] Found option by number: ${optionIndex + 1} -> "${foundOption.text}"`);
					
					// Process the valid option selection
					return await processValidOptionSelection(
						conversationId,
						messageContent,
						foundOption,
						currentBlockId,
						funnelFlow,
						experienceId
					);
				}
			}
		} else {
			console.log(`[processUserMessage] Found matching option: "${selectedOption.text}"`);
			
			// Process the valid option selection
			return await processValidOptionSelection(
				conversationId,
				messageContent,
				selectedOption,
				currentBlockId,
				funnelFlow,
				experienceId
			);
		}

		// No valid option found - handle escalation (unless in OFFER stage)
		if (isOfferStage) {
			console.log(`[processUserMessage] In OFFER stage - escalation disabled for: "${messageContent}"`);
			// In OFFER stage, just acknowledge the message without escalation
			const acknowledgmentMessage = "Thank you for your message. I'll make sure the Whop owner sees it.";
			const botMessageId = await addMessage(conversationId, "bot", acknowledgmentMessage);
			console.log(`[processUserMessage] Bot acknowledgment message added with ID: ${botMessageId}`);
			
			return {
				success: true,
				botMessage: acknowledgmentMessage,
			};
		} else {
			console.log(`[processUserMessage] No valid option found, handling escalation for: "${messageContent}"`);
			return await handleEscalation(conversationId, messageContent, currentBlock);
		}

	} catch (error) {
		console.error("Error processing user message:", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			conversationId,
			messageContent,
			experienceId,
		});
		return { success: false, error: "Failed to process message" };
	}
}

/**
 * Process valid option selection (same logic as navigate-funnel)
 */
async function processValidOptionSelection(
	conversationId: string,
	messageContent: string,
	selectedOption: any,
	currentBlockId: string,
	funnelFlow: FunnelFlow,
	experienceId: string
): Promise<{
	success: boolean;
	botMessage?: string;
	nextBlockId?: string;
	error?: string;
}> {
	try {
		const nextBlockId = selectedOption.nextBlockId;
		const nextBlock = nextBlockId ? funnelFlow.blocks[nextBlockId] : null;

		console.log(`[processValidOptionSelection] Navigating from ${currentBlockId} to ${nextBlockId}`);

		// Record the funnel interaction (same as navigate-funnel)
		await db.insert(funnelInteractions).values({
			conversationId: conversationId,
			blockId: currentBlockId,
			optionText: messageContent,
			optionValue: messageContent,
			nextBlockId: nextBlockId,
			metadata: {
				timestamp: new Date().toISOString(),
				userChoice: true,
			},
		});

		// Update conversation state (same as navigate-funnel)
		const updatedConversation = await db
			.update(conversations)
			.set({
				currentBlockId: nextBlockId,
				userPath: [...(await getCurrentUserPath(conversationId)), nextBlockId].filter(Boolean),
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId))
			.returning();

		// Generate bot response (same as navigate-funnel)
		let botMessage = null;
		if (nextBlock) {
			// Format bot message with options if available
			let formattedMessage = nextBlock.message || "Thank you for your response.";
			
			// UserChat system: Options are handled by frontend buttons
			// No need to add options to bot message text

			botMessage = formattedMessage;

			// Record bot message (same as navigate-funnel)
			await addMessage(conversationId, "bot", formattedMessage);
		}

		// Reset escalation level on valid response
		resetEscalationLevel(conversationId);

		console.log(`[processValidOptionSelection] Successfully processed option selection`);

		return {
			success: true,
			botMessage: botMessage || undefined,
			nextBlockId: nextBlockId || undefined,
		};

	} catch (error) {
		console.error("Error processing valid option selection:", error);
		return { success: false, error: "Failed to process option selection" };
	}
}

/**
 * Handle escalation for invalid responses
 */
async function handleEscalation(
	conversationId: string,
	messageContent: string,
	currentBlock: any
): Promise<{
	success: boolean;
	botMessage?: string;
	escalationLevel?: number;
	error?: string;
}> {
	try {
		// Get escalation level for this conversation
		const escalationLevel = getEscalationLevel(conversationId);
		
		// Progressive error messages based on escalation level
		let errorMessage: string;
		switch (escalationLevel) {
			case 1:
				errorMessage = `To start, send number/keyword\n${(currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. ${opt.text}`).join('\n')}`;
				break;
			case 2:
				errorMessage = `I'll inform the Whop owner about your request. Please wait for assistance.`;
				break;
			case 3:
				errorMessage = `I'm unable to help you further. Please contact the Whop owner directly.`;
				break;
			default:
				errorMessage = `To start, send number/keyword\n${(currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. ${opt.text}`).join('\n')}`;
		}

		// Increment escalation level
		incrementEscalationLevel(conversationId);

		// Add bot escalation message
		const botMessageId = await addMessage(conversationId, "bot", errorMessage);
		console.log(`[handleEscalation] Bot escalation message added with ID: ${botMessageId}, level: ${escalationLevel + 1}`);

		return {
			success: true,
			botMessage: errorMessage,
			escalationLevel: escalationLevel + 1,
		};

	} catch (error) {
		console.error("Error handling escalation:", error);
		return { success: false, error: "Failed to handle escalation" };
	}
}

/**
 * Get current user path for conversation
 */
async function getCurrentUserPath(conversationId: string): Promise<string[]> {
	try {
		const conversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, conversationId),
		});
		return (conversation?.userPath as string[]) || [];
	} catch (error) {
		console.error("Error getting current user path:", error);
		return [];
	}
}


// In-memory escalation tracking (in production, use Redis or database)
const escalationLevels = new Map<string, number>();

function getEscalationLevel(conversationId: string): number {
	return escalationLevels.get(conversationId) || 0;
}

function incrementEscalationLevel(conversationId: string): void {
	const current = escalationLevels.get(conversationId) || 0;
	escalationLevels.set(conversationId, Math.min(current + 1, 3));
}

function resetEscalationLevel(conversationId: string): void {
	escalationLevels.delete(conversationId);
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
		// Update conversation status to closed
		await db
			.update(conversations)
			.set({
				status: "closed",
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



// Tracking functions removed to prevent database conflicts and timeouts
