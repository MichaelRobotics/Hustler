import type { FunnelFlow } from "../../types/funnel";

/**
 * Mock funnel data for testing UserChat components
 * Simplified funnel with only 1 flow, max 60 lines
 * 2 offer paths, 3 answers each before offer
 */

export const mockFunnelFlow: FunnelFlow = {
	startBlockId: "welcome_1",
	stages: [
		{
			id: "stage-welcome",
			name: "WELCOME",
			explanation: "Initial greeting and segmentation.",
			blockIds: ["welcome_1"],
		},
		{
			id: "stage-challenge",
			name: "CHALLENGE",
			explanation: "Identify the user's main challenge.",
			blockIds: ["business_challenge", "personal_challenge"],
		},
		{
			id: "stage-goal",
			name: "GOAL",
			explanation: "Determine what the user wants to achieve.",
			blockIds: ["business_goal", "personal_goal"],
		},
		{
			id: "stage-timeline",
			name: "TIMELINE",
			explanation: "Understand the user's urgency.",
			blockIds: ["business_timeline", "personal_timeline"],
		},
		{
			id: "stage-offer",
			name: "OFFER",
			explanation: "Present the tailored resource.",
			blockIds: ["business_offer", "personal_offer"],
		},
	],
	blocks: {
		welcome_1: {
			id: "welcome_1",
			message:
				"👋 Hi there! I'm your AI assistant. What brings you here today?\n\nAnswer by pasting one of those numbers",
			options: [
				{
					text: "I need help growing my business",
					nextBlockId: "business_challenge",
				},
				{
					text: "I want to improve myself personally",
					nextBlockId: "personal_challenge",
				},
			],
		},
		business_challenge: {
			id: "business_challenge",
			message:
				"🚀 Great! What's your biggest business challenge right now?\n\nAnswer by pasting one of those numbers",
			options: [
				{ text: "Getting more customers", nextBlockId: "business_goal" },
				{
					text: "Converting visitors to customers",
					nextBlockId: "business_goal",
				},
				{ text: "Scaling my operations", nextBlockId: "business_goal" },
			],
		},
		business_goal: {
			id: "business_goal",
			message:
				"🎯 What would you like to achieve in the next 3 months?\n\nAnswer by pasting one of those numbers",
			options: [
				{ text: "Increase revenue by 50%", nextBlockId: "business_timeline" },
				{ text: "Get 100+ new customers", nextBlockId: "business_timeline" },
				{ text: "Improve my marketing", nextBlockId: "business_timeline" },
			],
		},
		business_timeline: {
			id: "business_timeline",
			message:
				"⏰ How quickly do you want to see results?\n\nAnswer by pasting one of those numbers",
			options: [
				{ text: "I need results immediately", nextBlockId: "business_offer" },
				{ text: "Within the next month", nextBlockId: "business_offer" },
				{ text: "Within 3 months", nextBlockId: "business_offer" },
			],
		},
		business_offer: {
			id: "business_offer",
			message:
				"🎉 Excellent! Based on your selections, here's your perfect match:\n\n✅ Business Growth Blueprint:\n[https://example.com/business-blueprint](https://example.com/business-blueprint)\n🎁 Promo Code: GROWTH20 (Limited Time Only!)\n\n🚀 Your Solution Awaits!\nDon't miss out on this valuable resource. Act fast – this promo code is for a limited time only! ⏳",
			resourceName: "Business Growth Blueprint",
			options: [],
		},
		personal_challenge: {
			id: "personal_challenge",
			message:
				"🌟 Great! What's your biggest personal challenge right now?\n\nAnswer by pasting one of those numbers",
			options: [
				{ text: "Building confidence", nextBlockId: "personal_goal" },
				{ text: "Improving productivity", nextBlockId: "personal_goal" },
				{ text: "Developing better habits", nextBlockId: "personal_goal" },
			],
		},
		personal_goal: {
			id: "personal_goal",
			message:
				"💪 What would you like to achieve in the next 30 days?\n\nAnswer by pasting one of those numbers",
			options: [
				{
					text: "Build unshakeable confidence",
					nextBlockId: "personal_timeline",
				},
				{ text: "Double my productivity", nextBlockId: "personal_timeline" },
				{ text: "Develop better habits", nextBlockId: "personal_timeline" },
			],
		},
		personal_timeline: {
			id: "personal_timeline",
			message:
				"⏰ How committed are you to making this change?\n\nAnswer by pasting one of those numbers",
			options: [
				{ text: "I'm very committed", nextBlockId: "personal_offer" },
				{ text: "I'm somewhat committed", nextBlockId: "personal_offer" },
				{ text: "I'm just exploring", nextBlockId: "personal_offer" },
			],
		},
		personal_offer: {
			id: "personal_offer",
			message:
				"🎉 Excellent! Based on your selections, here's your perfect match:\n\n✅ Personal Transformation Guide:\n[https://example.com/personal-guide](https://example.com/personal-guide)\n🎁 Promo Code: TRANSFORM15 (Limited Time Only!)\n\n🌟 Your Transformation Awaits!\nDon't miss out on this life-changing resource. Act fast – this promo code is for a limited time only! ⏳",
			resourceName: "Personal Transformation Guide",
			options: [],
		},
	},
};

// Export the single funnel flow
export const mockFunnelFlows = {
	default: mockFunnelFlow,
};
