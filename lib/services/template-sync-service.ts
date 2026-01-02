/**
 * Template Sync Service
 * 
 * Updates templates with aggregated review data, sold counts, and promo stock numbers
 */

import { db } from "@/lib/supabase/db-server";
import { templates, resources, promos, reviews, experiences } from "@/lib/supabase/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { calculateAverageRating } from "./reviews-sync-service";
import type { StoreTemplate } from "@/lib/components/store/SeasonalStore/types";

/**
 * Update all templates with product data (reviews, sold count, promo stock)
 */
export async function updateTemplatesWithProductData(
	experienceId: string
): Promise<{ updated: number; errors: string[] }> {
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

		// Fetch all resources with whopProductId OR planId for this experience
		const resourcesWithProducts = await db.query.resources.findMany({
			where: and(
				eq(resources.experienceId, resolvedExperienceId),
				sql`(${resources.whopProductId} IS NOT NULL OR ${resources.planId} IS NOT NULL)`
			),
			columns: {
				id: true,
				whopProductId: true,
				planId: true,
				sold: true,
			},
		});

		if (resourcesWithProducts.length === 0) {
			console.log(`[TEMPLATE-SYNC] No resources with whopProductId or planId found for experience ${experienceId}`);
			return { updated: 0, errors: [] };
		}

		// Fetch all templates for this experience
		const allTemplates = await db.query.templates.findMany({
			where: eq(templates.experienceId, resolvedExperienceId),
			columns: {
				id: true,
				name: true,
				templateData: true,
			},
		});

		if (allTemplates.length === 0) {
			console.log(`[TEMPLATE-SYNC] No templates found for experience ${experienceId}`);
			return { updated: 0, errors: [] };
		}

		// Build a map of whopProductId/planId -> product data (reviews, sold, promo stock)
		type ProductData = {
			starRating: number;
			reviewCount: number;
			sold: number | null;
			promoStock: number | null;
		};
		const productDataMap = new Map<string, ProductData>();

		for (const resource of resourcesWithProducts) {
			// Skip if neither whopProductId nor planId exists
			if (!resource.whopProductId && !resource.planId) continue;

			try {
				// Calculate average rating and review count
				// For product-based: use whopProductId
				// For plan-only: use planId
				const { averageStars, reviewCount } = await calculateAverageRating(
					resource.whopProductId || null,
					resolvedExperienceId,
					resource.planId || null
				);

				// Get promo stock for this product (only if whopProductId exists - promos are product-based)
				let promoStock: number | null = null;
				if (resource.whopProductId) {
					try {
						const productPromo = await db.query.promos.findFirst({
							where: and(
								eq(promos.productId, resource.whopProductId),
								sql`${promos.stock} IS NOT NULL`
							),
							columns: {
								stock: true,
								unlimitedStock: true,
							},
							orderBy: [desc(promos.updatedAt)],
						});

						if (productPromo && !productPromo.unlimitedStock) {
							promoStock = productPromo.stock;
						}
					} catch (promoError) {
						console.warn(`[TEMPLATE-SYNC] Error fetching promo stock for product ${resource.whopProductId}:`, promoError);
					}
				}

				// Use whopProductId as key if available, otherwise use planId
				const key = resource.whopProductId || resource.planId;
				if (key) {
					productDataMap.set(key, {
						starRating: averageStars,
						reviewCount: reviewCount,
						sold: resource.sold,
						promoStock: promoStock,
					});
				}
			} catch (error) {
				console.error(`[TEMPLATE-SYNC] Error processing resource ${resource.id}:`, error);
			}
		}

		let updatedCount = 0;
		const errors: string[] = [];

		// Update each template
		for (const template of allTemplates) {
			try {
				const templateData = template.templateData as StoreTemplate['templateData'];
				let hasChanges = false;

				// Helper function to update a product array
				const updateProducts = (products: any[]): any[] => {
					return products.map((product) => {
						// Try to match product by whopProductId or by extracting resource ID from product.id
						let matchedProductData: ProductData | null = null;

						if (product.whopProductId) {
							matchedProductData = productDataMap.get(product.whopProductId) || null;
						} else if (product.id && typeof product.id === 'string' && product.id.startsWith('resource-')) {
							// Extract resource UUID from "resource-{uuid}" format
							const resourceId = product.id.replace('resource-', '');
							const resource = resourcesWithProducts.find((r: { id: string; whopProductId: string | null; planId: string | null }) => r.id === resourceId);
							if (resource) {
								// Try whopProductId first, then planId
								const key = resource.whopProductId || resource.planId;
								if (key) {
									matchedProductData = productDataMap.get(key) || null;
								}
							}
						}

						if (matchedProductData) {
							const updatedProduct = { ...product };
							let productChanged = false;

							// Update star rating and review count
							if (updatedProduct.starRating !== matchedProductData.starRating) {
								updatedProduct.starRating = matchedProductData.starRating;
								productChanged = true;
							}
							if (updatedProduct.reviewCount !== matchedProductData.reviewCount) {
								updatedProduct.reviewCount = matchedProductData.reviewCount;
								productChanged = true;
							}
							// Update showRatingInfo
							const shouldShowRating = matchedProductData.reviewCount > 0;
							if (updatedProduct.showRatingInfo !== shouldShowRating) {
								updatedProduct.showRatingInfo = shouldShowRating;
								productChanged = true;
							}

							// Update sold count
							if (updatedProduct.salesCount !== matchedProductData.sold) {
								updatedProduct.salesCount = matchedProductData.sold;
								productChanged = true;
							}
							// Update showSalesCount
							const shouldShowSales = (matchedProductData.sold || 0) > 0;
							if (updatedProduct.showSalesCount !== shouldShowSales) {
								updatedProduct.showSalesCount = shouldShowSales;
								productChanged = true;
							}

							// Update promo stock (promoQuantityLeft)
							if (updatedProduct.promoQuantityLeft !== matchedProductData.promoStock) {
								updatedProduct.promoQuantityLeft = matchedProductData.promoStock;
								productChanged = true;
							}

							if (productChanged) {
								hasChanges = true;
								return updatedProduct;
							}
						}

						return product;
					});
				};

				// Update flat products array
				if (templateData.products && Array.isArray(templateData.products)) {
					templateData.products = updateProducts(templateData.products);
				}

				// Update themeProducts (nested structure)
				if (templateData.themeProducts && typeof templateData.themeProducts === 'object') {
					for (const season in templateData.themeProducts) {
						if (Array.isArray(templateData.themeProducts[season])) {
							templateData.themeProducts[season] = updateProducts(templateData.themeProducts[season]);
						}
					}
				}

				// Save template if changes were made
				if (hasChanges) {
					await db
						.update(templates)
						.set({
							templateData: templateData,
							updatedAt: new Date(),
						})
						.where(eq(templates.id, template.id));

					updatedCount++;
					console.log(`[TEMPLATE-SYNC] Updated template ${template.name} (${template.id})`);
				}
			} catch (error) {
				const errorMsg = `Failed to update template ${template.name}: ${error instanceof Error ? error.message : String(error)}`;
				console.error(`[TEMPLATE-SYNC] ${errorMsg}`);
				errors.push(errorMsg);
			}
		}

		console.log(`[TEMPLATE-SYNC] Updated ${updatedCount} templates for experience ${experienceId}`);
		return { updated: updatedCount, errors };
	} catch (error) {
		console.error(`[TEMPLATE-SYNC] Error updating templates for experience ${experienceId}:`, error);
		throw error;
	}
}

