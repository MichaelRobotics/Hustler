/**
 * WHOP WebSocket Integration
 * 
 * Handles real-time communication using WHOP's built-in WebSocket system.
 * Provides connection management, channel joining, and message broadcasting.
 */

import { whopSdk } from '../whop-sdk';

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'presence' | 'update' | 'notification' | 'error';
  channel: string;
  data: any;
  timestamp: Date;
  userId?: string;
  experienceId?: string; // New: Experience-based scoping
}

export interface WebSocketConnection {
  isConnected: boolean;
  isConnecting: boolean;
  lastConnected?: Date;
  lastError?: string;
  channels: Set<string>;
}

export interface WebSocketConfig {
  experienceId: string; // New: Experience-based scoping
  userId: string;
  autoReconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

class WhopWebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private connection: WebSocketConnection = {
    isConnected: false,
    isConnecting: false,
    channels: new Set()
  };
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();
  private connectionHandlers: Array<(connected: boolean) => void> = [];

  /**
   * Initialize WebSocket connection with WHOP
   */
  async connect(config: WebSocketConfig): Promise<void> {
    if (this.connection.isConnecting || this.connection.isConnected) {
      console.log('WebSocket already connecting or connected');
      return;
    }

    this.config = config;
    this.connection.isConnecting = true;
    this.connection.lastError = undefined;

    try {
      // Get WebSocket URL from WHOP SDK
      const wsUrl = await this.getWebSocketUrl(config);
      
      if (!wsUrl) {
        throw new Error('Failed to get WebSocket URL from WHOP');
      }

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection to be established
      await this.waitForConnection();

      this.connection.isConnected = true;
      this.connection.isConnecting = false;
      this.connection.lastConnected = new Date();
      this.reconnectAttempts = 0;

      // Notify connection handlers
      this.connectionHandlers.forEach(handler => handler(true));

      console.log('WebSocket connected successfully');

    } catch (error) {
      this.connection.isConnecting = false;
      this.connection.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('WebSocket connection failed:', error);
      
      // Attempt reconnection if enabled
      if (config.autoReconnect && this.reconnectAttempts < config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.connectionHandlers.forEach(handler => handler(false));
      }
      
      throw error;
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connection.isConnected = false;
    this.connection.isConnecting = false;
    this.connection.channels.clear();
    this.reconnectAttempts = 0;

    this.connectionHandlers.forEach(handler => handler(false));
    console.log('WebSocket disconnected');
  }

  /**
   * Join a channel for real-time updates
   */
  async joinChannel(channel: string): Promise<void> {
    if (!this.connection.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    const message: WebSocketMessage = {
      type: 'update',
      channel: 'system',
      data: {
        action: 'join',
        channel: channel,
        userId: this.config?.userId,
        experienceId: this.config?.experienceId
      },
      timestamp: new Date()
    };

    this.sendMessage(message);
    this.connection.channels.add(channel);
    
    console.log(`Joined channel: ${channel}`);
  }

  /**
   * Leave a channel
   */
  async leaveChannel(channel: string): Promise<void> {
    if (!this.connection.isConnected || !this.ws) {
      return;
    }

    const message: WebSocketMessage = {
      type: 'update',
      channel: 'system',
      data: {
        action: 'leave',
        channel: channel,
        userId: this.config?.userId,
        experienceId: this.config?.experienceId
      },
      timestamp: new Date()
    };

    this.sendMessage(message);
    this.connection.channels.delete(channel);
    
    console.log(`Left channel: ${channel}`);
  }

  /**
   * Send a message to a specific channel
   */
  sendMessage(message: WebSocketMessage): void {
    if (!this.connection.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      throw error;
    }
  }

  /**
   * Subscribe to messages from a specific channel
   */
  subscribe(channel: string, handler: (message: WebSocketMessage) => void): void {
    this.messageHandlers.set(channel, handler);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    this.messageHandlers.delete(channel);
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(handler: (connected: boolean) => void): void {
    this.connectionHandlers.push(handler);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): WebSocketConnection {
    return { ...this.connection };
  }

  /**
   * Get WebSocket URL from WHOP SDK
   */
  private async getWebSocketUrl(config: WebSocketConfig): Promise<string | null> {
    try {
      // Use WHOP SDK to get WebSocket endpoint
      // This is a placeholder - actual implementation depends on WHOP's WebSocket API
      const baseUrl = process.env.NEXT_PUBLIC_WHOP_WS_URL || 'wss://api.whop.com/ws';
      
      // Build WebSocket URL with authentication
      const params = new URLSearchParams({
        experienceId: config.experienceId,
        userId: config.userId,
        token: await this.getWebSocketToken()
      });

      return `${baseUrl}?${params.toString()}`;
    } catch (error) {
      console.error('Failed to get WebSocket URL:', error);
      return null;
    }
  }

  /**
   * Get WebSocket authentication token
   */
  private async getWebSocketToken(): Promise<string> {
    try {
      // Get authentication token from WHOP SDK
      // This is a placeholder - actual implementation depends on WHOP's token system
      return 'placeholder-token';
    } catch (error) {
      console.error('Failed to get WebSocket token:', error);
      throw error;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connection opened');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      this.connection.isConnected = false;
      this.connection.isConnecting = false;
      
      // Attempt reconnection if enabled
      if (this.config?.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.connectionHandlers.forEach(handler => handler(false));
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connection.lastError = 'WebSocket connection error';
      this.connectionHandlers.forEach(handler => handler(false));
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    // Handle system messages
    if (message.channel === 'system') {
      this.handleSystemMessage(message);
      return;
    }

    // Route message to appropriate handler
    const handler = this.messageHandlers.get(message.channel);
    if (handler) {
      handler(message);
    } else {
      console.log('No handler for channel:', message.channel);
    }
  }

  /**
   * Handle system messages
   */
  private handleSystemMessage(message: WebSocketMessage): void {
    const { action, channel } = message.data;

    switch (action) {
      case 'joined':
        console.log(`Successfully joined channel: ${channel}`);
        break;
      case 'left':
        console.log(`Successfully left channel: ${channel}`);
        break;
      case 'error':
        console.error('System error:', message.data.error);
        break;
      default:
        console.log('Unknown system action:', action);
    }
  }

  /**
   * Wait for WebSocket connection to be established
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000); // 10 second timeout

      this.ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      this.ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.config) return;

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.config!);
    }, delay);
  }
}

// Export singleton instance
export const whopWebSocket = new WhopWebSocketManager();

// Export types and utilities
// Types are already exported above
