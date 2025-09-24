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
		console.log("Environment variables:");
		console.log("- WHOP_API_KEY:", !!process.env.WHOP_API_KEY);
		console.log("- NEXT_PUBLIC_WHOP_APP_ID:", !!process.env.NEXT_PUBLIC_WHOP_APP_ID);
		console.log("- NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
		console.log("Plan ID being used:", planId);

		// Create checkout session using Whop SDK
		let checkoutSession;
		try {
			checkoutSession = await whopSdk.payments.createCheckoutSession({
				planId,
				metadata: {
					...metadata,
					userId: user.userId,
					experienceId: user.experienceId,
				},
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-success`,
			});
		} catch (sdkError) {
			console.error("Whop SDK createCheckoutSession error:", sdkError);
			throw new Error(`Whop SDK error: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`);
		}

		console.log("Checkout session created:", checkoutSession);
		console.log("Checkout session type:", typeof checkoutSession);
		console.log("Checkout session keys:", checkoutSession ? Object.keys(checkoutSession) : 'null');

		if (!checkoutSession || !checkoutSession.id) {
			console.error("Checkout session creation failed - session:", checkoutSession);
			
			// Fallback: Use direct checkout URL if SDK fails
			console.log("Falling back to direct checkout URL");
			const fallbackUrl = `https://whop.com/checkout/${planId}?d2c=true`;
			
			return NextResponse.json({
				id: `fallback_${Date.now()}`,
				planId: planId,
				purchase_url: fallbackUrl,
				redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-success`,
				fallback: true,
			});
		}

		// Construct the purchase URL with session ID
		const purchaseUrl = `https://whop.com/checkout/${planId}?d2c=true&session=${checkoutSession.id}`;
		
		console.log("Using checkout session purchase URL:", purchaseUrl);
		
		return NextResponse.json({
			id: checkoutSession.id,
			planId: checkoutSession.planId,
			purchase_url: purchaseUrl,
			redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-success`,
		});

	} catch (error) {
		console.error("Failed to create checkout session:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 }
		);
	}
}

export const POST = withWhopAuth(createCheckoutSessionHandler);
