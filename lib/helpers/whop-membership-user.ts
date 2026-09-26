/**
 * Retrieve a membership, then the buyer, on @whop/sdk@2.
 * Membership rows expose user_id, not a nested user. Email is only populated
 * on users.retrieve("me"); other users return null.
 */

import { createWhopRestClient } from "@/lib/whop-rest";

export interface MembershipUserInfo {
	userId: string;
	email: string | null;
	name: string | null;
	username: string | null;
}

export async function getMembershipUserInfo(
	membershipId: string | null | undefined,
): Promise<MembershipUserInfo | null> {
	if (!membershipId) return null;
	if (!process.env.WHOP_API_KEY) return null;

	try {
		const client = createWhopRestClient();
		const membership = await client.memberships.retrieve({ id: membershipId });
		if (!membership.user_id) return null;
		const user = await client.users.retrieve({ id: membership.user_id });
		return {
			userId: user.id,
			email: user.email ?? null,
			name: user.name ?? null,
			username: user.username ?? null,
		};
	} catch (err) {
		console.error("[getMembershipUserInfo] Error retrieving membership:", err);
		return null;
	}
}
