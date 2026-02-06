"use client";

import { useCallback, useRef } from "react";
import {
	DEFAULT_VISUALIZATION_STATE,
	type VisualizationState,
	createVisualizationState,
	isVisualizationStateReadyToSave,
} from "../types/visualization";
import { deduplicatedFetch } from "../utils/requestDeduplication";
import { apiPut, apiGet } from "../utils/api-client";

interface UseVisualizationPersistenceOptions {
	funnelId: string;
	enabled?: boolean;
	debounceMs?: number;
	onSaveComplete?: () => void; // Callback when save is complete
	onSaveError?: (error: Error) => void; // Callback when save fails
	user?: { experienceId?: string } | null;
}

interface UseVisualizationPersistenceReturn {
	saveVisualizationState: (state: VisualizationState) => Promise<void>;
	loadVisualizationState: () => Promise<VisualizationState>;
	isSaving: boolean;
	isLoading: boolean;
	lastError: string | null;
}

/**
 * Hook for persisting funnel visualization state
 * Handles debounced saving and loading of visualization preferences
 */
export function useVisualizationPersistence({
	funnelId,
	enabled = true,
	debounceMs = 1000,
	onSaveComplete,
	onSaveError,
	user,
}: UseVisualizationPersistenceOptions): UseVisualizationPersistenceReturn {
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isSavingRef = useRef(false);
	const isLoadingRef = useRef(false);
	const lastErrorRef = useRef<string | null>(null);

	// Debounced save function
	const saveVisualizationState = useCallback(
		async (state: VisualizationState) => {
			if (!enabled || !funnelId) return;

			// Clear existing timeout
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			// Set new timeout for debounced save
			saveTimeoutRef.current = setTimeout(async () => {
				try {
					isSavingRef.current = true;
					lastErrorRef.current = null;

					// Skip save when user context is not available (e.g. initial load, preview)
					if (!user?.experienceId) {
						return;
					}

					const response = await apiPut(
						`/api/funnels/${funnelId}/visualization`,
						state,
						user.experienceId
					);

					if (!response.ok) {
						const errorData = await response.json();
						throw new Error(
							errorData.message || "Failed to save visualization state",
						);
					}

					console.log("Visualization state saved successfully");

					// Call the completion callback if provided
					if (onSaveComplete) {
						onSaveComplete();
					}
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					lastErrorRef.current = errorMessage;
					console.error("Error saving visualization state:", error);

					// Call the error callback if provided
					if (onSaveError && error instanceof Error) {
						onSaveError(error);
					}
				} finally {
					isSavingRef.current = false;
				}
			}, debounceMs);
		},
		[funnelId, enabled, debounceMs, onSaveComplete, onSaveError, user?.experienceId],
	);

	// Load visualization state
	const loadVisualizationState =
		useCallback(async (): Promise<VisualizationState> => {
			if (!enabled || !funnelId) {
				return DEFAULT_VISUALIZATION_STATE;
			}

			// Check if user context is available
			if (!user?.experienceId) {
				console.warn("Experience ID is required for loading visualization state");
				return DEFAULT_VISUALIZATION_STATE;
			}

			try {
				isLoadingRef.current = true;
				lastErrorRef.current = null;

				const response = await apiGet(
					`/api/funnels/${funnelId}/visualization`,
					user.experienceId
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(
						errorData.message || "Failed to load visualization state",
					);
				}

				const data = await response.json();
				const loadedState = data.data || DEFAULT_VISUALIZATION_STATE;

				console.log("Visualization state loaded successfully");
				return loadedState;
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				lastErrorRef.current = errorMessage;
				console.error("Error loading visualization state:", error);
				return DEFAULT_VISUALIZATION_STATE;
			} finally {
				isLoadingRef.current = false;
			}
		}, [funnelId, enabled, user?.experienceId]);

	return {
		saveVisualizationState,
		loadVisualizationState,
		isSaving: isSavingRef.current,
		isLoading: isLoadingRef.current,
		lastError: lastErrorRef.current,
	};
}

/**
 * Hook for auto-saving visualization state when layout is complete
 */
export function useAutoSaveVisualization({
	funnelId,
	layoutPhase,
	positions,
	lines,
	stageLayouts,
	canvasDimensions,
	interactions,
	viewport,
	preferences,
	editingBlockId,
	user,
}: {
	funnelId: string;
	layoutPhase: "measure" | "final";
	positions: Record<string, any>;
	lines: any[];
	stageLayouts: any[];
	canvasDimensions: { itemCanvasWidth: number; totalCanvasHeight: number };
	interactions: any;
	viewport: any;
	preferences: any;
	editingBlockId: string | null;
	user?: { experienceId?: string } | null;
}) {
	const { saveVisualizationState } = useVisualizationPersistence({ funnelId, user });

	// Auto-save when layout is complete and stable
	const autoSave = useCallback(() => {
		if (
			isVisualizationStateReadyToSave(
				layoutPhase,
				positions,
				lines,
				editingBlockId,
			)
		) {
			const state = createVisualizationState(
				layoutPhase,
				positions,
				lines,
				stageLayouts,
				canvasDimensions,
				interactions,
				viewport,
				preferences,
			);

			if (state) {
				saveVisualizationState(state);
			}
		}
	}, [
		layoutPhase,
		positions,
		lines,
		stageLayouts,
		canvasDimensions,
		interactions,
		viewport,
		preferences,
		editingBlockId,
		saveVisualizationState,
	]);

	return { autoSave };
}

// Removed useCoordinatedFunnelSave - funnel flow saving is now handled by the generation API
// Visualization updates are now a separate concern handled by useAutoSaveVisualization
