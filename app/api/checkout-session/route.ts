import { type NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * POST /api/checkout-session - Create a checkout session for credit pack purchase
 */
async function createCheckoutSessionHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const body = await request.json();
		const { planId, metadata } = body;

		// Validate required parameters
		if (!planId) {
			return NextResponse.json(
				{ error: "Plan ID is required" },
				{ status: 400 }
			);
		}

		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		console.log("Creating checkout session for plan:", planId);
		console.log("With metadata:", metadata);
		console.log("User context:", { userId: user.userId, experienceId: user.experienceId });

		// Debug: Check if whopSdk is available
		console.log("Whop SDK available:", !!whopSdk);
		console.log("Whop SDK payments available:", !!whopSdk?.payments);
		console.log("Whop SDK createCheckoutSession available:", !!whopSdk?.payments?.createCheckoutSession);
		console.log("Whop SDK methods:", whopSdk ? Object.keys(whopSdk) : 'null');
		console.log("Whop SDK payments methods:", whopSdk?.payments ? Object.keys(whopSdk.payments) : 'null');
		console.log("Environment variables:");
		console.log("- WHOP_API_KEY:", !!process.env.WHOP_API_KEY);
		console.log("- NEXT_PUBLIC_WHOP_APP_ID:", !!process.env.NEXT_PUBLIC_WHOP_APP_ID);
		console.log("- NEXT_PUBLIC_WHOP_COMPANY_ID:", !!process.env.NEXT_PUBLIC_WHOP_COMPANY_ID);
		console.log("- NEXT_PUBLIC_WHOP_AGENT_USER_ID:", !!process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID);
		console.log("- NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
		console.log("Plan ID being used:", planId);
		console.log("Plan ID format check:", {
			startsWithPlan: planId.startsWith('plan_'),
			length: planId.length,
			validFormat: /^plan_[a-zA-Z0-9]+$/.test(planId)
		});

		// For one-time payments (credit packs), we should use chargeUser instead of createCheckoutSession
		// createCheckoutSession is for subscriptions, chargeUser is for one-time payments
		console.log("Using chargeUser for one-time payment instead of createCheckoutSession");
		
		// Get the credit pack amount from the plan ID
		const PLAN_TO_AMOUNT_MAPPING: Record<string, number> = {
			"plan_WLt5L02d1vJKj": 5,   // Starter pack - $5
			"plan_wuqbRiAVRqI7b": 15,  // Popular pack - $15  
			"plan_NEdfisFY3jDiL": 30   // Pro pack - $30
		};
		
		const amount = PLAN_TO_AMOUNT_MAPPING[planId];
		if (!amount) {
			throw new Error(`Unknown plan ID: ${planId}`);
		}
		
		console.log(`Creating charge for ${amount} credits ($${amount})`);
		
		let chargeResult;
		try {
			chargeResult = await whopSdk.payments.chargeUser({
				amount: amount * 100, // Convert to cents
				currency: "usd",
				userId: user.userId,
				metadata: {
					...metadata,
					userId: user.userId,
					experienceId: user.experienceId,
				},
			});
			
			console.log("Charge result:", chargeResult);
			
			if (!chargeResult?.inAppPurchase) {
				throw new Error("Failed to create charge - no inAppPurchase object returned");
			}
			
			// Return the inAppPurchase object for the client to use with iframeSdk
			return NextResponse.json({
				success: true,
				inAppPurchase: chargeResult.inAppPurchase,
				message: "Charge created successfully, use iframeSdk.inAppPurchase() on client"
			});
			
		} catch (sdkError) {
			console.error("Whop SDK chargeUser error:", sdkError);
			console.error("Error details:", {
				message: sdkError instanceof Error ? sdkError.message : String(sdkError),
				stack: sdkError instanceof Error ? sdkError.stack : undefined,
				name: sdkError instanceof Error ? sdkError.name : undefined
			});
			throw new Error(`Whop SDK error: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`);
		}


	} catch (error) {
		console.error("Failed to create checkout session:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 }
		);
	}
}

export const POST = withWhopAuth(createCheckoutSessionHandler);
