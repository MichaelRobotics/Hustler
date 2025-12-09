import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import { funnelResources, funnels, resources } from "../supabase/schema";
import { GLOBAL_LIMITS } from "../types/resource";
import { whopSdk } from "../whop-sdk";

export interface CreateResourceInput {
	name: string;
	type: "LINK" | "FILE";
	category: "PAID" | "FREE_VALUE";
	link?: string;
	code?: string;
	description?: string;
	whopProductId?: string; // For Whop product sync
	productApps?: string[]; // Array of app names associated with this product
	price?: string; // Price from access pass plan or user input
	image?: string; // Link to icon of app/product/digital resource image
	storageUrl?: string; // Link that triggers digital asset upload
	productImages?: string[]; // Array of up to 3 product image URLs for FILE type products
	displayOrder?: number; // Order for displaying resources in Market Stall
}

export interface UpdateResourceInput {
	name?: string;
	type?: "LINK" | "FILE";
	category?: "PAID" | "FREE_VALUE";
	link?: string;
	code?: string;
	description?: string;
	whopProductId?: string;
	price?: string; // Price from access pass plan or user input
	image?: string; // Link to icon of app/product/digital resource image
	storageUrl?: string; // Link that triggers digital asset upload
	productImages?: string[]; // Array of up to 3 product image URLs for FILE type products
	displayOrder?: number; // Order for displaying resources in Market Stall
}

export interface ResourceWithFunnels {
	id: string;
	name: string;
	type: "LINK" | "FILE";
	category: "PAID" | "FREE_VALUE";
	link?: string;
	code?: string;
	promoCode?: string; // Frontend compatibility field
	description?: string;
	whopProductId?: string;
	productApps?: any; // JSON field for product apps data
	price?: string; // Price from access pass plan or user input
	image?: string; // Link to icon of app/product/digital resource image
	storageUrl?: string; // Link that triggers digital asset upload
	productImages?: string[]; // Array of up to 3 product image URLs for FILE type products
	displayOrder?: number; // Order for displaying resources in Market Stall
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
		// Trim whitespace from name
		const trimmedName = input.name.trim();
		
		// Validate that name is not empty after trimming
		if (!trimmedName) {
			throw new Error("Resource name cannot be empty");
		}
		
		// Check for duplicate name within the same experience
		const existingResourceWithSameName = await db.query.resources.findFirst({
			where: and(
				eq(resources.experienceId, user.experience.id),
				eq(resources.name, trimmedName)
			),
		});

		if (existingResourceWithSameName) {
			console.log(`⚠️ Skipping resource creation: Resource with name "${trimmedName}" already exists in experience ${user.experience.id}`);
			throw new Error(`Resource with name "${trimmedName}" already exists in this experience`);
		}

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
		if (input.whopProductId) {
			// For now, just validate that the product ID is not empty
			if (!input.whopProductId.trim()) {
				throw new Error("WHOP product ID cannot be empty");
			}
		}

		// Determine displayOrder: use provided value or set to max + 1
		let displayOrderValue = input.displayOrder;
		if (displayOrderValue === undefined) {
			// Get max displayOrder for this experience
			const maxOrderResult = await db
				.select({ max: sql<number>`MAX(${resources.displayOrder})` })
				.from(resources)
				.where(eq(resources.experienceId, user.experience.id));
			
			const maxOrder = maxOrderResult[0]?.max ?? 0;
			displayOrderValue = maxOrder + 1;
		}

		// Create the resource
		const [newResource] = await db
			.insert(resources)
			.values({
				experienceId: user.experience.id,
				userId: user.id,
				name: trimmedName,
				type: input.type,
				category: input.category,
				link: input.link || null,
				code: input.code || null,
				description: input.description || null,
				whopProductId: input.whopProductId || null,
				productApps: input.productApps || null,
				price: input.price || null,
				image: input.image || null,
				storageUrl: input.storageUrl || null,
				productImages: input.productImages && input.productImages.length > 0 ? input.productImages : null,
				displayOrder: displayOrderValue,
			})
			.returning();

		// Return resource with empty funnels array
		return {
			id: newResource.id,
			name: newResource.name,
			type: newResource.type,
			category: newResource.category,
			link: newResource.link || undefined,
			code: newResource.code || undefined,
			promoCode: newResource.code || undefined, // Map code to promoCode for frontend compatibility
			description: newResource.description || undefined,
			whopProductId: newResource.whopProductId || undefined,
			price: newResource.price || undefined,
			image: newResource.image || undefined,
			storageUrl: newResource.storageUrl || undefined,
			productImages: Array.isArray(newResource.productImages) ? newResource.productImages : undefined,
			displayOrder: newResource.displayOrder ?? undefined,
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
			link: resource.link || undefined,
			code: resource.code || undefined,
			promoCode: resource.code || undefined, // Map code to promoCode for frontend compatibility
			description: resource.description || undefined,
			whopProductId: resource.whopProductId || undefined,
			productApps: resource.productApps || undefined,
			image: resource.image || undefined,
			storageUrl: resource.storageUrl || undefined,
			productImages: Array.isArray(resource.productImages) ? resource.productImages : undefined,
			price: resource.price || undefined,
			displayOrder: resource.displayOrder ?? undefined,
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
		// Order by displayOrder ASC (NULLS LAST), then updatedAt DESC
		const paginatedResources = await db
			.select()
			.from(resources)
			.where(whereConditions)
			.orderBy(
				sql`${resources.displayOrder} ASC NULLS LAST`,
				desc(resources.updatedAt)
			)
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
					link: resource.link || undefined,
					code: resource.code || undefined,
					promoCode: resource.code || undefined, // Map code to promoCode for frontend compatibility
					description: resource.description || undefined,
					whopProductId: resource.whopProductId || undefined,
					productApps: resource.productApps || undefined,
					image: resource.image || undefined,
					storageUrl: resource.storageUrl || undefined,
					productImages: Array.isArray(resource.productImages) ? resource.productImages : undefined,
					price: resource.price || undefined,
					displayOrder: resource.displayOrder ?? undefined,
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
		if (input.whopProductId) {
			// For now, just validate that the product ID is not empty
			if (!input.whopProductId.trim()) {
				throw new Error("WHOP product ID cannot be empty");
			}
		}

		// Validate name if provided
		if (input.name !== undefined) {
			const trimmedName = input.name.trim();
			if (!trimmedName) {
				throw new Error("Resource name cannot be empty");
			}
			input.name = trimmedName;
		}

		// Update resource
		const [updatedResource] = await db
			.update(resources)
			.set({
				name: input.name || existingResource.name,
				type: input.type || existingResource.type,
				category: input.category || existingResource.category,
				link: input.link !== undefined ? input.link : existingResource.link,
				code: input.code !== undefined ? input.code : existingResource.code,
				description:
					input.description !== undefined
						? input.description
						: existingResource.description,
				whopProductId:
					input.whopProductId !== undefined
						? input.whopProductId
						: existingResource.whopProductId,
				image: input.image !== undefined ? input.image : existingResource.image,
				storageUrl: input.storageUrl !== undefined ? input.storageUrl : existingResource.storageUrl,
				productImages: input.productImages !== undefined 
					? (input.productImages && input.productImages.length > 0 ? input.productImages : null)
					: existingResource.productImages,
				price: input.price !== undefined ? input.price : existingResource.price,
				displayOrder: input.displayOrder !== undefined ? input.displayOrder : existingResource.displayOrder,
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
		// Import the WhopProductSync class
		const { WhopProductSync } = await import("../sync/whop-product-sync");
		const sync = new WhopProductSync();
		
		// Perform the sync
		const result = await sync.syncCompanyProducts(user);
		
		return {
			synced: result.synced,
			created: result.created,
			updated: result.updated,
			errors: result.errors.map(err => err.error),
		};
	} catch (error) {
		console.error("Error syncing WHOP products:", error);
		return {
			synced: 0,
			created: 0,
			updated: 0,
			errors: [error instanceof Error ? error.message : 'Unknown error'],
		};
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
