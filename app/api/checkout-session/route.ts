import { withWhopAuth } from "@/lib/middleware/whop-auth";
import { whopSdk } from "@/lib/whop-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const POST = withWhopAuth(async (request: NextRequest, { user }) => {
	try {
		const body = await request.json();
		const { planId, metadata } = body;

		if (!planId) {
			return NextResponse.json(
				{ error: "Plan ID is required" },
				{ status: 400 }
			);
		}

		console.log("Creating checkout session for plan:", planId);
		console.log("With metadata:", metadata);

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

		if (!checkoutSession) {
			throw new Error("Failed to create checkout session");
		}

		return NextResponse.json({
			id: checkoutSession.id,
			purchase_url: (checkoutSession as any).purchase_url || `https://whop.com/checkout/${planId}?d2c=true`,
			redirect_url: (checkoutSession as any).redirect_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment-success`,
		});
	} catch (error) {
		console.error("Failed to create checkout session:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session" },
			{ status: 500 }
		);
	}
});
