import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { users, experiences } from "@/lib/supabase/schema";
import { eq, and } from "drizzle-orm";
import { getUserContext } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";

/**
 * GET /api/customers/users - Get list of customer users in the experience
 * Query params: experienceId (required)
 * Only accessible by admins
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const experienceId = searchParams.get("experienceId");

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

		// Only admins can access this endpoint
		if (userContext.user.accessLevel !== "admin") {
			return NextResponse.json(
				{ error: "Access denied. Admin only." },
				{ status: 403 }
			);
		}

		// Get all customer users in the experience
		const customerUsers = await db.query.users.findMany({
			where: and(
				eq(users.experienceId, experience.id),
				eq(users.accessLevel, "customer")
			),
			columns: {
				id: true,
				name: true,
				avatar: true,
				whopUserId: true,
			},
			orderBy: (table: typeof users, { asc }: { asc: (column: any) => any }) => [asc(table.name)],
		});

		// Also include the admin user (current user) in the list
		const adminUser = {
			id: userContext.user.id,
			name: userContext.user.name,
			avatar: userContext.user.avatar,
			whopUserId: userContext.user.whopUserId,
		};

		return NextResponse.json({
			success: true,
			data: [adminUser, ...customerUsers],
		});
	} catch (error) {
		console.error("Error getting customer users:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}


