import { NextRequest, NextResponse } from "next/server";
import { getUserContext, invalidateUserCache } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

/**
 * GET /api/user/balance - Get user balance (subscription, credits, messages, membership)
 * Lightweight endpoint that returns only balance-related fields
 */
export async function GET(request: NextRequest) {
	try {
		// Get headers from WHOP iframe
		const headersList = await headers();
		
		// Get experienceId from query params
		const { searchParams } = new URL(request.url);
		const experienceId = searchParams.get("experienceId");
		
		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		// Verify user token directly with WHOP SDK
		const { userId } = await whopSdk.verifyUserToken(headersList);
		
		// Get company ID from experience data
		const experience = await whopSdk.experiences.getExperience({
			experienceId,
		});
		const whopCompanyId = experience.company.id;

		// Check access to the experience
		const experienceAccess = await whopSdk.access.checkIfUserHasAccessToExperience({
			userId: userId,
			experienceId: experienceId,
		});

		if (!experienceAccess.hasAccess) {
			return NextResponse.json(
				{ error: "Access denied", hasAccess: false },
				{ status: 403 }
			);
		}

		// Invalidate cache to ensure fresh data
		invalidateUserCache(`${userId}:${experienceId}`);

		// Get user context with forceRefresh to get fresh data
		const userContext = await getUserContext(
			userId,
			whopCompanyId,
			experienceId,
			true, // forceRefresh to bypass cache
			experienceAccess.accessLevel,
		);

		if (!userContext?.isAuthenticated || !userContext?.user) {
			return NextResponse.json(
				{ error: "Authentication failed" },
				{ status: 401 }
			);
		}

		// Return only balance-related fields
		return NextResponse.json({
			subscription: userContext.user.subscription ?? null,
			credits: userContext.user.credits ?? 0,
			messages: userContext.user.messages ?? 0,
			membership: userContext.user.membership ?? null,
		});
	} catch (error) {
		console.error("Error getting user balance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

