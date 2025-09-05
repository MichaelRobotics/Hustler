/**
 * Real-Time Updates
 * 
 * Handles real-time updates for funnel generation, deployment, resource sync,
 * analytics, and system status notifications.
 */

import { whopWebSocket, WebSocketMessage } from './whop-websocket';
import { AuthenticatedUser } from '../middleware/simple-auth';

export interface FunnelUpdate {
  type: 'generation_started' | 'generation_progress' | 'generation_completed' | 'generation_failed' | 'deployed' | 'undeployed';
  funnelId: string;
  funnelName: string;
  progress?: number; // 0-100 for generation progress
  message?: string;
  timestamp: Date;
  userId: string;
  experienceId: string; // New: Experience-based scoping
}

export interface ResourceUpdate {
  type: 'sync_started' | 'sync_progress' | 'sync_completed' | 'sync_failed' | 'created' | 'updated' | 'deleted';
  resourceId: string;
  resourceName: string;
  progress?: number; // 0-100 for sync progress
  message?: string;
  timestamp: Date;
  userId: string;
  experienceId: string; // New: Experience-based scoping
}

export interface AnalyticsUpdate {
  type: 'funnel_analytics' | 'conversation_analytics' | 'revenue_update';
  data: any;
  timestamp: Date;
  experienceId: string; // New: Experience-based scoping
}

export interface SystemNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionUrl?: string;
  timestamp: Date;
  userId?: string;
  experienceId: string; // New: Experience-based scoping
}

export interface CreditUpdate {
  type: 'credit_used' | 'credit_added' | 'credit_warning' | 'credit_exhausted';
  amount: number;
  remaining: number;
  operation: string;
  timestamp: Date;
  userId: string;
  experienceId: string; // New: Experience-based scoping
}

class RealTimeUpdates {
  private updateHandlers: Map<string, (update: any) => void> = new Map();
  private notificationHandlers: Map<string, (notification: SystemNotification) => void> = new Map();

  /**
   * Initialize real-time updates
   */
  async initialize(user: AuthenticatedUser): Promise<void> {
    try {
      // Join user-specific channels
      await this.joinUserChannels(user);
      
      // Set up update handlers
      this.setupUpdateHandlers();
      
      console.log('Real-time updates initialized for user:', user.id);
    } catch (error) {
      console.error('Failed to initialize real-time updates:', error);
      throw error;
    }
  }

  /**
   * Send funnel generation progress update
   */
  async sendFunnelGenerationUpdate(
    user: AuthenticatedUser,
    funnelId: string,
    funnelName: string,
    type: FunnelUpdate['type'],
    progress?: number,
    message?: string
  ): Promise<void> {
    try {
      const update: FunnelUpdate = {
        type,
        funnelId,
        funnelName,
        progress,
        message,
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      await this.broadcastUpdate('funnel_updates', update, user);
    } catch (error) {
      console.error('Failed to send funnel generation update:', error);
    }
  }

  /**
   * Send funnel deployment notification
   */
  async sendFunnelDeploymentUpdate(
    user: AuthenticatedUser,
    funnelId: string,
    funnelName: string,
    deployed: boolean
  ): Promise<void> {
    try {
      const update: FunnelUpdate = {
        type: deployed ? 'deployed' : 'undeployed',
        funnelId,
        funnelName,
        message: deployed ? 'Funnel deployed successfully' : 'Funnel undeployed',
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      await this.broadcastUpdate('funnel_updates', update, user);
    } catch (error) {
      console.error('Failed to send funnel deployment update:', error);
    }
  }

  /**
   * Send resource sync update
   */
  async sendResourceSyncUpdate(
    user: AuthenticatedUser,
    resourceId: string,
    resourceName: string,
    type: ResourceUpdate['type'],
    progress?: number,
    message?: string
  ): Promise<void> {
    try {
      const update: ResourceUpdate = {
        type,
        resourceId,
        resourceName,
        progress,
        message,
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      await this.broadcastUpdate('resource_updates', update, user);
    } catch (error) {
      console.error('Failed to send resource sync update:', error);
    }
  }

  /**
   * Send analytics update
   */
  async sendAnalyticsUpdate(
    experienceId: string,
    type: AnalyticsUpdate['type'],
    data: any
  ): Promise<void> {
    try {
      const update: AnalyticsUpdate = {
        type,
        data,
        timestamp: new Date(),
        experienceId
      };

      const message: WebSocketMessage = {
        type: 'update',
        channel: `analytics:${experienceId}`,
        data: update,
        timestamp: new Date(),
        experienceId
      };

      whopWebSocket.sendMessage(message);
    } catch (error) {
      console.error('Failed to send analytics update:', error);
    }
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(
    experienceId: string,
    type: SystemNotification['type'],
    title: string,
    message: string,
    userId?: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      const notification: SystemNotification = {
        type,
        title,
        message,
        actionUrl,
        timestamp: new Date(),
        userId,
        experienceId
      };

      const channel = userId ? `user:${userId}` : `experience:${experienceId}`;
      const wsMessage: WebSocketMessage = {
        type: 'notification',
        channel: channel,
        data: notification,
        timestamp: new Date(),
        userId,
        experienceId
      };

      whopWebSocket.sendMessage(wsMessage);
    } catch (error) {
      console.error('Failed to send system notification:', error);
    }
  }

  /**
   * Send credit update notification
   */
  async sendCreditUpdate(
    user: AuthenticatedUser,
    type: CreditUpdate['type'],
    amount: number,
    remaining: number,
    operation: string
  ): Promise<void> {
    try {
      const update: CreditUpdate = {
        type,
        amount,
        remaining,
        operation,
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      const message: WebSocketMessage = {
        type: 'update',
        channel: `user:${user.id}`,
        data: update,
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      whopWebSocket.sendMessage(message);
    } catch (error) {
      console.error('Failed to send credit update:', error);
    }
  }

  /**
   * Subscribe to funnel updates
   */
  subscribeToFunnelUpdates(
    experienceId: string,
    handler: (update: FunnelUpdate) => void
  ): void {
    this.updateHandlers.set(`funnel_updates:${experienceId}`, handler);
  }

  /**
   * Subscribe to resource updates
   */
  subscribeToResourceUpdates(
    experienceId: string,
    handler: (update: ResourceUpdate) => void
  ): void {
    this.updateHandlers.set(`resource_updates:${experienceId}`, handler);
  }

  /**
   * Subscribe to analytics updates
   */
  subscribeToAnalyticsUpdates(
    experienceId: string,
    handler: (update: AnalyticsUpdate) => void
  ): void {
    this.updateHandlers.set(`analytics:${experienceId}`, handler);
  }

  /**
   * Subscribe to system notifications
   */
  subscribeToSystemNotifications(
    userId: string,
    handler: (notification: SystemNotification) => void
  ): void {
    this.notificationHandlers.set(`user:${userId}`, handler);
  }

  /**
   * Subscribe to credit updates
   */
  subscribeToCreditUpdates(
    userId: string,
    handler: (update: CreditUpdate) => void
  ): void {
    this.updateHandlers.set(`user:${userId}`, handler);
  }

  /**
   * Join user-specific channels
   */
  private async joinUserChannels(user: AuthenticatedUser): Promise<void> {
    try {
      // Join user-specific channel for personal updates
      await whopWebSocket.joinChannel(`user:${user.id}`);
      
      // Join experience-wide update channels
      await whopWebSocket.joinChannel(`funnel_updates:${user.experienceId}`);
      await whopWebSocket.joinChannel(`resource_updates:${user.experienceId}`);
      await whopWebSocket.joinChannel(`analytics:${user.experienceId}`);
      
      console.log(`Joined update channels for user: ${user.id}`);
    } catch (error) {
      console.error('Failed to join user channels:', error);
      throw error;
    }
  }

  /**
   * Set up update handlers for WebSocket events
   */
  private setupUpdateHandlers(): void {
    // Handle funnel updates
    whopWebSocket.subscribe('funnel_updates', (message: WebSocketMessage) => {
      if (message.type === 'update') {
        const update = message.data as FunnelUpdate;
        const handler = this.updateHandlers.get(`funnel_updates:${update.experienceId}`);
        if (handler) {
          handler(update);
        }
      }
    });

    // Handle resource updates
    whopWebSocket.subscribe('resource_updates', (message: WebSocketMessage) => {
      if (message.type === 'update') {
        const update = message.data as ResourceUpdate;
        const handler = this.updateHandlers.get(`resource_updates:${update.experienceId}`);
        if (handler) {
          handler(update);
        }
      }
    });

    // Handle analytics updates
    whopWebSocket.subscribe('analytics', (message: WebSocketMessage) => {
      if (message.type === 'update') {
        const update = message.data as AnalyticsUpdate;
        const handler = this.updateHandlers.get(`analytics:${update.experienceId}`);
        if (handler) {
          handler(update);
        }
      }
    });

    // Handle system notifications
    whopWebSocket.subscribe('notifications', (message: WebSocketMessage) => {
      if (message.type === 'notification') {
        const notification = message.data as SystemNotification;
        if (notification.userId) {
          const handler = this.notificationHandlers.get(`user:${notification.userId}`);
          if (handler) {
            handler(notification);
          }
        }
      }
    });

    // Handle user-specific updates (including credit updates)
    whopWebSocket.subscribe('user_updates', (message: WebSocketMessage) => {
      if (message.type === 'update') {
        const update = message.data;
        if (update.userId) {
          const handler = this.updateHandlers.get(`user:${update.userId}`);
          if (handler) {
            handler(update);
          }
        }
      }
    });
  }

  /**
   * Broadcast update to appropriate channel
   */
  private async broadcastUpdate(
    channelType: string,
    update: any,
    user: AuthenticatedUser
  ): Promise<void> {
    const message: WebSocketMessage = {
      type: 'update',
      channel: `${channelType}:${user.experienceId}`,
      data: update,
      timestamp: new Date(),
      userId: user.id,
      experienceId: user.experienceId
    };

    whopWebSocket.sendMessage(message);
  }
}

// Export singleton instance
export const realTimeUpdates = new RealTimeUpdates();

// Export types
// Types are already exported above
