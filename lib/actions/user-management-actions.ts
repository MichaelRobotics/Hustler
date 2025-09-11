import { db } from "@/lib/supabase/db-server";
import { users, experiences, conversations } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";

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

		// Create new user if not found
		const [newUser] = await db.insert(users).values({
			whopUserId,
			experienceId,
			email: userInfo?.email || `${whopUserId}@whop.com`,
			name: userInfo?.name || `User ${whopUserId.slice(-8)}`,
			avatar: userInfo?.avatar,
			credits: 0, // Default 0 credits for new users
		}).returning();

		console.log(`Created new user for conversation: ${newUser.id} (${whopUserId})`);
		return newUser.id;
	} catch (error) {
		console.error("Error finding or creating user for conversation:", error);
		throw error;
	}
}


/**
 * Close existing active conversations for a user by whopUserId
 * This prevents multiple active conversations per user (faster lookup)
 */
export async function closeExistingActiveConversationsByWhopUserId(
	whopUserId: string,
	experienceId: string
): Promise<number> {
	try {
		const result = await db
			.update(conversations)
			.set({ 
				status: "completed",
				updatedAt: new Date()
			})
			.where(
				and(
					eq(conversations.whopUserId, whopUserId),
					eq(conversations.experienceId, experienceId),
					eq(conversations.status, "active")
				)
			);

		console.log(`Closed ${result.rowCount || 0} existing active conversations for whopUserId ${whopUserId}`);
		return result.rowCount || 0;
	} catch (error) {
		console.error("Error closing existing active conversations by whopUserId:", error);
		throw error;
	}
}
