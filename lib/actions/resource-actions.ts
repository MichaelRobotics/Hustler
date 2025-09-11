import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import { funnelResources, funnels, resources } from "../supabase/schema";
import { GLOBAL_LIMITS } from "../types/resource";
import { whopSdk } from "../whop-sdk";

export interface CreateResourceInput {
	name: string;
	type: "AFFILIATE" | "MY_PRODUCTS";
	category: "PAID" | "FREE_VALUE";
	link: string;
	code?: string;
	description?: string;
	whopProductId?: string; // For MY_PRODUCTS sync
}

export interface UpdateResourceInput {
	name?: string;
	type?: "AFFILIATE" | "MY_PRODUCTS";
	category?: "PAID" | "FREE_VALUE";
	link?: string;
	code?: string;
	description?: string;
	whopProductId?: string;
}

export interface ResourceWithFunnels {
	id: string;
	name: string;
	type: "AFFILIATE" | "MY_PRODUCTS";
	category: "PAID" | "FREE_VALUE";
	link: string;
	code?: string;
	promoCode?: string; // Frontend compatibility field
	description?: string;
	whopProductId?: string;
	createdAt: Date;
	updatedAt: Date;
	funnels: Array<{
		id: string;
		name: string;
		isDeployed: boolean;
	}>;
}

export interface ResourceListResponse {
	resources: ResourceWithFunnels[];
	total: number;
	page: number;
	limit: number;
}

export interface WhopProduct {
	id: string;
	name: string;
	description?: string;
	price?: number;
	currency?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Create a new resource
 */
export async function createResource(
	user: AuthenticatedUser,
	input: CreateResourceInput,
): Promise<ResourceWithFunnels> {
	try {
		// Check global product limit before creating
		const existingResourcesCount = await db
			.select({ count: count() })
			.from(resources)
			.where(
				and(
					eq(resources.experienceId, user.experience.id),
					eq(resources.userId, user.id),
				),
			);

		if (existingResourcesCount[0].count >= GLOBAL_LIMITS.PRODUCTS) {
			throw new Error(
				`Cannot create product: limit reached (max ${GLOBAL_LIMITS.PRODUCTS} products per account)`,
			);
		}

		// Validate WHOP product ID if provided
		// Note: WHOP SDK products API might not be available in current version
		if (input.type === "MY_PRODUCTS" && input.whopProductId) {
			// For now, just validate that the product ID is not empty
			if (!input.whopProductId.trim()) {
				throw new Error("WHOP product ID cannot be empty");
			}
		}

		// Create the resource
		const [newResource] = await db
			.insert(resources)
			.values({
				experienceId: user.experienceId,
				userId: user.id,
				name: input.name,
				type: input.type,
				category: input.category,
				link: input.link,
				code: input.code || null,
				description: input.description || null,
				whopProductId: input.whopProductId || null,
			})
			.returning();

		// Return resource with empty funnels array
		return {
			id: newResource.id,
			name: newResource.name,
			type: newResource.type,
			category: newResource.category,
			link: newResource.link,
			code: newResource.code || undefined,
			promoCode: newResource.code || undefined, // Map code to promoCode for frontend compatibility
			description: newResource.description || undefined,
			whopProductId: newResource.whopProductId || undefined,
			createdAt: newResource.createdAt,
			updatedAt: newResource.updatedAt,
			funnels: [],
		};
	} catch (error) {
		console.error("Error creating resource:", error);
		throw new Error("Failed to create resource");
	}
}

/**
 * Get resource by ID with funnels
 */
export async function getResourceById(
	user: AuthenticatedUser,
	resourceId: string,
): Promise<ResourceWithFunnels> {
	try {
		const resource = await db.query.resources.findFirst({
			where: and(
				eq(resources.id, resourceId),
				eq(resources.experienceId, user.experience.id),
			),
			with: {
				funnelResources: {
					with: {
						funnel: true,
					},
				},
			},
		});

		if (!resource) {
			throw new Error("Resource not found");
		}

		// Check access permissions
		if (user.accessLevel === "customer" && resource.userId !== user.id) {
			throw new Error("Access denied: You can only access your own resources");
		}

		return {
			id: resource.id,
			name: resource.name,
			type: resource.type,
			category: resource.category,
			link: resource.link,
			code: resource.code || undefined,
			promoCode: resource.code || undefined, // Map code to promoCode for frontend compatibility
			description: resource.description || undefined,
			whopProductId: resource.whopProductId || undefined,
			createdAt: resource.createdAt,
			updatedAt: resource.updatedAt,
			funnels: resource.funnelResources.map((fr: any) => ({
				id: fr.funnel.id,
				name: fr.funnel.name,
				isDeployed: fr.funnel.isDeployed,
			})),
		};
	} catch (error) {
		console.error("Error getting resource:", error);
		throw error;
	}
}

/**
 * Get all resources for user/company with pagination
 */
export async function getResources(
	user: AuthenticatedUser,
	page = 1,
	limit = 10,
	search?: string,
	type?: "AFFILIATE" | "MY_PRODUCTS",
	category?: "PAID" | "FREE_VALUE",
): Promise<ResourceListResponse> {
	try {
		const offset = (page - 1) * limit;

		// Build where conditions
		let whereConditions = eq(resources.experienceId, user.experience.id);

		// Add user filter for customers
		if (user.accessLevel === "customer") {
			whereConditions = and(whereConditions, eq(resources.userId, user.id))!;
		}

		// Add search filter
		if (search) {
			whereConditions = and(
				whereConditions,
				sql`${resources.name} ILIKE ${"%" + search + "%"}`,
			)!;
		}

		// Add type filter
		if (type) {
			whereConditions = and(whereConditions, eq(resources.type, type))!;
		}

		// Add category filter
		if (category) {
			whereConditions = and(whereConditions, eq(resources.category, category))!;
		}

		// Get total count
		const [totalResult] = await db
			.select({ count: count() })
			.from(resources)
			.where(whereConditions);

		const total = totalResult.count;

		// First get the resources with pagination
		const paginatedResources = await db
			.select()
			.from(resources)
			.where(whereConditions)
			.orderBy(desc(resources.updatedAt))
			.limit(limit)
			.offset(offset);

		// Then get funnels for these resources
		const resourceIds = paginatedResources.map((r: any) => r.id);
		const resourcesWithFunnelsRaw = await db
			.select({
				resource: resources,
				funnel: funnels,
				funnelResource: funnelResources,
			})
			.from(resources)
			.leftJoin(funnelResources, eq(resources.id, funnelResources.resourceId))
			.leftJoin(funnels, eq(funnelResources.funnelId, funnels.id))
			.where(inArray(resources.id, resourceIds));

		// Group funnels by resource
		const resourceMap = new Map<string, ResourceWithFunnels>();

		resourcesWithFunnelsRaw.forEach((row: any) => {
			const resource = row.resource;
			const funnel = row.funnel;

			if (!resourceMap.has(resource.id)) {
				resourceMap.set(resource.id, {
					id: resource.id,
					name: resource.name,
					type: resource.type,
					category: resource.category,
					link: resource.link,
					code: resource.code || undefined,
					promoCode: resource.code || undefined, // Map code to promoCode for frontend compatibility
					description: resource.description || undefined,
					whopProductId: resource.whopProductId || undefined,
					createdAt: resource.createdAt,
					updatedAt: resource.updatedAt,
					funnels: [],
				});
			}

			// Add funnel if it exists and not already added
			if (
				funnel &&
				!resourceMap.get(resource.id)!.funnels.some((f) => f.id === funnel.id)
			) {
				resourceMap.get(resource.id)!.funnels.push({
					id: funnel.id,
					name: funnel.name,
					isDeployed: funnel.isDeployed,
				});
			}
		});

		const resourcesWithFunnels: ResourceWithFunnels[] = Array.from(
			resourceMap.values(),
		);

		return {
			resources: resourcesWithFunnels,
			total,
			page,
			limit,
		};
	} catch (error) {
		console.error("Error getting resources:", error);
		throw new Error("Failed to get resources");
	}
}

/**
 * Update resource
 */
export async function updateResource(
	user: AuthenticatedUser,
	resourceId: string,
	input: UpdateResourceInput,
): Promise<ResourceWithFunnels> {
	try {
		// Check if resource exists and user has access
		const existingResource = await db.query.resources.findFirst({
			where: and(
				eq(resources.id, resourceId),
				eq(resources.experienceId, user.experience.id),
			),
		});

		if (!existingResource) {
			throw new Error("Resource not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			existingResource.userId !== user.id
		) {
			throw new Error("Access denied: You can only update your own resources");
		}

		// Validate WHOP product ID if provided
		// Note: WHOP SDK products API might not be available in current version
		if (input.type === "MY_PRODUCTS" && input.whopProductId) {
			// For now, just validate that the product ID is not empty
			if (!input.whopProductId.trim()) {
				throw new Error("WHOP product ID cannot be empty");
			}
		}

		// Update resource
		const [updatedResource] = await db
			.update(resources)
			.set({
				name: input.name || existingResource.name,
				type: input.type || existingResource.type,
				category: input.category || existingResource.category,
				link: input.link || existingResource.link,
				code: input.code !== undefined ? input.code : existingResource.code,
				description:
					input.description !== undefined
						? input.description
						: existingResource.description,
				whopProductId:
					input.whopProductId !== undefined
						? input.whopProductId
						: existingResource.whopProductId,
				updatedAt: new Date(),
			})
			.where(eq(resources.id, resourceId))
			.returning();

		// Return updated resource with funnels
		return await getResourceById(user, resourceId);
	} catch (error) {
		console.error("Error updating resource:", error);
		throw error;
	}
}

/**
 * Delete resource
 */
export async function deleteResource(
	user: AuthenticatedUser,
	resourceId: string,
): Promise<boolean> {
	try {
		// Check if resource exists and user has access
		const existingResource = await db.query.resources.findFirst({
			where: and(
				eq(resources.id, resourceId),
				eq(resources.experienceId, user.experience.id),
			),
		});

		if (!existingResource) {
			throw new Error("Resource not found");
		}

		// Check access permissions
		if (
			user.accessLevel === "customer" &&
			existingResource.userId !== user.id
		) {
			throw new Error("Access denied: You can only delete your own resources");
		}

		// Check if resource is used in any deployed funnels
		const deployedFunnels = await db.query.funnelResources.findMany({
			where: eq(funnelResources.resourceId, resourceId),
			with: {
				funnel: true,
			},
		});

		const isUsedInDeployedFunnels = deployedFunnels.some(
			(fr: any) => fr.funnel.isDeployed,
		);

		if (isUsedInDeployedFunnels) {
			throw new Error(
				"Cannot delete resource: It is currently used in deployed funnels",
			);
		}

		// Delete resource (cascade will handle related records)
		await db.delete(resources).where(eq(resources.id, resourceId));

		return true;
	} catch (error) {
		console.error("Error deleting resource:", error);
		throw error;
	}
}

/**
 * Sync WHOP products to resources
 * Note: This is a placeholder implementation since WHOP SDK products API might not be available
 */
export async function syncWhopProducts(
	user: AuthenticatedUser,
): Promise<{
	synced: number;
	created: number;
	updated: number;
	errors: string[];
}> {
	try {
		// For now, return empty result since WHOP SDK products API is not available
		// In a real implementation, you would:
		// 1. Get all WHOP products for the company
		// 2. Create/update resources based on the products
		// 3. Handle errors appropriately

		console.log(
			"WHOP products sync not implemented - SDK products API not available",
		);

		return {
			synced: 0,
			created: 0,
			updated: 0,
			errors: [
				"WHOP products sync not implemented - SDK products API not available",
			],
		};
	} catch (error) {
		console.error("Error syncing WHOP products:", error);
		throw new Error("Failed to sync WHOP products");
	}
}

/**
 * Get WHOP products available for sync
 * Note: This is a placeholder implementation since WHOP SDK products API might not be available
 */
export async function getWhopProducts(
	user: AuthenticatedUser,
): Promise<WhopProduct[]> {
	try {
		// For now, return empty array since WHOP SDK products API is not available
		// In a real implementation, you would fetch products from WHOP API

		console.log(
			"WHOP products fetch not implemented - SDK products API not available",
		);

		return [];
	} catch (error) {
		console.error("Error getting WHOP products:", error);
		throw new Error("Failed to get WHOP products");
	}
}

/**
 * Bulk delete resources
 */
export async function bulkDeleteResources(
	user: AuthenticatedUser,
	resourceIds: string[],
): Promise<{ deleted: number; errors: string[] }> {
	try {
		if (resourceIds.length === 0) {
			return { deleted: 0, errors: [] };
		}

		// Verify all resources belong to user's company
		const userResources = await db.query.resources.findMany({
			where: and(
				eq(resources.experienceId, user.experience.id),
				inArray(resources.id, resourceIds),
			),
		});

		if (userResources.length !== resourceIds.length) {
			throw new Error(
				"Some resources do not exist or belong to different company",
			);
		}

		// Check access permissions for customers
		if (user.accessLevel === "customer") {
			const unauthorizedResources = userResources.filter(
				(r: any) => r.userId !== user.id,
			);
			if (unauthorizedResources.length > 0) {
				throw new Error(
					"Access denied: You can only delete your own resources",
				);
			}
		}

		// Check if any resources are used in deployed funnels
		const deployedFunnels = await db.query.funnelResources.findMany({
			where: inArray(funnelResources.resourceId, resourceIds),
			with: {
				funnel: true,
			},
		});

		const usedInDeployedFunnels = deployedFunnels.filter(
			(fr: any) => fr.funnel.isDeployed,
		);

		if (usedInDeployedFunnels.length > 0) {
			const resourceNames = usedInDeployedFunnels.map(
				(fr: any) => fr.resourceId,
			);
			throw new Error(
				`Cannot delete resources: Some are currently used in deployed funnels`,
			);
		}

		// Delete resources
		await db.delete(resources).where(inArray(resources.id, resourceIds));

		return {
			deleted: resourceIds.length,
			errors: [],
		};
	} catch (error) {
		console.error("Error bulk deleting resources:", error);
		throw error;
	}
}

/**
 * Assign resources to funnel
 */
export async function assignResourcesToFunnel(
	user: AuthenticatedUser,
	funnelId: string,
	resourceIds: string[],
): Promise<boolean> {
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
			throw new Error("Access denied: You can only modify your own funnels");
		}

		// Verify all resources belong to user's company
		if (resourceIds.length > 0) {
			const userResources = await db.query.resources.findMany({
				where: and(
					eq(resources.experienceId, user.experience.id),
					inArray(resources.id, resourceIds),
				),
			});

			if (userResources.length !== resourceIds.length) {
				throw new Error(
					"Some resources do not exist or belong to different company",
				);
			}
		}

		// Remove existing resource assignments
		await db
			.delete(funnelResources)
			.where(eq(funnelResources.funnelId, funnelId));

		// Add new resource assignments
		if (resourceIds.length > 0) {
			const funnelResourceValues = resourceIds.map((resourceId) => ({
				funnelId: funnelId,
				resourceId: resourceId,
			}));

			await db.insert(funnelResources).values(funnelResourceValues);
		}

		return true;
	} catch (error) {
		console.error("Error assigning resources to funnel:", error);
		throw error;
	}
}
