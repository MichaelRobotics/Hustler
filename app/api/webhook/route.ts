import { makeWebhookValidator, type PaymentWebhookData, type MembershipWebhookData } from "@whop/api";
import { after } from "next/server";
import { addCredits, addMessages, updateUserSubscription } from "@/lib/actions/credit-actions";
import type { CreditPackId } from "@/lib/types/credit";
import { detectScenario, validateScenarioData } from "@/lib/analytics/scenario-detection";
import { getExperienceContextFromWebhook, validateExperienceContext } from "@/lib/analytics/experience-context";
import { trackPurchaseConversionWithScenario } from "@/lib/analytics/purchase-tracking";
import { advanceUpSellConversationOnPurchase } from "@/lib/actions/simplified-conversation-actions";
import { db } from "@/lib/supabase/db-server";
import { experiences, users, orders, subscriptions, funnels, conversations, resources } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import type { TriggerContext } from "@/lib/helpers/conversation-trigger";
import type { FunnelForTrigger } from "@/lib/helpers/conversation-trigger";
import { whopSdk } from "@/lib/whop-sdk";
import { getMembershipUserInfo } from "@/lib/helpers/whop-membership-user";
import { scheduleOrFireTrigger } from "@/lib/actions/user-join-actions";
import { safeBackgroundTracking, trackAwarenessBackground } from "@/lib/analytics/background-tracking";
import { hasActiveConversation, findFunnelForTrigger } from "@/lib/helpers/conversation-trigger";

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
  // Membership webhooks are events; funnel TRIGGERS (any_membership_buy, membership_buy, cancel_membership, any_cancel_membership) use these events.
  const action = webhook.action as string;
  if (webhook.action === "membership.went_valid") {
    // Membership-buy conversations are now created from payment.succeeded only; keep for logging.
    console.log(`[WEBHOOK] membership.went_valid - membership-buy handled by payment.succeeded`);
  }
  else if (action === "membership.deactivated") {
    console.log(`[WEBHOOK] membership.deactivated - triggers: any_cancel_membership, cancel_membership`);
    after(handleMembershipDeactivatedWebhook(webhook.data as MembershipWebhookData));
  }
  else if (webhook.action === "payment.succeeded") {
    after(handlePaymentSucceededWebhook(webhook.data));
  }

  // Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
  return new Response("OK", { status: 200 });
}

/** Payload may include company_id (Whop membership webhooks). Use for correlation. */
type MembershipWebhookPayload = MembershipWebhookData & { company_id?: string };

/** Normalize payment.succeeded payload to flat user_id, company_id, product_id, plan_id (supports nested data.user.id, data.product.id, etc.). */
function normalizePaymentPayload(data: Record<string, unknown>): {
	user_id: string | null;
	company_id: string | null;
	product_id: string | null;
	plan_id: string | null;
	membership_id: string | null;
} {
	const user = data.user as { id?: string } | undefined;
	const company = data.company as { id?: string } | undefined;
	const product = data.product as { id?: string } | undefined;
	const plan = data.plan as { id?: string } | undefined;
	const membership = data.membership as { id?: string } | undefined;
	return {
		user_id: (user?.id ?? data.user_id ?? null) as string | null,
		company_id: (company?.id ?? data.company_id ?? null) as string | null,
		product_id: (product?.id ?? data.product_id ?? null) as string | null,
		plan_id: (plan?.id ?? data.plan_id ?? null) as string | null,
		membership_id: (membership?.id ?? data.membership_id ?? null) as string | null,
	};
}

/** Resolve company_id from payment payload (company_id or from product_id via resources -> experience). */
async function resolveCompanyIdFromPaymentPayload(data: Record<string, unknown>): Promise<string | null> {
	const companyId = (data.company_id ?? (data.company as { id?: string })?.id) as string | undefined;
	if (companyId) return companyId;
	const productId = (data.product_id ?? (data.product as { id?: string })?.id) as string | undefined;
	if (!productId) return null;
	try {
		const resource = await db.query.resources.findFirst({
			where: eq(resources.whopProductId, productId),
			columns: { experienceId: true },
		});
		if (!resource?.experienceId) return null;
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, resource.experienceId),
			columns: { whopCompanyId: true },
		});
		return experience?.whopCompanyId ?? null;
	} catch {
		return null;
	}
}

/**
 * Resolve company_id from membership webhook payload.
 * Uses payload.company_id if present; otherwise tries to resolve from product_id via resources table (resource.whopProductId -> experience.whopCompanyId).
 */
async function resolveCompanyIdFromMembershipPayload(data: MembershipWebhookPayload): Promise<string | null> {
  const companyId = data.company_id ?? (data as { company_id?: string }).company_id;
  if (companyId) return companyId;
  const productId = data.product_id;
  if (!productId) return null;
  try {
    const resource = await db.query.resources.findFirst({
      where: eq(resources.whopProductId, productId),
      columns: { experienceId: true },
    });
    if (!resource?.experienceId) return null;
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.id, resource.experienceId),
      columns: { whopCompanyId: true },
    });
    return experience?.whopCompanyId ?? null;
  } catch {
    return null;
  }
}

export interface MembershipFunnelMatch {
  experienceId: string;
  user: { id: string };
  funnel: FunnelForTrigger;
}

/**
 * Find all experiences in the given company where the user has an active (deployed) funnel with the given trigger context.
 * Returns all (experienceId, user, funnel) matches; does not limit to one per company.
 */
async function findExperiencesWithActiveFunnelForUser(
  companyId: string,
  whopUserId: string,
  context: TriggerContext,
  productId?: string
): Promise<MembershipFunnelMatch[]> {
  const companyExperiences = await db.query.experiences.findMany({
    where: eq(experiences.whopCompanyId, companyId),
    columns: { id: true },
  });
  const matches: MembershipFunnelMatch[] = [];
  for (const exp of companyExperiences) {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.whopUserId, whopUserId),
        eq(users.experienceId, exp.id)
      ),
      columns: { id: true },
    });
    if (!user) continue;
    const funnel = await findFunnelForTrigger(exp.id, context, {
      userId: user.id,
      whopUserId,
      productId,
    });
    if (!funnel?.flow) continue;
    matches.push({ experienceId: exp.id, user, funnel });
  }
  return matches;
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

  // Normalize payload for nested or flat shape (user, company, product, plan)
	const normalized = normalizePaymentPayload(data as unknown as Record<string, unknown>);
	const uid = normalized.user_id ?? user_id;
	const cid = normalized.company_id ?? company_id;

	// Membership-buy: create conversation for any_membership_buy / membership_buy (same logic as former membership.went_valid)
	if (uid && (cid || normalized.product_id)) {
		try {
			const companyId = cid ?? (await resolveCompanyIdFromPaymentPayload(data as unknown as Record<string, unknown>));
			if (companyId) {
				const matches = await findExperiencesWithActiveFunnelForUser(
					companyId,
					uid,
					"membership_activated",
					normalized.product_id ?? undefined
				);
				for (const { experienceId, funnel } of matches) {
					if (await hasActiveConversation(experienceId, uid)) continue;
					const conversationId = await scheduleOrFireTrigger(
						experienceId,
						funnel,
						uid,
						"membership_activated",
						{ membershipId: normalized.membership_id ?? undefined, productId: normalized.product_id ?? undefined },
					);
					if (conversationId) {
						safeBackgroundTracking(() => trackAwarenessBackground(experienceId, funnel.id));
						console.log(`[WEBHOOK payment.succeeded] Created membership-buy conversation ${conversationId} for user ${uid}`);
					} else {
						console.log(`[WEBHOOK payment.succeeded] Scheduled delayed trigger for user ${uid} in experience ${experienceId}`);
					}
				}
			}
		} catch (err) {
			console.error("[WEBHOOK payment.succeeded] Membership-buy conversation creation error:", err);
		}
	}

	// Scenario detection, analytics, and product/plan-matched upsell advancement
	await handlePaymentWithAnalytics({
		...data,
		user_id: uid ?? data.user_id,
		company_id: cid ?? data.company_id,
		product_id: normalized.product_id ?? (data as unknown as Record<string, unknown>).product_id,
		plan_id: normalized.plan_id ?? (data as unknown as Record<string, unknown>).plan_id,
	});
}

/**
 * Handle membership.went_valid webhook (membership activated).
 * Resolve by company_id only; for each experience in that company where the user has an active funnel with the matching trigger, create a conversation only if the user does not already have an active conversation in that same experience.
 */
async function handleMembershipWentValidWebhook(data: MembershipWebhookData) {
  const { user_id, product_id, id: membershipId } = data;

  if (!user_id) {
    console.error("[WEBHOOK membership.went_valid] No user_id provided");
    return;
  }

  console.log(`[WEBHOOK membership.went_valid] Processing for user ${user_id}, product ${product_id}, membership ${membershipId}`);

  try {
    const companyId = await resolveCompanyIdFromMembershipPayload(data as MembershipWebhookPayload);
    if (!companyId) {
      console.log(`[WEBHOOK membership.went_valid] No company_id in payload and could not resolve from product_id - skipping`);
      return;
    }

    const matches = await findExperiencesWithActiveFunnelForUser(
      companyId,
      user_id,
      "membership_activated",
      product_id ?? undefined
    );

    if (matches.length === 0) {
      console.log(`[WEBHOOK membership.went_valid] No experience in company ${companyId} with active funnel for user ${user_id} - skipping`);
      return;
    }

    for (const { experienceId, user, funnel } of matches) {
      if (await hasActiveConversation(experienceId, user_id)) {
        console.log(`[WEBHOOK membership.went_valid] User ${user_id} already has active conversation in experience ${experienceId} - skipping this experience`);
        continue;
      }
      const conversationId = await scheduleOrFireTrigger(
        experienceId,
        funnel,
        user_id,
        "membership_activated",
        { membershipId, productId: product_id },
      );
      if (conversationId) {
        safeBackgroundTracking(() => trackAwarenessBackground(experienceId, funnel.id));
        console.log(`[WEBHOOK membership.went_valid] Created conversation ${conversationId} for experience ${experienceId}`);
      } else {
        console.log(`[WEBHOOK membership.went_valid] Scheduled delayed trigger for user ${user_id} in experience ${experienceId}`);
      }
    }
    console.log(`[WEBHOOK membership.went_valid] Successfully processed for user ${user_id}`);
  } catch (error) {
    console.error(`[WEBHOOK membership.went_valid] Error processing webhook:`, error);
  }
}

/**
 * Handle membership.deactivated webhook (membership deactivated).
 * Resolve by company_id only; for each experience in that company where the user has an active funnel with the matching trigger, create a conversation only if the user does not already have an active conversation in that same experience.
 */
async function handleMembershipDeactivatedWebhook(data: MembershipWebhookData) {
  const { user_id, product_id, id: membershipId } = data;

  if (!user_id) {
    console.error("[WEBHOOK membership.deactivated] No user_id provided");
    return;
  }

  console.log(`[WEBHOOK membership.deactivated] Processing for user ${user_id}, product ${product_id}, membership ${membershipId}`);

  try {
    const companyId = await resolveCompanyIdFromMembershipPayload(data as MembershipWebhookPayload);
    if (!companyId) {
      console.log(`[WEBHOOK membership.deactivated] No company_id in payload and could not resolve from product_id - skipping`);
      return;
    }

    const matches = await findExperiencesWithActiveFunnelForUser(
      companyId,
      user_id,
      "membership_deactivated",
      product_id ?? undefined
    );

    if (matches.length === 0) {
      console.log(`[WEBHOOK membership.deactivated] No experience in company ${companyId} with active funnel for user ${user_id} - skipping`);
      return;
    }

    for (const { experienceId, user, funnel } of matches) {
      if (await hasActiveConversation(experienceId, user_id)) {
        console.log(`[WEBHOOK membership.deactivated] User ${user_id} already has active conversation in experience ${experienceId} - skipping this experience`);
        continue;
      }
      const conversationId = await scheduleOrFireTrigger(
        experienceId,
        funnel,
        user_id,
        "membership_deactivated",
        { membershipId, productId: product_id },
      );
      if (conversationId) {
        safeBackgroundTracking(() => trackAwarenessBackground(experienceId, funnel.id));
        console.log(`[WEBHOOK membership.deactivated] Created conversation ${conversationId} for experience ${experienceId}`);
      } else {
        console.log(`[WEBHOOK membership.deactivated] Scheduled delayed trigger for user ${user_id} in experience ${experienceId}`);
      }
    }
    console.log(`[WEBHOOK membership.deactivated] Successfully processed for user ${user_id}`);
  } catch (error) {
    console.error(`[WEBHOOK membership.deactivated] Error processing webhook:`, error);
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

		// 2. Find or create user by user_id and experience_id
		let user = await db
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
			// Create user when missing: get email from membership, avatar from user API; do not set subscription/membership
			const membershipInfo = await getMembershipUserInfo(membership_id);
			const whopUser = await whopSdk.users.getUser({ userId: user_id }).catch(() => null);
			let accessLevel = "customer" as string;
			try {
				const accessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
					userId: user_id,
					experienceId: whopExperienceId,
				});
				accessLevel = accessResult.accessLevel ?? "customer";
			} catch {
				// keep default customer
			}
			const email = membershipInfo?.email ?? "";
			const name = membershipInfo?.name ?? whopUser?.name ?? whopUser?.username ?? "Unknown User";
			const avatar = (whopUser?.profilePicture && "sourceUrl" in whopUser.profilePicture)
				? (whopUser.profilePicture as { sourceUrl?: string | null }).sourceUrl ?? null
				: null;
			const [newUser] = await db
				.insert(users)
				.values({
					whopUserId: user_id,
					experienceId,
					email: email || "unknown@example.com",
					name: name || "Unknown User",
					avatar,
					credits: 0,
					accessLevel,
					// subscription and membership left null; only updateUserSubscription touches them
				})
				.returning();
			if (!newUser) {
				console.error(`Failed to create user for whop_user_id ${user_id} in experience ${experienceId}`);
				return;
			}
			user = [newUser];
			console.log(`Created user ${newUser.id} for whop_user_id ${user_id} in experience ${experienceId}`);
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
			userName: userRecord.name || "Unknown",
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

		// Step 4: Advance UpSell conversation only when payment matches current offer product/plan
		const paymentProductId = webhookData.product_id ?? (webhookData as unknown as { product?: { id?: string } }).product?.id ?? null;
		const paymentPlanId = webhookData.plan_id ?? (webhookData as unknown as { plan?: { id?: string } }).plan?.id ?? null;
		const advanceResult = await advanceUpSellConversationOnPurchase(
			conversation!.conversationId,
			experience!.experienceId,
			paymentProductId,
			paymentPlanId
		);
		if (advanceResult.advanced) {
			console.log(`[Webhook Analytics] ✅ UpSell conversation advanced for conversation ${conversation!.conversationId}`);
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


