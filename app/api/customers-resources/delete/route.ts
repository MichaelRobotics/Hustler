import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/supabase/db-server";
import { customersResources, experiences } from "@/lib/supabase/schema";
import { getUserContext } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";

/**
 * POST /api/customers-resources/delete
 * Removes the local customers_resources row. Does not delete remote file storage.
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const customerResourceId = typeof body?.customerResourceId === "string" ? body.customerResourceId : "";
		const experienceId = typeof body?.experienceId === "string" ? body.experienceId : "";

		if (!customerResourceId || !experienceId) {
			return NextResponse.json(
				{ error: "customerResourceId and experienceId are required" },
				{ status: 400 },
			);
		}

		const headersList = await headers();
		const { userId: whopUserId } = await whopSdk.verifyUserToken(headersList);
		if (!whopUserId) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
		});
		if (!experience) {
			return NextResponse.json({ error: "Experience not found" }, { status: 404 });
		}

		const userContext = await getUserContext(
			whopUserId,
			experience.whopCompanyId,
			experienceId,
			false,
		);
		if (!userContext?.user) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		const resource = await db.query.customersResources.findFirst({
			where: and(
				eq(customersResources.id, customerResourceId),
				eq(customersResources.experienceId, experience.id),
			),
		});
		if (!resource) {
			return NextResponse.json({ error: "Customer resource not found" }, { status: 404 });
		}

		const isAdmin = userContext.user.accessLevel === "admin";
		if (!isAdmin && resource.userId !== userContext.user.id) {
			return NextResponse.json({ error: "Access denied" }, { status: 403 });
		}

		await db.delete(customersResources).where(eq(customersResources.id, resource.id));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting customer resource:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
