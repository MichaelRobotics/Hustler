import { addCredits, getCreditPack } from "@/lib/actions/credit-actions";
import type { CreditPackId } from "@/lib/types/credit";
import { waitUntil } from "@vercel/functions";
import { makeWebhookValidator } from "@whop/api";
import type { NextRequest } from "next/server";
import { handleUserJoinEvent } from "@/lib/actions/user-join-actions";
import { detectScenario, validateScenarioData } from "@/lib/analytics/scenario-detection";
import { getExperienceContextFromWebhook, validateExperienceContext } from "@/lib/analytics/experience-context";
import { trackPurchaseConversionWithScenario } from "@/lib/analytics/purchase-tracking";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

export async function POST(request: NextRequest): Promise<Response> {
	// Parse the request body first
	let webhookData;
	try {
		webhookData = await request.json();
		console.log("Received webhook data:", webhookData);
	} catch (parseError) {
		console.error("Failed to parse request body:", parseError);
		return new Response("Invalid webhook request", { status: 400 });
	}

	// Extract experience ID from X-Experience-ID header for multi-tenancy
	const experienceId = request.headers.get('X-Experience-ID');
	if (experienceId && webhookData.data) {
		// Don't override company_id - let the experience context system handle the lookup
		// The company_id should remain as the Whop company ID from the webhook
		console.log(`[Webhook] Processing webhook for experience: ${experienceId}`);
	}

	// Check if this is a test request (bypass validation)
	const isTestRequest = request.headers.get('X-Test-Bypass') === 'true';
	
	if (!isTestRequest) {
		// Validate the webhook signature for production requests
		try {
			// Create a new request with the same body for validation
			const validationRequest = new Request(request.url, {
				method: request.method,
				headers: request.headers,
				body: JSON.stringify(webhookData),
			});
			
			await validateWebhook(validationRequest);
			console.log("Webhook signature validation passed");
		} catch (error) {
			console.error("Webhook signature validation failed:", error);
			return new Response("Invalid webhook signature", { status: 401 });
		}
	} else {
		console.log("Skipping signature validation for test request");
	}

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
					metadata?.experienceId as string, // Pass experienceId from metadata
				),
			);
		} else {
			// Handle other payment types with scenario detection and analytics
			waitUntil(
				handlePaymentWithAnalytics(webhookData.data),
			);
		}
	} else if (webhookData.action === "membership.went_valid") {
		const { user_id, product_id, membership_id } = webhookData.data;

		console.log(
			`Membership went valid: User ${user_id} joined product ${product_id}, membership ${membership_id}`,
		);

		// Handle user join event asynchronously
		// Pass product_id to find matching live funnel
		if (user_id && product_id) {
			waitUntil(
				handleUserJoinEvent(user_id, product_id, webhookData, membership_id),
			);
		} else {
			console.error("Missing user_id or product_id in membership webhook");
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
	experienceId?: string,
) {
	if (!user_id) {
		console.error("No user_id provided for credit pack purchase");
		return;
	}

	// Use provided experienceId or fallback to environment variable
	const expId = experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
	
	if (!expId) {
		console.error("No experienceId available for credit pack purchase");
		return;
	}

	try {
		console.log(
			`Processing credit pack purchase: ${packId} for user ${user_id} in experience ${expId}`,
		);

		// Add credits to user's balance for specific experience
		await addCredits(user_id, expId, credits);

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

/**
 * Handle payment with scenario detection and analytics
 */
async function handlePaymentWithAnalytics(webhookData: any) {
	try {
		console.log(`[Webhook Analytics] Processing payment webhook for user: ${webhookData.user_id}`);

		// Step 1: Detect scenario (affiliate vs product owner vs error)
		const scenarioData = await detectScenario(webhookData);
		
		if (!validateScenarioData(scenarioData)) {
			console.log(`[Webhook Analytics] Invalid scenario data - skipping analytics`);
			return;
		}

		if (scenarioData.scenario === 'error') {
			console.log(`[Webhook Analytics] Error scenario detected - skipping analytics`);
			return;
		}

		// Step 2: Get experience context
		const { experience, conversation } = await getExperienceContextFromWebhook(webhookData);
		
		if (!validateExperienceContext(experience, conversation)) {
			console.log(`[Webhook Analytics] Invalid experience context - skipping analytics`);
			return;
		}

		// Step 3: Update analytics with scenario-based revenue attribution
		const success = await trackPurchaseConversionWithScenario(
			scenarioData,
			conversation,
			conversation!.funnelId,
			experience!.experienceId
		);

		if (success) {
			console.log(`[Webhook Analytics] Successfully updated analytics for scenario: ${scenarioData.scenario}`);
		} else {
			console.log(`[Webhook Analytics] Failed to update analytics for scenario: ${scenarioData.scenario}`);
		}

	} catch (error) {
		console.error(`[Webhook Analytics] Error processing payment analytics:`, error);
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


