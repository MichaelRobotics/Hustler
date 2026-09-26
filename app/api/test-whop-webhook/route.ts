import { NextRequest } from "next/server";
import { unwrapWebhook } from "@whop/sdk/helpers";

// Test webhook endpoint to verify Whop integration
export async function POST(request: NextRequest): Promise<Response> {
	console.log("🧪 [WHOP WEBHOOK TEST] Test endpoint called");
	console.log("🧪 [WHOP WEBHOOK TEST] Headers:", Object.fromEntries(request.headers.entries()));
	
	if (!process.env.WHOP_WEBHOOK_SECRET) {
		console.error("❌ WHOP_WEBHOOK_SECRET environment variable is not set");
		return new Response("WHOP_WEBHOOK_SECRET not configured", { status: 500 });
	}
	
	console.log("✅ WHOP_WEBHOOK_SECRET is configured");
	
	try {
		const payload = await request.text();
		const webhook = unwrapWebhook(payload, {
			headers: Object.fromEntries(request.headers.entries()),
			key: process.env.WHOP_WEBHOOK_SECRET,
		}) as { type?: string; data?: unknown };
		console.log("✅ Webhook validation successful");
		console.log("📋 Webhook type:", webhook.type);
		console.log("📋 Webhook data:", JSON.stringify(webhook.data, null, 2));
		
		return new Response(JSON.stringify({
			status: "success",
			message: "Webhook validation passed",
			type: webhook.type,
			data: webhook.data
		}), { 
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
		
	} catch (error) {
		console.error("❌ Webhook validation failed:", error);
		return new Response(JSON.stringify({
			status: "error",
			message: "Webhook validation failed",
			error: error instanceof Error ? error.message : "Unknown error"
		}), { 
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
	}
}

export async function GET(): Promise<Response> {
	console.log("🧪 [WHOP WEBHOOK TEST] GET endpoint called");
	
	const status = {
		webhookSecretConfigured: !!process.env.WHOP_WEBHOOK_SECRET,
		webhookSecretLength: process.env.WHOP_WEBHOOK_SECRET?.length || 0,
		timestamp: new Date().toISOString()
	};
	
	return new Response(JSON.stringify(status, null, 2), {
		status: 200,
		headers: { "Content-Type": "application/json" }
	});
}
