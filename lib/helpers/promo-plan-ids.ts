/**
 * SDK 2 list items do not include plan_ids. Keep ids this app stored at create time.
 * A product-scoped promo still clears plan ids. External promos with no stored ids stay unset.
 */
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
