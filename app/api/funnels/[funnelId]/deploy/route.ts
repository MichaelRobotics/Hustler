import { type NextRequest, NextResponse } from "next/server";
import { deployFunnel } from "../../../../../lib/actions/funnel-actions";
import {
	createErrorResponse,
	createSuccessResponse,
	withFunnelAuth,
} from "../../../../../lib/middleware/whop-auth";
import type { AuthContext } from "../../../../../lib/middleware/whop-auth";

import { getUserContext } from "../../../../../lib/context/user-context";

/**
 * Deploy Funnel API Route
 * Handles funnel deployment with proper authentication and authorization
 */

/**
 * POST /api/funnels/[funnelId]/deploy - Deploy a funnel
 */
async function deployFunnelHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path

		if (!funnelId) {
			return createErrorResponse(
				"MISSING_RESOURCE_ID",
				"Funnel ID is required",
			);
		}

		// Use experience ID from URL or fallback to a default
		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 },
			);
		}
		const experienceId = user.experienceId;

		// Get the full user context from the simplified auth (whopCompanyId is now optional)
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			experienceId,
			false, // forceRefresh
			// Don't pass access level - let it be determined from Whop API
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 },
			);
		}

		// Deploy funnel using server action
		const deployedFunnel = await deployFunnel(userContext.user, funnelId);

		return createSuccessResponse(
			deployedFunnel,
			"Funnel deployed successfully",
		);
	} catch (error) {
		const errorMessage = (error as Error).message;
		
		// Check if this is a live funnel conflict (expected behavior)
		if (errorMessage.includes("is currently live for this experience")) {
			console.log(`ℹ️ [DEPLOYMENT INFO] Deployment blocked - another funnel is live: ${errorMessage}`);
		} else {
			console.error("Error deploying funnel:", error);
		}
		
		return createErrorResponse("INTERNAL_ERROR", errorMessage);
	}
}

// Export the protected route handler with resource protection
export const POST = withFunnelAuth(deployFunnelHandler);
