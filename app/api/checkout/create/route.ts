import { NextRequest, NextResponse } from "next/server";
import { requireRequestExperience } from "@/lib/helpers/experience-access-gate";
import { db } from "@/lib/supabase/db-server";
import { subscriptions, experiences, plans } from "@/lib/supabase/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/checkout/create - Create checkout dynamically with experience metadata
 * 
 * Body:
 * - planId: string (Whop plan ID - can be from subscriptions or plans table)
 * - experienceId: string (Whop experience ID)
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { planId, experienceId } = body;

		if (!planId) {
			return NextResponse.json(
				{ error: "planId is required" },
				{ status: 400 }
			);
		}

		const access = await requireRequestExperience(request, { bodyExperienceId: experienceId });
		if (!access.ok) return access.response;
		const experience = access.experience;

		// 1. Try to lookup plan from subscriptions table first (for credit packs, DMs, subscriptions)
		let plan = await db.query.subscriptions.findFirst({
			where: eq(subscriptions.planId, planId),
		});

		let planMetadata: any = {
			planId: planId,
			experienceId: experience.whopExperienceId,
			whopCompanyId: experience.whopCompanyId,
		};

		// If not found in subscriptions, try plans table (for resources)
		if (!plan) {
			const resourcePlan = await db.query.plans.findFirst({
				where: eq(plans.planId, planId),
			});

			if (resourcePlan) {
				planMetadata = {
					planId: resourcePlan.planId,
					experienceId: experience.whopExperienceId,
					whopCompanyId: experience.whopCompanyId,
					resourceId: resourcePlan.resourceId,
					initialPrice: resourcePlan.initialPrice,
					renewalPrice: resourcePlan.renewalPrice,
					currency: resourcePlan.currency,
					planType: resourcePlan.planType,
				};
			}
			// If not found in either table, we'll still create checkout with just the planId
			// (Whop SDK will validate the planId)
		} else {
			// Plan found in subscriptions table
			planMetadata = {
				type: plan.type,
				planId: plan.planId,
				amount: plan.amount,
				credits: plan.credits,
				messages: plan.messages,
				experienceId: experience.whopExperienceId,
				whopCompanyId: experience.whopCompanyId,
			};
		}

		// 3. Create checkout configuration dynamically with experience metadata
		// Use @whop/sdk client SDK (not server SDK) for checkout configurations
		const { createWhopRestClient } = await import("@/lib/whop-rest");
		const client = createWhopRestClient();
		
		const checkout = await client.checkoutConfigurations.create({
			plan_id: planId,
			metadata: planMetadata,
		});

		console.log(`✅ Created checkout for plan ${planId} with experience ${experienceId}: ${checkout.id}`);

		return NextResponse.json({
			checkoutId: checkout.id,
			planId: checkout.plan?.id || planId,
			type: plan?.type || 'resource',
		});
	} catch (error: any) {
		console.error("Error creating checkout:", error);
		const errorMessage = error?.message || error?.response?.data?.message || error?.response?.data?.error || "Failed to create checkout";
		console.error("Detailed error:", JSON.stringify(error, null, 2));
		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 }
		);
	}
}

