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
import { funnels, experiences, users } from "../../../lib/supabase/schema";
import type { FunnelFlow } from "../../../lib/types/funnel";

/**
 * Look up admin user by experience ID
 * Returns the admin's first name if found, null otherwise
 */
async function lookupAdminUser(experienceId: string): Promise<string | null> {
	try {
		console.log(`[Admin Lookup] Looking up admin user for experience: ${experienceId}`);
		
		const adminUser = await db.query.users.findFirst({
			where: and(
				eq(users.experienceId, experienceId),
				eq(users.accessLevel, "admin")
			),
		});

		if (adminUser?.name) {
			// Return first word of admin name
			const firstName = adminUser.name.split(' ')[0];
			console.log(`[Admin Lookup] Found admin user: ${adminUser.name} -> firstName: ${firstName}`);
			return firstName;
		} else {
			console.log(`[Admin Lookup] No admin user found for experience: ${experienceId}`);
			return null;
		}
	} catch (error) {
		console.error(`[Admin Lookup] Error looking up admin user for experience ${experienceId}:`, error);
		return null;
	}
}

/**
 * Look up company name by experience ID
 * Returns the experience name (company name) if found, null otherwise
 */
async function lookupCompanyName(experienceId: string): Promise<string | null> {
	try {
		console.log(`[Company Lookup] Looking up experience name for experience: ${experienceId}`);
		
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: { name: true }
		});

		if (experience?.name) {
			console.log(`[Company Lookup] Found experience name: ${experience.name}`);
			return experience.name;
		} else {
			console.log(`[Company Lookup] No experience name found for experience: ${experienceId}`);
			return null;
		}
	} catch (error) {
		console.error(`[Company Lookup] Error looking up experience name for experience ${experienceId}:`, error);
		return null;
	}
}

/**
 * Resolve placeholders in funnel flow
 * Handles [WHOP_OWNER] and [WHOP] placeholders in all block messages
 */
async function resolveFunnelFlowPlaceholders(flow: FunnelFlow, experienceId: string): Promise<FunnelFlow> {
	console.log(`[Funnel Resolution] Starting placeholder resolution for experience: ${experienceId}`);
	
	// Get admin name and company name once
	const adminName = await lookupAdminUser(experienceId);
	const companyName = await lookupCompanyName(experienceId);
	
	console.log(`[Funnel Resolution] Admin name: ${adminName}, Company name: ${companyName}`);
	
	// Create a deep copy of the flow to avoid mutating the original
	const resolvedFlow: FunnelFlow = JSON.parse(JSON.stringify(flow));
	
	// Resolve placeholders in all block messages
	Object.keys(resolvedFlow.blocks).forEach(blockId => {
		const block = resolvedFlow.blocks[blockId];
		let resolvedMessage = block.message;
		
		// Resolve [WHOP_OWNER] placeholder
		if (resolvedMessage.includes('[WHOP_OWNER]')) {
			if (adminName) {
				resolvedMessage = resolvedMessage.replace(/\[WHOP_OWNER\]/g, adminName);
				console.log(`[Funnel Resolution] Replaced [WHOP_OWNER] with: ${adminName} in block ${blockId}`);
			} else {
				console.log(`[Funnel Resolution] Admin user not found, keeping [WHOP_OWNER] placeholder in block ${blockId}`);
			}
		}
		
		// Resolve [WHOP] placeholder
		if (resolvedMessage.includes('[WHOP]')) {
			if (companyName) {
				resolvedMessage = resolvedMessage.replace(/\[WHOP\]/g, companyName);
				console.log(`[Funnel Resolution] Replaced [WHOP] with: ${companyName} in block ${blockId}`);
			} else {
				console.log(`[Funnel Resolution] Company name not found, keeping [WHOP] placeholder in block ${blockId}`);
			}
		}
		
		// Update the block with resolved message
		block.message = resolvedMessage;
	});
	
	console.log(`[Funnel Resolution] Completed placeholder resolution`);
	return resolvedFlow;
}

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
		// Force refresh to get latest credit data
		const userContext = await getUserContext(
			context.user.userId,
			"",
			finalExperienceId,
			true, // force refresh to bypass cache
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
			productApps: resource.productApps || undefined, // Include productApps field
		}));

		// Generate the funnel flow using AI
		const generatedFlow = await generateFunnelFlow(convertedResources);

		// Resolve placeholders in the generated flow
		const resolvedFlow = await resolveFunnelFlowPlaceholders(generatedFlow, userContext.user.experience.id);

		// Save the resolved flow directly to the database
		const [updatedFunnel] = await db
			.update(funnels)
			.set({
				flow: resolvedFlow,
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
			resolvedFlow,
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
