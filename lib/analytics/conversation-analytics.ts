/**
 * Pure conversation analytics used by Live Chat.
 * Response time is the gap from a user message to the next bot message.
 * Duration is updatedAt - createdAt. Progress uses the funnel's block count
 * when the flow is available, otherwise a 10-step fallback.
 */

export interface AnalyticsMessage {
	type: string;
	createdAt: Date | string;
}

export interface ConversationAnalyticsInput {
	conversationId: string;
	messages: AnalyticsMessage[];
	interactionCount: number;
	createdAt: Date | string;
	updatedAt: Date | string;
	flow?: { blocks?: Record<string, unknown> } | null;
}

export interface ConversationAnalyticsResult {
	conversationId: string;
	totalMessages: number;
	userMessages: number;
	botMessages: number;
	avgResponseTime: number;
	conversationDuration: number;
	funnelProgress: number;
	lastActivity: Date;
	engagementScore: number;
}

const FALLBACK_FUNNEL_STEPS = 10;

export function toEpochMs(value: Date | string): number {
	const date = value instanceof Date ? value : new Date(value);
	const time = date.getTime();
	return Number.isFinite(time) ? time : 0;
}

export function computeConversationAnalytics(
	input: ConversationAnalyticsInput,
): ConversationAnalyticsResult {
	const messages = [...input.messages].sort(
		(a, b) => toEpochMs(a.createdAt) - toEpochMs(b.createdAt),
	);
	const totalMessages = messages.length;
	const userMessages = messages.filter((message) => message.type === "user").length;
	const botMessages = messages.filter((message) => message.type === "bot").length;

	const responseTimes: number[] = [];
	for (let i = 1; i < messages.length; i++) {
		const previous = messages[i - 1];
		const current = messages[i];
		if (previous.type === "user" && current.type === "bot") {
			const delta = toEpochMs(current.createdAt) - toEpochMs(previous.createdAt);
			if (delta >= 0) responseTimes.push(delta);
		}
	}

	const avgResponseTime =
		responseTimes.length > 0
			? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
			: 0;

	const createdAt = toEpochMs(input.createdAt);
	const updatedAt = toEpochMs(input.updatedAt);
	const conversationDuration = Math.max(0, updatedAt - createdAt);

	const blockCount = input.flow?.blocks ? Object.keys(input.flow.blocks).length : 0;
	const denominator = blockCount > 0 ? blockCount : FALLBACK_FUNNEL_STEPS;
	const funnelProgress =
		input.interactionCount > 0
			? Math.min(100, (input.interactionCount / denominator) * 100)
			: 0;

	const engagementScore = Math.min(100, userMessages * 10 + funnelProgress * 0.5);

	return {
		conversationId: input.conversationId,
		totalMessages,
		userMessages,
		botMessages,
		avgResponseTime,
		conversationDuration,
		funnelProgress,
		lastActivity: new Date(updatedAt || Date.now()),
		engagementScore,
	};
}
