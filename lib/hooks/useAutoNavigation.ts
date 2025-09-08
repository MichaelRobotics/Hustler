"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import React from "react";

interface Funnel {
	id: string;
	name: string;
	flow?: any;
	generationStatus?: "idle" | "generating" | "completed" | "failed";
	generationError?: string;
	lastGeneratedAt?: number;
}

interface UseAutoNavigationProps {
	funnel: Funnel;
	isGenerating: (funnelId: string) => boolean;
	onNavigate: (funnel: Funnel) => void;
	enabled?: boolean; // Optional flag to enable/disable auto-navigation
}

/**
 * Custom hook for auto-navigation when generation completes
 *
 * Monitors generation state and automatically navigates when:
 * - Generation starts while user is on the page
 * - Generation completes successfully
 * - User stays on the page throughout the process
 *
 * @param funnel - The funnel object to monitor
 * @param isGenerating - Function to check if funnel is currently generating
 * @param onNavigate - Callback function to execute when navigation should occur
 * @param enabled - Optional flag to enable/disable auto-navigation (default: true)
 */
export function useAutoNavigation({
	funnel,
	isGenerating,
	onNavigate,
	enabled = true,
}: UseAutoNavigationProps) {
	// Track if we were generating when component mounted
	const [wasGenerating, setWasGenerating] = React.useState(false);

	// Auto-navigation logic
	React.useEffect(() => {
		// Skip if auto-navigation is disabled
		if (!enabled) {
			return;
		}

		const currentlyGenerating = isGenerating(funnel.id);

		// If we just started generating, remember it
		if (currentlyGenerating && !wasGenerating) {
			console.log(
				"useAutoNavigation: Generation started, will auto-navigate when complete",
			);
			setWasGenerating(true);
		}

		// If we were generating and now we're not, and we have valid flow, navigate
		if (wasGenerating && !currentlyGenerating && hasValidFlow(funnel)) {
			console.log("useAutoNavigation: Generation completed, navigating...");
			setWasGenerating(false);
			onNavigate(funnel);
		}

		// If we were generating but generation failed (no flow), reset the flag
		if (wasGenerating && !currentlyGenerating && !hasValidFlow(funnel)) {
			console.log(
				"useAutoNavigation: Generation failed, resetting auto-navigation flag",
			);
			setWasGenerating(false);
		}
	}, [
		isGenerating,
		funnel.id,
		funnel.flow,
		wasGenerating,
		onNavigate,
		enabled,
	]);

	// Return the current state for debugging/UI purposes
	return {
		wasGenerating,
		isCurrentlyGenerating: isGenerating(funnel.id),
		willAutoNavigate: wasGenerating && isGenerating(funnel.id),
	};
}
