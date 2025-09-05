/**
 * Real-Time State Management
 * 
 * Handles real-time state updates via WebSockets with automatic UI updates,
 * state consistency management, and performance optimization.
 */

import { 
  StateContext, 
  StateUpdate, 
  FrontendState, 
  BackendState,
  FunnelData,
  ResourceData,
  ConversationData,
  MessageData
} from './types';
import { stateSyncManager } from './sync';
import { whopWebSocket, WebSocketMessage } from '../websocket/whop-websocket';
import { realTimeMessaging } from '../websocket/messaging';
import { realTimeUpdates } from '../websocket/updates';
import { AuthenticatedUser } from '../middleware/simple-auth';

export interface RealtimeConfig {
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  updateBatchSize: number;
  updateThrottleMs: number;
}

export interface RealtimeState {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUpdate: Date | null;
  pendingUpdates: number;
  updateQueue: StateUpdate[];
  subscribers: Map<string, Array<(update: StateUpdate) => void>>;
}

class RealtimeStateManager {
  private config: RealtimeConfig;
  private state: RealtimeState;
  private user: AuthenticatedUser | null = null;
  private updateThrottleTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isInitialized = false;

  constructor(config: Partial<RealtimeConfig> = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      updateBatchSize: 10,
      updateThrottleMs: 100,
      ...config
    };

    this.state = {
      isConnected: false,
      connectionStatus: 'disconnected',
      lastUpdate: null,
      pendingUpdates: 0,
      updateQueue: [],
      subscribers: new Map()
    };
  }

  /**
   * Initialize real-time state management
   */
  async initialize(user: AuthenticatedUser): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.user = user;
    this.isInitialized = true;

    try {
      // Connect to WebSocket
      await this.connect();
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Start heartbeat
      this.startHeartbeat();
      
      console.log('Real-time state management initialized');
    } catch (error) {
      console.error('Failed to initialize real-time state management:', error);
      this.state.connectionStatus = 'error';
    }
  }

  /**
   * Connect to WebSocket
   */
  private async connect(): Promise<void> {
    if (!this.user) {
      throw new Error('User not authenticated');
    }

    this.state.connectionStatus = 'connecting';

    try {
      await whopWebSocket.connect({
        experienceId: undefined,
        companyId: this.user.companyId,
        userId: this.user.id,
        autoReconnect: true,
        reconnectInterval: this.config.reconnectInterval,
        maxReconnectAttempts: this.config.maxReconnectAttempts
      });

      this.state.isConnected = true;
      this.state.connectionStatus = 'connected';
      this.reconnectAttempts = 0;

      // Subscribe to relevant channels
      await this.subscribeToChannels();

    } catch (error) {
      this.state.connectionStatus = 'error';
      this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.state.isConnected = false;
    this.state.connectionStatus = 'disconnected';
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.updateThrottleTimer) {
      clearTimeout(this.updateThrottleTimer);
      this.updateThrottleTimer = null;
    }

    whopWebSocket.disconnect();
  }

  /**
   * Subscribe to state updates
   */
  subscribe(entityType: string, callback: (update: StateUpdate) => void): () => void {
    if (!this.state.subscribers.has(entityType)) {
      this.state.subscribers.set(entityType, []);
    }

    this.state.subscribers.get(entityType)!.push(callback);

    return () => {
      const subscribers = this.state.subscribers.get(entityType);
      if (subscribers) {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Handle real-time update
   */
  handleRealtimeUpdate(update: StateUpdate): void {
    this.state.lastUpdate = new Date();
    this.state.pendingUpdates++;

    // Add to update queue
    this.state.updateQueue.push(update);

    // Throttle updates for performance
    this.throttleUpdates();
  }

  /**
   * Get real-time state
   */
  getRealtimeState(): RealtimeState {
    return { ...this.state };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    return this.state.connectionStatus;
  }

  /**
   * Get pending updates count
   */
  getPendingUpdatesCount(): number {
    return this.state.pendingUpdates;
  }

  // ===== PRIVATE METHODS =====

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // WebSocket connection events
    whopWebSocket.onConnectionChange((connected) => {
      this.state.isConnected = connected;
      this.state.connectionStatus = connected ? 'connected' : 'disconnected';
      
      if (connected) {
        this.reconnectAttempts = 0;
        this.subscribeToChannels();
      } else {
        this.handleDisconnection();
      }
    });

    // Subscribe to WebSocket messages
    whopWebSocket.subscribe('state_updates', (message: WebSocketMessage) => {
      this.handleWebSocketMessage(message);
    });

    // Subscribe to funnel updates
    realTimeUpdates.subscribeToFunnelUpdates(this.user!.companyId, (update) => {
      this.handleFunnelUpdate(update);
    });

    // Subscribe to resource updates
    realTimeUpdates.subscribeToResourceUpdates(this.user!.companyId, (update) => {
      this.handleResourceUpdate(update);
    });

    // Subscribe to conversation updates
    realTimeMessaging.subscribeToConversation('*', (message) => {
      this.handleMessageUpdate(message);
    });

    // Subscribe to system notifications
    realTimeUpdates.subscribeToSystemNotifications(this.user!.id, (notification) => {
      this.handleSystemNotification(notification);
    });
  }

  /**
   * Subscribe to relevant channels
   */
  private async subscribeToChannels(): Promise<void> {
    if (!this.user) return;

    try {
      // Company-wide channels
      await whopWebSocket.joinChannel(`company:${this.user.companyId}`);
      await whopWebSocket.joinChannel(`funnel_updates:${this.user.companyId}`);
      await whopWebSocket.joinChannel(`resource_updates:${this.user.companyId}`);
      await whopWebSocket.joinChannel(`analytics:${this.user.companyId}`);

      // User-specific channels
      await whopWebSocket.joinChannel(`user:${this.user.id}`);
      await whopWebSocket.joinChannel(`notifications:${this.user.id}`);

      console.log('Subscribed to real-time channels');
    } catch (error) {
      console.error('Failed to subscribe to channels:', error);
    }
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    try {
      const { type, data, channel } = message;

      switch (type) {
        case 'update':
          this.handleStateUpdate(data, channel);
          break;
        case 'notification':
          this.handleNotificationUpdate(data, channel);
          break;
        case 'error':
          this.handleErrorUpdate(data, channel);
          break;
        default:
          console.log('Unknown message type:', type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle state update
   */
  private handleStateUpdate(data: any, channel: string): void {
    const update: StateUpdate = {
      type: 'backend',
      data: data,
      timestamp: new Date(),
      source: 'websocket'
    };

    this.handleRealtimeUpdate(update);
  }

  /**
   * Handle notification update
   */
  private handleNotificationUpdate(data: any, channel: string): void {
    const update: StateUpdate = {
      type: 'frontend',
      data: {
        // notifications: [data] // Not part of state structure
      },
      timestamp: new Date(),
      source: 'websocket'
    };

    this.handleRealtimeUpdate(update);
  }

  /**
   * Handle error update
   */
  private handleErrorUpdate(data: any, channel: string): void {
    const update: StateUpdate = {
      type: 'frontend',
      data: {
        errors: {
          [data.type || 'general']: data.message
        }
      },
      timestamp: new Date(),
      source: 'websocket'
    };

    this.handleRealtimeUpdate(update);
  }

  /**
   * Handle funnel update
   */
  private handleFunnelUpdate(update: any): void {
    const stateUpdate: StateUpdate = {
      type: 'backend',
      data: {
        funnels: this.updateFunnelInState(update)
      },
      timestamp: new Date(),
      source: 'websocket'
    };

    this.handleRealtimeUpdate(stateUpdate);
  }

  /**
   * Handle resource update
   */
  private handleResourceUpdate(update: any): void {
    const stateUpdate: StateUpdate = {
      type: 'backend',
      data: {
        resources: this.updateResourceInState(update)
      },
      timestamp: new Date(),
      source: 'websocket'
    };

    this.handleRealtimeUpdate(stateUpdate);
  }

  /**
   * Handle message update
   */
  private handleMessageUpdate(message: any): void {
    const stateUpdate: StateUpdate = {
      type: 'backend',
      data: {
        messages: [message],
        conversations: this.updateConversationInState(message)
      },
      timestamp: new Date(),
      source: 'websocket'
    };

    this.handleRealtimeUpdate(stateUpdate);
  }

  /**
   * Handle system notification
   */
  private handleSystemNotification(notification: any): void {
    const stateUpdate: StateUpdate = {
      type: 'frontend',
      data: {
        // notifications: [notification] // Not part of state structure
      },
      timestamp: new Date(),
      source: 'websocket'
    };

    this.handleRealtimeUpdate(stateUpdate);
  }

  /**
   * Throttle updates for performance
   */
  private throttleUpdates(): void {
    if (this.updateThrottleTimer) {
      return;
    }

    this.updateThrottleTimer = setTimeout(() => {
      this.processUpdateQueue();
      this.updateThrottleTimer = null;
    }, this.config.updateThrottleMs);
  }

  /**
   * Process update queue
   */
  private processUpdateQueue(): void {
    if (this.state.updateQueue.length === 0) {
      return;
    }

    const batch = this.state.updateQueue.splice(0, this.config.updateBatchSize);
    
    for (const update of batch) {
      this.processUpdate(update);
    }

    this.state.pendingUpdates = this.state.updateQueue.length;
  }

  /**
   * Process individual update
   */
  private processUpdate(update: StateUpdate): void {
    try {
      // Apply update to state manager
      stateSyncManager.handleRealtimeUpdate(update);

      // Notify subscribers
      this.notifySubscribers(update);

      // Update UI state
      this.updateUIState(update);

    } catch (error) {
      console.error('Error processing update:', error);
    }
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(update: StateUpdate): void {
    // Notify entity-specific subscribers
    const entityType = this.getEntityType(update);
    const subscribers = this.state.subscribers.get(entityType);
    
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }

    // Notify general subscribers
    const generalSubscribers = this.state.subscribers.get('*');
    if (generalSubscribers) {
      generalSubscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error('Error in general subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Update UI state
   */
  private updateUIState(update: StateUpdate): void {
    if (update.type === 'frontend') {
      // Update frontend state directly
      stateSyncManager.updateFrontendState(update.data as any);
    } else if (update.type === 'backend') {
      // Update backend state and trigger UI refresh
      stateSyncManager.updateBackendState(update.data as any);
    }
  }

  /**
   * Get entity type from update
   */
  private getEntityType(update: StateUpdate): string {
    if ((update.data as any).funnels) return 'funnel';
    if ((update.data as any).resources) return 'resource';
    if ((update.data as any).conversations) return 'conversation';
    if ((update.data as any).messages) return 'message';
    if ((update.data as any).notifications) return 'notification';
    return '*';
  }

  /**
   * Update funnel in state
   */
  private updateFunnelInState(update: any): FunnelData[] {
    // This would update the funnel in the current state
    // For now, we'll return the update as a new funnel
    return [update];
  }

  /**
   * Update resource in state
   */
  private updateResourceInState(update: any): ResourceData[] {
    // This would update the resource in the current state
    return [update];
  }

  /**
   * Update conversation in state
   */
  private updateConversationInState(message: any): ConversationData[] {
    // This would update the conversation with new message info
    return [{
      id: message.conversationId,
      funnelId: '',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 1,
      lastMessageAt: new Date()
    }];
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: any): void {
    console.error('WebSocket connection error:', error);
    
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.config.reconnectInterval);
    } else {
      this.state.connectionStatus = 'error';
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    console.log('WebSocket disconnected');
    this.state.isConnected = false;
    this.state.connectionStatus = 'disconnected';
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.state.isConnected) {
        // Send heartbeat to keep connection alive
        whopWebSocket.sendMessage({
          type: 'message' as any, // Using message type for heartbeat
          channel: 'system',
          data: { timestamp: new Date() },
          timestamp: new Date()
        });
      }
    }, this.config.heartbeatInterval);
  }
}

// Export singleton instance
export const realtimeStateManager = new RealtimeStateManager();

// Export types
// Types are already exported above
