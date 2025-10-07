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
	hasMinimumResources: boolean;
	missingTypes: string[];
} {
	const resources = funnel.resources || [];
	
	const paidCount = resources.filter(r => r.category === "PAID").length;
	const freeCount = resources.filter(r => r.category === "FREE_VALUE").length;
	
	const hasPaidProducts = paidCount >= 1;
	const hasFreeProducts = freeCount >= 1;
	const hasMinimumResources = resources.length >= 3;
	const isValid = hasFreeProducts && hasMinimumResources;
	
	const missingTypes: string[] = [];
	if (!hasFreeProducts) missingTypes.push("FREE");
	if (!hasMinimumResources) missingTypes.push("MINIMUM");
	
	return {
		isValid,
		hasPaidProducts,
		hasFreeProducts,
		hasMinimumResources,
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
	
	if (validation.missingTypes.includes("MINIMUM") && validation.missingTypes.includes("FREE")) {
		return "Add at least 3 resources and 1 FREE resource to generate your funnel.";
	}
	
	if (validation.missingTypes.includes("MINIMUM")) {
		return "Add at least 3 resources to generate your funnel.";
	}
	
	if (validation.missingTypes.includes("FREE")) {
		return "Add at least 1 FREE resource to generate your funnel.";
	}
	
	return "";
}
