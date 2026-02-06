import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase/db-server";
import { experiences, funnelResources, funnels, resources } from "@/lib/supabase/schema";
import { eq, inArray } from "drizzle-orm";
import {
	type AuthContext,
	createErrorResponse,
	withWhopAuth,
} from "@/lib/middleware/whop-auth";
import { findFunnelsForTrigger } from "@/lib/helpers/conversation-trigger";

type EnrichedFunnel = {
	id: string;
	name: string;
	flow: unknown;
	resources: unknown[];
	merchantType: string;
	isDeployed: boolean;
	wasEverDeployed: boolean;
	triggerType?: string | null;
	sourceFunnelName?: string | null;
	resourceName?: string | null;
};

async function enrichFunnels(
	dbInstance: { query: typeof db.query },
	funnelList: { id: string; name?: string; flow: unknown; merchantType?: string | null }[],
): Promise<EnrichedFunnel[]> {
	if (funnelList.length === 0) return [];
	return Promise.all(
		funnelList.map(async (funnel) => {
			const funnelResourcesList = await dbInstance.query.funnelResources.findMany({
				where: eq(funnelResources.funnelId, funnel.id),
				with: { resource: true },
			});
			const resourcesList = funnelResourcesList.map((fr: { resource: unknown }) => fr.resource);
			return {
				id: funnel.id,
				name: funnel.name ?? "",
				flow: funnel.flow,
				resources: resourcesList,
				merchantType: funnel.merchantType ?? "qualification",
				isDeployed: true,
				wasEverDeployed: true,
			};
		}),
	);
}

/**
 * GET /api/next-trigger-funnels?experienceId=xxx&completedFunnelId=xxx
 * Returns funnels that would be triggered: after the current funnel completes (funnels),
 * when user buys a product (membershipActivated), and when user cancels (membershipDeactivated).
 * Used in preview chat to list and open "next merchants" with trigger badges.
 */
async function getNextTriggerFunnelsHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;
		const url = new URL(request.url);
		const experienceId = url.searchParams.get("experienceId");
		const completedFunnelId = url.searchParams.get("completedFunnelId");

		if (!experienceId || !completedFunnelId) {
			return createErrorResponse(
				"MISSING_PARAMS",
				"experienceId and completedFunnelId are required",
			);
		}

		if (user.experienceId !== experienceId) {
			return createErrorResponse(
				"FORBIDDEN",
				"Experience ID does not match authenticated user",
			);
		}

		const experience = await db.query.experiences.findFirst({
			where: eq(experiences.whopExperienceId, experienceId),
			columns: { id: true },
		});

		if (!experience) {
			return NextResponse.json(
				{ success: false, error: "Experience not found" },
				{ status: 404 },
			);
		}

		const [funnelCompletedList, membershipActivatedList, membershipDeactivatedList] = await Promise.all([
			findFunnelsForTrigger(experience.id, "funnel_completed", { completedFunnelId }),
			findFunnelsForTrigger(experience.id, "membership_activated"),
			findFunnelsForTrigger(experience.id, "membership_deactivated"),
		]);

		const completedFunnelRow = await db.query.funnels.findFirst({
			where: eq(funnels.id, completedFunnelId),
			columns: { name: true },
		});
		const completedFunnelName: string | null = completedFunnelRow?.name ?? null;

		const membershipResourceIds = new Set<string>();
		for (const f of [...membershipActivatedList, ...membershipDeactivatedList]) {
			const config = f.membershipTriggerConfig as { resourceId?: string } | null | undefined;
			if (config?.resourceId) membershipResourceIds.add(config.resourceId);
		}
		const resourceRows =
			membershipResourceIds.size > 0
				? await db.query.resources.findMany({
						where: inArray(resources.id, Array.from(membershipResourceIds)),
						columns: { id: true, name: true },
					})
				: [];
		type ResourceRow = { id: string; name: string };
		const resourceNameById = new Map(
			(resourceRows as ResourceRow[]).map((r: ResourceRow) => [r.id, r.name]),
		);

		const [enrichedFunnelCompleted, enrichedMembershipActivated, enrichedMembershipDeactivated] =
			await Promise.all([
				enrichFunnels({ query: db.query }, funnelCompletedList),
				enrichFunnels({ query: db.query }, membershipActivatedList),
				enrichFunnels({ query: db.query }, membershipDeactivatedList),
			]);

		const funnelsPayload: EnrichedFunnel[] = enrichedFunnelCompleted.map((ef, i) => ({
			...ef,
			triggerType: funnelCompletedList[i]?.appTriggerType ?? null,
			sourceFunnelName: completedFunnelName,
			resourceName: null,
		}));

		const membershipActivated = enrichedMembershipActivated.map((ef, i) => {
			const raw = membershipActivatedList[i];
			const config = raw?.membershipTriggerConfig as { resourceId?: string } | null | undefined;
			const resourceName = config?.resourceId
				? resourceNameById.get(config.resourceId) ?? null
				: null;
			return {
				...ef,
				triggerType: raw?.membershipTriggerType ?? null,
				sourceFunnelName: null,
				resourceName,
			};
		});

		const membershipDeactivated = enrichedMembershipDeactivated.map((ef, i) => {
			const raw = membershipDeactivatedList[i];
			const config = raw?.membershipTriggerConfig as { resourceId?: string } | null | undefined;
			const resourceName = config?.resourceId
				? resourceNameById.get(config.resourceId) ?? null
				: null;
			return {
				...ef,
				triggerType: raw?.membershipTriggerType ?? null,
				sourceFunnelName: null,
				resourceName,
			};
		});

		return NextResponse.json({
			success: true,
			funnels: funnelsPayload,
			membershipActivated,
			membershipDeactivated,
		});
	} catch (error) {
		console.error("[next-trigger-funnels] Error:", error);
		return createErrorResponse(
			"INTERNAL_ERROR",
			error instanceof Error ? error.message : "Unknown error",
		);
	}
}

export const GET = withWhopAuth(getNextTriggerFunnelsHandler);
