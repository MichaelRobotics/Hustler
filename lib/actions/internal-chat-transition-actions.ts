/**
 * Internal Chat Transition Actions
 * 
 * Handles Phase 4: Transition to Internal Chat
 * Creates internal chat sessions, copies DM messages, and manages conversation linking
 */

import { and, eq, asc } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, funnels, messages } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import type { FunnelFlow } from "../types/funnel";

/**
 * Create internal chat session from completed DM conversation
 * 
 * @param dmConversationId - ID of the completed DM conversation
 * @param experienceId - Experience ID for multi-tenant isolation
 * @param funnelId - Funnel ID for the internal chat
 * @returns Internal conversation ID
 */
export async function createInternalChatSession(
	dmConversationId: string,
	experienceId: string,
	funnelId: string,
): Promise<string> {
	try {
		console.log(`Creating internal chat session for DM conversation ${dmConversationId}`);

		// Get the original DM conversation
		const dmConversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, dmConversationId),
				eq(conversations.experienceId, experienceId),
			),
			with: {
				funnel: true,
			},
		});

		if (!dmConversation) {
			throw new Error(`DM conversation ${dmConversationId} not found`);
		}

		// Get the funnel to access its flow
		const funnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, experienceId),
			),
		});

		if (!funnel || !funnel.flow) {
			throw new Error(`Funnel ${funnelId} not found or has no flow`);
		}

		const funnelFlow = funnel.flow as FunnelFlow;

		// Find the first EXPERIENCE_QUALIFICATION block (start of Funnel 2)
		const experienceQualStage = funnelFlow.stages.find(
			stage => stage.name === "EXPERIENCE_QUALIFICATION"
		);

		if (!experienceQualStage || experienceQualStage.blockIds.length === 0) {
			throw new Error("No EXPERIENCE_QUALIFICATION stage found in funnel flow");
		}

		const firstExperienceQualBlockId = experienceQualStage.blockIds[0];

		// Create internal conversation with type "internal" and phase "strategy_session"
		const [internalConversation] = await db.insert(conversations).values({
			experienceId: experienceId,
			funnelId: funnelId,
			status: "active",
			currentBlockId: firstExperienceQualBlockId,
			userPath: [firstExperienceQualBlockId], // Initialize with first Funnel 2 block
			metadata: {
				type: "internal",
				phase: "strategy_session",
				dmConversationId: dmConversationId,
				whopUserId: dmConversation.metadata?.whopUserId,
				whopProductId: dmConversation.metadata?.whopProductId,
				createdFromDM: true,
				adminTriggered: dmConversation.metadata?.adminTriggered || false, // Preserve admin triggered flag
				createdAt: new Date().toISOString(),
			},
		}).returning();

		console.log(`Created internal chat session ${internalConversation.id} for DM conversation ${dmConversationId}`);

		// Update DM conversation status to completed
		await db.update(conversations)
			.set({
				status: "completed",
				metadata: {
					...dmConversation.metadata,
					internalConversationId: internalConversation.id,
					transitionedAt: new Date().toISOString(),
				},
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, dmConversationId));

		return internalConversation.id;

	} catch (error) {
		console.error(`Error creating internal chat session for DM conversation ${dmConversationId}:`, error);
		throw error;
	}
}

/**
 * Copy DM messages to internal chat as system messages
 * 
 * @param dmConversationId - ID of the DM conversation
 * @param internalConversationId - ID of the internal conversation
 */
export async function copyDMMessagesToInternalChat(
	dmConversationId: string,
	internalConversationId: string,
): Promise<void> {
	try {
		console.log(`Copying DM messages from ${dmConversationId} to internal chat ${internalConversationId}`);

		// Get all messages from DM conversation
		const dmMessages = await db.query.messages.findMany({
			where: eq(messages.conversationId, dmConversationId),
			orderBy: [asc(messages.createdAt)],
		});

		if (dmMessages.length === 0) {
			console.log(`No messages found in DM conversation ${dmConversationId}`);
			return;
		}

		// Create regular user and bot messages in internal chat for each DM message
		for (const dmMessage of dmMessages) {
			// Create regular messages (user/bot) instead of system messages
			// This allows them to display properly in UserChat as conversation history
			await db.insert(messages).values({
				conversationId: internalConversationId,
				type: dmMessage.type, // Keep original type (user/bot)
				content: dmMessage.content, // Keep original content without prefix
				metadata: {
					originalMessageId: dmMessage.id,
					originalTimestamp: dmMessage.createdAt,
					dmHistory: true, // Flag to identify DM history messages
					dmPhase: true, // Flag to identify these came from DM phase
				},
			});
		}

		console.log(`Copied ${dmMessages.length} messages from DM conversation to internal chat`);

	} catch (error) {
		console.error(`Error copying DM messages to internal chat:`, error);
		throw error;
	}
}

/**
 * Initialize Funnel 2 for internal chat session
 * 
 * @param internalConversationId - ID of the internal conversation
 * @param funnelFlow - The funnel flow containing Funnel 2 blocks
 */
export async function initializeFunnel2(
	internalConversationId: string,
	funnelFlow: FunnelFlow,
): Promise<void> {
	try {
		console.log(`Initializing Funnel 2 for internal conversation ${internalConversationId}`);

		// Find the EXPERIENCE_QUALIFICATION stage (start of Funnel 2)
		const experienceQualStage = funnelFlow.stages.find(
			stage => stage.name === "EXPERIENCE_QUALIFICATION"
		);

		if (!experienceQualStage || experienceQualStage.blockIds.length === 0) {
			throw new Error("No EXPERIENCE_QUALIFICATION stage found in funnel flow");
		}

		const firstBlockId = experienceQualStage.blockIds[0];
		const firstBlock = funnelFlow.blocks[firstBlockId];

		if (!firstBlock) {
			throw new Error(`First EXPERIENCE_QUALIFICATION block ${firstBlockId} not found`);
		}

		// Update conversation with Funnel 2 initialization
		await db.update(conversations)
			.set({
				currentBlockId: firstBlockId,
				userPath: [firstBlockId],
				metadata: {
					type: "internal",
					phase: "strategy_session",
					funnel2Initialized: true,
					initializedAt: new Date().toISOString(),
				},
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, internalConversationId));

		// Create initial bot message for Funnel 2 with actual funnel block content
		// Format the message with options like in the funnel preview
		let formattedMessage = firstBlock.message || "Welcome to your Personal Strategy Session! Let's begin with some questions to understand your experience level.";
		
		// Add options if they exist
		if (firstBlock.options && firstBlock.options.length > 0) {
			const numberedOptions = firstBlock.options
				.map((option: any, index: number) => `${index + 1}. ${option.text}`)
				.join("\n");
			formattedMessage = `${formattedMessage}\n\n${numberedOptions}`;
		}
		
		await db.insert(messages).values({
			conversationId: internalConversationId,
			type: "bot",
			content: formattedMessage,
			metadata: {
				funnel2Start: true,
				blockId: firstBlockId,
				phase: "strategy_session",
			},
		});

		console.log(`Funnel 2 initialized for internal conversation ${internalConversationId}`);

	} catch (error) {
		console.error(`Error initializing Funnel 2 for internal conversation ${internalConversationId}:`, error);
		throw error;
	}
}

/**
 * Generate transition message with chat link
 * 
 * @param baseMessage - Base message template
 * @param internalChatId - Internal chat conversation ID
 * @returns Personalized transition message with working link
 */
export async function generateTransitionMessage(
	baseMessage: string,
	internalChatId: string,
	experienceId?: string,
): Promise<string> {
	try {
		// Generate the chat link
		const chatLink = await generateChatLink(internalChatId, experienceId);

		// Replace placeholder with actual link
		const transitionMessage = baseMessage.replace(
			/\[LINK_TO_PRIVATE_CHAT\]/g,
			chatLink
		);

		return transitionMessage;

	} catch (error) {
		console.error(`Error generating transition message for chat ${internalChatId}:`, error);
		throw error;
	}
}

/**
 * Generate chat link for internal conversation
 * 
 * @param internalChatId - Internal chat conversation ID
 * @returns Full URL to the internal chat
 */
export async function generateChatLink(internalChatId: string, experienceId?: string): Promise<string> {
	try {
		// Get base URL from environment or use default
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
		
		// Construct the chat URL
		// Format: /experiences/[experienceId]/chat/[conversationId]
		const chatUrl = experienceId 
			? `${baseUrl}/experiences/${experienceId}/chat/${internalChatId}`
			: `${baseUrl}/experiences/chat/${internalChatId}`;
		
		// Validate URL format
		try {
			new URL(chatUrl);
			return chatUrl;
		} catch (urlError) {
			throw new Error(`Invalid chat URL generated: ${chatUrl}`);
		}

	} catch (error) {
		console.error(`Error generating chat link for conversation ${internalChatId}:`, error);
		throw error;
	}
}

/**
 * Personalize transition message with user data
 * 
 * @param message - Base message
 * @param userData - User data for personalization
 * @returns Personalized message
 */
export async function personalizeTransitionMessage(
	message: string,
	userData: {
		whopUserId?: string;
		username?: string;
		experienceLevel?: string;
		selectedValue?: string;
	},
): Promise<string> {
	try {
		let personalizedMessage = message;

		// Replace username placeholder
		if (userData.username) {
			personalizedMessage = personalizedMessage.replace(
				/@\[Username\]/g,
				userData.username
			);
		}

		// Replace experience level placeholder
		if (userData.experienceLevel) {
			personalizedMessage = personalizedMessage.replace(
				/@\[ExperienceLevel\]/g,
				userData.experienceLevel
			);
		}

		// Replace selected value placeholder
		if (userData.selectedValue) {
			personalizedMessage = personalizedMessage.replace(
				/@\[SelectedValue\]/g,
				userData.selectedValue
			);
		}

		return personalizedMessage;

	} catch (error) {
		console.error("Error personalizing transition message:", error);
		return message; // Return original message if personalization fails
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
 * @param dmConversationId - ID of the completed DM conversation
 * @param experienceId - Experience ID
 * @param funnelId - Funnel ID for internal chat
 * @param transitionMessage - Message to send to user
 * @returns Internal conversation ID
 */
export async function completeDMToInternalTransition(
	dmConversationId: string,
	experienceId: string,
	funnelId: string,
	transitionMessage: string,
): Promise<string> {
	try {
		console.log(`Completing DM to internal chat transition for conversation ${dmConversationId}`);

		// Step 1: Create internal chat session
		const internalConversationId = await createInternalChatSession(
			dmConversationId,
			experienceId,
			funnelId,
		);

		// Step 2: Copy DM messages to internal chat
		await copyDMMessagesToInternalChat(dmConversationId, internalConversationId);

		// Step 3: Get funnel flow for Funnel 2 initialization
		const funnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, experienceId),
			),
		});

		if (!funnel || !funnel.flow) {
			throw new Error(`Funnel ${funnelId} not found or has no flow`);
		}

		// Step 4: Initialize Funnel 2
		await initializeFunnel2(internalConversationId, funnel.flow as FunnelFlow);

		// Step 5: Generate and send transition message
		const personalizedMessage = await generateTransitionMessage(
			transitionMessage,
			internalConversationId,
			experienceId,
		);

		// Get user ID from DM conversation metadata
		const dmConversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, dmConversationId),
		});

		if (dmConversation?.metadata?.whopUserId) {
			await sendTransitionMessage(
				dmConversation.metadata.whopUserId,
				personalizedMessage,
			);
		}

		console.log(`Successfully completed DM to internal chat transition. Internal conversation: ${internalConversationId}`);

		return internalConversationId;

	} catch (error) {
		console.error(`Error completing DM to internal chat transition:`, error);
		throw error;
	}
}
