/**
 * DM Monitoring Actions
 * 
 * Handles polling-based message monitoring for Phase 2 and Phase 3 of the Two-Phase Chat Initiation System.
 * This service monitors Whop DMs for user responses and processes them through the funnel system.
 * Phase 3 adds progressive error handling and timeout management.
 */

import { and, eq, lt } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, funnels, funnelInteractions, messages } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import type { FunnelBlock, FunnelBlockOption, FunnelFlow } from "../types/funnel";
import { updateConversationBlock, addMessage } from "./simplified-conversation-actions";

/**
 * Error message templates for progressive error handling
 */
const ERROR_MESSAGES = {
	FIRST_ATTEMPT: "Please choose from the provided options above.",
	SECOND_ATTEMPT: "I'll inform the Whop owner about your request. Please wait for assistance.",
	THIRD_ATTEMPT: "I'm unable to help you further. Please contact the Whop owner directly.",
} as const;

/**
 * Timeout configuration
 */
const TIMEOUT_CONFIG = {
	CONVERSATION_TIMEOUT_HOURS: 24, // 24 hours of inactivity
	CLEANUP_INTERVAL_HOURS: 1, // Run cleanup every hour
} as const;

/**
 * DM Monitoring Service Class
 * 
 * Manages polling intervals and lifecycle for monitoring user DM responses.
 * Uses 5s polling for first minute, then 10s intervals.
 */
export class DMMonitoringService {
	private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
	private pollingStatus: Map<string, boolean> = new Map();
	private readonly INITIAL_POLLING_INTERVAL = 5000; // 5 seconds
	private readonly REGULAR_POLLING_INTERVAL = 10000; // 10 seconds
	private readonly INITIAL_POLLING_DURATION = 60000; // 1 minute
	private timeoutCleanupInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Start timeout cleanup monitoring when service is created
		this.startTimeoutCleanup();
	}

	/**
	 * Start monitoring a user's DM conversation
	 * 
	 * @param conversationId - Internal conversation ID
	 * @param whopUserId - Whop user ID
	 */
	async startMonitoring(conversationId: string, whopUserId: string): Promise<void> {
		try {
			console.log(`Starting DM monitoring for conversation ${conversationId}, user ${whopUserId}`);

			// Stop any existing monitoring for this conversation
			await this.stopMonitoring(conversationId);

			// Mark as active
			this.pollingStatus.set(conversationId, true);

			// Start with initial polling interval (5s for first minute)
			const startTime = Date.now();
			
			const poll = async () => {
				if (!this.pollingStatus.get(conversationId)) {
					return; // Stop polling if disabled
				}

				try {
					await this.pollForMessages(conversationId, whopUserId);
				} catch (error) {
					console.error(`Error polling messages for conversation ${conversationId}:`, error);
					// Continue polling even if one poll fails
				}

				// Schedule next poll
				if (this.pollingStatus.get(conversationId)) {
					const elapsed = Date.now() - startTime;
					const interval = elapsed < this.INITIAL_POLLING_DURATION 
						? this.INITIAL_POLLING_INTERVAL 
						: this.REGULAR_POLLING_INTERVAL;

					const timeoutId = setTimeout(poll, interval);
					this.pollingIntervals.set(conversationId, timeoutId);
				}
			};

			// Start first poll immediately
			await poll();
		} catch (error) {
			console.error(`Error starting DM monitoring for conversation ${conversationId}:`, error);
			this.pollingStatus.set(conversationId, false);
		}
	}

	/**
	 * Stop monitoring a user's DM conversation
	 * 
	 * @param conversationId - Internal conversation ID
	 */
	async stopMonitoring(conversationId: string): Promise<void> {
		try {
			console.log(`Stopping DM monitoring for conversation ${conversationId}`);

			// Clear polling status
			this.pollingStatus.set(conversationId, false);

			// Clear existing interval
			const existingInterval = this.pollingIntervals.get(conversationId);
			if (existingInterval) {
				clearTimeout(existingInterval);
				this.pollingIntervals.delete(conversationId);
			}
		} catch (error) {
			console.error(`Error stopping DM monitoring for conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Check if monitoring is active for a conversation
	 * 
	 * @param conversationId - Internal conversation ID
	 * @returns True if monitoring is active
	 */
	isMonitoring(conversationId: string): boolean {
		return this.pollingStatus.get(conversationId) || false;
	}

	/**
	 * Get monitoring status for all conversations
	 * 
	 * @returns Map of conversation IDs to monitoring status
	 */
	getMonitoringStatus(): Map<string, boolean> {
		return new Map(this.pollingStatus);
	}

	/**
	 * Poll for new DM messages from a specific user
	 * 
	 * @param conversationId - Internal conversation ID
	 * @param whopUserId - Whop user ID
	 */
	private async pollForMessages(conversationId: string, whopUserId: string): Promise<void> {
		try {
			// Get conversation details
			const conversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, conversationId),
				with: {
					funnel: true,
				},
			});

			if (!conversation) {
				console.error(`Conversation ${conversationId} not found`);
				await this.stopMonitoring(conversationId);
				return;
			}

			// Check if conversation is still active
			if (conversation.status !== "active") {
				console.log(`Conversation ${conversationId} is no longer active, stopping monitoring`);
				await this.stopMonitoring(conversationId);
				return;
			}

			// Check for timeout (Phase 3)
			const hasTimedOut = await this.checkConversationTimeout(conversationId);
			if (hasTimedOut) {
				await this.handleConversationTimeout(conversationId);
				return;
			}

			// Get DM conversations from Whop using the SDK
			const dmConversations = await whopSdk.messages.listDirectMessageConversations();
			
			// Debug logging
			console.log(`DM monitoring for conversation ${conversationId}:`);
			console.log(`  Found ${dmConversations.length} DM conversations`);
			console.log(`  Looking for conversation with user: ${whopUserId}`);
			console.log(`  Conversation whopUserId: ${conversation.whopUserId}`);
			
			// Log all conversations and their members for debugging
			dmConversations.forEach((conv, index) => {
				console.log(`  Conversation ${index + 1}: ${conv.id}`);
				console.log(`    Members:`, conv.feedMembers.map(m => `${m.username} (${m.id})`));
				console.log(`    Last message:`, conv.lastMessage);
			});
			
			// Find conversation by looking for the user in feedMembers
			// We need to find a conversation where one member is the agent and the other is our user
			const userConversation = dmConversations.find(conv => {
				// Look for conversations with the agent (tests-agentb2) and our user
				const hasAgent = conv.feedMembers.some(member => member.username === 'tests-agentb2');
				
				// Check if any member matches our user (by username or ID)
				const hasUser = conv.feedMembers.some(member => 
					member.username === whopUserId || 
					member.id === whopUserId
				);
				
				// Also check if the last message is from our user (by user ID)
				const lastMessageFromUser = conv.lastMessage && conv.lastMessage.userId === whopUserId;
				
				// Return true if we have agent + (user member OR last message from user)
				return hasAgent && (hasUser || lastMessageFromUser);
			});

			if (!userConversation) {
				console.log(`No DM conversation found with user ${whopUserId}`);
				return;
			}

			console.log(`  Found conversation: ${userConversation.id}`);
			console.log(`  Last message:`, userConversation.lastMessage);

			// Check if there's a new message from the user
			// We need to check if the last message is from our user
			// The whopUserId might be a username, but lastMessage.userId is the actual user ID
			const lastMessage = userConversation.lastMessage;
			const isMessageFromUser = lastMessage && lastMessage.userId === whopUserId;
			
			// Also check if any member has the whopUserId as their ID (in case whopUserId is actually a user ID)
			const userMember = userConversation.feedMembers.find(member => 
				member.id === whopUserId || member.username === whopUserId
			);
			const isMessageFromUserMember = lastMessage && userMember && lastMessage.userId === userMember.id;
			
			console.log(`  Debug - whopUserId: ${whopUserId}`);
			console.log(`  Debug - userMember: ${userMember ? `${userMember.username} (${userMember.id})` : 'not found'}`);
			console.log(`  Debug - lastMessage.userId: ${lastMessage?.userId}`);
			console.log(`  Debug - isMessageFromUser: ${isMessageFromUser}`);
			console.log(`  Debug - isMessageFromUserMember: ${isMessageFromUserMember}`);
			
			if (lastMessage && (isMessageFromUser || isMessageFromUserMember) && lastMessage.content) {
				console.log(`  New message from user ${whopUserId}: "${lastMessage.content}"`);
				console.log(`  Message user ID: ${lastMessage.userId}`);
				console.log(`  User member ID: ${userMember?.id}`);
				
				// Process the new message
				await this.handleDMResponse(conversationId, lastMessage.content, whopUserId);
			} else {
				console.log(`  No new messages from user ${whopUserId}`);
				console.log(`  Last message user ID: ${lastMessage?.userId}`);
				console.log(`  Looking for user ID: ${whopUserId}`);
				console.log(`  User member found: ${!!userMember}`);
			}

		} catch (error) {
			console.error(`Error polling messages for conversation ${conversationId}:`, error);
			
			// Handle specific error cases
			if (error instanceof Error) {
				if (error.message.includes("rate limit")) {
					console.warn("Rate limited when polling messages, will retry on next interval");
				} else if (error.message.includes("unauthorized")) {
					console.error("Unauthorized when polling messages, stopping monitoring");
					await this.stopMonitoring(conversationId);
				}
			}
		}
	}

	/**
	 * Handle DM response from user
	 * 
	 * @param conversationId - Internal conversation ID
	 * @param messageContent - Message content from user
	 * @param whopUserId - Whop user ID
	 */
	private async handleDMResponse(
		conversationId: string, 
		messageContent: string, 
		whopUserId: string
	): Promise<void> {
		try {
			console.log(`Processing DM response from user ${whopUserId}: ${messageContent}`);

			// Get conversation and funnel details
			const conversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, conversationId),
				with: {
					funnel: true,
				},
			});

			if (!conversation || !conversation.funnel) {
				console.error(`Conversation or funnel not found for ${conversationId}`);
				return;
			}

			// Process the user response
			await this.processUserResponse(conversationId, messageContent);

		} catch (error) {
			console.error(`Error handling DM response for conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Process user response through the funnel system
	 * 
	 * @param conversationId - Internal conversation ID
	 * @param userMessage - User's message content
	 */
	private async processUserResponse(conversationId: string, userMessage: string): Promise<void> {
		try {
			// Get current conversation and funnel
			const conversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, conversationId),
				with: {
					funnel: true,
				},
			});

			if (!conversation || !conversation.funnel || !conversation.currentBlockId) {
				console.error(`Invalid conversation state for ${conversationId}`);
				return;
			}

			const funnelFlow = conversation.funnel.flow as FunnelFlow;
			const currentBlock = funnelFlow.blocks[conversation.currentBlockId];

			if (!currentBlock) {
				console.error(`Current block ${conversation.currentBlockId} not found in funnel`);
				return;
			}

			// Record user message in database
			await addMessage(conversationId, "user", userMessage);

			console.log(`Recorded user message in DM conversation ${conversationId}: ${userMessage}`);

			// Validate user response
			const validationResult = this.validateUserResponse(userMessage, currentBlock);

		if (!validationResult.isValid) {
			// Handle invalid response with progressive error handling
			// For now, we'll use a simple approach without metadata tracking
			await this.handleInvalidResponse(conversationId, 1);
			return;
		}

			// Reset invalid response count on valid response
			await this.resetInvalidResponseCount(conversationId);

			// Navigate to next block
			if (validationResult.selectedOption) {
				const nextBlockId = validationResult.selectedOption.nextBlockId;
				
				// Check if the next block is a TRANSITION block - if so, stop monitoring immediately
				if (nextBlockId) {
					const funnelFlow = conversation.funnel.flow as FunnelFlow;
					const nextBlock = funnelFlow.blocks[nextBlockId];
					
					if (nextBlock && this.isTransitionBlock(nextBlock, funnelFlow)) {
						console.log(`Next block is TRANSITION stage - stopping DM monitoring for conversation ${conversationId}`);
						await this.stopMonitoring(conversationId);
					}
				}
				
				await this.navigateToNextBlock(
					conversationId,
					nextBlockId,
					validationResult.selectedOption.text
				);
			}

		} catch (error) {
			console.error(`Error processing user response for conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Validate user response against current funnel block options
	 * 
	 * @param userMessage - User's message
	 * @param currentBlock - Current funnel block
	 * @returns Validation result with selected option
	 */
	private validateUserResponse(
		userMessage: string, 
		currentBlock: FunnelBlock
	): {
		isValid: boolean;
		selectedOption?: FunnelBlockOption;
		errorMessage?: string;
	} {
		try {
			// Normalize user input
			const normalizedInput = this.normalizeInput(userMessage);

			// Check for exact text matches (case-insensitive)
			for (const option of currentBlock.options) {
				if (this.normalizeInput(option.text) === normalizedInput) {
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
				if (optionIndex >= 0 && optionIndex < currentBlock.options.length) {
					return {
						isValid: true,
						selectedOption: currentBlock.options[optionIndex],
					};
				}
			}

			// Invalid response
			return {
				isValid: false,
				errorMessage: `Please select one of the following options:\n${currentBlock.options.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n')}`,
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
	 * Normalize user input for comparison
	 * 
	 * @param input - User input string
	 * @returns Normalized input
	 */
	private normalizeInput(input: string): string {
		return input
			.trim()
			.toLowerCase()
			.replace(/\s+/g, ' ') // Replace multiple spaces with single space
			.replace(/[^\w\s]/g, ''); // Remove special characters
	}

	/**
	 * Navigate to next block in funnel
	 * 
	 * @param conversationId - Internal conversation ID
	 * @param nextBlockId - Next block ID (null for end of funnel)
	 * @param selectedOptionText - Text of selected option
	 */
	private async navigateToNextBlock(
		conversationId: string,
		nextBlockId: string | null,
		selectedOptionText: string
	): Promise<void> {
		try {
			// Get current conversation
			const conversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, conversationId),
				with: {
					funnel: true,
				},
			});

			if (!conversation) {
				console.error(`Conversation ${conversationId} not found`);
				return;
			}

			// Record interaction
			await db.insert(funnelInteractions).values({
				conversationId: conversationId,
				blockId: conversation.currentBlockId!,
				optionText: selectedOptionText,
				nextBlockId: nextBlockId,
			});

		// Update conversation
		const updatedUserPath = [...(conversation.userPath || []), nextBlockId].filter(Boolean);
		if (nextBlockId) {
			await updateConversationBlock(conversationId, nextBlockId, updatedUserPath);
		}

		// Check if we've reached a TRANSITION block - if so, stop monitoring immediately
		if (nextBlockId) {
			const funnelFlow = conversation.funnel.flow as FunnelFlow;
			const nextBlock = funnelFlow.blocks[nextBlockId];
			
			if (nextBlock && this.isTransitionBlock(nextBlock, funnelFlow)) {
				console.log(`Reached TRANSITION stage - stopping DM monitoring for conversation ${conversationId}`);
				await this.stopMonitoring(conversationId);
			}
		}

		// Handle end of funnel or send next message
		if (!nextBlockId) {
			// End of funnel
			await this.handleEndOfFunnel(conversation);
		} else {
			// Send next message
			await this.sendNextMessage(conversation, nextBlockId);
		}

		} catch (error) {
			console.error(`Error navigating to next block for conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Send next message to user
	 * 
	 * @param conversation - Conversation object
	 * @param nextBlockId - Next block ID
	 */
	private async sendNextMessage(conversation: any, nextBlockId: string): Promise<void> {
		try {
			const funnelFlow = conversation.funnel.flow as FunnelFlow;
			const nextBlock = funnelFlow.blocks[nextBlockId];

			if (!nextBlock) {
				console.error(`Next block ${nextBlockId} not found`);
				return;
			}

			// Get user ID from conversation record
			const whopUserId = conversation.whopUserId;
			if (!whopUserId) {
				console.error("Whop user ID not found in conversation");
				return;
			}

			// Get the message content from the block
			const messageContent = nextBlock.message || "Please select an option:";
			
			// Add options to the message if they exist
			let fullMessage = messageContent;
			if (nextBlock.options && nextBlock.options.length > 0) {
				fullMessage += "\n\nPlease choose one of the following options:\n";
				nextBlock.options.forEach((option, index) => {
					fullMessage += `${index + 1}. ${option.text}\n`;
				});
			}

			// Send message to user
			await whopSdk.messages.sendDirectMessageToUser({
				toUserIdOrUsername: whopUserId,
				message: fullMessage,
			});

			// Record bot message in database
			await addMessage(conversation.id, "bot", fullMessage);

			console.log(`Sent and recorded next message to user ${whopUserId} for block ${nextBlockId}: ${fullMessage}`);

		} catch (error) {
			console.error(`Error sending next message for conversation ${conversation.id}:`, error);
		}
	}

	/**
	 * Handle end of funnel scenario
	 * Phase 4: Transition to internal chat instead of just completing
	 * 
	 * @param conversation - Conversation object
	 */
	private async handleEndOfFunnel(conversation: any): Promise<void> {
		try {
			console.log(`Handling end of funnel for conversation ${conversation.id} - Phase 4 transition`);

			// Check if this is a TRANSITION block (end of Funnel 1)
			const funnelFlow = conversation.funnel.flow as FunnelFlow;
			const currentBlock = funnelFlow.blocks[conversation.currentBlockId];
			
			if (currentBlock && this.isTransitionBlock(currentBlock, funnelFlow)) {
				// This is the end of Funnel 1 - transition to internal chat
				await this.handleFunnel1Completion(conversation);
			} else {
				// This is the end of Funnel 2 - complete the conversation
				await this.handleFunnel2Completion(conversation);
			}

		} catch (error) {
			console.error(`Error handling end of funnel for conversation ${conversation.id}:`, error);
		}
	}

	/**
	 * Handle completion of Funnel 1 - transition to internal chat
	 * 
	 * @param conversation - Conversation object
	 */
	private async handleFunnel1Completion(conversation: any): Promise<void> {
		try {
			console.log(`Handling Funnel 1 completion for conversation ${conversation.id} - transitioning to internal chat`);

			// Get the transition message from the current block
			const funnelFlow = conversation.funnel.flow as FunnelFlow;
			const currentBlock = funnelFlow.blocks[conversation.currentBlockId];
			const transitionMessage = currentBlock?.message || "Ready for your Personal Strategy Session! Click the link below to continue.";

		// Complete the transition to internal chat (synchronously)
		await this.completeDMToInternalTransition(
			conversation.id,
			conversation.experienceId,
			transitionMessage
		);

			console.log(`Successfully transitioned conversation ${conversation.id} to internal chat`);

			// Stop monitoring this DM conversation
			await this.stopMonitoring(conversation.id);

		} catch (error) {
			console.error(`Error handling Funnel 1 completion for conversation ${conversation.id}:`, error);
			
			// Fallback: send error message and complete conversation
			const whopUserId = conversation.whopUserId;
			if (whopUserId) {
				await whopSdk.messages.sendDirectMessageToUser({
					toUserIdOrUsername: whopUserId,
					message: "There was an issue setting up your strategy session. Please contact support.",
				});
			}

			// Mark conversation as completed
			await db.update(conversations)
				.set({
					status: "completed",
					updatedAt: new Date(),
				})
				.where(eq(conversations.id, conversation.id));

			await this.stopMonitoring(conversation.id);
		}
	}

	/**
	 * Handle completion of Funnel 2 - final completion
	 * 
	 * @param conversation - Conversation object
	 */
	private async handleFunnel2Completion(conversation: any): Promise<void> {
		try {
			console.log(`Handling Funnel 2 completion for conversation ${conversation.id}`);

			// Update conversation status to completed
			await db.update(conversations)
				.set({
					status: "completed",
					updatedAt: new Date(),
				})
				.where(eq(conversations.id, conversation.id));

			// Send completion message
			const whopUserId = conversation.whopUserId;
			if (whopUserId) {
				await whopSdk.messages.sendDirectMessageToUser({
					toUserIdOrUsername: whopUserId,
					message: "Thank you for completing the strategy session! We'll be in touch soon.",
				});
			}

			// Stop monitoring this conversation
			await this.stopMonitoring(conversation.id);

		} catch (error) {
			console.error(`Error handling Funnel 2 completion for conversation ${conversation.id}:`, error);
		}
	}

	/**
	 * Check if a block is a TRANSITION block (end of Funnel 1)
	 * 
	 * @param block - Funnel block to check
	 * @param funnelFlow - Complete funnel flow
	 * @returns True if this is a TRANSITION block
	 */
	private isTransitionBlock(block: FunnelBlock, funnelFlow: FunnelFlow): boolean {
		// Check if the block is in a TRANSITION stage
		return funnelFlow.stages.some(stage => 
			stage.name === "TRANSITION" && stage.blockIds.includes(block.id)
		);
	}

	/**
	 * Send error message to user
	 * 
	 * @param conversation - Conversation object
	 * @param errorMessage - Error message to send
	 */
	private async sendErrorMessage(conversation: any, errorMessage: string): Promise<void> {
		try {
			const whopUserId = conversation.whopUserId;
			if (!whopUserId) {
				console.error("Whop user ID not found in conversation");
				return;
			}

			await whopSdk.messages.sendDirectMessageToUser({
				toUserIdOrUsername: whopUserId,
				message: errorMessage,
			});

			console.log(`Sent error message to user ${whopUserId}: ${errorMessage}`);

		} catch (error) {
			console.error(`Error sending error message for conversation ${conversation.id}:`, error);
		}
	}

	// ==================== PHASE 3: PROGRESSIVE ERROR HANDLING ====================

	/**
	 * Handle invalid response with progressive error messages
	 * 
	 * @param conversationId - Internal conversation ID
	 * @param attemptCount - Number of consecutive invalid attempts
	 */
	async handleInvalidResponse(conversationId: string, attemptCount: number): Promise<void> {
		try {
			console.log(`Handling invalid response for conversation ${conversationId}, attempt ${attemptCount}`);

			// Get conversation details
			const conversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, conversationId),
			});

			if (!conversation) {
				console.error(`Conversation ${conversationId} not found`);
				return;
			}

			// Determine error message based on attempt count
			let errorMessage: string;
			if (attemptCount === 1) {
				errorMessage = ERROR_MESSAGES.FIRST_ATTEMPT;
			} else if (attemptCount === 2) {
				errorMessage = ERROR_MESSAGES.SECOND_ATTEMPT;
			} else {
				// Third attempt or more - abandon conversation
				errorMessage = ERROR_MESSAGES.THIRD_ATTEMPT;
				await this.abandonConversation(conversationId, "max_invalid_responses");
				return;
			}

			// Update conversation timestamp
			await db.update(conversations)
				.set({
					updatedAt: new Date(),
				})
				.where(eq(conversations.id, conversationId));

			// Send progressive error message
			await this.sendErrorMessage(conversation, errorMessage);

		} catch (error) {
			console.error(`Error handling invalid response for conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Abandon conversation due to various reasons
	 * 
	 * @param conversationId - Internal conversation ID
	 * @param reason - Reason for abandonment
	 */
	async abandonConversation(conversationId: string, reason: string): Promise<void> {
		try {
			console.log(`Abandoning conversation ${conversationId}, reason: ${reason}`);

			// Get conversation details
			const conversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, conversationId),
			});

			if (!conversation) {
				console.error(`Conversation ${conversationId} not found`);
				return;
			}

			// Update conversation status
			await db.update(conversations)
				.set({
					status: "abandoned",
					updatedAt: new Date(),
				})
				.where(eq(conversations.id, conversationId));

			// Stop monitoring this conversation
			await this.stopMonitoring(conversationId);

			// Send final message to user if they haven't been abandoned due to timeout
			if (reason !== "timeout" && conversation.whopUserId) {
				await this.sendErrorMessage(conversation, ERROR_MESSAGES.THIRD_ATTEMPT);
			}

			console.log(`Successfully abandoned conversation ${conversationId}`);

		} catch (error) {
			console.error(`Error abandoning conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Reset invalid response count when user provides valid response
	 * 
	 * @param conversationId - Internal conversation ID
	 */
	async resetInvalidResponseCount(conversationId: string): Promise<void> {
		try {
			// Update conversation timestamp to reset timeout
			await db.update(conversations)
				.set({
					updatedAt: new Date(),
				})
				.where(eq(conversations.id, conversationId));

			console.log(`Reset invalid response count for conversation ${conversationId}`);
		} catch (error) {
			console.error(`Error resetting invalid response count for conversation ${conversationId}:`, error);
		}
	}

	// ==================== PHASE 3: TIMEOUT MANAGEMENT ====================

	/**
	 * Check if conversation has timed out
	 * 
	 * @param conversationId - Internal conversation ID
	 * @returns True if conversation has timed out
	 */
	async checkConversationTimeout(conversationId: string): Promise<boolean> {
		try {
			const conversation = await db.query.conversations.findFirst({
				where: eq(conversations.id, conversationId),
			});

			if (!conversation || conversation.status !== "active") {
				return false;
			}

			const now = new Date();
			const lastActivity = new Date(conversation.updatedAt);
			const timeoutThreshold = TIMEOUT_CONFIG.CONVERSATION_TIMEOUT_HOURS * 60 * 60 * 1000; // Convert to milliseconds

			const hasTimedOut = (now.getTime() - lastActivity.getTime()) > timeoutThreshold;

			if (hasTimedOut) {
				console.log(`Conversation ${conversationId} has timed out (last activity: ${lastActivity})`);
			}

			return hasTimedOut;

		} catch (error) {
			console.error(`Error checking timeout for conversation ${conversationId}:`, error);
			return false;
		}
	}

	/**
	 * Handle conversation timeout
	 * 
	 * @param conversationId - Internal conversation ID
	 */
	async handleConversationTimeout(conversationId: string): Promise<void> {
		try {
			console.log(`Handling timeout for conversation ${conversationId}`);

			// Abandon conversation with timeout reason
			await this.abandonConversation(conversationId, "timeout");

		} catch (error) {
			console.error(`Error handling timeout for conversation ${conversationId}:`, error);
		}
	}

	/**
	 * Clean up expired conversations
	 */
	async cleanupTimeoutConversations(): Promise<void> {
		try {
			console.log("Starting timeout conversation cleanup");

			const timeoutThreshold = new Date();
			timeoutThreshold.setHours(timeoutThreshold.getHours() - TIMEOUT_CONFIG.CONVERSATION_TIMEOUT_HOURS);

			// Find expired active conversations
			const expiredConversations = await db.query.conversations.findMany({
				where: and(
					eq(conversations.status, "active"),
					lt(conversations.updatedAt, timeoutThreshold)
				),
			});

			console.log(`Found ${expiredConversations.length} expired conversations to clean up`);

			// Handle each expired conversation
			for (const conversation of expiredConversations) {
				await this.handleConversationTimeout(conversation.id);
			}

			console.log(`Completed timeout conversation cleanup`);

		} catch (error) {
			console.error("Error during timeout conversation cleanup:", error);
		}
	}

	/**
	 * Start timeout cleanup monitoring
	 */
	startTimeoutCleanup(): void {
		try {
			// Clear existing interval if any
			if (this.timeoutCleanupInterval) {
				clearInterval(this.timeoutCleanupInterval);
			}

			// Start cleanup interval
			const cleanupIntervalMs = TIMEOUT_CONFIG.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
			this.timeoutCleanupInterval = setInterval(async () => {
				await this.cleanupTimeoutConversations();
			}, cleanupIntervalMs);

			console.log(`Started timeout cleanup monitoring (every ${TIMEOUT_CONFIG.CLEANUP_INTERVAL_HOURS} hours)`);

		} catch (error) {
			console.error("Error starting timeout cleanup:", error);
		}
	}

	/**
	 * Stop timeout cleanup monitoring
	 */
	stopTimeoutCleanup(): void {
		try {
			if (this.timeoutCleanupInterval) {
				clearInterval(this.timeoutCleanupInterval);
				this.timeoutCleanupInterval = null;
				console.log("Stopped timeout cleanup monitoring");
			}
		} catch (error) {
			console.error("Error stopping timeout cleanup:", error);
		}
	}

	/**
	 * Complete transition from DM to internal chat (simplified)
	 */
	private async completeDMToInternalTransition(
		conversationId: string,
		experienceId: string,
		transitionMessage: string,
	): Promise<void> {
		try {
			console.log(`Completing DM to internal chat transition for conversation ${conversationId}`);

			// Get conversation with funnel
			const conversation = await db.query.conversations.findFirst({
				where: and(
					eq(conversations.id, conversationId),
					eq(conversations.experienceId, experienceId),
				),
				with: {
					funnel: true,
				},
			});

			if (!conversation || !conversation.funnel?.flow) {
				throw new Error(`Conversation or funnel not found for ${conversationId}`);
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
			const updatedUserPath = [...(conversation.userPath || []), firstExperienceQualBlockId];
			await updateConversationBlock(conversationId, firstExperienceQualBlockId, updatedUserPath);

			// Generate and send transition message
			const chatLink = await this.generateChatLink(conversationId, experienceId);
			const personalizedMessage = transitionMessage.replace(
				/\[LINK_TO_PRIVATE_CHAT\]/g,
				chatLink
			);

			// Send transition message
			await whopSdk.messages.sendDirectMessageToUser({
				toUserIdOrUsername: conversation.whopUserId,
				message: personalizedMessage,
			});

			console.log(`Successfully completed DM to internal chat transition for conversation ${conversationId}`);
		} catch (error) {
			console.error(`Error completing DM to internal chat transition:`, error);
			throw error;
		}
	}

	/**
	 * Generate chat link for conversation
	 */
	private async generateChatLink(conversationId: string, experienceId: string): Promise<string> {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
		return `${baseUrl}/experiences/${experienceId}/chat/${conversationId}`;
	}
}

// Export singleton instance
export const dmMonitoringService = new DMMonitoringService();
