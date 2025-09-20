import { db } from "@/lib/supabase/db-server";
import { resources, users, experiences, funnels } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getWhopApiClient } from "@/lib/whop-api-client";
import { createResource } from "@/lib/actions/resource-actions";
import { createFunnel, addResourceToFunnel } from "@/lib/actions/funnel-actions";
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
		totalSteps: 6,
		completedSteps: 0,
		errors: [] as string[],
		successCounts: {
			freeResources: 0,
			paidResources: 0,
			assignments: 0
		}
	};

	// Enhanced keepalive with progress reporting
	const globalKeepAlive = setInterval(() => {
		const elapsed = Math.round((Date.now() - syncState.startTime) / 1000);
		console.log(`[PRODUCT-SYNC] 💓 Global Keepalive: Product sync in progress... Phase: ${syncState.phase}, Progress: ${syncState.progress}%, Elapsed: ${elapsed}s`);
	}, 5000); // Every 5 seconds for more frequent updates

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

		// Check for existing funnels
		const existingFunnels = await db.select()
			.from(funnels)
			.where(eq(funnels.experienceId, experienceId))
			.limit(1);

		// Check if user is already synced
		const existingUserRecord = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: { productsSynced: true }
		});

		if (existingResources.length > 0 || existingFunnels.length > 0 || existingUserRecord?.productsSynced) {
			console.log(`✅ Products already synced for experience ${experienceId}, skipping sync`);
			console.log(`   - Resources: ${existingResources.length}`);
			console.log(`   - Funnels: ${existingFunnels.length}`);
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

		// Get the App ID for affiliate tracking
		console.log("🔧 Getting App ID for affiliate tracking...");
		let affiliateAppId = currentWhopExperienceId; // Use Whop experience ID as fallback
		try {
			const whopExperience = await whopSdk.experiences.getExperience({
				experienceId: currentWhopExperienceId, // Use Whop experience ID, not database UUID
			});
			affiliateAppId = whopExperience.app?.id || currentWhopExperienceId;
			console.log(`✅ Got App ID for affiliate tracking: ${affiliateAppId}`);
		} catch (error) {
			console.log(`⚠️ Could not get App ID from experience, using Whop experience ID: ${currentWhopExperienceId}`);
		}

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

		// Step 2: Determine funnel name and get funnel product from discovery page
		const funnelName = whopClient.determineFunnelName(discoveryProducts);
		const funnelProduct = whopClient.getFunnelProduct(discoveryProducts);
		
		console.log(`🎯 Funnel will be named: "${funnelName}"`);
		if (funnelProduct) {
			console.log(`🎯 Funnel product: ${funnelProduct.title}`);
		} else {
			console.log(`⚠️ No funnel product found!`);
		}

		// Step 3: Create funnel with smart naming using proper action
		updateProgress("creating_funnel");
		console.log("📊 Creating funnel...");
		let funnel;
		try {
			// Double-check for existing funnel before creating (prevent race condition)
			const existingFunnel = await db.select()
				.from(funnels)
				.where(eq(funnels.experienceId, experienceId))
				.limit(1);
			
			if (existingFunnel.length > 0) {
				console.log(`✅ Funnel already exists for experience ${experienceId}, using existing funnel`);
				funnel = existingFunnel[0];
			} else {
				funnel = await retryDatabaseOperation(
					() => createFunnel({ id: userId, experience: { id: experienceId } } as any, {
				name: funnelName,
				description: `Funnel for ${funnelName}`,
						resources: [], // Will assign resources after creation
						whopProductId: funnelProduct?.id // 🔑 Associate funnel with discovery page product
					}),
					"createFunnel"
				);
			console.log(`✅ Created funnel: ${funnel.name} (ID: ${funnel.id})`);
			}
			updateProgress("funnel_created", true);
		} catch (error) {
			console.error("❌ Error creating funnel:", error);
			syncState.errors.push(`Funnel creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			throw new Error(`Failed to create funnel: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		// Step 4: Create resources and collect their IDs
		const resourceIds: string[] = [];
		
		// Create FREE apps from installed apps
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
			
			// Get the funnel product to filter apps by visibility
			const funnelProduct = whopClient.getFunnelProduct(discoveryProducts);
			if (!funnelProduct) {
				console.log("⚠️ No funnel product found, skipping FREE apps creation");
				updateProgress("free_resources_skipped", true);
			} else {
				console.log(`🎯 Funnel product: ${funnelProduct.title}`);
				
				// Check which apps have access passes for the funnel product
				// If an experience (app) has an access pass for the funnel product, it's included
				// BUT exclude apps that have the same Whop experience ID as the current app
				console.log(`🔍 Checking which apps have access passes for funnel product: ${funnelProduct.title} (ID: ${funnelProduct.id})`);
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
						continue;
					}
					
					try {
						// Check if this experience has an access pass for the funnel product
						const accessPassesResult = await whopSdk.experiences.listAccessPassesForExperience({
							experienceId: app.experienceId
						});
						
						const accessPasses = accessPassesResult?.accessPasses || [];
						const hasAccessPass = accessPasses.some((accessPass: any) => 
							accessPass.id === funnelProduct.id
						);
						
						if (hasAccessPass) {
							console.log(`✅ App "${app.name}" has access pass for funnel product "${funnelProduct.title}"`);
							availableApps.push(app);
						} else {
							console.log(`❌ App "${app.name}" does not have access pass for funnel product "${funnelProduct.title}"`);
						}
					} catch (error) {
						console.log(`⚠️ Error checking access passes for app "${app.name}":`, error);
						// If we can't check access passes, include the app as fallback
						availableApps.push(app);
					}
				}
				
				console.log(`🔍 Found ${availableApps.length} apps that have access passes for the funnel product (excluding current app with Whop experience ID: ${currentWhopExperienceId})`);
				
				// Classify apps by type (only from available apps)
				const classifiedApps = {
					learn: availableApps.filter(app => classifyAppType(app.name) === 'learn'),
					earn: availableApps.filter(app => classifyAppType(app.name) === 'earn'),
					community: availableApps.filter(app => classifyAppType(app.name) === 'community'),
					other: availableApps.filter(app => classifyAppType(app.name) === 'other')
				};
			
				console.log(`📊 App classification results:`);
				console.log(`  - Learning/Educational: ${classifiedApps.learn.length} apps`);
				console.log(`  - Earning/Monetization: ${classifiedApps.earn.length} apps`);
				console.log(`  - Community/Social: ${classifiedApps.community.length} apps`);
				console.log(`  - Other/Utility: ${classifiedApps.other.length} apps`);
				
				// Apply selection hierarchy for 4 FREE apps
				const maxFreeApps = 4;
				const selectedApps: typeof availableApps = [];
			
			// 1. Learning/Educational - at least 1 if available
			if (classifiedApps.learn.length > 0) {
				const learnApp = classifiedApps.learn[0];
				selectedApps.push(learnApp);
				console.log(`✅ Selected Learning app: ${learnApp.name}`);
			}
			
			// 2. Earning/Monetization - at least 1 if available
			if (classifiedApps.earn.length > 0 && selectedApps.length < maxFreeApps) {
				const earnApp = classifiedApps.earn[0];
				selectedApps.push(earnApp);
				console.log(`✅ Selected Earning app: ${earnApp.name}`);
			}
			
			// 3. Community/Social - at least 1 if available (Discord first)
			if (classifiedApps.community.length > 0 && selectedApps.length < maxFreeApps) {
				// Prioritize Discord apps
				const discordApp = classifiedApps.community.find(app => app.name.toLowerCase().includes('discord'));
				const communityApp = discordApp || classifiedApps.community[0];
				selectedApps.push(communityApp);
				console.log(`✅ Selected Community app: ${communityApp.name}${discordApp ? ' (Discord prioritized)' : ''}`);
			}
			
			// 4. Other/Utility - at least 1 if available
			if (classifiedApps.other.length > 0 && selectedApps.length < maxFreeApps) {
				const otherApp = classifiedApps.other[0];
				selectedApps.push(otherApp);
				console.log(`✅ Selected Other/Utility app: ${otherApp.name}`);
			}
			
			// Fill remaining slots with any available apps (maintaining order)
			const remainingSlots = maxFreeApps - selectedApps.length;
			if (remainingSlots > 0) {
				const allApps = [...classifiedApps.learn, ...classifiedApps.earn, ...classifiedApps.community, ...classifiedApps.other];
				const remainingApps = allApps.filter(app => !selectedApps.includes(app));
				
				for (let i = 0; i < Math.min(remainingSlots, remainingApps.length); i++) {
					selectedApps.push(remainingApps[i]);
					console.log(`✅ Selected additional app: ${remainingApps[i].name}`);
				}
			}
			
			console.log(`📱 Processing ${selectedApps.length} FREE apps (max ${maxFreeApps}) with hierarchical selection`);
			
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
				updateProgress("free_resources_completed", true);
		} else {
				console.log(`⚠️ No installed apps found for company`);
				updateProgress("free_resources_skipped", true);
			}
			} // End of funnel product check
		} catch (error) {
			console.error(`❌ Error fetching installed apps:`, error);
			syncState.errors.push(`Installed apps fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
			// Continue with sync even if installed apps fail
			console.log("⚠️ Continuing sync without installed apps...");
			updateProgress("free_resources_failed", true);
		}

		// Create PAID products as upsells (excluding funnel product)
		console.log("💳 Creating PAID products for upselling...");
		const upsellProducts = whopClient.getUpsellProducts(discoveryProducts, funnelProduct?.id || '');
		console.log(`Found ${upsellProducts.length} upsell products`);
		
		// Limit PAID products to maximum 4
		const maxPaidProducts = 4;
		const limitedPaidProducts = upsellProducts.slice(0, maxPaidProducts);
		if (upsellProducts.length > maxPaidProducts) {
			console.log(`⚠️ Limiting PAID products to ${maxPaidProducts} (found ${upsellProducts.length}, using first ${maxPaidProducts})`);
		}
		console.log(`💳 Processing ${limitedPaidProducts.length} PAID products (max ${maxPaidProducts})`);
		
		if (limitedPaidProducts.length > 0) {
			// Create PAID resources with batching for performance
			const batchSize = 10; // Process 10 products at a time (increased for better performance)
			let successCount = 0;
			let errorCount = 0;
			
			for (let i = 0; i < limitedPaidProducts.length; i += batchSize) {
				const batch = limitedPaidProducts.slice(i, i + batchSize);
				console.log(`🔍 Processing PAID products batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(limitedPaidProducts.length/batchSize)} (${batch.length} products)`);
				
				// Process batch in parallel with individual error handling and retry logic
				const batchPromises = batch.map(async (product) => {
			try {
				const cheapestPlan = whopClient.getCheapestPlan(product);
				const planParam = cheapestPlan ? `?plan=${cheapestPlan.id}&ref=${experienceId}` : `?ref=${experienceId}`;
				
          // Generate Whop native tracking link for paid products
          let trackingUrl: string;
          
          try {
            if (product.discoveryPageUrl) {
              // Create discovery tracking link using Whop API
              const trackingLink = await whopNativeTrackingService.createDiscoveryTrackingLink(
                product.discoveryPageUrl,
                cheapestPlan?.id || product.id,
                companyId,
                `Product: ${product.title}`,
                affiliateAppId
              );
              trackingUrl = trackingLink.url;
            } else {
              // Create simple checkout tracking link
              const trackingLink = await whopNativeTrackingService.createTrackingLink(
                cheapestPlan?.id || product.id,
                companyId,
                `Product: ${product.title}`,
                'checkout'
              );
              trackingUrl = trackingLink.url;
            }
          } catch (error) {
            console.error(`Failed to create tracking link for ${product.title}:`, error);
            // Fallback to simple checkout link
            trackingUrl = whopNativeTrackingService.createSimpleCheckoutLink(cheapestPlan?.id || product.id);
          }
						
						const resource = await retryDatabaseOperation(
							() => createResource({ id: userId, experience: { id: experienceId } } as any, {
					name: product.title,
					type: "MY_PRODUCTS",
					category: "PAID",
								link: trackingUrl, // Use Whop native tracking link
					description: product.description,
					whopProductId: product.id
							}),
							`createResource-PAID-${product.title}`
						);
						
						console.log(`✅ Created PAID resource for product: ${product.title}`);
						successCount++;
						syncState.successCounts.paidResources++;
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
							syncState.successCounts.assignments++;
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

		// Final progress update - mark all steps as completed
		syncState.completedSteps = syncState.totalSteps;
		syncState.progress = 100;
		console.log(`[PRODUCT-SYNC] 📊 Progress Update: sync_completed - 100% (${syncState.completedSteps}/${syncState.totalSteps})`);
		
		const totalElapsed = Math.round((Date.now() - syncState.startTime) / 1000);
		
		console.log(`[PRODUCT-SYNC] 🎉 Smart upselling sync completed for experience ${experienceId}:`);
		console.log(`[PRODUCT-SYNC]    - Total time: ${totalElapsed}s`);
		console.log(`[PRODUCT-SYNC]    - Progress: ${syncState.progress}%`);
		console.log(`[PRODUCT-SYNC]    - Funnel: "${funnelName}"`);
		console.log(`[PRODUCT-SYNC]    - FREE apps: ${syncState.successCounts.freeResources}`);
		console.log(`[PRODUCT-SYNC]    - PAID upsells: ${syncState.successCounts.paidResources}`);
		console.log(`[PRODUCT-SYNC]    - Assignments: ${syncState.successCounts.assignments}`);
		
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
