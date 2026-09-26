/**
 * Pick the membership to cancel from @whop/sdk@0.0.19 list/retrieve rows.
 * Those rows expose nested plan.id and user.id. A row without both is ignored.
 */

const LIVE_STATUS_RANK: Record<string, number> = {
	active: 0,
	trialing: 1,
	past_due: 2,
	unresolved: 3,
};

export interface MembershipCancelCandidate {
	id?: string | null;
	status?: string | null;
	plan?: { id?: string | null } | null;
	user?: { id?: string | null } | null;
	product?: { id?: string | null } | null;
	company?: { id?: string | null } | null;
}

export interface MembershipCancelCriteria {
	planId: string;
	userId: string;
	productId?: string | null;
	companyId?: string | null;
}

export type MembershipCancelSelection =
	| { ok: true; membershipId: string }
	| { ok: false; reason: "not_found" | "ambiguous" };

export function selectMembershipToCancel(
	memberships: MembershipCancelCandidate[],
	criteria: MembershipCancelCriteria,
): MembershipCancelSelection {
	const matched = memberships.filter((membership) => {
		const planId = membership.plan?.id;
		const userId = membership.user?.id;
		if (!membership.id || !planId || !userId) return false;
		if (planId !== criteria.planId || userId !== criteria.userId) return false;
		if (criteria.companyId && membership.company?.id && membership.company.id !== criteria.companyId) {
			return false;
		}
		if (criteria.productId && membership.product?.id && membership.product.id !== criteria.productId) {
			return false;
		}
		return LIVE_STATUS_RANK[membership.status ?? ""] !== undefined;
	});

	const narrowed =
		criteria.productId
			? matched.filter((membership) => membership.product?.id === criteria.productId)
			: matched;
	const pool = narrowed.length > 0 ? narrowed : matched.filter((membership) => !membership.product?.id);

	if (pool.length === 0) return { ok: false, reason: "not_found" };

	const bestRank = Math.min(
		...pool.map((membership) => LIVE_STATUS_RANK[membership.status ?? ""] ?? 99),
	);
	const top = pool.filter(
		(membership) => (LIVE_STATUS_RANK[membership.status ?? ""] ?? 99) === bestRank,
	);
	if (top.length !== 1 || !top[0]?.id) return { ok: false, reason: "ambiguous" };
	return { ok: true, membershipId: top[0].id };
}
