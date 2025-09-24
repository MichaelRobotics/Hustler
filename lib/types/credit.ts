// Credit pack configurations
export const CREDIT_PACKS = {
	starter: {
		id: "starter",
		name: "Starter",
		credits: 5,
		price: 9.99,
		planId: process.env.NEXT_PUBLIC_CREDIT_PACK_STARTER_PLAN_ID,
		description: "Try AI funnels",
	},
	popular: {
		id: "popular",
		name: "Popular",
		credits: 15,
		price: 24.99,
		planId: process.env.NEXT_PUBLIC_CREDIT_PACK_POPULAR_PLAN_ID,
		description: "Best value",
		badge: "Most Popular",
	},
	pro: {
		id: "pro",
		name: "Pro",
		credits: 30,
		price: 39.99,
		planId: process.env.NEXT_PUBLIC_CREDIT_PACK_PRO_PLAN_ID,
		description: "Power users",
	},
} as const;

export type CreditPackId = keyof typeof CREDIT_PACKS;
