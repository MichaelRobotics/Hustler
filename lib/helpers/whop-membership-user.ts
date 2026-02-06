/**
 * Retrieve membership from Whop API to get user email and id (for use when creating user records).
 * Uses @whop/sdk. Does not touch subscription/membership fields; only for reading user profile data.
 * @see https://docs.whop.com/api-reference/memberships/retrieve-membership
 */

export interface MembershipUserInfo {
	userId: string;
	email: string | null;
	name: string | null;
	username: string | null;
}

/**
 * Fetch membership by id and return user info (email, id, name, username).
 * Returns null if membership not found or API error.
 */
export async function getMembershipUserInfo(
	membershipId: string | null | undefined
): Promise<MembershipUserInfo | null> {
	if (!membershipId) return null;
	const apiKey = process.env.WHOP_API_KEY;
	if (!apiKey) return null;

	try {
		const Whop = (await import("@whop/sdk")).default;
		const client = new Whop({ apiKey });
		const membership = await client.memberships.retrieve(membershipId);
		const user = (membership as { user?: { id?: string; email?: string | null; name?: string | null; username?: string | null } }).user;
		if (!user?.id) return null;
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
