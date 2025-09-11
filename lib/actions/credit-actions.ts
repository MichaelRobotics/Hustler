"use server";

import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import {
	getUserCredits as getDbUserCredits,
	updateUserCredits,
	getUserContext,
} from "../context/user-context";
import { CREDIT_PACKS, type CreditPackId } from "../types/credit";
import type { AuthenticatedUser } from "../types/user";

/**
 * Get user's credit balance from database (experience-aware)
 */
export async function getUserCredits(experienceId: string): Promise<number> {
	try {
		const headersList = await headers();
		const { userId } = await whopSdk.verifyUserToken(headersList);

		// Get from database for specific experience
		return await getDbUserCredits(userId, experienceId);
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

		// Use experienceId from user context or provided parameter
		const expId = experienceId || user.experienceId;
		if (!expId) {
			console.error("No experienceId available for credit consumption");
			return false;
		}

		// Update credits in database for specific experience
		const success = await updateUserCredits(user.whopUserId, expId, 1, "subtract");

		if (success) {
			console.log(
				`Admin ${user.whopUserId} consumed 1 credit in experience ${expId}. Remaining: ${currentCredits - 1}`,
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
	amount: number,
): Promise<void> {
	try {
		const currentCredits = await getDbUserCredits(userId, experienceId);
		const success = await updateUserCredits(userId, experienceId, amount, "add");

		if (success) {
			console.log(
				`Added ${amount} credits to user ${userId} in experience ${experienceId}. New balance: ${currentCredits + amount}`,
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
