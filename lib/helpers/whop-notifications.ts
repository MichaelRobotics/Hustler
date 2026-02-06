/**
 * Whop Create Notification API
 * Sends push notifications to users; when they click, Whop opens the experience (app).
 * Uses @whop/sdk client with apiKey and appID. Requires notification:create permission.
 * @see https://docs.whop.com/api-reference/notifications/create-notification
 */

export interface SendNotificationInput {
	/** Whop experience ID (e.g. exp_xxx) so the notification opens your app when clicked */
	experience_id: string;
	/** User IDs to send to (within the experience); if omitted, sends to all experience members */
	user_ids?: string[];
	title: string;
	content: string;
	/** Optional path to append to deep link so the app opens to a specific view (e.g. chat) */
	rest_path?: string;
}

/**
 * Send a push notification via Whop API using @whop/sdk.
 * Uses WHOP_API_KEY and NEXT_PUBLIC_WHOP_APP_ID (app id).
 */
export async function sendWhopNotification(
	input: SendNotificationInput
): Promise<{ success: boolean; error?: string }> {
	const apiKey = process.env.WHOP_API_KEY;
	const appID = process.env.NEXT_PUBLIC_WHOP_APP_ID;
	if (!apiKey) {
		return { success: false, error: "WHOP_API_KEY not set" };
	}

	try {
		const Whop = (await import("@whop/sdk")).default;
		const client = new Whop({
			apiKey,
			appID: appID ?? undefined,
		});

		const notification = await client.notifications.create({
			experience_id: input.experience_id,
			user_ids: input.user_ids ?? null,
			title: input.title,
			content: input.content,
			...(input.rest_path != null && { rest_path: input.rest_path }),
		});

		return { success: notification.success };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { success: false, error: message };
	}
}
