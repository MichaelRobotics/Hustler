/**
 * SDK 2 list and retrieve types omit plan_ids. Keep ids this app stored at create time.
 * A product-scoped promo still clears plan ids. External promos with no stored ids stay unset.
 */
export const PLANS_SET_IN_WHOP = "plans set in Whop";

export function resolveSyncedPlanIds(input: {
	productId: string | null;
	listedPlanIds?: string[] | null;
	existingPlanIds: unknown;
}): unknown {
	if (input.productId) return null;
	if (input.listedPlanIds && input.listedPlanIds.length > 0) {
		return JSON.stringify(input.listedPlanIds);
	}
	return input.existingPlanIds ?? null;
}

export function normalizePlanIds(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((id): id is string => typeof id === "string" && id.length > 0);
	}
	if (typeof value === "string" && value.trim().startsWith("[")) {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) {
				return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
			}
		} catch {
			return [];
		}
	}
	return [];
}

/**
 * External promos have no plan ids from SDK 2 retrieve or list.
 * Do not invent a plan list. Product-scoped promos are not plan-scoped.
 */
export function promoPlanScopeLabel(input: {
	productId?: string | null;
	planIds: unknown;
}): string | null {
	if (input.productId) return null;
	if (normalizePlanIds(input.planIds).length > 0) return null;
	return PLANS_SET_IN_WHOP;
}
