import { type NextRequest, NextResponse } from "next/server";
import { removeResourceFromFunnel } from "../../../../../../lib/actions/funnel-actions";
import { getUserContext } from "../../../../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withCustomerAuth,
} from "../../../../../../lib/middleware/whop-auth";

/**
 * Individual Funnel Resource API Route
 * Handles removing a specific resource from a funnel
 */

/**
 * DELETE /api/funnels/[funnelId]/resources/[resourceId] - Remove a resource from a funnel
 */
async function removeResourceFromFunnelHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const pathParts = request.nextUrl.pathname.split("/");
		const funnelId = pathParts[3]; // Extract funnelId from path
		const resourceId = pathParts[5]; // Extract resourceId from path

		if (!funnelId) {
			return createErrorResponse("MISSING_FUNNEL_ID", "Funnel ID is required");
		}

		if (!resourceId) {
			return createErrorResponse(
				"MISSING_RESOURCE_ID",
				"Resource ID is required",
			);
		}

		// Use experience ID from URL or fallback to a default
		const experienceId = user.experienceId || "exp_wl5EtbHqAqLdjV";

		// Get the full user context
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

		// Remove resource from funnel using server action
		await removeResourceFromFunnel(userContext.user, funnelId, resourceId);

		return createSuccessResponse(
			null,
			"Resource removed from funnel successfully",
		);
	} catch (error) {
		console.error("Error removing resource from funnel:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export handler with authentication middleware
export const DELETE = withCustomerAuth(removeResourceFromFunnelHandler);
