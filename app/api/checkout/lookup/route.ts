import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { subscriptions } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/checkout/lookup - Lookup checkout by type and amount or type and planId
 * 
 * Query params:
 * - type: "Basic" | "Pro" | "Vip" | "Credits" | "Messages"
 * - amount: number (for Credits/Messages)
 * - planId: string (for subscriptions)
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const type = searchParams.get("type");
		const amount = searchParams.get("amount");
		const planId = searchParams.get("planId");

		if (!type) {
			return NextResponse.json(
				{ error: "Type parameter is required" },
				{ status: 400 }
			);
		}

		// Validate type
		const validTypes = ["Basic", "Pro", "Vip", "Credits", "Messages"];
		if (!validTypes.includes(type)) {
			return NextResponse.json(
				{ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
				{ status: 400 }
			);
		}

		// Build where condition based on type
		let whereCondition;
		
		if (type === "Credits" || type === "Messages") {
			// For Credits/Messages, lookup by type + amount
			if (!amount) {
				return NextResponse.json(
					{ error: "Amount parameter is required for Credits and Messages" },
					{ status: 400 }
				);
			}

			const amountValue = parseFloat(amount);
			if (isNaN(amountValue)) {
				return NextResponse.json(
					{ error: "Amount must be a valid number" },
					{ status: 400 }
				);
			}

			whereCondition = and(
				eq(subscriptions.type, type),
				eq(subscriptions.amount, amountValue.toString())
			);
		} else {
			// For subscriptions (Basic/Pro/Vip), lookup by type + planId
			if (!planId) {
				return NextResponse.json(
					{ error: "PlanId parameter is required for subscriptions" },
					{ status: 400 }
				);
			}

			whereCondition = and(
				eq(subscriptions.type, type),
				eq(subscriptions.planId, planId)
			);
		}

		// Query the subscriptions table
		const checkout = await db.query.subscriptions.findFirst({
			where: whereCondition,
		});

		if (!checkout) {
			return NextResponse.json(
				{ error: "Checkout not found for the specified criteria" },
				{ status: 404 }
			);
		}

		// Note: We use checkoutId as planId since the Whop SDK method for getting
		// checkout configurations is not available in the client SDK.
		// The checkoutId can be used directly with iframeSdk.inAppPurchase
		const whopPlanId: string | null = null;

		return NextResponse.json({
			checkoutId: checkout.checkoutId,
			internalCheckoutId: checkout.internalCheckoutId,
			planId: whopPlanId || checkout.checkoutId, // Fallback to checkoutId if plan ID not available
			type: checkout.type,
			amount: checkout.amount,
		});
	} catch (error) {
		console.error("Error looking up checkout:", error);
		return NextResponse.json(
			{ error: "Failed to lookup checkout" },
			{ status: 500 }
		);
	}
}

