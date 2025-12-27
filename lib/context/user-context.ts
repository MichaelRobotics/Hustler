import { and, eq } from "drizzle-orm";
import { db, checkDatabaseConnection } from "../supabase/db-server";
import { experiences, users, funnels } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
// Removed direct import - now using API routes for product sync
import { cleanupAbandonedExperiences, checkIfCleanupNeeded } from "../sync/experience-cleanup";
import type { AuthenticatedUser, UserContext } from "../types/user";
import { createConversation } from "../actions/simplified-conversation-actions";
import { updateConversationToWelcomeStage } from "../actions/user-join-actions";
import { safeBackgroundTracking, trackAwarenessBackground } from "../analytics/background-tracking";

// Re-export types for backward compatibility
export type { AuthenticatedUser, UserContext };

/**
 * User Context Management
 * Handles user data extraction, caching, and automatic synchronization with WHOP
 */

// In-memory cache for user contexts (in production, consider using Redis)
const userContextCache = new Map<string, UserContext>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get or create user context with automatic sync
 */
export async function getUserContext(
	whopUserId: string,
	whopCompanyId = "", // Optional - not needed for experience-based isolation
	whopExperienceId: string,
	forceRefresh = false,
	accessLevel?: "admin" | "customer" | "no_access",
): Promise<UserContext | null> {
	const cacheKey = `${whopUserId}:${whopExperienceId}`; // Use experienceId for cache key instead

	// Check cache first (unless force refresh)
	if (!forceRefresh) {
		const cached = userContextCache.get(cacheKey);
		if (cached && cached.cacheExpiry > new Date()) {
			return cached;
		}
	}

	try {
		// Fetch fresh user data
		const userContext = await createUserContext(
			whopUserId,
			whopCompanyId,
			whopExperienceId,
			accessLevel,
		);

		if (userContext) {
			// Cache the result
			userContextCache.set(cacheKey, userContext);

			// Clean up expired cache entries
			cleanupExpiredCache();
		}

		return userContext;
	} catch (error) {
		console.error("Error getting user context:", error);
		return null;
	}
}

/**
 * Create fresh user context with WHOP sync
 */
async function createUserContext(
	whopUserId: string,
	whopCompanyId = "", // Optional - not needed for experience-based isolation
	whopExperienceId: string,
	accessLevel?: "admin" | "customer" | "no_access",
): Promise<UserContext | null> {
	try {
		console.log("Creating user context with experience-based approach");
		console.log("Experience ID:", whopExperienceId);
		console.log("Company ID:", whopCompanyId);

		// Check database connection health first
		console.log("🔍 Checking database connection health...");
		const isDbHealthy = await checkDatabaseConnection();
		if (!isDbHealthy) {
			console.error("❌ Database connection is not healthy");
			throw new Error("Database connection is not available");
		}
		console.log("✅ Database connection is healthy");

		// Get or create experience with retry logic
		let experience;
		let retryCount = 0;
		const maxRetries = 3;
		
		while (retryCount < maxRetries) {
			try {
				console.log(`🔍 Attempting to find experience (attempt ${retryCount + 1}/${maxRetries})...`);
				experience = await db.query.experiences.findFirst({
					where: eq(experiences.whopExperienceId, whopExperienceId),
				});
				console.log(`✅ Experience query successful`);
				break;
			} catch (error) {
				retryCount++;
				console.error(`❌ Database query failed (attempt ${retryCount}/${maxRetries}):`, error);
				
				if (retryCount >= maxRetries) {
					console.error(`❌ Max retries reached, throwing error`);
					throw error;
				}
				
				// Wait before retrying (exponential backoff)
				const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
				console.log(`⏳ Waiting ${waitTime}ms before retry...`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}
		}

		if (!experience) {
			console.log("Experience not found, creating new experience...");
			
			// Get the company ID from the Whop API if not provided
			let companyId = whopCompanyId;
			if (!companyId) {
				console.log("Company ID not provided, fetching from Whop API...");
				try {
					const whopExperience = await whopSdk.experiences.getExperience({
						experienceId: whopExperienceId,
					});
					companyId = whopExperience.company.id;
					console.log(`✅ Got company ID from Whop API: ${companyId}`);
				} catch (error) {
					console.error("❌ Failed to get company ID from Whop API:", error);
					// Fallback to environment variable as last resort
					companyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || "";
					console.log(`⚠️ Using fallback company ID: ${companyId}`);
				}
			}
			
			let isReinstallScenario = false;
			
			if (companyId) {
				const needsCleanup = await checkIfCleanupNeeded(companyId);
				isReinstallScenario = needsCleanup; // This indicates there are existing experiences (reinstall)
				
				console.log(`🔍 Company ${companyId} - needsCleanup: ${needsCleanup}, isReinstallScenario: ${isReinstallScenario}`);
				
				if (needsCleanup) {
					console.log(`🧹 Company ${companyId} has multiple experiences, cleaning up abandoned ones...`);
					try {
						const { cleaned, kept } = await cleanupAbandonedExperiences(companyId);
						console.log(`✅ Cleanup completed: cleaned ${cleaned.length}, kept ${kept.length} experiences`);
					} catch (error) {
						console.error("❌ Error during cleanup, continuing with new experience creation:", error);
					}
				} else {
					console.log(`🆕 Company ${companyId} has no existing experiences - this is a fresh install`);
				}
			}
			
			// Fetch company information to get the actual company name
			let companyName = "App Installation";
			let companyLogo = null;
			
			if (companyId) {
				try {
					const { whopSdk } = await import("@/lib/whop-sdk");
					const companyResult = await whopSdk.companies.getCompany({
						companyId: companyId
					});
					
					companyName = companyResult.title || "App Installation";
					companyLogo = companyResult.logo || null;
					
					console.log(`✅ Fetched company info: ${companyName}`);
				} catch (error) {
					console.warn(`⚠️ Failed to fetch company info for ${companyId}:`, error);
					// Continue with default values
				}
			}

			const [newExperience] = await db
				.insert(experiences)
				.values({
					whopExperienceId: whopExperienceId,
					whopCompanyId: companyId,
					name: companyName,
					description: `Experience for ${companyName}`,
				})
				.returning();

			console.log("New experience created:", newExperience);
			experience = newExperience;
			
			// Store reinstall flag for later use in user creation
			(experience as any).isReinstallScenario = isReinstallScenario;
		} else {
			console.log("Existing experience found:", experience);
		}

		// Company logic removed - using experiences for multitenancy

		// Get or create user for this specific experience
		console.log(`🔍 Looking for user: whopUserId=${whopUserId}, experienceId=${experience.id}`);
		let user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, whopUserId),
				eq(users.experienceId, experience.id)  // Filter by experience ID
			),
			with: {
				experience: true,
			},
		});
		
		if (user) {
			console.log(`✅ Found existing user: id=${user.id}, experienceId=${user.experienceId}, accessLevel=${user.accessLevel}`);
		} else {
			console.log(`❌ No user found for whopUserId=${whopUserId} in experience=${experience.id}`);
			console.log(`🔍 Experience details: id=${experience.id}, whopExperienceId=${experience.whopExperienceId}`);
		}

		if (!user) {
			// Handle test user for development
			if (
				process.env.NODE_ENV === "development" &&
				whopUserId === "test-user-id"
			) {
				const [newUser] = await db
					.insert(users)
					.values({
						whopUserId: whopUserId,
						experienceId: experience.id, // Link to experience
						email: "test@example.com",
						name: "Test User",
						avatar: null,
						credits: 2, // Give test user 2 credits
					})
					.returning();

				user = await db.query.users.findFirst({
					where: eq(users.id, newUser.id),
					with: {
						experience: true,
					},
				});
			} else {
				// Fetch user data from WHOP API
				const whopUser = await whopSdk.users.getUser({ userId: whopUserId });

				if (!whopUser) {
					console.error("User not found in WHOP API:", whopUserId);
					return null;
				}

				// Determine initial access level from Whop API
				let initialAccessLevel = "customer"; // Default fallback
				
				if (accessLevel) {
					// Use provided access level if available
					initialAccessLevel = accessLevel;
					console.log(`Using provided access level: ${initialAccessLevel}`);
				} else {
					// Check access level via Whop API - this is the source of truth
					try {
						const accessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
							userId: whopUserId,
							experienceId: whopExperienceId,
						});
						initialAccessLevel = accessResult.accessLevel || "no_access";
						console.log(`Whop API access level: ${initialAccessLevel}`);
					} catch (error) {
						console.error("Error checking initial access level:", error);
						initialAccessLevel = "no_access"; // More restrictive fallback
					}
				}

				// Check if this is a reinstall scenario (stored during experience creation)
				const isReinstallScenario = (experience as any).isReinstallScenario || false;
				
				console.log(`💰 Credits logic - isReinstallScenario: ${isReinstallScenario}, initialAccessLevel: ${initialAccessLevel}`);
				
				// Only give credits to admin users on fresh installs, not reinstalls
				const shouldGiveCredits = initialAccessLevel === "admin" && !isReinstallScenario;
				const initialCredits = shouldGiveCredits ? 2 : 0;
				
				if (isReinstallScenario && initialAccessLevel === "admin") {
					console.log(`🔄 Reinstall scenario detected for admin user, giving 0 credits`);
				} else if (initialAccessLevel === "admin") {
					console.log(`🎉 Fresh install for admin user, giving 2 credits`);
				} else {
					console.log(`👤 Non-admin user, giving 0 credits`);
				}

				// Create user in our database
				console.log(`🔍 Creating new user with: whopUserId=${whopUser.id}, experienceId=${experience.id}, accessLevel=${initialAccessLevel}`);
				let newUser;
				try {
					[newUser] = await db
						.insert(users)
						.values({
							whopUserId: whopUser.id,
							experienceId: experience.id, // Link to experience
							email: "", // Email is not available in public profile
							name: whopUser.name || whopUser.username || "Unknown User",
							avatar: whopUser.profilePicture?.sourceUrl || null,
							credits: initialCredits,
							accessLevel: initialAccessLevel,
						})
						.returning();

					console.log(`✅ New user created: id=${newUser.id}, whopUserId=${newUser.whopUserId}, experienceId=${newUser.experienceId}`);
				
				// Create conversation for new CUSTOMER users (not admins)
				if (initialAccessLevel === "customer") {
					console.log(`🎯 Creating conversation for new customer user ${newUser.id}`);
					try {
						await createConversationForNewCustomer(newUser.id, whopUser.id, experience.id);
					} catch (conversationError) {
						console.error(`❌ Failed to create conversation for new customer:`, conversationError);
						// Don't fail user creation if conversation creation fails
					}
				} else {
					console.log(`👤 Admin user created, skipping conversation creation`);
				}
				
				} catch (error) {
					console.error(`❌ Failed to create user:`, error);
					console.error(`❌ Error details:`, {
						whopUserId: whopUser.id,
						experienceId: experience.id,
						accessLevel: initialAccessLevel,
						error: error instanceof Error ? error.message : error
					});
					throw error; // Re-throw to be caught by outer try-catch
				}

				// Fetch the user with experience relation
				user = await db.query.users.findFirst({
					where: eq(users.id, newUser.id),
					with: {
						experience: true,
					},
				});

				console.log(`🔍 Fetched user after creation: id=${user?.id}, whopUserId=${user?.whopUserId}, experienceId=${user?.experienceId}`);

				// Trigger product sync for new admin users via API route
				if (initialAccessLevel === "admin") {
					console.log(`🚀 New admin user created, triggering async product sync for experience ${experience.id}`);
					console.log(`📊 User ID: ${newUser.id}, Experience ID: ${experience.id}, Company ID: ${experience.whopCompanyId}`);
					
					try {
						// Call sync function directly and await it to ensure completion
						console.log(`[USER-CONTEXT] 🔄 Triggering product sync for user ${newUser.id}...`);
						
						// Import the sync function directly since we're in server-side context
						const { triggerProductSyncForNewAdmin } = await import('../sync/trigger-product-sync');
						
						// Call the function directly and await it to ensure completion
						await triggerProductSyncForNewAdmin(
							newUser.id,
							experience.id,
							experience.whopCompanyId
						);
						
						console.log(`[USER-CONTEXT] ✅ Product sync completed successfully for user ${newUser.id}`);
					} catch (error) {
						console.error("❌ Product sync failed:", error);
						console.error("❌ Error details:", error instanceof Error ? error.stack : error);
						console.error("❌ Error name:", error instanceof Error ? error.name : 'Unknown');
						console.error("❌ Error message:", error instanceof Error ? error.message : 'Unknown error');
					}
				}
			}
		} else {
		// Sync user data with WHOP (only for the same experience)
		await syncUserData(user);
		
		// Check if user's stored access level matches their current experience access
		// ONLY sync if this is the same experience the user was created for
		if (user.experienceId === experience.id) {
			try {
				const currentAccessResult = await whopSdk.access.checkIfUserHasAccessToExperience({
					userId: whopUserId,
					experienceId: whopExperienceId,
				});
				
				if (currentAccessResult.accessLevel !== user.accessLevel) {
					console.log(`⚠️  SYNCING: User access level changed from ${user.accessLevel} to ${currentAccessResult.accessLevel} for experience ${experience.id}`);
					await db
						.update(users)
						.set({
							accessLevel: currentAccessResult.accessLevel,
							credits: currentAccessResult.accessLevel === "admin" ? 2 : 0,
							updatedAt: new Date(),
						})
						.where(eq(users.id, user.id));
					
					// Update the user object for immediate use
					user.accessLevel = currentAccessResult.accessLevel;
					user.credits = currentAccessResult.accessLevel === "admin" ? 2 : 0;
				}
			} catch (error) {
				console.error("Error syncing user access level:", error);
			}
		} else {
			console.log(`⚠️  CROSS-EXPERIENCE ACCESS: User ${whopUserId} accessing experience ${experience.id} but was created for experience ${user.experienceId}`);
			console.log(`This should create a new user record instead of using existing one.`);
		}
		}

		// Determine access level following WHOP best practices:
		// 1. Use provided level if available (from API route)
		// 2. Use stored level from database if available
		// 3. Only call WHOP API as last resort
		let finalAccessLevel = accessLevel;
		
		if (!finalAccessLevel && user) {
			// Use stored access level from database
			finalAccessLevel = user.accessLevel as "admin" | "customer" | "no_access";
			console.log("Using stored access level from database:", finalAccessLevel);
		}
		
		if (!finalAccessLevel) {
			// Only call WHOP API if we don't have stored access level
			console.log("No stored access level found, calling WHOP API...");
			finalAccessLevel = await determineAccessLevel(whopUserId, whopExperienceId);
			
			// Update the user's access level in the database
			if (user && finalAccessLevel !== user.accessLevel) {
				console.log(`Updating user access level from ${user.accessLevel} to ${finalAccessLevel}`);
				await db
					.update(users)
					.set({
						accessLevel: finalAccessLevel,
						updatedAt: new Date(),
					})
					.where(eq(users.id, user.id));
				
				// Update the user object for immediate use
				user.accessLevel = finalAccessLevel;
			}
		}

		if (!user) {
			console.error("User not found after creation/update");
			return null;
		}

		console.log(`🔍 Creating AuthenticatedUser object with: user.id=${user.id}, experience.id=${experience.id}`);
		const authenticatedUser: AuthenticatedUser = {
			id: user.id,
			whopUserId: user.whopUserId,
			experienceId: experience.whopExperienceId, // Use the actual Whop experience ID for API calls
			email: user.email,
			name: user.name,
			avatar: user.avatar || undefined,
			credits: user.credits,
			messages: user.messages,
			subscription: user.subscription || undefined,
			accessLevel: finalAccessLevel,
			productsSynced: user.productsSynced,
			experience: {
				id: experience.id, // Database UUID for foreign key relationships
				whopExperienceId: experience.whopExperienceId, // Whop experience ID for API calls
				whopCompanyId: experience.whopCompanyId,
				name: experience.name,
				description: experience.description || undefined,
				link: experience.link || undefined, // Include link field from database
			},
		};
		console.log(`✅ AuthenticatedUser created: id=${authenticatedUser.id}, whopUserId=${authenticatedUser.whopUserId}, experience.id=${authenticatedUser.experience.id}`);

		return {
			user: authenticatedUser,
			isAuthenticated: true,
			lastSync: new Date(),
			cacheExpiry: new Date(Date.now() + CACHE_DURATION),
		};
	} catch (error) {
		console.error("Error creating user context:", error);
		return null;
	}
}

// Company sync function removed - using experiences for multitenancy

/**
 * Sync user data with WHOP API
 */
async function syncUserData(user: any): Promise<void> {
	try {
		// Skip sync for test users in development
		if (
			process.env.NODE_ENV === "development" &&
			user.whopUserId === "test-user-id"
		) {
			console.log("Skipping user sync for test user");
			return;
		}

		const whopUser = await whopSdk.users.getUser({ userId: user.whopUserId });

		if (
			whopUser &&
			user &&
			(user.name !== (whopUser.name || whopUser.username) ||
				user.avatar !== (whopUser.profilePicture?.sourceUrl || null))
		) {
			await db
				.update(users)
				.set({
					name: whopUser.name || whopUser.username || user.name,
					avatar: whopUser.profilePicture?.sourceUrl || user.avatar,
					updatedAt: new Date(),
				})
				.where(eq(users.id, user.id));
		}
	} catch (error) {
		console.error("Error syncing user data:", error);
	}
}

/**
 * Determine user access level based on WHOP permissions
 */
async function determineAccessLevel(
	whopUserId: string,
	whopExperienceId: string,
): Promise<"admin" | "customer" | "no_access"> {
	try {
		console.log("Determining access level for:", {
			whopUserId,
			whopExperienceId,
		});

		// Handle test user for development
		if (
			process.env.NODE_ENV === "development" &&
			whopUserId === "test-user-id"
		) {
			console.log("Using test user access level: customer");
			return "customer";
		}

		// Check user access to the experience (not company)
		console.log("Checking user access to experience...");

		// Check WHOP access for user to the experience (experience-based access)
		console.log("Checking WHOP access for user to experience...");
		const result = await whopSdk.access.checkIfUserHasAccessToExperience({
			userId: whopUserId,
			experienceId: whopExperienceId,
		});

		console.log("WHOP access check result:", result);
		const accessLevel = result.accessLevel || "no_access";
		console.log("Final access level:", accessLevel);

		// Use whatever Whop API returns - no overrides
		// Whop is the source of truth for access levels
		return accessLevel;
	} catch (error) {
		console.error("Error determining access level:", error);
		return "no_access";
	}
}

/**
 * Update user credits in context and database (experience-aware)
 */
export async function updateUserCredits(
	whopUserId: string,
	experienceId: string,
	creditChange: number,
	operation: "add" | "subtract" = "subtract",
): Promise<boolean> {
	try {
		const user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, whopUserId),
				eq(users.experienceId, experienceId)
			),
		});

		if (!user) {
			console.error("User not found for credit update:", { whopUserId, experienceId });
			return false;
		}

		const newCredits =
			operation === "add"
				? user.credits + creditChange
				: Math.max(0, user.credits - creditChange);

		await db
			.update(users)
			.set({
				credits: newCredits,
				updatedAt: new Date(),
			})
			.where(eq(users.id, user.id));

		// Invalidate cache for this user-experience combination
		invalidateUserCache(`${whopUserId}:${experienceId}`);

		return true;
	} catch (error) {
		console.error("Error updating user credits:", error);
		return false;
	}
}

/**
 * Get user credits from context or database (experience-aware)
 */
export async function getUserCredits(whopUserId: string, experienceId: string): Promise<number> {
	try {
		const user = await db.query.users.findFirst({
			where: and(
				eq(users.whopUserId, whopUserId),
				eq(users.experienceId, experienceId)
			),
		});

		return user?.credits || 0;
	} catch (error) {
		console.error("Error getting user credits:", error);
		return 0;
	}
}

/**
 * Invalidate user cache (supports both old and new key formats)
 */
export function invalidateUserCache(cacheKey: string): void {
	// Handle both old format (whopUserId) and new format (whopUserId:experienceId)
	if (cacheKey.includes(':')) {
		// New format: whopUserId:experienceId
		userContextCache.delete(cacheKey);
	} else {
		// Old format: whopUserId only - invalidate all experiences for this user
		const keysToDelete: string[] = [];
		for (const [key, context] of userContextCache.entries()) {
			if (context.user.whopUserId === cacheKey) {
				keysToDelete.push(key);
			}
		}
		keysToDelete.forEach((key) => userContextCache.delete(key));
	}
}

/**
 * Create conversation for new customer users
 * This handles the conversation creation logic that was previously in webhooks
 */
async function createConversationForNewCustomer(
	userId: string,
	whopUserId: string,
	experienceId: string
): Promise<void> {
	try {
		console.log(`[CONVERSATION-CREATION] Starting conversation creation for customer user ${userId}`);
		
		// Step 1: Find deployed funnel for this experience
		const liveFunnel = await db.query.funnels.findFirst({
			where: and(
				eq(funnels.experienceId, experienceId),
				eq(funnels.isDeployed, true)
			),
		});

		if (!liveFunnel) {
			console.log(`[CONVERSATION-CREATION] No deployed funnel found for experience ${experienceId} - skipping conversation creation`);
			return;
		}

		if (!liveFunnel.flow) {
			console.log(`[CONVERSATION-CREATION] Funnel ${liveFunnel.id} has no flow - skipping conversation creation`);
			return;
		}

		console.log(`[CONVERSATION-CREATION] Found deployed funnel ${liveFunnel.id} for experience ${experienceId}`);

		// Step 2: Create conversation using the same logic as webhooks
		const conversationId = await createConversation(
			experienceId,
			liveFunnel.id,
			whopUserId,
			liveFunnel.flow.startBlockId,
			undefined, // membershipId
			undefined  // whopProductId
		);

		console.log(`[CONVERSATION-CREATION] Created conversation ${conversationId} for customer user ${userId}`);

		// Step 3: Update conversation to WELCOME stage
		await updateConversationToWelcomeStage(conversationId, liveFunnel.flow);

		// Step 4: Track awareness (starts) - BACKGROUND PROCESSING
		console.log(`🚀 [CONVERSATION-CREATION] About to track awareness for experience ${experienceId}, funnel ${liveFunnel.id}`);
		safeBackgroundTracking(() => trackAwarenessBackground(experienceId, liveFunnel.id));

		console.log(`[CONVERSATION-CREATION] Successfully created conversation ${conversationId} for customer user ${userId}`);
	} catch (error) {
		console.error(`[CONVERSATION-CREATION] Error creating conversation for customer user ${userId}:`, error);
		throw error;
	}
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache(): void {
	const now = new Date();

	for (const [key, context] of userContextCache.entries()) {
		if (context.cacheExpiry <= now) {
			userContextCache.delete(key);
		}
	}
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
	return {
		size: userContextCache.size,
		entries: Array.from(userContextCache.keys()),
	};
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
	userContextCache.clear();
}
