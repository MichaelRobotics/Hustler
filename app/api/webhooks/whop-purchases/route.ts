import { type NextRequest, NextResponse } from "next/server";
import { makeWebhookValidator } from "@whop/api";
import { trackPurchaseConversionWithScenario } from "@/lib/analytics/purchase-tracking";
import { detectScenario, validateScenarioData } from "@/lib/analytics/scenario-detection";
import { getExperienceContextFromWebhook, validateExperienceContext } from "@/lib/analytics/experience-context";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

/**
 * Whop Purchase Webhook API Route
 * Handles webhook events from Whop for purchase tracking
 */

/**
 * POST /api/webhooks/whop-purchases - Handle Whop purchase webhook events
 */
async function handleWhopPurchaseWebhook(request: NextRequest) {
	try {
		// Check if this is a test request (bypass validation)
		const isTestRequest = request.headers.get('X-Test-Bypass') === 'true';
		
		if (!isTestRequest) {
			// Validate webhook signature for production requests
			await validateWebhook(request);
			console.log("Purchase webhook signature validation passed");
		} else {
			console.log("Skipping signature validation for test request");
		}

		const body = await request.json();
		console.log("Purchase webhook received:", body.type, body.data);

		// Extract experience ID from X-Experience-ID header for multi-tenancy
		const experienceId = request.headers.get('X-Experience-ID');
		if (experienceId && body.data) {
			// Set the company_id to the experience ID for proper multi-tenant analytics
			body.data.company_id = experienceId;
			console.log(`[Whop-Purchases] Using experience ID as company_id: ${experienceId}`);
		}

		// Handle different purchase events
		switch (body.type) {
			case "plan.purchased":
			case "access_pass.purchased":
			case "product.purchased":
				await trackPurchase(body.data);
				break;
			default:
				console.log("Unhandled webhook type:", body.type);
		}

		return NextResponse.json({ received: true, type: body.type });

	} catch (error) {
		console.error("Error processing Whop purchase webhook:", error);
		return NextResponse.json(
			{ error: "Webhook processing failed" },
			{ status: 500 }
		);
	}
}

/**
 * Track purchase conversion with scenario detection and analytics
 */
async function trackPurchase(purchaseData: any) {
	try {
		console.log("🛒 Tracking purchase:", purchaseData);

		// Step 1: Detect scenario (affiliate vs product owner vs error)
		const scenarioData = await detectScenario(purchaseData);
		
		if (!validateScenarioData(scenarioData)) {
			console.log("⚠️ Invalid scenario data - skipping analytics");
			return;
		}

		if (scenarioData.scenario === 'error') {
			console.log("⚠️ Error scenario detected - skipping analytics");
			return;
		}

		// Step 2: Get experience context
		const { experience, conversation } = await getExperienceContextFromWebhook(purchaseData);
		
		if (!validateExperienceContext(experience, conversation)) {
			console.log("⚠️ Invalid experience context - skipping analytics");
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
			console.log(`✅ Analytics updated for scenario: ${scenarioData.scenario}`);
		} else {
			console.log("⚠️ Failed to update analytics");
		}

	} catch (error) {
		console.error("❌ Error tracking purchase:", error);
	}
}


export const POST = handleWhopPurchaseWebhook;
