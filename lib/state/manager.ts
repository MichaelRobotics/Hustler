/**
 * Main State Manager
 * 
 * Central state management system that integrates synchronization,
 * real-time updates, conflict resolution, and offline support.
 */

import { 
  StateContext, 
  FrontendState, 
  BackendState, 
  StateAction, 
  StateUpdate, 
  StateManager,
  SyncOperation,
  ConflictResolution
} from './types';
import { stateSyncManager } from './sync';
import { realtimeStateManager } from './realtime';
import { AuthenticatedUser } from '../middleware/simple-auth';

export interface StateManagerConfig {
  enableRealtime: boolean;
  enableOfflineSupport: boolean;
  enableOptimisticUpdates: boolean;
  enableConflictResolution: boolean;
  syncInterval: number;
  maxRetries: number;
}

class MainStateManager implements StateManager {
  private config: StateManagerConfig;
  private isInitialized = false;
  private user: AuthenticatedUser | null = null;
  private subscribers: Array<(update: StateUpdate) => void> = [];

  constructor(config: Partial<StateManagerConfig> = {}) {
    this.config = {
      enableRealtime: true,
      enableOfflineSupport: true,
      enableOptimisticUpdates: true,
      enableConflictResolution: true,
      syncInterval: 5000,
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Initialize state manager
   */
  async initialize(user: AuthenticatedUser): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.user = user;
    this.isInitialized = true;

    try {
      // Initialize sync manager
      stateSyncManager.initialize(user);

      // Initialize real-time manager if enabled
      if (this.config.enableRealtime) {
        await realtimeStateManager.initialize(user);
      }

      // Setup event listeners
      this.setupEventListeners();

      console.log('State manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize state manager:', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): StateContext {
    const syncState = stateSyncManager.getState();
    const realtimeState = realtimeStateManager.getRealtimeState();

    return {
      ...syncState,
      realtime: {
        isConnected: realtimeState.isConnected,
        connectionStatus: realtimeState.connectionStatus,
        pendingUpdates: realtimeState.pendingUpdates
      }
    };
  }

  /**
   * Get frontend state
   */
  getFrontendState(): FrontendState {
    return stateSyncManager.getFrontendState();
  }

  /**
   * Get backend state
   */
  getBackendState(): BackendState {
    return stateSyncManager.getBackendState();
  }

  /**
   * Update frontend state
   */
  updateFrontendState(updates: Partial<FrontendState>): void {
    stateSyncManager.updateFrontendState(updates);
  }

  /**
   * Update backend state
   */
  updateBackendState(updates: Partial<BackendState>): void {
    stateSyncManager.updateBackendState(updates);
  }

  /**
   * Sync with backend
   */
  async syncWithBackend(): Promise<void> {
    await stateSyncManager.syncWithBackend();
  }

  /**
   * Handle optimistic update
   */
  handleOptimisticUpdate(action: StateAction): void {
    if (this.config.enableOptimisticUpdates) {
      stateSyncManager.handleOptimisticUpdate(action);
    }
  }

  /**
   * Resolve conflict
   */
  resolveConflict(conflictId: string, resolution: ConflictResolution): void {
    if (this.config.enableConflictResolution) {
      stateSyncManager.resolveConflict(conflictId, resolution);
    }
  }

  /**
   * Handle real-time update
   */
  handleRealtimeUpdate(update: StateUpdate): void {
    if (this.config.enableRealtime) {
      realtimeStateManager.handleRealtimeUpdate(update);
    }
  }

  /**
   * Subscribe to updates
   */
  subscribeToUpdates(callback: (update: StateUpdate) => void): () => void {
    this.subscribers.push(callback);

    // Also subscribe to real-time updates if enabled
    if (this.config.enableRealtime) {
      realtimeStateManager.subscribe('*', callback);
    }

    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode(): void {
    if (this.config.enableOfflineSupport) {
      stateSyncManager.enableOfflineMode();
    }
  }

  /**
   * Disable offline mode
   */
  disableOfflineMode(): void {
    if (this.config.enableOfflineSupport) {
      stateSyncManager.disableOfflineMode();
    }
  }

  /**
   * Sync pending operations
   */
  async syncPendingOperations(): Promise<void> {
    await stateSyncManager.syncPendingOperations();
  }

  /**
   * Validate state
   */
  validateState(state: Partial<FrontendState | BackendState>): boolean {
    return stateSyncManager.validateState(state);
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): string[] {
    return stateSyncManager.getValidationErrors();
  }

  /**
   * Get sync operations
   */
  getSyncOperations(): SyncOperation[] {
    const state = stateSyncManager.getState();
    return state.sync.operations;
  }

  /**
   * Get conflicts
   */
  getConflicts(): ConflictResolution[] {
    const state = stateSyncManager.getState();
    return state.sync.conflicts;
  }

  /**
   * Get real-time status
   */
  getRealtimeStatus(): {
    isConnected: boolean;
    connectionStatus: string;
    pendingUpdates: number;
  } {
    return realtimeStateManager.getRealtimeState();
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    const state = stateSyncManager.getState();
    return state.sync.isOnline;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    const state = stateSyncManager.getState();
    return state.sync.lastSync;
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    await stateSyncManager.syncWithBackend();
  }

  /**
   * Clear all state
   */
  clearState(): void {
    // Clear frontend state
    this.updateFrontendState({
      currentView: 'dashboard',
      selectedFunnelId: null,
      selectedConversationId: null,
      selectedResourceId: null,
      isTyping: false,
      searchQuery: '',
      appliedFilters: {},
      scrollPosition: 0,
      isModalOpen: false,
      modalType: null,
      selectedOffer: null,
      draftFunnelName: '',
      draftResourceData: {},
      draftConversationData: {},
      hasMore: false,
      messageCount: 0,
      lastMessageAt: null,
      isLoading: false,
      loadingStates: {
        funnels: false,
        resources: false,
        conversations: false,
        analytics: false,
      },
      errors: {},
      optimisticUpdates: {},
    });

    // Clear backend state
    this.updateBackendState({
      funnels: [],
      resources: [],
      conversations: [],
      messages: [],
      funnelAnalytics: [],
      userAnalytics: [],
      generationStatus: 'idle',
      deploymentStatus: 'undeployed',
      syncStatus: 'synced',
      realTimeState: {
        isConnected: false,
        lastSync: null,
        pendingUpdates: 0,
        connectionStatus: 'disconnected',
      },
    });
  }

  /**
   * Export state
   */
  exportState(): string {
    const state = this.getState();
    return JSON.stringify(state, null, 2);
  }

  /**
   * Import state
   */
  importState(stateJson: string): boolean {
    try {
      const state: StateContext = JSON.parse(stateJson);
      
      // Validate imported state
      if (!this.validateState(state.frontend) || !this.validateState(state.backend)) {
        return false;
      }

      // Apply imported state
      this.updateFrontendState(state.frontend);
      this.updateBackendState(state.backend);

      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  /**
   * Get state statistics
   */
  getStateStats(): {
    frontendStateSize: number;
    backendStateSize: number;
    syncOperations: number;
    conflicts: number;
    isOnline: boolean;
    lastSync: Date | null;
    realtimeConnected: boolean;
  } {
    const state = this.getState();
    const realtimeState = realtimeStateManager.getRealtimeState();

    return {
      frontendStateSize: JSON.stringify(state.frontend).length,
      backendStateSize: JSON.stringify(state.backend).length,
      syncOperations: state.sync.operations.length,
      conflicts: state.sync.conflicts.length,
      isOnline: state.sync.isOnline,
      lastSync: state.sync.lastSync,
      realtimeConnected: realtimeState.isConnected
    };
  }

  /**
   * Dispose of state manager
   */
  dispose(): void {
    if (this.config.enableRealtime) {
      realtimeStateManager.disconnect();
    }

    this.subscribers = [];
    this.isInitialized = false;
    this.user = null;
  }

  // ===== PRIVATE METHODS =====

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.disableOfflineMode();
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      this.enableOfflineMode();
    });

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline()) {
        this.syncPendingOperations();
      }
    });

    // Before unload - save state
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  /**
   * Save state
   */
  private saveState(): void {
    try {
      const state = this.getState();
      localStorage.setItem('whop-app-state-backup', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Load state backup
   */
  private loadStateBackup(): StateContext | null {
    try {
      const saved = localStorage.getItem('whop-app-state-backup');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load state backup:', error);
    }
    return null;
  }
}

// Export singleton instance
export const stateManager = new MainStateManager();

// Export types
// Types are already exported above
