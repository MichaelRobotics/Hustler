/**
 * WHOP Product Sync System
 *
 * Handles automatic synchronization of WHOP products with the local database.
 * Provides real-time updates via webhooks and conflict resolution.
 */

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type { AuthenticatedUser } from "../context/user-context";
import { db } from "../supabase/db-server";
import { experiences, resources, users } from "../supabase/schema";
import { getWhopApiClient, type WhopProduct as ApiWhopProduct } from "../whop-api-client";

export interface WhopProduct {
	id: string;
	title: string;
	description?: string;
	price: number;
	currency: string;
	model: 'free' | 'one-time' | 'recurring';
	includedApps: string[];
	plans: Array<{
		id: string;
		price: number;
		currency: string;
		title?: string;
	}>;
	visibility: 'archived' | 'hidden' | 'quick_link' | 'visible';
	status: "active" | "inactive" | "draft";
	category?: string;
	tags?: string[];
	imageUrl?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface SyncResult {
	success: boolean;
	synced: number;
	created: number;
	updated: number;
	errorCount: number;
	errors: Array<{
		productId: string;
		error: string;
	}>;
}

export interface SyncOptions {
	forceUpdate?: boolean;
	batchSize?: number;
	includeInactive?: boolean;
	onProgress?: (progress: number, message: string) => void;
}

export class WhopProductSync {
	private syncInProgress: Map<string, boolean> = new Map();
	private lastSyncTime: Map<string, Date> = new Map();

	/**
	 * Sync all products for an experience
	 */
	async syncCompanyProducts(
		user: AuthenticatedUser,
		options: SyncOptions = {},
	): Promise<SyncResult> {
		const experienceId = user.experienceId;
		const syncKey = `experience:${experienceId}`;

		// Prevent concurrent syncs for the same experience
		if (this.syncInProgress.get(syncKey)) {
			throw new Error("Sync already in progress for this experience");
		}

		this.syncInProgress.set(syncKey, true);

		try {
			// Send sync started notification
			// Real-time updates moved to React hooks

			const result: SyncResult = {
				success: true,
				synced: 0,
				created: 0,
				updated: 0,
				errorCount: 0,
				errors: [],
			};

			// Fetch products from WHOP API
			const whopProducts = await this.fetchWhopProducts(user, options);

			if (whopProducts.length === 0) {
				// Real-time updates moved to React hooks
				return result;
			}

			const batchSize = options.batchSize || 10;
			const totalBatches = Math.ceil(whopProducts.length / batchSize);

			// Process products in batches
			for (let i = 0; i < whopProducts.length; i += batchSize) {
				const batch = whopProducts.slice(i, i + batchSize);
				const batchNumber = Math.floor(i / batchSize) + 1;
				const progress = Math.round((batchNumber / totalBatches) * 100);

				// Update progress
				options.onProgress?.(
					progress,
					`Processing batch ${batchNumber}/${totalBatches}`
				);

				// Real-time updates moved to React hooks

				// Process batch
				for (const product of batch) {
					try {
					const syncResult = await this.syncProduct(
						user,
						product,
						options.forceUpdate,
					);
						result.synced++;

						if (syncResult.created) {
							result.created++;
						} else if (syncResult.updated) {
							result.updated++;
						}
					} catch (error) {
						result.errorCount++;
						result.errors.push({
							productId: product.id,
							error: error instanceof Error ? error.message : "Unknown error",
						});
					}
				}

				// Small delay between batches to avoid rate limiting
				if (i + batchSize < whopProducts.length) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}

			// Update last sync time
			this.lastSyncTime.set(syncKey, new Date());

			// Send completion notification
			// Real-time updates moved to React hooks

			return result;
		} catch (error) {
			// Real-time updates moved to React hooks

			throw error;
		} finally {
			this.syncInProgress.set(syncKey, false);
		}
	}

	/**
	 * Sync a single product
	 */
	async syncProduct(
		user: AuthenticatedUser,
		whopProduct: WhopProduct,
		forceUpdate = false,
	): Promise<{ created: boolean; updated: boolean }> {
		try {
			// Check if product already exists
			const existingResource = await db.query.resources.findFirst({
				where: and(
					eq(resources.whopProductId, whopProduct.id),
					eq(resources.experienceId, user.experience.id), // Use database UUID
				),
			});

			const resourceData = {
				name: whopProduct.title,
				type: "LINK" as const,
				category: this.determineCategory(whopProduct),
				link: this.generateProductLink(whopProduct.id),
				description: whopProduct.description || null,
				whopProductId: whopProduct.id,
				updatedAt: new Date(),
			};

			if (existingResource) {
				// Check if update is needed
				const needsUpdate =
					forceUpdate ||
					existingResource.name !== whopProduct.title ||
					existingResource.description !== (whopProduct.description || null) ||
					existingResource.category !== this.determineCategory(whopProduct);

				if (needsUpdate) {
					await db
						.update(resources)
						.set(resourceData)
						.where(eq(resources.id, existingResource.id));

					return { created: false, updated: true };
				}

				return { created: false, updated: false };
			} else {
				// Create new resource
				await db.insert(resources).values({
					...resourceData,
					experienceId: user.experience.id, // Use database UUID
					userId: user.id,
					createdAt: new Date(),
				});

				return { created: true, updated: false };
			}
		} catch (error) {
			console.error("Error syncing product:", error);
			throw error;
		}
	}

	/**
	 * Fetch products from WHOP API
	 */
	private async fetchWhopProducts(
		user: AuthenticatedUser,
		options: SyncOptions,
	): Promise<WhopProduct[]> {
		try {
				// Use new WhopApiClient to fetch company products
				const whopClient = getWhopApiClient(user.experience.whopCompanyId, user.whopUserId);
				const apiProducts = await whopClient.getCompanyProducts();

			// Transform API products to our format
			const whopProducts: WhopProduct[] = apiProducts.map((product: ApiWhopProduct) => ({
				id: product.id,
				title: product.title || "Unnamed Product",
				description: product.description,
				price: product.price || 0,
				currency: product.currency || 'usd',
				model: product.model || 'free',
				includedApps: product.includedApps || [],
				plans: product.plans || [],
				visibility: product.visibility || 'visible',
				status: (product.status as "active" | "inactive" | "draft") || "active",
				category: product.category,
				tags: product.tags || [],
				imageUrl: product.imageUrl,
				createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
				updatedAt: product.updatedAt ? new Date(product.updatedAt) : new Date(),
			}));

			// Filter by status if needed
			if (!options.includeInactive) {
				return whopProducts.filter((p) => p.status === "active");
			}

			return whopProducts;
		} catch (error) {
			console.error("Error fetching WHOP products:", error);
			throw new Error(
				`Failed to fetch products from WHOP: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Determine resource category based on product data
	 */
	private determineCategory(product: WhopProduct): "PAID" | "FREE_VALUE" {
		if (product.price && product.price > 0) {
			return "PAID";
		}
		return "FREE_VALUE";
	}

	/**
	 * Generate product link
	 */
	private generateProductLink(productId: string): string {
		return `https://whop.com/products/${productId}`;
	}

	/**
	 * Handle webhook updates from WHOP
	 */
	async handleWebhookUpdate(
		companyId: string,
		webhookData: any,
	): Promise<void> {
		try {
			const { event, data } = webhookData;

			switch (event) {
				case "product.created":
				case "product.updated":
					await this.handleProductWebhook(companyId, data, event);
					break;
				case "product.deleted":
					await this.handleProductDeletion(companyId, data);
					break;
				default:
					console.log("Unhandled webhook event:", event);
			}
		} catch (error) {
			console.error("Error handling webhook update:", error);
		}
	}

	/**
	 * Handle product webhook events
	 */
	private async handleProductWebhook(
		companyId: string,
		productData: any,
		event: string,
	): Promise<void> {
		try {
			// Find the experience
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopCompanyId, companyId),
			});

			if (!experience) {
				console.log("Experience not found for webhook:", companyId);
				return;
			}

			// Find a user from this experience to use for sync
			const user = await db.query.users.findFirst({
				where: eq(users.experienceId, experience.id),
			});

			if (!user) {
				console.log("No users found for experience:", companyId);
				return;
			}

			const whopProduct: WhopProduct = {
				id: productData.id,
				title: productData.title || "Unnamed Product",
				description: productData.description,
				price: productData.price || 0,
				currency: productData.currency || 'usd',
				model: productData.model || 'free',
				includedApps: productData.includedApps || [],
				plans: productData.plans || [],
				visibility: productData.visibility || 'visible',
				status: productData.status || "active",
				category: productData.category,
				tags: productData.tags || [],
				imageUrl: productData.image_url,
				createdAt: new Date(productData.created_at),
				updatedAt: new Date(productData.updated_at),
			};

			await this.syncProduct(user, whopProduct, true);

			console.log(`Product ${event} handled successfully:`, productData.id);
		} catch (error) {
			console.error("Error handling product webhook:", error);
		}
	}

	/**
	 * Handle product deletion webhook
	 */
	private async handleProductDeletion(
		companyId: string,
		productData: any,
	): Promise<void> {
		try {
			// Find the experience
			const experience = await db.query.experiences.findFirst({
				where: eq(experiences.whopCompanyId, companyId),
			});

			if (!experience) {
				console.log("Experience not found for webhook:", companyId);
				return;
			}

			// Find and delete the resource
			const resource = await db.query.resources.findFirst({
				where: and(
					eq(resources.whopProductId, productData.id),
					eq(resources.experienceId, experience.id),
				),
			});

			if (resource) {
				await db.delete(resources).where(eq(resources.id, resource.id));
				console.log("Product deleted successfully:", productData.id);
			}
		} catch (error) {
			console.error("Error handling product deletion:", error);
		}
	}

	/**
	 * Get sync status for an experience
	 */
	async getSyncStatus(companyId: string): Promise<{
		lastSync?: Date;
		isSyncing: boolean;
		totalProducts: number;
		syncedProducts: number;
	}> {
		const syncKey = `experience:${companyId}`;

		// Count total products from WHOP
		let totalProducts = 0;
		try {
			// Note: This function doesn't have user context, so we can't make API calls
			// For now, we'll skip the API call and return 0
			console.warn("getSyncStatus called without user context - skipping API call");
			totalProducts = 0;
		} catch (error) {
			console.error("Error counting WHOP products:", error);
		}

		// Count synced products
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopCompanyId, companyId),
		});

		let syncedProducts = 0;
		if (experience) {
			const synced = await db.query.resources.findMany({
				where: and(
					eq(resources.experienceId, experience.id),
					isNotNull(resources.whopProductId),
				),
			});
			syncedProducts = synced.length;
		}

		return {
			lastSync: this.lastSyncTime.get(syncKey),
			isSyncing: this.syncInProgress.get(syncKey) || false,
			totalProducts: 0, // TODO: Calculate actual total
			syncedProducts: 0, // TODO: Calculate actual synced
		};
	}

	/**
	 * Bulk import existing products
	 */
	async bulkImportProducts(
		user: AuthenticatedUser,
		products: Array<{
			name: string;
			description?: string;
			link: string;
			category: "PAID" | "FREE_VALUE";
			code?: string;
		}>,
	): Promise<{ created: number; errors: number }> {
		let created = 0;
		let errors = 0;

		for (const product of products) {
			try {
				await db.insert(resources).values({
					experienceId: user.experienceId,
					userId: user.id,
					name: product.name,
					type: "LINK",
					category: product.category,
					link: product.link,
					code: product.code || null,
					description: product.description || null,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				created++;
			} catch (error) {
				console.error("Error importing product:", error);
				errors++;
			}
		}

		return { created, errors };
	}
}

// Export singleton instance
export const whopProductSync = new WhopProductSync();

// Export types
// Types are already exported above
