import { db } from "@/lib/supabase/db-server";
import { resources, users, experiences } from "@/lib/supabase/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { getWhopApiClient } from "@/lib/whop-api-client";

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
		console.log(`🔄 Triggering product sync for new admin user ${userId} in experience ${experienceId}`);

		// Check if products have already been synced for this experience
		const existingAppResources = await db.select()
			.from(resources)
			.where(
				and(
					eq(resources.experienceId, experienceId),
					eq(resources.type, "MY_PRODUCTS"),
					eq(resources.category, "FREE_VALUE"),
					isNotNull(resources.whopAppId)
				)
			)
			.limit(1);

		if (existingAppResources.length > 0) {
			console.log(`✅ Products already synced for experience ${experienceId}, skipping sync`);
			// Mark user as synced even though we didn't sync (already done)
			await db.update(users)
				.set({ productsSynced: true })
				.where(eq(users.id, userId));
			return;
		}

		console.log(`🚀 Starting product sync for experience ${experienceId}`);

		// Get Whop API client
		const whopClient = getWhopApiClient();

		// Step 1: Sync installed apps as FREE products
		console.log("📱 Syncing installed apps...");
		const apps = await whopClient.getInstalledApps(companyId);
		
		for (const app of apps) {
			const resourceData = {
				experienceId,
				userId,
				name: app.name || app.description || `App ${app.id}`,
				type: "MY_PRODUCTS" as const,
				category: "FREE_VALUE" as const,
				link: `https://whop.com/hub/${companyId}/${app.id}?ref=${experienceId}`,
				description: app.description,
				whopAppId: app.id,
				whopProductId: null,
				whopMembershipId: null
			};
			
			await db.insert(resources).values(resourceData);
			console.log(`✅ Created FREE product for app: ${app.name || app.id}`);
		}

		// Step 2: Sync memberships as PAID products
		console.log("💳 Syncing memberships...");
		const memberships = await whopClient.getCompanyMemberships(companyId);
		
		for (const membership of memberships) {
			const resourceData = {
				experienceId,
				userId,
				name: membership.name || `Membership ${membership.id}`,
				type: "MY_PRODUCTS" as const,
				category: "PAID" as const,
				link: `https://whop.com/hub/${companyId}/memberships/${membership.id}?ref=${experienceId}`,
				description: membership.description,
				whopAppId: null,
				whopProductId: null,
				whopMembershipId: membership.id
			};
			
			await db.insert(resources).values(resourceData);
			console.log(`✅ Created PAID product for membership: ${membership.name || membership.id}`);
		}

		// Step 3: Mark user as synced
		await db.update(users)
			.set({ productsSynced: true })
			.where(eq(users.id, userId));

		console.log(`🎉 Product sync completed for experience ${experienceId}: ${apps.length} apps, ${memberships.length} memberships`);

	} catch (error) {
		console.error("❌ Error during product sync:", error);
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
