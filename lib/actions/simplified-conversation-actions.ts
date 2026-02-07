/**
 * Simplified Conversation Actions
 * 
 * Consolidated conversation management with minimal complexity.
 * Handles all conversation operations in one place.
 */

import { and, eq, desc, asc, sql, inArray } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, messages, funnelInteractions, funnels, funnelAnalytics, experiences, users, resources } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import type { FunnelFlow, FunnelBlock } from "../types/funnel";
import { isProductCardBlock, getProductCardButtonLabel } from "../utils/funnelUtils";
import { updateFunnelGrowthPercentages } from "./funnel-actions";
import { safeBackgroundTracking, trackInterestBackground } from "../analytics/background-tracking";
import { findFunnelForTrigger, hasActiveConversation } from "../helpers/conversation-trigger";
import { updateConversationToWelcomeStage } from "./user-join-actions";

function escapeHtmlAttr(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface Conversation {
	id: string;
	experienceId: string;
	funnelId: string;
	whopUserId: string;
	status: "active" | "closed" | "archived";
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
	flow?: FunnelFlow | null; // Custom flow for this conversation
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
			flow: conversation.flow as FunnelFlow | null, // Include the custom flow
		};
	} catch (error) {
		console.error("Error getting conversation by ID:", error);
		throw error;
	}
}


/**
 * Create a new conversation with customized flow based on whopProductId
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

		// Safeguard: callers should check hasActiveConversation first; refuse to create if one already active
		if (await hasActiveConversation(experienceId, whopUserId)) {
			throw new Error(`Cannot create conversation: user already has an active conversation in experience ${experienceId}`);
		}

		// Get the original funnel flow
		const funnel = await db.query.funnels.findFirst({
			where: eq(funnels.id, funnelId),
		});

		if (!funnel?.flow) {
			throw new Error(`Funnel flow not found for funnelId ${funnelId}`);
		}

		const originalFlow = funnel.flow as FunnelFlow;
		console.log(`[CREATE-CONVERSATION] Retrieved original funnel flow with ${Object.keys(originalFlow.blocks).length} blocks`);

		// Create new conversation with funnel flow
		console.log(`[CREATE-CONVERSATION] Creating new conversation with funnelId ${funnelId}, startBlockId ${startBlockId}, whopProductId ${whopProductId}`);
		const now = new Date();
		const [newConversation] = await db.insert(conversations).values({
			experienceId,
			funnelId,
			whopUserId,
			membershipId,
			whopProductId,
			status: "active",
			currentBlockId: startBlockId,
			currentBlockEnteredAt: now,
			lastNotificationSequenceSent: null,
			userPath: [startBlockId],
			flow: originalFlow,
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
 * Delete the most recent bot message for a conversation (e.g. to "remove old offer" before showing downsell).
 */
export async function deleteLastBotMessage(conversationId: string): Promise<boolean> {
	try {
		const lastBot = await db.query.messages.findFirst({
			where: and(
				eq(messages.conversationId, conversationId),
				eq(messages.type, "bot"),
			),
			orderBy: [desc(messages.createdAt)],
			columns: { id: true },
		});
		if (!lastBot) return false;
		await db.delete(messages).where(eq(messages.id, lastBot.id));
		return true;
	} catch (error) {
		console.error("[deleteLastBotMessage] Error:", error);
		return false;
	}
}

/**
 * Format a funnel block message for storage (resolve [USER] only; [WHOP]/[WHOP_OWNER] resolved when generating merchant).
 * Used when appending upsell/downsell messages from cron.
 */
export async function formatFunnelBlockMessage(
	block: FunnelBlock,
	experienceId: string,
	conversationId: string,
	flow: FunnelFlow,
): Promise<string> {
	let msg = block.message ?? "";

	// [USER] (per-conversation; [WHOP] and [WHOP_OWNER] are resolved at funnel generation/save, not here)
	if (msg.includes("[USER]")) {
		const conv = await db.query.conversations.findFirst({
			where: eq(conversations.id, conversationId),
			columns: { whopUserId: true },
		});
		const u = conv?.whopUserId
			? await db.query.users.findFirst({
					where: eq(users.whopUserId, conv.whopUserId),
					columns: { name: true },
				})
			: null;
		const name = u?.name?.split(" ")[0];
		if (name) msg = msg.replace(/\[USER\]/g, name);
	}
	// No [LINK] in messages. Product link comes from the card's selected resource only; button is appended at the end.
	msg = msg.replace(/\[LINK\]/g, "").trim();
	const isProductCard = isProductCardBlock(block.id, flow);
	if (isProductCard) {
		const link = await getBlockResourceLink(block, experienceId);
		const label = getProductCardButtonLabel(block.id, flow);
		const href = link || "#";
		const buttonHtml = `<div class="animated-gold-button" data-href="${escapeHtmlAttr(href)}">${label}</div>`;
		msg = msg ? `${msg}\n\n${buttonHtml}` : buttonHtml;
	} else {
		const link = await getExperienceAppLink(experienceId);
		const buttonHtml = `<div class="animated-gold-button" data-href="${escapeHtmlAttr(link)}">Get Started!</div>`;
		msg = msg ? `${msg}\n\n${buttonHtml}` : buttonHtml;
	}
	return msg;
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

		// Use conversation's custom flow if available, otherwise use original funnel flow
		let funnelFlow: FunnelFlow;
		if (conversation.flow) {
			console.log(`[processUserMessage] Using conversation's custom flow for conversation ${conversationId}`);
			funnelFlow = conversation.flow as FunnelFlow;
		} else if (conversation.funnel?.flow) {
			console.log(`[processUserMessage] Using original funnel flow for conversation ${conversationId}`);
			funnelFlow = conversation.funnel.flow as FunnelFlow;
		} else {
			console.error(`[processUserMessage] No flow found for conversation ${conversationId}`);
			return { success: false, error: "Funnel flow not found" };
		}
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

		// Check if current block is in a product-card stage (cardType === "product")
		const isOfferStage = isProductCardBlock(currentBlockId, funnelFlow);

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
			const controlledBy = (conversation as { controlledBy?: string }).controlledBy;
			if (controlledBy === "admin") {
				// Handed out to admin: do not send bot acknowledgment; admin will handle
				console.log(`[processUserMessage] In OFFER stage, controlled by admin - no acknowledgment for: "${messageContent}"`);
				return { success: true };
			}
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
			nextBlockId: nextBlockId,
		});

		const now = new Date();
		// Update conversation state (same as navigate-funnel); set entered-at and reset notification sequence
		const updatedConversation = await db
			.update(conversations)
			.set({
				currentBlockId: nextBlockId,
				currentBlockEnteredAt: now,
				lastNotificationSequenceSent: null,
				userPath: [...(await getCurrentUserPath(conversationId)), nextBlockId].filter(Boolean),
				updatedAt: now,
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
 * Closes the current conversation, then optionally starts a new conversation for the "next" merchant
 * (findFunnelForTrigger with funnel_completed + completedFunnelId).
 *
 * @param conversationId - ID of the conversation to complete
 * @returns Success status
 */
export async function handleFunnelCompletionInUserChat(
	conversationId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const conversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, conversationId),
			with: { funnel: true },
		});

		if (!conversation) {
			return { success: false, error: "Conversation not found" };
		}

		const experienceId = conversation.experienceId;
		const whopUserId = conversation.whopUserId;
		const completedFunnelId = conversation.funnelId;

		// Close current conversation
		await db
			.update(conversations)
			.set({
				status: "closed",
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));

		// Find next funnel for funnel_completed (e.g. after qualification → upsell merchant)
		const user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, whopUserId),
				eq(users.experienceId, experienceId)
			),
		});

		const nextFunnel = await findFunnelForTrigger(experienceId, "funnel_completed", {
			completedFunnelId,
			userId: user?.id,
			whopUserId,
		});

		if (nextFunnel?.flow) {
			const flow = nextFunnel.flow as FunnelFlow & { startBlockId: string };
			const newConversationId = await createConversation(
				experienceId,
				nextFunnel.id,
				whopUserId,
				flow.startBlockId,
				undefined,
				undefined
			);
			await updateConversationToWelcomeStage(newConversationId, flow);
			safeBackgroundTracking(() => trackInterestBackground(experienceId, nextFunnel.id));
		}

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
 * Start a new conversation when merchant closes one, if a funnel with trigger delete_merchant_conversation exists.
 * Called from manageConversation (livechat-actions) when status is set to closed.
 * Guard: only create if !hasActiveConversation (after close, user has no active conversation).
 */
export async function startConversationForMerchantClosedTrigger(
	experienceId: string,
	whopUserId: string
): Promise<void> {
	try {
		const hasActive = await hasActiveConversation(experienceId, whopUserId);
		if (hasActive) return;

		const user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, whopUserId),
				eq(users.experienceId, experienceId)
			),
		});

		const funnel = await findFunnelForTrigger(experienceId, "merchant_conversation_deleted", {
			userId: user?.id,
			whopUserId,
		});

		if (!funnel?.flow) return;

		const flow = funnel.flow as FunnelFlow & { startBlockId: string };
		const newConversationId = await createConversation(
			experienceId,
			funnel.id,
			whopUserId,
			flow.startBlockId,
			undefined,
			undefined
		);
		await updateConversationToWelcomeStage(newConversationId, flow);
		safeBackgroundTracking(() => trackInterestBackground(experienceId, funnel.id));
	} catch (error) {
		console.error("[startConversationForMerchantClosedTrigger] Error:", error);
		// Do not throw: merchant close should still succeed; trigger flow is best-effort.
	}
}

/**
 * Get app link for an experience (button at end of message for non-OFFER stages).
 * experienceId is the experience UUID (experiences.id).
 */
export async function getExperienceAppLink(experienceId: string): Promise<string> {
	try {
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: { link: true, whopCompanyId: true },
		});
		if (experience?.link) return experience.link;
		if (experience?.whopCompanyId) return `https://whop.com/joined/${experience.whopCompanyId}/app/`;
	} catch (e) {
		console.error("[getExperienceAppLink] Error:", e);
	}
	return "https://whop.com/apps/";
}

/**
 * Resolve a block's resource (by resourceId or resourceName) to get its link for OFFER/VALUE_DELIVERY buttons.
 * Uses resource.link; if empty and resource has no whopProductId, uses resource.purchaseUrl.
 */
export async function getBlockResourceLink(
	block: FunnelBlock,
	experienceId: string
): Promise<string | null> {
	const trimLink = (url: string | null | undefined): string | null => {
		const s = url?.trim();
		return s && s.length > 0 ? s : null;
	};
	const pickLink = (r: { link?: string | null; whopProductId?: string | null; purchaseUrl?: string | null } | null): string | null => {
		if (!r) return null;
		const link = trimLink(r.link ?? null);
		if (link) return link;
		if (r.whopProductId) return null;
		return trimLink(r.purchaseUrl ?? null);
	};
	if (block.resourceId) {
		const resource = await db.query.resources.findFirst({
			where: and(
				eq(resources.id, block.resourceId),
				eq(resources.experienceId, experienceId)
			),
			columns: { link: true, whopProductId: true, purchaseUrl: true },
		});
		return pickLink(resource);
	}
	if (block.resourceName) {
		const resource = await db.query.resources.findFirst({
			where: and(
				eq(resources.experienceId, experienceId),
				eq(resources.name, block.resourceName!)
			),
			columns: { link: true, whopProductId: true, purchaseUrl: true },
		});
		return pickLink(resource);
	}
	return null;
}

/**
 * Resolve an OFFER block's resource to Whop product and plan IDs for matching payment.succeeded.
 * Uses block.resourceName or block.resourceId; returns nulls if block has no resource or resource has no whopProductId.
 */
export async function getOfferBlockProductPlan(
	offerBlock: FunnelBlock,
	experienceId: string
): Promise<{ whopProductId: string | null; planId: string | null }> {
	if (offerBlock.resourceId) {
		const resource = await db.query.resources.findFirst({
			where: and(
				eq(resources.id, offerBlock.resourceId),
				eq(resources.experienceId, experienceId)
			),
			columns: { whopProductId: true, planId: true },
		});
		return {
			whopProductId: resource?.whopProductId ?? null,
			planId: resource?.planId ?? null,
		};
	}
	if (offerBlock.resourceName) {
		const resource = await db.query.resources.findFirst({
			where: and(
				eq(resources.experienceId, experienceId),
				eq(resources.name, offerBlock.resourceName!)
			),
			columns: { whopProductId: true, planId: true },
		});
		return {
			whopProductId: resource?.whopProductId ?? null,
			planId: resource?.planId ?? null,
		};
	}
	return { whopProductId: null, planId: null };
}

/**
 * Advance UpSell conversation to next OFFER block after purchase.
 * When payment succeeds, if the user's active conversation is UpSell and currentBlockId is an OFFER block,
 * only advance when payment product/plan match the current offer's resource (or if no resource, do not advance for safety).
 * When advancing from a timer state (offerCtaClickedAt set), clears timer and records purchase for cron.
 */
export async function advanceUpSellConversationOnPurchase(
	conversationId: string,
	experienceId: string,
	paymentProductId?: string | null,
	paymentPlanId?: string | null
): Promise<{ advanced: boolean; error?: string }> {
	try {
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId),
				eq(conversations.status, "active")
			),
			with: { funnel: true },
		});

		if (!conversation?.funnel?.flow) return { advanced: false };
		const funnel = conversation.funnel as { merchantType?: string };
		if (funnel.merchantType !== "upsell") return { advanced: false };

		const flow = (conversation.flow as FunnelFlow) ?? (conversation.funnel.flow as FunnelFlow);
		// Current offer block: either the one whose CTA was clicked (timer active) or current block
		const offerBlockId = conversation.offerCtaBlockId ?? conversation.currentBlockId;
		if (!offerBlockId) return { advanced: false };

		const offerBlock = flow.blocks[offerBlockId];
		if (!offerBlock) return { advanced: false };

		const offerStages = flow.stages.filter((s) => s.cardType === "product");
		const currentStage = flow.stages.find((s) => s.blockIds.includes(offerBlockId));
		if (!currentStage || currentStage.cardType !== "product") return { advanced: false };

		// When payment product/plan are provided, only advance if they match the offer block's resource
		if (paymentProductId != null || paymentPlanId != null) {
			const { whopProductId: offerProductId, planId: offerPlanId } = await getOfferBlockProductPlan(offerBlock, experienceId);
			if (offerProductId != null || offerPlanId != null) {
				const productMatch = offerProductId == null || paymentProductId === offerProductId;
				const planMatch = offerPlanId == null || paymentPlanId === offerPlanId;
				if (!productMatch || !planMatch) return { advanced: false };
			} else {
				// Block has no resource: do not advance on product payment to avoid wrong-path advancement
				return { advanced: false };
			}
		}

		const stageBlockIds = currentStage.blockIds;
		const idx = stageBlockIds.indexOf(offerBlockId);
		let nextBlockId: string | null = null;
		if (idx >= 0 && idx < stageBlockIds.length - 1) {
			nextBlockId = stageBlockIds[idx + 1];
		} else {
			const currentStageIndex = flow.stages.indexOf(currentStage);
			const nextOfferStage = flow.stages.slice(currentStageIndex + 1).find((s) => s.cardType === "product");
			if (nextOfferStage?.blockIds?.length) {
				nextBlockId = nextOfferStage.blockIds[0];
			}
		}

		// If this offer has upsell/downsell and we're in timer state, go to upsell block instead of next OFFER
		const hasTimer = conversation.offerCtaClickedAt != null && conversation.offerCtaBlockId != null;
		const upsellBlockId = offerBlock.upsellBlockId ?? null;
		if (hasTimer && upsellBlockId) {
			const nextBlock = flow.blocks[upsellBlockId];
			if (nextBlock) {
				const now = new Date();
				await db
					.update(conversations)
					.set({
						currentBlockId: upsellBlockId,
						currentBlockEnteredAt: now,
						lastNotificationSequenceSent: null,
						offerCtaClickedAt: null,
						offerCtaBlockId: null,
						userPath: [...((conversation.userPath as string[]) || []), upsellBlockId].filter(Boolean),
						updatedAt: now,
					})
					.where(eq(conversations.id, conversationId));
				let message = (nextBlock?.message ?? "Thank you for your purchase. Here's your next option.").replace(/\[LINK\]/g, "").trim();
				if (nextBlock) {
					const link = await getBlockResourceLink(nextBlock, experienceId);
					const label = getProductCardButtonLabel(nextBlock.id, flow);
					const href = link || "#";
					const buttonHtml = `<div class="animated-gold-button" data-href="${escapeHtmlAttr(href)}">${label}</div>`;
					message = message ? `${message}\n\n${buttonHtml}` : buttonHtml;
				}
				await addMessage(conversationId, "bot", message);
				await db.update(conversations).set({ offerPurchasedAt: now }).where(eq(conversations.id, conversationId));
				return { advanced: true };
			}
		}

		if (!nextBlockId) {
			await db
				.update(conversations)
				.set({
					status: "closed",
					updatedAt: new Date(),
					...(hasTimer ? { offerCtaClickedAt: null, offerCtaBlockId: null } : {}),
				})
				.where(eq(conversations.id, conversationId));
			return { advanced: true };
		}

		const nextBlock = flow.blocks[nextBlockId];
		const now = new Date();
		await db
			.update(conversations)
			.set({
				currentBlockId: nextBlockId,
				currentBlockEnteredAt: now,
				lastNotificationSequenceSent: null,
				...(hasTimer ? { offerCtaClickedAt: null, offerCtaBlockId: null } : {}),
				userPath: [...((conversation.userPath as string[]) || []), nextBlockId].filter(Boolean),
				updatedAt: now,
			})
			.where(eq(conversations.id, conversationId));

		let message = (nextBlock?.message ?? "Thank you for your purchase. Here's your next option.").replace(/\[LINK\]/g, "").trim();
		if (nextBlock) {
			const link = await getBlockResourceLink(nextBlock, experienceId);
			const label = getProductCardButtonLabel(nextBlock.id, flow);
			const href = link || "#";
			const buttonHtml = `<div class="animated-gold-button" data-href="${escapeHtmlAttr(href)}">${label}</div>`;
			message = message ? `${message}\n\n${buttonHtml}` : buttonHtml;
		}
		await addMessage(conversationId, "bot", message);
		return { advanced: true };
	} catch (error) {
		console.error("Error advancing UpSell conversation on purchase:", error);
		return {
			advanced: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Tracking functions removed to prevent database conflicts and timeouts
