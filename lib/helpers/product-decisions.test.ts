import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { liveChatFilterLabel } from "./live-chat-labels.ts";
import { merchantNodeIsConnected } from "./merchant-graph.ts";
import { liveChatRequiresPro, purchaseProSubscription } from "./pro-checkout.ts";
import { PLANS_SET_IN_WHOP, normalizePlanIds, promoPlanScopeLabel } from "./promo-plan-ids.ts";
import { projectCheckoutResource, resourceListOwnerFilter } from "./resource-read-scope.ts";

describe("promo plan scope", () => {
	it("labels external promos without guessing plan ids", () => {
		assert.equal(promoPlanScopeLabel({ productId: null, planIds: null }), PLANS_SET_IN_WHOP);
		assert.equal(promoPlanScopeLabel({ productId: null, planIds: [] }), PLANS_SET_IN_WHOP);
		assert.equal(promoPlanScopeLabel({ productId: "prod_1", planIds: null }), null);
		assert.equal(promoPlanScopeLabel({ productId: null, planIds: ["plan_1"] }), null);
	});

	it("does not treat a raw string as a plan id", () => {
		assert.deepEqual(normalizePlanIds("plan_1"), []);
		assert.deepEqual(normalizePlanIds('["plan_1"]'), ["plan_1"]);
	});
});

describe("merchant graph", () => {
	it("marks a node with no edge as not connected", () => {
		const edges = [{ sourceId: "a", targetId: "b" }];
		assert.equal(merchantNodeIsConnected("a", edges), true);
		assert.equal(merchantNodeIsConnected("c", edges), false);
	});
});

describe("live chat labels", () => {
	it("names admin-handled and bot-handled filters", () => {
		assert.equal(liveChatFilterLabel("open"), "Needs reply");
		assert.equal(liveChatFilterLabel("auto"), "Bot");
	});
});

describe("pro checkout", () => {
	it("stops when the Pro plan row is missing", async () => {
		const result = await purchaseProSubscription({
			experienceId: "exp_1",
			inWhop: true,
			lookupPlan: async () => null,
			createCheckout: async () => {
				throw new Error("should not create");
			},
			inAppPurchase: async () => {
				throw new Error("should not purchase");
			},
		});
		assert.deepEqual(result, { ok: false, reason: "Pro plan is not available." });
	});

	it("calls checkout create and inAppPurchase with the looked-up plan", async () => {
		const calls: string[] = [];
		const result = await purchaseProSubscription({
			experienceId: "exp_1",
			inWhop: true,
			lookupPlan: async () => ({ planId: "plan_pro" }),
			createCheckout: async (planId, experienceId) => {
				calls.push(`create:${planId}:${experienceId}`);
				return { checkoutId: "ch_1", planId };
			},
			inAppPurchase: async (input) => {
				calls.push(`buy:${input.planId}:${input.id}`);
				return { status: "ok" };
			},
		});
		assert.deepEqual(result, { ok: true });
		assert.deepEqual(calls, ["create:plan_pro:exp_1", "buy:plan_pro:ch_1"]);
		assert.equal(liveChatRequiresPro("Basic"), true);
		assert.equal(liveChatRequiresPro("Pro"), false);
		assert.equal(liveChatRequiresPro("Vip"), false);
	});
});

describe("customer resource reads", () => {
	it("lets customers read the experience and only checkout fields", () => {
		assert.equal(resourceListOwnerFilter("customer"), "none");
		assert.equal(resourceListOwnerFilter("admin"), "none");
		assert.equal(resourceListOwnerFilter("no_access"), "caller");
		const projected = projectCheckoutResource({
			id: "res_1",
			name: "Course",
			planId: "plan_1",
			checkoutConfigurationId: "ch_1",
			price: "10",
			code: "SECRET",
			funnels: [{ id: "funnel_1" }],
		});
		assert.equal(projected.planId, "plan_1");
		assert.equal("code" in projected, false);
		assert.deepEqual(projected.funnels, []);
	});
});
