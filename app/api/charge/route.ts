import { whopSdk } from "@/lib/whop-sdk";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";
import { NextRequest, NextResponse } from "next/server";

// Credit pack pricing in dollars (USD) - aligned with frontend pricing
const CREDIT_PACK_PRICING: Record<string, { price: number; credits: number }> = {
	starter: { price: 9.99, credits: 5 }, // $9.99 for 5 credits
	popular: { price: 24.99, credits: 15 }, // $24.99 for 15 credits  
	pro: { price: 39.99, credits: 30 }, // $39.99 for 30 credits
};

async function createChargeHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const { packId } = await request.json();

		if (!packId || !CREDIT_PACK_PRICING[packId]) {
			return NextResponse.json(
				{ error: "Invalid credit pack ID" },
				{ status: 400 }
			);
		}

		const packInfo = CREDIT_PACK_PRICING[packId];
		const userId = user.userId;
		const experienceId = user.experienceId;

		if (!userId || !experienceId) {
			return NextResponse.json(
				{ error: "User ID or Experience ID not available" },
				{ status: 400 }
			);
		}

		console.log(`Creating charge for pack ${packId}: $${packInfo.price} for ${packInfo.credits} credits`);

		const result = await whopSdk.payments.chargeUser({
			amount: packInfo.price, // Use dollar amount directly
			currency: "usd",
			userId: userId,
			description: `${packInfo.credits} Credits - ${packId.charAt(0).toUpperCase() + packId.slice(1)} Pack`,
			metadata: {
				type: "credit_pack",
				packId: packId,
				credits: packInfo.credits,
				experienceId: experienceId,
			},
		});

		if (!result?.inAppPurchase) {
			throw new Error("Failed to create charge");
		}

		console.log("Charge created successfully:", result.inAppPurchase);

		return NextResponse.json(result.inAppPurchase);
	} catch (error) {
		console.error("Error creating charge:", error);
		return NextResponse.json(
			{ error: "Failed to create charge" },
			{ status: 500 }
		);
	}
}

export const POST = withWhopAuth(createChargeHandler);
