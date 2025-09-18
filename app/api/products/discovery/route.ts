import { type NextRequest, NextResponse } from "next/server";
import { getUserContext } from "../../../../lib/context/user-context";
import {
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../../lib/middleware/whop-auth";
import type { AuthContext } from "../../../../lib/middleware/whop-auth";
import { getWhopApiClient } from "../../../../lib/whop-api-client";

/**
 * Discovery Products API Route
 * Fetches discovery page products for funnel creation
 */

/**
 * GET /api/products/discovery - Get discovery page products
 */
async function getDiscoveryProductsHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;

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

		// Get company ID from experience
		const companyId = userContext.user.experience?.whopCompanyId;
		if (!companyId) {
			return NextResponse.json(
				{ error: "Company ID not found in experience" },
				{ status: 400 },
			);
		}

		// Get discovery page products using WhopApiClient
		const whopClient = getWhopApiClient(companyId, userContext.user.id);
		const discoveryProducts = await whopClient.getCompanyProducts();

		// Return simplified product data for modal
		const products = discoveryProducts.map(product => ({
			id: product.id,           // accessPass.id
			title: product.title,     // Product name for display
			description: product.description,
			price: product.price,
			currency: product.currency,
			isFree: product.isFree,
			route: product.route,
			discoveryPageUrl: product.discoveryPageUrl
		}));

		return createSuccessResponse(
			products,
			"Discovery products retrieved successfully",
		);
	} catch (error) {
		console.error("Error getting discovery products:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handler
export const GET = withWhopAuth(getDiscoveryProductsHandler);

