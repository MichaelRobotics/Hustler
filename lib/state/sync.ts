/**
 * State Synchronization System
 * 
 * Handles frontend-backend state synchronization with optimistic updates,
 * conflict resolution, and offline support.
 */

import { 
  StateContext, 
  FrontendState, 
  BackendState, 
  StateAction, 
  StateUpdate, 
  SyncOperation, 
  ConflictResolution,
  StateManager
} from './types';
import { redisCache } from '../cache/redis-cache';
import { realTimeUpdates } from '../websocket/updates';
import { AuthenticatedUser } from '../middleware/auth';

export interface SyncConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  syncInterval: number;
  conflictResolutionStrategy: 'local' | 'remote' | 'merge' | 'manual';
}

export interface SyncResult {
  success: boolean;
  synced: number;
  conflicts: number;
  errors: number;
  operations: SyncOperation[];
}

class StateSyncManager {
  private state: StateContext;
  private config: SyncConfig;
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private subscribers: Array<(update: StateUpdate) => void> = [];
  private user: AuthenticatedUser | null = null;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      batchSize: 10,
      syncInterval: 5000,
      conflictResolutionStrategy: 'merge',
      ...config
    };
    
    this.state = this.loadInitialState();
    this.setupEventListeners();
  }

  /**
   * Initialize state manager with user context
   */
  initialize(user: AuthenticatedUser): void {
    this.user = user;
    this.loadUserState();
    this.startPeriodicSync();
  }

  /**
   * Get current state
   */
  getState(): StateContext {
    return { ...this.state };
  }

  /**
   * Get frontend state
   */
  getFrontendState(): FrontendState {
    return { ...this.state.frontend };
  }

  /**
   * Get backend state
   */
  getBackendState(): BackendState {
    return { ...this.state.backend };
  }

  /**
   * Update frontend state
   */
  updateFrontendState(updates: Partial<FrontendState>): void {
    this.state.frontend = { ...this.state.frontend, ...updates };
    this.saveFrontendState();
    this.notifySubscribers({
      type: 'frontend',
      data: updates,
      timestamp: new Date(),
      source: 'user'
    });
  }

  /**
   * Update backend state
   */
  updateBackendState(updates: Partial<BackendState>): void {
    this.state.backend = { ...this.state.backend, ...updates };
    this.saveBackendState();
    this.notifySubscribers({
      type: 'backend',
      data: updates,
      timestamp: new Date(),
      source: 'user'
    });
  }

  /**
   * Handle optimistic update
   */
  handleOptimisticUpdate(action: StateAction): void {
    const operationId = this.generateOperationId();
    
    // Apply optimistic update to frontend state
    this.applyOptimisticUpdate(action);
    
    // Queue sync operation
    const operation: SyncOperation = {
      id: operationId,
      type: action.type.split('_')[0] as 'create' | 'update' | 'delete',
      entity: this.getEntityType(action.type),
      entityId: action.payload?.id || operationId,
      data: action.payload,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    };

    this.syncQueue.push(operation);
    this.state.sync.operations.push(operation);
    
    // Trigger immediate sync for critical operations
    if (action.syncRequired) {
      this.syncWithBackend();
    }
  }

  /**
   * Sync with backend
   */
  async syncWithBackend(): Promise<SyncResult> {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return {
        success: true,
        synced: 0,
        conflicts: 0,
        errors: 0,
        operations: []
      };
    }

    this.isSyncing = true;
    this.state.sync.isOnline = navigator.onLine;

    try {
      const result = await this.processSyncQueue();
      this.state.sync.lastSync = new Date();
      this.state.sync.operations = this.syncQueue;
      
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        synced: 0,
        conflicts: 0,
        errors: this.syncQueue.length,
        operations: this.syncQueue
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Handle real-time update
   */
  handleRealtimeUpdate(update: StateUpdate): void {
    // Check for conflicts
    const conflicts = this.detectConflicts(update);
    
    if (conflicts.length > 0) {
      this.handleConflicts(conflicts);
    } else {
      // Apply update directly
      this.applyRealtimeUpdate(update);
    }

    this.notifySubscribers(update);
  }

  /**
   * Subscribe to state updates
   */
  subscribeToUpdates(callback: (update: StateUpdate) => void): () => void {
    this.subscribers.push(callback);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Resolve conflict
   */
  resolveConflict(conflictId: string, resolution: ConflictResolution): void {
    const conflictIndex = this.state.sync.conflicts.findIndex(c => c.entityId === conflictId);
    
    if (conflictIndex > -1) {
      this.state.sync.conflicts.splice(conflictIndex, 1);
      
      // Apply resolved data
      this.applyConflictResolution(resolution);
      
      // Remove from sync queue
      this.syncQueue = this.syncQueue.filter(op => op.entityId !== conflictId);
    }
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode(): void {
    this.state.sync.isOnline = false;
    this.state.realtime.connectionStatus = 'disconnected';
  }

  /**
   * Disable offline mode
   */
  disableOfflineMode(): void {
    this.state.sync.isOnline = true;
    this.syncPendingOperations();
  }

  /**
   * Sync pending operations
   */
  async syncPendingOperations(): Promise<void> {
    if (this.syncQueue.length > 0) {
      await this.syncWithBackend();
    }
  }

  /**
   * Validate state
   */
  validateState(state: Partial<FrontendState | BackendState>): boolean {
    try {
      // Basic validation rules
      if ('frontend' in state) {
        return this.validateFrontendState(state as Partial<FrontendState>);
      } else if ('backend' in state) {
        return this.validateBackendState(state as Partial<BackendState>);
      }
      return true;
    } catch (error) {
      console.error('State validation failed:', error);
      return false;
    }
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): string[] {
    const errors: string[] = [];
    
    // Check for required fields
    if (!this.state.frontend.currentView) {
      errors.push('Current view is required');
    }
    
    if (!this.state.backend.userSettings) {
      errors.push('User settings are required');
    }
    
    return errors;
  }

  // ===== PRIVATE METHODS =====

  /**
   * Load initial state
   */
  private loadInitialState(): StateContext {
    try {
      const saved = localStorage.getItem('whop-app-state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
    
    return {
      frontend: {
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
      },
      backend: {
        funnels: [],
        resources: [],
        conversations: [],
        messages: [],
        userSettings: {
          theme: 'system',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          notifications: {
            email: true,
            push: true,
            inApp: true,
          },
          preferences: {
            autoSave: true,
            showTutorials: true,
            compactMode: false,
          },
        },
        notificationPreferences: {
          funnelUpdates: true,
          resourceSync: true,
          newMessages: true,
          systemAlerts: true,
          marketingEmails: false,
        },
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
      },
      sync: {
        operations: [],
        conflicts: [],
        isOnline: navigator.onLine,
        lastSync: null,
      },
      realtime: {
        isConnected: false,
        connectionStatus: 'disconnected',
        pendingUpdates: 0,
      },
    };
  }

  /**
   * Load user-specific state
   */
  private async loadUserState(): Promise<void> {
    if (!this.user) return;

    try {
      // Load user settings from cache
      const cacheKey = `user-state:${this.user.id}`;
      const cachedState = await redisCache.get<Partial<BackendState>>(cacheKey);
      
      if (cachedState) {
        this.state.backend = { ...this.state.backend, ...cachedState };
      }
    } catch (error) {
      console.error('Failed to load user state:', error);
    }
  }

  /**
   * Save frontend state
   */
  private saveFrontendState(): void {
    try {
      localStorage.setItem('whop-app-frontend-state', JSON.stringify(this.state.frontend));
    } catch (error) {
      console.error('Failed to save frontend state:', error);
    }
  }

  /**
   * Save backend state
   */
  private async saveBackendState(): Promise<void> {
    if (!this.user) return;

    try {
      const cacheKey = `user-state:${this.user.id}`;
      await redisCache.set(cacheKey, this.state.backend, { ttl: 3600 }); // 1 hour
    } catch (error) {
      console.error('Failed to save backend state:', error);
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Online/offline detection
    window.addEventListener('online', () => {
      this.disableOfflineMode();
    });

    window.addEventListener('offline', () => {
      this.enableOfflineMode();
    });

    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.sync.isOnline) {
        this.syncPendingOperations();
      }
    });
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.state.sync.isOnline && this.syncQueue.length > 0) {
        this.syncWithBackend();
      }
    }, this.config.syncInterval);
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<SyncResult> {
    const batch = this.syncQueue.splice(0, this.config.batchSize);
    let synced = 0;
    let conflicts = 0;
    let errors = 0;

    for (const operation of batch) {
      try {
        const result = await this.executeSyncOperation(operation);
        
        if (result.success) {
          synced++;
          operation.status = 'completed';
        } else if (result.conflict) {
          conflicts++;
          operation.status = 'failed';
          this.handleSyncConflict(operation, result.conflict);
        } else {
          errors++;
          operation.status = 'failed';
          operation.error = result.error;
          
          // Retry if under limit
          if (operation.retryCount < this.config.maxRetries) {
            operation.retryCount++;
            this.syncQueue.push(operation);
          }
        }
      } catch (error) {
        errors++;
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return {
      success: errors === 0,
      synced,
      conflicts,
      errors,
      operations: batch
    };
  }

  /**
   * Execute sync operation
   */
  private async executeSyncOperation(operation: SyncOperation): Promise<{
    success: boolean;
    conflict?: any;
    error?: string;
  }> {
    // This would integrate with your existing API actions
    // For now, we'll simulate the operation
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check for conflicts (simplified)
      const hasConflict = Math.random() < 0.1; // 10% chance of conflict
      
      if (hasConflict) {
        return {
          success: false,
          conflict: {
            localVersion: operation.data,
            remoteVersion: { ...operation.data, updatedAt: new Date() }
          }
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Apply optimistic update
   */
  private applyOptimisticUpdate(action: StateAction): void {
    const { type, payload } = action;
    
    switch (type) {
      case 'CREATE_FUNNEL':
        this.state.frontend.optimisticUpdates[payload.id] = {
          type: 'create',
          data: payload,
          timestamp: new Date()
        };
        break;
        
      case 'UPDATE_FUNNEL':
        this.state.frontend.optimisticUpdates[payload.id] = {
          type: 'update',
          data: payload,
          timestamp: new Date()
        };
        break;
        
      case 'DELETE_FUNNEL':
        this.state.frontend.optimisticUpdates[payload.id] = {
          type: 'delete',
          data: payload,
          timestamp: new Date()
        };
        break;
    }
  }

  /**
   * Apply real-time update
   */
  private applyRealtimeUpdate(update: StateUpdate): void {
    if (update.type === 'backend') {
      this.state.backend = { ...this.state.backend, ...update.data };
    } else if (update.type === 'frontend') {
      this.state.frontend = { ...this.state.frontend, ...update.data };
    }
  }

  /**
   * Detect conflicts
   */
  private detectConflicts(update: StateUpdate): ConflictResolution[] {
    const conflicts: ConflictResolution[] = [];
    
    // Check for optimistic updates that conflict with real-time updates
    for (const [entityId, optimisticUpdate] of Object.entries(this.state.frontend.optimisticUpdates)) {
      if (update.data && (update.data as any).id === entityId) {
        conflicts.push({
          entityId,
          entityType: optimisticUpdate.type,
          localVersion: optimisticUpdate.data,
          remoteVersion: update.data,
          resolution: 'manual',
          resolvedData: null,
          timestamp: new Date()
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Handle conflicts
   */
  private handleConflicts(conflicts: ConflictResolution[]): void {
    for (const conflict of conflicts) {
      this.state.sync.conflicts.push(conflict);
      
      // Auto-resolve based on strategy
      if (this.config.conflictResolutionStrategy !== 'manual') {
        this.autoResolveConflict(conflict);
      }
    }
  }

  /**
   * Auto-resolve conflict
   */
  private autoResolveConflict(conflict: ConflictResolution): void {
    switch (this.config.conflictResolutionStrategy) {
      case 'local':
        conflict.resolution = 'local';
        conflict.resolvedData = conflict.localVersion;
        break;
        
      case 'remote':
        conflict.resolution = 'remote';
        conflict.resolvedData = conflict.remoteVersion;
        break;
        
      case 'merge':
        conflict.resolution = 'merge';
        conflict.resolvedData = this.mergeData(conflict.localVersion, conflict.remoteVersion);
        break;
    }
    
    this.applyConflictResolution(conflict);
  }

  /**
   * Apply conflict resolution
   */
  private applyConflictResolution(resolution: ConflictResolution): void {
    // Remove from optimistic updates
    delete this.state.frontend.optimisticUpdates[resolution.entityId];
    
    // Apply resolved data
    if (resolution.resolvedData) {
      // This would update the appropriate state based on entity type
      console.log('Applying conflict resolution:', resolution);
    }
  }

  /**
   * Handle sync conflict
   */
  private handleSyncConflict(operation: SyncOperation, conflict: any): void {
    const conflictResolution: ConflictResolution = {
      entityId: operation.entityId,
      entityType: operation.entity,
      localVersion: operation.data,
      remoteVersion: conflict.remoteVersion,
      resolution: 'manual',
      resolvedData: null,
      timestamp: new Date()
    };
    
    this.state.sync.conflicts.push(conflictResolution);
  }

  /**
   * Merge data
   */
  private mergeData(local: any, remote: any): any {
    // Simple merge strategy - in production, you'd want more sophisticated merging
    return {
      ...remote,
      ...local,
      updatedAt: new Date()
    };
  }

  /**
   * Get entity type from action type
   */
  private getEntityType(actionType: string): 'funnel' | 'resource' | 'conversation' | 'message' {
    if (actionType.includes('FUNNEL')) return 'funnel';
    if (actionType.includes('RESOURCE')) return 'resource';
    if (actionType.includes('CONVERSATION')) return 'conversation';
    if (actionType.includes('MESSAGE')) return 'message';
    return 'funnel'; // default
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(update: StateUpdate): void {
    this.subscribers.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('Error in state update subscriber:', error);
      }
    });
  }

  /**
   * Validate frontend state
   */
  private validateFrontendState(state: Partial<FrontendState>): boolean {
    // Add validation rules for frontend state
    return true;
  }

  /**
   * Validate backend state
   */
  private validateBackendState(state: Partial<BackendState>): boolean {
    // Add validation rules for backend state
    return true;
  }
}

// Export singleton instance
export const stateSyncManager = new StateSyncManager();

// Export types
// Types are already exported above
