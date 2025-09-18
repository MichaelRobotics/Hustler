import { type NextRequest, NextResponse } from "next/server";
import { createFunnel, getFunnels } from "../../../lib/actions/funnel-actions";
import { getUserContext } from "../../../lib/context/user-context";
import {
	type AuthContext,
	withWhopAuth,
} from "../../../lib/middleware/whop-auth";

/**
 * Funnels API Route
 * Handles CRUD operations for funnels with proper authentication and authorization
 */

/**
 * GET /api/funnels - List user's funnels
 */
async function getFunnelsHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const url = new URL(request.url);

		// Extract query parameters
		const page = Number.parseInt(url.searchParams.get("page") || "1");
		const limit = Number.parseInt(url.searchParams.get("limit") || "10");
		const search = url.searchParams.get("search") || undefined;

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

		// Get funnels using the full user context
		const funnels = await getFunnels(userContext.user, page, limit, search);

		return NextResponse.json({
			success: true,
			data: funnels,
			message: "Funnels retrieved successfully",
		});
	} catch (error) {
		console.error("Error getting funnels:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 },
		);
	}
}

/**
 * POST /api/funnels - Create a new funnel
 */
async function createFunnelHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const input = await request.json();

		if (!input.name) {
			return NextResponse.json(
				{ error: "Funnel name is required" },
				{ status: 400 },
			);
		}

		// Validate experience ID is provided
		console.log("🔍 Funnels API - user.experienceId:", user.experienceId);
		console.log("🔍 Funnels API - user object:", JSON.stringify(user, null, 2));
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

		// Create the funnel using the full user context
		const funnel = await createFunnel(userContext.user, {
			name: input.name,
			description: input.description,
			resources: input.resources || [],
			whopProductId: input.whopProductId, // 🔑 NEW: Product association
		});

		return NextResponse.json(
			{
				success: true,
				data: funnel,
				message: "Funnel created successfully",
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error creating funnel:", error);
		return NextResponse.json(
			{ error: (error as Error).message },
			{ status: 500 },
		);
	}
}

// Export the protected route handlers
export const GET = withWhopAuth(getFunnelsHandler);
export const POST = withWhopAuth(createFunnelHandler);
