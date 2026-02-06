import { and, eq, or } from "drizzle-orm";
import { db } from "../supabase/db-server";
import { customersResources, resources } from "../supabase/schema";

/**
 * Get the set of resource IDs (our internal resources table) that the member has
 * by matching customers_resources (membershipPlanId / membershipProductId) to resources (planId / whopProductId).
 */
export async function getMemberResourceIds(
	experienceId: string,
	userId: string
): Promise<string[]> {
	const rows = await db
		.select({ resourceId: resources.id })
		.from(customersResources)
		.innerJoin(
			resources,
			and(
				eq(resources.experienceId, customersResources.experienceId),
				or(
					eq(resources.planId, customersResources.membershipPlanId),
					eq(resources.whopProductId, customersResources.membershipProductId)
				)
			)
		)
		.where(
			and(
				eq(customersResources.experienceId, experienceId),
				eq(customersResources.userId, userId)
			)
		);

	return [...new Set(rows.map((r: { resourceId: string | null }) => r.resourceId).filter(Boolean))] as string[];
}

/**
 * Returns true if the member passes the trigger filter (or if no filter is set).
 * - filterResourceIdsRequired: member must have bought all of these (our resource IDs).
 * - filterResourceIdsExclude: member must not have bought any of these.
 */
export function memberPassesTriggerFilter(
	filterResourceIdsRequired: string[] | undefined,
	filterResourceIdsExclude: string[] | undefined,
	memberResourceIds: string[]
): boolean {
	if (
		(!filterResourceIdsRequired || filterResourceIdsRequired.length === 0) &&
		(!filterResourceIdsExclude || filterResourceIdsExclude.length === 0)
	) {
		return true;
	}
	const set = new Set(memberResourceIds);
	if (filterResourceIdsRequired?.length) {
		if (!filterResourceIdsRequired.every((id) => set.has(id))) return false;
	}
	if (filterResourceIdsExclude?.length) {
		if (filterResourceIdsExclude.some((id) => set.has(id))) return false;
	}
	return true;
}
