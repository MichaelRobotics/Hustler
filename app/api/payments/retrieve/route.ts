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
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
			appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
		});

		// Retrieve payment from Whop API
		const payment = await client.payments.retrieve(paymentId);

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
			plan: payment.plan ? {
				id: payment.plan.id,
			} : null,
			membership: payment.membership ? {
				id: payment.membership.id,
				status: payment.membership.status,
			} : null,
			user: payment.user ? {
				id: payment.user.id,
				name: payment.user.name,
				email: payment.user.email,
			} : null,
			company: payment.company ? {
				id: payment.company.id,
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


