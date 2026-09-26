import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedDownloadUrl, safeDownloadFilename } from "./download-url.ts";
import { resolveSyncedPlanIds } from "./promo-plan-ids.ts";
import { offerResponseClosedConversation } from "./offer-cta-response.ts";
import { sameExperienceId } from "./experience-id.ts";

describe("isAllowedDownloadUrl", () => {
	it("allows Whop HTTPS hosts", () => {
		assert.equal(isAllowedDownloadUrl("https://assets-2-prod.whop.com/uploads/file.pdf"), true);
		assert.equal(isAllowedDownloadUrl("https://whop.com/assets/file.png"), true);
	});

	it("rejects other hosts, http, and IP addresses", () => {
		assert.equal(isAllowedDownloadUrl("https://example.com/file.pdf"), false);
		assert.equal(isAllowedDownloadUrl("http://assets.whop.com/file.pdf"), false);
		assert.equal(isAllowedDownloadUrl("https://169.254.169.254/latest"), false);
		assert.equal(isAllowedDownloadUrl("https://user:pass@assets.whop.com/file.pdf"), false);
	});
});

describe("safeDownloadFilename", () => {
	it("strips header characters", () => {
		assert.equal(safeDownloadFilename('a"\r\nb.pdf'), "ab.pdf");
	});
});

describe("resolveSyncedPlanIds", () => {
	it("keeps stored plan ids when the list payload omits them", () => {
		assert.equal(
			resolveSyncedPlanIds({
				productId: null,
				listedPlanIds: undefined,
				existingPlanIds: '["plan_1"]',
			}),
			'["plan_1"]',
		);
	});

	it("replaces stored ids when the list payload includes them", () => {
		assert.equal(
			resolveSyncedPlanIds({
				productId: null,
				listedPlanIds: ["plan_2"],
				existingPlanIds: '["plan_1"]',
			}),
			'["plan_2"]',
		);
	});

	it("clears plan ids for a product-scoped promo", () => {
		assert.equal(
			resolveSyncedPlanIds({
				productId: "prod_1",
				listedPlanIds: ["plan_1"],
				existingPlanIds: '["plan_1"]',
			}),
			null,
		);
	});
});

describe("offerResponseClosedConversation", () => {
	it("reads the nested success payload", () => {
		assert.equal(
			offerResponseClosedConversation({ success: true, data: { conversation: { status: "closed" } } }),
			true,
		);
		assert.equal(offerResponseClosedConversation({ data: { conversation: { status: "active" } } }), false);
	});
});

describe("sameExperienceId", () => {
	const experience = { id: "uuid-1", whopExperienceId: "exp_1" };
	it("matches the internal id and the Whop id", () => {
		assert.equal(sameExperienceId("exp_1", experience), true);
		assert.equal(sameExperienceId("uuid-1", experience), true);
		assert.equal(sameExperienceId("exp_other", experience), false);
	});
});
