/**
 * User Join Actions
 * 
 * Handles user join events from Whop webhooks and initiates the chat funnel system.
 * This is part of Phase 1 of the Two-Phase Chat Initiation System.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { experiences, conversations, messages, users, funnelAnalytics, pendingTriggers } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import { createConversation, addMessage, getExperienceAppLink } from "./simplified-conversation-actions";
import type { FunnelFlow } from "../types/funnel";
import { getSendDmBlockId, getFirstRealBlockIdAfterSendDm } from "../types/funnel";
import { sendDmViaChannel } from "./send-dm-channel";
import { updateFunnelGrowthPercentages } from "./funnel-actions";
import { safeBackgroundTracking, trackAwarenessBackground } from "../analytics/background-tracking";
import { hasActiveConversation, findFunnelForTrigger, getEffectiveDelay } from "../helpers/conversation-trigger";
import type { FunnelForTrigger, TriggerContext } from "../helpers/conversation-trigger";

// Type definition for webhook data passed to handleUserJoinEvent
export interface UserJoinWebhookData {
	user_id: string;
	product_id: string;
	page_id: string;
	company_buyer_id?: string;
	membership_id?: string;
	plan_id?: string;
}

// Convert MembershipWebhookData to UserJoinWebhookData
export function convertWebhookData(data: any): UserJoinWebhookData {
	return {
		user_id: data.user_id || '',
		product_id: data.product_id || '',
		page_id: data.page_id || '',
		company_buyer_id: data.company_buyer_id,
		membership_id: data.membership_id,
		plan_id: data.plan_id,
	};
}

/**
 * Look up admin user by experience ID
 * Returns the admin's first name if found, null otherwise
 */
async function lookupAdminUser(experienceId: string): Promise<string | null> {
	try {
		console.log(`[Admin Lookup] Looking up admin user for experience: ${experienceId}`);
		
		const adminUser = await db.query.users.findFirst({
			where: and(
				eq(users.experienceId, experienceId),
				eq(users.accessLevel, "admin")
			),
		});

		if (adminUser?.name) {
			// Return first word of admin name (same logic as [USER] placeholder)
			const firstName = adminUser.name.split(' ')[0];
			console.log(`[Admin Lookup] Found admin user: ${adminUser.name} -> firstName: ${firstName}`);
			return firstName;
		} else {
			console.log(`[Admin Lookup] No admin user found for experience: ${experienceId}`);
			return null;
		}
	} catch (error) {
		console.error(`[Admin Lookup] Error looking up admin user for experience ${experienceId}:`, error);
		return null;
	}
}

/**
 * Look up current user by conversation ID
 * Returns the user's first name if found, null otherwise
 */
async function lookupCurrentUser(conversationId: string): Promise<string | null> {
	try {
		console.log(`[User Lookup] Looking up current user for conversation: ${conversationId}`);
		
		// Get conversation to find whopUserId
		const conversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, conversationId),
		});

		if (!conversation?.whopUserId) {
			console.log(`[User Lookup] No conversation or whopUserId found for conversation: ${conversationId}`);
			return null;
		}

		// Get user by whopUserId
		const user = await db.query.users.findFirst({
			where: eq(users.whopUserId, conversation.whopUserId),
		});

		if (user?.name) {
			// Return first word of user name (same logic as admin lookup)
			const firstName = user.name.split(' ')[0];
			console.log(`[User Lookup] Found user: ${user.name} -> firstName: ${firstName}`);
			return firstName;
		} else {
			console.log(`[User Lookup] No user found for whopUserId: ${conversation.whopUserId}`);
			return null;
		}
	} catch (error) {
		console.error(`[User Lookup] Error looking up current user for conversation ${conversationId}:`, error);
		return null;
	}
}

/**
 * Look up company name by experience ID
 * Returns the experience name (company name) if found, null otherwise
 */
async function lookupCompanyName(experienceId: string): Promise<string | null> {
	try {
		console.log(`[Company Lookup] Looking up experience name for experience: ${experienceId}`);
		
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: { name: true }
		});

		if (experience?.name) {
			console.log(`[Company Lookup] Found experience name: ${experience.name}`);
			return experience.name;
		} else {
			console.log(`[Company Lookup] No experience name found for experience: ${experienceId}`);
			return null;
		}
	} catch (error) {
		console.error(`[Company Lookup] Error looking up experience name for experience ${experienceId}:`, error);
		return null;
	}
}

/**
 * Resolve [USER] placeholder only. [WHOP] and [WHOP_OWNER] are resolved when generating/saving the funnel, not at conversation time.
 */
async function resolvePlaceholders(message: string, experienceId: string, conversationId: string): Promise<string> {
	let resolvedMessage = message;

	// Resolve [USER] placeholder (per-conversation)
	if (resolvedMessage.includes('[USER]')) {
		const userName = await lookupCurrentUser(conversationId);
		if (userName) {
			resolvedMessage = resolvedMessage.replace(/\[USER\]/g, userName);
			console.log(`[Placeholder Resolution] Replaced [USER] with: ${userName}`);
		} else {
			console.log(`[Placeholder Resolution] Current user not found, keeping [USER] placeholder`);
		}
	}

	return resolvedMessage;
}

/**
 * Handle user join event from webhook
 * 
 * @param userId - Whop user ID
 * @param productId - Whop product ID (from membership webhook)
 * @param webhookData - Full webhook data
 * @param membershipId - Whop membership ID (for DM operations)
 */
export async function handleUserJoinEvent(
	userId: string,
	productId: string,
	webhookData: UserJoinWebhookData,
	membershipId?: string,
): Promise<void> {
	try {
		console.log(`[USER-JOIN DEBUG] Processing user join event: ${userId} for product ${productId}`);
		console.log(`[USER-JOIN DEBUG] Webhook data:`, JSON.stringify(webhookData, null, 2));

		// Validate required fields
		if (!userId || !productId) {
			console.error("Missing required fields: userId or productId");
			return;
		}

		// Step 1: Find the experience by page_id (company ID)
		// This is the most reliable way since page_id is the company that owns the app
		console.log(`[USER-JOIN DEBUG] Looking for experience with whopCompanyId: ${webhookData.page_id}`);
		console.log(`[USER-JOIN DEBUG] Full webhook data structure:`, JSON.stringify(webhookData, null, 2));
		console.log(`[USER-JOIN DEBUG] page_id: ${webhookData.page_id}`);
		console.log(`[USER-JOIN DEBUG] company_buyer_id: ${webhookData.company_buyer_id}`);
		console.log(`[USER-JOIN DEBUG] product_id: ${webhookData.product_id}`);
		
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopCompanyId, webhookData.page_id),
		});

		if (!experience) {
			console.error(`[USER-JOIN DEBUG] No experience found for page_id ${webhookData.page_id}`);
			const availableExperiences = await db.query.experiences.findMany({
				columns: { whopCompanyId: true, whopExperienceId: true, name: true }
			});
			console.error(`[USER-JOIN DEBUG] Available experiences:`, availableExperiences);
			console.error(`[USER-JOIN DEBUG] Looking for exact match: ${webhookData.page_id}`);
			console.error(`[USER-JOIN DEBUG] Available whopCompanyIds:`, availableExperiences.map((e: any) => e.whopCompanyId));
			
			// Handle missing experience gracefully
			console.log(`[USER-JOIN DEBUG] ⚠️ Company ${webhookData.page_id} has no experience in database`);
			console.log(`[USER-JOIN DEBUG] ⚠️ This means the app is not installed on this company yet`);
			console.log(`[USER-JOIN DEBUG] ⚠️ Webhook received but no processing needed - company needs to install the app first`);
			return;
		}

		console.log(`Found experience ${experience.whopExperienceId} for product ${productId}`);

		// Step 2: Create user record (if not exists)
		const existingUser = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, userId),
				eq(users.experienceId, experience.id)
			),
		});

		if (!existingUser) {
			// Use global SDK
			const sdk = whopSdk;
			
			// Fetch user data from WHOP API (same strategy as user-context)
			const whopUser = await sdk.users.getUser({ userId: userId });

			if (!whopUser) {
				console.error("User not found in WHOP API:", userId);
				return;
			}

			// Determine initial access level from Whop API (same strategy as user-context)
			let accessLevel = "customer"; // Default fallback
			
			try {
				const accessResult = await sdk.access.checkIfUserHasAccessToExperience({
					userId: userId,
					experienceId: experience.whopExperienceId,
				});
				accessLevel = accessResult.accessLevel || "no_access";
				console.log(`Whop API access level: ${accessLevel}`);
			} catch (error) {
				console.error("Error checking initial access level:", error);
				accessLevel = "no_access"; // More restrictive fallback
			}
			
			// Create user in our database (same strategy as user-context)
			const [newUser] = await db
				.insert(users)
				.values({
					whopUserId: whopUser.id,
					experienceId: experience.id, // Link to experience
					email: "", // Email is not available in public profile
					name: whopUser.name || whopUser.username || "Unknown User",
					avatar: whopUser.profilePicture?.sourceUrl || null,
					credits: 0, // Customers get 0 credits
					accessLevel: accessLevel,
				})
				.returning();

			// Fetch the user with experience relation (same strategy as user-context)
			const user = await db.query.users.findFirst({
				where: eq(users.id, newUser.id),
				with: {
					experience: true,
				},
			});

			console.log(`✅ Created user record for ${userId} with access: ${accessLevel}`);
		} else {
			console.log(`User ${userId} already exists in experience ${experience.id}`);
		}

		// Step 3: Get user (internal id) for trigger filter
		const user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, userId),
				eq(users.experienceId, experience.id)
			),
		});

		if (!user) {
			console.error(`[USER-JOIN] User ${userId} not found in experience ${experience.id}`);
			return;
		}

		// Step 4: Find funnel by membership_activated trigger (hierarchy + config filters)
		const liveFunnel = await findFunnelForTrigger(experience.id, "membership_activated", {
			userId: user.id,
			whopUserId: userId,
			productId,
		});

		if (!liveFunnel?.flow) {
			console.log(`✅ Correctly handled: No funnel with membership_activated trigger found for experience ${experience.id} - user joined but no DM needed`);
			return;
		}

		const funnelFlow = liveFunnel.flow as FunnelFlow & { startBlockId: string };
		console.log(`Found funnel ${liveFunnel.id} for experience ${experience.id} and product ${productId} (membership_activated)`);

		// Step 5: Guard — one active conversation per user per experience; do not create a second
		if (await hasActiveConversation(experience.id, userId)) {
			console.log(`[USER-JOIN] User ${userId} already has active conversation in experience ${experience.id} - skipping conversation creation`);
			return;
		}

		console.log(`[USER-JOIN] Creating conversation for user ${userId} in experience ${experience.id}`);
		const conversationId = await createConversationWithDm(
			experience.id,
			liveFunnel.id,
			userId,
			funnelFlow,
			membershipId,
			productId,
		);

	// Track awareness (starts) when welcome message is sent - BACKGROUND PROCESSING
	console.log(`🚀 [USER-JOIN] About to track awareness for experience ${experience.id}, funnel ${liveFunnel.id}`);
	safeBackgroundTracking(() => trackAwarenessBackground(experience.id, liveFunnel.id));


	// DM monitoring is now handled by cron jobs - no need to start monitoring service
	// The cron jobs will automatically detect and process this conversation
	console.log(`Conversation ${conversationId} created - cron jobs will handle DM monitoring`);

		console.log(`Successfully processed user join for ${userId} with funnel ${liveFunnel.id} for product ${productId}`);
	} catch (error) {
		console.error("Error handling user join event:", error);
		// Don't throw - we want webhook to return 200 even if processing fails
	}
}


/**
 * Update conversation to WELCOME stage and save WELCOME message
 * 
 * @param conversationId - ID of the conversation to update
 * @param funnelFlow - Funnel flow to get WELCOME block
 */
export async function updateConversationToWelcomeStage(
	conversationId: string,
	funnelFlow: FunnelFlow,
): Promise<void> {
	try {
		// Get conversation to find experienceId
		const conversation = await db.query.conversations.findFirst({
			where: eq(conversations.id, conversationId),
		});

		if (!conversation) {
			console.error(`No conversation found for ${conversationId}`);
			return;
		}

		// Find the WELCOME stage
		const welcomeStage = funnelFlow.stages.find(
			stage => stage.name === "WELCOME"
		);
		
		if (!welcomeStage || welcomeStage.blockIds.length === 0) {
			console.error(`No WELCOME stage found in funnel flow for conversation ${conversationId}`);
			return;
		}
		
		const firstWelcomeBlockId = welcomeStage.blockIds[0];
		const welcomeBlock = funnelFlow.blocks[firstWelcomeBlockId];
		
		if (!welcomeBlock) {
			console.error(`WELCOME block ${firstWelcomeBlockId} not found in funnel flow for conversation ${conversationId}`);
			return;
		}
		
		const now = new Date();
		// Update conversation to WELCOME stage (using same pattern as navigate-funnel); set entered-at and reset notification sequence
		const updatedConversation = await db
			.update(conversations)
			.set({
				currentBlockId: firstWelcomeBlockId,
				currentBlockEnteredAt: now,
				lastNotificationSequenceSent: null,
				userPath: [firstWelcomeBlockId], // Start fresh with WELCOME block
				updatedAt: now,
			})
			.where(eq(conversations.id, conversationId))
			.returning();
		
		console.log(`[USER-JOIN] Updated conversation ${conversationId} to WELCOME stage with block ${firstWelcomeBlockId}`, updatedConversation);
		
		// Save WELCOME message to database with placeholder resolution
		if (welcomeBlock.message) {
			// Resolve placeholders before saving
			const resolvedMessage = await resolvePlaceholders(
				welcomeBlock.message, 
				conversation.experienceId, 
				conversationId
			);
			
			await db.insert(messages).values({
				conversationId: conversationId,
				type: "bot",
				content: resolvedMessage,
			});
			console.log(`[USER-JOIN] Saved WELCOME message to database for conversation ${conversationId}:`, resolvedMessage.substring(0, 100) + '...');
		}
		
	} catch (error) {
		console.error(`[USER-JOIN] Error updating conversation ${conversationId} to WELCOME stage:`, error);
		throw error;
	}
}

/**
 * Schedule a trigger for later (delayed) or fire it immediately.
 * If delayMinutes > 0, inserts into pending_triggers table for cron processing.
 * If delayMinutes === 0, fires immediately: creates conversation + sends DM.
 *
 * @returns conversationId if fired immediately, null if scheduled for later
 */
export async function scheduleOrFireTrigger(
	experienceId: string,
	funnel: FunnelForTrigger,
	whopUserId: string,
	triggerContext: TriggerContext,
	opts?: { membershipId?: string; productId?: string },
): Promise<string | null> {
	const funnelFlow = funnel.flow as FunnelFlow;
	const delay = getEffectiveDelay(funnel, triggerContext);
	console.log(`[scheduleOrFireTrigger] funnel=${funnel.id}, context=${triggerContext}, delay=${delay}min, delayMinutes=${funnel.delayMinutes}, membershipDelayMinutes=${funnel.membershipDelayMinutes}`);

	if (delay > 0) {
		// Schedule for later
		const fireAt = new Date(Date.now() + delay * 60 * 1000);
		try {
			await db.insert(pendingTriggers).values({
				experienceId,
				funnelId: funnel.id,
				whopUserId,
				triggerContext,
				membershipId: opts?.membershipId ?? null,
				productId: opts?.productId ?? null,
				fireAt,
				status: "pending",
			}).onConflictDoNothing(); // unique constraint prevents duplicates
			console.log(`[TRIGGER] Scheduled trigger for user ${whopUserId} in ${delay}min (fire_at: ${fireAt.toISOString()})`);
		} catch (err) {
			console.error(`[TRIGGER] Failed to schedule pending trigger:`, err);
		}
		return null;
	}

	// Fire immediately
	const conversationId = await createConversationWithDm(
		experienceId,
		funnel.id,
		whopUserId,
		funnelFlow,
		opts?.membershipId,
		opts?.productId,
	);
	return conversationId;
}

/**
 * Shared helper: create conversation + send DM if funnel has SEND_DM stage.
 * Used by all trigger paths (webhooks, app entry, cron for delayed triggers).
 *
 * @param experienceId - Internal experience UUID
 * @param funnelId - Internal funnel UUID
 * @param whopUserId - Whop user id of the customer
 * @param funnelFlow - Parsed funnel flow
 * @param membershipId - Optional membership id
 * @param productId - Optional product id
 */
export async function createConversationWithDm(
	experienceId: string,
	funnelId: string,
	whopUserId: string,
	funnelFlow: FunnelFlow,
	membershipId?: string,
	productId?: string,
): Promise<string> {
	const sendDmBlockId = getSendDmBlockId(funnelFlow);
	const firstRealBlockId = getFirstRealBlockIdAfterSendDm(funnelFlow);

	console.log(`[createConversationWithDm] experienceId=${experienceId}, funnelId=${funnelId}, whopUserId=${whopUserId}`);
	console.log(`[createConversationWithDm] sendDmBlockId=${sendDmBlockId}, firstRealBlockId=${firstRealBlockId}`);
	console.log(`[createConversationWithDm] stages:`, funnelFlow.stages.map(s => ({ name: s.name, blockIds: s.blockIds })));
	console.log(`[createConversationWithDm] startBlockId=${funnelFlow.startBlockId}`);

	if (sendDmBlockId && firstRealBlockId) {
		// Funnel has SEND_DM stage: send DM via Whop DM Channels; conversation starts at first real block
		const sendDmBlock = funnelFlow.blocks[sendDmBlockId];
		console.log(`[createConversationWithDm] SEND_DM block found:`, { id: sendDmBlockId, message: sendDmBlock?.message?.substring(0, 80), sendDmBlock: sendDmBlock?.sendDmBlock, optionsCount: sendDmBlock?.options?.length });

		const appLink = await getExperienceAppLink(experienceId);
		console.log(`[createConversationWithDm] appLink=${appLink}`);

		const rawDmContent = [sendDmBlock?.message?.trim(), appLink].filter(Boolean).join("\n\n") || appLink;
		console.log(`[createConversationWithDm] rawDmContent (first 120 chars): ${rawDmContent.substring(0, 120)}`);

		const conversationId = await createConversation(
			experienceId,
			funnelId,
			whopUserId,
			firstRealBlockId,
			membershipId,
			productId,
		);
		console.log(`[createConversationWithDm] Created conversation ${conversationId} at block ${firstRealBlockId}`);

		const resolvedDmContent = await resolvePlaceholders(rawDmContent, experienceId, conversationId);
		console.log(`[createConversationWithDm] Sending DM to ${whopUserId}...`);
		const dmSent = await sendDmViaChannel(experienceId, whopUserId, resolvedDmContent);
		console.log(`[createConversationWithDm] DM sent result: ${dmSent}`);
		if (!dmSent) {
			console.error(`[createConversationWithDm] Failed to send DM to user ${whopUserId}`);
		}

		// Add first in-app message (first real block) so UserChat/LiveChat show something
		const firstBlock = funnelFlow.blocks[firstRealBlockId];
		if (firstBlock?.message) {
			const resolvedFirstMessage = await resolvePlaceholders(firstBlock.message, experienceId, conversationId);
			await addMessage(conversationId, "bot", resolvedFirstMessage);
		}

		return conversationId;
	}

	// No SEND_DM stage: backward compat — create at startBlockId and move to WELCOME
	console.log(`[createConversationWithDm] No SEND_DM stage found — falling back to WELCOME path`);
	const conversationId = await createConversation(
		experienceId,
		funnelId,
		whopUserId,
		funnelFlow.startBlockId,
		membershipId,
		productId,
	);
	await updateConversationToWelcomeStage(conversationId, funnelFlow);
	return conversationId;
}

// Old tracking functions removed - now using background tracking service

