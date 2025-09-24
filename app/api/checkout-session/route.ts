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

		// Create checkout session using Whop SDK
		const checkoutSession = await whopSdk.payments.createCheckoutSession({
			planId,
			metadata: {
				...metadata,
				userId: user.userId,
				experienceId: user.experienceId,
			},
			redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-success`,
		});

		console.log("Checkout session created:", checkoutSession);

		if (!checkoutSession || !checkoutSession.id) {
			throw new Error("Failed to create checkout session");
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
