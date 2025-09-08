/**
 * State Management System - Main Export
 *
 * Centralized export for the complete state management system including
 * synchronization, real-time updates, validation, and performance optimization.
 */

// Core types
export type {
	FrontendState,
	BackendState,
	StateContext,
	StateAction,
	StateUpdate,
	StateManager,
	SyncOperation,
	ConflictResolution,
	FunnelData,
	ResourceData,
	ConversationData,
	MessageData,
	UserSettings,
	NotificationPreferences,
	FunnelAnalyticsData,
	UserAnalyticsData,
	initialFrontendState,
	initialBackendState,
	initialState,
} from "./types";

// State management
export { stateManager } from "./manager";
export { stateSyncManager } from "./sync";
export { realtimeStateManager } from "./realtime";

// Validation and error handling
export { stateValidator } from "./validation";
export type {
	ValidationRule,
	ValidationResult,
	ValidationError,
	ErrorRecovery,
} from "./validation";

// Performance optimization
export { statePerformanceOptimizer } from "./performance";
export type {
	PerformanceConfig,
	CacheEntry,
	PerformanceMetrics,
	OptimizationResult,
} from "./performance";

// React hooks
export {
	useStateManager,
	useFrontendState,
	useBackendState,
	useRealtimeState,
	useOfflineSupport,
	useConflictResolution,
	useSyncOperations,
	useOptimisticUpdates,
	useStatePersistence,
} from "../hooks/useStateManager";

export type {
	UseStateManagerOptions,
	UseStateManagerReturn,
} from "../hooks/useStateManager";

// Configuration types
export type {
	SyncConfig,
	SyncResult,
} from "./sync";

export type {
	RealtimeConfig,
	RealtimeState,
} from "./realtime";

export type { StateManagerConfig } from "./manager";

// Import instances
import { stateManager } from "./manager";
import { statePerformanceOptimizer } from "./performance";
import { realtimeStateManager } from "./realtime";
import { stateSyncManager } from "./sync";
import { stateValidator } from "./validation";

/**
 * Initialize complete state management system
 */
export async function initializeStateManagement(
	user: any,
	config: {
		enableRealtime?: boolean;
		enableOfflineSupport?: boolean;
		enableOptimisticUpdates?: boolean;
		enableConflictResolution?: boolean;
		enableValidation?: boolean;
		enablePerformanceOptimization?: boolean;
		syncInterval?: number;
		maxRetries?: number;
	} = {},
): Promise<void> {
	try {
		// Initialize main state manager
		await stateManager.initialize(user);

		// Initialize validation if enabled
		if (config.enableValidation !== false) {
			// Validation is automatically available
			console.log("State validation enabled");
		}

		// Initialize performance optimization if enabled
		if (config.enablePerformanceOptimization !== false) {
			// Performance optimization is automatically available
			console.log("State performance optimization enabled");
		}

		console.log("State management system initialized successfully");
	} catch (error) {
		console.error("Failed to initialize state management system:", error);
		throw error;
	}
}

/**
 * Get state management system status
 */
export function getStateManagementStatus(): {
	isInitialized: boolean;
	realtimeConnected: boolean;
	isOnline: boolean;
	pendingOperations: number;
	conflicts: number;
	cacheStats: any;
	performanceMetrics: any;
} {
	const state = stateManager.getState();
	const realtimeState = realtimeStateManager.getRealtimeState();
	const cacheStats = statePerformanceOptimizer.getCacheStats();
	const performanceMetrics = statePerformanceOptimizer.getPerformanceMetrics();

	return {
		isInitialized: true,
		realtimeConnected: realtimeState.isConnected,
		isOnline: state.sync.isOnline,
		pendingOperations: state.sync.operations.length,
		conflicts: state.sync.conflicts.length,
		cacheStats,
		performanceMetrics,
	};
}

/**
 * Dispose of state management system
 */
export function disposeStateManagement(): void {
	try {
		stateManager.dispose();
		realtimeStateManager.disconnect();
		statePerformanceOptimizer.clearCache();
		console.log("State management system disposed");
	} catch (error) {
		console.error("Error disposing state management system:", error);
	}
}

/**
 * Export state management utilities
 */
export const stateUtils = {
	// Validation utilities
	validateState: (state: any) => stateValidator.validateStateContext(state),
	validateEntity: (type: string, entity: any) =>
		stateValidator.validateEntity(type, entity),
	sanitizeState: (state: any) => stateValidator.sanitizeState(state),
	getRecoverySuggestions: (errors: any[]) =>
		stateValidator.getRecoverySuggestions(errors),

	// Performance utilities
	optimizeStateAccess: (
		key: string,
		fetchFn: () => Promise<any>,
		options?: any,
	) => statePerformanceOptimizer.optimizeStateAccess(key, fetchFn, options),
	optimizeStateStructure: (state: any) =>
		statePerformanceOptimizer.optimizeStateStructure(state),
	compressData: (data: any) => statePerformanceOptimizer.compressData(data),
	decompressData: (data: string) =>
		statePerformanceOptimizer.decompressData(data),
	getPerformanceMetrics: () =>
		statePerformanceOptimizer.getPerformanceMetrics(),
	getOptimizationRecommendations: () =>
		statePerformanceOptimizer.generateOptimizationRecommendations(),

	// Sync utilities
	syncWithBackend: () => stateManager.syncWithBackend(),
	forceSync: () => stateManager.forceSync(),
	getSyncOperations: () => stateManager.getSyncOperations(),
	getConflicts: () => stateManager.getConflicts(),
	resolveConflict: (id: string, resolution: any) =>
		stateManager.resolveConflict(id, resolution),

	// Real-time utilities
	isRealtimeConnected: () => realtimeStateManager.isConnected(),
	getRealtimeStatus: () => realtimeStateManager.getConnectionStatus(),
	getPendingUpdates: () => realtimeStateManager.getPendingUpdatesCount(),

	// State utilities
	getState: () => stateManager.getState(),
	getFrontendState: () => stateManager.getFrontendState(),
	getBackendState: () => stateManager.getBackendState(),
	updateFrontendState: (updates: any) =>
		stateManager.updateFrontendState(updates),
	updateBackendState: (updates: any) =>
		stateManager.updateBackendState(updates),
	clearState: () => stateManager.clearState(),
	exportState: () => stateManager.exportState(),
	importState: (stateJson: string) => stateManager.importState(stateJson),
	getStateStats: () => stateManager.getStateStats(),
};

// Default export
export default {
	initializeStateManagement,
	getStateManagementStatus,
	disposeStateManagement,
	stateUtils,
	stateManager,
	stateSyncManager,
	realtimeStateManager,
	stateValidator,
	statePerformanceOptimizer,
};
