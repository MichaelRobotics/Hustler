import { type NextRequest, NextResponse } from "next/server";
import {
	deleteResource,
	updateResource,
} from "../../../../lib/actions/resource-actions";
import { getUserContext } from "../../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withCustomerAuth,
} from "../../../../lib/middleware/whop-auth";

/**
 * Individual Resource API Route
 * Handles PUT and DELETE operations for specific resources with proper authentication and authorization
 */

/**
 * PUT /api/resources/[resourceId] - Update a specific resource
 */
async function updateResourceHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const resourceId = request.nextUrl.pathname.split("/")[3]; // Extract resourceId from path

		if (!resourceId) {
			return createErrorResponse(
				"MISSING_RESOURCE_ID",
				"Resource ID is required",
			);
		}

		const input = await request.json();

		// Validation
		if (input.type && !["AFFILIATE", "MY_PRODUCTS"].includes(input.type)) {
			return createErrorResponse(
				"INVALID_INPUT",
				"Type must be either AFFILIATE or MY_PRODUCTS",
			);
		}

		if (input.category && !["PAID", "FREE_VALUE"].includes(input.category)) {
			return createErrorResponse(
				"INVALID_INPUT",
				"Category must be either PAID or FREE_VALUE",
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

		// Map promoCode to code for database compatibility
		const resourceData = {
			...input,
			code: input.promoCode || input.code,
		};
		delete resourceData.promoCode; // Remove promoCode as it's not expected by the backend

		// Update resource using server action
		const updatedResource = await updateResource(
			userContext.user,
			resourceId,
			resourceData,
		);

		return createSuccessResponse(
			updatedResource,
			"Resource updated successfully",
		);
	} catch (error) {
		console.error("Error updating resource:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * DELETE /api/resources/[resourceId] - Delete a specific resource
 */
async function deleteResourceHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const resourceId = request.nextUrl.pathname.split("/")[3]; // Extract resourceId from path

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

		// Delete resource using server action
		await deleteResource(userContext.user, resourceId);

		return createSuccessResponse(null, "Resource deleted successfully");
	} catch (error) {
		console.error("Error deleting resource:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export handlers with authentication middleware
export const PUT = withCustomerAuth(updateResourceHandler);
export const DELETE = withCustomerAuth(deleteResourceHandler);
