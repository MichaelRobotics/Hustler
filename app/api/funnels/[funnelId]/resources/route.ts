import { type NextRequest, NextResponse } from "next/server";
import {
	addResourceToFunnel,
	removeResourceFromFunnel,
} from "../../../../../lib/actions/funnel-actions";
import { getUserContext } from "../../../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withCustomerAuth,
} from "../../../../../lib/middleware/whop-auth";

/**
 * Funnel Resources API Route
 * Handles adding and removing resources from funnels
 */

/**
 * POST /api/funnels/[funnelId]/resources - Add a resource to a funnel
 */
async function addResourceToFunnelHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path

		if (!funnelId) {
			return createErrorResponse("MISSING_FUNNEL_ID", "Funnel ID is required");
		}

		const { resourceId } = await request.json();

		if (!resourceId) {
			return createErrorResponse(
				"MISSING_RESOURCE_ID",
				"Resource ID is required",
			);
		}

		// Use experience ID from URL or fallback to a default
		const experienceId = user.experienceId || "exp_wl5EtbHqAqLdjV";

		// Get the full user context - let it determine access level from Whop API
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

		// Debug: Log the values being passed
		console.log("🔍 DEBUG - Adding resource to funnel:");
		console.log("  - funnelId:", funnelId);
		console.log("  - resourceId:", resourceId);
		console.log("  - user.id:", userContext.user.id);
		console.log("  - user.accessLevel:", userContext.user.accessLevel);

		// Add resource to funnel using server action
		const updatedFunnel = await addResourceToFunnel(
			userContext.user,
			funnelId,
			resourceId,
		);

		return createSuccessResponse(
			updatedFunnel,
			"Resource added to funnel successfully",
		);
	} catch (error) {
		console.error("Error adding resource to funnel:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export handler with authentication middleware
export const POST = withCustomerAuth(addResourceToFunnelHandler);
