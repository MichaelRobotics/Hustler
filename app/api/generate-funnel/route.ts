import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import {
	AIError,
	ValidationError,
	generateFunnelFlow,
} from "../../../lib/actions/ai-actions";
import { getUserContext } from "../../../lib/context/user-context";
import { updateUserCredits } from "../../../lib/context/user-context";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../lib/middleware/whop-auth";
import { db } from "../../../lib/supabase/db-server";
import { funnels } from "../../../lib/supabase/schema";

/**
 * Generate Funnel API Route
 * Protected route that requires authentication and credits
 */
async function generateFunnelHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { resources, funnelId, experienceId } = await request.json();

		if (!funnelId) {
			return createErrorResponse(
				"MISSING_FUNNEL_ID",
				"Funnel ID is required for generation",
			);
		}

		// Get experienceId from request body or fallback to environment variable
		const finalExperienceId = experienceId || context.user.experienceId || process.env.NEXT_PUBLIC_WHOP_EXPERIENCE_ID || "";
		
		if (!finalExperienceId) {
			return createErrorResponse(
				"MISSING_EXPERIENCE_ID",
				"Experience ID is required for generation",
			);
		}

		// Check if user is admin and has sufficient credits
		const userContext = await getUserContext(
			context.user.userId,
			"",
			finalExperienceId,
		);
		if (!userContext) {
			return createErrorResponse(
				"USER_NOT_FOUND",
				"User context not found",
			);
		}
		
		if (userContext.user.accessLevel !== "admin") {
			return createErrorResponse(
				"ACCESS_DENIED",
				"Only admins can generate funnels",
			);
		}
		
		if (userContext.user.credits < 1) {
			return createErrorResponse(
				"INSUFFICIENT_CREDITS",
				"Insufficient credits to generate funnel. Please purchase more credits.",
			);
		}

		// Verify funnel exists and user has access
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, userContext.user.experience.id), // Use database ID for foreign key
			),
		});

		if (!existingFunnel) {
			return createErrorResponse(
				"FUNNEL_NOT_FOUND",
				"Funnel not found or access denied",
			);
		}

		// Convert AIResource[] to Resource[] format
		const convertedResources = (resources || []).map((resource: any) => ({
			id: resource.id,
			type: resource.type,
			name: resource.name,
			link: resource.link,
			code: resource.code || "",
			category: resource.price || "FREE_VALUE", // Map price to category
		}));

		// Generate the funnel flow using AI
		const generatedFlow = await generateFunnelFlow(convertedResources);

		// Save the generated flow directly to the database
		const [updatedFunnel] = await db
			.update(funnels)
			.set({
				flow: generatedFlow,
				generationStatus: "completed",
				isDeployed: false, // Reset deployment status
				updatedAt: new Date(),
			})
			.where(eq(funnels.id, funnelId))
			.returning();

		// Deduct credit AFTER successful generation and database save (server-side for security)
		const creditDeducted = await updateUserCredits(
			userContext.user.whopUserId,
			userContext.user.experience.id, // Use database UUID, not Whop Experience ID
			1,
			"subtract",
		);
		if (!creditDeducted) {
			console.warn(
				"Failed to deduct credits for user:",
				userContext.user.whopUserId,
			);
			// Note: Generation succeeded but credit deduction failed - this is logged but not blocking
		} else {
			console.log(
				`Credit deducted for user ${userContext.user.whopUserId} after successful generation`,
			);
		}

		return createSuccessResponse(
			generatedFlow,
			"Funnel generated and saved successfully",
		);
	} catch (error) {
		console.error("API Error:", error);

		if (error instanceof ValidationError) {
			return createErrorResponse("INVALID_INPUT", error.message);
		}

		if (error instanceof AIError) {
			let errorType: keyof typeof import("../../../lib/middleware/error-handling").ERROR_TYPES = "INTERNAL_ERROR";
			switch (error.type) {
				case "AUTHENTICATION":
					errorType = "INVALID_TOKEN";
					break;
				case "RATE_LIMIT":
					errorType = "INTERNAL_ERROR";
					break;
				case "NETWORK":
					errorType = "INTERNAL_ERROR";
					break;
				case "CONTENT":
					errorType = "INVALID_INPUT";
					break;
				default:
					errorType = "INTERNAL_ERROR";
			}

			return createErrorResponse(errorType, error.message);
		}

		// Generic error
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handler
export const POST = withWhopAuth(generateFunnelHandler);
