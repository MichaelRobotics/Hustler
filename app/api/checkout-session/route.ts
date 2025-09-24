import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * POST /api/checkout-session - Create a checkout session with metadata
 * Uses proper multi-tenant authentication and experience isolation
 */
async function createCheckoutSessionHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const experienceId = user.experienceId;
		
		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID required" },
				{ status: 400 }
			);
		}

		const { planId, packId, credits } = await request.json();

		if (!planId) {
			return NextResponse.json(
				{ error: "planId is required" },
				{ status: 400 }
			);
		}

		// Get user ID from auth context (more secure than manual token verification)
		const userId = user.userId;

		// Create checkout session with metadata
		const checkoutSession = await whopSdk.payments.createCheckoutSession({
			planId,
			metadata: {
				experienceId,
				userId,
				packId,
				credits,
				type: "credit_pack",
				timestamp: new Date().toISOString(),
			},
		});

		if (!checkoutSession) {
			throw new Error("Failed to create checkout session");
		}

		console.log("Checkout session created:", {
			sessionId: checkoutSession.id,
			planId: checkoutSession.planId,
			experienceId,
			userId,
			metadata: {
				experienceId,
				userId,
				packId,
				credits,
			},
		});

		return NextResponse.json({
			success: true,
			sessionId: checkoutSession.id,
			planId: checkoutSession.planId,
		});

	} catch (error) {
		console.error("Error creating checkout session:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session", details: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}

// Export with proper authentication middleware
export const POST = withWhopAuth(createCheckoutSessionHandler);
