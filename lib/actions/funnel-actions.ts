import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { updateUserCredits } from "../context/user-context";
import { db } from "../supabase/db-server";
import {
	experiences,
	funnelAnalytics,
	funnelResources,
	funnels,
	resources,
} from "../supabase/schema";
import { generateFunnelFlow } from "./ai-actions";
import { PRODUCT_LIMITS, GLOBAL_LIMITS } from "../types/resource";

export interface CreateFunnelInput {
	name: string;
	description?: string;
	resources?: string[]; // Resource IDs
	whopProductId?: string; // Discovery page product ID
}

export interface UpdateFunnelInput {
	name?: string;
	description?: string;
	flow?: any;
	resources?: string[]; // Resource IDs
}

export interface FunnelWithResources {
	id: string;
	name: string;
	description?: string;
	flow?: any;
	isDeployed: boolean;
	wasEverDeployed: boolean;
	generationStatus: "idle" | "generating" | "completed" | "failed";
	sends: number;
	createdAt: Date;
	updatedAt: Date;
	whopProductId?: string; // 🔑 Discovery page product ID
	resources: Array<{
		id: string;
		name: string;
		type: "AFFILIATE" | "MY_PRODUCTS";
		category: "PAID" | "FREE_VALUE";
		link: string;
		code?: string;
		description?: string;
	}>;
}

export interface FunnelListResponse {
	funnels: FunnelWithResources[];
	total: number;
	page: number;
	limit: number;
}

/**
 * Create a new funnel
 */
export async function createFunnel(
	user: AuthenticatedUser,
	input: CreateFunnelInput,
): Promise<FunnelWithResources> {
	try {
		// Check global funnel limit before creating
		const existingFunnelsCount = await db
			.select({ count: count() })
			.from(funnels)
			.where(
				and(
					eq(funnels.experienceId, user.experience.id), // Use database UUID for foreign key
					eq(funnels.userId, user.id),
				),
			);

		if (existingFunnelsCount[0].count >= GLOBAL_LIMITS.FUNNELS) {
			throw new Error(
				`Cannot create funnel: limit reached (max ${GLOBAL_LIMITS.FUNNELS} funnels per account)`,
			);
		}

		// Create the funnel
		const [newFunnel] = await db
			.insert(funnels)
			.values({
				experienceId: user.experience.id, // Use database UUID for foreign key
				userId: user.id,
				name: input.name,
				description: input.description || null,
				whopProductId: input.whopProductId || null, // 🔑 NEW: Product association
				flow: null,
				isDeployed: false,
				wasEverDeployed: false,
				generationStatus: "idle",
				sends: 0,
			})
			.returning();

		// Assign resources if provided
		if (input.resources && input.resources.length > 0) {
			// Verify resources belong to user's experience
			const userResources = await db.query.resources.findMany({
				where: and(
					eq(resources.experienceId, user.experience.id), // Use database UUID for foreign key
					inArray(resources.id, input.resources),
				),
			});

			if (userResources.length !== input.resources.length) {
				throw new Error(
					"Some resources do not exist or belong to different experience",
				);
			}

			// Check product limits before assigning resources
			const paidCount = userResources.filter(
				(r: any) => r.category === "PAID",
			).length;
			const freeValueCount = userResources.filter(
				(r: any) => r.category === "FREE_VALUE",
			).length;

			if (paidCount > PRODUCT_LIMITS.PAID) {
				throw new Error(
					`Cannot create funnel: too many paid products (max ${PRODUCT_LIMITS.PAID} paid products per funnel)`,
				);
			}

			if (freeValueCount > PRODUCT_LIMITS.FREE_VALUE) {
				throw new Error(
					`Cannot create funnel: too many free products (max ${PRODUCT_LIMITS.FREE_VALUE} free products per funnel)`,
				);
			}

			// Create funnel-resource relationships
			const funnelResourceValues = input.resources.map((resourceId) => ({
				funnelId: newFunnel.id,
				resourceId: resourceId,
			}));

			await db.insert(funnelResources).values(funnelResourceValues);
		}

		// Return the created funnel directly instead of fetching it again
		const assignedResources =
			input.resources && input.resources.length > 0
				? await db.query.resources.findMany({
						where: and(
							eq(resources.experienceId, user.experience.id),
							inArray(resources.id, input.resources),
						),
					})
				: [];

		return {
			id: newFunnel.id,
			name: newFunnel.name,
			description: newFunnel.description || undefined,
			flow: newFunnel.flow,
			isDeployed: newFunnel.isDeployed,
			wasEverDeployed: newFunnel.wasEverDeployed,
			generationStatus: newFunnel.generationStatus,
			sends: newFunnel.sends,
			createdAt: newFunnel.createdAt,
			updatedAt: newFunnel.updatedAt,
			resources: assignedResources.map((resource: any) => ({
				id: resource.id,
				name: resource.name,
				type: resource.type as "AFFILIATE" | "MY_PRODUCTS",
				category: resource.category as "PAID" | "FREE_VALUE",
				link: resource.link,
				code: resource.code || undefined,
				description: resource.description || undefined,
			})),
		};
	} catch (error) {
		console.error("Error creating funnel:", error);
		throw new Error("Failed to create funnel");
	}
}

/**
 * Get funnel by ID with resources
 */
export async function getFunnelById(
	user: AuthenticatedUser,
	funnelId: string,
): Promise<FunnelWithResources> {
	try {
		// Use optimized join query instead of nested queries
		const funnelWithResourcesRaw = await db
			.select({
				funnel: funnels,
				resource: resources,
				funnelResource: funnelResources,
			})
			.from(funnels)
			.leftJoin(funnelResources, eq(funnels.id, funnelResources.funnelId))
			.leftJoin(resources, eq(funnelResources.resourceId, resources.id))
			.where(
				and(
					eq(funnels.id, funnelId),
					eq(funnels.experienceId, user.experience.id),
				),
			);

		if (funnelWithResourcesRaw.length === 0) {
			throw new Error("Funnel not found");
		}

		const firstRow = funnelWithResourcesRaw[0];
		const funnel = firstRow.funnel;

		// Check access permissions
		if (user.accessLevel === "customer" && funnel.userId !== user.id) {
			throw new Error("Access denied: You can only access your own funnels");
		}

		// Collect unique resources
		const resourcesMap = new Map<string, any>();
		funnelWithResourcesRaw.forEach((row: any) => {
			if (row.resource && !resourcesMap.has(row.resource.id)) {
				resourcesMap.set(row.resource.id, {
					id: row.resource.id,
					name: row.resource.name,
					type: row.resource.type,
					category: row.resource.category,
					link: row.resource.link,
					code: row.resource.code || undefined,
					description: row.resource.description || undefined,
				});
			}
		});

		return {
			id: funnel.id,
			name: funnel.name,
			description: funnel.description || undefined,
			flow: funnel.flow,
			isDeployed: funnel.isDeployed,
			wasEverDeployed: funnel.wasEverDeployed,
			generationStatus: funnel.generationStatus,
			sends: funnel.sends,
			createdAt: funnel.createdAt,
			updatedAt: funnel.updatedAt,
			whopProductId: funnel.whopProductId || undefined, // 🔑 Include whopProductId
			resources: Array.from(resourcesMap.values()),
		};
	} catch (error) {
		console.error("Error getting funnel:", error);
		throw error;
	}
}

/**
 * Get all funnels for user/company with pagination
 */
export async function getFunnels(
	user: AuthenticatedUser,
	page = 1,
	limit = 10,
	search?: string,
): Promise<FunnelListResponse> {
	try {
		const offset = (page - 1) * limit;

		// Build where conditions - use experience-based filtering
		let whereConditions = eq(funnels.experienceId, user.experience.id);

		// For customers, also filter by user ID to ensure data isolation
		if (user.accessLevel === "customer") {
			whereConditions = and(whereConditions, eq(funnels.userId, user.id))!;
		}

		// Add search filter
		if (search) {
			whereConditions = and(
				whereConditions,
				sql`${funnels.name} ILIKE ${"%" + search + "%"}`,
			)!;
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(funnels)
			.where(whereConditions);

		const total = totalResult.count;

		// First get the funnels with pagination
		const paginatedFunnels = await db
			.select()
			.from(funnels)
			.where(whereConditions)
			.orderBy(desc(funnels.updatedAt))
			.limit(limit)
			.offset(offset);

		// Then get resources for these funnels
		const funnelIds = paginatedFunnels.map((f: any) => f.id);
		const funnelsWithResourcesRaw = await db
			.select({
				funnel: funnels,
				resource: resources,
				funnelResource: funnelResources,
			})
			.from(funnels)
			.leftJoin(funnelResources, eq(funnels.id, funnelResources.funnelId))
			.leftJoin(resources, eq(funnelResources.resourceId, resources.id))
			.where(inArray(funnels.id, funnelIds));

		// Group resources by funnel
		const funnelMap = new Map<string, FunnelWithResources>();

		funnelsWithResourcesRaw.forEach((row: any) => {
			const funnel = row.funnel;
			const resource = row.resource;

			if (!funnelMap.has(funnel.id)) {
				funnelMap.set(funnel.id, {
					id: funnel.id,
					name: funnel.name,
					description: funnel.description || undefined,
					flow: funnel.flow,
					isDeployed: funnel.isDeployed,
					wasEverDeployed: funnel.wasEverDeployed,
					generationStatus: funnel.generationStatus,
					sends: funnel.sends,
					createdAt: funnel.createdAt,
					updatedAt: funnel.updatedAt,
					whopProductId: funnel.whopProductId || undefined, // 🔑 Include whopProductId
					resources: [],
				});
			}

			// Add resource if it exists and not already added
			if (
				resource &&
				!funnelMap.get(funnel.id)!.resources.some((r) => r.id === resource.id)
			) {
				funnelMap.get(funnel.id)!.resources.push({
					id: resource.id,
					name: resource.name,
					type: resource.type,
					category: resource.category,
					link: resource.link,
					code: resource.code || undefined,
					description: resource.description || undefined,
				});
			}
		});

		const funnelsWithResources: FunnelWithResources[] = Array.from(
			funnelMap.values(),
		);

		return {
			funnels: funnelsWithResources,
			total,
			page,
			limit,
		};
	} catch (error) {
		console.error("Error getting funnels:", error);
		throw new Error("Failed to get funnels");
	}
}

/**
 * Update funnel
 */
export async function updateFunnel(
	user: AuthenticatedUser,
	funnelId: string,
	input: UpdateFunnelInput,
): Promise<FunnelWithResources> {
	try {
		// Check if funnel exists and user has access
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id), // New: Experience-based filtering
			),
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && existingFunnel.userId !== user.id) {
			throw new Error("Access denied: You can only update your own funnels");
		}

		// Update funnel
		const [updatedFunnel] = await db
			.update(funnels)
			.set({
				name: input.name || existingFunnel.name,
				description:
					input.description !== undefined
						? input.description
						: existingFunnel.description,
				flow: input.flow || existingFunnel.flow,
				updatedAt: new Date(),
			})
			.where(eq(funnels.id, funnelId))
			.returning();

		// Update resources if provided
		if (input.resources !== undefined) {
			// Remove existing resource assignments
			await db
				.delete(funnelResources)
				.where(eq(funnelResources.funnelId, funnelId));

			// Add new resource assignments
			if (input.resources.length > 0) {
				// Verify resources belong to user's experience
				const userResources = await db.query.resources.findMany({
					where: and(
						eq(resources.experienceId, user.experience.id), // Use database UUID for foreign key
						inArray(resources.id, input.resources),
					),
				});

				if (userResources.length !== input.resources.length) {
					throw new Error(
						"Some resources do not exist or belong to different experience",
					);
				}

				// Check product limits before assigning resources
				const paidCount = userResources.filter(
					(r: any) => r.category === "PAID",
				).length;
				const freeValueCount = userResources.filter(
					(r: any) => r.category === "FREE_VALUE",
				).length;

				if (paidCount > PRODUCT_LIMITS.PAID) {
					throw new Error(
						`Cannot update funnel: too many paid products (max ${PRODUCT_LIMITS.PAID} paid products per funnel)`,
					);
				}

				if (freeValueCount > PRODUCT_LIMITS.FREE_VALUE) {
					throw new Error(
						`Cannot update funnel: too many free products (max ${PRODUCT_LIMITS.FREE_VALUE} free products per funnel)`,
					);
				}

				// Create new funnel-resource relationships
				const funnelResourceValues = input.resources.map((resourceId) => ({
					funnelId: funnelId,
					resourceId: resourceId,
				}));

				await db.insert(funnelResources).values(funnelResourceValues);
			}
		}

		// Return updated funnel with resources
		return await getFunnelById(user, funnelId);
	} catch (error) {
		console.error("Error updating funnel:", error);
		throw error;
	}
}

/**
 * Delete funnel
 */
export async function deleteFunnel(
	user: AuthenticatedUser,
	funnelId: string,
): Promise<boolean> {
	try {
		// Check if funnel exists and user has access
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id), // New: Experience-based filtering
			),
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && existingFunnel.userId !== user.id) {
			throw new Error("Access denied: You can only delete your own funnels");
		}

		// Delete funnel (cascade will handle related records)
		await db.delete(funnels).where(eq(funnels.id, funnelId));

		return true;
	} catch (error) {
		console.error("Error deleting funnel:", error);
		throw error;
	}
}

/**
 * Check if any other funnel is currently deployed for the same product
 */
export async function checkForOtherLiveFunnels(
	user: AuthenticatedUser,
	productId: string,
	excludeFunnelId?: string,
): Promise<{ hasLiveFunnel: boolean; liveFunnelName?: string }> {
	try {
		console.log(`🔍 [DATABASE QUERY] Checking for live funnels with:`);
		console.log(`🔍 [DATABASE QUERY] - experienceId: ${user.experience.id}`);
		console.log(`🔍 [DATABASE QUERY] - whopProductId: ${productId}`);
		console.log(`🔍 [DATABASE QUERY] - excludeFunnelId: ${excludeFunnelId}`);
		
		const liveFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.experienceId, user.experience.id),
				eq(funnels.whopProductId, productId), // 🔑 KEY: Check same product
				eq(funnels.isDeployed, true),
				excludeFunnelId ? sql`${funnels.id} != ${excludeFunnelId}` : sql`1=1`,
			),
			columns: {
				id: true,
				name: true,
			},
		});

		console.log(`🔍 [DATABASE QUERY] Found live funnel:`, liveFunnel);

		return {
			hasLiveFunnel: !!liveFunnel,
			liveFunnelName: liveFunnel?.name,
		};
	} catch (error) {
		console.error("Error checking for live funnels:", error);
		return { hasLiveFunnel: false };
	}
}

/**
 * Check for live funnels across all products for an experience
 */
export async function checkForAnyLiveFunnels(
	user: AuthenticatedUser,
	excludeFunnelId?: string,
): Promise<{ hasLiveFunnel: boolean; liveFunnelName?: string; productId?: string }> {
	try {
		const liveFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.experienceId, user.experience.id),
				eq(funnels.isDeployed, true),
				excludeFunnelId ? sql`${funnels.id} != ${excludeFunnelId}` : sql`1=1`,
			),
			columns: {
				id: true,
				name: true,
				whopProductId: true,
			},
		});

		return {
			hasLiveFunnel: !!liveFunnel,
			liveFunnelName: liveFunnel?.name,
			productId: liveFunnel?.whopProductId || undefined,
		};
	} catch (error) {
		console.error("Error checking for live funnels:", error);
		return { hasLiveFunnel: false };
	}
}

/**
 * Deploy funnel
 */
export async function deployFunnel(
	user: AuthenticatedUser,
	funnelId: string,
): Promise<FunnelWithResources> {
	try {
		// Check if funnel exists and user has access
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id), // New: Experience-based filtering
			),
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && existingFunnel.userId !== user.id) {
			throw new Error("Access denied: You can only deploy your own funnels");
		}

		// Check if funnel has a flow
		if (!existingFunnel.flow) {
			throw new Error("Cannot deploy funnel without a flow");
		}

		// Check if any other funnel is currently live for the same product
		if (existingFunnel.whopProductId) {
			const liveFunnelCheck = await checkForOtherLiveFunnels(user, existingFunnel.whopProductId, funnelId);
			if (liveFunnelCheck.hasLiveFunnel) {
				throw new Error(`Funnel "${liveFunnelCheck.liveFunnelName}" is currently live for this product.`);
			}
		}

		// Update funnel deployment status
		const [updatedFunnel] = await db
			.update(funnels)
			.set({
				isDeployed: true,
				wasEverDeployed: true,
				updatedAt: new Date(),
			})
			.where(eq(funnels.id, funnelId))
			.returning();

		// Real-time notifications moved to React hooks

		return await getFunnelById(user, funnelId);
	} catch (error) {
		console.error("Error deploying funnel:", error);
		throw error;
	}
}

/**
 * Undeploy funnel
 */
export async function undeployFunnel(
	user: AuthenticatedUser,
	funnelId: string,
): Promise<FunnelWithResources> {
	try {
		// Check if funnel exists and user has access
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id), // New: Experience-based filtering
			),
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && existingFunnel.userId !== user.id) {
			throw new Error("Access denied: You can only undeploy your own funnels");
		}

		// Update funnel deployment status
		const [updatedFunnel] = await db
			.update(funnels)
			.set({
				isDeployed: false,
				updatedAt: new Date(),
			})
			.where(eq(funnels.id, funnelId))
			.returning();

		// Real-time notifications moved to React hooks

		return await getFunnelById(user, funnelId);
	} catch (error) {
		console.error("Error undeploying funnel:", error);
		throw error;
	}
}

/**
 * Regenerate funnel flow using AI
 */
export async function regenerateFunnelFlow(
	user: AuthenticatedUser,
	funnelId: string,
): Promise<FunnelWithResources> {
	try {
		// Check if funnel exists and user has access
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id), // New: Experience-based filtering
			),
			with: {
				funnelResources: {
					with: {
						resource: true,
					},
				},
			},
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions - only admins can regenerate
		if (user.accessLevel !== "admin") {
			throw new Error("Access denied: Only admins can regenerate funnels");
		}

		// Check if user has sufficient credits
		if (user.credits < 1) {
			throw new Error("Insufficient credits: Regeneration requires 1 credit");
		}

		// Update generation status to generating
		await db
			.update(funnels)
			.set({
				generationStatus: "generating",
				updatedAt: new Date(),
			})
			.where(eq(funnels.id, funnelId));

		// Send real-time generation started notification
		// Real-time notifications moved to React hooks

		try {
			// Prepare resources for AI generation
			const resourcesForAI = existingFunnel.funnelResources.map((fr: any) => ({
				id: fr.resource.id,
				name: fr.resource.name,
				type: fr.resource.type,
				category: fr.resource.category,
				link: fr.resource.link,
				code: fr.resource.code || "",
			}));

			// Send progress update
			// Real-time notifications moved to React hooks

			// Generate new flow using AI
			const generatedFlow = await generateFunnelFlow(resourcesForAI);

			// Send progress update
			// Real-time notifications moved to React hooks

			// Update funnel with new flow
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

			// Send completion notification
			// Real-time notifications moved to React hooks

			// Deduct credit for regeneration
			const creditDeducted = await updateUserCredits(
				user.whopUserId,
				user.experience.id, // Use database UUID, not Whop Experience ID
				1,
				"subtract",
			);

			if (!creditDeducted) {
				console.warn("Failed to deduct credits for user:", user.whopUserId);
			}

			return await getFunnelById(user, funnelId);
		} catch (aiError) {
			// Update generation status to failed
			await db
				.update(funnels)
				.set({
					generationStatus: "failed",
					updatedAt: new Date(),
				})
				.where(eq(funnels.id, funnelId));

			// Send failure notification
			// Real-time notifications moved to React hooks

			throw aiError;
		}
	} catch (error) {
		console.error("Error regenerating funnel flow:", error);
		throw error;
	}
}

/**
 * Get funnel analytics
 */
export async function getFunnelAnalytics(
	user: AuthenticatedUser,
	funnelId: string,
	startDate?: Date,
	endDate?: Date,
): Promise<any> {
	try {
		// Check if funnel exists and user has access
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id),
			),
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && existingFunnel.userId !== user.id) {
			throw new Error(
				"Access denied: You can only view analytics for your own funnels",
			);
		}

		// Build date filter
		let dateFilter = eq(funnelAnalytics.funnelId, funnelId);

		if (startDate) {
			dateFilter = and(
				sql`${funnelAnalytics.date} >= ${startDate}`,
			)!;
		}

		if (endDate) {
			dateFilter = and(dateFilter, sql`${funnelAnalytics.date} <= ${endDate}`)!;
		}

		// Get analytics data
		const analytics = await db.query.funnelAnalytics.findMany({
			where: dateFilter,
			orderBy: [asc(funnelAnalytics.date)],
		});

		// Calculate totals
		const totals = analytics.reduce(
			(acc: any, record: any) => {
				acc.views += record.views;
				acc.starts += record.starts;
				acc.completions += record.completions;
				acc.conversions += record.conversions;
				acc.revenue += Number.parseFloat(record.revenue);
				return acc;
			},
			{
				views: 0,
				starts: 0,
				completions: 0,
				conversions: 0,
				revenue: 0,
			},
		);

		return {
			funnel: {
				id: existingFunnel.id,
				name: existingFunnel.name,
				isDeployed: existingFunnel.isDeployed,
			},
			analytics: analytics,
			totals: totals,
			period: {
				startDate: startDate || null,
				endDate: endDate || null,
			},
		};
	} catch (error) {
		console.error("Error getting funnel analytics:", error);
		throw error;
	}
}

/**
 * Add a resource to a funnel
 */
export async function addResourceToFunnel(
	user: AuthenticatedUser,
	funnelId: string,
	resourceId: string,
): Promise<FunnelWithResources> {
	try {
		// Check if funnel exists and user has access (following consistent auth pattern)
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id), // Experience-based filtering
			),
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && existingFunnel.userId !== user.id) {
			throw new Error("Access denied: You can only add resources to your own funnels");
		}

		// Check if resource exists and user has access (following consistent auth pattern)
		const existingResource = await db.query.resources.findFirst({
			where: and(
				eq(resources.id, resourceId),
				eq(resources.experienceId, user.experience.id), // Use database UUID for foreign key
			),
		});

		if (!existingResource) {
			throw new Error("Resource not found");
		}

		// Check access permissions for resource
		if (user.accessLevel === "customer" && existingResource.userId !== user.id) {
			throw new Error("Access denied: You can only add your own resources to funnels");
		}

		// Check if resource is already in funnel
		const [existingRelation] = await db
			.select()
			.from(funnelResources)
			.where(
				and(
					eq(funnelResources.funnelId, funnelId),
					eq(funnelResources.resourceId, resourceId),
				),
			)
			.limit(1);

		if (existingRelation) {
			throw new Error("Resource is already in this funnel");
		}

		// Check product limits before adding
		const currentResources = await db
			.select({
				resource: resources,
			})
			.from(funnelResources)
			.innerJoin(resources, eq(funnelResources.resourceId, resources.id))
			.where(eq(funnelResources.funnelId, funnelId));

		// Count current resources by category
		const paidCount = currentResources.filter(
			(r: any) => r.resource.category === "PAID",
		).length;
		const freeValueCount = currentResources.filter(
			(r: any) => r.resource.category === "FREE_VALUE",
		).length;

		// Check if adding this resource would exceed limits
		if (existingResource.category === "PAID" && paidCount >= PRODUCT_LIMITS.PAID) {
			throw new Error(
				`Cannot add paid product: limit reached (max ${PRODUCT_LIMITS.PAID} paid products per funnel)`,
			);
		}

		if (
			existingResource.category === "FREE_VALUE" &&
			freeValueCount >= PRODUCT_LIMITS.FREE_VALUE
		) {
			throw new Error(
				`Cannot add free product: limit reached (max ${PRODUCT_LIMITS.FREE_VALUE} free products per funnel)`,
			);
		}

		// Add resource to funnel
		await db.insert(funnelResources).values({
			funnelId: funnelId,
			resourceId: resourceId,
		});

		// Get updated funnel with resources
		const updatedFunnel = await getFunnelById(user, funnelId);
		if (!updatedFunnel) {
			throw new Error("Failed to retrieve updated funnel");
		}

		return updatedFunnel;
	} catch (error) {
		console.error("Error adding resource to funnel:", error);
		throw error;
	}
}

/**
 * Remove a resource from a funnel
 */
export async function removeResourceFromFunnel(
	user: AuthenticatedUser,
	funnelId: string,
	resourceId: string,
): Promise<void> {
	try {
		// Check if funnel exists and user has access (following consistent auth pattern)
		const existingFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.id, funnelId),
				eq(funnels.experienceId, user.experience.id), // Experience-based filtering
			),
		});

		if (!existingFunnel) {
			throw new Error("Funnel not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && existingFunnel.userId !== user.id) {
			throw new Error("Access denied: You can only remove resources from your own funnels");
		}

		// Remove resource from funnel
		await db
			.delete(funnelResources)
			.where(
				and(
					eq(funnelResources.funnelId, funnelId),
					eq(funnelResources.resourceId, resourceId),
				),
			);
	} catch (error) {
		console.error("Error removing resource from funnel:", error);
		throw error;
	}
}
