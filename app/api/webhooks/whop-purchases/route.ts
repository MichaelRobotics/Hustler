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
		console.log(`[WHOP-PURCHASES DEBUG] ==========================================`);
		console.log(`[WHOP-PURCHASES DEBUG] Purchase webhook received:`, body.type);
		console.log(`[WHOP-PURCHASES DEBUG] Timestamp: ${new Date().toISOString()}`);
		console.log(`[WHOP-PURCHASES DEBUG] Test request: ${isTestRequest}`);
		console.log(`[WHOP-PURCHASES DEBUG] Purchase data:`, JSON.stringify(body.data, null, 2));

		// Extract experience ID from X-Experience-ID header for multi-tenancy
		const experienceId = request.headers.get('X-Experience-ID');
		if (experienceId && body.data) {
			// Don't override company_id - let the experience context system handle the lookup
			// The company_id should remain as the Whop company ID from the webhook
			console.log(`[Whop-Purchases] Processing webhook for experience: ${experienceId}`);
		}

		// Handle different purchase events
		console.log(`[WHOP-PURCHASES DEBUG] Processing purchase event: ${body.type}`);
		switch (body.type) {
			case "plan.purchased":
				console.log(`[WHOP-PURCHASES DEBUG] 📋 Plan purchased event`);
				await trackPurchase(body.data);
				break;
			case "access_pass.purchased":
				console.log(`[WHOP-PURCHASES DEBUG] 🎫 Access pass purchased event`);
				await trackPurchase(body.data);
				break;
			case "product.purchased":
				console.log(`[WHOP-PURCHASES DEBUG] 🛍️ Product purchased event`);
				await trackPurchase(body.data);
				break;
			default:
				console.log(`[WHOP-PURCHASES DEBUG] ❓ Unhandled webhook type: ${body.type}`);
				console.log(`[WHOP-PURCHASES DEBUG] Supported types: plan.purchased, access_pass.purchased, product.purchased`);
		}
		
		console.log(`[WHOP-PURCHASES DEBUG] ==========================================`);

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
