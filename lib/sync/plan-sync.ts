/**
 * Plan Syncing Logic
 * 
 * Handles syncing plans from Whop API for products that have resources
 */

import { syncPlansForProduct } from "../actions/plan-actions";
import { db } from "../supabase/db-server";
import { resources } from "../supabase/schema";
import { eq, and } from "drizzle-orm";

/**
 * Sync plans for all products that have resources in the given experience
 */
export async function syncPlansForExperience(
	experienceId: string,
): Promise<void> {
	try {
		// Get all resources with whopProductId (not null)
		const resourcesWithProducts = await db.query.resources.findMany({
			where: eq(resources.experienceId, experienceId),
			columns: {
				whopProductId: true,
			},
		});

		// Filter to only products (starting with "prod_")
		const productIds: string[] = resourcesWithProducts
			.map((r: { whopProductId: string | null }) => r.whopProductId)
			.filter((id: string | null): id is string => id !== null && id.startsWith("prod_"));

		// Get unique product IDs
		const uniqueProductIds: string[] = [...new Set(productIds)];

		// Sync plans for each product
		for (const productId of uniqueProductIds) {
			try {
				await syncPlansForProduct(productId, experienceId);
			} catch (error) {
				console.error(
					`Error syncing plans for product ${productId}:`,
					error,
				);
				// Continue with other products even if one fails
			}
		}
	} catch (error) {
		console.error("Error syncing plans for experience:", error);
		throw error;
	}
}

/**
 * Sync plans for a specific product (wrapper for plan-actions)
 */
export { syncPlansForProduct } from "../actions/plan-actions";





