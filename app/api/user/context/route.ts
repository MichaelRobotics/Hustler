import { NextRequest, NextResponse } from "next/server";
import { getUserContext } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";
import { checkExperienceAccess, retrieveWhopExperience } from "@/lib/whop-rest";
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
		const forceRefresh = searchParams.get("forceRefresh") === "true";
		
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
		const experience = await retrieveWhopExperience(experienceId);
		const whopCompanyId = experience.company.id;

		const experienceAccess = await checkExperienceAccess(userId, experienceId);

		if (!experienceAccess.has_access) {
			return NextResponse.json(
				{ error: "Access denied", hasAccess: false },
				{ status: 403 }
			);
		}

		// Get user context (with forceRefresh option to bypass cache)
		const userContext = await getUserContext(
			userId,
			whopCompanyId,
			experienceId,
			forceRefresh,
			experienceAccess.access_level,
		);

		if (!userContext?.isAuthenticated) {
			return NextResponse.json(
				{ error: "Authentication failed" },
				{ status: 401 }
			);
		}

		// Determine view selection logic based on company and access level
		const developerCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
		const isDeveloperCompany = whopCompanyId === developerCompanyId;
		const accessLevel = userContext.user.accessLevel;
		
		// Owners, including the admin of NEXT_PUBLIC_WHOP_COMPANY_ID, open the admin view.
		let shouldShowViewSelection = false;
		let autoSelectedView = null;
		let userType = null;
		
		if (accessLevel === "customer") {
			autoSelectedView = "customer";
			userType = "customer";
		} else if (accessLevel === "admin") {
			autoSelectedView = "admin";
			userType = isDeveloperCompany ? "developer_admin" : "client_admin";
		} else if (accessLevel === "no_access") {
			// No access - will be handled by hasAccess check
			userType = "no_access";
		}
		
		console.log("🔍 Backend Access Decision:", {
			accessLevel,
			companyId: whopCompanyId,
			developerCompanyId,
			isDeveloperCompany,
			userType,
			shouldShowViewSelection,
			autoSelectedView
		});

		return NextResponse.json({
			user: userContext.user,
			experience: userContext.user.experience, // Include experience data with link field
			isAuthenticated: userContext.isAuthenticated,
			hasAccess: userContext.user.accessLevel !== "no_access",
			// Add view selection logic to response
			shouldShowViewSelection,
			autoSelectedView,
			userType, // Backend-determined user type
		});
	} catch (error) {
		console.error("Error getting user context:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

