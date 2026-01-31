import { type NextRequest, NextResponse } from "next/server";
import { getFunnelProductFaqs, upsertFunnelProductFaq } from "../../../../../lib/actions/funnel-actions";
import { getUserContext } from "../../../../../lib/context/user-context";
import {
	type AuthContext,
	withWhopAuth,
} from "../../../../../lib/middleware/whop-auth";

/**
 * GET /api/funnels/[funnelId]/product-faqs - Get all product FAQs for a funnel
 */
async function getProductFaqsHandler(
	request: NextRequest,
	context: AuthContext
) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path

		if (!funnelId) {
			return NextResponse.json(
				{ error: "Funnel ID is required" },
				{ status: 400 }
			);
		}

		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		const userContext = await getUserContext(
			user.userId,
			"",
			user.experienceId,
			false,
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 }
			);
		}

		const faqs = await getFunnelProductFaqs(userContext.user, funnelId);

		return NextResponse.json({
			success: true,
			data: faqs,
			message: "Product FAQs retrieved successfully",
		});
	} catch (error) {
		console.error("Error getting product FAQs:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 }
		);
	}
}

/**
 * POST /api/funnels/[funnelId]/product-faqs - Create or update a product FAQ
 */
async function upsertProductFaqHandler(
	request: NextRequest,
	context: AuthContext
) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path

		if (!funnelId) {
			return NextResponse.json(
				{ error: "Funnel ID is required" },
				{ status: 400 }
			);
		}
		const body = await request.json();

		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		const userContext = await getUserContext(
			user.userId,
			"",
			user.experienceId,
			false,
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 }
			);
		}

		const faq = await upsertFunnelProductFaq(userContext.user, {
			funnelId,
			resourceId: body.resourceId,
			faqContent: body.faqContent,
			objectionHandling: body.objectionHandling,
		});

		return NextResponse.json({
			success: true,
			data: faq,
			message: "Product FAQ saved successfully",
		});
	} catch (error) {
		console.error("Error upserting product FAQ:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 }
		);
	}
}

export const GET = withWhopAuth(getProductFaqsHandler);
export const POST = withWhopAuth(upsertProductFaqHandler);


