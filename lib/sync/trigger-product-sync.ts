import { db } from "@/lib/supabase/db-server";
import { resources, users, experiences, funnels } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { createResource } from "@/lib/actions/resource-actions";
import { createFunnel, addResourceToFunnel } from "@/lib/actions/funnel-actions";

/**
 * Trigger product sync for a new admin user
 * This function is called when a new admin user is created for an experience
 */
export async function triggerProductSyncForNewAdmin(
	userId: string,
	experienceId: string,
	companyId: string
): Promise<void> {
	try {
		console.log(`🔄 Triggering smart upselling sync for new admin user ${userId} in experience ${experienceId}`);
		console.log(`📊 Company ID: ${companyId}`);
		console.log(`🔧 Function called at: ${new Date().toISOString()}`);

		// Check if products have already been synced for this experience
		const existingResources = await db.select()
			.from(resources)
			.where(
				and(
					eq(resources.experienceId, experienceId),
					eq(resources.type, "MY_PRODUCTS")
				)
			)
			.limit(1);

		if (existingResources.length > 0) {
			console.log(`✅ Products already synced for experience ${experienceId}, skipping sync`);
			// Mark user as synced even though we didn't sync (already done)
			await db.update(users)
				.set({ productsSynced: true })
				.where(eq(users.id, userId));
			return;
		}

		console.log(`🚀 Starting smart upselling sync for experience ${experienceId}`);

		// Get user's Whop user ID from database
		console.log("🔧 Getting user's Whop user ID...");
		const userRecord = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { whopUserId: true }
		});

		if (!userRecord) {
			throw new Error(`User not found: ${userId}`);
		}

		const whopUserId = userRecord.whopUserId;
		console.log(`✅ Found Whop user ID: ${whopUserId}`);

		// Get Whop API client with proper multi-tenant context
		console.log("🔧 Getting Whop API client...");
		const whopClient = getWhopApiClient(companyId, whopUserId);
		console.log("✅ Whop API client created with proper multi-tenant context");

		// Step 1: Get owner's business products from discovery page
		console.log("🏪 Fetching owner's discovery page products...");
		let discoveryProducts;
		try {
			discoveryProducts = await whopClient.getCompanyProducts();
			console.log(`✅ Found ${discoveryProducts.length} discovery page products`);
		} catch (error) {
			console.error("❌ Error fetching discovery page products:", error);
			throw new Error(`Failed to fetch discovery page products: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		// Step 2: Determine funnel name and get funnel product from discovery page
		const funnelName = whopClient.determineFunnelName(discoveryProducts);
		const funnelProduct = whopClient.getFunnelProduct(discoveryProducts);
		
		console.log(`🎯 Funnel will be named: "${funnelName}"`);
		if (funnelProduct) {
			console.log(`🎯 Funnel product: ${funnelProduct.title} (${funnelProduct.includedApps.length} apps included)`);
			console.log(`🔍 Funnel product includedApps:`, funnelProduct.includedApps);
		} else {
			console.log(`⚠️ No funnel product found!`);
		}

		// Step 3: Create funnel with smart naming using proper action
		console.log("📊 Creating funnel...");
		let funnel;
		try {
			funnel = await createFunnel({ id: userId, experience: { id: experienceId } } as any, {
				name: funnelName,
				description: `Funnel for ${funnelName}`,
				resources: [] // Will assign resources after creation
			});
			console.log(`✅ Created funnel: ${funnel.name} (ID: ${funnel.id})`);
		} catch (error) {
			console.error("❌ Error creating funnel:", error);
			throw new Error(`Failed to create funnel: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		// Step 4: Create resources and collect their IDs
		const resourceIds: string[] = [];
		
		// Create FREE apps from funnel product's included apps
		// Note: The funnel product itself is excluded from FREE resources to avoid duplication
		console.log("📱 Creating FREE apps from funnel product's included apps...");
		if (funnelProduct && funnelProduct.includedApps.length > 0) {
			console.log(`🔍 Funnel product has ${funnelProduct.includedApps.length} included apps:`, funnelProduct.includedApps);
			console.log(`⚠️ Funnel product itself (${funnelProduct.id}) is excluded from FREE resources`);
			
			// Create FREE resources for each included app
			for (const appId of funnelProduct.includedApps) {
				try {
					console.log(`🔍 Creating FREE resource for app ID: ${appId}`);
					
					const resource = await createResource({ id: userId, experience: { id: experienceId } } as any, {
						name: `App ${appId}`,
						type: "MY_PRODUCTS",
						category: "FREE_VALUE",
						link: `https://whop.com/hub/${companyId}/${appId}?ref=${experienceId}`,
						description: `Free access to app ${appId}`,
						whopProductId: appId
					});
					
					resourceIds.push(resource.id);
					console.log(`✅ Created FREE resource for app: ${appId}`);
				} catch (error) {
					console.error(`❌ Error creating FREE resource for app ${appId}:`, error);
				}
			}
			
			console.log(`✅ Created ${funnelProduct.includedApps.length} FREE resources from funnel product's included apps`);
		} else {
			console.log(`⚠️ No apps found in funnel product or no funnel product`);
		}

		// Create PAID products as upsells (excluding funnel product)
		console.log("💳 Creating PAID products for upselling...");
		const upsellProducts = whopClient.getUpsellProducts(discoveryProducts, funnelProduct?.id || '');
		console.log(`Found ${upsellProducts.length} upsell products`);
		
		for (const product of upsellProducts) {
			try {
				const cheapestPlan = whopClient.getCheapestPlan(product);
				const planParam = cheapestPlan ? `?plan=${cheapestPlan.id}&ref=${experienceId}` : `?ref=${experienceId}`;
				
				const resource = await createResource({ id: userId, experience: { id: experienceId } } as any, {
					name: product.title,
					type: "MY_PRODUCTS",
					category: "PAID",
					link: `https://whop.com/hub/${companyId}/products/${product.id}${planParam}`,
					description: product.description,
					whopProductId: product.id
				});
				
				resourceIds.push(resource.id);
				console.log(`✅ Created PAID resource for product: ${product.title}`);
			} catch (error) {
				console.error(`❌ Error creating PAID resource for product ${product.id}:`, error);
			}
		}

		// Step 5: Assign all resources to the funnel
		if (resourceIds.length > 0) {
			console.log(`🔗 Assigning ${resourceIds.length} resources to funnel...`);
			try {
				for (const resourceId of resourceIds) {
					try {
						await addResourceToFunnel({ id: userId, experience: { id: experienceId } } as any, funnel.id, resourceId);
					} catch (error) {
						console.error(`❌ Error assigning resource ${resourceId} to funnel:`, error);
					}
				}
				console.log(`✅ Assigned ${resourceIds.length} resources to funnel`);
			} catch (error) {
				console.error("❌ Error assigning resources to funnel:", error);
			}
		}

		// Step 6: Mark user as synced
		await db.update(users)
			.set({ productsSynced: true })
			.where(eq(users.id, userId));

		const freeCount = funnelProduct?.includedApps.length || 0;
		console.log(`🎉 Smart upselling sync completed for experience ${experienceId}:`);
		console.log(`   - Funnel: "${funnelName}"`);
		console.log(`   - FREE apps: ${freeCount}`);
		console.log(`   - PAID upsells: ${upsellProducts.length}`);

	} catch (error) {
		console.error("❌ Error during smart upselling sync:", error);
		// Don't mark as synced if there was an error
		throw error;
	}
}

/**
 * Check if products need to be synced for a user
 */
export async function shouldSyncProductsForUser(userId: string): Promise<boolean> {
	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				accessLevel: true,
				productsSynced: true
			}
		});

		if (!user) {
			return false;
		}

		// Only sync for admin users who haven't been synced yet
		return user.accessLevel === "admin" && !user.productsSynced;
	} catch (error) {
		console.error("Error checking if products should be synced:", error);
		return false;
	}
}
