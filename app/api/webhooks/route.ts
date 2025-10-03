import { addCredits } from "@/lib/actions/credit-actions";
import type { CreditPackId } from "@/lib/types/credit";
import { waitUntil } from "@vercel/functions";
import { makeWebhookValidator } from "@whop/api";
import type { NextRequest } from "next/server";
import { handleUserJoinEvent } from "@/lib/actions/user-join-actions";
import { detectScenario, validateScenarioData } from "@/lib/analytics/scenario-detection";
import { getExperienceContextFromWebhook, validateExperienceContext } from "@/lib/analytics/experience-context";
import { trackPurchaseConversionWithScenario } from "@/lib/analytics/purchase-tracking";
import { db } from "@/lib/supabase/db-server";
import { experiences, users } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

export async function POST(request: NextRequest): Promise<Response> {
	// Store the original body for validation before parsing
	const originalBody = await request.text();
	
	// Parse the request body
	let webhookData;
	try {
		webhookData = JSON.parse(originalBody);
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
			// Create a new request with the original body for validation
			const validationRequest = new Request(request.url, {
				method: request.method,
				headers: request.headers,
				body: originalBody,
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
		const { id, final_amount, amount_after_fees, currency, user_id, metadata, plan_id, company_id } =
			webhookData.data;

		// Check if this is an app installation link (plan_id indicates app installation)
		if (plan_id) {
			console.log(`✅ App installation link detected (plan_id: ${plan_id}) - skipping payment webhook processing`);
			return new Response("OK", { status: 200 });
		}

		// final_amount is the amount the user paid
		// amount_after_fees is the amount that is received by you, after card fees and processing fees are taken out

		console.log(
			`Payment ${id} succeeded for user ${user_id} from company ${company_id} with amount ${final_amount} ${currency}`,
		);

		// Check if this is a credit pack purchase via chargeUser (metadata-based method)
		if (metadata?.type === "credit_pack" && metadata?.packId && metadata?.credits) {
			console.log(`Credit pack purchase detected via chargeUser: ${metadata.credits} credits for user ${user_id} from company ${company_id}`);
			
			waitUntil(
				handleCreditPackPurchaseWithCompany(
					user_id,
					company_id,
					metadata.packId as CreditPackId,
					metadata.credits as number,
					id,
				),
			);
		} else {
			// Handle other payment types with scenario detection and analytics
			waitUntil(
				handlePaymentWithAnalytics(webhookData.data),
			);
		}
	} else if (webhookData.action === "membership.went_valid") {
		const { user_id, product_id, membership_id, plan_id, company_buyer_id } = webhookData.data;

		console.log(
			`Membership went valid: User ${user_id} joined product ${product_id}, membership ${membership_id || 'N/A'}, plan_id: ${plan_id || 'N/A'}`,
		);

		// Handle user join event asynchronously
		// Pass product_id to find matching live funnel
		if (user_id && product_id) {
			waitUntil(
				handleUserJoinEvent(user_id, product_id, webhookData, membership_id),
			);
		} else if (company_buyer_id && product_id) {
			// Fallback: Get actual user ID (company owner) from company_buyer_id
			console.log(`user_id is null, attempting to get actual user ID from company_buyer_id: ${company_buyer_id}`);
			console.log(`Using company ID to fetch company owner user ID through WHOP API`);
			waitUntil(
				handleUserJoinEventWithCompanyFallback(company_buyer_id, product_id, webhookData, membership_id),
			);
		} else {
			console.error("Missing user_id/company_buyer_id or product_id in membership webhook");
		}
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

/**
 * Handle user join event with company fallback
 * Uses company_buyer_id to get the actual user ID (company owner) when user_id is null
 */
async function handleUserJoinEventWithCompanyFallback(
	company_buyer_id: string,
	product_id: string,
	webhookData: any,
	membership_id?: string,
): Promise<void> {
	try {
		console.log(`Company buyer ID provided: ${company_buyer_id}, fetching actual user ID...`);

		// Get company information to find the owner
		const company = await whopSdk.companies.getCompany({
			companyId: company_buyer_id,
		});

		if (!company) {
			console.error(`Company not found for company_buyer_id: ${company_buyer_id}`);
			return;
		}

		// The company object should contain owner information
		// Let's check what fields are available
		console.log(`Company found: ${company.title} (${company.id})`);
		console.log(`Company data:`, JSON.stringify(company, null, 2));

		// Try to get the owner user ID from the company data
		let ownerUserId: string | null = null;

		// Check if company has an owner field
		if ((company as any).owner?.id) {
			ownerUserId = (company as any).owner.id;
			console.log(`Found owner from company.owner.id: ${ownerUserId}`);
		}
		// Check if company has a user field
		else if ((company as any).user?.id) {
			ownerUserId = (company as any).user.id;
			console.log(`Found owner from company.user.id: ${ownerUserId}`);
		}
		// Check if company has a createdBy field
		else if ((company as any).createdBy?.id) {
			ownerUserId = (company as any).createdBy.id;
			console.log(`Found owner from company.createdBy.id: ${ownerUserId}`);
		}
		// Check if company has a userId field
		else if ((company as any).userId) {
			ownerUserId = (company as any).userId;
			console.log(`Found owner from company.userId: ${ownerUserId}`);
		}

		if (!ownerUserId) {
			console.error(`Could not find owner user ID for company ${company_buyer_id}`);
			console.error(`Available company fields:`, Object.keys(company));
			return;
		}

		console.log(`✅ Found company owner user ID: ${ownerUserId} for company: ${company_buyer_id}`);

		// Now use the actual user ID for the user join event
		await handleUserJoinEvent(ownerUserId, product_id, webhookData, membership_id);

	} catch (error) {
		console.error(`Error handling company_buyer_id ${company_buyer_id}:`, error);
	}
}

async function handleCreditPackPurchaseWithCompany(
	user_id: string | null | undefined,
	company_id: string | null | undefined,
	packId: CreditPackId,
	credits: number,
	paymentId: string,
) {
	if (!user_id) {
		console.error("No user_id provided for credit pack purchase");
		return;
	}

	if (!company_id) {
		console.error("No company_id provided for credit pack purchase");
		return;
	}

	console.log(`Processing credit pack purchase: ${credits} credits for user ${user_id} from company ${company_id}`);

	try {
		// 1. Find experience by company_id
		const experience = await db
			.select()
			.from(experiences)
			.where(eq(experiences.whopCompanyId, company_id))
			.limit(1);

		if (experience.length === 0) {
			console.error(`No experience found for company_id: ${company_id}`);
			return;
		}

		const experienceId = experience[0].id;
		console.log(`Found experience ${experienceId} for company ${company_id}`);

		// 2. Find user by user_id and experience_id
		const user = await db
			.select()
			.from(users)
			.where(
				and(
					eq(users.whopUserId, user_id),
					eq(users.experienceId, experienceId)
				)
			)
			.limit(1);

		if (user.length === 0) {
			console.error(`No user found with whop_user_id ${user_id} in experience ${experienceId}`);
			return;
		}

		const userId = user[0].id;
		console.log(`Found user ${userId} for whop_user_id ${user_id} in experience ${experienceId}`);

		// 3. Add credits to the user
		await addCredits(userId, experienceId, credits);
		console.log(`Successfully added ${credits} credits to user ${userId} in experience ${experienceId}`);

	} catch (error) {
		console.error("Error processing credit pack purchase with company:", error);
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
		
		// Handle free products as normal (not errors)
		if (scenarioData.scenario === 'free_product') {
			console.log(`[Webhook Analytics] ✅ Free product purchase - no analytics needed (this is normal)`);
			return;
		}

		if (!validateScenarioData(scenarioData)) {
			console.log(`[Webhook Analytics] ✅ Correctly handled: Invalid scenario data - skipping analytics`);
			return;
		}

		if (scenarioData.scenario === 'error') {
			console.log(`[Webhook Analytics] ✅ Correctly handled: Error scenario detected - skipping analytics`);
			return;
		}

		// Step 2: Get experience context
		const { experience, conversation } = await getExperienceContextFromWebhook(webhookData);
		
		if (!validateExperienceContext(experience, conversation)) {
			console.log(`[Webhook Analytics] 🚫 Purchase NOT through your funnel - skipping analytics (user bought independently)`);
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
			console.log(`[Webhook Analytics] ✅ Purchase THROUGH your funnel - analytics updated for scenario: ${scenarioData.scenario}`);
		} else {
			console.log(`[Webhook Analytics] ❌ Purchase THROUGH your funnel but failed to update analytics for scenario: ${scenarioData.scenario}`);
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


