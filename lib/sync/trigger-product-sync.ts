
import { db } from "@/lib/supabase/db-server";
import { resources, users, experiences } from "@/lib/supabase/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { createResource } from "@/lib/actions/resource-actions";
import { whopSdk } from "@/lib/whop-sdk";
import { whopNativeTrackingService } from "@/lib/analytics/whop-native-tracking";
import { updateProductSync } from "./index";
import { createOriginTemplateFromProduct, shouldCreateOriginTemplate } from "@/lib/services/origin-template-service";

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
			totalSteps: 6,
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
		console.log(`[PRODUCT-SYNC] � Global Keepalive: Product sync in progress... Phase: ${syncState.phase}, Progress: ${syncState.progress}%, Elapsed: ${elapsed}s`);
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
		console.log(`[PRODUCT-SYNC] � Progress Update: ${phase} - ${syncState.progress}% (${syncState.completedSteps}/${syncState.totalSteps})`);
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
		console.log(`[PRODUCT-SYNC] � Triggering smart upselling sync for new admin user ${userId} in experience ${experienceId}`);
		console.log(`[PRODUCT-SYNC] � Company ID: ${companyId}`);
		console.log(`[PRODUCT-SYNC] � Function called at: ${new Date().toISOString()}`);

		// Check for updates first if user already has products synced
		const existingUserRecord = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { productsSynced: true }
		});

		if (existingUserRecord?.productsSynced) {
			console.log(`[PRODUCT-SYNC] � User already has products synced, checking for updates first...`);
			
			try {
				// Get user context for update sync
				const { getUserContext } = await import('../context/user-context');
				const userContext = await getUserContext(userId, companyId, experienceId, false);
				
				if (userContext) {
					const updateResult = await updateProductSync.checkForUpdates(userContext.user);
					
					if (updateResult.hasChanges) {
						console.log(`[PRODUCT-SYNC] ⚠️ Updates detected:`, {
							created: updateResult.summary.created,
							updated: updateResult.summary.updated,
							deleted: updateResult.summary.deleted,
							total: updateResult.summary.total,
						});
						
						// Store update result for frontend to display
						// Note: In a real implementation, you might want to store this in a database table
						// or use a real-time notification system
						console.log(`[PRODUCT-SYNC] ℹ️ Update sync completed - changes will be shown in frontend popup`);
					} else {
						console.log(`[PRODUCT-SYNC] ✅ No updates detected - products are up to date`);
					}
				}
			} catch (updateError) {
				console.error(`[PRODUCT-SYNC] ❌ Error checking for updates:`, updateError);
				// Continue with main sync even if update check fails
			}
		}

		// Check database connection health before starting
		updateProgress("checking_database_health");
		console.log("� Checking database connection health...");
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
		console.log("� Checking for existing sync state...");
		
		// Check for existing resources
		const existingResources = await db.select()
			.from(resources)
			.where(
				eq(resources.experienceId, experienceId)
			)
			.limit(1);

		// Check if user is already synced
		const userSyncRecord = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { productsSynced: true }
		});

		if (existingResources.length > 0 || userSyncRecord?.productsSynced) {
			console.log(`✅ Products already synced for experience ${experienceId}, skipping sync`);
			console.log(`   - Resources: ${existingResources.length}`);
			console.log(`   - User synced: ${userSyncRecord?.productsSynced}`);
			
			// Mark user as synced even though we didn't sync (already done)
			await db.update(users)
				.set({ productsSynced: true })
				.where(eq(users.id, userId));
			return;
		}

		// Add a small delay to prevent race conditions
		await new Promise(resolve => setTimeout(resolve, 100));

		console.log(`� Starting smart upselling sync for experience ${experienceId}`);

		// Get user's Whop user ID from database
		console.log("� Getting user's Whop user ID...");
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
		console.log("� Getting Whop API client...");
		const whopClient = getWhopApiClient(companyId, whopUserId);
		console.log("✅ Whop API client created with proper multi-tenant context");

		// Get the Whop experience ID for the current app
		console.log("� Getting Whop experience ID for current app...");
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
		console.log("� Fetching owner's discovery page products...");
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
		console.log("� Creating discovery products (PAID/FREE)...");
		const upsellProducts = discoveryProducts; // Use all discovery products as upsells
		console.log(`Found ${upsellProducts.length} discovery products to use as upsells`);
		
		// Separate PAID and FREE discovery products
		const paidProducts = upsellProducts.filter(product => !product.isFree && product.price > 0);
		const freeProducts = upsellProducts.filter(product => product.isFree || product.price === 0);
		
		console.log(`� Discovery products breakdown: ${paidProducts.length} PAID, ${freeProducts.length} FREE`);
		
		// Process all discovery products (no limits)
		const limitedDiscoveryProducts = [...paidProducts, ...freeProducts];
		
		if (limitedDiscoveryProducts.length > 0) {
			console.log(`� Processing ${limitedDiscoveryProducts.length} discovery products...`);
			
			// Process discovery products in batches for better performance and error handling
			const batchSize = 3; // Process 3 products at a time
			let successCount = 0;
			let errorCount = 0;
			
			for (let i = 0; i < limitedDiscoveryProducts.length; i += batchSize) {
				const batch = limitedDiscoveryProducts.slice(i, i + batchSize);
				console.log(`� Processing discovery products batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(limitedDiscoveryProducts.length/batchSize)} (${batch.length} products)`);
				
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
						
						// FREE discovery products start with empty product_apps array
						// They will be populated later by access pass processing
						const productApps = productCategory === "FREE_VALUE" ? [] : undefined;
						if (productApps) {
							console.log(`� FREE discovery product "${product.title.trim()}" starts with empty product_apps (will be populated by access pass processing)`);
						}
						
						// Fetch product image from Whop SDK galleryImages ONLY (no product.logo/bannerImage/imageUrl)
						const defaultPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
						let productImage = defaultPlaceholder;
						
						// Fetch product image from galleryImages using Whop SDK
						try {
							const productResult = await whopSdk.accessPasses.getAccessPass({
								accessPassId: product.id,
							});
							
							if (productResult.galleryImages?.nodes && productResult.galleryImages.nodes.length > 0) {
								const firstImage = productResult.galleryImages.nodes[0];
								if (firstImage?.source?.url) {
									productImage = firstImage.source.url;
									console.log(`✅ [TRIGGER-SYNC] Fetched product image from galleryImages for ${product.title}: ${productImage.substring(0, 50)}...`);
								} else {
									console.log(`⚠️ [TRIGGER-SYNC] galleryImages found but no source.url for ${product.title}, using placeholder`);
								}
							} else {
								console.log(`⚠️ [TRIGGER-SYNC] No galleryImages found for ${product.title}, using placeholder`);
							}
						} catch (imageError) {
							// Use placeholder if SDK fetch fails
							console.warn(`⚠️ [TRIGGER-SYNC] Failed to fetch product image for ${product.title}, using placeholder:`, imageError);
						}
						
						// Format price for database storage
						const formattedPrice = product.price > 0 ? product.price.toString() : null;
						
						// Skip products with empty names
						if (!product.title || !product.title.trim()) {
							console.log(`⚠️ Skipping product with empty name: ${product.id}`);
							return; // Skip this product
						}

						// Find purchase_url from product plans if available
						let purchaseUrl: string | undefined = undefined;
						if (cheapestPlan && product.plans) {
							const planWithUrl = product.plans.find((p: any) => p.id === cheapestPlan.id && p.purchase_url);
							purchaseUrl = planWithUrl?.purchase_url || undefined;
						}

						const resource = await retryDatabaseOperation(
							() => createResource({ id: userId, experience: { id: experienceId } } as any, {
								name: product.title.trim(),
								type: "LINK",
								category: productCategory,
								link: trackingUrl, // Product link (affiliate tracking added later in funnel navigation)
								description: product.description,
								whopProductId: product.id,
								productApps: productApps,
								// NEW: Add image and price data
								image: productImage,
								price: formattedPrice,
								// Add plan selection if cheapestPlan exists
								...(cheapestPlan ? {
									planId: cheapestPlan.id,
									purchaseUrl: purchaseUrl,
								} : {}),
							}),
							`createResource-${productCategory}-${product.title.trim()}`
						);
						
						console.log(`✅ Created ${productCategory} resource for product: ${product.title}`);
						successCount++;
						if (productCategory === "FREE_VALUE") {
							syncState.successCounts.freeResources++;
						} else {
							syncState.successCounts.paidResources++;
						}
					} catch (error) {
						// Handle duplicate name errors gracefully
						if (error instanceof Error && error.message.includes('already exists in this experience')) {
							console.log(`⚠️ Skipping ${productCategory} product "${product.title}" - already exists in experience`);
							return null; // Skip this product, don't count as error
						}
						
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

		// Step 4: Create FREE apps from installed apps second (separate from discovery products)
		updateProgress("creating_free_resources");
		console.log("� Creating FREE apps from installed apps (separate from discovery products)...");
		try {
			// Add timeout to installed apps fetch
			const installedAppsTimeout = 45000; // 45 seconds total
			const installedApps = await Promise.race([
				whopClient.getInstalledApps(),
				new Promise<never>((_, reject) => 
					setTimeout(() => reject(new Error(`Installed apps fetch timeout after ${installedAppsTimeout}ms`)), installedAppsTimeout)
				)
			]);
			console.log(`� Found ${installedApps.length} installed apps`);
			
			// Filter out current app and get app categories from Whop SDK
				console.log(`� Excluding apps with Whop experience ID: ${currentWhopExperienceId} (current app)`);
				
				const availableApps: typeof installedApps = [];
				
				for (const app of installedApps) {
					if (!app.experienceId) {
						console.log(`⚠️ App "${app.name}" has no experienceId, skipping`);
						continue;
					}
					
					// Skip apps that have the same Whop experience ID as the current app
					if (app.experienceId === currentWhopExperienceId) {
						console.log(`� Skipping app "${app.name}" - same Whop experience ID as current app (${currentWhopExperienceId})`);
						
						// Generate and store the app link for the current experience
						try {
							const appLink = whopClient.generateAppUrl(app, undefined, true);
							console.log(`� Generated app link for current experience: ${appLink}`);
							
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
					
				// Classify app using name-based keywords
				app.category = classifyAppByName(app.name);
				console.log(`� App "${app.name}" category from name-based classification: ${app.category}`);
						availableApps.push(app);
				}
				
			console.log(`� Found ${availableApps.length} apps with valid categories (excluding current app)`);
				
			// Classify apps by categories
				const classifiedApps = {
				learn: availableApps.filter(app => app.category === 'learn'),
				earn: availableApps.filter(app => app.category === 'earn'),
				community: availableApps.filter(app => app.category === 'community'),
				other: availableApps.filter(app => app.category === 'other')
				};
			
				console.log(`� App classification results:`);
				console.log(`  - Learning/Educational: ${classifiedApps.learn.length} apps`);
				console.log(`  - Earning/Monetization: ${classifiedApps.earn.length} apps`);
				console.log(`  - Community/Social: ${classifiedApps.community.length} apps`);
			console.log(`  - Other: ${classifiedApps.other.length} apps`);
			
			// Process all FREE apps (no limits)
			const freeDiscoveryCount = freeProducts.length;
			
			console.log(`� FREE resource allocation: ${freeDiscoveryCount} FREE discovery products, ${availableApps.length} remaining slots for FREE apps`);
			
			// Select all apps from all categories (no per-category limits)
			const selectedApps: typeof availableApps = [];
		
		// Select all apps from all categories (no limits)
		
		// Select all apps from all categories
		selectedApps.push(...classifiedApps.learn);
		
		selectedApps.push(...classifiedApps.earn);
		
		selectedApps.push(...classifiedApps.community);
		
		selectedApps.push(...classifiedApps.other);
		
		console.log(`� Processing ${selectedApps.length} FREE apps (no limits) with category-based selection`);
			
			if (selectedApps.length > 0) {
				// Create FREE resources for each selected app (with batching for performance)
				const batchSize = 10; // Process 10 apps at a time (increased for better performance)
				let successCount = 0;
				let errorCount = 0;
				
				for (let i = 0; i < selectedApps.length; i += batchSize) {
					const batch = selectedApps.slice(i, i + batchSize);
					console.log(`� Processing FREE apps batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(selectedApps.length/batchSize)} (${batch.length} apps)`);
					
					// Process batch in parallel with individual error handling and retry logic
					const batchPromises = batch.map(async (app) => {
						try {
							console.log(`� Creating FREE resource for app: ${app.name} (${app.id})`);
          // Use app URL with company route and experience ID
          // FREE apps don't need ref or affiliate parameters
          const directUrl = whopClient.generateAppUrl(app, undefined, true);
          
          // Get app logo or generate placeholder if not available
          const appImage = app.logo || app.bannerImage || 
            'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
          
          // Log image source for debugging
          if (app.logo) {
            console.log(`✅ Using app logo: ${app.logo}`);
          } else if (app.bannerImage) {
            console.log(`✅ Using app banner: ${app.bannerImage}`);
          } else {
            console.log(`⚠️ No app image found, using placeholder for ${app.name}`);
          }
							
							console.log(`� Resource data:`, {
								name: app.name,
								type: "MY_PRODUCTS",
								category: "FREE_VALUE",
								link: directUrl,
								description: app.description || `Free access to ${app.name}`,
								whopProductId: app.id,
								image: appImage
							});
							
							// Skip apps with empty names
							if (!app.name || !app.name.trim()) {
								console.log(`⚠️ Skipping app with empty name: ${app.id}`);
								return; // Skip this app
							}
							
							const resource = await retryDatabaseOperation(
								() => {
								console.log(`� Executing createResource for ${app.name.trim()}...`);
									return createResource({ id: userId, experience: { id: experienceId } } as any, {
									name: app.name.trim(),
						type: "LINK",
						category: "FREE_VALUE",
										link: directUrl,
									description: app.description || `Free access to ${app.name.trim()}`,
										whopProductId: app.id,
										// NEW: Add placeholder image for apps
										image: appImage
									});
								},
							`createResource-FREE-${app.name.trim()}`,
								3, // maxRetries
								15000 // 15 second timeout
							);
							
							console.log(`✅ Created FREE resource for app: ${app.name} (ID: ${resource.id})`);
						
							successCount++;
							syncState.successCounts.freeResources++;
						} catch (error) {
						// Handle duplicate name errors gracefully
						if (error instanceof Error && error.message.includes('already exists in this experience')) {
							console.log(`⚠️ Skipping FREE app "${app.name}" - already exists in experience`);
							return null; // Skip this app, don't count as error
						}
						
							console.error(`❌ Error creating FREE resource for app ${app.name}:`, error);
							errorCount++;
							return null;
						}
					});
					
					console.log(`� Waiting for ${batch.length} FREE resource creations to complete...`);
					
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
			
			// Efficiently process access passes for all selected FREE apps
			console.log(`� Processing access passes for ${selectedApps.length} FREE apps efficiently...`);
			
			// Get all resources in current experience once (instead of per app)
			const allExperienceResources = await db.select()
				.from(resources)
				.where(eq(resources.experienceId, experienceId));
			
			console.log(`� Found ${allExperienceResources.length} total resources in current experience`);
			
			// Process all apps in parallel for access passes
			const accessPassPromises = selectedApps.map(async (app) => {
				try {
					if (!app.experienceId) {
						console.log(`⚠️ App "${app.name}" has no experienceId, skipping access pass lookup`);
						return { app, accessPasses: [], appResource: null };
					}
					
					console.log(`� Getting access passes for app: ${app.name} (experienceId: ${app.experienceId})`);
					
					// Get access passes for this app's experience
					const accessPassesResult = await whopSdk.experiences.listAccessPassesForExperience({
						experienceId: app.experienceId
					});
					
					const accessPasses = accessPassesResult?.accessPasses || [];
					console.log(`� Found ${accessPasses.length} access passes for app ${app.name}:`, accessPasses.map(ap => ap.id));
					
					return {
						app,
						accessPasses,
						appResource: allExperienceResources.find((resource: any) => resource.whopProductId === app.id)
					};
				} catch (error) {
					console.error(`❌ Error getting access passes for app ${app.name}:`, error);
					return { app, accessPasses: [], appResource: null };
				}
			});
			
			// Wait for all access pass queries to complete
			const appAccessPassResults = await Promise.all(accessPassPromises);
			
			// Collect all app-resource mappings to avoid race conditions
			const appResourceMappings: { [resourceId: string]: string[] } = {};
			
			for (const { app, accessPasses, appResource } of appAccessPassResults) {
				if (!appResource) {
					console.log(`⚠️ No FREE app resource found with whopProductId = ${app.id}`);
					continue;
				}
				
				console.log(`� Found FREE app resource: ${appResource.name}`);
				
				// For each access pass, find resources that match those access pass IDs
				for (const accessPass of accessPasses) {
					console.log(`� Looking for resources matching access pass ${accessPass.id}`);
					
					// Find resources that have this access pass as their whopProductId
					const matchingResources = allExperienceResources.filter(
						(resource: any) => resource.whopProductId === accessPass.id
					);
					
					console.log(`� Found ${matchingResources.length} resources matching access pass ${accessPass.id}`);
					
					// For each matching resource, collect the app name
					for (const resource of matchingResources) {
						if (!appResourceMappings[resource.id]) {
							appResourceMappings[resource.id] = [];
						}
						
						// Add app name if not already present
						if (!appResourceMappings[resource.id].includes(app.name)) {
							appResourceMappings[resource.id].push(app.name);
							console.log(`� Collected app "${app.name}" for resource ${resource.name} (access pass: ${accessPass.id})`);
						}
					}
					
					if (matchingResources.length === 0) {
						console.log(`⚠️ No resources found matching access pass ${accessPass.id}`);
					}
				}
			}
			
			// Now update each resource with all its collected apps
			const updatePromises: Promise<void>[] = [];
			
			for (const [resourceId, appNames] of Object.entries(appResourceMappings)) {
				const resource = allExperienceResources.find((r: any) => r.id === resourceId);
				if (!resource) continue;
				
				const currentProductApps = resource.productApps || [];
				const newAppNames = appNames.filter(appName => !currentProductApps.includes(appName));
				
				if (newAppNames.length > 0) {
					const updatedProductApps = [...currentProductApps, ...newAppNames];
					
					updatePromises.push(
						db.update(resources)
							.set({
								productApps: updatedProductApps,
								updatedAt: new Date()
							})
							.where(eq(resources.id, resourceId))
							.then(() => {
								console.log(`✅ Added apps [${newAppNames.join(', ')}] to productApps for resource ${resource.name}`);
							})
							.catch((error: any) => {
								console.error(`❌ Error updating productApps for resource ${resourceId}:`, error);
							})
					);
				} else {
					console.log(`ℹ️ No new apps to add to resource ${resource.name}`);
				}
			}
			
			// Execute all database updates in parallel
			if (updatePromises.length > 0) {
				console.log(`� Executing ${updatePromises.length} database updates in parallel...`);
				await Promise.all(updatePromises);
			}
			
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


		// Step 5: Sync FREE_VALUE resources with "prod_..." whop_product_id to PAID resources' product_apps
		updateProgress("syncing_free_to_paid_resources");
		console.log("� Syncing FREE_VALUE resources with 'prod_...' whop_product_id to PAID resources' product_apps...");
		
		try {
			// Get all resources in the current experience
			const allExperienceResources = await db.query.resources.findMany({
				where: eq(resources.experienceId, experienceId),
				columns: {
					id: true,
					name: true,
					category: true,
					whopProductId: true,
					productApps: true
				}
			});
			
			// Find FREE_VALUE resources with "prod_..." in whop_product_id
			const freeResourcesWithProdId = allExperienceResources.filter((resource: any) => 
				resource.category === "FREE_VALUE" && 
				resource.whopProductId && 
				resource.whopProductId.startsWith("prod_")
			);
			
			// Find PAID resources
			const paidResources = allExperienceResources.filter((resource: any) => 
				resource.category === "PAID"
			);
			
			console.log(`� Found ${freeResourcesWithProdId.length} FREE_VALUE resources with 'prod_...' whop_product_id`);
			console.log(`� Found ${paidResources.length} PAID resources`);
			
			if (freeResourcesWithProdId.length > 0 && paidResources.length > 0) {
				// Create mapping of FREE resource names to add to PAID resources' product_apps
				const freeResourceNames = freeResourcesWithProdId.map((resource: any) => resource.name);
				
				// Update each PAID resource with FREE resource names in product_apps
				const syncPromises: Promise<void>[] = [];
				
				for (const paidResource of paidResources) {
					const currentProductApps = paidResource.productApps || [];
					const newFreeResourceNames = freeResourceNames.filter((name: any) => !currentProductApps.includes(name));
					
					if (newFreeResourceNames.length > 0) {
						const updatedProductApps = [...currentProductApps, ...newFreeResourceNames];
						
						syncPromises.push(
							db.update(resources)
								.set({
									productApps: updatedProductApps,
									updatedAt: new Date()
								})
								.where(eq(resources.id, paidResource.id))
								.then(() => {
									console.log(`✅ Added FREE resources [${newFreeResourceNames.join(', ')}] to PAID resource ${paidResource.name}'s product_apps`);
								})
								.catch((error: any) => {
									console.error(`❌ Error updating product_apps for PAID resource ${paidResource.id}:`, error);
								})
						);
					} else {
						console.log(`ℹ️ No new FREE resources to add to PAID resource ${paidResource.name}`);
					}
				}
				
				// Execute all sync updates in parallel
				if (syncPromises.length > 0) {
					console.log(`� Executing ${syncPromises.length} FREE-to-PAID sync updates in parallel...`);
					await Promise.all(syncPromises);
				}
				
				updateProgress("free_to_paid_sync_completed", true);
			} else {
				console.log(`ℹ️ No FREE_VALUE resources with 'prod_...' whop_product_id or no PAID resources found for sync`);
				updateProgress("free_to_paid_sync_skipped", true);
			}
		} catch (error) {
			console.error(`❌ Error syncing FREE_VALUE resources to PAID resources:`, error);
			syncState.errors.push(`FREE-to-PAID sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			updateProgress("free_to_paid_sync_failed", true);
		}

		// Resources are now created in the library (no funnel assignment needed)

		// Step 6: Mark user as synced
		await db.update(users)
			.set({ productsSynced: true })
			.where(eq(users.id, userId));

		// Final progress update - mark all steps as completed
		syncState.completedSteps = syncState.totalSteps;
		syncState.progress = 100;
		console.log(`[PRODUCT-SYNC] � Progress Update: sync_completed - 100% (${syncState.completedSteps}/${syncState.totalSteps})`);
		
		const totalElapsed = Math.round((Date.now() - syncState.startTime) / 1000);
		
		console.log(`[PRODUCT-SYNC] � Resource library sync completed for experience ${experienceId}:`);
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

		// Create origin template if it doesn't exist and products were synced
		try {
			const shouldCreate = await shouldCreateOriginTemplate(experienceId);
			if (shouldCreate) {
				console.log(`[PRODUCT-SYNC] 📦 Creating origin template for experience ${experienceId}...`);
				
				// Get first product with whopProductId to fetch company data
				const firstProduct = await db.query.resources.findFirst({
					where: and(
						eq(resources.experienceId, experienceId),
						isNotNull(resources.whopProductId)
					),
				});

				if (firstProduct?.whopProductId) {
					console.log(`[PRODUCT-SYNC] 📦 Using product ${firstProduct.whopProductId} for origin template creation`);
					const originTemplate = await createOriginTemplateFromProduct(experienceId, firstProduct.whopProductId);
					if (originTemplate) {
						console.log(`[PRODUCT-SYNC] ✅ Origin template created successfully`);
					} else {
						console.log(`[PRODUCT-SYNC] ⚠️ Origin template creation returned null (may already exist)`);
					}
				} else {
					console.log(`[PRODUCT-SYNC] ⚠️ No products with whopProductId found, skipping origin template creation`);
				}
			} else {
				console.log(`[PRODUCT-SYNC] ℹ️ Origin template already exists or no products, skipping creation`);
			}
		} catch (originTemplateError) {
			// Don't fail the sync if origin template creation fails
			console.error(`[PRODUCT-SYNC] ⚠️ Error creating origin template (non-critical):`, originTemplateError);
			syncState.errors.push(`Origin template creation failed: ${originTemplateError instanceof Error ? originTemplateError.message : 'Unknown error'}`);
		}

	} catch (error) {
		console.error("[PRODUCT-SYNC] ❌ Error during smart upselling sync:", error);
		syncState.errors.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		
		// Log final state even on error
		const totalElapsed = Math.round((Date.now() - syncState.startTime) / 1000);
		console.log(`[PRODUCT-SYNC] � Sync failed after ${totalElapsed}s at ${syncState.progress}% progress`);
		console.log(`[PRODUCT-SYNC]    - Errors: ${syncState.errors.length}`);
		console.log(`[PRODUCT-SYNC]    - Success counts:`, syncState.successCounts);
		
		// Don't mark as synced if there was a critical error
		throw error;
	} finally {
		// Always clear the global keepalive interval
		clearInterval(globalKeepAlive);
		console.log("[PRODUCT-SYNC] � Cleaned up global keepalive mechanism");
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
			console.log(`� ${operationName} attempt ${attempt}/${maxRetries} (timeout: ${timeoutMs}ms)`);
			
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
