import { and, eq } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { experiences, users } from "../supabase/schema";
import { whopSdk } from "../whop-sdk";
// Removed direct import - now using API routes for product sync
import { cleanupAbandonedExperiences, checkIfCleanupNeeded } from "../sync/experience-cleanup";
import type { AuthenticatedUser, UserContext } from "../types/user";

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

		// Get or create experience
		let experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, whopExperienceId),
		});

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
			
			const [newExperience] = await db
				.insert(experiences)
				.values({
					whopExperienceId: whopExperienceId,
					whopCompanyId: companyId,
					name: "App Installation",
					description: "Experience for app installation",
					logo: null,
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
				const [newUser] = await db
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

				// Fetch the user with experience relation
				user = await db.query.users.findFirst({
					where: eq(users.id, newUser.id),
					with: {
						experience: true,
					},
				});

				// Trigger product sync for new admin users via API route
				if (initialAccessLevel === "admin") {
					console.log(`🚀 New admin user created, triggering async product sync for experience ${experience.id}`);
					console.log(`📊 User ID: ${newUser.id}, Experience ID: ${experience.id}, Company ID: ${experience.whopCompanyId}`);
					
					try {
						// Call API route instead of direct function to prevent timeouts
						console.log(`🔄 Triggering async product sync via API route for user ${newUser.id}...`);
						
						// Use setImmediate for better error handling in Node.js
						setImmediate(async () => {
							try {
								console.log(`🔄 Calling /api/admin/sync-products/trigger for user ${newUser.id}...`);
								
								// Import apiPost to follow established patterns
								const { apiPost } = await import('../utils/api-client');
								
								// Call the API route using established api-client pattern
								const response = await apiPost('/api/admin/sync-products/trigger', {
									userId: newUser.id,
									experienceId: experience.id,
									companyId: experience.whopCompanyId
								}, experience.id); // Pass experienceId as parameter (established pattern)

								if (response.ok) {
									const result = await response.json();
									console.log(`✅ Product sync API call successful:`, result);
								} else {
									const error = await response.json();
									console.error(`❌ Product sync API call failed:`, error);
								}
							} catch (error) {
								console.error("❌ Product sync API call failed:", error);
								console.error("❌ Error details:", error instanceof Error ? error.stack : error);
								console.error("❌ Error name:", error instanceof Error ? error.name : 'Unknown');
								console.error("❌ Error message:", error instanceof Error ? error.message : 'Unknown error');
							}
						});
						
						console.log(`⏰ Product sync API call queued for immediate execution`);
					} catch (error) {
						console.error("❌ Error queuing product sync API call:", error);
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

		const authenticatedUser: AuthenticatedUser = {
			id: user.id,
			whopUserId: user.whopUserId,
			experienceId: experience.whopExperienceId, // Use the actual Whop experience ID for API calls
			email: user.email,
			name: user.name,
			avatar: user.avatar || undefined,
			credits: user.credits,
			accessLevel: finalAccessLevel,
			productsSynced: user.productsSynced,
			experience: {
				id: experience.id, // Database UUID for foreign key relationships
				whopExperienceId: experience.whopExperienceId, // Whop experience ID for API calls
				whopCompanyId: experience.whopCompanyId,
				name: experience.name,
				description: experience.description || undefined,
				logo: experience.logo || undefined,
			},
		};

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
