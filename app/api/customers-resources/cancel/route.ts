import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/supabase/db-server";
import { customersResources, experiences, users } from "@/lib/supabase/schema";
import { getUserContext } from "@/lib/context/user-context";
import { whopSdk } from "@/lib/whop-sdk";
import { cancelMembership } from "@/lib/actions/credit-actions";
import { selectMembershipToCancel, type MembershipCancelCandidate } from "@/lib/helpers/membership-cancel";

/**
 * POST /api/customers-resources/cancel
 * Resolves a membership from the stored plan id via @whop/sdk@0.0.19 nested plan/user, then cancels it.
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

		const owner = await db.query.users.findFirst({
			where: eq(users.id, resource.userId),
			columns: { whopUserId: true },
		});
		if (!owner?.whopUserId || !resource.membershipPlanId || !resource.companyId) {
			return NextResponse.json(
				{ error: "This resource is missing the plan or member needed to cancel" },
				{ status: 400 },
			);
		}

		const Whop = (await import("@whop/sdk")).default;
		const client = new Whop({
			apiKey: process.env.WHOP_API_KEY!,
		});

		const listed: MembershipCancelCandidate[] = [];
		for await (const membership of client.memberships.list({
			company_id: resource.companyId,
			plan_ids: [resource.membershipPlanId],
			user_ids: [owner.whopUserId],
		})) {
			listed.push(membership);
		}

		const selection = selectMembershipToCancel(listed, {
			planId: resource.membershipPlanId,
			userId: owner.whopUserId,
			productId: resource.membershipProductId,
			companyId: resource.companyId,
		});

		if (!selection.ok) {
			const message = selection.reason === "ambiguous"
				? "More than one live membership matches this plan"
				: "No live membership matches this plan and member";
			return NextResponse.json({ error: message }, { status: selection.reason === "ambiguous" ? 409 : 404 });
		}

		const cancelled = await cancelMembership(selection.membershipId);
		if (!cancelled) {
			return NextResponse.json({ error: "Whop could not cancel this membership" }, { status: 502 });
		}

		await db.delete(customersResources).where(eq(customersResources.id, resource.id));

		return NextResponse.json({
			success: true,
			membershipId: selection.membershipId,
		});
	} catch (error) {
		console.error("Error cancelling customer membership:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
