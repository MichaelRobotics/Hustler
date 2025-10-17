import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { updateUserCredits } from "../context/user-context";
import { db } from "../supabase/db-server";
import {
	experiences,
	funnelAnalytics,
	funnelResourceAnalytics,
	funnelResources,
	funnels,
	resources,
	users,
} from "../supabase/schema";
import { generateFunnelFlow } from "./ai-actions";
import { PRODUCT_LIMITS, GLOBAL_LIMITS } from "../types/resource";
import { resourceAssignmentQueue } from "../queue/ResourceAssignmentQueue";
import type { FunnelFlow } from "../types/funnel";

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

// Helper function to calculate percentage growth
function calculateGrowthPercent(current: number, previous: number): number {
	if (previous === 0) {
		return current > 0 ? 100 : 0;
	}
	return ((current - previous) / previous) * 100;
}

// Function to update growth percentages for funnel analytics
export async function updateFunnelGrowthPercentages(funnelId: string) {
	try {
		// Get current analytics data
		const currentAnalytics = await db.query.funnelAnalytics.findFirst({
			where: eq(funnelAnalytics.funnelId, funnelId),
		});

		if (!currentAnalytics) return;

		// Calculate growth percentages using yesterday's metrics
		const startsGrowth = calculateGrowthPercent(
			currentAnalytics.todayStarts || 0,
			currentAnalytics.yesterdayStarts || 0
		);
		
		const intentGrowth = calculateGrowthPercent(
			currentAnalytics.todayIntent || 0,
			currentAnalytics.yesterdayIntent || 0
		);
		
		const conversionsGrowth = calculateGrowthPercent(
			currentAnalytics.todayConversions || 0,
			currentAnalytics.yesterdayConversions || 0
		);
		
		const interestGrowth = calculateGrowthPercent(
			currentAnalytics.todayInterest || 0,
			currentAnalytics.yesterdayInterest || 0
		);

		// Update the growth percentages
		await db.update(funnelAnalytics)
			.set({
				startsGrowthPercent: startsGrowth.toString(),
				intentGrowthPercent: intentGrowth.toString(),
				conversionsGrowthPercent: conversionsGrowth.toString(),
				interestGrowthPercent: interestGrowth.toString(),
				lastUpdated: new Date()
			})
			.where(eq(funnelAnalytics.funnelId, funnelId));

	} catch (error) {
		console.error("Error updating funnel growth percentages:", error);
		throw error;
	}
}

export interface CreateFunnelInput {
	name: string;
	description?: string;
	resources?: string[]; // Resource IDs
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
		resources: Array<{
		id: string;
		name: string;
		type: "AFFILIATE" | "MY_PRODUCTS";
		category: "PAID" | "FREE_VALUE";
		link: string;
		code?: string;
		description?: string;
		productApps?: any;
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
				(r: { category: string }) => r.category === "PAID",
			).length;
			const freeValueCount = userResources.filter(
				(r: { category: string }) => r.category === "FREE_VALUE",
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
		const resourcesMap = new Map<string, {
			id: string;
			name: string;
			type: "AFFILIATE" | "MY_PRODUCTS";
			category: "PAID" | "FREE_VALUE";
			link: string;
			code?: string;
			description?: string;
			productApps?: any;
		}>();
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
					productApps: row.resource.productApps || undefined,
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
					productApps: resource.productApps || undefined,
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
					(r: { category: string }) => r.category === "PAID",
				).length;
				const freeValueCount = userResources.filter(
					(r: { category: string }) => r.category === "FREE_VALUE",
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
 * Check if any other funnel is currently deployed for the experience
 */
export async function checkForOtherLiveFunnels(
	user: AuthenticatedUser,
	excludeFunnelId?: string,
): Promise<{ hasLiveFunnel: boolean; liveFunnelName?: string }> {
	try {
		console.log(`ℹ️ [DEPLOYMENT CHECK] Checking for existing live funnels in experience: ${user.experience.id}`);
		console.log(`ℹ️ [DEPLOYMENT CHECK] Excluding funnel ID: ${excludeFunnelId || 'none'}`);
		
		const liveFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.experienceId, user.experience.id),
				eq(funnels.isDeployed, true),
				excludeFunnelId ? sql`${funnels.id} != ${excludeFunnelId}` : sql`1=1`,
			),
			columns: {
				id: true,
				name: true,
			},
		});

		if (liveFunnel) {
			console.log(`ℹ️ [DEPLOYMENT CHECK] Found existing live funnel: "${liveFunnel.name}" (ID: ${liveFunnel.id})`);
		} else {
			console.log(`ℹ️ [DEPLOYMENT CHECK] No existing live funnels found - deployment can proceed`);
		}

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

		// Check if any other funnel is currently live for this experience
		const liveFunnelCheck = await checkForOtherLiveFunnels(user, funnelId);
		if (liveFunnelCheck.hasLiveFunnel) {
			console.log(`ℹ️ [DEPLOYMENT BLOCKED] Cannot deploy funnel - another funnel is already live: "${liveFunnelCheck.liveFunnelName}"`);
			throw new Error(`Funnel "${liveFunnelCheck.liveFunnelName}" is currently live for this experience.`);
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
						resource: {
							columns: {
								id: true,
								name: true,
								type: true,
								category: true,
								link: true,
								code: true,
								description: true,
								whopProductId: true,
								productApps: true, // Explicitly select productApps
							},
						},
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
			console.log(`🔍 [DEBUG] Raw funnel resources from DB:`, existingFunnel.funnelResources.map((fr: any) => ({
				name: fr.resource.name,
				hasProductApps: !!fr.resource.productApps,
				productAppsValue: fr.resource.productApps,
				productAppsType: typeof fr.resource.productApps,
				productAppsKeys: fr.resource.productApps ? Object.keys(fr.resource.productApps) : 'none',
				productAppsLength: fr.resource.productApps ? (Array.isArray(fr.resource.productApps) ? fr.resource.productApps.length : Object.keys(fr.resource.productApps).length) : 0
			})));
			
			const resourcesForAI = existingFunnel.funnelResources.map((fr: any) => ({
				id: fr.resource.id,
				name: fr.resource.name,
				type: fr.resource.type,
				category: fr.resource.category,
				link: fr.resource.link,
				code: fr.resource.code || "",
				productApps: fr.resource.productApps || undefined,
			}));

			// Send progress update
			// Real-time notifications moved to React hooks

			// Generate new flow using AI
			const generatedFlow = await generateFunnelFlow(resourcesForAI);

			// Resolve placeholders in the generated flow
			const resolvedFlow = await resolveFunnelFlowPlaceholders(generatedFlow, user.experience.id);

			// Send progress update
			// Real-time notifications moved to React hooks

			// Update funnel with new flow
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

		// Get overall funnel analytics (1 record per funnel)
		const funnelAnalyticsData = await db.query.funnelAnalytics.findFirst({
			where: eq(funnelAnalytics.funnelId, funnelId),
		});

		// Get resource-specific analytics
		const resourceAnalytics = await db.query.funnelResourceAnalytics.findMany({
			where: eq(funnelResourceAnalytics.funnelId, funnelId),
			with: {
				resource: true
			}
		});

		// Calculate totals from funnel analytics
		const funnelData = funnelAnalyticsData || {
			totalStarts: 0,
			totalIntent: 0,
			totalConversions: 0,
			totalAffiliateRevenue: "0",
			totalProductRevenue: "0",
			totalInterest: 0,
			todayStarts: 0,
			todayIntent: 0,
			todayConversions: 0,
			todayAffiliateRevenue: "0",
			todayProductRevenue: "0",
			todayInterest: 0,
			startsGrowthPercent: "0",
			intentGrowthPercent: "0",
			conversionsGrowthPercent: "0",
			interestGrowthPercent: "0"
		};

		const totals = {
			// Overall metrics
			totalStarts: funnelData.totalStarts || 0,
			totalIntent: funnelData.totalIntent || 0,
			totalConversions: funnelData.totalConversions || 0,
			totalAffiliateRevenue: parseFloat(funnelData.totalAffiliateRevenue || '0'),
			totalProductRevenue: parseFloat(funnelData.totalProductRevenue || '0'),
			totalRevenue: parseFloat(funnelData.totalAffiliateRevenue || '0') + parseFloat(funnelData.totalProductRevenue || '0'),
			totalInterest: funnelData.totalInterest || 0,
			// Today's metrics
			todayStarts: funnelData.todayStarts || 0,
			todayIntent: funnelData.todayIntent || 0,
			todayConversions: funnelData.todayConversions || 0,
			todayAffiliateRevenue: parseFloat(funnelData.todayAffiliateRevenue || '0'),
			todayProductRevenue: parseFloat(funnelData.todayProductRevenue || '0'),
			todayRevenue: parseFloat(funnelData.todayAffiliateRevenue || '0') + parseFloat(funnelData.todayProductRevenue || '0'),
			todayInterest: funnelData.todayInterest || 0,
			// Growth percentages
			startsGrowthPercent: parseFloat(funnelData.startsGrowthPercent || '0'),
			intentGrowthPercent: parseFloat(funnelData.intentGrowthPercent || '0'),
			conversionsGrowthPercent: parseFloat(funnelData.conversionsGrowthPercent || '0'),
			interestGrowthPercent: parseFloat(funnelData.interestGrowthPercent || '0')
		};

		// Calculate resource-specific totals
		const resourceTotals = resourceAnalytics.reduce((acc: any, record: any) => ({
			totalResourceClicks: acc.totalResourceClicks + (record.totalResourceClicks || 0),
			totalResourceConversions: acc.totalResourceConversions + (record.totalResourceConversions || 0),
			totalResourceRevenue: acc.totalResourceRevenue + parseFloat(record.totalResourceRevenue || '0'),
			todayResourceClicks: acc.todayResourceClicks + (record.todayResourceClicks || 0),
			todayResourceConversions: acc.todayResourceConversions + (record.todayResourceConversions || 0),
			todayResourceRevenue: acc.todayResourceRevenue + parseFloat(record.todayResourceRevenue || '0')
		}), {
			totalResourceClicks: 0,
			totalResourceConversions: 0,
			totalResourceRevenue: 0,
			todayResourceClicks: 0,
			todayResourceConversions: 0,
			todayResourceRevenue: 0
		});

		return {
			funnel: {
				id: existingFunnel.id,
				name: existingFunnel.name,
				isDeployed: existingFunnel.isDeployed,
			},
			analytics: funnelData,
			resourceAnalytics: resourceAnalytics,
			totals: {
				...totals,
				...resourceTotals
			},
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
 * Internal function to perform the actual resource assignment
 * This function is called by the queue system to ensure sequential processing
 */
async function _addResourceToFunnelInternal(
	user: AuthenticatedUser,
	funnelId: string,
	resourceId: string,
): Promise<FunnelWithResources> {
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
}

/**
 * Add a resource to a funnel (queued to prevent race conditions)
 * This function uses a queue system to ensure assignments are processed sequentially
 * for each user/experience combination, preventing race conditions and limit violations.
 */
export async function addResourceToFunnel(
	user: AuthenticatedUser,
	funnelId: string,
	resourceId: string,
): Promise<FunnelWithResources> {
	try {
		// Use the queue system to ensure sequential processing
		return await resourceAssignmentQueue.queueAssignment(
			user.id,
			user.experience.id,
			funnelId,
			resourceId,
			(funnelId: string, resourceId: string) => 
				_addResourceToFunnelInternal(user, funnelId, resourceId)
		);
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
