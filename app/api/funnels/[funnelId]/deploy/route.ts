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
		const experienceId = user.experienceId || "exp_wl5EtbHqAqLdjV"; // Fallback for API routes

		// Get the full user context from the simplified auth (whopCompanyId is now optional)
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			experienceId,
			false, // forceRefresh
			"customer", // default access level
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
		console.error("Error deploying funnel:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handler with resource protection
export const POST = withFunnelAuth(deployFunnelHandler);
