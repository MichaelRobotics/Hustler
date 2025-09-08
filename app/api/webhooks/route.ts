import { addCredits, getCreditPack } from "@/lib/actions/credit-actions";
import type { CreditPackId } from "@/lib/types/credit";
import { waitUntil } from "@vercel/functions";
import { makeWebhookValidator } from "@whop/api";
import type { NextRequest } from "next/server";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

export async function POST(request: NextRequest): Promise<Response> {
	// Validate the webhook to ensure it's from Whop
	const webhookData = await validateWebhook(request);

	// Handle the webhook event
	if (webhookData.action === "payment.succeeded") {
		const { id, final_amount, amount_after_fees, currency, user_id, metadata } =
			webhookData.data;

		// final_amount is the amount the user paid
		// amount_after_fees is the amount that is received by you, after card fees and processing fees are taken out

		console.log(
			`Payment ${id} succeeded for ${user_id} with amount ${final_amount} ${currency}`,
		);

		// Check if this is a credit pack purchase
		if (
			metadata?.type === "credit_pack" &&
			metadata?.packId &&
			metadata?.credits
		) {
			waitUntil(
				handleCreditPackPurchase(
					user_id,
					metadata.packId as CreditPackId,
					metadata.credits as number,
					id,
				),
			);
		} else {
			// Handle other payment types
			waitUntil(
				potentiallyLongRunningHandler(
					user_id,
					final_amount,
					currency,
					amount_after_fees,
				),
			);
		}
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

async function handleCreditPackPurchase(
	user_id: string | null | undefined,
	packId: CreditPackId,
	credits: number,
	paymentId: string,
) {
	if (!user_id) {
		console.error("No user_id provided for credit pack purchase");
		return;
	}

	try {
		console.log(
			`Processing credit pack purchase: ${packId} for user ${user_id}`,
		);

		// Add credits to user's balance
		await addCredits(user_id, credits);

		// Get pack info for logging
		const pack = await getCreditPack(packId);
		console.log(
			`Successfully added ${credits} credits to user ${user_id} from ${pack.name} purchase`,
		);

		// You could also send a notification to the user here
		// await whopSdk.notifications.sendNotification({
		//   userId: user_id,
		//   title: 'Credits Added!',
		//   message: `You've received ${credits} credits from your ${pack.name} purchase!`
		// });
	} catch (error) {
		console.error("Error processing credit pack purchase:", error);
		// In production, you might want to implement retry logic or alerting here
	}
}

async function potentiallyLongRunningHandler(
	_user_id: string | null | undefined,
	_amount: number,
	_currency: string,
	_amount_after_fees: number | null | undefined,
) {
	// This is a placeholder for a potentially long running operation
	// In a real scenario, you might need to fetch user data, update a database, etc.
}
