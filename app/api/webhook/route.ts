import { makeWebhookValidator, type PaymentWebhookData, type MembershipWebhookData } from "@whop/api";
import { after } from "next/server";
import { addCredits, addMessages, updateUserSubscription } from "@/lib/actions/credit-actions";
import type { CreditPackId } from "@/lib/types/credit";
import { detectScenario, validateScenarioData } from "@/lib/analytics/scenario-detection";
import { getExperienceContextFromWebhook, validateExperienceContext } from "@/lib/analytics/experience-context";
import { trackPurchaseConversionWithScenario } from "@/lib/analytics/purchase-tracking";
import { db } from "@/lib/supabase/db-server";
import { experiences, users, orders, subscriptions, funnels, customersResources, conversations } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { whopSdk } from "@/lib/whop-sdk";
import { createConversation } from "@/lib/actions/simplified-conversation-actions";
import { updateConversationToWelcomeStage } from "@/lib/actions/user-join-actions";
import { safeBackgroundTracking, trackAwarenessBackground } from "@/lib/analytics/background-tracking";

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
  if (webhook.action === "membership.went_valid") {
    // Re-enabled for membership_valid trigger type
    console.log(`[WEBHOOK] Membership webhook received - checking for membership_valid trigger type`);
    after(handleMembershipWentValidWebhook(webhook.data));
  }
  else if (webhook.action === "payment.succeeded") {
    after(handlePaymentSucceededWebhook(webhook.data));
  }

  // Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceededWebhook(data: PaymentWebhookData) {
  const { id, user_id, subtotal, amount_after_fees, metadata, company_id } = data;

  // Check if this is a credit pack purchase via chargeUser (metadata-based method) - legacy
  if (metadata?.type === "credit_pack" && metadata?.packId && metadata?.credits) {
    // Parse credits as integer (metadata values may be strings or numbers)
    const creditsAmount = Math.floor(Number(metadata.credits));
    console.log(`Credit pack purchase detected via chargeUser: ${creditsAmount} credits for user ${user_id}`);
    
    await handleCreditPackPurchaseWithCompany(
      user_id,
      company_id,
      metadata.packId as CreditPackId,
      creditsAmount,
      id,
    );
    return;
  }

  // Handle new checkout system payments (Subscriptions, Credits, Messages)
  if (metadata?.type && (metadata.type === "Basic" || metadata.type === "Pro" || metadata.type === "Vip" || metadata.type === "Credits" || metadata.type === "Messages")) {
    console.log(`New checkout system payment detected: ${metadata.type} for user ${user_id}`);
    
    await handleNewCheckoutPayment(data);
    return;
  }

    // Handle other payment types with scenario detection and analytics
    await handlePaymentWithAnalytics(data);
}

/**
 * Handle membership.went_valid webhook
 * Creates conversation only if:
 * 1. Funnel has membership_trigger_type = "membership_valid"
 * 2. User has NO records in customers_resources table (new customer)
 */
async function handleMembershipWentValidWebhook(data: MembershipWebhookData) {
  const { user_id, product_id, id: membershipId } = data;

  if (!user_id) {
    console.error("[WEBHOOK membership.went_valid] No user_id provided");
    return;
  }

  console.log(`[WEBHOOK membership.went_valid] Processing for user ${user_id}, product ${product_id}, membership ${membershipId}`);

  try {
    // Step 1: Find the experience that has this product
    // We need to find the experience by looking at which experience has a deployed funnel
    // that has this product in its resources
    const experienceWithFunnel = await db
      .select({
        experience: experiences,
        funnel: funnels,
      })
      .from(funnels)
      .innerJoin(experiences, eq(funnels.experienceId, experiences.id))
      .where(
        and(
          eq(funnels.isDeployed, true),
          eq(funnels.membershipTriggerType, "membership_valid")
        )
      )
      .limit(10); // Get multiple to check

    if (experienceWithFunnel.length === 0) {
      console.log(`[WEBHOOK membership.went_valid] No deployed funnel with membership_valid trigger found - skipping`);
      return;
    }

    // Find the matching experience by checking if product matches
    let matchingExperience = null;
    let matchingFunnel = null;

    for (const row of experienceWithFunnel) {
      // Check if this experience's company has the product
      // For now, we'll use the first experience with a membership_valid funnel
      // In production, you'd want to match by product_id to the funnel's resources
      matchingExperience = row.experience;
      matchingFunnel = row.funnel;
      break;
    }

    if (!matchingExperience || !matchingFunnel) {
      console.log(`[WEBHOOK membership.went_valid] No matching experience/funnel found for product ${product_id}`);
      return;
    }

    const experienceId = matchingExperience.id;
    console.log(`[WEBHOOK membership.went_valid] Found experience ${experienceId} with membership_valid trigger`);

    // Step 2: Find or verify user exists in this experience
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.whopUserId, user_id),
        eq(users.experienceId, experienceId)
      ),
    });

    if (!user) {
      console.log(`[WEBHOOK membership.went_valid] User ${user_id} not found in experience ${experienceId} - skipping (user will be created on app entry)`);
      return;
    }

    // Step 3: Check if user has any existing records in customers_resources (existing customer check)
    const existingCustomerResource = await db.query.customersResources.findFirst({
      where: and(
        eq(customersResources.experienceId, experienceId),
        eq(customersResources.userId, user.id)
      ),
    });

    if (existingCustomerResource) {
      console.log(`[WEBHOOK membership.went_valid] User ${user_id} already has customer resources in experience ${experienceId} - skipping (not a new customer)`);
      return;
    }

    // Step 4: Check if conversation already exists
    const existingConversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.experienceId, experienceId),
        eq(conversations.whopUserId, user_id)
      ),
    });

    if (existingConversation) {
      console.log(`[WEBHOOK membership.went_valid] User ${user_id} already has conversation in experience ${experienceId} - skipping`);
      return;
    }

    // Step 5: Verify funnel has flow
    if (!matchingFunnel.flow) {
      console.log(`[WEBHOOK membership.went_valid] Funnel ${matchingFunnel.id} has no flow - skipping`);
      return;
    }

    const funnelFlow = matchingFunnel.flow as { startBlockId: string };

    // Step 6: Create conversation
    console.log(`[WEBHOOK membership.went_valid] Creating conversation for new customer ${user_id} in experience ${experienceId}`);
    
    const conversationId = await createConversation(
      experienceId,
      matchingFunnel.id,
      user_id,
      funnelFlow.startBlockId,
      membershipId,
      product_id
    );

    console.log(`[WEBHOOK membership.went_valid] Created conversation ${conversationId}`);

    // Step 7: Update conversation to WELCOME stage
    await updateConversationToWelcomeStage(conversationId, matchingFunnel.flow);

    // Step 8: Track awareness (starts) - BACKGROUND PROCESSING
    console.log(`[WEBHOOK membership.went_valid] Tracking awareness for experience ${experienceId}, funnel ${matchingFunnel.id}`);
    safeBackgroundTracking(() => trackAwarenessBackground(experienceId, matchingFunnel.id));

    console.log(`[WEBHOOK membership.went_valid] Successfully created conversation for user ${user_id}`);

  } catch (error) {
    console.error(`[WEBHOOK membership.went_valid] Error processing webhook:`, error);
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
 * Lookup plan from subscriptions table (fallback if metadata not available)
 */
async function lookupPlan(
	planId?: string | null,
): Promise<{ type: string; planId: string; amount: number | null; credits?: number; messages?: number } | null> {
	try {
		if (!planId) {
			return null;
		}

		const subscription = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.planId, planId),
		});

		if (!subscription) {
			return null;
		}

		return {
			type: subscription.type,
			planId: subscription.planId,
			amount: subscription.amount ? parseFloat(subscription.amount) : null,
			credits: subscription.credits ? parseFloat(subscription.credits) : undefined,
			messages: subscription.messages ? parseFloat(subscription.messages) : undefined,
		};
	} catch (error) {
		console.error("Error looking up plan:", error);
		return null;
	}
}

/**
 * Handle new checkout system payments (Subscriptions, Credits, Messages)
 */
async function handleNewCheckoutPayment(data: PaymentWebhookData) {
	const { id, user_id, company_id, subtotal, amount_after_fees, metadata, checkout_id, plan_id, membership_id } = data;

	if (!user_id) {
		console.error("Missing user_id for new checkout payment");
		return;
	}

	try {
		// 1. Extract experienceId from metadata (primary approach)
		let whopExperienceId: string | null = null;
		
		if (metadata?.experienceId) {
			whopExperienceId = metadata.experienceId as string;
			console.log(`Found experienceId in metadata: ${whopExperienceId}`);
		} else {
			// Fallback: use company_id to find experience (backward compatibility)
			if (!company_id) {
				console.error("Missing experienceId in metadata and company_id for new checkout payment");
				return;
			}
			console.log(`No experienceId in metadata, falling back to company_id: ${company_id}`);
			const experienceFallback = await db
				.select()
				.from(experiences)
				.where(eq(experiences.whopCompanyId, company_id))
				.limit(1);

			if (experienceFallback.length === 0) {
				console.error(`No experience found for company_id: ${company_id}`);
				return;
			}
			whopExperienceId = experienceFallback[0].whopExperienceId;
		}

		if (!whopExperienceId) {
			console.error("Could not determine whopExperienceId from metadata or company_id");
			return;
		}

		// 2. Find experience by whopExperienceId
		const experience = await db
			.select()
			.from(experiences)
			.where(eq(experiences.whopExperienceId, whopExperienceId))
			.limit(1);

		if (experience.length === 0) {
			console.error(`No experience found for whopExperienceId: ${whopExperienceId}`);
			return;
		}

		const experienceRecord = experience[0];
		const experienceId = experienceRecord.id;

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

		const userRecord = user[0];
		const userId = userRecord.id;

		// 3. Extract payment type and amounts from metadata (primary approach)
		let paymentType: string | null = null;
		let credits: number | undefined;
		let messages: number | undefined;
		let subscriptionType: "Basic" | "Pro" | "Vip" | null = null;
		let planIdValue: string | null = plan_id || null;
		let amount: number | null = null;

		if (metadata) {
			paymentType = metadata.type as string;
			// Parse credits as integer (metadata values may be strings or numbers)
			credits = metadata.credits !== undefined && metadata.credits !== null 
				? Math.floor(Number(metadata.credits)) 
				: undefined;
			// Parse messages as integer
			messages = metadata.messages !== undefined && metadata.messages !== null
				? Math.floor(Number(metadata.messages))
				: undefined;
			planIdValue = (metadata.planId as string | null) || planIdValue;
			amount = metadata.amount as number | null;
		}

		// Fallback: lookup plan from subscriptions table if metadata not available
		if (!paymentType && plan_id) {
			const plan = await db.query.subscriptions.findFirst({
				where: eq(subscriptions.planId, plan_id),
			});
			if (plan) {
				paymentType = plan.type;
				planIdValue = plan.planId;
				amount = plan.amount ? parseFloat(plan.amount) : null;
				// Parse credits as integer (database stores as decimal, but users.credits is integer)
				credits = plan.credits ? Math.floor(parseFloat(plan.credits)) : undefined;
				// Parse messages as integer
				messages = plan.messages ? Math.floor(parseFloat(plan.messages)) : undefined;
			}
		}

		if (!paymentType) {
			console.error("Could not determine payment type from metadata or checkout lookup");
			return;
		}

		// Determine subscription type from paymentType or planId
		if (paymentType === "Basic" || paymentType === "Pro" || paymentType === "Vip") {
			subscriptionType = paymentType as "Basic" | "Pro" | "Vip";
		} else if (planIdValue) {
			// Check if planId indicates subscription type (basic, pro, vip)
			const planIdLower = planIdValue.toLowerCase();
			if (planIdLower === "basic" || planIdLower.includes("basic")) {
				subscriptionType = "Basic";
			} else if (planIdLower === "pro" || planIdLower.includes("pro")) {
				subscriptionType = "Pro";
			} else if (planIdLower === "vip" || planIdLower.includes("vip")) {
				subscriptionType = "Vip";
			}
		}

		// 4. Update user based on payment type
		if (paymentType === "Credits" && credits) {
			await addCredits(user_id, whopExperienceId, credits);
			console.log(`Successfully added ${credits} credits to user ${user_id}`);
		} else if (paymentType === "Messages" && messages) {
			await addMessages(user_id, whopExperienceId, messages);
			console.log(`Successfully added ${messages} messages to user ${user_id}`);
		} else if (subscriptionType) {
			// Update subscription tier with membership_id
			// The updateUserSubscription function handles:
			// - Cancelling old membership if subscription type changed
			// - Updating membership_id for renewals (same subscription type)
			await updateUserSubscription(user_id, whopExperienceId, subscriptionType, membership_id || null);
			console.log(`Successfully updated subscription to ${subscriptionType} for user ${user_id}${membership_id ? ` with membership ${membership_id}` : ''}`);
			
			// Add credits and messages that come with the subscription
			if (credits) {
				await addCredits(user_id, whopExperienceId, credits);
				console.log(`Successfully added ${credits} credits from subscription to user ${user_id}`);
			}
			if (messages) {
				await addMessages(user_id, whopExperienceId, messages);
				console.log(`Successfully added ${messages} messages from subscription to user ${user_id}`);
			}
		}

		// 5. Create order record
		const paymentAmount = subtotal || amount_after_fees || amount || 0;
		const prodName = paymentType === "Credits" 
			? `${credits || 0} Credits`
			: paymentType === "Messages"
			? `${messages || 0} Messages`
			: `${subscriptionType || paymentType} Subscription`;

		await db.insert(orders).values({
			whopCompanyId: experienceRecord.whopCompanyId,
			userId: userId,
			planId: planIdValue || null,
			prodId: planIdValue || null,
			prodName: prodName,
			paymentId: id,
			accessLevel: userRecord.accessLevel,
			avatar: userRecord.avatar || null,
			userName: userRecord.userName || "Unknown",
			email: userRecord.email || "unknown@example.com",
			amount: paymentAmount.toString(),
			messages: messages || null,
			credits: credits || null,
			subscription: subscriptionType || null,
		});

		console.log(`Successfully created order record for payment ${id}`);

		// 6. Handle analytics (for funnel tracking)
		await handlePaymentWithAnalytics(data);

	} catch (error) {
		console.error("Error processing new checkout payment:", error);
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


