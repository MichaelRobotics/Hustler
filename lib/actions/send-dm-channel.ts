/**
 * Send DM via Whop DM Channels API as the Whop admin who installed the app.
 * - Company admin: resolved from users table (experienceId + accessLevel === "admin"), used for channel and message sender.
 * - Channels: create/manage using company admin Whop user id + customer Whop user id; cached in dm_channels by companyId.
 * - Messages: same Whop API calls; create message includes user_id of company admin so message appears from admin, not agent.
 * @see https://docs.whop.com/api-reference/dm-channels/list-dm-channels
 * @see https://docs.whop.com/api-reference/dm-channels/create-dm-channel
 * @see https://docs.whop.com/api-reference/dm-members/create-dm-member
 * @see https://docs.whop.com/api-reference/messages/create-message
 */

import { and, eq } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { dmChannels, experiences, users } from "../supabase/schema";

const WHOP_API_BASE = "https://api.whop.com/api/v1";

function getAuthHeaders(): Record<string, string> {
	const apiKey = process.env.WHOP_API_KEY;
	if (!apiKey) throw new Error("WHOP_API_KEY is required for DM channel operations");
	return {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
	};
}

/**
 * Look up cached channel id by company + admin + customer.
 */
export async function getCachedDmChannelId(
	companyId: string,
	adminWhopUserId: string,
	customerWhopUserId: string
): Promise<string | null> {
	const row = await db.query.dmChannels.findFirst({
		where: and(
			eq(dmChannels.companyId, companyId),
			eq(dmChannels.adminWhopUserId, adminWhopUserId),
			eq(dmChannels.customerWhopUserId, customerWhopUserId)
		),
		columns: { channelId: true },
	});
	return row?.channelId ?? null;
}

/**
 * Create a DM channel via Whop API and cache it.
 */
async function createDmChannelAndCache(
	companyId: string,
	adminWhopUserId: string,
	customerWhopUserId: string
): Promise<string> {
	const body = { with_user_ids: [adminWhopUserId, customerWhopUserId] };
	console.log(`[send-dm-channel] POST ${WHOP_API_BASE}/dm_channels`, JSON.stringify(body));
	const res = await fetch(`${WHOP_API_BASE}/dm_channels`, {
		method: "POST",
		headers: getAuthHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const errText = await res.text();
		console.error(`[send-dm-channel] Create DM channel response: ${res.status}`, errText);
		throw new Error(`Whop create DM channel failed: ${res.status} ${errText}`);
	}
	const data = (await res.json()) as { id?: string };
	console.log(`[send-dm-channel] Create DM channel response:`, JSON.stringify(data));
	const channelId = data?.id;
	if (!channelId || typeof channelId !== "string") {
		throw new Error("Whop create DM channel response missing id");
	}
	await db.insert(dmChannels).values({
		companyId,
		adminWhopUserId,
		customerWhopUserId,
		channelId,
		updatedAt: new Date(),
	});
	console.log(`[send-dm-channel] Cached channel ${channelId} in dm_channels table`);
	return channelId;
}

/**
 * Add a user to a DM channel (if the create-channel API did not add them).
 */
async function addDmMember(channelId: string, userId: string): Promise<void> {
	const res = await fetch(`${WHOP_API_BASE}/dm_members`, {
		method: "POST",
		headers: getAuthHeaders(),
		body: JSON.stringify({ channel_id: channelId, user_id: userId }),
	});
	if (!res.ok) {
		const errText = await res.text();
		console.warn(`[send-dm-channel] Add DM member failed (may already be member): ${res.status} ${errText}`);
	}
}

/**
 * Send a message to a DM channel as the Whop admin (so it appears from the admin who installed the app, not as an agent).
 */
async function sendMessageToChannel(
	channelId: string,
	content: string,
	adminWhopUserId: string
): Promise<void> {
	const body = { channel_id: channelId, content, user_id: adminWhopUserId };
	console.log(`[send-dm-channel] POST ${WHOP_API_BASE}/messages — channel=${channelId}, as admin=${adminWhopUserId}, content length=${content.length}`);
	const res = await fetch(`${WHOP_API_BASE}/messages`, {
		method: "POST",
		headers: getAuthHeaders(),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const errText = await res.text();
		console.error(`[send-dm-channel] Send message response: ${res.status}`, errText);
		throw new Error(`Whop create message failed: ${res.status} ${errText}`);
	}
	console.log(`[send-dm-channel] Message sent successfully to channel ${channelId} as admin`);
}

/**
 * Get or create a DM channel for admin + customer (scoped by companyId). Returns channel id.
 */
export async function getOrCreateDmChannel(
	companyId: string,
	adminWhopUserId: string,
	customerWhopUserId: string
): Promise<string> {
	const cached = await getCachedDmChannelId(companyId, adminWhopUserId, customerWhopUserId);
	if (cached) {
		console.log(`[send-dm-channel] Using cached channel: ${cached}`);
		return cached;
	}
	console.log(`[send-dm-channel] No cached channel — creating new DM channel via Whop API`);
	const channelId = await createDmChannelAndCache(companyId, adminWhopUserId, customerWhopUserId);
	console.log(`[send-dm-channel] Created channel ${channelId}, adding members...`);
	// Optionally ensure both members are in the channel (if create doesn't add them)
	try {
		await addDmMember(channelId, adminWhopUserId);
		await addDmMember(channelId, customerWhopUserId);
	} catch (_) {
		// Non-fatal; channel may already have members
	}
	return channelId;
}

/**
 * Send a DM to the customer via Whop native DM channel.
 * Resolves companyId and admin from experienceId, gets/creates channel, sends message.
 * @param experienceId - Experience UUID (experiences.id)
 * @param customerWhopUserId - Whop user id of the customer
 * @param content - Message content (e.g. Send DM block text + app link)
 */
export async function sendDmViaChannel(
	experienceId: string,
	customerWhopUserId: string,
	content: string
): Promise<boolean> {
	console.log(`[send-dm-channel] START — experienceId=${experienceId}, customer=${customerWhopUserId}, content length=${content.length}`);
	try {
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: { whopCompanyId: true },
		});
		console.log(`[send-dm-channel] Experience lookup:`, { found: !!experience, whopCompanyId: experience?.whopCompanyId });
		if (!experience?.whopCompanyId) {
			console.error("[send-dm-channel] Experience not found or missing whopCompanyId:", experienceId);
			return false;
		}
		const adminUser = await db.query.users.findFirst({
			where: and(eq(users.experienceId, experienceId), eq(users.accessLevel, "admin")),
			columns: { whopUserId: true },
		});
		console.log(`[send-dm-channel] Admin user lookup:`, { found: !!adminUser, adminWhopUserId: adminUser?.whopUserId });
		if (!adminUser?.whopUserId) {
			console.error("[send-dm-channel] No admin user for experience:", experienceId);
			return false;
		}
		const companyId = experience.whopCompanyId;
		const adminWhopUserId = adminUser.whopUserId;
		console.log(`[send-dm-channel] Getting/creating DM channel: company=${companyId}, admin=${adminWhopUserId}, customer=${customerWhopUserId}`);
		const channelId = await getOrCreateDmChannel(companyId, adminWhopUserId, customerWhopUserId);
		console.log(`[send-dm-channel] Channel ID: ${channelId}`);
		console.log(`[send-dm-channel] Sending message to channel as Whop admin...`);
		await sendMessageToChannel(channelId, content, adminWhopUserId);
		console.log(`[send-dm-channel] SUCCESS — DM sent to ${customerWhopUserId} via channel ${channelId}`);
		return true;
	} catch (err) {
		console.error("[send-dm-channel] Error:", err);
		return false;
	}
}
