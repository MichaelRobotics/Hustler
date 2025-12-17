import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import { plans, resources, experiences } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
import type { Plan } from "../types/plan";

/**
 * Get plans for a specific Whop product
 */
export async function getPlansForProduct(
	whopProductId: string,
	experienceId: string,
): Promise<Plan[]> {
	try {
		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		if (experienceId && experienceId.startsWith('exp_')) {
			// This is a Whop experience ID, need to resolve to database UUID
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
				},
			});
			
			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				console.warn(`⚠️ No experience found for Whop experience ID: ${experienceId}`);
				return [];
			}
		}

		// First get resources for this product and experience
		const resourcesForProduct = await db.query.resources.findMany({
			where: and(
				eq(resources.whopProductId, whopProductId),
				eq(resources.experienceId, resolvedExperienceId),
			),
			columns: {
				id: true,
			},
		});

		if (resourcesForProduct.length === 0) {
			return [];
		}

		const resourceIds = resourcesForProduct.map((r: { id: string }) => r.id);

		// Get plans for these resources
		const plansList = await db.query.plans.findMany({
			where: and(
				eq(plans.whopProductId, whopProductId),
				inArray(plans.resourceId, resourceIds),
			),
		});

		return plansList.map((plan: typeof plansList[0]) => ({
			id: plan.id,
			resourceId: plan.resourceId,
			whopProductId: plan.whopProductId,
			checkoutConfigurationId: plan.checkoutConfigurationId,
			planId: plan.planId,
			purchaseUrl: plan.purchaseUrl || undefined,
			initialPrice: plan.initialPrice || undefined,
			renewalPrice: plan.renewalPrice || undefined,
			currency: plan.currency || undefined,
			planType: plan.planType || undefined,
			createdAt: plan.createdAt,
			updatedAt: plan.updatedAt,
		}));
	} catch (error) {
		console.error("Error fetching plans for product:", error);
		throw error;
	}
}

/**
 * Get plans for a specific checkout configuration
 */
export async function getPlansForCheckoutConfiguration(
	checkoutConfigurationId: string,
	experienceId: string,
): Promise<Plan[]> {
	try {
		// First get resources for this checkout configuration and experience
		const resourcesForCheckout = await db.query.resources.findMany({
			where: and(
				eq(resources.checkoutConfigurationId, checkoutConfigurationId),
				eq(resources.experienceId, experienceId),
			),
			columns: {
				id: true,
			},
		});

		if (resourcesForCheckout.length === 0) {
			return [];
		}

		const resourceIds = resourcesForCheckout.map((r: { id: string }) => r.id);

		// Get plans for these resources
		const plansList = await db.query.plans.findMany({
			where: and(
				eq(plans.checkoutConfigurationId, checkoutConfigurationId),
				inArray(plans.resourceId, resourceIds),
			),
		});

		return plansList.map((plan: typeof plansList[0]) => ({
			id: plan.id,
			resourceId: plan.resourceId,
			whopProductId: plan.whopProductId,
			checkoutConfigurationId: plan.checkoutConfigurationId,
			planId: plan.planId,
			purchaseUrl: plan.purchaseUrl || undefined,
			initialPrice: plan.initialPrice || undefined,
			renewalPrice: plan.renewalPrice || undefined,
			currency: plan.currency || undefined,
			planType: plan.planType || undefined,
			createdAt: plan.createdAt,
			updatedAt: plan.updatedAt,
		}));
	} catch (error) {
		console.error("Error fetching plans for checkout configuration:", error);
		throw error;
	}
}

/**
 * Fetch plans from Whop API for a specific product
 * Private helper to consolidate plan querying logic
 */
async function fetchPlansFromWhopAPI(
	companyId: string,
	whopProductId: string,
): Promise<Array<{
	id: string;
	price: number;
	currency: string;
	plan_type?: string;
	initial_price?: number;
	renewal_price?: number;
	purchase_url?: string;
}>> {
	const WhopClient = (await import('@whop/sdk')).default;
	const client = new WhopClient({
		appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
		apiKey: process.env.WHOP_API_KEY!,
	});

	const allPlans: any[] = [];
	for await (const planListResponse of client.plans.list({ 
		company_id: companyId 
	})) {
		allPlans.push(planListResponse);
	}

	// Filter plans for this specific product and map to expected format
	const filteredPlans = allPlans.filter((plan: any) => plan.product?.id === whopProductId);
	
	return filteredPlans.map((plan: any) => {
		// Extract purchase_url - it's available in the API response
		const purchaseUrl = plan.purchase_url || 
			plan.payment_link_url || 
			plan.checkout_url || 
			plan.url ||
			(plan.payment_link?.url) ||
			null;
		
		// Log if purchase_url is missing for debugging
		if (!purchaseUrl) {
			console.log(`[PLAN-SYNC] ⚠️ No purchase_url found for plan ${plan.id}. Available URL fields:`, 
				Object.keys(plan).filter(k => k.toLowerCase().includes('url') || k.toLowerCase().includes('link')));
		}
		
		return {
			id: plan.id,
			price: plan.initial_price || plan.renewal_price || 0,
			currency: plan.currency || 'usd',
			plan_type: plan.plan_type,
			initial_price: plan.initial_price,
			renewal_price: plan.renewal_price,
			purchase_url: purchaseUrl,
		};
	});
}

/**
 * Check if plans exist for a product/resource, sync if missing
 * Consolidated helper to eliminate duplicate plan checking logic
 */
export async function ensurePlansExistForProduct(
	whopProductId: string,
	resourceId: string,
	experienceId: string,
	productPlans?: Array<{
		id: string;
		price: number;
		currency: string;
		title?: string;
		plan_type?: string;
		initial_price?: number;
		renewal_price?: number;
		billing_period?: number | null;
		purchase_url?: string;
	}>,
): Promise<{ synced: boolean; planCount: number }> {
	// Check if plans exist
	const existingPlans = await db.query.plans.findMany({
		where: and(
			eq(plans.whopProductId, whopProductId),
			eq(plans.resourceId, resourceId),
		),
		columns: { id: true },
	});

	if (existingPlans.length > 0) {
		return { synced: false, planCount: existingPlans.length };
	}

	// Plans missing - sync them
	await upsertPlansForProduct(whopProductId, resourceId, experienceId, productPlans);
	
	// Get count after sync
	const syncedPlans = await db.query.plans.findMany({
		where: and(
			eq(plans.whopProductId, whopProductId),
			eq(plans.resourceId, resourceId),
		),
		columns: { id: true },
	});

	return { synced: true, planCount: syncedPlans.length };
}

/**
 * Unified function to upsert plans for a product
 * Uses Drizzle ORM's onConflictDoUpdate for atomic upserts
 * Handles both cases: with product data or fetching from API
 */
export async function upsertPlansForProduct(
	whopProductId: string,
	resourceId: string,
	experienceId: string,
	productPlans?: Array<{
		id: string;
		price: number;
		currency: string;
		title?: string;
		plan_type?: string;
		initial_price?: number;
		renewal_price?: number;
		billing_period?: number | null;
		purchase_url?: string;
	}>,
): Promise<void> {
	try {
		console.log(`[PLAN-SYNC] Starting upsertPlansForProduct for product ${whopProductId}, resourceId: ${resourceId}, experienceId: ${experienceId}`);
		
		let plansToSync: Array<{
			id: string;
			price: number;
			currency: string;
			plan_type?: string;
			initial_price?: number;
			renewal_price?: number;
			purchase_url?: string;
		}>;

		// Get whopCompanyId from experience (needed for both paths)
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: {
				whopCompanyId: true,
			},
		});

		if (!experience?.whopCompanyId) {
			console.error(`[PLAN-SYNC] No company ID found for experience ${experienceId}`);
			throw new Error(`Experience ${experienceId} not found or has no company ID`);
		}

		const whopCompanyId = experience.whopCompanyId;

		// If productPlans provided, use it; otherwise fetch from API
		if (productPlans && productPlans.length > 0) {
			console.log(`[PLAN-SYNC] Using provided product plans data (${productPlans.length} plans)`);
			plansToSync = productPlans;
		} else {
			console.log(`[PLAN-SYNC] No product plans provided, fetching from API...`);
			// Fetch plans from Whop API using shared helper
			plansToSync = await fetchPlansFromWhopAPI(whopCompanyId, whopProductId);
			console.log(`[PLAN-SYNC] Fetched ${plansToSync.length} plans from API for product ${whopProductId}, ${plansToSync.filter(p => p.purchase_url).length} with purchase_url`);
		}

		if (plansToSync.length === 0) {
			console.log(`[PLAN-SYNC] No plans to sync for product ${whopProductId}`);
			return;
		}

		// Get existing plans for this resource to determine which ones to delete
		const existingPlans = await db.query.plans.findMany({
			where: and(
				eq(plans.whopProductId, whopProductId),
				eq(plans.resourceId, resourceId),
			),
		});

		const planIdsToSync = new Set(plansToSync.map((p) => p.id));

		// Delete plans that no longer exist in product
		const plansToDelete = existingPlans.filter(
			(plan: typeof existingPlans[0]) => !planIdsToSync.has(plan.planId),
		);

		for (const planToDelete of plansToDelete) {
			await db.delete(plans).where(eq(plans.id, planToDelete.id));
			console.log(`[PLAN-SYNC] Deleted plan ${planToDelete.planId} (no longer in product)`);
		}

		// Upsert plans using Drizzle's onConflictDoUpdate
		for (const productPlan of plansToSync) {
			// Extract price data - prefer explicit initial_price/renewal_price if available
			const initialPrice = productPlan.initial_price ?? (productPlan.plan_type === 'renewal' ? undefined : productPlan.price);
			const renewalPrice = productPlan.renewal_price ?? (productPlan.plan_type === 'renewal' ? productPlan.price : undefined);

			const planData = {
				resourceId: resourceId,
				whopProductId: whopProductId,
				checkoutConfigurationId: null,
				planId: productPlan.id,
				whopCompanyId: whopCompanyId,
				purchaseUrl: productPlan.purchase_url || null,
				initialPrice: initialPrice?.toString() || null,
				renewalPrice: renewalPrice?.toString() || null,
				currency: productPlan.currency || null,
				planType: productPlan.plan_type || null,
				updatedAt: new Date(),
			};

			console.log(`[PLAN-SYNC] Upserting plan ${productPlan.id} for product ${whopProductId}`);
			
			// Use Drizzle's onConflictDoUpdate for atomic upsert
			await db.insert(plans)
				.values(planData)
				.onConflictDoUpdate({
					target: plans.planId,
					set: {
						resourceId: sql`excluded.resource_id`,
						whopProductId: sql`excluded.whop_product_id`,
						checkoutConfigurationId: sql`excluded.checkout_configuration_id`,
						whopCompanyId: sql`excluded.whop_company_id`,
						purchaseUrl: sql`excluded.purchase_url`,
						initialPrice: sql`excluded.initial_price`,
						renewalPrice: sql`excluded.renewal_price`,
						currency: sql`excluded.currency`,
						planType: sql`excluded.plan_type`,
						updatedAt: sql`excluded.updated_at`,
					},
				});
		}

		console.log(`[PLAN-SYNC] Completed upserting ${plansToSync.length} plans for product ${whopProductId}`);
	} catch (error) {
		console.error("Error upserting plans for product:", error);
		throw error;
	}
}

/**
 * Sync plans for a specific product from Whop API
 * @deprecated Use upsertPlansForProduct instead
 */
export async function syncPlansForProduct(
	whopProductId: string,
	experienceId: string,
): Promise<void> {
	try {
		// Get company ID from experience (experienceId is database UUID)
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: {
				whopCompanyId: true,
			},
		});

		if (!experience?.whopCompanyId) {
			console.error(`[PLAN-SYNC] No company ID found for experience ${experienceId}`);
			throw new Error(`Experience ${experienceId} not found or has no company ID`);
		}

		// Fetch plans from Whop API using shared helper
		console.log(`[PLAN-SYNC] Fetching plans for company ${experience.whopCompanyId}, filtering for product ${whopProductId}`);
		
		const filteredPlans = await fetchPlansFromWhopAPI(experience.whopCompanyId, whopProductId);
		console.log(`[PLAN-SYNC] Fetched ${filteredPlans.length} plans from API for product ${whopProductId}`);

		const whopPlans = {
			data: filteredPlans
		};

		// Get existing plans for this product in our database
		const existingPlans = await db.query.plans.findMany({
			where: eq(plans.whopProductId, whopProductId),
			with: {
				resource: {
					columns: {
						experienceId: true,
					},
				},
			},
		});

		const existingPlansForExperience = existingPlans.filter(
			(plan: typeof existingPlans[0]) => plan.resource?.experienceId === experienceId,
		);

		const whopPlanIds = new Set(whopPlans.data.map((p: typeof whopPlans.data[0]) => p.id));

		// Delete plans that no longer exist in Whop
		const plansToDelete = existingPlansForExperience.filter(
			(plan: typeof existingPlansForExperience[0]) => !whopPlanIds.has(plan.planId),
		);

		for (const planToDelete of plansToDelete) {
			await db.delete(plans).where(eq(plans.id, planToDelete.id));
		}

		// Find resource for this product in this experience
		const resource = await db.query.resources.findFirst({
			where: and(
				eq(resources.whopProductId, whopProductId),
				eq(resources.experienceId, experienceId),
			),
		});

		if (!resource) {
			console.log(`[PLAN-SYNC] No resource found for product ${whopProductId}, skipping plan sync`);
			return;
		}

		// Use unified upsert function (fetchPlansFromWhopAPI already returns the correct format)
		await upsertPlansForProduct(whopProductId, resource.id, experienceId, whopPlans.data);
	} catch (error) {
		console.error("Error syncing plans for product:", error);
		throw error;
	}
}

/**
 * Sync plans from product data (optimized - no API call needed)
 * Uses plan data already available in the product object
 * @deprecated Use upsertPlansForProduct instead
 */
export async function syncPlansFromProductData(
	productPlans: Array<{
		id: string;
		price: number;
		currency: string;
		title?: string;
		plan_type?: string;
		initial_price?: number;
		renewal_price?: number;
		billing_period?: number | null;
		purchase_url?: string;
	}>,
	whopProductId: string,
	resourceId: string,
	experienceId: string,
): Promise<void> {
	// Delegate to unified function
	await upsertPlansForProduct(whopProductId, resourceId, experienceId, productPlans);
}

/**
 * Check and sync missing plans for all resources with products in an experience
 * This ensures that if a resource has a product but no plans, plans are synced
 */
export async function checkAndSyncMissingPlansForExperience(
	experienceId: string,
): Promise<{ synced: number; errors: number }> {
	try {
		console.log(`[PLAN-SYNC] Checking for missing plans in experience ${experienceId}`);

		// Get all resources with products (prod_*) in this experience
		const resourcesWithProducts = await db.query.resources.findMany({
			where: and(
				eq(resources.experienceId, experienceId),
				isNotNull(resources.whopProductId),
			),
			columns: {
				id: true,
				whopProductId: true,
			},
		});

		// Filter to only products (starting with "prod_")
		const productResources = resourcesWithProducts.filter(
			(r: typeof resourcesWithProducts[0]) => r.whopProductId?.startsWith("prod_") ?? false,
		);

		console.log(`[PLAN-SYNC] Found ${productResources.length} resources with products`);

		let synced = 0;
		let errors = 0;

		// Check each resource for missing plans
		for (const resource of productResources) {
			if (!resource.whopProductId) continue;

			try {
				// Use consolidated helper to check and sync plans
				const result = await ensurePlansExistForProduct(
					resource.whopProductId,
					resource.id,
					experienceId,
				);
				
				if (result.synced) {
					console.log(`[PLAN-SYNC] Synced ${result.planCount} plans for resource ${resource.id} (product ${resource.whopProductId})`);
					synced++;
				}
			} catch (error) {
				console.error(
					`[PLAN-SYNC] Error checking/syncing plans for resource ${resource.id}:`,
					error,
				);
				errors++;
			}
		}

		console.log(`[PLAN-SYNC] Completed check: ${synced} products synced, ${errors} errors`);
		return { synced, errors };
	} catch (error) {
		console.error("Error checking for missing plans:", error);
		throw error;
	}
}

/**
 * Create plan record from checkout configuration response
 * Uses upsert to handle cases where plan might already exist
 */
export async function createPlanFromCheckoutConfiguration(
	checkoutConfigData: any,
	resourceId: string,
): Promise<Plan> {
	try {
		// Get whopCompanyId from resource's experience
		const resource = await db.query.resources.findFirst({
			where: eq(resources.id, resourceId),
			columns: {
				experienceId: true,
			},
		});

		if (!resource?.experienceId) {
			throw new Error(`Resource ${resourceId} not found or has no experience ID`);
		}

		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, resource.experienceId),
			columns: {
				whopCompanyId: true,
			},
		});

		if (!experience?.whopCompanyId) {
			throw new Error(`Experience ${resource.experienceId} not found or has no company ID`);
		}

		const planData = checkoutConfigData.plan;

		const planValues = {
			resourceId: resourceId,
			whopProductId: null,
			checkoutConfigurationId: checkoutConfigData.id,
			planId: planData.id,
			whopCompanyId: experience.whopCompanyId,
			purchaseUrl: checkoutConfigData.purchase_url || null,
			initialPrice: planData.initial_price?.toString() || null,
			renewalPrice: planData.renewal_price?.toString() || null,
			currency: planData.currency || null,
			planType: planData.plan_type || null,
			updatedAt: new Date(),
		};

		// Use upsert to handle conflicts (plan might already exist from previous sync)
		const [newPlan] = await db
			.insert(plans)
			.values(planValues)
			.onConflictDoUpdate({
				target: plans.planId,
				set: {
					resourceId: sql`excluded.resource_id`,
					whopProductId: sql`excluded.whop_product_id`,
					checkoutConfigurationId: sql`excluded.checkout_configuration_id`,
					whopCompanyId: sql`excluded.whop_company_id`,
					purchaseUrl: sql`excluded.purchase_url`,
					initialPrice: sql`excluded.initial_price`,
					renewalPrice: sql`excluded.renewal_price`,
					currency: sql`excluded.currency`,
					planType: sql`excluded.plan_type`,
					updatedAt: sql`excluded.updated_at`,
				},
			})
			.returning();

		return {
			id: newPlan.id,
			resourceId: newPlan.resourceId,
			whopProductId: newPlan.whopProductId,
			checkoutConfigurationId: newPlan.checkoutConfigurationId,
			planId: newPlan.planId,
			purchaseUrl: newPlan.purchaseUrl || undefined,
			initialPrice: newPlan.initialPrice || undefined,
			renewalPrice: newPlan.renewalPrice || undefined,
			currency: newPlan.currency || undefined,
			planType: newPlan.planType || undefined,
			createdAt: newPlan.createdAt,
			updatedAt: newPlan.updatedAt,
		};
	} catch (error) {
		console.error("Error creating plan from checkout configuration:", error);
		throw error;
	}
}





