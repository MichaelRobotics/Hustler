import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readPaymentRecoveryFields, renewalTierFromType } from "./payment-recovery.ts";

describe("readPaymentRecoveryFields", () => {
	it("reads flat and nested payment fields", () => {
		const fields = readPaymentRecoveryFields({
			user: { id: "user_1" },
			company_id: "biz_1",
			plan: { id: "plan_1" },
			metadata: { type: "Pro", experienceId: "exp_1" },
			recovery_url: "https://whop.com/billing/recover",
		});

		assert.equal(fields.userId, "user_1");
		assert.equal(fields.companyId, "biz_1");
		assert.equal(fields.planId, "plan_1");
		assert.equal(fields.experienceId, "exp_1");
		assert.equal(fields.metadataType, "Pro");
		assert.equal(fields.recoveryUrl, "https://whop.com/billing/recover");
	});

	it("reads a nested payment object and ignores empty strings", () => {
		const fields = readPaymentRecoveryFields({
			user_id: "  ",
			payment: {
				user_id: "user_2",
				recovery_url: "https://whop.com/pay/retry",
				metadata: { type: "Basic" },
			},
		});

		assert.equal(fields.userId, "user_2");
		assert.equal(fields.metadataType, "Basic");
		assert.equal(fields.recoveryUrl, "https://whop.com/pay/retry");
		assert.equal(fields.planId, null);
	});

	it("returns nulls for a non-object payload", () => {
		const fields = readPaymentRecoveryFields(null);
		assert.equal(fields.userId, null);
		assert.equal(fields.recoveryUrl, null);
		assert.equal(fields.metadataType, null);
	});
});

describe("renewalTierFromType", () => {
	it("accepts Basic, Pro, and Vip only", () => {
		assert.equal(renewalTierFromType("Vip"), "Vip");
		assert.equal(renewalTierFromType("Credits"), null);
		assert.equal(renewalTierFromType("credit_pack"), null);
		assert.equal(renewalTierFromType("Messages"), null);
		assert.equal(renewalTierFromType(null), null);
	});
});
