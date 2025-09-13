/**
 * User Join Actions
 * 
 * Handles user join events from Whop webhooks and initiates the chat funnel system.
 * This is part of Phase 1 of the Two-Phase Chat Initiation System.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { experiences, funnels, conversations, messages } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import { dmMonitoringService } from "./dm-monitoring-actions";
import { createConversation, addMessage } from "./simplified-conversation-actions";
import { closeExistingActiveConversationsByWhopUserId } from "./user-management-actions";
import type { FunnelFlow } from "../types/funnel";

/**
 * Handle user join event from webhook
 * 
 * @param userId - Whop user ID
 * @param productId - Whop product ID (from membership webhook)
 */
export async function handleUserJoinEvent(
	userId: string,
	productId: string,
): Promise<void> {
	try {
		console.log(`Processing user join event: ${userId} for product ${productId}`);

		// Validate required fields
		if (!userId || !productId) {
			console.error("Missing required fields: userId or productId");
			return;
		}

		// Get live funnel for this product/experience
		const liveFunnel = await getLiveFunnel(productId);
		if (!liveFunnel) {
			console.log(`No live funnel found for product ${productId}`);
			return;
		}

		// Get experience record from the funnel (we already found it in getLiveFunnel)
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, liveFunnel.experienceId),
		});

		if (!experience) {
			console.error(`Experience not found for funnel ${liveFunnel.id}`);
			return;
		}

		console.log(`Using experience ${experience.whopExperienceId} for product ${productId}`);

		// Extract welcome message from funnel flow
		const welcomeMessage = getWelcomeMessage(liveFunnel.flow);
		if (!welcomeMessage) {
			console.error(`No welcome message found in funnel ${liveFunnel.id}`);
			return;
		}

		// Close any existing active conversations for this user
		await closeExistingActiveConversationsByWhopUserId(userId, experience.id);

		// Create conversation record
		const conversationId = await createConversation(
			experience.id,
			liveFunnel.id,
			userId,
			liveFunnel.flow.startBlockId,
		);

	// Send welcome DM and record it
	const dmSent = await sendWelcomeDM(userId, welcomeMessage, conversationId);
	if (!dmSent) {
		console.error(`Failed to send DM to user ${userId}`);
		return;
	}

	// Get the member ID from the DM conversation
	let memberId = null;
	try {
		// Wait a moment for the DM conversation to be created
		await new Promise(resolve => setTimeout(resolve, 2000));
		
		// Get the DM conversations to find the new one
		const dmConversations = await whopSdk.messages.listDirectMessageConversations();
		const newConversation = dmConversations.find(conv => 
			conv.feedMembers.some(member => 
				// Look for a conversation where one member is the agent and the other is our user
				member.username === 'tests-agentb2' // Agent username
			) && conv.lastMessage?.content?.includes('Welcome, [Username]!')
		);
		
		if (newConversation) {
			// Find the member ID for our user (not the agent)
			const userMember = newConversation.feedMembers.find(member => 
				member.username !== 'tests-agentb2'
			);
			if (userMember) {
				memberId = userMember.id;
				console.log(`Found member ID for user ${userId}: ${memberId}`);
				
				// Update conversation with member ID
				await db.update(conversations)
					.set({
						metadata: {
							...liveFunnel.flow,
							whopMemberId: memberId,
						},
					})
					.where(eq(conversations.id, conversationId));
			}
		}
	} catch (error) {
		console.error('Error getting member ID for customer:', error);
	}

	// Start DM monitoring for this conversation (Phase 2)
	await dmMonitoringService.startMonitoring(conversationId, userId);

		console.log(`Successfully processed user join for ${userId} with funnel ${liveFunnel.id}`);
	} catch (error) {
		console.error("Error handling user join event:", error);
		// Don't throw - we want webhook to return 200 even if processing fails
	}
}

/**
 * Get live funnel for product/experience
 * 
 * @param productId - Whop product ID (from membership webhook)
 * @returns Live funnel or null
 */
export async function getLiveFunnel(productId: string): Promise<{
	id: string;
	flow: FunnelFlow;
	experienceId: string;
} | null> {
	try {
		// For webhook events, we need to find ANY experience that has a deployed funnel
		// The product_id doesn't matter - we just need to find a live funnel
		// This allows the webhook to work for any product in your app
		
		// Find ANY deployed funnel (since all products in your app use the same funnel)
		const liveFunnel = await db.query.funnels.findFirst({
			where: eq(funnels.isDeployed, true),
			columns: {
				id: true,
				flow: true,
				experienceId: true,
			},
		});

		if (!liveFunnel || !liveFunnel.flow) {
			console.log(`No live funnel found for any experience`);
			return null;
		}

		console.log(`Found live funnel ${liveFunnel.id} for experience ${liveFunnel.experienceId} (product: ${productId})`);

		return {
			id: liveFunnel.id,
			flow: liveFunnel.flow as FunnelFlow,
			experienceId: liveFunnel.experienceId,
		};
	} catch (error) {
		console.error("Error getting live funnel:", error);
		return null;
	}
}

/**
 * Extract welcome message from funnel flow
 * 
 * @param funnelFlow - The funnel flow object
 * @returns Welcome message or null
 */
export function getWelcomeMessage(funnelFlow: FunnelFlow): string | null {
	try {
		if (!funnelFlow.startBlockId) {
			console.error("No startBlockId found in funnel flow");
			return null;
		}

		const startBlock = funnelFlow.blocks[funnelFlow.startBlockId];
		if (!startBlock) {
			console.error(`Start block ${funnelFlow.startBlockId} not found in funnel flow`);
			return null;
		}

		if (!startBlock.message || startBlock.message.trim() === "") {
			console.error("Start block has no message or empty message");
			return null;
		}

		let welcomeMessage = startBlock.message;

		// Add options if they exist
		if (startBlock.options && startBlock.options.length > 0) {
			welcomeMessage += "\n\nAnswer by pasting one of those numbers\n";
			startBlock.options.forEach((option, index) => {
				welcomeMessage += `${index + 1}. ${option.text}\n`;
			});
		}

		return welcomeMessage;
	} catch (error) {
		console.error("Error extracting welcome message:", error);
		return null;
	}
}

/**
 * Send welcome DM to user
 * 
 * @param whopUserId - Whop user ID
 * @param message - Message to send
 * @returns Success boolean
 */
export async function sendWelcomeDM(
	whopUserId: string,
	message: string,
	conversationId?: string,
): Promise<boolean> {
	try {
		console.log(`Sending DM to user ${whopUserId}: ${message}`);

		const result = await whopSdk.messages.sendDirectMessageToUser({
			toUserIdOrUsername: whopUserId,
			message: message,
		});

		// Record welcome message in database if conversationId is provided
		if (conversationId) {
			await addMessage(conversationId, "bot", message);
			console.log(`Recorded welcome message in conversation ${conversationId}`);
		}

		console.log(`DM sent successfully to user ${whopUserId}`);
		return true;
	} catch (error) {
		console.error(`Error sending DM to user ${whopUserId}:`, error);
		
		// Handle specific error cases
		if (error instanceof Error) {
			if (error.message.includes("rate limit")) {
				console.error("Rate limited when sending DM");
			} else if (error.message.includes("invalid user")) {
				console.error("Invalid user ID provided");
			}
		}
		
		return false;
	}
}

