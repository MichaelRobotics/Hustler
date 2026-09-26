import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectMembershipToCancel } from "./membership-cancel.ts";

describe("selectMembershipToCancel", () => {
	it("matches plan_id and user_id and prefers the active membership", () => {
		const result = selectMembershipToCancel(
			[
				{
					id: "mem_old",
					status: "past_due",
					plan_id: "plan_1",
					user_id: "user_1",
					account: { id: "biz_1" },
				},
				{
					id: "mem_live",
					status: "active",
					plan_id: "plan_1",
					user_id: "user_1",
					product_id: "prod_1",
					account: { id: "biz_1" },
				},
			],
			{ planId: "plan_1", userId: "user_1", productId: "prod_1", companyId: "biz_1" },
		);

		assert.deepEqual(result, { ok: true, membershipId: "mem_live" });
	});

	it("ignores rows that do not expose plan_id and user_id", () => {
		const result = selectMembershipToCancel(
			[
				{ id: "mem_flat", status: "active", plan_id: null, user_id: "user_1" },
				{ id: "mem_other", status: "active", plan_id: "plan_1", user_id: "user_2" },
			],
			{ planId: "plan_1", userId: "user_1" },
		);

		assert.deepEqual(result, { ok: false, reason: "not_found" });
	});

	it("refuses two equally live matches", () => {
		const result = selectMembershipToCancel(
			[
				{ id: "mem_a", status: "active", plan_id: "plan_1", user_id: "user_1" },
				{ id: "mem_b", status: "active", plan_id: "plan_1", user_id: "user_1" },
			],
			{ planId: "plan_1", userId: "user_1" },
		);

		assert.deepEqual(result, { ok: false, reason: "ambiguous" });
	});
});
