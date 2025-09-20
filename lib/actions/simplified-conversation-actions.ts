/**
 * Simplified Conversation Actions
 * 
 * Consolidated conversation management with minimal complexity.
 * Handles all conversation operations in one place.
 */

import { and, eq, desc, asc, sql } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { conversations, messages, funnelInteractions, funnels, funnelAnalytics, experiences, resources } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import { getWhopApiClient } from "../whop-api-client";
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
	messages: Message[];
	funnel: {
		id: string;
		name: string;
		isDeployed: boolean;
	};
}

/**
 * Phase detection types
 */
export type ConversationPhase = 'PHASE1' | 'PHASE2' | 'TRANSITION' | 'COMPLETED';

/**
 * Detect conversation phase based on current block ID and funnel flow
 */
export function detectConversationPhase(currentBlockId: string | null, funnelFlow: FunnelFlow): ConversationPhase {
	if (!currentBlockId || !funnelFlow) {
		return 'COMPLETED';
	}

	// Find which stage this block belongs to
	for (const stage of funnelFlow.stages) {
		if (stage.blockIds.includes(currentBlockId)) {
			switch (stage.name) {
				case 'WELCOME':
					return 'PHASE1';
				case 'VALUE_DELIVERY':
					return 'PHASE2';
				default:
					return 'COMPLETED';
			}
		}
	}

	return 'COMPLETED';
}

/**
 * Check if a block is a transition block
 */
export function isTransitionBlock(block: FunnelBlock, funnelFlow: FunnelFlow): boolean {
	if (!block || !funnelFlow) return false;
	
	const transitionStage = funnelFlow.stages.find(stage => stage.name === 'TRANSITION');
	return transitionStage ? transitionStage.blockIds.includes(block.id) : false;
}

/**
 * Check if a block is a Phase 1 block (WELCOME stage)
 */
export function isPhase1Block(block: FunnelBlock, funnelFlow: FunnelFlow): boolean {
	if (!block || !funnelFlow) return false;
	
	const phase1Stages = ['WELCOME'];
	return phase1Stages.some(stageName => {
		const stage = funnelFlow.stages.find(s => s.name === stageName);
		return stage ? stage.blockIds.includes(block.id) : false;
	});
}

/**
 * Check if a block is a Phase 2 block (VALUE_DELIVERY stage)
 */
export function isPhase2Block(block: FunnelBlock, funnelFlow: FunnelFlow): boolean {
	if (!block || !funnelFlow) return false;
	
	const phase2Stages = ['VALUE_DELIVERY'];
	return phase2Stages.some(stageName => {
		const stage = funnelFlow.stages.find(s => s.name === stageName);
		return stage ? stage.blockIds.includes(block.id) : false;
	});
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
	membershipId?: string,
): Promise<string> {
	try {
		// Close any existing active conversations for this user
		await db.update(conversations)
			.set({
				status: "closed",
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
			membershipId,
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
		console.log(`[addMessage] Inserting message for conversation ${conversationId}:`, {
			type,
			content: content ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : 'no content',
		});

		const [newMessage] = await db.insert(messages).values({
			conversationId,
			type,
			content,
		}).returning();

		console.log(`[addMessage] Message inserted successfully with ID: ${newMessage.id}`);
		return newMessage.id;
	} catch (error) {
		console.error("Error adding message:", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			conversationId,
			type,
			content: content ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : 'no content',
		});
		throw error;
	}
}

/**
 * Update conversation current block and user path with phase detection
 */
export async function updateConversationBlock(
	conversationId: string,
	blockId: string,
	userPath: string[],
	experienceId: string,
): Promise<void> {
	try {
		// Get conversation with funnel data for phase detection
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId)
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation) {
			throw new Error(`Conversation ${conversationId} not found`);
		}

		const funnelFlow = conversation.funnel?.flow as FunnelFlow;
		if (!funnelFlow) {
			throw new Error(`Funnel flow not found for conversation ${conversationId}`);
		}

		// Detect current and new phases
		const currentPhase = detectConversationPhase(conversation.currentBlockId, funnelFlow);
		const newPhase = detectConversationPhase(blockId, funnelFlow);

		console.log(`[Phase Detection] Conversation ${conversationId}: ${currentPhase} → ${newPhase}`);

		// Prepare update data
		const updateData: any = {
			currentBlockId: blockId,
			userPath,
			updatedAt: new Date(),
		};

		// Handle Phase 2 start time tracking
		if (currentPhase === 'PHASE1' && newPhase === 'PHASE2') {
			console.log(`[Phase Transition] Phase 1 → Phase 2 detected for conversation ${conversationId}`);
			updateData.phase2StartTime = new Date();
		}

		// Update conversation
		await db.update(conversations)
			.set(updateData)
			.where(eq(conversations.id, conversationId));

		console.log(`[Phase Detection] Updated conversation ${conversationId} to phase ${newPhase}`);

		// Track interest when conversation reaches PAIN_POINT_QUALIFICATION stage
		const isPainPointQualificationStage = funnelFlow.stages.some(
			stage => stage.name === "PAIN_POINT_QUALIFICATION" && stage.blockIds.includes(blockId)
		);
		
		if (isPainPointQualificationStage) {
			console.log(`🚀 [UPDATE-CONVERSATION] About to track interest for experience ${conversation.experienceId}, funnel ${conversation.funnelId}`);
			safeBackgroundTracking(() => trackInterestBackground(conversation.experienceId, conversation.funnelId));
		}
	} catch (error) {
		console.error("Error updating conversation block:", error);
		throw error;
	}
}

/**
 * Update conversation timestamp
 */
export async function updateConversationTimestamp(conversationId: string): Promise<void> {
	try {
		await db.update(conversations)
			.set({
				updatedAt: new Date(),
			})
			.where(eq(conversations.id, conversationId));
	} catch (error) {
		console.error("Error updating conversation timestamp:", error);
		throw error;
	}
}

/**
 * Navigate to next block with immediate phase detection
 * This is the core function that triggers phase transitions
 */
export async function navigateToNextBlock(
	conversationId: string,
	nextBlockId: string,
	experienceId: string,
	selectedOptionText?: string,
): Promise<{
	success: boolean;
	phaseTransition?: ConversationPhase;
	error?: string;
}> {
	try {
		console.log(`[Navigate] Moving conversation ${conversationId} to block ${nextBlockId}`);

		// Get conversation with funnel data for phase detection
		const conversation = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.id, conversationId),
				eq(conversations.experienceId, experienceId)
			),
			with: {
				funnel: true,
			},
		});

		if (!conversation) {
			return { success: false, error: "Conversation not found" };
		}

		const funnelFlow = conversation.funnel?.flow as FunnelFlow;
		if (!funnelFlow) {
			return { success: false, error: "Funnel flow not found" };
		}

		// Detect current and new phases
		const currentPhase = detectConversationPhase(conversation.currentBlockId, funnelFlow);
		const newPhase = detectConversationPhase(nextBlockId, funnelFlow);

		console.log(`[Navigate] Phase transition: ${currentPhase} → ${newPhase}`);

		// Update conversation with phase detection
		const newUserPath = [...(conversation.userPath || []), nextBlockId].filter(Boolean);
		await updateConversationBlock(conversationId, nextBlockId, newUserPath, experienceId);

		// Record interaction if option text provided
		if (selectedOptionText) {
			await db.insert(funnelInteractions).values({
				conversationId,
				blockId: conversation.currentBlockId!,
				optionText: selectedOptionText,
				nextBlockId,
			});
		}

		// Check if this is a phase transition
		if (currentPhase !== newPhase) {
			console.log(`[Navigate] Phase transition detected: ${currentPhase} → ${newPhase}`);
			return {
				success: true,
				phaseTransition: newPhase,
			};
		}

		return { success: true };
	} catch (error) {
		console.error("Error navigating to next block:", error);
		return { 
			success: false, 
			error: error instanceof Error ? error.message : 'Unknown error' 
		};
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
	phaseTransition?: ConversationPhase;
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

		console.log(`[processUserMessage] Current block: ${currentBlockId}`, {
			message: currentBlock.message ? currentBlock.message.substring(0, 100) : 'no message',
			optionsCount: currentBlock.options?.length || 0
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

		// No valid option found - handle escalation
		console.log(`[processUserMessage] No valid option found, handling escalation for: "${messageContent}"`);
		return await handleEscalation(conversationId, messageContent, currentBlock);

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
	phaseTransition?: ConversationPhase;
	processedMessage?: string;
	messageId?: string;
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
		let messageId = null;
		if (nextBlock) {
			// Check if this is an OFFER stage block and handle resource lookup
			let formattedMessage = nextBlock.message || "Thank you for your response.";
			
			// Check if this block is in OFFER stage
			const isOfferBlock = nextBlockId ? funnelFlow.stages.some(
				stage => stage.name === 'OFFER' && stage.blockIds.includes(nextBlockId)
			) : false;
			
			if (isOfferBlock && nextBlock.resourceName) {
				console.log(`[OFFER] Processing OFFER block: ${nextBlockId} with resourceName: ${nextBlock.resourceName}`);
				
				try {
					// Lookup resource by name and experience
					const resource = await db.query.resources.findFirst({
						where: and(
							eq(resources.name, nextBlock.resourceName),
							eq(resources.experienceId, experienceId)
						),
					});
					
					if (resource) {
						console.log(`[OFFER] Found resource: ${resource.name} with link: ${resource.link}`);
						
						// Check if link already has affiliate parameters
						const hasAffiliate = resource.link.includes('app=') || resource.link.includes('ref=');
						
						if (!hasAffiliate) {
							console.log(`[OFFER] Adding affiliate parameters to resource link`);
							
							// Get affiliate app ID (same logic as product-sync)
							let affiliateAppId = experienceId; // Use experience ID as fallback
							try {
								const whopExperience = await whopSdk.experiences.getExperience({
									experienceId: experienceId,
								});
								affiliateAppId = whopExperience.app?.id || experienceId;
								console.log(`[OFFER] Got affiliate app ID: ${affiliateAppId}`);
							} catch (error) {
								console.log(`[OFFER] Could not get app ID, using experience ID: ${experienceId}`);
							}
							
							// Add affiliate parameter to the link
							const url = new URL(resource.link);
							url.searchParams.set('app', affiliateAppId);
							const affiliateLink = url.toString();
							
							console.log(`[OFFER] Generated affiliate link: ${affiliateLink}`);
							
							// Replace [LINK] placeholder with animated button HTML
							const buttonHtml = `<div class="animated-gold-button" data-href="${affiliateLink}">Get Your Free Guide</div>`;
							formattedMessage = formattedMessage.replace('[LINK]', buttonHtml);
							console.log(`[OFFER] Generated button HTML: ${buttonHtml}`);
							console.log(`[OFFER] Final formatted message: ${formattedMessage}`);
						} else {
							console.log(`[OFFER] Resource link already has affiliate parameters, using as-is`);
							// Replace [LINK] placeholder with animated button HTML
							const buttonHtml = `<div class="animated-gold-button" data-href="${resource.link}">Get Your Free Guide</div>`;
							formattedMessage = formattedMessage.replace('[LINK]', buttonHtml);
							console.log(`[OFFER] Generated button HTML: ${buttonHtml}`);
							console.log(`[OFFER] Final formatted message: ${formattedMessage}`);
						}
					} else {
						console.log(`[OFFER] Resource not found: ${nextBlock.resourceName}`);
						// Replace [LINK] placeholder with fallback text
						formattedMessage = formattedMessage.replace('[LINK]', '[Resource not found]');
					}
				} catch (error) {
					console.error(`[OFFER] Error processing resource lookup:`, error);
					// Replace [LINK] placeholder with fallback text
					formattedMessage = formattedMessage.replace('[LINK]', '[Error loading resource]');
				}
			} else if (formattedMessage.includes('[LINK]')) {
				// Handle other blocks that might have [LINK] placeholder
				console.log(`[LINK] Block ${nextBlockId} has [LINK] placeholder but is not OFFER stage`);
				// Replace [LINK] placeholder with fallback text
				formattedMessage = formattedMessage.replace('[LINK]', '[Link not available]');
			}
			
			if (nextBlock.options && nextBlock.options.length > 0) {
				const numberedOptions = nextBlock.options
					.map((opt: any, index: number) => `${index + 1}. ${opt.text}`)
					.join("\n");
				formattedMessage = `${formattedMessage}\n\n${numberedOptions}`;
			}

			botMessage = formattedMessage;

			// Record bot message (same as navigate-funnel)
			console.log(`[processValidOptionSelection] About to record bot message:`, {
				conversationId,
				hasAnimatedButton: formattedMessage.includes('animated-gold-button'),
				hasLinkPlaceholder: formattedMessage.includes('[LINK]'),
				messagePreview: formattedMessage ? formattedMessage.substring(0, 200) : 'no message'
			});
			messageId = await addMessage(conversationId, "bot", formattedMessage);
			console.log(`[processValidOptionSelection] Bot message recorded successfully with ID: ${messageId}`);
			console.log(`[processValidOptionSelection] Processed message content:`, formattedMessage);
			
			// Manually trigger frontend update with processed content
			// Since WebSocket might send before processing completes, we'll return the processed content
			// and let the API route handle the frontend notification
		}

		// Reset escalation level on valid response
		resetEscalationLevel(conversationId);

		console.log(`[processValidOptionSelection] Successfully processed option selection`);

		return {
			success: true,
			botMessage: botMessage || undefined,
			nextBlockId: nextBlockId || undefined,
			processedMessage: botMessage || undefined, // Include the fully processed message
			messageId: messageId || undefined,
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
				errorMessage = `Please choose from the provided options above:\n${(currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. ${opt.text}`).join('\n')}`;
				break;
			case 2:
				errorMessage = `I'll inform the Whop owner about your request. Please wait for assistance.`;
				break;
			case 3:
				errorMessage = `I'm unable to help you further. Please contact the Whop owner directly.`;
				break;
			default:
				errorMessage = `Please select one of the following options:\n${(currentBlock.options || []).map((opt: any, i: number) => `${i + 1}. ${opt.text}`).join('\n')}`;
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

		// Note: Interest tracking is handled in the load-conversation API when user actually enters the stage

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
 * Look up experience details by internal experience ID
 * Returns the experience data if found, null otherwise
 */
async function lookupExperience(experienceId: string): Promise<{ whopExperienceId: string; whopCompanyId: string; name: string } | null> {
  try {
    console.log(`[Experience Lookup] Looking up experience: ${experienceId}`);
    
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.id, experienceId),
    });

    if (experience?.whopExperienceId && experience?.whopCompanyId) {
      console.log(`[Experience Lookup] Found experience: ${experience.name} (${experience.whopExperienceId})`);
      return {
        whopExperienceId: experience.whopExperienceId,
        whopCompanyId: experience.whopCompanyId,
        name: experience.name
      };
    } else {
      console.log(`[Experience Lookup] Experience not found or missing data: ${experienceId}`);
      return null;
    }
  } catch (error) {
    console.error(`[Experience Lookup] Error looking up experience "${experienceId}":`, error);
    return null;
  }
}

/**
 * Generate app link using company route and app slug (same logic as product sync)
 * Returns the app URL if successful, null otherwise
 */
async function generateAppLink(whopExperienceId: string, whopCompanyId: string, experienceName: string): Promise<string | null> {
  try {
    console.log(`[App Link Generation] Generating app link for experience: ${experienceName}`);
    
    // Get Whop API client
    const whopClient = getWhopApiClient(whopCompanyId, 'system'); // Use 'system' as userId for API calls
    
    // Get company route (same as product sync)
    const companyRoute = await whopClient.getCompanyRoute();
    
    // Create a WhopApp-like object (same structure as in product sync)
    const appName = experienceName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const experienceIdSuffix = whopExperienceId.replace('exp_', '');
    const experienceSlug = `${appName}-${experienceIdSuffix}`;
    
    const mockApp = {
      id: whopExperienceId,
      name: experienceName,
      description: `App: ${experienceName}`,
      price: 0,
      currency: 'usd',
      discoveryPageUrl: undefined,
      checkoutUrl: undefined,
      route: undefined,
      experienceId: whopExperienceId,
      companyRoute: companyRoute || undefined, // Use actual company route
      appSlug: experienceSlug
    };
    
    // Use the same generateAppUrl method as product sync
    const appUrl = whopClient.generateAppUrl(mockApp, undefined, true);
    
    console.log(`[App Link Generation] Generated app URL: ${appUrl}`);
    return appUrl;
  } catch (error) {
    console.error(`[App Link Generation] Error generating app link:`, error);
    return null;
  }
}

/**
 * Replace [LINK] placeholders with actual app links for transition blocks
 */
async function resolveAppLinkPlaceholders(message: string, experienceId: string): Promise<string> {
  // Check if message contains [LINK] placeholder
  if (!message.includes('[LINK]')) {
    return message;
  }

  // Look up the experience details
  const experience = await lookupExperience(experienceId);
  
  if (!experience) {
    console.log(`[App Link Resolution] Experience not found, keeping [LINK] placeholder`);
    return message;
  }

  // Generate the app link
  const appLink = await generateAppLink(experience.whopExperienceId, experience.whopCompanyId, experience.name);
  
  if (appLink) {
    // Replace all [LINK] placeholders with the actual app link
    const resolvedMessage = message.replace(/\[LINK\]/g, appLink);
    console.log(`[App Link Resolution] Replaced [LINK] with: ${appLink}`);
    return resolvedMessage;
  } else {
    console.log(`[App Link Resolution] App link generation failed, keeping [LINK] placeholder`);
    return message;
  }
}

/**
 * Send transition message with app link resolution
 * This function handles [LINK] placeholders in transition blocks by replacing them with actual app links
 * 
 * @param whopUserId - Whop user ID
 * @param message - Transition message to send
 * @param experienceId - Internal experience ID (will be used to get Whop experience ID)
 * @returns Success status
 */
export async function sendTransitionMessage(
	whopUserId: string,
	message: string,
	experienceId: string,
): Promise<boolean> {
	try {
		console.log(`[Transition Message] Sending transition message to user ${whopUserId}`);

		// Resolve [LINK] placeholders with actual app links
		const resolvedMessage = await resolveAppLinkPlaceholders(message, experienceId);

		// Send DM using existing Whop SDK
		await whopSdk.messages.sendDirectMessageToUser({
			toUserIdOrUsername: whopUserId,
			message: resolvedMessage,
		});

		console.log(`[Transition Message] Successfully sent transition message to user ${whopUserId}`);
		return true;

	} catch (error) {
		console.error(`[Transition Message] Error sending transition message to user ${whopUserId}:`, error);
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
		status?: "active" | "closed" | "abandoned";
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

// Tracking functions removed to prevent database conflicts and timeouts
