import { NextRequest, NextResponse } from "next/server";
import { whopSdk } from "@/lib/whop-sdk";
import { validateToken } from "@whop-apps/sdk";
import { headers } from "next/headers";

/**
 * POST /api/checkout-session-simple - Create a checkout session without authentication middleware
 * This endpoint doesn't use withWhopAuth to avoid the session key requirement
 */
export async function POST(request: NextRequest) {
	try {
		const { planId, packId, credits, experienceId } = await request.json();

		if (!planId) {
			return NextResponse.json(
				{ error: "planId is required" },
				{ status: 400 }
			);
		}

		if (!experienceId) {
			return NextResponse.json(
				{ error: "experienceId is required" },
				{ status: 400 }
			);
		}

		console.log("Creating checkout session:", {
			planId,
			packId,
			credits,
			experienceId,
		});

		// Get authenticated user ID from token
		const headersList = await headers();
		const { userId } = await validateToken({ headers: headersList });
		
		if (!userId) {
			return NextResponse.json(
				{ error: "User authentication required" },
				{ status: 401 }
			);
		}

		// Create charge using chargeUser method
		const chargeResult = await whopSdk.payments.chargeUser({
			amount: 0, // We'll use plan-based pricing instead
			currency: "usd",
			description: `${credits} Credits - ${packId} Pack`,
			metadata: {
				experienceId,
				packId,
				credits,
				type: "credit_pack",
				timestamp: new Date().toISOString(),
			},
			userId: userId, // Use authenticated user ID
		});

		if (!chargeResult || !chargeResult.inAppPurchase) {
			throw new Error("Failed to create charge");
		}

		console.log("Charge created:", {
			status: chargeResult.status,
			sessionId: chargeResult.inAppPurchase.id,
			planId: chargeResult.inAppPurchase.planId,
			experienceId,
			metadata: {
				experienceId,
				packId,
				credits,
			},
		});

		return NextResponse.json({
			success: true,
			sessionId: chargeResult.inAppPurchase.id,
			planId: chargeResult.inAppPurchase.planId,
			status: chargeResult.status,
		});

	} catch (error) {
		console.error("Error creating checkout session:", error);
		return NextResponse.json(
			{ error: "Failed to create checkout session", details: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 }
		);
	}
}
