import { db } from "@/lib/supabase/db-server";
import { resources, users, experiences } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { createResource } from "@/lib/actions/resource-actions";
import { whopSdk } from "@/lib/whop-sdk";
import { whopNativeTrackingService } from "@/lib/analytics/whop-native-tracking";

// App type classification based on name patterns
function classifyAppType(appName: string): 'earn' | 'learn' | 'community' | 'other' {
  const name = appName.toLowerCase();
  
  // Learning/Educational apps
  if (name.includes('course') || name.includes('learn') || name.includes('education') || 
      name.includes('tutorial') || name.includes('training') || name.includes('guide')) {
    return 'learn';
  }
  
  // Earning/Monetization apps
  if (name.includes('earn') || name.includes('money') || name.includes('revenue') || 
      name.includes('profit') || name.includes('income') || name.includes('rewards') || 
      name.includes('bounties') || name.includes('giveaway') || name.includes('discount')) {
    return 'earn';
  }
  
  // Community/Social apps
  if (name.includes('chat') || name.includes('community') || name.includes('social') || 
      name.includes('discord') || name.includes('forum') || name.includes('livestream') || 
      name.includes('clip') || name.includes('site') || name.includes('list')) {
    return 'community';
  }
  
  // Free/Utility apps
  if (name.includes('free') || name.includes('utility') || name.includes('tool')) {
    return 'other';
  }
  
  return 'other';
}

/**
 * Trigger product sync for a new admin user
 * This function is called when a new admin user is created for an experience
 */
export async function triggerProductSyncForNewAdmin(
	userId: string,
	experienceId: string,
	companyId: string
): Promise<void> {
		// Enhanced progress tracking
		const syncState = {
			startTime: Date.now(),
			phase: 'initializing',
			progress: 0,
			totalSteps: 5,
			completedSteps: 0,
			errors: [] as string[],
			successCounts: {
				freeResources: 0,
				paidResources: 0
			}
		};

	// Enhanced keepalive with progress reporting
	const globalKeepAlive = setInterval(() => {
		const elapsed = Math.round((Date.now() - syncState.startTime) / 1000);
		console.log(`[PRODUCT-SYNC] 💓 Global Keepalive: Product sync in progress... Phase: ${syncState.phase}, Progress: ${syncState.progress}%, Elapsed: ${elapsed}s`);
	}, 5000); // Every 5 seconds for more frequent updates

	// Helper function to classify apps by name (fallback when marketplace category is not available)
	const classifyAppByName = (appName: string): string => {
		const name = appName.toLowerCase();
		
		// Learning/Educational apps
		if (name.includes('course') || name.includes('learn') || name.includes('education') || 
			name.includes('tutorial') || name.includes('training') || name.includes('study') ||
			name.includes('academy') || name.includes('school') || name.includes('university')) {
			return 'learn';
		}
		
		// Earning/Monetization apps
		if (name.includes('earn') || name.includes('money') || name.includes('profit') || 
			name.includes('business') || name.includes('revenue') || name.includes('income') ||
			name.includes('trading') || name.includes('investment') || name.includes('finance')) {
			return 'earn';
		}
		
		// Community/Social apps
		if (name.includes('community') || name.includes('social') || name.includes('chat') || 
			name.includes('forum') || name.includes('group') || name.includes('network') ||
			name.includes('discord') || name.includes('telegram') || name.includes('slack')) {
			return 'community';
		}
		
		// Default to 'other' if no category matches
		return 'other';
	};

	// Progress update helper
	const updateProgress = (phase: string, stepCompleted: boolean = false) => {
		syncState.phase = phase;
		if (stepCompleted) {
			syncState.completedSteps++;
		}
		syncState.progress = Math.round((syncState.completedSteps / syncState.totalSteps) * 100);
		console.log(`[PRODUCT-SYNC] 📊 Progress Update: ${phase} - ${syncState.progress}% (${syncState.completedSteps}/${syncState.totalSteps})`);
	};

	// Circuit breaker for external API calls
	const circuitBreaker = {
		failures: 0,
		lastFailureTime: 0,
		state: 'closed' as 'closed' | 'open' | 'half-open',
		threshold: 3,
		timeout: 60000, // 1 minute

		canExecute(): boolean {
			if (this.state === 'closed') return true;
			if (this.state === 'open') {
				if (Date.now() - this.lastFailureTime > this.timeout) {
					this.state = 'half-open';
					return true;
				}
				return false;
			}
			return true; // half-open
		},

		onSuccess(): void {
			this.failures = 0;
			this.state = 'closed';
		},

		onFailure(): void {
			this.failures++;
			this.lastFailureTime = Date.now();
			if (this.failures >= this.threshold) {
				this.state = 'open';
			}
		}
	};
	
	try {
		console.log(`[PRODUCT-SYNC] 🔄 Triggering smart upselling sync for new admin user ${userId} in experience ${experienceId}`);
		console.log(`[PRODUCT-SYNC] 📊 Company ID: ${companyId}`);
		console.log(`[PRODUCT-SYNC] 🔧 Function called at: ${new Date().toISOString()}`);

		// Check database connection health before starting
		updateProgress("checking_database_health");
		console.log("🔍 Checking database connection health...");
		try {
			await db.select().from(users).limit(1);
			console.log("✅ Database connection healthy");
		} catch (dbError) {
			console.error("❌ Database connection failed:", dbError);
			syncState.errors.push("Database connection failed");
			throw new Error("Database connection failed - cannot proceed with sync");
		}

		// Check if products have already been synced for this experience
		// Use a more comprehensive check to prevent race conditions
		console.log("🔍 Checking for existing sync state...");
		
		// Check for existing resources
		const existingResources = await db.select()
			.from(resources)
			.where(
				and(
					eq(resources.experienceId, experienceId),
					eq(resources.type, "MY_PRODUCTS")
				)
			)
			.limit(1);

		// Check if user is already synced
		const existingUserRecord = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { productsSynced: true }
		});

		if (existingResources.length > 0 || existingUserRecord?.productsSynced) {
			console.log(`✅ Products already synced for experience ${experienceId}, skipping sync`);
			console.log(`   - Resources: ${existingResources.length}`);
			console.log(`   - User synced: ${existingUserRecord?.productsSynced}`);
			
			// Mark user as synced even though we didn't sync (already done)
			await db.update(users)
				.set({ productsSynced: true })
				.where(eq(users.id, userId));
			return;
		}

		// Add a small delay to prevent race conditions
		await new Promise(resolve => setTimeout(resolve, 100));

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

		// Get the Whop experience ID for the current app
		console.log("🔧 Getting Whop experience ID for current app...");
		const currentExperience = await db.query.experiences.findFirst({
			where: eq(experiences.id, experienceId),
			columns: { whopExperienceId: true }
		});
		
		if (!currentExperience) {
			throw new Error(`Experience not found: ${experienceId}`);
		}
		
		const currentWhopExperienceId = currentExperience.whopExperienceId;
		console.log(`✅ Current Whop experience ID: ${currentWhopExperienceId}`);

		// Step 1: Get owner's business products from discovery page
		updateProgress("fetching_discovery_products");
		console.log("🏪 Fetching owner's discovery page products...");
		let discoveryProducts: any[] = [];
		try {
			if (!circuitBreaker.canExecute()) {
				console.log("⚠️ Circuit breaker is open, skipping discovery products fetch");
				discoveryProducts = [];
				syncState.errors.push("Circuit breaker open - discovery products fetch skipped");
			} else {
				// Add timeout to entire discovery products fetch
				const discoveryTimeout = 60000; // 60 seconds total
				discoveryProducts = await Promise.race([
					whopClient.getCompanyProducts(),
					new Promise<never>((_, reject) => 
						setTimeout(() => reject(new Error(`Discovery products fetch timeout after ${discoveryTimeout}ms`)), discoveryTimeout)
					)
				]);
				circuitBreaker.onSuccess();
			console.log(`✅ Found ${discoveryProducts.length} discovery page products`);
			}
		} catch (error) {
			circuitBreaker.onFailure();
			console.error("❌ Error fetching discovery page products:", error);
			syncState.errors.push(`Discovery products fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			console.log("⚠️ Continuing sync with empty discovery products...");
			discoveryProducts = []; // Fallback to empty array
		}

		// Step 2: Skip funnel product identification (not needed for PAID resources)

		// Step 3: Create discovery products first (PAID/FREE)
		updateProgress("creating_discovery_resources");
		console.log("💳 Creating discovery products (PAID/FREE)...");
		const upsellProducts = discoveryProducts; // Use all discovery products as upsells
		console.log(`Found ${upsellProducts.length} discovery products to use as upsells`);
		
		// Limit discovery products to maximum 6
		const maxDiscoveryProducts = 6;
		const limitedDiscoveryProducts = upsellProducts.slice(0, maxDiscoveryProducts);
		if (upsellProducts.length > maxDiscoveryProducts) {
			console.log(`⚠️ Limiting discovery products to ${maxDiscoveryProducts} (found ${upsellProducts.length}, using first ${maxDiscoveryProducts})`);
		}
		
		if (limitedDiscoveryProducts.length > 0) {
			console.log(`🔍 Processing ${limitedDiscoveryProducts.length} discovery products...`);
			
			// Process discovery products in batches for better performance and error handling
			const batchSize = 3; // Process 3 products at a time
			let successCount = 0;
			let errorCount = 0;
			
			for (let i = 0; i < limitedDiscoveryProducts.length; i += batchSize) {
				const batch = limitedDiscoveryProducts.slice(i, i + batchSize);
				console.log(`🔍 Processing discovery products batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(limitedDiscoveryProducts.length/batchSize)} (${batch.length} products)`);
				
				// Process batch in parallel with individual error handling and retry logic
				const batchPromises = batch.map(async (product) => {
					// Determine category based on product price/free status
					const productCategory = product.isFree || product.price === 0 ? "FREE_VALUE" : "PAID";
					
					try {
						const cheapestPlan = whopClient.getCheapestPlan(product);
						
						// Generate product link for paid products (affiliate tracking added later in funnel navigation)
						let trackingUrl: string;
						
						// Use discovery page URL directly (affiliate tracking added later)
						if (product.discoveryPageUrl) {
							trackingUrl = product.discoveryPageUrl;
							console.log(`✅ Using discovery page URL: ${trackingUrl}`);
						} else {
							// Fallback to simple checkout link
							trackingUrl = whopNativeTrackingService.createSimpleCheckoutLink(cheapestPlan?.id || product.id);
							console.log(`✅ Using fallback checkout link: ${trackingUrl}`);
						}
						
						const resource = await retryDatabaseOperation(
							() => createResource({ id: userId, experience: { id: experienceId } } as any, {
								name: product.title,
								type: "MY_PRODUCTS",
								category: productCategory,
								link: trackingUrl, // Product link (affiliate tracking added later in funnel navigation)
								description: product.description,
								whopProductId: product.id
							}),
							`createResource-${productCategory}-${product.title}`
						);
						
						console.log(`✅ Created ${productCategory} resource for product: ${product.title}`);
						successCount++;
						if (productCategory === "FREE_VALUE") {
							syncState.successCounts.freeResources++;
						} else {
							syncState.successCounts.paidResources++;
						}
					} catch (error) {
						console.error(`❌ Error creating ${productCategory} resource for product ${product.id}:`, error);
						errorCount++;
						return null;
					}
				});
				
				const batchResults = await Promise.all(batchPromises);
				const successfulResults = batchResults.filter(id => id !== null);
				console.log(`✅ Completed discovery products batch: ${successfulResults.length}/${batch.length} successful`);
				
				// Small delay between batches to prevent overwhelming the system
				if (i + batchSize < limitedDiscoveryProducts.length) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}
			
			console.log(`✅ Created ${successCount} resources from discovery products (${errorCount} errors)`);
			updateProgress("discovery_resources_completed", true);
		} else {
			console.log(`⚠️ No discovery products found`);
			updateProgress("discovery_resources_skipped", true);
		}

		// Step 4: Create FREE apps from installed apps second
		updateProgress("creating_free_resources");
		console.log("📱 Creating FREE apps from installed apps...");
		try {
			// Add timeout to installed apps fetch
			const installedAppsTimeout = 45000; // 45 seconds total
			const installedApps = await Promise.race([
				whopClient.getInstalledApps(),
				new Promise<never>((_, reject) => 
					setTimeout(() => reject(new Error(`Installed apps fetch timeout after ${installedAppsTimeout}ms`)), installedAppsTimeout)
				)
			]);
			console.log(`🔍 Found ${installedApps.length} installed apps`);
			
			// Filter out current app and get app categories from Whop SDK
			console.log(`🔍 Excluding apps with Whop experience ID: ${currentWhopExperienceId} (current app)`);
			
			const availableApps: typeof installedApps = [];
			
			for (const app of installedApps) {
				if (!app.experienceId) {
					console.log(`⚠️ App "${app.name}" has no experienceId, skipping`);
					continue;
				}
				
				// Skip apps that have the same Whop experience ID as the current app
				if (app.experienceId === currentWhopExperienceId) {
					console.log(`🚫 Skipping app "${app.name}" - same Whop experience ID as current app (${currentWhopExperienceId})`);
					
					// Generate and store the app link for the current experience
					try {
						const appLink = whopClient.generateAppUrl(app, undefined, true);
						console.log(`🔗 Generated app link for current experience: ${appLink}`);
						
						// Store the link in the experience table
						await db.update(experiences)
							.set({
								link: appLink,
								updatedAt: new Date()
							})
							.where(eq(experiences.id, experienceId));
						
						console.log(`✅ Stored app link in experience table: ${appLink}`);
					} catch (error) {
						console.error(`❌ Error generating/storing app link for current experience:`, error);
					}
					
					continue;
				}
				
				// Get app category from Whop SDK
				try {
					const appResult = await whopSdk.apps.getApp({
						appId: app.id,
						companyId: companyId
					});
					
					console.log(`🔍 DEBUG: App "${app.name}" getApp result:`, JSON.stringify(appResult, null, 2));
					
					// Check if accessPass exists and has marketplaceCategory
					const accessPass = appResult?.app?.accessPass;
					console.log(`🔍 DEBUG: App "${app.name}" accessPass:`, JSON.stringify(accessPass, null, 2));
					
					if (accessPass && accessPass.marketplaceCategory) {
						app.category = accessPass.marketplaceCategory.name.toLowerCase();
						console.log(`📱 App "${app.name}" category from marketplace: ${app.category}`);
						availableApps.push(app);
					} else {
						console.log(`⚠️ App "${app.name}" has no marketplace category, skipping`);
						console.log(`🔍 DEBUG: accessPass exists: ${!!accessPass}`);
						console.log(`🔍 DEBUG: marketplaceCategory exists: ${!!(accessPass && accessPass.marketplaceCategory)}`);
						if (accessPass) {
							console.log(`🔍 DEBUG: accessPass keys:`, Object.keys(accessPass));
						}
						continue;
					}
				} catch (error) {
					console.log(`⚠️ Error getting app category for "${app.name}":`, error);
					console.log(`⚠️ App "${app.name}" has no marketplace category, skipping`);
					continue;
				}
			}
			
			console.log(`🔍 Found ${availableApps.length} apps with valid categories (excluding current app)`);
			
			// Classify apps by categories
			const classifiedApps = {
				learn: availableApps.filter(app => app.category === 'learn'),
				earn: availableApps.filter(app => app.category === 'earn'),
				community: availableApps.filter(app => app.category === 'community'),
				other: availableApps.filter(app => app.category === 'other')
			};
		
			console.log(`📊 App classification results:`);
			console.log(`  - Learning/Educational: ${classifiedApps.learn.length} apps`);
			console.log(`  - Earning/Monetization: ${classifiedApps.earn.length} apps`);
			console.log(`  - Community/Social: ${classifiedApps.community.length} apps`);
			console.log(`  - Other: ${classifiedApps.other.length} apps`);
			
			// Apply selection hierarchy for 6 FREE apps (2 per category)
			const maxFreeApps = 6;
			const selectedApps: typeof availableApps = [];
		
		// 1. Learning/Educational - 2 apps if available
		if (classifiedApps.learn.length > 0) {
			const learnApps = classifiedApps.learn.slice(0, 2);
			selectedApps.push(...learnApps);
			console.log(`✅ Selected ${learnApps.length} Learning apps: ${learnApps.map(app => app.name).join(', ')}`);
		}
		
		// 2. Earning/Monetization - 2 apps if available
		if (classifiedApps.earn.length > 0) {
			const earnApps = classifiedApps.earn.slice(0, 2);
			selectedApps.push(...earnApps);
			console.log(`✅ Selected ${earnApps.length} Earning apps: ${earnApps.map(app => app.name).join(', ')}`);
		}
		
		// 3. Community/Social - 2 apps if available
		if (classifiedApps.community.length > 0) {
			const communityApps = classifiedApps.community.slice(0, 2);
			selectedApps.push(...communityApps);
			console.log(`✅ Selected ${communityApps.length} Community apps: ${communityApps.map(app => app.name).join(', ')}`);
		}
		
		// 4. Other - 2 apps if available
		if (classifiedApps.other.length > 0) {
			const otherApps = classifiedApps.other.slice(0, 2);
			selectedApps.push(...otherApps);
			console.log(`✅ Selected ${otherApps.length} Other apps: ${otherApps.map(app => app.name).join(', ')}`);
		}
		
		console.log(`📱 Processing ${selectedApps.length} FREE apps (max ${maxFreeApps}) with category-based selection`);
		
		if (selectedApps.length > 0) {
			// Create FREE resources for each selected app (with batching for performance)
			const batchSize = 10; // Process 10 apps at a time (increased for better performance)
			let successCount = 0;
			let errorCount = 0;
			
			for (let i = 0; i < selectedApps.length; i += batchSize) {
				const batch = selectedApps.slice(i, i + batchSize);
				console.log(`🔍 Processing FREE apps batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(selectedApps.length/batchSize)} (${batch.length} apps)`);
				
				// Process batch in parallel with individual error handling and retry logic
				const batchPromises = batch.map(async (app) => {
					try {
						console.log(`🔍 Creating FREE resource for app: ${app.name} (${app.id})`);
						// Use app URL with company route and experience ID
						// FREE apps don't need ref or affiliate parameters
						const directUrl = whopClient.generateAppUrl(app, undefined, true);
						
						console.log(`🔍 Resource data:`, {
							name: app.name,
							type: "MY_PRODUCTS",
							category: "FREE_VALUE",
							link: directUrl,
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
									link: directUrl,
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
						syncState.successCounts.freeResources++;
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
				console.log(`✅ Completed FREE resources batch: ${successfulResults.length}/${batch.length} successful`);
				
				// Small delay between batches to prevent overwhelming the system
				if (i + batchSize < selectedApps.length) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}
			
			console.log(`✅ Created ${successCount} FREE resources from installed apps (${errorCount} errors)`);
			updateProgress("free_resources_completed", true);
		} else {
			console.log(`⚠️ No apps found with valid categories`);
			updateProgress("free_resources_skipped", true);
		}
		} catch (error) {
			console.error(`❌ Error fetching installed apps:`, error);
			syncState.errors.push(`Installed apps fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			// Continue with sync even if installed apps fail
			console.log("⚠️ Continuing sync without installed apps...");
			updateProgress("free_resources_failed", true);
		}


		// Resources are now created in the library (no funnel assignment needed)

		// Step 5: Mark user as synced
		await db.update(users)
			.set({ productsSynced: true })
			.where(eq(users.id, userId));

		// Final progress update - mark all steps as completed
		syncState.completedSteps = syncState.totalSteps;
		syncState.progress = 100;
		console.log(`[PRODUCT-SYNC] 📊 Progress Update: sync_completed - 100% (${syncState.completedSteps}/${syncState.totalSteps})`);
		
		const totalElapsed = Math.round((Date.now() - syncState.startTime) / 1000);
		
		console.log(`[PRODUCT-SYNC] 🎉 Resource library sync completed for experience ${experienceId}:`);
		console.log(`[PRODUCT-SYNC]    - Total time: ${totalElapsed}s`);
		console.log(`[PRODUCT-SYNC]    - Progress: ${syncState.progress}%`);
		console.log(`[PRODUCT-SYNC]    - FREE apps: ${syncState.successCounts.freeResources}`);
		console.log(`[PRODUCT-SYNC]    - PAID upsells: ${syncState.successCounts.paidResources}`);
		
		if (syncState.errors.length > 0) {
			console.log(`[PRODUCT-SYNC] ⚠️ Errors encountered (${syncState.errors.length}):`);
			syncState.errors.forEach((error, index) => {
				console.log(`[PRODUCT-SYNC]    ${index + 1}. ${error}`);
			});
		}

	} catch (error) {
		console.error("[PRODUCT-SYNC] ❌ Error during smart upselling sync:", error);
		syncState.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		
		// Log final state even on error
		const totalElapsed = Math.round((Date.now() - syncState.startTime) / 1000);
		console.log(`[PRODUCT-SYNC] 💥 Sync failed after ${totalElapsed}s at ${syncState.progress}% progress`);
		console.log(`[PRODUCT-SYNC]    - Errors: ${syncState.errors.length}`);
		console.log(`[PRODUCT-SYNC]    - Success counts:`, syncState.successCounts);
		
		// Don't mark as synced if there was a critical error
		throw error;
	} finally {
		// Always clear the global keepalive interval
		clearInterval(globalKeepAlive);
		console.log("[PRODUCT-SYNC] 🧹 Cleaned up global keepalive mechanism");
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

