import { NextRequest } from "next/server";

export async function POST(request: NextRequest): Promise<Response> {
	console.log("🧪 [TEST WEBHOOK] Test webhook endpoint called");
	console.log("🧪 [TEST WEBHOOK] Headers:", Object.fromEntries(request.headers.entries()));
	
	try {
		const body = await request.json();
		console.log("🧪 [TEST WEBHOOK] Body:", JSON.stringify(body, null, 2));
	} catch (error) {
		console.log("🧪 [TEST WEBHOOK] Error parsing body:", error);
	}
	
	return new Response("Test webhook received!", { status: 200 });
}

export async function GET(): Promise<Response> {
	console.log("🧪 [TEST WEBHOOK] Test webhook GET endpoint called");
	return new Response("Test webhook endpoint is working!", { status: 200 });
}

