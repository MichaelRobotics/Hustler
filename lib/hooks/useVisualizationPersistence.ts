'use client';

import { useCallback, useRef } from 'react';
import { VisualizationState, DEFAULT_VISUALIZATION_STATE, isVisualizationStateReadyToSave, createVisualizationState } from '../types/visualization';
import { deduplicatedFetch } from '../utils/requestDeduplication';

interface UseVisualizationPersistenceOptions {
  funnelId: string;
  enabled?: boolean;
  debounceMs?: number;
  onSaveComplete?: () => void; // Callback when save is complete
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
  onSaveComplete
}: UseVisualizationPersistenceOptions): UseVisualizationPersistenceReturn {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastErrorRef = useRef<string | null>(null);

  // Debounced save function
  const saveVisualizationState = useCallback(async (state: VisualizationState) => {
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

        const response = await deduplicatedFetch(`/api/funnels/${funnelId}/visualization`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(state)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save visualization state');
        }

        console.log('Visualization state saved successfully');
        
        // Call the completion callback if provided
        if (onSaveComplete) {
          onSaveComplete();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastErrorRef.current = errorMessage;
        console.error('Error saving visualization state:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, debounceMs);
  }, [funnelId, enabled, debounceMs, onSaveComplete]);

  // Load visualization state
  const loadVisualizationState = useCallback(async (): Promise<VisualizationState> => {
    if (!enabled || !funnelId) {
      return DEFAULT_VISUALIZATION_STATE;
    }

    try {
      isLoadingRef.current = true;
      lastErrorRef.current = null;

      const response = await deduplicatedFetch(`/api/funnels/${funnelId}/visualization`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load visualization state');
      }

      const data = await response.json();
      const loadedState = data.data || DEFAULT_VISUALIZATION_STATE;

      console.log('Visualization state loaded successfully');
      return loadedState;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      lastErrorRef.current = errorMessage;
      console.error('Error loading visualization state:', error);
      return DEFAULT_VISUALIZATION_STATE;
    } finally {
      isLoadingRef.current = false;
    }
  }, [funnelId, enabled]);

  return {
    saveVisualizationState,
    loadVisualizationState,
    isSaving: isSavingRef.current,
    isLoading: isLoadingRef.current,
    lastError: lastErrorRef.current
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
  editingBlockId
}: {
  funnelId: string;
  layoutPhase: 'measure' | 'final';
  positions: Record<string, any>;
  lines: any[];
  stageLayouts: any[];
  canvasDimensions: { itemCanvasWidth: number; totalCanvasHeight: number };
  interactions: any;
  viewport: any;
  preferences: any;
  editingBlockId: string | null;
}) {
  const { saveVisualizationState } = useVisualizationPersistence({ funnelId });

  // Auto-save when layout is complete and stable
  const autoSave = useCallback(() => {
    if (isVisualizationStateReadyToSave(layoutPhase, positions, lines, editingBlockId)) {
      const state = createVisualizationState(
        layoutPhase,
        positions,
        lines,
        stageLayouts,
        canvasDimensions,
        interactions,
        viewport,
        preferences
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
    saveVisualizationState
  ]);

  return { autoSave };
}

/**
 * Hook for coordinated saving of both funnel flow and visualization state
 * Saves flow immediately after visualization state is saved
 */
export function useCoordinatedFunnelSave({
  funnelId,
  funnelFlow,
  layoutPhase,
  positions,
  lines,
  stageLayouts,
  canvasDimensions,
  interactions,
  viewport,
  preferences,
  editingBlockId
}: {
  funnelId: string;
  funnelFlow: any;
  layoutPhase: 'measure' | 'final';
  positions: Record<string, any>;
  lines: any[];
  stageLayouts: any[];
  canvasDimensions: { itemCanvasWidth: number; totalCanvasHeight: number };
  interactions: any;
  viewport: any;
  preferences: any;
  editingBlockId: string | null;
}) {
  // Function to save funnel flow to database
  const saveFunnelFlow = useCallback(async () => {
    if (!funnelId || !funnelFlow) return;

    try {
      const saveResponse = await deduplicatedFetch(`/api/funnels/${funnelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flow: funnelFlow })
      });

      if (!saveResponse.ok) {
        console.error('Failed to save generated flow to database:', saveResponse.statusText);
      } else {
        console.log('Generated flow saved to database successfully');
      }
    } catch (saveError) {
      console.error('Error saving generated flow to database:', saveError);
    }
  }, [funnelId, funnelFlow]);

  // Use visualization persistence with flow save callback
  const { saveVisualizationState } = useVisualizationPersistence({ 
    funnelId,
    onSaveComplete: saveFunnelFlow
  });

  // Auto-save when layout is complete and stable
  const autoSave = useCallback(() => {
    if (isVisualizationStateReadyToSave(layoutPhase, positions, lines, editingBlockId)) {
      const state = createVisualizationState(
        layoutPhase,
        positions,
        lines,
        stageLayouts,
        canvasDimensions,
        interactions,
        viewport,
        preferences
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
    saveVisualizationState
  ]);

  return { autoSave };
}
