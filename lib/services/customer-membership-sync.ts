import { db } from "@/lib/supabase/db-server";
import { customersResources, experiences, users, resources } from "@/lib/supabase/schema";
import { eq, and, isNotNull, inArray } from "drizzle-orm";
import type { CustomerResource } from "@/lib/types/resource";

/**
 * Sync all experience resources directly to customer_resources for admin users
 * This bypasses membership matching since admins don't have memberships of their own products
 * @param experienceId - The Whop experience ID
 * @param adminUserId - The admin user's database ID
 */
export async function syncAdminResources(
	experienceId: string,
	adminUserId: string,
): Promise<{ created: number; updated: number; errors: number }> {
	let created = 0;
	let updated = 0;
	let errors = 0;

	try {
		// Get experience
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			throw new Error(`Experience not found: ${experienceId}`);
		}

		// Get admin user
		const adminUser = await db.query.users.findFirst({
			where: eq(users.id, adminUserId),
		});

		if (!adminUser) {
			throw new Error(`Admin user not found: ${adminUserId}`);
		}

		// Get all resources in the experience (with or without planId)
		const experienceResources = await db
			.select()
			.from(resources)
			.where(eq(resources.experienceId, experience.id))
			.limit(1000);

		console.log(
			`[ADMIN SYNC] Found ${experienceResources.length} resources in experience ${experienceId} for admin ${adminUser.name}`
		);

		// Fetch existing customer_resources for this admin
		const existingEntries = await db
			.select()
			.from(customersResources)
			.where(
				and(
					eq(customersResources.experienceId, experience.id),
					eq(customersResources.userId, adminUserId)
				)
			);

		// Build lookup map: key = `${userId}-${planId}` or `${userId}-${resourceId}` for resources without planId
		type ExistingEntry = typeof existingEntries[0];
		const existingMap = new Map<string, ExistingEntry>();
		existingEntries.forEach((e: ExistingEntry) => {
			const key = e.membershipPlanId
				? `${e.userId}-${e.membershipPlanId}`
				: `${e.userId}-resource-${e.id}`;
			existingMap.set(key, e);
		});

		// Collect all operations to perform
		type InsertData = {
			companyId: string;
			experienceId: string;
			userId: string;
			userName: string;
			membershipPlanId: string;
			membershipProductId: string | null;
			downloadLink: string | null;
			productName: string;
			description: string | null;
			image: string | null;
		};
		const pendingInserts = new Map<string, InsertData>();
		const toUpdate: Array<{
			id: string;
			data: {
				companyId: string;
				experienceId: string;
				userId: string;
				userName: string;
				membershipPlanId: string;
				membershipProductId: string | null;
				downloadLink: string | null;
				productName: string;
				description: string | null;
				image: string | null;
				updatedAt: Date;
			};
		}> = [];

		// Process each resource
		for (const resource of experienceResources) {
			try {
				// For admin sync, we need either planId or whopProductId to create a valid membershipPlanId
				// If resource has whopProductId, use it for membershipProductId
				// If resource has planId, use it for membershipPlanId
				// If resource has both, fill both
				// If neither exists, skip this resource (can't create customer_resource without membershipPlanId)
				const membershipProductId = resource.whopProductId || null;
				const membershipPlanId = resource.planId;
				
				if (!membershipPlanId && !membershipProductId) {
					// Skip resources without planId or whopProductId
					console.log(
						`[ADMIN SYNC] Skipping resource "${resource.name}" (${resource.id}) - no planId or whopProductId`
					);
					continue;
				}

				// Use planId if available, otherwise use productId for membershipPlanId (required field)
				const finalMembershipPlanId = membershipPlanId || membershipProductId;
				if (!finalMembershipPlanId) {
					continue; // Should not happen, but double-check
				}

				const lookupKey = `${adminUserId}-${finalMembershipPlanId}`;
				const existing = existingMap.get(lookupKey);

				const customerResourceData = {
					companyId: experience.whopCompanyId,
					experienceId: experience.id,
					userId: adminUserId,
					userName: adminUser.name,
					membershipPlanId: finalMembershipPlanId, // Required: use planId if available, otherwise productId
					membershipProductId: membershipProductId, // Optional: only if resource has whopProductId
					downloadLink: resource.storageUrl || null,
					productName: resource.name,
					description: resource.description || null,
					image: resource.image || null,
				};

				if (existing) {
					// Collect for batch update
					toUpdate.push({
						id: existing.id,
						data: {
							...customerResourceData,
							updatedAt: new Date(),
						},
					});
					updated++;
				} else {
					// Track pending inserts
					pendingInserts.set(lookupKey, customerResourceData);
					created++;
				}
			} catch (error) {
				console.error(
					`[ADMIN SYNC] Error processing resource ${resource.id}:`,
					error
				);
				errors++;
			}
		}

		// Execute batch operations
		// Batch insert
		const toInsert = Array.from(pendingInserts.values());
		if (toInsert.length > 0) {
			const batchSize = 50;
			for (let i = 0; i < toInsert.length; i += batchSize) {
				const batch = toInsert.slice(i, i + batchSize);
				try {
					await db.insert(customersResources).values(batch);
				} catch (error) {
					console.error(
						`[ADMIN SYNC] Error batch inserting customer resources (batch ${Math.floor(i / batchSize) + 1}):`,
						error
					);
					errors += batch.length;
					created -= batch.length;
				}
			}
		}

		// Batch update
		if (toUpdate.length > 0) {
			const batchSize = 50;
			for (let i = 0; i < toUpdate.length; i += batchSize) {
				const batch = toUpdate.slice(i, i + batchSize);
				await Promise.all(
					batch.map(async (item) => {
						try {
							await db
								.update(customersResources)
								.set(item.data)
								.where(eq(customersResources.id, item.id));
						} catch (error) {
							console.error(
								`[ADMIN SYNC] Error updating customer resource ${item.id}:`,
								error
							);
							errors++;
							updated--;
						}
					})
				);
			}
		}

		console.log(
			`[ADMIN SYNC] Sync completed: ${experienceResources.length} resources processed, ${created} created, ${updated} updated, ${errors} errors`
		);

		return { created, updated, errors };
	} catch (error) {
		console.error("[ADMIN SYNC] Error syncing admin resources:", error);
		throw error;
	}
}

/**
 * Sync memberships from Whop API and create/update customer_resources entries
 * @param experienceId - The Whop experience ID
 * @param companyId - The Whop company ID
 * @param whopUserId - Optional: If provided, only sync memberships for this specific user
 */
export async function syncCustomerMemberships(
	experienceId: string,
	companyId: string,
	whopUserId?: string,
): Promise<{ created: number; updated: number; deleted: number; errors: number }> {
	let created = 0;
	let updated = 0;
	let errors = 0;

	try {
		// Get experience
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			throw new Error(`Experience not found: ${experienceId}`);
		}

		// Get users in the experience - if whopUserId provided, only get that user
		const experienceUsers = whopUserId
			? await db
					.select()
					.from(users)
					.where(
						and(
							eq(users.experienceId, experience.id),
							eq(users.whopUserId, whopUserId)
						)
					)
			: await db
					.select()
					.from(users)
					.where(eq(users.experienceId, experience.id));

		if (experienceUsers.length === 0) {
			console.log(
				whopUserId
					? `No user found for experience ${experienceId} with whopUserId ${whopUserId}`
					: `No users found for experience ${experienceId}`
			);
			return { created: 0, updated: 0, deleted: 0, errors: 0 };
		}

		// Get all resources in the experience (both with and without planId/productId)
		const experienceResources = await db
			.select()
			.from(resources)
			.where(eq(resources.experienceId, experience.id))
			.limit(1000); // Reasonable limit

		// Create dual lookup maps:
		// - resourcesByProductId: for resources with whopProductId (match by product.id)
		// - resourcesByPlanId: for resources with planId but no whopProductId (match by plan.id)
		const resourcesByProductId = new Map<string, typeof experienceResources>();
		const resourcesByPlanId = new Map<string, typeof experienceResources>();
		// Map for names: productId/planId -> resource name
		const idToName = new Map<string, string>();
		
		experienceResources.forEach((resource: (typeof experienceResources)[0]) => {
			// Priority: if resource has whopProductId, use product matching
			// Otherwise, if it has planId, use plan matching
			if (resource.whopProductId) {
				// Resource has productId - match by product
				if (!resourcesByProductId.has(resource.whopProductId)) {
					resourcesByProductId.set(resource.whopProductId, []);
					// Use resource name as product name (first resource for this product)
					idToName.set(resource.whopProductId, resource.name);
				}
				resourcesByProductId.get(resource.whopProductId)!.push(resource);
			} else if (resource.planId) {
				// Resource has planId but no productId - match by plan
				if (!resourcesByPlanId.has(resource.planId)) {
					resourcesByPlanId.set(resource.planId, []);
					// Use resource name as plan name (first resource for this plan)
					idToName.set(resource.planId, resource.name);
				}
				resourcesByPlanId.get(resource.planId)!.push(resource);
			}
			// If resource has neither whopProductId nor planId, skip it (no way to match)
		});

		// Import Whop SDK
		const Whop = (await import('@whop/sdk')).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
		});

		// Fetch all memberships from Whop API for this company
		const memberships: any[] = [];
		for await (const membershipListResponse of client.memberships.list({ company_id: companyId })) {
			memberships.push(membershipListResponse);
		}

		// Filter memberships by company_id and user_ids from experience
		const whopUserIds = experienceUsers.map((u: (typeof experienceUsers)[0]) => u.whopUserId);
		
		// Track skipped memberships with reasons
		const skippedNoPlanId: Array<{ id: string; reason: string }> = [];
		const skippedNoProductId: Array<{ id: string; reason: string }> = [];
		const skippedNoUserId: Array<{ id: string; reason: string }> = [];
		const skippedUserNotFound: Array<{ id: string; userId: string; reason: string }> = [];
		const skippedNoMatchingResources: Array<{ id: string; productId?: string; planId?: string; reason: string }> = [];
		
		const relevantMemberships = memberships.filter((membership: any) => {
			const membershipCompanyId = membership.company?.id;
			const membershipUserId = membership.user?.id;
			const membershipPlanId = membership.plan?.id;
			
			// Check company match
			if (membershipCompanyId !== companyId) {
				return false;
			}
			
			// Check if user is in our experience
			if (!membershipUserId || !whopUserIds.includes(membershipUserId)) {
				if (!membershipUserId) {
					skippedNoUserId.push({
						id: membership.id,
						reason: "Missing user.id"
					});
				} else {
					skippedUserNotFound.push({
						id: membership.id,
						userId: membershipUserId,
						reason: "User not found in experience"
					});
				}
				return false;
			}
			
			return true;
		});

		console.log(
			whopUserId
				? `Found ${relevantMemberships.length} relevant memberships for user ${whopUserId} in experience ${experienceId}`
				: `Found ${relevantMemberships.length} relevant memberships for experience ${experienceId}`
		);

		// Early filter: Only process memberships that have matching resources
		// Check both product.id and plan.id matches
		const productIdsWithResources = new Set(resourcesByProductId.keys());
		const planIdsWithResources = new Set(resourcesByPlanId.keys());
		
		const membershipsToProcess = relevantMemberships.filter(m => {
			const membershipProductId = m.product?.id;
			const membershipPlanId = m.plan?.id;
			
			// Check if membership has product.id and we have resources for that product
			if (membershipProductId && productIdsWithResources.has(membershipProductId)) {
				return true; // Match by product
			}
			
			// Check if membership has plan.id and we have resources for that plan
			if (membershipPlanId && planIdsWithResources.has(membershipPlanId)) {
				return true; // Match by plan
			}
			
			// No match found - track why it was skipped
			if (!membershipProductId && !membershipPlanId) {
				// Membership has neither product.id nor plan.id
				skippedNoPlanId.push({
					id: m.id,
					reason: "Missing both product.id and plan.id"
				});
			} else if (membershipProductId && !productIdsWithResources.has(membershipProductId)) {
				// Membership has product.id but no matching resources
				skippedNoMatchingResources.push({
					id: m.id,
					productId: membershipProductId,
					reason: "No matching resources for this product"
				});
			} else if (membershipPlanId && !planIdsWithResources.has(membershipPlanId)) {
				// Membership has plan.id but no matching resources
				skippedNoMatchingResources.push({
					id: m.id,
					planId: membershipPlanId,
					reason: "No matching resources for this plan"
				});
			}
			
			return false;
		});

		console.log(
			`Filtered to ${membershipsToProcess.length} memberships with matching resources (skipped ${relevantMemberships.length - membershipsToProcess.length} without resources)`
		);

		// Log skipped memberships details
		if (skippedNoPlanId.length > 0) {
			console.log(`⚠️ Skipped ${skippedNoPlanId.length} memberships without product.id or plan.id:`);
			skippedNoPlanId.slice(0, 10).forEach(m => {
				console.log(`  - ${m.id}: ${m.reason}`);
			});
			if (skippedNoPlanId.length > 10) {
				console.log(`  ... and ${skippedNoPlanId.length - 10} more`);
			}
		}
		
		if (skippedNoProductId.length > 0) {
			console.log(`⚠️ Skipped ${skippedNoProductId.length} memberships without product.id:`);
			skippedNoProductId.slice(0, 10).forEach(m => {
				console.log(`  - ${m.id}: ${m.reason}`);
			});
			if (skippedNoProductId.length > 10) {
				console.log(`  ... and ${skippedNoProductId.length - 10} more`);
			}
		}
		
		if (skippedNoUserId.length > 0) {
			console.log(`⚠️ Skipped ${skippedNoUserId.length} memberships without user.id:`);
			skippedNoUserId.slice(0, 10).forEach(m => {
				console.log(`  - ${m.id}: ${m.reason}`);
			});
			if (skippedNoUserId.length > 10) {
				console.log(`  ... and ${skippedNoUserId.length - 10} more`);
			}
		}
		
		if (skippedUserNotFound.length > 0) {
			console.log(`⚠️ Skipped ${skippedUserNotFound.length} memberships for users not in experience:`);
			skippedUserNotFound.slice(0, 10).forEach(m => {
				console.log(`  - ${m.id} (user: ${m.userId}): ${m.reason}`);
			});
			if (skippedUserNotFound.length > 10) {
				console.log(`  ... and ${skippedUserNotFound.length - 10} more`);
			}
		}
		
		if (skippedNoMatchingResources.length > 0) {
			console.log(`⚠️ Skipped ${skippedNoMatchingResources.length} memberships without matching resources:`);
			skippedNoMatchingResources.slice(0, 10).forEach(m => {
				const identifier = m.productId 
					? `product: ${m.productId}` 
					: m.planId 
						? `plan: ${m.planId}` 
						: 'unknown';
				console.log(`  - ${m.id} (${identifier}): ${m.reason}`);
			});
			if (skippedNoMatchingResources.length > 10) {
				console.log(`  ... and ${skippedNoMatchingResources.length - 10} more`);
			}
		}

		// Fetch existing customer_resources - if whopUserId provided, only get entries for that user
		const existingEntries = whopUserId && experienceUsers.length > 0
			? await db
					.select()
					.from(customersResources)
					.where(
						and(
							eq(customersResources.experienceId, experience.id),
							eq(customersResources.userId, experienceUsers[0].id)
						)
					)
			: await db
					.select()
					.from(customersResources)
					.where(eq(customersResources.experienceId, experience.id));

		// Build lookup map: key = `${userId}-${productId}` or `${userId}-${planId}` for O(1) lookup
		// Note: membershipPlanId field stores either productId or planId depending on match type
		// We create entries for both membershipPlanId and membershipProductId to allow matching by either
		type ExistingEntry = typeof existingEntries[0];
		const existingMap = new Map<string, ExistingEntry>();
		existingEntries.forEach((e: ExistingEntry) => {
			// Create keys for both membershipPlanId and membershipProductId (if available)
			// This allows matching by either field - last entry wins if there are duplicates
			if (e.membershipPlanId) {
				const key = `${e.userId}-${e.membershipPlanId}`;
				existingMap.set(key, e);
			}
			if (e.membershipProductId) {
				const key = `${e.userId}-${e.membershipProductId}`;
				existingMap.set(key, e);
			}
		});

		// Collect all operations to perform
		type InsertData = {
			companyId: string;
			experienceId: string;
			userId: string;
			userName: string;
			membershipPlanId: string;
			membershipProductId: string | null;
			downloadLink: string | null;
			productName: string;
			description: string | null;
			image: string | null;
		};
		// Use Map to track pending inserts by key (userId-planId) to avoid duplicates
		const pendingInserts = new Map<string, InsertData>();
		const toUpdate: Array<{
			id: string;
			data: {
				companyId: string;
				experienceId: string;
				userId: string;
				userName: string;
				membershipPlanId: string;
				membershipProductId: string | null;
				downloadLink: string | null;
				productName: string;
				description: string | null;
				image: string | null;
				updatedAt: Date;
			};
		}> = [];

		// Track which customer_resource entries were matched during sync
		// This will be used to identify orphaned entries that should be deleted
		const matchedEntryIds = new Set<string>();

		// Process each membership
		for (const membership of membershipsToProcess) {
			try {
				const membershipProductId = membership.product?.id;
				const membershipPlanId = membership.plan?.id;
				const membershipUserId = membership.user?.id;
				const membershipUserName = membership.user?.name || "Unknown User";

				if (!membershipUserId) {
					// Should not happen after filtering, but double-check
					continue;
				}

				// Find matching user in our database
				const dbUser = experienceUsers.find(
					(u: (typeof experienceUsers)[0]) => u.whopUserId === membershipUserId
				);

				if (!dbUser) {
					// Should not happen after filtering, but double-check
					continue;
				}

				// Determine which resources to match and which ID to use
				// Priority: product matching first, then plan matching
				let matchingResources: typeof experienceResources = [];
				let matchId: string | undefined;
				let matchType: 'product' | 'plan' | undefined;
				let matchName: string | undefined;

				if (membershipProductId && resourcesByProductId.has(membershipProductId)) {
					// Match by product
					matchingResources = resourcesByProductId.get(membershipProductId) || [];
					matchId = membershipProductId;
					matchType = 'product';
					matchName = idToName.get(membershipProductId) || `Product ${membershipProductId}`;
				} else if (membershipPlanId && resourcesByPlanId.has(membershipPlanId)) {
					// Match by plan
					matchingResources = resourcesByPlanId.get(membershipPlanId) || [];
					matchId = membershipPlanId;
					matchType = 'plan';
					matchName = idToName.get(membershipPlanId) || `Plan ${membershipPlanId}`;
				}

				if (matchingResources.length === 0 || !matchId || !matchType) {
					// Should not happen after filtering, but double-check
					continue;
				}

				// Log membership match with product/plan name
				console.log(
					`✅ Matching membership "${matchName}" (${matchType}: ${matchId}) to ${matchingResources.length} resource(s) for user ${membershipUserName}`
				);

				// Create/update customer_resources entries for each matching resource
				for (const resource of matchingResources) {
					try {
						// Use matchId (productId or planId) as the lookup key
						// The existingMap has entries for both membershipPlanId and membershipProductId keys
						const lookupKey = `${dbUser.id}-${matchId}`;
						const existing = existingMap.get(lookupKey);
						
						// Only log when creating new entries, not updates (reduce verbosity)
						if (!existing) {
							const resourceIdentifier = matchType === 'product' 
								? `productId: ${resource.whopProductId}`
								: `planId: ${resource.planId}`;
							console.log(
								`  📦 Resource "${resource.name}" (${resourceIdentifier}) matched with membership "${matchName}" (${matchType}: ${matchId}) - creating customer_resource`
							);
						}

						// Determine membershipProductId and membershipPlanId based on match type and resource
						// If matching by product: membershipProductId = productId, membershipPlanId = planId (if available) or productId
						// If matching by plan: membershipPlanId = planId, membershipProductId = resource.whopProductId (if available)
						let finalMembershipProductId: string | null = null;
						let finalMembershipPlanId: string;
						
						if (matchType === 'product') {
							// Matching by product
							finalMembershipProductId = membershipProductId; // From membership
							// Use planId from resource if available, otherwise use productId
							finalMembershipPlanId = resource.planId || membershipProductId;
						} else {
							// Matching by plan
							finalMembershipPlanId = membershipPlanId; // From membership
							// Use productId from resource if available
							finalMembershipProductId = resource.whopProductId || null;
						}

						const customerResourceData = {
							companyId: companyId,
							experienceId: experience.id,
							userId: dbUser.id,
							userName: membershipUserName,
							membershipPlanId: finalMembershipPlanId, // Required: planId if available, otherwise productId
							membershipProductId: finalMembershipProductId, // Optional: productId if available
							downloadLink: resource.storageUrl || null,
							productName: resource.name,
							description: resource.description || null,
							image: resource.image || null,
						};
						
						if (existing) {
							// Collect for batch update
							toUpdate.push({
								id: existing.id,
								data: {
									...customerResourceData,
									updatedAt: new Date(),
								},
							});
							// Mark this entry as matched (will not be deleted)
							matchedEntryIds.add(existing.id);
							updated++;
						} else {
							// Track pending inserts by key (last resource for same plan wins, matching original behavior)
							pendingInserts.set(lookupKey, customerResourceData);
							created++;
						}
					} catch (error) {
						console.error(
							`Error processing resource ${resource.id} for membership ${membership.id}:`,
							error
						);
						errors++;
					}
				}
			} catch (error) {
				console.error(
					`Error processing membership ${membership.id}:`,
					error
				);
				errors++;
			}
		}

		// Deduplicate updates (if same entry ID appears multiple times, keep only the last one)
		// This matches original behavior where multiple resources for same plan would overwrite
		const updateMap = new Map<string, typeof toUpdate[0]>();
		toUpdate.forEach(item => {
			updateMap.set(item.id, item);
		});
		const deduplicatedUpdates = Array.from(updateMap.values());
		
		// Adjust updated count to reflect deduplication
		if (deduplicatedUpdates.length < toUpdate.length) {
			updated -= (toUpdate.length - deduplicatedUpdates.length);
		}

		// Execute batch operations
		// Batch insert (convert Map to array)
		const toInsert = Array.from(pendingInserts.values());
		if (toInsert.length > 0) {
			const batchSize = 50;
			for (let i = 0; i < toInsert.length; i += batchSize) {
				const batch = toInsert.slice(i, i + batchSize);
				try {
					await db.insert(customersResources).values(batch);
				} catch (error) {
					console.error(`Error batch inserting customer resources (batch ${Math.floor(i/batchSize) + 1}):`, error);
					errors += batch.length;
					created -= batch.length;
				}
			}
		}

		// Batch update (execute in parallel batches)
		if (deduplicatedUpdates.length > 0) {
			const batchSize = 50;
			for (let i = 0; i < deduplicatedUpdates.length; i += batchSize) {
				const batch = deduplicatedUpdates.slice(i, i + batchSize);
				// Execute updates in parallel for this batch
				await Promise.all(
					batch.map(async (item) => {
						try {
							await db
								.update(customersResources)
								.set(item.data)
								.where(eq(customersResources.id, item.id));
						} catch (error) {
							console.error(`Error updating customer resource ${item.id}:`, error);
							errors++;
							updated--;
						}
					})
				);
			}
		}

		// Delete orphaned customer_resources (entries that no longer have matching memberships)
		// Only delete entries for users that were synced
		let deleted = 0;
		if (whopUserId && experienceUsers.length > 0) {
			// Sync for specific user - delete orphaned entries for that user
			const userIdsToCheck = [experienceUsers[0].id];
			const orphanedEntries = existingEntries.filter(
				(e: ExistingEntry) => !matchedEntryIds.has(e.id) && userIdsToCheck.includes(e.userId)
			);
			
			if (orphanedEntries.length > 0) {
				const orphanedIds = orphanedEntries.map((e: ExistingEntry) => e.id);
				try {
					await db
						.delete(customersResources)
						.where(inArray(customersResources.id, orphanedIds));
					deleted = orphanedIds.length;
					console.log(
						`🗑️ Deleted ${deleted} orphaned customer_resource entries (no matching memberships) for user ${experienceUsers[0].name}`
					);
				} catch (error) {
					console.error(`Error deleting orphaned customer resources:`, error);
					errors += orphanedIds.length;
				}
			}
		} else {
			// Sync for all users - delete orphaned entries for all users in experience
			const userIdsToCheck = experienceUsers.map((u: (typeof experienceUsers)[0]) => u.id);
			const orphanedEntries = existingEntries.filter(
				(e: ExistingEntry) => !matchedEntryIds.has(e.id) && userIdsToCheck.includes(e.userId)
			);
			
			if (orphanedEntries.length > 0) {
				const orphanedIds = orphanedEntries.map((e: ExistingEntry) => e.id);
				try {
					await db
						.delete(customersResources)
						.where(inArray(customersResources.id, orphanedIds));
					deleted = orphanedIds.length;
					console.log(
						`🗑️ Deleted ${deleted} orphaned customer_resource entries (no matching memberships) across all users`
					);
				} catch (error) {
					console.error(`Error deleting orphaned customer resources:`, error);
					errors += orphanedIds.length;
				}
			}
		}

		console.log(
			`Sync completed: ${membershipsToProcess.length} memberships processed, ${created} created, ${updated} updated, ${deleted} deleted, ${errors} errors`
		);

		return { created, updated, deleted, errors };
	} catch (error) {
		console.error("Error syncing customer memberships:", error);
		throw error;
	}
}

