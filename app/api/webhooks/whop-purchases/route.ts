import { type NextRequest, NextResponse } from "next/server";
import { makeWebhookValidator } from "@whop/api";
import { trackPurchaseConversion, type PurchaseData } from "@/lib/analytics/purchase-tracking";

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
		// Validate webhook signature
		await validateWebhook(request);
		console.log("Purchase webhook signature validation passed");

		const body = await request.json();
		console.log("Purchase webhook received:", body.type, body.data);

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
 * Track purchase conversion
 */
async function trackPurchase(purchaseData: any) {
	try {
		console.log("🛒 Tracking purchase:", purchaseData);

		// Extract purchase information
		const purchaseInfo: PurchaseData = {
			userId: purchaseData.user_id,
			companyId: purchaseData.company_id,
			productId: purchaseData.product_id,
			accessPassId: purchaseData.access_pass_id,
			planId: purchaseData.plan_id,
			amount: purchaseData.amount || 0,
			currency: purchaseData.currency || 'usd',
			purchaseTime: new Date(purchaseData.created_at || Date.now())
		};

		// Track the conversion (simplified for Whop native tracking)
		const success = await trackPurchaseConversion(purchaseInfo);
		
		if (success) {
			console.log(`✅ Purchase conversion tracked: ${purchaseInfo.amount} ${purchaseInfo.currency}`);
		} else {
			console.log("⚠️ Purchase tracked but no conversion attribution found");
		}

	} catch (error) {
		console.error("❌ Error tracking purchase:", error);
	}
}


export const POST = handleWhopPurchaseWebhook;
