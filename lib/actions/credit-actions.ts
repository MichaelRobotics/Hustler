"use server";

import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import {
	getUserCredits as getDbUserCredits,
	updateUserCredits,
	getUserContext,
	invalidateUserCache,
} from "../context/user-context";
import { CREDIT_PACKS, type CreditPackId } from "../types/credit";
import type { AuthenticatedUser } from "../types/user";
import { db } from "../supabase/db-server";
import { users } from "../supabase/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get user's credit balance from database (experience-aware)
 */
export async function getUserCredits(experienceId: string): Promise<number> {
	try {
		const headersList = await headers();
		const { userId } = await whopSdk.verifyUserToken(headersList);

		// Get the full user context to get the database experience ID
		const userContext = await getUserContext(
			userId,
			"", // whopCompanyId is optional
			experienceId, // This is the Whop Experience ID
			false, // forceRefresh
		);

		if (!userContext) {
			console.error("User context not found for credits");
			return 0;
		}

		// Use the database experience ID from the user context
		return await getDbUserCredits(userId, userContext.user.experience.id);
	} catch (error) {
		console.error("Error getting user credits:", error);
		return 0; // Default to 0 credits (only admins get credits)
	}
}

/**
 * Check if user can generate (has credits available)
 * Only admins can generate funnels
 */
export async function canGenerate(user?: AuthenticatedUser, experienceId?: string): Promise<boolean> {
	try {
		// If no user provided, try to get from context
		if (!user) {
			const headersList = await headers();
			const { userId } = await whopSdk.verifyUserToken(headersList);
			
			// Use provided experienceId or fallback to environment variable
			const expId = experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
			
			// Get user context
			const userContext = await getUserContext(
				userId,
				"",
				expId,
				false
			);
			
			if (!userContext?.isAuthenticated) {
				return false;
			}
			
			user = userContext.user;
		}

		// Check if user is admin
		if (user.accessLevel !== "admin") {
			return false; // Only admins can generate
		}
		
		// Check if user has credits
		return (user.credits ?? 0) > 0; // Can generate if credits > 0
	} catch (error) {
		console.error("Error checking if user can generate:", error);
		return false;
	}
}

/**
 * Consume 1 credit for generation
 * Only admins can consume credits
 */
export async function consumeCredit(user?: AuthenticatedUser, experienceId?: string): Promise<boolean> {
	try {
		// If no user provided, try to get from context
		if (!user) {
			const headersList = await headers();
			const { userId } = await whopSdk.verifyUserToken(headersList);
			
			// Use provided experienceId or fallback to environment variable
			const expId = experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
			
			// Get user context
			const userContext = await getUserContext(
				userId,
				"",
				expId,
				false
			);
			
			if (!userContext?.isAuthenticated) {
				return false;
			}
			
			user = userContext.user;
		}

		// Check if user is admin
		if (user.accessLevel !== "admin") {
			return false; // Only admins can consume credits
		}

		// Check current credits first
		const currentCredits = user.credits ?? 0;

		if (currentCredits <= 0) {
			return false; // No credits available
		}

		// Get the database experience ID from user context
		let dbExperienceId: string;
		if (user.experienceId) {
			// If user has experienceId, it's the database UUID
			dbExperienceId = user.experienceId;
		} else if (experienceId) {
			// If experienceId is provided, get user context to get database ID
			const userContext = await getUserContext(
				user.whopUserId,
				"",
				experienceId, // This is the Whop Experience ID
				false
			);
			
			if (!userContext) {
				console.error("User context not found for credit consumption");
				return false;
			}
			
			dbExperienceId = userContext.user.experience.id;
		} else {
			console.error("No experienceId available for credit consumption");
			return false;
		}

		// Update credits in database for specific experience
		const success = await updateUserCredits(user.whopUserId, dbExperienceId, 1, "subtract");

		if (success) {
			console.log(
				`Admin ${user.whopUserId} consumed 1 credit in experience ${dbExperienceId}. Remaining: ${currentCredits - 1}`,
			);
		}

		return success;
	} catch (error) {
		console.error("Error consuming credit:", error);
		throw error;
	}
}

/**
 * Add credits to user's balance (called from webhook after purchase)
 * Note: This function needs experienceId to be passed from the webhook context
 */
export async function addCredits(
	userId: string,
	experienceId: string,
	amount: number | string,
): Promise<void> {
	try {
		// Ensure amount is an integer (credits column is integer type)
		const creditAmount = Math.floor(Number(amount));
		
		if (isNaN(creditAmount) || creditAmount < 0) {
			throw new Error(`Invalid credit amount: ${amount}`);
		}

		// Get user context to get the database experience ID
		const userContext = await getUserContext(
			userId,
			"", // whopCompanyId is optional
			experienceId, // This is the Whop Experience ID
			false, // forceRefresh
		);

		if (!userContext) {
			console.error("User context not found for adding credits");
			return;
		}

		const currentCredits = await getDbUserCredits(userId, userContext.user.experience.id);
		const success = await updateUserCredits(userId, userContext.user.experience.id, creditAmount, "add");

		if (success) {
			console.log(
				`Added ${creditAmount} credits to user ${userId} in experience ${experienceId}. New balance: ${currentCredits + creditAmount}`,
			);
		} else {
			throw new Error("Failed to add credits to database");
		}
	} catch (error) {
		console.error("Error adding credits:", error);
		throw error;
	}
}

/**
 * Create a charge for credit pack purchase
 */
export async function createCreditPackCharge(packId: CreditPackId): Promise<{
	status: "needs_action" | "success";
	inAppPurchase?: {
		id: string;
		planId: string;
	};
}> {
	try {
		const headersList = await headers();
		const { userId } = await whopSdk.verifyUserToken(headersList);

		const pack = CREDIT_PACKS[packId];
		if (!pack.planId) {
			throw new Error(`Plan ID not configured for pack ${packId}`);
		}

		// Create charge using Whop SDK
		const result = await whopSdk.payments.chargeUser({
			userId,
			amount: pack.price,
			currency: "usd",
			description: `${pack.name} - ${pack.credits} AI Funnel Credits`,
			metadata: {
				packId,
				credits: pack.credits,
				type: "credit_pack",
			},
		});

		if (!result) {
			throw new Error("Failed to create charge");
		}

		return {
			status: result.status as "needs_action" | "success",
			inAppPurchase: result.inAppPurchase
				? {
						id: result.inAppPurchase.id,
						planId: result.inAppPurchase.planId,
					}
				: undefined,
		};
	} catch (error) {
		console.error("Error creating credit pack charge:", error);
		throw error;
	}
}

/**
 * Get credit pack information
 */
export async function getCreditPack(packId: CreditPackId) {
	return CREDIT_PACKS[packId];
}

/**
 * Get all available credit packs
 */
export async function getAllCreditPacks() {
	return Object.values(CREDIT_PACKS);
}

/**
 * Add messages to user's balance (called from webhook after purchase)
 */
export async function addMessages(
	userId: string,
	experienceId: string,
	amount: number | string,
): Promise<void> {
	try {
		// Ensure amount is an integer (messages column is integer type)
		const messageAmount = Math.floor(Number(amount));
		
		if (isNaN(messageAmount) || messageAmount < 0) {
			throw new Error(`Invalid message amount: ${amount}`);
		}

		// Get user context to get the database experience ID
		const userContext = await getUserContext(
			userId,
			"", // whopCompanyId is optional
			experienceId, // This is the Whop Experience ID
			false, // forceRefresh
		);

		if (!userContext) {
			console.error("User context not found for adding messages");
			return;
		}

		// Get current messages
		const user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, userId),
				eq(users.experienceId, userContext.user.experience.id)
			),
		});

		if (!user) {
			console.error("User not found for adding messages");
			return;
		}

		const currentMessages = user.messages || 0;
		const newMessages = currentMessages + messageAmount;

		// Update messages in database
		await db
			.update(users)
			.set({
				messages: newMessages,
				updatedAt: new Date(),
			})
			.where(eq(users.id, user.id));

		// Invalidate cache for this user-experience combination
		invalidateUserCache(`${userId}:${experienceId}`);

		console.log(
			`Added ${messageAmount} messages to user ${userId} in experience ${experienceId}. New balance: ${newMessages}`,
		);
	} catch (error) {
		console.error("Error adding messages:", error);
		throw error;
	}
}

/**
 * Cancel a Whop membership
 */
export async function cancelMembership(membershipId: string): Promise<boolean> {
	try {
		if (!membershipId) {
			console.error("Membership ID is required for cancellation");
			return false;
		}

		console.log(`Cancelling membership: ${membershipId}`);
		
		// Use @whop/sdk directly for membership cancellation
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
		});
		
		await client.memberships.cancel(membershipId);
		console.log(`Successfully cancelled membership: ${membershipId}`);
		return true;
	} catch (error: any) {
		console.error(`Error cancelling membership ${membershipId}:`, error);
		// Don't throw - gracefully handle errors so webhook processing can continue
		return false;
	}
}

/**
 * Update user subscription tier (called from webhook after purchase)
 */
export async function updateUserSubscription(
	userId: string,
	experienceId: string,
	subscriptionType: "Basic" | "Pro" | "Vip",
	membershipId?: string | null,
): Promise<void> {
	try {
		// Get user context to get the database experience ID
		const userContext = await getUserContext(
			userId,
			"", // whopCompanyId is optional
			experienceId, // This is the Whop Experience ID
			false, // forceRefresh
		);

		if (!userContext) {
			console.error("User context not found for updating subscription");
			return;
		}

		// Get user from database
		const user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, userId),
				eq(users.experienceId, userContext.user.experience.id)
			),
		});

		if (!user) {
			console.error("User not found for updating subscription");
			return;
		}

		// Check if subscription type changed
		const subscriptionChanged = user.subscription !== subscriptionType;
		const oldMembershipId = user.membership;

		// If subscription type changed and user has an existing membership, cancel it
		if (subscriptionChanged && oldMembershipId) {
			console.log(`Subscription type changed from ${user.subscription} to ${subscriptionType}, cancelling old membership: ${oldMembershipId}`);
			await cancelMembership(oldMembershipId);
		}

		// Prepare update data
		const updateData: {
			subscription: "Basic" | "Pro" | "Vip";
			membership?: string | null;
			updatedAt: Date;
		} = {
			subscription: subscriptionType,
			updatedAt: new Date(),
		};

		// Update membership_id if provided (for both new subscriptions and renewals)
		if (membershipId) {
			updateData.membership = membershipId;
			console.log(`Updating membership_id to ${membershipId} for user ${userId}`);
		} else if (subscriptionChanged && !oldMembershipId) {
			// If subscription changed but no new membership_id provided, clear old membership
			updateData.membership = null;
		}

		// Update subscription and membership in database
		await db
			.update(users)
			.set(updateData)
			.where(eq(users.id, user.id));

		// Invalidate cache for this user-experience combination
		invalidateUserCache(`${userId}:${experienceId}`);

		console.log(
			`Updated subscription to ${subscriptionType} for user ${userId} in experience ${experienceId}${membershipId ? ` with membership ${membershipId}` : ''}`,
		);
	} catch (error) {
		console.error("Error updating subscription:", error);
		throw error;
	}
}
