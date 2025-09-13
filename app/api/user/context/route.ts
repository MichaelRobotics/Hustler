import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

/**
 * GET /api/user/context - Get user context for the current user
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
		
		// Debug logging for user context
		console.log(`[user-context] Debug - Session userId from whopSdk.verifyUserToken: ${userId}`);
		
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

		// Get user context
		const userContext = await getUserContext(
			userId,
			whopCompanyId,
			experienceId,
			false,
			experienceAccess.accessLevel,
		);

		if (!userContext?.isAuthenticated) {
			return NextResponse.json(
				{ error: "Authentication failed" },
				{ status: 401 }
			);
		}

		return NextResponse.json({
			user: userContext.user,
			isAuthenticated: userContext.isAuthenticated,
			hasAccess: userContext.user.accessLevel !== "no_access",
		});
	} catch (error) {
		console.error("Error getting user context:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

