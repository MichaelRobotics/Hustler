import { NextRequest } from "next/server";

// Vercel-optimized webhook test endpoint
export async function POST(request: NextRequest): Promise<Response> {
	const startTime = Date.now();
	
	try {
		console.log("🧪 [VERCEL WEBHOOK TEST] Starting webhook test");
		console.log("🧪 [VERCEL WEBHOOK TEST] Request headers:", Object.fromEntries(request.headers.entries()));
		
		// Check Vercel environment
		const vercelEnv = {
			VERCEL: process.env.VERCEL,
			VERCEL_URL: process.env.VERCEL_URL,
			VERCEL_ENV: process.env.VERCEL_ENV,
			NODE_ENV: process.env.NODE_ENV,
		};
		
		console.log("🧪 [VERCEL WEBHOOK TEST] Vercel environment:", vercelEnv);
		
		// Parse request body
		let body;
		try {
			body = await request.json();
			console.log("🧪 [VERCEL WEBHOOK TEST] Request body:", JSON.stringify(body, null, 2));
		} catch (error) {
			console.log("🧪 [VERCEL WEBHOOK TEST] Error parsing body:", error);
			body = "Could not parse JSON";
		}
		
		// Check webhook secret
		const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
		const secretStatus = {
			configured: !!webhookSecret,
			length: webhookSecret?.length || 0,
			firstChars: webhookSecret?.substring(0, 4) || "N/A"
		};
		
		console.log("🧪 [VERCEL WEBHOOK TEST] Webhook secret status:", secretStatus);
		
		const processingTime = Date.now() - startTime;
		
		const response = {
			status: "success",
			message: "Vercel webhook test completed",
			timestamp: new Date().toISOString(),
			processingTime: `${processingTime}ms`,
			vercelEnvironment: vercelEnv,
			webhookSecret: secretStatus,
			requestInfo: {
				method: request.method,
				url: request.url,
				headers: Object.fromEntries(request.headers.entries()),
				body: body
			}
		};
		
		console.log("🧪 [VERCEL WEBHOOK TEST] Response:", JSON.stringify(response, null, 2));
		
		return new Response(JSON.stringify(response, null, 2), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"X-Webhook-Test": "vercel-optimized"
			}
		});
		
	} catch (error) {
		const processingTime = Date.now() - startTime;
		console.error("🧪 [VERCEL WEBHOOK TEST] Error:", error);
		
		return new Response(JSON.stringify({
			status: "error",
			message: "Vercel webhook test failed",
			error: error instanceof Error ? error.message : "Unknown error",
			processingTime: `${processingTime}ms`,
			timestamp: new Date().toISOString()
		}), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
}

export async function GET(): Promise<Response> {
	console.log("🧪 [VERCEL WEBHOOK TEST] GET endpoint called");
	
	const status = {
		vercelEnvironment: {
			VERCEL: process.env.VERCEL,
			VERCEL_URL: process.env.VERCEL_URL,
			VERCEL_ENV: process.env.VERCEL_ENV,
		},
		webhookSecret: {
			configured: !!process.env.WHOP_WEBHOOK_SECRET,
			length: process.env.WHOP_WEBHOOK_SECRET?.length || 0,
		},
		timestamp: new Date().toISOString(),
		message: "Vercel webhook test endpoint is ready"
	};
	
	return new Response(JSON.stringify(status, null, 2), {
		status: 200,
		headers: { "Content-Type": "application/json" }
	});
}

