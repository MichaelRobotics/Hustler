import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { experiences, promos, resources, plans } from "../supabase/schema";
import type { DiscountSettings } from "../components/store/SeasonalStore/types";
import Whop from '@whop/sdk';

/**
 * Interface for seasonal discount data
 */
export interface SeasonalDiscountData {
	seasonalDiscountId?: string;
	seasonalDiscountPromo?: string;
	seasonalDiscountStart?: Date | string;
	seasonalDiscountEnd?: Date | string;
	seasonalDiscountText?: string;
	seasonalDiscountQuantityPerProduct?: number;
	seasonalDiscountDurationType?: 'one-time' | 'forever' | 'duration_months';
	seasonalDiscountDurationMonths?: number;
	globalDiscount?: boolean;
	isExpired?: boolean; // Flag to indicate if discount has expired
}

/**
 * Update experience record with seasonal discount data
 */
export async function updateExperienceSeasonalDiscount(
	experienceId: string,
	discountData: SeasonalDiscountData
): Promise<void> {
	try {
		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		}

		// Generate UUID for seasonalDiscountId if not provided
		const seasonalDiscountId = discountData.seasonalDiscountId || crypto.randomUUID();

		// Prepare update data
		const updateData: any = {
			seasonalDiscountId,
			updatedAt: new Date(),
		};

		if (discountData.seasonalDiscountPromo !== undefined) {
			updateData.seasonalDiscountPromo = discountData.seasonalDiscountPromo;
		}
		if (discountData.seasonalDiscountStart !== undefined) {
			updateData.seasonalDiscountStart = discountData.seasonalDiscountStart instanceof Date 
				? discountData.seasonalDiscountStart 
				: new Date(discountData.seasonalDiscountStart);
		}
		if (discountData.seasonalDiscountEnd !== undefined) {
			updateData.seasonalDiscountEnd = discountData.seasonalDiscountEnd instanceof Date 
				? discountData.seasonalDiscountEnd 
				: new Date(discountData.seasonalDiscountEnd);
		}
		if (discountData.seasonalDiscountText !== undefined) {
			updateData.seasonalDiscountText = discountData.seasonalDiscountText;
		}
		if (discountData.seasonalDiscountQuantityPerProduct !== undefined) {
			updateData.seasonalDiscountQuantityPerProduct = discountData.seasonalDiscountQuantityPerProduct;
		}
		if (discountData.seasonalDiscountDurationType !== undefined) {
			updateData.seasonalDiscountDurationType = discountData.seasonalDiscountDurationType;
		}
		if (discountData.seasonalDiscountDurationMonths !== undefined) {
			updateData.seasonalDiscountDurationMonths = discountData.seasonalDiscountDurationMonths;
		}
		if (discountData.globalDiscount !== undefined) {
			updateData.globalDiscount = discountData.globalDiscount;
		}

		// Update experience record
		await db
			.update(experiences)
			.set(updateData)
			.where(eq(experiences.id, resolvedExperienceId));

		console.log(`✅ Updated experience ${resolvedExperienceId} with seasonal discount data`);
	} catch (error) {
		console.error('Error updating experience seasonal discount:', error);
		throw error;
	}
}

/**
 * Sync promos from Whop API for resources in this experience
 */
export async function syncPromosFromWhopAPI(
	experienceId: string,
	companyId: string
): Promise<number> {
	try {
		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		}

		// Import Whop SDK client
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
		});

		// Access promoCodes from client
		const promoCodesClient = (client as any).promoCodes;
		if (!promoCodesClient) {
			throw new Error('promoCodes is not available on Whop SDK client');
		}

		let syncedCount = 0;

		// List ALL promos from Whop API for this company (no filters)
		try {
			for await (const promoListResponse of promoCodesClient.list({
				company_id: companyId,
				// No product_ids or plan_ids filters - sync all promos for the company
			})) {
				if (promoListResponse.data && Array.isArray(promoListResponse.data)) {
					for (const promo of promoListResponse.data) {
						try {
							// Before saving promo, check if any of its plan_ids exist in plans table
							if (promo.plan_ids && Array.isArray(promo.plan_ids) && promo.plan_ids.length > 0 && !promo.product?.id) {
								// Check if at least one plan exists in database
								const existingPlans = await db.query.plans.findMany({
									where: and(
										inArray(plans.planId, promo.plan_ids),
										eq(plans.whopCompanyId, companyId)
									),
									columns: {
										planId: true,
									},
									limit: 1,
								});

								if (existingPlans.length === 0) {
									console.log(`⚠️ Skipping promo ${promo.id} - no plans found in database for plan_ids:`, promo.plan_ids);
									continue; // Skip this promo
								}
							}

							// Map Whop API response to promos table schema
							const promoData = {
								whopCompanyId: companyId,
								whopPromoId: promo.id,
								code: promo.code || '',
								amountOff: promo.amount_off.toString(),
								baseCurrency: promo.currency || 'usd',
								companyId: companyId,
								newUsersOnly: promo.new_users_only || false,
								promoDurationMonths: promo.promo_duration_months || 0,
								promoType: promo.promo_type === 'percentage' ? 'percentage' : 'flat_amount',
								churnedUsersOnly: promo.churned_users_only || null,
								existingMembershipsOnly: promo.existing_memberships_only || null,
								expiresAt: promo.expires_at ? new Date(promo.expires_at) : null,
								onePerCustomer: promo.one_per_customer || null,
								// planIds: set to null if promo has product_id, otherwise use plan_ids from API
								planIds: promo.product?.id ? null : (promo.plan_ids && Array.isArray(promo.plan_ids) && promo.plan_ids.length > 0 ? JSON.stringify(promo.plan_ids) : null),
								productId: promo.product?.id || null,
								stock: promo.stock || null,
								unlimitedStock: promo.unlimited_stock || false,
							};

								// Upsert to promos table
								await db
									.insert(promos)
									.values(promoData)
									.onConflictDoUpdate({
										target: promos.whopPromoId,
										set: {
											whopCompanyId: sql`excluded.whop_company_id`,
											code: sql`excluded.code`,
											amountOff: sql`excluded.amount_off`,
											baseCurrency: sql`excluded.base_currency`,
											promoDurationMonths: sql`excluded.promo_duration_months`,
											promoType: sql`excluded.promo_type`,
											expiresAt: sql`excluded.expires_at`,
											stock: sql`excluded.stock`,
											unlimitedStock: sql`excluded.unlimited_stock`,
											planIds: sql`excluded.plan_ids`,
											productId: sql`excluded.product_id`,
											updatedAt: sql`now()`,
										},
									});

							syncedCount++;

							// Update plans' promo_ids if promo has plan_ids (and no product_id)
							if (promo.plan_ids && Array.isArray(promo.plan_ids) && promo.plan_ids.length > 0 && !promo.product?.id) {
								// Find all plans that match the promo's plan_ids
								const matchingPlans = await db.query.plans.findMany({
									where: and(
										eq(plans.whopCompanyId, companyId),
										inArray(plans.planId, promo.plan_ids)
									),
									columns: {
										id: true,
										promoIds: true,
									},
								});

								// Update each plan to include this promo ID in its promo_ids
								for (const plan of matchingPlans) {
									const currentPromoIds = (plan.promoIds as string[] | null) || [];
									if (!currentPromoIds.includes(promo.id)) {
										const updatedPromoIds = [...currentPromoIds, promo.id];
										await db
											.update(plans)
											.set({
												promoIds: updatedPromoIds,
												updatedAt: new Date(),
											})
											.where(eq(plans.id, plan.id));
										console.log(`✅ Added promo ${promo.id} to plan ${plan.id}'s promo_ids`);
									}
								}
							}
						} catch (error) {
							console.warn(`⚠️ Failed to sync promo ${promo.id}:`, error instanceof Error ? error.message : String(error));
							// Continue with other promos
						}
					}
				}
			}
		} catch (error) {
			console.error('Error listing promos from Whop API:', error instanceof Error ? error.message : String(error));
			// Continue even if API call fails
		}

		console.log(`✅ Synced ${syncedCount} promos from Whop API`);
		return syncedCount;
	} catch (error) {
		console.error('Error syncing promos from Whop API:', error instanceof Error ? error.message : String(error));
		throw error;
	}
}

/**
 * Check if a promo conflict exists in database
 * Returns true if a promo with the same planIds already exists (regardless of code)
 * Note: Database should be synced with Whop API before calling this
 */
export async function checkPromoConflict(
	companyId: string,
	planIds: string[]
): Promise<boolean> {
	try {
		if (!planIds || planIds.length === 0) {
			return false; // No conflict if no planIds provided
		}

		// Check for conflict: same planIds for plan-only promos (code doesn't matter)
		// Compare JSONB arrays - need to check if planIds match exactly
		const planIdsJson = JSON.stringify(planIds.sort()); // Sort for consistent comparison
		
		const existingPromos = await db.query.promos.findMany({
			where: and(
				eq(promos.whopCompanyId, companyId),
				sql`${promos.productId} IS NULL` // No product_id for plan-only promos
			),
			columns: {
				id: true,
				planIds: true,
			},
		});
		
		// Check if any existing promo has the same planIds
		for (const promo of existingPromos) {
			if (!promo.planIds) continue;
			
			const existingPlanIds = (promo.planIds as string[] | null);
			if (existingPlanIds) {
				const existingPlanIdsJson = JSON.stringify(existingPlanIds.sort());
				if (existingPlanIdsJson === planIdsJson) {
					return true; // Conflict found
				}
			}
		}
		
		return false; // No conflict
	} catch (error) {
		console.error('Error checking promo conflict:', error instanceof Error ? error.message : String(error));
		return false; // On error, assume no conflict (allow creation to proceed)
	}
}

/**
 * Map discount duration type to months
 */
function mapDurationToMonths(discountData: DiscountSettings & { durationType?: string; durationMonths?: number }): number {
	if (discountData.durationType === 'one-time') {
		return 0; // One-time is typically 0 months
	} else if (discountData.durationType === 'forever') {
		return 999; // Large number for forever
	} else if (discountData.durationType === 'duration_months' && discountData.durationMonths) {
		return discountData.durationMonths;
	}
	return 0; // Default
}

/**
 * Create promo code for seasonal discount via Whop API
 */
export async function createPromoCodeForSeasonalDiscount(
	experienceId: string,
	companyId: string,
	discountData: DiscountSettings,
	promoCode: string
): Promise<string | null> {
	try {
		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		}

		// Query all plans from plans table by whopCompanyId
		type PlanWithResource = {
			id: string;
			planId: string;
			resourceId: string;
			whopProductId: string | null;
			checkoutConfigurationId: string | null;
			resource: {
				id: string;
				name: string | null;
			} | null;
		};
		
		const allPlans = await db.query.plans.findMany({
			where: eq(plans.whopCompanyId, companyId),
			columns: {
				id: true,
				planId: true,
				resourceId: true,
				whopProductId: true,
				checkoutConfigurationId: true,
			},
			with: {
				resource: {
					columns: {
						id: true,
						name: true,
					},
				},
			},
		}) as PlanWithResource[];

		// Collect all plan IDs (from all products and checkout-only plans)
		const allPlanIds = allPlans
			.map((p: PlanWithResource) => p.planId)
			.filter((id: string | null): id is string => Boolean(id));

		// Import Whop SDK client
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
		});

		// Access promoCodes from client
		const promoCodesClient = (client as any).promoCodes;
		if (!promoCodesClient) {
			throw new Error('promoCodes is not available on Whop SDK client');
		}

		// Map discount data to Whop API format
		const promoDurationMonths = mapDurationToMonths(discountData);
		const amountOff = discountData.globalDiscountType === 'percentage' 
			? discountData.percentage 
			: (discountData.globalDiscountAmount || 0);

		// Helper function to add promo ID to plans
		const addPromoIdToPlans = async (planIds: string[], whopPromoId: string) => {
			let updatedCount = 0;
			let notFoundCount = 0;
			
			for (const planId of planIds) {
				try {
					// Find plan by planId (Whop plan ID)
					const plan = allPlans.find(p => p.planId === planId);
					if (!plan) {
						console.warn(`⚠️ Plan not found in allPlans for planId: ${planId}`);
						notFoundCount++;
						continue;
					}

					// Get current promoIds array or initialize as empty
					const currentPlan = await db.query.plans.findFirst({
						where: eq(plans.id, plan.id),
						columns: {
							promoIds: true,
						},
					});

					const currentPromoIds = (currentPlan?.promoIds as string[] | null) || [];
					
					// Add whopPromoId if not already present
					if (!currentPromoIds.includes(whopPromoId)) {
						const updatedPromoIds = [...currentPromoIds, whopPromoId];
						await db
							.update(plans)
							.set({
								promoIds: updatedPromoIds,
								updatedAt: new Date(),
							})
							.where(eq(plans.id, plan.id));
						updatedCount++;
						console.log(`✅ Updated plan ${plan.id} (planId: ${planId}) with promo ${whopPromoId}`);
					} else {
						console.log(`ℹ️ Plan ${plan.id} (planId: ${planId}) already has promo ${whopPromoId}`);
					}
				} catch (error) {
					console.error(`❌ Error updating plan ${planId} with promo ${whopPromoId}:`, error);
				}
			}
			
			console.log(`📊 Promo update summary: ${updatedCount} updated, ${notFoundCount} not found, ${planIds.length - updatedCount - notFoundCount} already had promo`);
		};

		// Create ONE promo with all plan_ids (no product_id)
		if (allPlanIds.length === 0) {
			console.log('⚠️ No plans found for company, cannot create promo');
			return null;
		}

		// Check for conflict: same planIds (code doesn't matter)
		const hasConflict = await checkPromoConflict(companyId, allPlanIds);
		if (hasConflict) {
			console.log(`⚠️ Promo already exists for plans with same planIds, skipping...`);
			return null;
		}

		try {
			const promo = await promoCodesClient.create({
				company_id: companyId,
				code: promoCode,
				amount_off: amountOff,
				base_currency: 'usd',
				promo_type: discountData.globalDiscountType === 'percentage' ? 'percentage' : 'flat_amount',
				new_users_only: false,
				promo_duration_months: promoDurationMonths,
				plan_ids: allPlanIds,
				// Don't set product_id (applies to all plans)
				stock: discountData.quantityPerProduct && discountData.quantityPerProduct !== -1 
					? discountData.quantityPerProduct 
					: undefined,
				unlimited_stock: discountData.quantityPerProduct === -1 ? true : undefined,
			});

			// Save to promos table
			await db.insert(promos).values({
				whopCompanyId: companyId,
				whopPromoId: promo.id,
				code: promoCode,
				amountOff: amountOff.toString(),
				baseCurrency: 'usd',
				companyId: companyId,
				newUsersOnly: false,
				promoDurationMonths: promoDurationMonths,
				promoType: discountData.globalDiscountType === 'percentage' ? 'percentage' : 'flat_amount',
				planIds: JSON.stringify(allPlanIds),
				productId: null, // No product_id - applies to all plans
				stock: discountData.quantityPerProduct && discountData.quantityPerProduct !== -1 
					? discountData.quantityPerProduct 
					: null,
				unlimitedStock: discountData.quantityPerProduct === -1,
			});

			// Update all plans with promo ID
			await addPromoIdToPlans(allPlanIds, promo.id);

			console.log(`✅ Created promo code "${promoCode}" (Whop ID: ${promo.id}) for ${allPlanIds.length} plan(s)`);
			return promo.id;
		} catch (error: any) {
			// If promo code already exists in Whop API, continue without error
			const errorMessage = error?.message || error?.error?.message || '';
			const errorString = typeof error === 'string' ? error : JSON.stringify(error);
			const statusCode = error?.status || error?.statusCode || error?.response?.status;
			
			if (
				statusCode === 400 || // Bad request often means duplicate
				errorMessage.includes('already exists') || 
				errorMessage.includes('duplicate') ||
				errorMessage.includes('already been taken') ||
				errorString.includes('already exists') ||
				errorString.includes('already been taken') ||
				errorString.includes('already been taken by another promo code')
			) {
				console.log(`ℹ️ Promo code "${promoCode}" already exists in Whop API, skipping...`);
				return null;
			}
			throw error;
		}
	} catch (error) {
		console.error('Error creating promo code:', error instanceof Error ? error.message : String(error));
		throw error;
	}
}

/**
 * Fix orphaned promos: Update plans' promo_ids for promos that should be connected but aren't
 */
export async function fixOrphanedPromos(
	companyId: string
): Promise<{ fixed: number; errors: number }> {
	try {
		// Get all promos for this company
		const allPromos = await db.query.promos.findMany({
			where: eq(promos.whopCompanyId, companyId),
			columns: {
				id: true,
				whopPromoId: true,
				planIds: true,
			},
		});

		let fixedCount = 0;
		let errorCount = 0;

		for (const promo of allPromos) {
			try {
				// Skip promos without planIds
				if (!promo.planIds) continue;

				const planIds = promo.planIds as string[];
				if (planIds.length === 0) continue;

				// For each planId in the promo, check if plan has this promo in its promoIds
				for (const planId of planIds) {
					const plan = await db.query.plans.findFirst({
						where: and(
							eq(plans.planId, planId),
							eq(plans.whopCompanyId, companyId)
						),
						columns: {
							id: true,
							promoIds: true,
						},
					});

					if (!plan) continue; // Plan doesn't exist, skip

					const currentPromoIds = (plan.promoIds as string[] | null) || [];
					if (promo.whopPromoId && !currentPromoIds.includes(promo.whopPromoId)) {
						// Plan is missing this promo - add it
						const updatedPromoIds = [...currentPromoIds, promo.whopPromoId];
						await db
							.update(plans)
							.set({
								promoIds: updatedPromoIds,
								updatedAt: new Date(),
							})
							.where(eq(plans.id, plan.id));
						fixedCount++;
						console.log(`✅ Fixed: Added promo ${promo.whopPromoId} to plan ${plan.id}`);
					}
				}
			} catch (error) {
				console.error(`❌ Error fixing promo ${promo.id}:`, error);
				errorCount++;
			}
		}

		console.log(`📊 Fixed ${fixedCount} orphaned promo-plan connections, ${errorCount} errors`);
		return { fixed: fixedCount, errors: errorCount };
	} catch (error) {
		console.error('Error fixing orphaned promos:', error);
		throw error;
	}
}

/**
 * Delete orphaned promos: Remove promos from database and Whop API if they have no connected plans
 */
export async function deleteOrphanedPromos(
	companyId: string
): Promise<{ deleted: number; errors: number }> {
	try {
		// Get all promos for this company
		const allPromos = await db.query.promos.findMany({
			where: eq(promos.whopCompanyId, companyId),
			columns: {
				id: true,
				whopPromoId: true,
				planIds: true,
			},
		});

		let deletedCount = 0;
		let errorCount = 0;

		// Import Whop SDK client
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
		});
		const promoCodesClient = (client as any).promoCodes;

		if (!promoCodesClient) {
			throw new Error('promoCodes is not available on Whop SDK client');
		}

		for (const promo of allPromos) {
			try {
				// Check if promo has planIds
				const planIds = (promo.planIds as string[] | null) || [];
				
				// If promo has planIds, check if any plan actually has this promo
				let hasConnectedPlans = false;
				if (planIds.length > 0 && promo.whopPromoId) {
					// Check if any plan has this promo in its promoIds
					// Query all plans that match the planIds
					const matchingPlans = await db.query.plans.findMany({
						where: and(
							inArray(plans.planId, planIds),
							eq(plans.whopCompanyId, companyId)
						),
						columns: {
							id: true,
							promoIds: true,
						},
					});

					// Check if any plan has this promo in its promoIds
					for (const plan of matchingPlans) {
						const planPromoIds = (plan.promoIds as string[] | null) || [];
						if (planPromoIds.includes(promo.whopPromoId)) {
							hasConnectedPlans = true;
							break;
						}
					}
				}

				// If no plans are connected, delete the promo
				if (!hasConnectedPlans) {
					// Delete from Whop API first
					if (promo.whopPromoId) {
						try {
							await promoCodesClient.delete(promo.whopPromoId);
							console.log(`✅ Deleted promo ${promo.whopPromoId} from Whop API`);
						} catch (error) {
							console.warn(`⚠️ Failed to delete promo ${promo.whopPromoId} from Whop API:`, error);
							// Continue with database deletion even if API deletion fails
						}
					}

					// Delete from database
					await db.delete(promos).where(eq(promos.id, promo.id));
					deletedCount++;
					console.log(`✅ Deleted orphaned promo ${promo.whopPromoId} from database`);
				}
			} catch (error) {
				console.error(`❌ Error deleting promo ${promo.id}:`, error);
				errorCount++;
			}
		}

		console.log(`📊 Deleted ${deletedCount} orphaned promos, ${errorCount} errors`);
		return { deleted: deletedCount, errors: errorCount };
	} catch (error) {
		console.error('Error deleting orphaned promos:', error);
		throw error;
	}
}

/**
 * Delete seasonal discount promos from both Whop API and database
 * If promoCode is not provided, it will be fetched from the experience record
 */
export async function deleteSeasonalDiscountPromos(
	experienceId: string,
	promoCode?: string
): Promise<void> {
	try {
		// Resolve Whop experience ID to database UUID if needed and get company ID
		let resolvedExperienceId = experienceId;
		let whopCompanyId: string | undefined;
		
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
					whopCompanyId: true,
					seasonalDiscountPromo: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
				whopCompanyId = experience.whopCompanyId;
				// If promoCode not provided, get it from experience
				if (!promoCode && experience.seasonalDiscountPromo) {
					promoCode = experience.seasonalDiscountPromo;
				}
			} else {
				throw new Error(`Experience not found for ID: ${experienceId}`);
			}
		} else {
			// Direct UUID, get promo code and company ID from experience if not provided
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.id, experienceId),
				columns: {
					whopCompanyId: true,
					seasonalDiscountPromo: true,
				},
			});
			if (experience) {
				whopCompanyId = experience.whopCompanyId;
				if (!promoCode && experience.seasonalDiscountPromo) {
					promoCode = experience.seasonalDiscountPromo;
				}
			}
		}

		if (!whopCompanyId) {
			throw new Error(`Company ID not found for experience ${experienceId}`);
		}

		// If no promo code found, nothing to delete
		if (!promoCode) {
			console.log('⚠️ No promo code found in experience, nothing to delete');
			// Still clear the experience fields
			await db
				.update(experiences)
				.set({
					seasonalDiscountId: null,
					seasonalDiscountPromo: null,
					seasonalDiscountStart: null,
					seasonalDiscountEnd: null,
					seasonalDiscountText: null,
					seasonalDiscountQuantityPerProduct: null,
					seasonalDiscountDurationType: null,
					seasonalDiscountDurationMonths: null,
					updatedAt: new Date(),
				})
				.where(eq(experiences.id, resolvedExperienceId));
			return;
		}

		// Find all promos with code starting with base name and company ID
		console.log(`🔍 Searching for promos with code starting with "${promoCode}"`);
		const matchingPromos = await db.query.promos.findMany({
			where: and(
				eq(promos.whopCompanyId, whopCompanyId),
				sql`${promos.code} ILIKE ${promoCode + "%"}`
			),
			columns: {
				id: true,
				whopPromoId: true,
				code: true, // Add code for logging
			},
		});
		console.log(`📋 Found ${matchingPromos.length} matching promos to delete`);

		// Helper function to remove promo ID from plans
		const removePromoIdFromPlans = async (whopPromoId: string) => {
			// Find all plans that have this promo ID in their promoIds array
			// Using SQL to query JSONB array containment with proper parameterization
			const promoArrayJson = JSON.stringify([whopPromoId]);
			const plansWithPromo = await db
				.select({
					id: plans.id,
					promoIds: plans.promoIds,
				})
				.from(plans)
				.where(sql`${plans.promoIds} @> ${promoArrayJson}::jsonb`);

			// Remove whopPromoId from each plan's promoIds array
			for (const plan of plansWithPromo) {
				const currentPromoIds = (plan.promoIds as string[] | null) || [];
				const updatedPromoIds = currentPromoIds.filter(id => id !== whopPromoId);
				
				await db
					.update(plans)
					.set({
						promoIds: updatedPromoIds.length > 0 ? updatedPromoIds : null,
						updatedAt: new Date(),
					})
					.where(eq(plans.id, plan.id));
			}
		};

		// Initialize Whop SDK client
		const client = new Whop({
			apiKey: process.env['WHOP_API_KEY'], // Use bracket notation as in user's example
		});

		// Delete each promo from Whop API and database
		for (const promo of matchingPromos) {
			if (promo.whopPromoId) {
				// Remove promo ID from plans before deleting
				await removePromoIdFromPlans(promo.whopPromoId);

				try {
					await client.promoCodes.delete(promo.whopPromoId);
					console.log(`✅ Deleted promo ${promo.whopPromoId} (code: ${promo.code}) from Whop API`);
				} catch (error) {
					console.warn(`⚠️ Failed to delete promo ${promo.whopPromoId} from Whop API:`, error instanceof Error ? error.message : String(error));
					// Continue even if API deletion fails
				}
			}

			// Delete from database
			await db.delete(promos).where(eq(promos.id, promo.id));
		}

		// Clear seasonal discount fields from experience
		await db
			.update(experiences)
			.set({
				seasonalDiscountId: null,
				seasonalDiscountPromo: null,
				seasonalDiscountStart: null,
				seasonalDiscountEnd: null,
				seasonalDiscountText: null,
				seasonalDiscountQuantityPerProduct: null,
				seasonalDiscountDurationType: null,
				seasonalDiscountDurationMonths: null,
				updatedAt: new Date(),
			})
			.where(eq(experiences.id, resolvedExperienceId));

		console.log(`✅ Deleted ${matchingPromos.length} promos and cleared experience seasonal discount data`);
	} catch (error) {
		console.error('Error deleting seasonal discount promos:', error instanceof Error ? error.message : String(error));
		throw error;
	}
}

/**
 * Delete a single promo by its database ID
 * Removes from plans, deletes from Whop API, and deletes from database
 */
export async function deletePromoById(
	promoId: string,
	companyId: string
): Promise<{ success: boolean; plansUpdated: number; error?: string }> {
	try {
		console.log(`🔍 Starting deletion of promo ${promoId} for company ${companyId}`);
		
		// Get promo from database
		const promo = await db.query.promos.findFirst({
			where: and(
				eq(promos.id, promoId),
				eq(promos.whopCompanyId, companyId)
			),
			columns: {
				id: true,
				whopPromoId: true,
				code: true,
				planIds: true, // Add this to get the plans this promo is attached to
			},
		});

		if (!promo) {
			throw new Error(`Promo not found: ${promoId}`);
		}

		if (!promo.whopPromoId) {
			throw new Error(`Promo ${promoId} has no whopPromoId`);
		}

		console.log(`📋 Found promo: ${promo.code} (Whop ID: ${promo.whopPromoId})`);

		// Parse planIds from promo
		let promoPlanIds: string[] | null = null;
		if (promo.planIds) {
			if (Array.isArray(promo.planIds)) {
				promoPlanIds = promo.planIds;
			} else if (typeof promo.planIds === 'string') {
				try {
					const parsed = JSON.parse(promo.planIds);
					promoPlanIds = Array.isArray(parsed) ? parsed : null;
				} catch (e) {
					console.warn(`⚠️ Failed to parse planIds for promo ${promo.id}:`, promo.planIds);
				}
			}
		}

		// Helper function to remove promo ID from plans
		const removePromoIdFromPlans = async (whopPromoId: string, promoPlanIds: string[] | null): Promise<number> => {
			// If promo has no planIds, nothing to update
			if (!promoPlanIds || promoPlanIds.length === 0) {
				console.log(`ℹ️ Promo ${whopPromoId} has no planIds, nothing to remove from plans`);
				return 0;
			}

			console.log(`🔍 Looking for ${promoPlanIds.length} plan(s) from promo's planIds:`, promoPlanIds);

			// Query only the specific plans from the promo's planIds
			const plansToUpdate = await db.query.plans.findMany({
				where: and(
					eq(plans.whopCompanyId, companyId),
					inArray(plans.planId, promoPlanIds) // Use planId (Whop plan ID) to match
				),
				columns: {
					id: true,
					planId: true,
					promoIds: true,
				},
			});

			console.log(`📦 Found ${plansToUpdate.length} plan(s) to update (out of ${promoPlanIds.length} in promo's planIds)`);

			let updatedCount = 0;
			for (const plan of plansToUpdate) {
				// Handle different possible formats
				let currentPromoIds: string[] = [];
				if (plan.promoIds === null || plan.promoIds === undefined) {
					console.log(`⚠️ Plan ${plan.planId} has null/undefined promoIds`);
					continue;
				}
				
				// If it's already an array, use it
				if (Array.isArray(plan.promoIds)) {
					currentPromoIds = plan.promoIds;
				} 
				// If it's a string, try to parse it as JSON
				else if (typeof plan.promoIds === 'string') {
					try {
						const parsed = JSON.parse(plan.promoIds);
						currentPromoIds = Array.isArray(parsed) ? parsed : [];
					} catch (e) {
						console.warn(`⚠️ Failed to parse promoIds for plan ${plan.planId}:`, plan.promoIds);
						continue;
					}
				}
				
				// Check if plan actually has this promo ID
				if (!currentPromoIds.includes(whopPromoId)) {
					console.log(`ℹ️ Plan ${plan.planId} does not have promo ${whopPromoId} in its promoIds (might have been removed already)`);
					continue;
				}

				const updatedPromoIds = currentPromoIds.filter(id => id !== whopPromoId);
				
				await db
					.update(plans)
					.set({
						promoIds: updatedPromoIds.length > 0 ? updatedPromoIds : null,
						updatedAt: new Date(),
					})
					.where(eq(plans.id, plan.id));
				
				updatedCount++;
				console.log(`✅ Removed promo ${whopPromoId} from plan ${plan.planId} (DB id: ${plan.id})`);
			}

			return updatedCount;
		};

		// Remove from plans using the promo's planIds
		const plansUpdated = await removePromoIdFromPlans(promo.whopPromoId, promoPlanIds);
		console.log(`✅ Removed promo from ${plansUpdated} plan(s)`);

		// Delete from Whop API
		const client = new Whop({
			apiKey: process.env['WHOP_API_KEY'],
		});

		// Verify promoCodes is available
		if (!(client as any).promoCodes) {
			throw new Error('promoCodes is not available on Whop SDK client');
		}

		console.log(`🗑️ Deleting promo ${promo.whopPromoId} from Whop API...`);
		try {
			await client.promoCodes.delete(promo.whopPromoId);
			console.log(`✅ Deleted promo ${promo.whopPromoId} (code: ${promo.code}) from Whop API`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`❌ Failed to delete promo ${promo.whopPromoId} from Whop API:`, errorMessage);
			// Re-throw to prevent database deletion if API deletion fails
			throw new Error(`Failed to delete promo from Whop API: ${errorMessage}`);
		}

		// Delete from database
		console.log(`🗑️ Deleting promo ${promo.code} from database...`);
		await db.delete(promos).where(eq(promos.id, promo.id));
		console.log(`✅ Deleted promo ${promo.code} from database`);

		return { success: true, plansUpdated };
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error('❌ Error deleting promo:', errorMessage);
		return { success: false, plansUpdated: 0, error: errorMessage };
	}
}

/**
 * Validate seasonal discount in experience
 */
export async function validateSeasonalDiscountInExperience(
	experienceId: string,
	seasonalDiscountId: string
): Promise<{ isValid: boolean; isExpired: boolean }> {
	try {
		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				return { isValid: false, isExpired: false };
			}
		}

		// Get experience record
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, resolvedExperienceId),
			columns: {
				seasonalDiscountId: true,
				seasonalDiscountEnd: true,
			},
		});

		// If experience doesn't exist, seasonalDiscountId is null, or doesn't match, it's invalid
		if (!experience || !experience.seasonalDiscountId || experience.seasonalDiscountId !== seasonalDiscountId) {
			return { isValid: false, isExpired: false };
		}

		// Check if expired
		const isExpired = experience.seasonalDiscountEnd 
			? new Date() > new Date(experience.seasonalDiscountEnd)
			: false;

		return { isValid: true, isExpired };
	} catch (error) {
		console.error('Error validating seasonal discount:', error);
		return { isValid: false, isExpired: false };
	}
}

/**
 * Get seasonal discount data from experience table
 */
export async function getExperienceSeasonalDiscount(
	experienceId: string
): Promise<SeasonalDiscountData | null> {
	try {
		// Resolve Whop experience ID to database UUID if needed
		let resolvedExperienceId = experienceId;
		if (experienceId.startsWith('exp_')) {
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopExperienceId, experienceId),
				columns: {
					id: true,
				},
			});

			if (experience) {
				resolvedExperienceId = experience.id;
			} else {
				return null;
			}
		}

		// Get experience record with seasonal discount fields
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.id, resolvedExperienceId),
			columns: {
				seasonalDiscountId: true,
				seasonalDiscountPromo: true,
				seasonalDiscountStart: true,
				seasonalDiscountEnd: true,
				seasonalDiscountText: true,
				seasonalDiscountQuantityPerProduct: true,
				seasonalDiscountDurationType: true,
				seasonalDiscountDurationMonths: true,
				globalDiscount: true,
			},
		});

		if (!experience || !experience.seasonalDiscountId) {
			return null;
		}

		// Check if expired (but still return the data so it can be displayed and deleted)
		const isExpired = experience.seasonalDiscountEnd 
			? new Date() > new Date(experience.seasonalDiscountEnd)
			: false;

		// Map experience fields to SeasonalDiscountData
		const discountData: SeasonalDiscountData = {
			seasonalDiscountId: experience.seasonalDiscountId,
			seasonalDiscountPromo: experience.seasonalDiscountPromo || undefined,
			seasonalDiscountStart: experience.seasonalDiscountStart || undefined,
			seasonalDiscountEnd: experience.seasonalDiscountEnd || undefined,
			seasonalDiscountText: experience.seasonalDiscountText || undefined,
			seasonalDiscountQuantityPerProduct: experience.seasonalDiscountQuantityPerProduct || undefined,
			seasonalDiscountDurationType: experience.seasonalDiscountDurationType || undefined,
			seasonalDiscountDurationMonths: experience.seasonalDiscountDurationMonths || undefined,
			globalDiscount: experience.globalDiscount || false,
			isExpired, // Include expired flag in the returned data
		};

		return discountData;
	} catch (error) {
		console.error('Error getting experience seasonal discount:', error);
		return null;
	}
}





