import { type NextRequest, NextResponse } from "next/server";
import {
	deleteFunnel,
	updateFunnel,
} from "../../../../lib/actions/funnel-actions";
import { getUserContext } from "../../../../lib/context/user-context";
import {
	createErrorResponse,
	createSuccessResponse,
	withFunnelAuth,
} from "../../../../lib/middleware/whop-auth";
import type { AuthContext } from "../../../../lib/middleware/whop-auth";

/**
 * Individual Funnel API Route
 * Handles PUT and DELETE operations for specific funnels with proper authentication and authorization
 */

/**
 * PUT /api/funnels/[funnelId] - Update a specific funnel
 */
async function updateFunnelHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path

		if (!funnelId) {
			return createErrorResponse(
				"MISSING_RESOURCE_ID",
				"Funnel ID is required",
			);
		}

		// Parse request body
		const input = await request.json();

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

		// Update funnel using server action
		const updatedFunnel = await updateFunnel(userContext.user, funnelId, input);

		return createSuccessResponse(updatedFunnel, "Funnel updated successfully");
	} catch (error) {
		console.error("Error updating funnel:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * DELETE /api/funnels/[funnelId] - Delete a specific funnel
 */
async function deleteFunnelHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const funnelId = request.nextUrl.pathname.split("/")[3]; // Extract funnelId from path

		if (!funnelId) {
			return createErrorResponse(
				"MISSING_RESOURCE_ID",
				"Funnel ID is required",
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

		// Delete funnel using server action
		const deleted = await deleteFunnel(userContext.user, funnelId);

		if (deleted) {
			return createSuccessResponse(
				{ deleted: true },
				"Funnel deleted successfully",
			);
		} else {
			return createErrorResponse("DELETE_FAILED", "Failed to delete funnel");
		}
	} catch (error) {
		console.error("Error deleting funnel:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handlers with resource protection
export const PUT = withFunnelAuth(updateFunnelHandler);
export const DELETE = withFunnelAuth(deleteFunnelHandler);
