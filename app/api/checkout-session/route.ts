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

		// Create checkout session for metadata tracking, then use iframe SDK for modal
		console.log("Creating checkout session for iframe SDK modal");
		
		// Use the same URL pattern as other parts of the codebase
		const redirectUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000";
		console.log("Using redirect URL:", redirectUrl);
		
		const sessionMetadata = {
			...metadata,
			userId: user.userId,
			experienceId: user.experienceId,
		};
		
		console.log("Session metadata:", sessionMetadata);
		
		let checkoutSession;
		try {
			checkoutSession = await whopSdk.payments.createCheckoutSession({
				planId,
				metadata: sessionMetadata,
				redirectUrl: `${redirectUrl}/payment-success`,
			});
			
			console.log("Checkout session created:", checkoutSession);
			
			if (!checkoutSession || !checkoutSession.id) {
				console.error("Checkout session creation failed - session:", checkoutSession);
				throw new Error("Failed to create checkout session");
			}
			
			// Return the checkout session for iframe SDK to use
			return NextResponse.json({
				success: true,
				checkoutSession: {
					id: checkoutSession.id,
					planId: checkoutSession.planId,
				},
				message: "Checkout session created successfully, use iframeSdk.inAppPurchase() on client"
			});
			
		} catch (sdkError) {
			console.error("Whop SDK createCheckoutSession error:", sdkError);
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
