/**
 * Reviews Sync Service
 * 
 * Handles syncing reviews from Whop API and calculating aggregated statistics
 */

import { db } from "@/lib/supabase/db-server";
import { reviews, resources, experiences } from "@/lib/supabase/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Sync reviews for a specific product from Whop API
 * For plan-only resources (no whopProductId), this function should not be called
 * as reviews are only stored in DB, not synced from Whop API
 */
export async function syncReviewsForProduct(
	experienceId: string,
	whopProductId: string,
	resourceId?: string
): Promise<number> {
	try {
		// Skip if whopProductId is not provided (plan-only resources)
		if (!whopProductId) {
			console.log(`[REVIEWS-SYNC] Skipping Whop API sync - no whopProductId provided (plan-only resource)`);
			return 0;
		}

		// Resolve experience ID if it's a Whop experience ID
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: { id: true },
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		}

		// If resourceId not provided, try to find it by whopProductId
		if (!resourceId) {
			const resource = await db.query.resources.findFirst({
				where: and(
					eq(resources.whopProductId, whopProductId),
					eq(resources.experienceId, resolvedExperienceId)
				),
				columns: { id: true },
			});
			resourceId = resource?.id;
		}

		// Import Whop SDK client
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
			appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
		});

		// Access reviews from client
		const reviewsClient = (client as any).reviews;
		if (!reviewsClient) {
			throw new Error('reviews is not available on Whop SDK client');
		}

		let syncedCount = 0;

		// List all reviews for this product from Whop API
		try {
			for await (const reviewListResponse of reviewsClient.list({
				product_id: whopProductId,
			})) {
				if (reviewListResponse.data && Array.isArray(reviewListResponse.data)) {
					for (const review of reviewListResponse.data) {
						try {
							// Map Whop API response to reviews table schema
							const reviewData = {
								experienceId: resolvedExperienceId,
								resourceId: resourceId || null,
								whopProductId: whopProductId,
								whopReviewId: review.id,
								title: review.title || null,
								description: review.description || null,
								stars: review.stars || 0,
								status: (review.status || 'pending') as 'pending' | 'published' | 'removed',
								paidForProduct: review.paid_for_product ?? null,
								userId: review.user?.id || '',
								userName: review.user?.name || null,
								userUsername: review.user?.username || null,
								publishedAt: review.published_at ? new Date(review.published_at) : null,
								joinedAt: review.joined_at ? new Date(review.joined_at) : null,
							};

							// Upsert to reviews table
							await db
								.insert(reviews)
								.values(reviewData)
								.onConflictDoUpdate({
									target: reviews.whopReviewId,
									set: {
										title: sql`excluded.title`,
										description: sql`excluded.description`,
										stars: sql`excluded.stars`,
										status: sql`excluded.status`,
										paidForProduct: sql`excluded.paid_for_product`,
										userName: sql`excluded.user_name`,
										userUsername: sql`excluded.user_username`,
										publishedAt: sql`excluded.published_at`,
										joinedAt: sql`excluded.joined_at`,
										updatedAt: sql`now()`,
									},
								});

							syncedCount++;
						} catch (error) {
							console.warn(`⚠️ Failed to sync review ${review.id}:`, error instanceof Error ? error.message : String(error));
							// Continue with other reviews
						}
					}
				}
			}
		} catch (error) {
			console.error(`Error listing reviews for product ${whopProductId}:`, error instanceof Error ? error.message : String(error));
			// Continue even if API call fails
		}

		console.log(`✅ Synced ${syncedCount} reviews for product ${whopProductId}`);
		return syncedCount;
	} catch (error) {
		console.error(`Error syncing reviews for product ${whopProductId}:`, error instanceof Error ? error.message : String(error));
		throw error;
	}
}

/**
 * Calculate average star rating and total review count for a product or plan
 */
export async function calculateAverageRating(
	whopProductId: string | null | undefined,
	experienceId: string,
	planId?: string | null
): Promise<{ averageStars: number; reviewCount: number }> {
	try {
		// Resolve experience ID if it's a Whop experience ID
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: { id: true },
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		}

		// Build query conditions - either whopProductId OR planId (not both)
		let whereConditions;
		if (whopProductId) {
			whereConditions = and(
				eq(reviews.whopProductId, whopProductId),
				eq(reviews.experienceId, resolvedExperienceId),
				eq(reviews.status, 'published'),
				sql`${reviews.planId} IS NULL` // Ensure planId is null for product reviews
			);
		} else if (planId) {
			whereConditions = and(
				eq(reviews.planId, planId),
				eq(reviews.experienceId, resolvedExperienceId),
				eq(reviews.status, 'published'),
				sql`${reviews.whopProductId} IS NULL` // Ensure whopProductId is null for plan reviews
			);
		} else {
			// Neither provided - return empty
			return { averageStars: 0, reviewCount: 0 };
		}

		// Query reviews (only published reviews)
		const productReviews = await db.query.reviews.findMany({
			where: whereConditions,
			columns: {
				stars: true,
			},
		});

		if (productReviews.length === 0) {
			return { averageStars: 0, reviewCount: 0 };
		}

		const totalStars = productReviews.reduce((sum: number, review: { stars: number }) => sum + review.stars, 0);
		const averageStars = totalStars / productReviews.length;

		return {
			averageStars: Math.round(averageStars * 10) / 10, // Round to 1 decimal place
			reviewCount: productReviews.length,
		};
	} catch (error) {
		console.error(`Error calculating average rating:`, error instanceof Error ? error.message : String(error));
		return { averageStars: 0, reviewCount: 0 };
	}
}

