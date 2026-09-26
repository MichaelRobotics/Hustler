import { NextRequest, NextResponse } from "next/server";
import { withWhopAuth, type AuthContext } from "@/lib/middleware/whop-auth";

/**
 * POST /api/payments/retrieve - Retrieve payment details from Whop SDK
 * 
 * Body:
 * - paymentId: string (Whop payment ID)
 */
async function retrievePaymentHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const body = await request.json();
		const { paymentId } = body;

		if (!paymentId) {
			return NextResponse.json(
				{ error: "paymentId is required" },
				{ status: 400 }
			);
		}

		// Use @whop/sdk client SDK to retrieve payment
		const { createWhopRestClient } = await import("@/lib/whop-rest");
		const client = createWhopRestClient();

		const payment = await client.payments.retrieve({ id: paymentId });

		if (!payment) {
			return NextResponse.json(
				{ error: "Payment not found" },
				{ status: 404 }
			);
		}

		console.log(`✅ Retrieved payment ${paymentId}: status=${payment.status}`);

		return NextResponse.json({
			id: payment.id,
			status: payment.status,
			plan: payment.plan_id ? {
				id: payment.plan_id,
			} : null,
			membership: payment.membership_id ? {
				id: payment.membership_id,
			} : null,
			user: payment.user ? {
				id: payment.user.id,
				name: payment.user.name,
				email: payment.customer_email,
			} : null,
			company: payment.account_id ? {
				id: payment.account_id,
			} : null,
			paid_at: payment.paid_at,
			created_at: payment.created_at,
		});
	} catch (error: any) {
		console.error("Error retrieving payment:", error);
		const errorMessage = error?.message || error?.response?.data?.message || error?.response?.data?.error || "Failed to retrieve payment";
		console.error("Detailed error:", JSON.stringify(error, null, 2));
		return NextResponse.json(
			{ error: errorMessage },
			{ status: 500 }
		);
	}
}

export const POST = withWhopAuth(retrievePaymentHandler);


