import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectMembershipToCancel } from "./membership-cancel.ts";

describe("selectMembershipToCancel", () => {
	it("matches nested plan and user and prefers the active membership", () => {
		const result = selectMembershipToCancel(
			[
				{
					id: "mem_old",
					status: "past_due",
					plan: { id: "plan_1" },
					user: { id: "user_1" },
					company: { id: "biz_1" },
				},
				{
					id: "mem_live",
					status: "active",
					plan: { id: "plan_1" },
					user: { id: "user_1" },
					product: { id: "prod_1" },
					company: { id: "biz_1" },
				},
			],
			{ planId: "plan_1", userId: "user_1", productId: "prod_1", companyId: "biz_1" },
		);

		assert.deepEqual(result, { ok: true, membershipId: "mem_live" });
	});

	it("ignores rows that do not expose nested plan and user", () => {
		const result = selectMembershipToCancel(
			[
				{ id: "mem_flat", status: "active", plan: null, user: { id: "user_1" } },
				{ id: "mem_other", status: "active", plan: { id: "plan_1" }, user: { id: "user_2" } },
			],
			{ planId: "plan_1", userId: "user_1" },
		);

		assert.deepEqual(result, { ok: false, reason: "not_found" });
	});

	it("refuses two equally live matches", () => {
		const result = selectMembershipToCancel(
			[
				{ id: "mem_a", status: "active", plan: { id: "plan_1" }, user: { id: "user_1" } },
				{ id: "mem_b", status: "active", plan: { id: "plan_1" }, user: { id: "user_1" } },
			],
			{ planId: "plan_1", userId: "user_1" },
		);

		assert.deepEqual(result, { ok: false, reason: "ambiguous" });
	});
});
