import { makeWebhookValidator, type PaymentWebhookData, type MembershipWebhookData } from "@whop/api";
import { after } from "next/server";
import { handleUserJoinEvent, convertWebhookData } from "@/lib/actions/user-join-actions";
import { addCredits } from "@/lib/actions/credit-actions";
import type { CreditPackId } from "@/lib/types/credit";
import { detectScenario, validateScenarioData } from "@/lib/analytics/scenario-detection";
import { getExperienceContextFromWebhook, validateExperienceContext } from "@/lib/analytics/experience-context";
import { trackPurchaseConversionWithScenario } from "@/lib/analytics/purchase-tracking";
import { db } from "@/lib/supabase/db-server";
import { experiences, users } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";

// Validate webhook secret exists
if (!process.env.WHOP_WEBHOOK_SECRET) {
  throw new Error("WHOP_WEBHOOK_SECRET environment variable is required");
}

const validateWebhook = makeWebhookValidator({
  webhookSecret: process.env.WHOP_WEBHOOK_SECRET,
});

export async function POST(request: Request) {
  // Validate the webhook to ensure it's from Whop
  const webhook = await validateWebhook(request);

  // Handle the webhook event
  if (webhook.action === "payment.succeeded") {
    after(handlePaymentSucceededWebhook(webhook.data));
  } else if (webhook.action === "membership.went_valid") {
    after(handleMembershipWentValidWebhook(webhook.data));
  }

  // Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceededWebhook(data: PaymentWebhookData) {
  const { id, user_id, subtotal, amount_after_fees, metadata } = data;

  // Check if this is a credit pack purchase via chargeUser (metadata-based method)
  if (metadata?.type === "credit_pack" && metadata?.packId && metadata?.credits) {
    console.log(`Credit pack purchase detected via chargeUser: ${metadata.credits} credits for user ${user_id}`);
    
    await handleCreditPackPurchaseWithCompany(
      user_id,
      data.company_id,
      metadata.packId as CreditPackId,
      metadata.credits as number,
      id,
    );
  } else {
    // Handle other payment types with scenario detection and analytics
    await handlePaymentWithAnalytics(data);
  }
}

async function handleMembershipWentValidWebhook(data: MembershipWebhookData) {
  const { user_id, product_id, plan_id, company_buyer_id, page_id } = data;
  const membership_id = (data as any).membership_id; // Type assertion for additional field

  console.log(`Membership went valid: User ${user_id} joined product ${product_id}, membership ${membership_id || 'N/A'}, plan_id: ${plan_id || 'N/A'}`);

  // Extract company context from webhook data for multi-company support
  const companyId = company_buyer_id || page_id;
  
  // Create company-specific SDK instance
  const whopSdkWithCompany = whopSdk.withCompany(companyId);
  
  // Handle user join event asynchronously
  if (user_id && product_id) {
    await handleUserJoinEvent(user_id, product_id, convertWebhookData(data), membership_id, whopSdkWithCompany);
  } else if (company_buyer_id && product_id) {
    // Fallback: Get actual user ID (company owner) from company_buyer_id
    await handleUserJoinEventWithCompanyFallback(company_buyer_id, product_id, data, membership_id, whopSdkWithCompany);
  } else {
    console.error("Missing user_id/company_buyer_id or product_id in membership webhook");
  }
}

/**
 * Handle user join event with company fallback
 * Gets the admin member who made the company purchase
 */
async function handleUserJoinEventWithCompanyFallback(
	company_buyer_id: string,
	product_id: string,
	webhookData: MembershipWebhookData,
	membership_id?: string,
	whopSdkWithCompany?: any,
): Promise<void> {
	try {
		console.log(`Company buyer ID provided: ${company_buyer_id}, getting company members...`);

		// Try multiple approaches to find the company owner
		console.log(`🔍 Attempting to find company owner for ${company_buyer_id}...`);

		// Use company-specific SDK if provided, otherwise fall back to global SDK
		const sdk = whopSdkWithCompany || whopSdk;
		
		// Approach 1: Get company authorized users (explicitly added team members)
		const companyAuthorizedUsers = await sdk.companies.listAuthorizedUsers({
			companyId: company_buyer_id
		});

		console.log(`🔍 Company authorized users for ${company_buyer_id}:`, {
			totalUsers: companyAuthorizedUsers?.authorizedUsers?.length || 0,
			users: companyAuthorizedUsers?.authorizedUsers?.map((user: any) => ({
				id: user?.id,
				userId: user?.userId,
				role: user?.role,
				name: user?.name
			}))
		});

		// Approach 2: Get company members (includes customers and members)
		const companyMembers = await sdk.companies.listMembers({
			companyId: company_buyer_id
		});

		console.log(`🔍 Company members for ${company_buyer_id}:`, {
			totalMembers: companyMembers?.members?.nodes?.length || 0,
			members: companyMembers?.members?.nodes?.map((member: any) => ({
				id: member?.id,
				status: member?.status,
				hasUser: !!member?.user,
				userId: member?.user?.id
			}))
		});

		// Approach 3: Get company info to see if we can find owner there
		const companyInfo = await sdk.companies.getCompany({
			companyId: company_buyer_id
		});

		console.log(`🔍 Company info for ${company_buyer_id}:`, {
			id: companyInfo?.id,
			title: companyInfo?.title
		});

		// Try to find owner from authorized users first
		const ownerUser = companyAuthorizedUsers?.authorizedUsers?.find((user: any) => 
			user?.role === 'owner'
		);

		if (ownerUser?.userId) {
			console.log(`✅ Found owner user from authorized users: ${ownerUser.userId} (${ownerUser.name})`);
			await handleUserJoinEvent(ownerUser.userId, product_id, convertWebhookData(webhookData), membership_id, whopSdkWithCompany);
			return;
		}

		// Try to find admin from authorized users
		const adminUser = companyAuthorizedUsers?.authorizedUsers?.find((user: any) => 
			user?.role === 'admin'
		);

		if (adminUser?.userId) {
			console.log(`⚠️ No owner found, using admin from authorized users: ${adminUser.userId} (${adminUser.name})`);
			await handleUserJoinEvent(adminUser.userId, product_id, convertWebhookData(webhookData), membership_id, whopSdkWithCompany);
			return;
		}

		// Try to find any member with a user
		const anyMemberWithUser = companyMembers?.members?.nodes?.find((member: any) => 
			member?.user
		);

		if (anyMemberWithUser?.user?.id) {
			console.log(`⚠️ No admin found, using any member with user: ${anyMemberWithUser.user.id} (${anyMemberWithUser.user.name})`);
			await handleUserJoinEvent(anyMemberWithUser.user.id, product_id, convertWebhookData(webhookData), membership_id, whopSdkWithCompany);
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


