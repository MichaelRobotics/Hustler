import { type NextRequest, NextResponse } from "next/server";
import { getPlansForProduct } from "../../../lib/actions/plan-actions";
import { getUserContext } from "../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withCustomerAuth,
} from "../../../lib/middleware/whop-auth";

/**
 * Plans API Route
 * Handles fetching plans for products
 */

/**
 * GET /api/plans - Get plans for a specific product
 */
async function getPlansHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const url = new URL(request.url);

		// Extract query parameters
		const whopProductId = url.searchParams.get("whopProductId");

		if (!whopProductId) {
			return createErrorResponse(
				"MISSING_REQUIRED_FIELDS",
				"whopProductId query parameter is required",
			);
		}

		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 },
			);
		}
		const experienceId = user.experienceId;

		// Get the full user context
		const userContext = await getUserContext(
			user.userId,
			"", // whopCompanyId is optional for experience-based isolation
			experienceId,
			false, // forceRefresh
		);

		if (!userContext) {
			return NextResponse.json(
				{ error: "User context not found" },
				{ status: 401 },
			);
		}

		// Get plans for the product
		const plans = await getPlansForProduct(whopProductId, experienceId);

		return createSuccessResponse(plans, "Plans retrieved successfully");
	} catch (error) {
		console.error("Error getting plans:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export handlers with authentication middleware
export const GET = withCustomerAuth(getPlansHandler);







