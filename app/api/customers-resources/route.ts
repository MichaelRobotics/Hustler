import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { customersResources, experiences, users, resources } from "@/lib/supabase/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserContext } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

/**
 * GET /api/customers-resources - Get customer resources
 * Query params: experienceId (required), userId (optional, for admin viewing specific user)
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const experienceId = searchParams.get("experienceId");
		const userId = searchParams.get("userId"); // Optional: for admin viewing specific user

		if (!experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 }
			);
		}

		// Authenticate user
		const headersList = await headers();
		const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);

		if (!whopUserId) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 }
			);
		}

		// Get experience
		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});

		if (!experience) {
			return NextResponse.json(
				{ error: "Experience not found" },
				{ status: 404 }
			);
		}

		// Get user context to check access level
		const userContext = await getUserContext(
			whopUserId,
			experience.whopCompanyId,
			experienceId,
			false,
		);

		if (!userContext?.user) {
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 }
			);
		}

		const isAdmin = userContext.user.accessLevel === "admin";
		const targetUserId = userId || userContext.user.id;

		// If admin viewing another user, verify the user exists in the experience
		if (isAdmin && userId && userId !== userContext.user.id) {
			const targetUser = await db.query.users.findFirst({
				where: and(
					eq(users.id, userId),
					eq(users.experienceId, experience.id)
				),
			});

			if (!targetUser) {
				return NextResponse.json(
					{ error: "Target user not found" },
					{ status: 404 }
				);
			}
		}

		// If customer, only allow viewing their own resources
		if (!isAdmin && userId && userId !== userContext.user.id) {
			return NextResponse.json(
				{ error: "Access denied" },
				{ status: 403 }
			);
		}

		// Query customer resources and join with resources table to get type and storageUrl
		const customerResources = await db
			.select({
				customerResource: customersResources,
				resourceType: resources.type,
				storageUrl: resources.storageUrl,
			})
			.from(customersResources)
			.leftJoin(
				resources,
				and(
					eq(resources.experienceId, customersResources.experienceId),
					eq(resources.planId, customersResources.membershipPlanId)
				)
			)
			.where(
				and(
					eq(customersResources.experienceId, experience.id),
					eq(customersResources.userId, targetUserId)
				)
			)
			.orderBy(desc(customersResources.createdAt));

		// Map results to include resource type and convert camelCase to snake_case for frontend
		const enrichedResources = customerResources.map((row: {
			customerResource: typeof customersResources.$inferSelect;
			resourceType: string | null;
			storageUrl: string | null;
		}) => ({
			customer_resource_id: row.customerResource.id, // ID from customers_resources table
			company_id: row.customerResource.companyId,
			experience_id: row.customerResource.experienceId,
			user_id: row.customerResource.userId,
			user_name: row.customerResource.userName,
			membership_plan_id: row.customerResource.membershipPlanId,
			membership_product_id: row.customerResource.membershipProductId || undefined,
			download_link: row.customerResource.downloadLink || undefined,
			product_name: row.customerResource.productName,
			description: row.customerResource.description || undefined,
			image: row.customerResource.image || undefined,
			created_at: row.customerResource.createdAt,
			updated_at: row.customerResource.updatedAt,
			resourceType: (row.resourceType || "WHOP") as "WHOP" | "LINK" | "FILE",
			storage_url: row.storageUrl || undefined,
		}));

		return NextResponse.json({
			success: true,
			data: enrichedResources,
		});
	} catch (error) {
		console.error("Error getting customer resources:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

