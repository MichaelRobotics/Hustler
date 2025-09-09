/**
 * --- Funnel Validation Helpers ---
 * This file contains validation functions for funnel flow data to ensure
 * robust checking across the application.
 */

import { FunnelFlow } from "@/lib/types/funnel";

interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean; // Track if funnel was ever live
	flow?: FunnelFlow | null;
	[key: string]: any;
}

/**
 * Robust validation function to check if a funnel has valid flow data.
 * This prevents false positives from empty objects, arrays, or incomplete data.
 *
 * @param funnel - The funnel object to validate
 * @returns boolean - True if the funnel has valid, complete flow data
 */
export const hasValidFlow = (funnel: Funnel | null): boolean => {
	// Check if funnel exists
	if (!funnel) {
		return false;
	}

	// Check if flow exists
	if (!funnel.flow) {
		return false;
	}

	// Check if flow is a proper object
	if (typeof funnel.flow !== "object" || funnel.flow === null) {
		return false;
	}

	// Check if stages exist and have content
	if (!Array.isArray(funnel.flow.stages) || funnel.flow.stages.length === 0) {
		return false;
	}

	// Check if blocks exist and have content
	if (
		!funnel.flow.blocks ||
		typeof funnel.flow.blocks !== "object" ||
		Object.keys(funnel.flow.blocks).length === 0
	) {
		return false;
	}

	// Check if startBlockId exists and is valid
	if (
		!funnel.flow.startBlockId ||
		typeof funnel.flow.startBlockId !== "string" ||
		funnel.flow.startBlockId.length === 0
	) {
		return false;
	}

	return true;
};

/**
 * Simple check for flow existence (less strict than hasValidFlow)
 * This can be used where you only need to know if flow property exists
 *
 * @param funnel - The funnel object to check
 * @returns boolean - True if flow property exists (even if empty)
 */
export const hasFlowProperty = (funnel: Funnel | null): boolean => {
	return !!(funnel && funnel.flow);
};
