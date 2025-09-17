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

		// Get Whop API client
		const whopClient = getWhopApiClient();

		// Step 1: Get owner's business products from discovery page
		console.log("🏪 Fetching owner's business products...");
		const businessProducts = await whopClient.getCompanyProducts(companyId);
		console.log(`Found ${businessProducts.length} business products`);

		// Step 2: Determine funnel name and get funnel product
		const funnelName = whopClient.determineFunnelName(businessProducts);
		const funnelProduct = whopClient.getFunnelProduct(businessProducts);
		
		console.log(`🎯 Funnel will be named: "${funnelName}"`);
		if (funnelProduct) {
			console.log(`🎯 Funnel product: ${funnelProduct.title} (${funnelProduct.includedApps.length} apps included)`);
		}

		// Step 3: Create funnel with smart naming using proper action
		console.log("📊 Creating funnel...");
		const funnel = await createFunnel({ id: userId, experience: { id: experienceId } } as any, {
			name: funnelName,
			description: `Funnel for ${funnelName}`,
			resources: [] // Will assign resources after creation
		});

		console.log(`✅ Created funnel: ${funnel.name} (ID: ${funnel.id})`);

		// Step 4: Create resources and collect their IDs
		const resourceIds: string[] = [];
		
		// Create FREE apps from funnel product only
		console.log("📱 Creating FREE apps from funnel product...");
		if (funnelProduct && funnelProduct.includedApps.length > 0) {
			// Get app details for each included app
			const allApps = await whopClient.getInstalledApps(companyId);
			const funnelApps = allApps.filter(app => funnelProduct.includedApps.includes(app.id));
			
			console.log(`Found ${funnelApps.length} apps included in funnel product`);
			
			for (const app of funnelApps) {
				const resource = await createResource({ id: userId, experience: { id: experienceId } } as any, {
					name: app.name || app.description || `App ${app.id}`,
					type: "MY_PRODUCTS",
					category: "FREE_VALUE",
					link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
					description: app.description,
					whopProductId: app.id
				});
				
				resourceIds.push(resource.id);
				console.log(`✅ Created FREE resource for app: ${app.name || app.id}`);
			}
		} else {
			console.log(`⚠️ No apps found in funnel product or no funnel product`);
		}

		// Create PAID products as upsells (excluding funnel product)
		console.log("💳 Creating PAID products for upselling...");
		const upsellProducts = whopClient.getUpsellProducts(businessProducts, funnelProduct?.id || '');
		console.log(`Found ${upsellProducts.length} upsell products`);
		
		for (const product of upsellProducts) {
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
		}

		// Step 5: Assign all resources to the funnel
		if (resourceIds.length > 0) {
			console.log(`🔗 Assigning ${resourceIds.length} resources to funnel...`);
			for (const resourceId of resourceIds) {
				await addResourceToFunnel({ id: userId, experience: { id: experienceId } } as any, funnel.id, resourceId);
			}
			console.log(`✅ Assigned ${resourceIds.length} resources to funnel`);
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
