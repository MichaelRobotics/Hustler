import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, resources } from "../../../../lib/supabase/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
	type AuthContext,
	createErrorResponse,
	withWhopAuth,
} from "../../../../lib/middleware/whop-auth";

/**
 * POST /api/resources/reorder - Bulk update resource display order
 * Accepts array of { id: string, displayOrder: number } and updates all resources in a transaction
 */
async function reorderResourcesHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;

		if (!user.experienceId) {
			return createErrorResponse("MISSING_EXPERIENCE_ID", "Experience ID is required", 400);
		}

		// Convert Whop experience ID to internal experience UUID
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, user.experienceId),
		});

		if (!experience) {
			return createErrorResponse(
				"EXPERIENCE_NOT_FOUND",
				"Experience not found",
				404,
			);
		}

		const internalExperienceId = experience.id;

		const body = await request.json();
		const { resources: resourceUpdates } = body;

		if (!Array.isArray(resourceUpdates)) {
			return createErrorResponse(
				"INVALID_REQUEST",
				"Invalid request body. Expected array of { id: string, displayOrder: number }",
				400,
			);
		}

		// Validate all updates have required fields
		for (const update of resourceUpdates) {
			if (!update.id || typeof update.displayOrder !== "number") {
				return createErrorResponse(
					"INVALID_UPDATE",
					"Each resource update must have 'id' (string) and 'displayOrder' (number)",
					400,
				);
			}
		}

		// Get all resource IDs to verify they belong to this experience
		const resourceIds = resourceUpdates.map((u) => u.id);

		if (resourceIds.length === 0) {
			return createErrorResponse(
				"EMPTY_RESOURCE_LIST",
				"No resources provided for reordering",
				400,
			);
		}

		// Verify all resources belong to this experience - only query the specific resources we're updating
		let existingResources;
		try {
			existingResources = await db
				.select()
				.from(resources)
				.where(
					and(
						eq(resources.experienceId, internalExperienceId),
						inArray(resources.id, resourceIds),
					),
				);
		} catch (dbError: any) {
			console.error("Database query error:", dbError);
			return createErrorResponse(
				"QUERY_FAILED",
				`Database query failed: ${dbError.message || "Unknown error"}`,
				500,
			);
		}

		const existingResourceIds = new Set(existingResources.map((r: typeof existingResources[0]) => r.id));
		const invalidIds = resourceIds.filter((id) => !existingResourceIds.has(id));

		if (invalidIds.length > 0) {
			return createErrorResponse(
				"RESOURCE_NOT_FOUND",
				`Resources not found or access denied: ${invalidIds.join(", ")}`,
				403,
			);
		}

		// Update all resources in parallel
		const updatePromises = resourceUpdates.map((update) =>
			db
				.update(resources)
				.set({
					displayOrder: update.displayOrder,
					updatedAt: new Date(),
				})
				.where(eq(resources.id, update.id)),
		);

		try {
			await Promise.all(updatePromises);
		} catch (updateError: any) {
			console.error("Database update error:", updateError);
			return createErrorResponse(
				"UPDATE_FAILED",
				`Failed to update resource order: ${updateError.message || "Unknown error"}`,
				500,
			);
		}

		return NextResponse.json({
			success: true,
			message: `Updated display order for ${resourceUpdates.length} resources`,
		});
	} catch (error: any) {
		console.error("Error reordering resources:", error);
		return createErrorResponse(
			"REORDER_FAILED",
			error.message || "Failed to reorder resources",
			500,
		);
	}
}

export const POST = withWhopAuth(reorderResourcesHandler);


