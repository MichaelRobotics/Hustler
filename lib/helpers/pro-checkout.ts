export type ProCheckoutResult = { ok: true } | { ok: false; reason: string };

/**
 * Starts the Pro subscription checkout the webhook already applies.
 * Lookup must return a subscriptions-table plan id. Missing rows fail closed.
 */
export async function purchaseProSubscription(deps: {
	experienceId?: string | null;
	inWhop: boolean;
	lookupPlan: () => Promise<{ planId: string } | null>;
	createCheckout: (
		planId: string,
		experienceId: string,
	) => Promise<{ checkoutId: string; planId: string } | null>;
	inAppPurchase: (input: { planId: string; id: string }) => Promise<{ status: string; error?: string }>;
}): Promise<ProCheckoutResult> {
	if (!deps.inWhop) {
		return { ok: false, reason: "Open this app inside Whop to upgrade." };
	}
	if (!deps.experienceId) {
		return { ok: false, reason: "Experience ID is required to create checkout." };
	}
	const plan = await deps.lookupPlan();
	if (!plan?.planId) {
		return { ok: false, reason: "Pro plan is not available." };
	}
	const checkout = await deps.createCheckout(plan.planId, deps.experienceId);
	if (!checkout?.checkoutId || !checkout.planId) {
		return { ok: false, reason: "Failed to create checkout." };
	}
	const result = await deps.inAppPurchase({ planId: checkout.planId, id: checkout.checkoutId });
	if (result.status !== "ok") {
		return { ok: false, reason: result.error || "Payment failed." };
	}
	return { ok: true };
}

export function liveChatRequiresPro(subscription: string | null | undefined): boolean {
	return subscription !== "Pro" && subscription !== "Vip";
}
