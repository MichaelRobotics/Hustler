import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { subscriptions } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/checkout/lookup - Lookup plan by type and amount or type and planId
 * 
 * Returns plan data (not checkout data) - frontend will use this to create checkout dynamically
 * 
 * Query params:
 * - type: "Basic" | "Pro" | "Vip" | "Credits" | "Messages"
 * - amount: number (for Credits/Messages)
 * - planId: string (for subscriptions - the internal planId like "basic", "pro", "vip")
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
			// For subscriptions (Basic/Pro/Vip), lookup by type only
			// There's only one plan of each subscription type, so type is sufficient
			whereCondition = eq(subscriptions.type, type);
		}

		// Query the subscriptions table
		const plan = await db.query.subscriptions.findFirst({
			where: whereCondition,
		});

		if (!plan) {
			return NextResponse.json(
				{ error: "Plan not found for the specified criteria" },
				{ status: 404 }
			);
		}

		// Return plan data (not checkout data)
		return NextResponse.json({
			planId: plan.planId, // Whop plan ID
			type: plan.type,
			amount: plan.amount,
			credits: plan.credits,
			messages: plan.messages,
		});
	} catch (error) {
		console.error("Error looking up plan:", error);
		return NextResponse.json(
			{ error: "Failed to lookup plan" },
			{ status: 500 }
		);
	}
}

