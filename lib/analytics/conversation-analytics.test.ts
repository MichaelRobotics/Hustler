import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeConversationAnalytics } from "./conversation-analytics.ts";

describe("computeConversationAnalytics", () => {
	it("returns the calculated response time, duration, and progress", () => {
		const createdAt = new Date("2026-01-01T00:00:00.000Z");
		const userAt = new Date("2026-01-01T00:01:00.000Z");
		const botAt = new Date("2026-01-01T00:01:30.000Z");
		const updatedAt = new Date("2026-01-01T00:05:00.000Z");

		const result = computeConversationAnalytics({
			conversationId: "conv-1",
			createdAt,
			updatedAt,
			interactionCount: 1,
			flow: { blocks: { welcome: {}, offer: {} } },
			messages: [
				{ type: "bot", createdAt },
				{ type: "user", createdAt: userAt },
				{ type: "bot", createdAt: botAt },
			],
		});

		assert.equal(result.conversationId, "conv-1");
		assert.equal(result.totalMessages, 3);
		assert.equal(result.userMessages, 1);
		assert.equal(result.botMessages, 2);
		assert.equal(result.avgResponseTime, 30_000);
		assert.equal(result.conversationDuration, 5 * 60 * 1000);
		assert.equal(result.funnelProgress, 50);
		assert.equal(result.lastActivity.toISOString(), updatedAt.toISOString());
		assert.equal(result.engagementScore, 10 + 25);
	});

	it("averages only user-to-bot gaps and ignores out-of-order input", () => {
		const result = computeConversationAnalytics({
			conversationId: "conv-2",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
			interactionCount: 0,
			messages: [
				{ type: "bot", createdAt: "2026-01-01T00:00:20.000Z" },
				{ type: "user", createdAt: "2026-01-01T00:00:00.000Z" },
				{ type: "user", createdAt: "2026-01-01T00:01:00.000Z" },
				{ type: "bot", createdAt: "2026-01-01T00:01:10.000Z" },
			],
		});

		assert.equal(result.avgResponseTime, 15_000);
		assert.equal(result.funnelProgress, 0);
		assert.equal(result.conversationDuration, 0);
	});

	it("falls back to a 10-step funnel and caps progress at 100", () => {
		const result = computeConversationAnalytics({
			conversationId: "conv-3",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:01.000Z",
			interactionCount: 25,
			messages: [],
		});

		assert.equal(result.funnelProgress, 100);
		assert.equal(result.avgResponseTime, 0);
		assert.equal(result.engagementScore, 50);
	});
});
