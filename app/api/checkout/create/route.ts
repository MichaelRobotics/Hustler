import { NextRequest, NextResponse } from "next/server";
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

		if (!experienceId) {
			return NextResponse.json(
				{ error: "experienceId is required" },
				{ status: 400 }
			);
		}

		// 2. Get experience from database using experienceId
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			return NextResponse.json(
				{ error: "Experience not found" },
				{ status: 404 }
			);
		}

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
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
			appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
		});
		
		// Create checkout configuration with plan reference
		// Reference existing plan by ID using plan_id property
		const checkout = await client.checkoutConfigurations.create({
			plan_id: planId, // Reference existing plan by ID
			metadata: planMetadata,
		} as any); // Type assertion needed because SDK types don't match API expectations

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

