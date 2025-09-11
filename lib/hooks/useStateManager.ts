/**
 * React Hooks for State Management
 *
 * Provides React hooks for integrating with the state management system,
 * including real-time updates, optimistic updates, and offline support.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthenticatedUser } from "../types/user";
import { stateManager } from "../state/manager";
import {
	type BackendState,
	type ConflictResolution,
	type FrontendState,
	type StateAction,
	type StateContext,
	StateUpdate,
	type SyncOperation,
} from "../state/types";

export interface UseStateManagerOptions {
	enableRealtime?: boolean;
	enableOptimisticUpdates?: boolean;
	enableOfflineSupport?: boolean;
	syncInterval?: number;
}

export interface UseStateManagerReturn {
	// State
	state: StateContext;
	frontendState: FrontendState;
	backendState: BackendState;

	// State updates
	updateFrontendState: (updates: Partial<FrontendState>) => void;
	updateBackendState: (updates: Partial<BackendState>) => void;

	// Actions
	dispatch: (action: StateAction) => void;
	handleOptimisticUpdate: (action: StateAction) => void;

	// Sync
	syncWithBackend: () => Promise<void>;
	forceSync: () => Promise<void>;
	syncPendingOperations: () => Promise<void>;

	// Real-time
	isRealtimeConnected: boolean;
	realtimeStatus: string;
	pendingUpdates: number;

	// Offline support
	isOnline: boolean;
	enableOfflineMode: () => void;
	disableOfflineMode: () => void;

	// Conflicts
	conflicts: ConflictResolution[];
	resolveConflict: (conflictId: string, resolution: ConflictResolution) => void;

	// Sync operations
	syncOperations: SyncOperation[];

	// Utilities
	clearState: () => void;
	exportState: () => string;
	importState: (stateJson: string) => boolean;
	getStateStats: () => any;
}

/**
 * Main state manager hook
 */
export function useStateManager(
	user: AuthenticatedUser | null,
	options: UseStateManagerOptions = {},
): UseStateManagerReturn {
	const [state, setState] = useState<StateContext>(() =>
		stateManager.getState(),
	);
	const [isInitialized, setIsInitialized] = useState(false);
	const unsubscribeRef = useRef<(() => void) | null>(null);

	// Initialize state manager
	useEffect(() => {
		if (user && !isInitialized) {
			const initialize = async () => {
				try {
					await stateManager.initialize(user);
					setIsInitialized(true);

					// Subscribe to updates
					unsubscribeRef.current = stateManager.subscribeToUpdates((update) => {
						setState(stateManager.getState());
					});
				} catch (error) {
					console.error("Failed to initialize state manager:", error);
				}
			};

			initialize();
		}

		return () => {
			if (unsubscribeRef.current) {
				unsubscribeRef.current();
			}
		};
	}, [user, isInitialized]);

	// Update state when manager state changes
	useEffect(() => {
		if (isInitialized) {
			setState(stateManager.getState());
		}
	}, [isInitialized]);

	// Memoized state values
	const frontendState = useMemo(() => state.frontend, [state.frontend]);
	const backendState = useMemo(() => state.backend, [state.backend]);
	const conflicts = useMemo(() => state.sync.conflicts, [state.sync.conflicts]);
	const syncOperations = useMemo(
		() => state.sync.operations,
		[state.sync.operations],
	);
	const isOnline = useMemo(() => state.sync.isOnline, [state.sync.isOnline]);
	const isRealtimeConnected = useMemo(
		() => state.realtime.isConnected,
		[state.realtime.isConnected],
	);
	const realtimeStatus = useMemo(
		() => state.realtime.connectionStatus,
		[state.realtime.connectionStatus],
	);
	const pendingUpdates = useMemo(
		() => state.realtime.pendingUpdates,
		[state.realtime.pendingUpdates],
	);

	// State update functions
	const updateFrontendState = useCallback((updates: Partial<FrontendState>) => {
		stateManager.updateFrontendState(updates);
	}, []);

	const updateBackendState = useCallback((updates: Partial<BackendState>) => {
		stateManager.updateBackendState(updates);
	}, []);

	// Action dispatch
	const dispatch = useCallback(
		(action: StateAction) => {
			if (options.enableOptimisticUpdates) {
				stateManager.handleOptimisticUpdate(action);
			}
		},
		[options.enableOptimisticUpdates],
	);

	const handleOptimisticUpdate = useCallback((action: StateAction) => {
		stateManager.handleOptimisticUpdate(action);
	}, []);

	// Sync functions
	const syncWithBackend = useCallback(async () => {
		await stateManager.syncWithBackend();
	}, []);

	const forceSync = useCallback(async () => {
		await stateManager.forceSync();
	}, []);

	const syncPendingOperations = useCallback(async () => {
		await stateManager.syncPendingOperations();
	}, []);

	// Offline support
	const enableOfflineMode = useCallback(() => {
		stateManager.enableOfflineMode();
	}, []);

	const disableOfflineMode = useCallback(() => {
		stateManager.disableOfflineMode();
	}, []);

	// Conflict resolution
	const resolveConflict = useCallback(
		(conflictId: string, resolution: ConflictResolution) => {
			stateManager.resolveConflict(conflictId, resolution);
		},
		[],
	);

	// Utilities
	const clearState = useCallback(() => {
		stateManager.clearState();
	}, []);

	const exportState = useCallback(() => {
		return stateManager.exportState();
	}, []);

	const importState = useCallback((stateJson: string) => {
		return stateManager.importState(stateJson);
	}, []);

	const getStateStats = useCallback(() => {
		return stateManager.getStateStats();
	}, []);

	return {
		state,
		frontendState,
		backendState,
		updateFrontendState,
		updateBackendState,
		dispatch,
		handleOptimisticUpdate,
		syncWithBackend,
		forceSync,
		syncPendingOperations,
		isRealtimeConnected,
		realtimeStatus,
		pendingUpdates,
		isOnline,
		enableOfflineMode,
		disableOfflineMode,
		conflicts,
		resolveConflict,
		syncOperations,
		clearState,
		exportState,
		importState,
		getStateStats,
	};
}

/**
 * Hook for frontend state only
 */
export function useFrontendState(user: AuthenticatedUser | null) {
	const { frontendState, updateFrontendState, dispatch } = useStateManager(
		user,
		{
			enableOptimisticUpdates: true,
		},
	);

	return {
		state: frontendState,
		updateState: updateFrontendState,
		dispatch,
	};
}

/**
 * Hook for backend state only
 */
export function useBackendState(user: AuthenticatedUser | null) {
	const { backendState, updateBackendState } = useStateManager(user);

	return {
		state: backendState,
		updateState: updateBackendState,
	};
}

/**
 * Hook for real-time updates
 */
export function useRealtimeState(user: AuthenticatedUser | null) {
	const {
		isRealtimeConnected,
		realtimeStatus,
		pendingUpdates,
		syncWithBackend,
	} = useStateManager(user, {
		enableRealtime: true,
	});

	return {
		isConnected: isRealtimeConnected,
		status: realtimeStatus,
		pendingUpdates,
		sync: syncWithBackend,
	};
}

/**
 * Hook for offline support
 */
export function useOfflineSupport(user: AuthenticatedUser | null) {
	const {
		isOnline,
		enableOfflineMode,
		disableOfflineMode,
		syncPendingOperations,
	} = useStateManager(user, {
		enableOfflineSupport: true,
	});

	return {
		isOnline,
		enableOfflineMode,
		disableOfflineMode,
		syncPendingOperations,
	};
}

/**
 * Hook for conflict resolution
 */
export function useConflictResolution(user: AuthenticatedUser | null) {
	const { conflicts, resolveConflict } = useStateManager(user, {
		enableOptimisticUpdates: true,
	});

	return {
		conflicts,
		resolveConflict,
		hasConflicts: conflicts.length > 0,
	};
}

/**
 * Hook for sync operations
 */
export function useSyncOperations(user: AuthenticatedUser | null) {
	const { syncOperations, syncWithBackend, forceSync, getStateStats } =
		useStateManager(user);

	const pendingOperations = useMemo(
		() =>
			syncOperations.filter(
				(op) => op.status === "pending" || op.status === "syncing",
			),
		[syncOperations],
	);

	const failedOperations = useMemo(
		() => syncOperations.filter((op) => op.status === "failed"),
		[syncOperations],
	);

	return {
		operations: syncOperations,
		pendingOperations,
		failedOperations,
		syncWithBackend,
		forceSync,
		getStateStats,
		hasPendingOperations: pendingOperations.length > 0,
		hasFailedOperations: failedOperations.length > 0,
	};
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdates(user: AuthenticatedUser | null) {
	const { handleOptimisticUpdate, frontendState } = useStateManager(user, {
		enableOptimisticUpdates: true,
	});

	const optimisticUpdates = useMemo(
		() => Object.values(frontendState.optimisticUpdates),
		[frontendState.optimisticUpdates],
	);

	return {
		optimisticUpdates,
		handleOptimisticUpdate,
		hasOptimisticUpdates: optimisticUpdates.length > 0,
	};
}

/**
 * Hook for state persistence
 */
export function useStatePersistence(user: AuthenticatedUser | null) {
	const { exportState, importState, clearState } = useStateManager(user);

	const saveState = useCallback(() => {
		const stateJson = exportState();
		localStorage.setItem("whop-app-state-export", stateJson);
		return stateJson;
	}, [exportState]);

	const loadState = useCallback(() => {
		const saved = localStorage.getItem("whop-app-state-export");
		if (saved) {
			return importState(saved);
		}
		return false;
	}, [importState]);

	const clearSavedState = useCallback(() => {
		localStorage.removeItem("whop-app-state-export");
		clearState();
	}, [clearState]);

	return {
		saveState,
		loadState,
		clearSavedState,
		exportState,
		importState,
	};
}
