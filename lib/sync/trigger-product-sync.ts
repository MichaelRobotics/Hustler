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
	// Global keepalive mechanism to prevent serverless function idle timeout
	const globalKeepAlive = setInterval(() => {
		console.log("💓 Global Keepalive: Product sync in progress...");
	}, 10000); // Every 10 seconds
	
	try {
		console.log(`🔄 Triggering smart upselling sync for new admin user ${userId} in experience ${experienceId}`);
		console.log(`📊 Company ID: ${companyId}`);
		console.log(`🔧 Function called at: ${new Date().toISOString()}`);

		// Check database connection health before starting
		console.log("🔍 Checking database connection health...");
		try {
			await db.select().from(users).limit(1);
			console.log("✅ Database connection healthy");
		} catch (dbError) {
			console.error("❌ Database connection failed:", dbError);
			throw new Error("Database connection failed - cannot proceed with sync");
		}

		// Check if products have already been synced for this experience
		console.log("🔍 Checking for existing resources...");
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
			funnel = await retryDatabaseOperation(
				() => createFunnel({ id: userId, experience: { id: experienceId } } as any, {
					name: funnelName,
					description: `Funnel for ${funnelName}`,
					resources: [] // Will assign resources after creation
				}),
				"createFunnel"
			);
			console.log(`✅ Created funnel: ${funnel.name} (ID: ${funnel.id})`);
		} catch (error) {
			console.error("❌ Error creating funnel:", error);
			throw new Error(`Failed to create funnel: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		// Step 4: Create resources and collect their IDs
		const resourceIds: string[] = [];
		
		// Create FREE apps from installed apps
		console.log("📱 Creating FREE apps from installed apps...");
		try {
			const installedApps = await whopClient.getInstalledApps();
			console.log(`🔍 Found ${installedApps.length} installed apps`);
			
			if (installedApps.length > 0) {
				// Create FREE resources for each installed app (with batching for performance)
				const batchSize = 10; // Process 10 apps at a time (increased for better performance)
				let successCount = 0;
				let errorCount = 0;
				
				for (let i = 0; i < installedApps.length; i += batchSize) {
					const batch = installedApps.slice(i, i + batchSize);
					console.log(`🔍 Processing FREE apps batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(installedApps.length/batchSize)} (${batch.length} apps)`);
					
					// Process batch in parallel with individual error handling and retry logic
					const batchPromises = batch.map(async (app) => {
						try {
							console.log(`🔍 Creating FREE resource for app: ${app.name} (${app.id})`);
							console.log(`🔍 Resource data:`, {
								name: app.name,
								type: "MY_PRODUCTS",
								category: "FREE_VALUE",
								link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
								description: app.description || `Free access to ${app.name}`,
								whopProductId: app.id
							});
							
							const resource = await retryDatabaseOperation(
								() => {
									console.log(`🔍 Executing createResource for ${app.name}...`);
									return createResource({ id: userId, experience: { id: experienceId } } as any, {
										name: app.name,
										type: "MY_PRODUCTS",
										category: "FREE_VALUE",
										link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
										description: app.description || `Free access to ${app.name}`,
										whopProductId: app.id
									});
								},
								`createResource-FREE-${app.name}`,
								3, // maxRetries
								15000 // 15 second timeout
							);
							
							console.log(`✅ Created FREE resource for app: ${app.name} (ID: ${resource.id})`);
							successCount++;
							return resource.id;
						} catch (error) {
							console.error(`❌ Error creating FREE resource for app ${app.name}:`, error);
							errorCount++;
							return null;
						}
					});
					
					console.log(`🔍 Waiting for ${batch.length} FREE resource creations to complete...`);
					
					// Add timeout to entire batch processing
					const batchTimeout = 60000; // 60 seconds for entire batch
					const batchResults = await Promise.race([
						Promise.all(batchPromises),
						new Promise<null[]>((_, reject) => 
							setTimeout(() => reject(new Error(`FREE resources batch timeout after ${batchTimeout}ms`)), batchTimeout)
						)
					]).catch((error) => {
						console.error(`❌ FREE resources batch failed:`, error);
						return new Array(batch.length).fill(null); // Return nulls for failed batch
					});
					
					const successfulResults = batchResults.filter(id => id !== null);
					resourceIds.push(...successfulResults);
					console.log(`✅ Completed FREE resources batch: ${successfulResults.length}/${batch.length} successful`);
					
					// Small delay between batches to prevent overwhelming the system
					if (i + batchSize < installedApps.length) {
						await new Promise(resolve => setTimeout(resolve, 100));
					}
				}
				
				console.log(`✅ Created ${successCount} FREE resources from installed apps (${errorCount} errors)`);
			} else {
				console.log(`⚠️ No installed apps found for company`);
			}
		} catch (error) {
			console.error(`❌ Error fetching installed apps:`, error);
			// Continue with sync even if installed apps fail
			console.log("⚠️ Continuing sync without installed apps...");
		}

		// Create PAID products as upsells (excluding funnel product)
		console.log("💳 Creating PAID products for upselling...");
		const upsellProducts = whopClient.getUpsellProducts(discoveryProducts, funnelProduct?.id || '');
		console.log(`Found ${upsellProducts.length} upsell products`);
		
		if (upsellProducts.length > 0) {
			// Create PAID resources with batching for performance
			const batchSize = 10; // Process 10 products at a time (increased for better performance)
			let successCount = 0;
			let errorCount = 0;
			
			for (let i = 0; i < upsellProducts.length; i += batchSize) {
				const batch = upsellProducts.slice(i, i + batchSize);
				console.log(`🔍 Processing PAID products batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(upsellProducts.length/batchSize)} (${batch.length} products)`);
				
				// Process batch in parallel with individual error handling and retry logic
				const batchPromises = batch.map(async (product) => {
					try {
						const cheapestPlan = whopClient.getCheapestPlan(product);
						const planParam = cheapestPlan ? `?plan=${cheapestPlan.id}&ref=${experienceId}` : `?ref=${experienceId}`;
						
						const resource = await retryDatabaseOperation(
							() => createResource({ id: userId, experience: { id: experienceId } } as any, {
								name: product.title,
								type: "MY_PRODUCTS",
								category: "PAID",
								link: `https://whop.com/hub/${companyId}/products/${product.id}${planParam}`,
								description: product.description,
								whopProductId: product.id
							}),
							`createResource-PAID-${product.title}`
						);
						
						console.log(`✅ Created PAID resource for product: ${product.title}`);
						successCount++;
						return resource.id;
					} catch (error) {
						console.error(`❌ Error creating PAID resource for product ${product.id}:`, error);
						errorCount++;
						return null;
					}
				});
				
				const batchResults = await Promise.all(batchPromises);
				resourceIds.push(...batchResults.filter(id => id !== null));
				
				// Small delay between batches to prevent overwhelming the system
				if (i + batchSize < upsellProducts.length) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}
			
			console.log(`✅ Created ${successCount} PAID resources from upsell products (${errorCount} errors)`);
		}

		// Step 5: Assign all resources to the funnel
		if (resourceIds.length > 0) {
			console.log(`🔗 Assigning ${resourceIds.length} resources to funnel...`);
			try {
				// Assign resources in batches for better performance
				const assignmentBatchSize = 20; // Increased batch size for better performance
				let assignedCount = 0;
				
				for (let i = 0; i < resourceIds.length; i += assignmentBatchSize) {
					const batch = resourceIds.slice(i, i + assignmentBatchSize);
					console.log(`🔗 Assigning batch ${Math.floor(i/assignmentBatchSize) + 1}/${Math.ceil(resourceIds.length/assignmentBatchSize)} (${batch.length} resources)`);
					
					// Process assignments in parallel with retry logic
					const assignmentPromises = batch.map(async (resourceId) => {
						try {
							await retryDatabaseOperation(
								() => addResourceToFunnel({ id: userId, experience: { id: experienceId } } as any, funnel.id, resourceId),
								`addResourceToFunnel-${resourceId}`
							);
							return true;
						} catch (error) {
							console.error(`❌ Error assigning resource ${resourceId} to funnel:`, error);
							return false;
						}
					});
					
					const batchResults = await Promise.all(assignmentPromises);
					assignedCount += batchResults.filter(success => success).length;
					
					// Small delay between batches
					if (i + assignmentBatchSize < resourceIds.length) {
						await new Promise(resolve => setTimeout(resolve, 50));
					}
				}
				
				console.log(`✅ Assigned ${assignedCount}/${resourceIds.length} resources to funnel`);
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
	} finally {
		// Always clear the global keepalive interval
		clearInterval(globalKeepAlive);
		console.log("🧹 Cleaned up global keepalive mechanism");
	}
}

/**
 * Retry database operation with exponential backoff and timeout
 */
async function retryDatabaseOperation<T>(
	operation: () => Promise<T>,
	operationName: string,
	maxRetries: number = 3,
	timeoutMs: number = 20000 // 20 second timeout per attempt
): Promise<T> {
	let lastError: Error | null = null;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`🔄 ${operationName} attempt ${attempt}/${maxRetries} (timeout: ${timeoutMs}ms)`);
			
			// Add timeout to prevent hanging
			const result = await Promise.race([
				operation(),
				new Promise<never>((_, reject) => 
					setTimeout(() => reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)), timeoutMs)
				)
			]);
			
			console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
			return result;
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));
			console.error(`❌ ${operationName} failed on attempt ${attempt}:`, lastError.message);
			
			if (attempt < maxRetries) {
				const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
				console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}
	
	throw new Error(`${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
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
