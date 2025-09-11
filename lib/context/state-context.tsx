/**
 * State Management Context Provider
 *
 * React context provider for the state management system that provides
 * state access and management functions to all child components.
 */

"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import {
	type UseStateManagerOptions,
	useStateManager,
} from "../hooks/useStateManager";
import type {
	BackendState,
	FrontendState,
	StateAction,
	StateContext,
} from "../state/types";
import type { AuthenticatedUser } from "../types/user";

interface StateContextType {
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
	conflicts: any[];
	resolveConflict: (conflictId: string, resolution: any) => void;

	// Sync operations
	syncOperations: any[];

	// Utilities
	clearState: () => void;
	exportState: () => string;
	importState: (stateJson: string) => boolean;
	getStateStats: () => any;

	// Loading and error states
	isLoading: boolean;
	error: string | null;
}

const StateContext = createContext<StateContextType | null>(null);

interface StateProviderProps {
	children: ReactNode;
	user: AuthenticatedUser | null;
	options?: UseStateManagerOptions;
}

export function StateProvider({
	children,
	user,
	options = {},
}: StateProviderProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const stateManager = useStateManager(user, {
		enableRealtime: true,
		enableOptimisticUpdates: true,
		enableOfflineSupport: true,
		...options,
	});

	// Initialize state management
	useEffect(() => {
		if (user) {
			setIsLoading(true);
			setError(null);

			// State manager initialization is handled by the hook
			// We just need to wait for it to be ready
			const timer = setTimeout(() => {
				setIsLoading(false);
			}, 1000);

			return () => clearTimeout(timer);
		} else {
			setIsLoading(false);
		}
	}, [user]);

	// Handle errors
	useEffect(() => {
		if (
			stateManager.state.sync.operations.some((op) => op.status === "failed")
		) {
			setError("Some operations failed to sync");
		} else {
			setError(null);
		}
	}, [stateManager.state.sync.operations]);

	const contextValue: StateContextType = {
		...stateManager,
		isLoading,
		error,
	};

	return (
		<StateContext.Provider value={contextValue}>
			{children}
		</StateContext.Provider>
	);
}

/**
 * Hook to use state context
 */
export function useStateContext(): StateContextType {
	const context = useContext(StateContext);

	if (!context) {
		throw new Error("useStateContext must be used within a StateProvider");
	}

	return context;
}

/**
 * Hook to use frontend state only
 */
export function useFrontendStateContext(): {
	state: FrontendState;
	updateState: (updates: Partial<FrontendState>) => void;
	dispatch: (action: StateAction) => void;
	isLoading: boolean;
	error: string | null;
} {
	const { frontendState, updateFrontendState, dispatch, isLoading, error } =
		useStateContext();

	return {
		state: frontendState,
		updateState: updateFrontendState,
		dispatch,
		isLoading,
		error,
	};
}

/**
 * Hook to use backend state only
 */
export function useBackendStateContext(): {
	state: BackendState;
	updateState: (updates: Partial<BackendState>) => void;
	isLoading: boolean;
	error: string | null;
} {
	const { backendState, updateBackendState, isLoading, error } =
		useStateContext();

	return {
		state: backendState,
		updateState: updateBackendState,
		isLoading,
		error,
	};
}

/**
 * Hook to use real-time state
 */
export function useRealtimeStateContext(): {
	isConnected: boolean;
	status: string;
	pendingUpdates: number;
	sync: () => Promise<void>;
	isLoading: boolean;
	error: string | null;
} {
	const {
		isRealtimeConnected,
		realtimeStatus,
		pendingUpdates,
		syncWithBackend,
		isLoading,
		error,
	} = useStateContext();

	return {
		isConnected: isRealtimeConnected,
		status: realtimeStatus,
		pendingUpdates,
		sync: syncWithBackend,
		isLoading,
		error,
	};
}

/**
 * Hook to use offline support
 */
export function useOfflineStateContext(): {
	isOnline: boolean;
	enableOfflineMode: () => void;
	disableOfflineMode: () => void;
	syncPendingOperations: () => Promise<void>;
	isLoading: boolean;
	error: string | null;
} {
	const {
		isOnline,
		enableOfflineMode,
		disableOfflineMode,
		syncPendingOperations,
		isLoading,
		error,
	} = useStateContext();

	return {
		isOnline,
		enableOfflineMode,
		disableOfflineMode,
		syncPendingOperations,
		isLoading,
		error,
	};
}

/**
 * Hook to use conflict resolution
 */
export function useConflictStateContext(): {
	conflicts: any[];
	resolveConflict: (conflictId: string, resolution: any) => void;
	hasConflicts: boolean;
	isLoading: boolean;
	error: string | null;
} {
	const { conflicts, resolveConflict, isLoading, error } = useStateContext();

	return {
		conflicts,
		resolveConflict,
		hasConflicts: conflicts.length > 0,
		isLoading,
		error,
	};
}

/**
 * Hook to use sync operations
 */
export function useSyncStateContext(): {
	operations: any[];
	pendingOperations: any[];
	failedOperations: any[];
	syncWithBackend: () => Promise<void>;
	forceSync: () => Promise<void>;
	hasPendingOperations: boolean;
	hasFailedOperations: boolean;
	isLoading: boolean;
	error: string | null;
} {
	const { syncOperations, syncWithBackend, forceSync, isLoading, error } =
		useStateContext();

	const pendingOperations = syncOperations.filter(
		(op) => op.status === "pending" || op.status === "syncing",
	);

	const failedOperations = syncOperations.filter(
		(op) => op.status === "failed",
	);

	return {
		operations: syncOperations,
		pendingOperations,
		failedOperations,
		syncWithBackend,
		forceSync,
		hasPendingOperations: pendingOperations.length > 0,
		hasFailedOperations: failedOperations.length > 0,
		isLoading,
		error,
	};
}

/**
 * Hook to use optimistic updates
 */
export function useOptimisticStateContext(): {
	optimisticUpdates: any[];
	handleOptimisticUpdate: (action: StateAction) => void;
	hasOptimisticUpdates: boolean;
	isLoading: boolean;
	error: string | null;
} {
	const { frontendState, handleOptimisticUpdate, isLoading, error } =
		useStateContext();

	const optimisticUpdates = Object.values(frontendState.optimisticUpdates);

	return {
		optimisticUpdates,
		handleOptimisticUpdate,
		hasOptimisticUpdates: optimisticUpdates.length > 0,
		isLoading,
		error,
	};
}

/**
 * Hook to use state persistence
 */
export function useStatePersistenceContext(): {
	saveState: () => string;
	loadState: () => boolean;
	clearSavedState: () => void;
	exportState: () => string;
	importState: (stateJson: string) => boolean;
	isLoading: boolean;
	error: string | null;
} {
	const { exportState, importState, clearState, isLoading, error } =
		useStateContext();

	const saveState = () => {
		const stateJson = exportState();
		localStorage.setItem("whop-app-state-export", stateJson);
		return stateJson;
	};

	const loadState = () => {
		const saved = localStorage.getItem("whop-app-state-export");
		if (saved) {
			return importState(saved);
		}
		return false;
	};

	const clearSavedState = () => {
		localStorage.removeItem("whop-app-state-export");
		clearState();
	};

	return {
		saveState,
		loadState,
		clearSavedState,
		exportState,
		importState,
		isLoading,
		error,
	};
}

export default StateProvider;
