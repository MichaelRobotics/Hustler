import type { Funnel } from "../types/resource";

/**
 * Check if a funnel has the minimum required products for generation
 * @param funnel - The funnel to validate
 * @returns Object with validation results
 */
export function validateFunnelProducts(funnel: Funnel): {
	isValid: boolean;
	hasPaidProducts: boolean;
	hasFreeProducts: boolean;
	missingTypes: string[];
} {
	const resources = funnel.resources || [];
	
	const paidCount = resources.filter(r => r.category === "PAID").length;
	const freeCount = resources.filter(r => r.category === "FREE_VALUE").length;
	
	const hasPaidProducts = paidCount >= 1;
	const hasFreeProducts = freeCount >= 1;
	const isValid = hasPaidProducts && hasFreeProducts;
	
	const missingTypes: string[] = [];
	if (!hasPaidProducts) missingTypes.push("PAID");
	if (!hasFreeProducts) missingTypes.push("FREE");
	
	return {
		isValid,
		hasPaidProducts,
		hasFreeProducts,
		missingTypes,
	};
}

/**
 * Check if funnel generation should be disabled
 * @param funnel - The funnel to check
 * @returns boolean - true if generation should be disabled
 */
export function shouldDisableGeneration(funnel: Funnel): boolean {
	const validation = validateFunnelProducts(funnel);
	return !validation.isValid;
}

/**
 * Get validation message for insufficient products
 * @param funnel - The funnel to validate
 * @returns string - Human-readable validation message
 */
export function getValidationMessage(funnel: Funnel): string {
	const validation = validateFunnelProducts(funnel);
	
	if (validation.missingTypes.length === 0) {
		return "";
	}
	
	if (validation.missingTypes.length === 2) {
		return "Add at least 1 PAID product and 1 FREE product to generate your funnel.";
	}
	
	if (validation.missingTypes.includes("PAID")) {
		return "Add at least 1 PAID product to generate your funnel.";
	}
	
	if (validation.missingTypes.includes("FREE")) {
		return "Add at least 1 FREE product to generate your funnel.";
	}
	
	return "";
}
