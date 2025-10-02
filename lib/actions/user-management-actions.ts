import { db } from "@/lib/supabase/db-server";
import { users, experiences, conversations, messages, funnelInteractions } from "@/lib/supabase/schema";
import { eq, and, inArray } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * Find or create user for conversation binding
 * This ensures we have a proper user record for conversation management
 */
export async function findOrCreateUserForConversation(
	whopUserId: string,
	experienceId: string,
	userInfo?: {
		email?: string;
		name?: string;
		avatar?: string;
	}
): Promise<string> {
	try {
		// First, try to find existing user
		const existingUser = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, whopUserId),
				eq(users.experienceId, experienceId)
			),
		});

		if (existingUser) {
			return existingUser.id;
		}

		// Fetch user data from WHOP API (same strategy as user-context)
		const whopUser = await whopSdk.users.getUser({ userId: whopUserId });

		if (!whopUser) {
			console.error("User not found in WHOP API:", whopUserId);
			throw new Error("User not found in WHOP API");
		}

		// Get experience data to check access level
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: { whopExperienceId: true }
		});

		// Determine initial access level from Whop API (same strategy as user-context)
		let accessLevel = "customer"; // Default fallback
		
		try {
			const accessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
				userId: whopUserId,
				experienceId: experience?.whopExperienceId || "",
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
				experienceId: experienceId, // Link to experience
				email: "", // Keep fallback for conversation context
				name: whopUser.name || whopUser.username || "Unknown User",
				avatar: whopUser.profilePicture?.sourceUrl || null,
				credits: 0, // Conversation users get 0 credits
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

		console.log(`Created new user for conversation: ${newUser.id} (${whopUserId})`);
		return newUser.id;
	} catch (error) {
		console.error("Error finding or creating user for conversation:", error);
		throw error;
	}
}


/**
 * Delete existing conversations for a user by whopUserId
 * This prevents multiple conversations per user and avoids constraint violations
 */
export async function deleteExistingConversationsByWhopUserId(
	whopUserId: string,
	experienceId: string
): Promise<number> {
	try {
		// First, get conversation IDs to delete related data
		const existingConversations = await db.query.conversations.findMany({
			where: and(
				eq(conversations.whopUserId, whopUserId),
				eq(conversations.experienceId, experienceId)
			),
			columns: { id: true }
		});

		if (existingConversations.length === 0) {
			console.log(`No existing conversations found for whopUserId ${whopUserId}`);
			return 0;
		}

		const conversationIds = existingConversations.map((c: any) => c.id);

		// Delete related data first (foreign key constraints)
		await db.delete(messages).where(inArray(messages.conversationId, conversationIds));
		await db.delete(funnelInteractions).where(inArray(funnelInteractions.conversationId, conversationIds));

		// Delete conversations
		const result = await db
			.delete(conversations)
			.where(
				and(
					eq(conversations.whopUserId, whopUserId),
					eq(conversations.experienceId, experienceId)
				)
			);

		console.log(`Deleted ${result.rowCount || 0} existing conversations for whopUserId ${whopUserId}`);
		return result.rowCount || 0;
	} catch (error) {
		console.error("Error deleting existing conversations by whopUserId:", error);
		throw error;
	}
}

/**
 * Delete existing conversations by membership ID
 * This ensures we don't have duplicate conversations for the same membership
 */
export async function deleteExistingConversationsByMembershipId(
	membershipId: string,
	experienceId: string,
): Promise<number> {
	try {
		// First, get conversation IDs to delete related data
		const existingConversations = await db.query.conversations.findMany({
			where: and(
				eq(conversations.membershipId, membershipId),
				eq(conversations.experienceId, experienceId)
			),
			columns: { id: true }
		});

		if (existingConversations.length === 0) {
			console.log(`No existing conversations found for membershipId ${membershipId}`);
			return 0;
		}

		const conversationIds = existingConversations.map((c: any) => c.id);

		// Delete related data first (foreign key constraints)
		await db.delete(messages).where(inArray(messages.conversationId, conversationIds));
		await db.delete(funnelInteractions).where(inArray(funnelInteractions.conversationId, conversationIds));

		// Delete conversations
		const result = await db
			.delete(conversations)
			.where(
				and(
					eq(conversations.membershipId, membershipId),
					eq(conversations.experienceId, experienceId)
				)
			);

		console.log(`Deleted ${result.rowCount || 0} existing conversations for membershipId ${membershipId}`);
		return result.rowCount || 0;
	} catch (error) {
		console.error("Error deleting existing conversations by membershipId:", error);
		throw error;
	}
}
