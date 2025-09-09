import { PRODUCT_LIMITS, type Resource, type Funnel } from "../types/resource";

/**
 * Get the current count of products by category in a funnel
 */
export const getProductCounts = (funnel: Funnel): { paid: number; freeValue: number } => {
	const resources = funnel.resources || [];
	
	return {
		paid: resources.filter(r => r.category === "PAID").length,
		freeValue: resources.filter(r => r.category === "FREE_VALUE").length,
	};
};

/**
 * Check if a funnel has reached the limit for a specific product category
 */
export const isProductLimitReached = (funnel: Funnel, category: "PAID" | "FREE_VALUE"): boolean => {
	const counts = getProductCounts(funnel);
	
	if (category === "PAID") {
		return counts.paid >= PRODUCT_LIMITS.PAID;
	} else {
		return counts.freeValue >= PRODUCT_LIMITS.FREE_VALUE;
	}
};

/**
 * Check if a specific resource can be assigned to a funnel (not at limit)
 */
export const canAssignResource = (funnel: Funnel, resource: Resource): boolean => {
	return !isProductLimitReached(funnel, resource.category);
};

/**
 * Get the remaining slots for a specific product category
 */
export const getRemainingSlots = (funnel: Funnel, category: "PAID" | "FREE_VALUE"): number => {
	const counts = getProductCounts(funnel);
	
	if (category === "PAID") {
		return Math.max(0, PRODUCT_LIMITS.PAID - counts.paid);
	} else {
		return Math.max(0, PRODUCT_LIMITS.FREE_VALUE - counts.freeValue);
	}
};

/**
 * Get limit information for display
 */
export const getLimitInfo = (funnel: Funnel) => {
	const counts = getProductCounts(funnel);
	
	return {
		paid: {
			current: counts.paid,
			limit: PRODUCT_LIMITS.PAID,
			remaining: getRemainingSlots(funnel, "PAID"),
			isAtLimit: isProductLimitReached(funnel, "PAID"),
		},
		freeValue: {
			current: counts.freeValue,
			limit: PRODUCT_LIMITS.FREE_VALUE,
			remaining: getRemainingSlots(funnel, "FREE_VALUE"),
			isAtLimit: isProductLimitReached(funnel, "FREE_VALUE"),
		},
	};
};
