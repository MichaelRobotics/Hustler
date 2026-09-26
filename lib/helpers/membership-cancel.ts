/**
 * Pick the membership to cancel from @whop/sdk@2 list rows.
 * Those rows expose plan_id, product_id, user_id, and account.id.
 * A row without an id, plan_id, and user_id is ignored.
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
	plan_id?: string | null;
	user_id?: string | null;
	product_id?: string | null;
	account?: { id?: string | null } | null;
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
		if (!membership.id || !membership.plan_id || !membership.user_id) return false;
		if (membership.plan_id !== criteria.planId || membership.user_id !== criteria.userId) return false;
		if (criteria.companyId && membership.account?.id && membership.account.id !== criteria.companyId) {
			return false;
		}
		if (criteria.productId && membership.product_id && membership.product_id !== criteria.productId) {
			return false;
		}
		return LIVE_STATUS_RANK[membership.status ?? ""] !== undefined;
	});

	const narrowed = criteria.productId
		? matched.filter((membership) => membership.product_id === criteria.productId)
		: matched;
	const pool = narrowed.length > 0 ? narrowed : matched.filter((membership) => !membership.product_id);

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
