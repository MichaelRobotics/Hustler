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
	console.log(`[WEBHOOK DEBUG] ==========================================`);
	console.log(`[WEBHOOK DEBUG] Processing webhook with action: ${webhookData.action}`);
	console.log(`[WEBHOOK DEBUG] Timestamp: ${new Date().toISOString()}`);
	console.log(`[WEBHOOK DEBUG] Experience ID: ${experienceId || 'Not provided'}`);
	console.log(`[WEBHOOK DEBUG] Test request: ${isTestRequest}`);
	console.log(`[WEBHOOK DEBUG] Webhook data:`, JSON.stringify(webhookData, null, 2));
	console.log(`[WEBHOOK DEBUG] ==========================================`);
	
	if (webhookData.action === "payment.succeeded") {
		console.log(`[PAYMENT DEBUG] ==========================================`);
		console.log(`[PAYMENT DEBUG] Processing payment.succeeded webhook`);
		
		const { id, final_amount, amount_after_fees, currency, user_id, metadata, plan_id, company_id } =
			webhookData.data;

		console.log(`[PAYMENT DEBUG] Payment details:`, {
			id,
			final_amount,
			amount_after_fees,
			currency,
			user_id,
			plan_id,
			company_id,
			metadata: metadata ? JSON.stringify(metadata) : 'None'
		});

		// Check if this is an app installation link (plan_id indicates app installation)
		if (plan_id) {
			console.log(`[PAYMENT DEBUG] ✅ App installation link detected (plan_id: ${plan_id}) - skipping payment webhook processing`);
			return new Response("OK", { status: 200 });
		}

		// final_amount is the amount the user paid
		// amount_after_fees is the amount that is received by you, after card fees and processing fees are taken out

		console.log(`[PAYMENT DEBUG] Payment ${id} succeeded for user ${user_id} from company ${company_id} with amount ${final_amount} ${currency}`);

		// Check if this is a credit pack purchase via chargeUser (metadata-based method)
		if (metadata?.type === "credit_pack" && metadata?.packId && metadata?.credits) {
			console.log(`[PAYMENT DEBUG] 💳 Credit pack purchase detected via chargeUser: ${metadata.credits} credits for user ${user_id} from company ${company_id}`);
			console.log(`[PAYMENT DEBUG] Credit pack details:`, {
				packId: metadata.packId,
				credits: metadata.credits,
				paymentId: id
			});
			
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
			console.log(`[PAYMENT DEBUG] 📊 Processing payment with scenario detection and analytics`);
			console.log(`[PAYMENT DEBUG] Payment metadata:`, metadata || 'No metadata');
			
			// Handle other payment types with scenario detection and analytics
			waitUntil(
				handlePaymentWithAnalytics(webhookData.data),
			);
		}
		
		console.log(`[PAYMENT DEBUG] ==========================================`);
	} else if (webhookData.action === "membership.went_valid") {
		console.log(`[MEMBERSHIP DEBUG] ==========================================`);
		console.log(`[MEMBERSHIP DEBUG] Processing membership.went_valid webhook`);
		
		const { user_id, product_id, membership_id, plan_id, company_buyer_id } = webhookData.data;

		console.log(`[MEMBERSHIP DEBUG] Membership details:`, {
			user_id,
			product_id,
			membership_id,
			plan_id,
			company_buyer_id,
			page_id: webhookData.data.page_id
		});

		console.log(`[MEMBERSHIP DEBUG] 🎉 Membership went valid: User ${user_id} joined product ${product_id}`);
		console.log(`[MEMBERSHIP DEBUG] Additional info: membership ${membership_id || 'N/A'}, plan_id: ${plan_id || 'N/A'}`);

		// Handle user join event asynchronously
		// Pass product_id to find matching live funnel
		if (user_id && product_id) {
			console.log(`[MEMBERSHIP DEBUG] 👤 Processing user join event for user ${user_id} and product ${product_id}`);
			waitUntil(
				handleUserJoinEvent(user_id, product_id, webhookData, membership_id),
			);
		} else if (company_buyer_id && product_id) {
			// Fallback: Get actual user ID (company owner) from company_buyer_id
			console.log(`[MEMBERSHIP DEBUG] 🏢 user_id is null, attempting to get actual user ID from company_buyer_id: ${company_buyer_id}`);
			console.log(`[MEMBERSHIP DEBUG] Using company ID to fetch company owner user ID through WHOP API`);
			waitUntil(
				handleUserJoinEventWithCompanyFallback(company_buyer_id, product_id, webhookData, membership_id),
			);
		} else {
			console.error(`[MEMBERSHIP DEBUG] ❌ Missing user_id/company_buyer_id or product_id in membership webhook`);
			console.error(`[MEMBERSHIP DEBUG] Available fields:`, {
				user_id: user_id || 'MISSING',
				product_id: product_id || 'MISSING',
				company_buyer_id: company_buyer_id || 'MISSING'
			});
		}
		
		console.log(`[MEMBERSHIP DEBUG] ==========================================`);
	} else {
		console.log(`[WEBHOOK DEBUG] ==========================================`);
		console.log(`[WEBHOOK DEBUG] ❓ Unrecognized webhook action: ${webhookData.action}`);
		console.log(`[WEBHOOK DEBUG] Full webhook data:`, JSON.stringify(webhookData, null, 2));
		console.log(`[WEBHOOK DEBUG] Supported actions: payment.succeeded, membership.went_valid`);
		console.log(`[WEBHOOK DEBUG] ==========================================`);
	}

	// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
	return new Response("OK", { status: 200 });
}

/**
 * Handle user join event with company fallback
 * Gets the admin member who made the company purchase
 */
async function handleUserJoinEventWithCompanyFallback(
	company_buyer_id: string,
	product_id: string,
	webhookData: any,
	membership_id?: string,
): Promise<void> {
	try {
		console.log(`Company buyer ID provided: ${company_buyer_id}, getting company members...`);

		// Try multiple approaches to find the company owner
		console.log(`🔍 Attempting to find company owner for ${company_buyer_id}...`);

		// Approach 1: Get company authorized users (explicitly added team members)
		const companyAuthorizedUsers = await whopSdk.companies.listAuthorizedUsers({
			companyId: company_buyer_id
		});

		console.log(`🔍 Company authorized users for ${company_buyer_id}:`, {
			totalUsers: companyAuthorizedUsers?.authorizedUsers?.length || 0,
			users: companyAuthorizedUsers?.authorizedUsers?.map(user => ({
				id: user?.id,
				userId: user?.userId,
				role: user?.role,
				name: user?.name
			}))
		});

		// Approach 2: Get company members (includes customers and members)
		const companyMembers = await whopSdk.companies.listMembers({
			companyId: company_buyer_id
		});

		console.log(`🔍 Company members for ${company_buyer_id}:`, {
			totalMembers: companyMembers?.members?.nodes?.length || 0,
			members: companyMembers?.members?.nodes?.map(member => ({
				id: member?.id,
				accessLevel: member?.accessLevel,
				status: member?.status,
				hasUser: !!member?.user,
				userId: member?.user?.id
			}))
		});

		// Approach 3: Get company info to see if we can find owner there
		const companyInfo = await whopSdk.companies.getCompany({
			companyId: company_buyer_id
		});

		console.log(`🔍 Company info for ${company_buyer_id}:`, {
			id: companyInfo?.id,
			title: companyInfo?.title
		});

		// Try to find owner from authorized users first
		const ownerUser = companyAuthorizedUsers?.authorizedUsers?.find(user => 
			user?.role === 'owner'
		);

		if (ownerUser?.userId) {
			console.log(`✅ Found owner user from authorized users: ${ownerUser.userId} (${ownerUser.name})`);
			await handleUserJoinEvent(ownerUser.userId, product_id, webhookData, membership_id);
			return;
		}

		// Try to find admin from authorized users
		const adminUser = companyAuthorizedUsers?.authorizedUsers?.find(user => 
			user?.role === 'admin'
		);

		if (adminUser?.userId) {
			console.log(`⚠️ No owner found, using admin from authorized users: ${adminUser.userId} (${adminUser.name})`);
			await handleUserJoinEvent(adminUser.userId, product_id, webhookData, membership_id);
			return;
		}

		// Try to find admin from company members
		const adminMember = companyMembers?.members?.nodes?.find(member => 
			member?.accessLevel === 'admin' && member?.user
		);

		if (adminMember?.user?.id) {
			console.log(`⚠️ No owner found in authorized users, using admin from members: ${adminMember.user.id} (${adminMember.user.name})`);
			await handleUserJoinEvent(adminMember.user.id, product_id, webhookData, membership_id);
			return;
		}

		// Try to find any member with a user
		const anyMemberWithUser = companyMembers?.members?.nodes?.find(member => 
			member?.user && member?.accessLevel !== 'no_access'
		);

		if (anyMemberWithUser?.user?.id) {
			console.log(`⚠️ No admin found, using any member with user: ${anyMemberWithUser.user.id} (${anyMemberWithUser.user.name}) with access level: ${anyMemberWithUser.accessLevel}`);
			await handleUserJoinEvent(anyMemberWithUser.user.id, product_id, webhookData, membership_id);
			return;
		}

		// If we get here, we couldn't find any user
		console.log(`⚠️ Company ${company_buyer_id} has no users we can identify - this is a valid scenario for company purchases`);
		console.log(`📝 Company purchase processed but no user credits added (company has no identifiable users to credit)`);
		console.log(`Available data:`, {
			authorizedUsers: companyAuthorizedUsers?.authorizedUsers?.length || 0,
			members: companyMembers?.members?.nodes?.length || 0,
			companyInfo: !!companyInfo
		});

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


