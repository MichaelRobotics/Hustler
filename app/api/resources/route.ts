import { type NextRequest, NextResponse } from "next/server";
import {
	createResource,
	getResources,
} from "../../../lib/actions/resource-actions";
import { getUserContext } from "../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withCustomerAuth,
} from "../../../lib/middleware/whop-auth";

/**
 * Resources API Route
 * Handles CRUD operations for resources with proper authentication and authorization
 */

/**
 * GET /api/resources - List user's resources
 */
async function getResourcesHandler(request: NextRequest, context: AuthContext) {
	try {
		const { user } = context;
		const url = new URL(request.url);

		// Extract query parameters
		const page = Number.parseInt(url.searchParams.get("page") || "1");
		const limit = Number.parseInt(url.searchParams.get("limit") || "10");
		const search = url.searchParams.get("search") || undefined;
		const category = url.searchParams.get("category") as
			| "PAID"
			| "FREE_VALUE"
			| undefined;

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

		// Get resources using server action
		const result = await getResources(
			userContext.user,
			page,
			limit,
			search,
			category,
		);

		return createSuccessResponse(result, "Resources retrieved successfully");
	} catch (error) {
		console.error("Error getting resources:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * POST /api/resources - Create a new resource
 */
async function createResourceHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const input = await request.json();

		// Validation
		if (!input.name || !input.type || !input.category) {
			return createErrorResponse(
				"MISSING_REQUIRED_FIELDS",
				"Name, type, and category are required",
			);
		}
		
		// Validate required fields based on type
		if (input.type === "LINK" && !input.link) {
			return createErrorResponse(
				"MISSING_REQUIRED_FIELDS",
				"Link is required for LINK type",
			);
		}
		
		if (input.type === "FILE" && !input.storageUrl) {
			return createErrorResponse(
				"MISSING_REQUIRED_FIELDS",
				"File upload is required for FILE type",
			);
		}
		
		// Image is optional for all products
		// if (!input.image) {
		// 	return createErrorResponse(
		// 		"MISSING_REQUIRED_FIELDS",
		// 		"Image is required for all products",
		// 	);
		// }
		
		// Price is required for paid products
		if (input.category === "PAID" && !input.price) {
			return createErrorResponse(
				"MISSING_REQUIRED_FIELDS",
				"Price is required for paid products",
			);
		}

		if (!["LINK", "FILE"].includes(input.type)) {
			return createErrorResponse(
				"INVALID_INPUT",
				"Type must be either LINK or FILE",
			);
		}

		if (!["PAID", "FREE_VALUE"].includes(input.category)) {
			return createErrorResponse(
				"INVALID_INPUT",
				"Category must be either PAID or FREE_VALUE",
			);
		}

		// Validate experience ID is provided
		console.log("🔍 Resources API - user.experienceId:", user.experienceId);
		console.log("🔍 Resources API - user object:", JSON.stringify(user, null, 2));
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

		// Map promoCode to code for database compatibility
		const resourceData = {
			...input,
			code: input.promoCode || input.code,
		};
		delete resourceData.promoCode; // Remove promoCode as it's not expected by the backend

		// Create resource using server action
		const newResource = await createResource(userContext.user, resourceData);

		return createSuccessResponse(
			newResource,
			"Resource created successfully",
			201,
		);
	} catch (error) {
		console.error("Error creating resource:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handlers
export const GET = withCustomerAuth(getResourcesHandler);
export const POST = withCustomerAuth(createResourceHandler);
