import { type NextRequest, NextResponse } from "next/server";
import { makeWebhookValidator } from "@whop/api";
import {
	createErrorResponse,
	createSuccessResponse,
} from "../../../../lib/middleware/whop-auth";
import { whopProductSync } from "../../../../lib/sync/whop-product-sync";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET ?? "fallback",
});

/**
 * Whop Products Webhook API Route
 * Handles webhook events from Whop for product updates
 */

/**
 * POST /api/webhooks/whop-products - Handle Whop product webhook events
 */
async function handleWhopProductWebhook(request: NextRequest) {
	try {
		// Validate webhook signature using Whop best practices
		await validateWebhook(request);
		console.log("Webhook signature validation passed");

		const body = await request.json();

		// Handle webhook update - extract company ID from webhook data
		const companyId = body.data?.company_id || body.company_id || "unknown";
		await whopProductSync.handleWebhookUpdate(companyId, body);

		return createSuccessResponse(
			{ received: true, type: body.type },
			"Webhook processed successfully",
		);
	} catch (error) {
		console.error("Error processing Whop product webhook:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the webhook handler (no auth required for webhooks)
export const POST = handleWhopProductWebhook;
