/**
 * Real-Time Messaging
 * 
 * Handles live chat message broadcasting, typing indicators, and user presence tracking.
 * Integrates with the conversation system and provides real-time updates.
 */

import { whopWebSocket, WebSocketMessage } from './whop-websocket';
import { db } from '../supabase/db';
import { conversations, messages, funnelInteractions } from '../supabase/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AuthenticatedUser } from '../middleware/simple-auth';

export interface ChatMessage {
  id: string;
  conversationId: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  isRead: boolean;
  metadata?: any;
  userId?: string;
  experienceId?: string; // New: Experience-based scoping
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

export interface UserPresence {
  userId: string;
  userName: string;
  isOnline: boolean;
  lastSeen: Date;
  currentConversationId?: string;
}

export interface MessageDeliveryStatus {
  messageId: string;
  conversationId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
  userId?: string;
}

class RealTimeMessaging {
  private typingUsers: Map<string, Set<string>> = new Map(); // conversationId -> Set of userIds
  private userPresence: Map<string, UserPresence> = new Map();
  private messageHandlers: Map<string, (message: ChatMessage) => void> = new Map();
  private typingHandlers: Map<string, (typing: TypingIndicator) => void> = new Map();
  private presenceHandlers: Map<string, (presence: UserPresence) => void> = new Map();

  /**
   * Initialize real-time messaging
   */
  async initialize(user: AuthenticatedUser): Promise<void> {
    try {
      // Join conversation channels for the user's experience
      await this.joinExperienceChannels(user.experienceId);
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      console.log('Real-time messaging initialized for user:', user.id);
    } catch (error) {
      console.error('Failed to initialize real-time messaging:', error);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(
    user: AuthenticatedUser,
    conversationId: string,
    content: string,
    type: 'user' | 'bot' | 'system' = 'user',
    metadata?: any
  ): Promise<ChatMessage> {
    try {
      // Verify conversation exists and user has access
      const conversation = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, conversationId),
          eq(conversations.experienceId, user.experienceId) // New: Experience-based filtering
        )
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Create message in database
      const [newMessage] = await db.insert(messages).values({
        conversationId: conversationId,
        type: type,
        content: content,
        metadata: metadata || null
      }).returning();

      const chatMessage: ChatMessage = {
        id: newMessage.id,
        conversationId: conversationId,
        type: type,
        content: content,
        timestamp: newMessage.createdAt,
        isRead: false,
        metadata: metadata,
        userId: user.id
      };

      // Broadcast message to conversation channel
      await this.broadcastMessage(conversationId, chatMessage);

      // Update conversation last message timestamp
      await db.update(conversations)
        .set({
          updatedAt: new Date()
        })
        .where(eq(conversations.id, conversationId));

      return chatMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(
    user: AuthenticatedUser,
    conversationId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      const typingIndicator: TypingIndicator = {
        conversationId: conversationId,
        userId: user.id,
        userName: user.name,
        isTyping: isTyping,
        timestamp: new Date()
      };

      // Update local typing state
      if (isTyping) {
        if (!this.typingUsers.has(conversationId)) {
          this.typingUsers.set(conversationId, new Set());
        }
        this.typingUsers.get(conversationId)!.add(user.id);
      } else {
        this.typingUsers.get(conversationId)?.delete(user.id);
        if (this.typingUsers.get(conversationId)?.size === 0) {
          this.typingUsers.delete(conversationId);
        }
      }

      // Broadcast typing indicator
      const message: WebSocketMessage = {
        type: 'typing',
        channel: `conversation:${conversationId}`,
        data: typingIndicator,
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      whopWebSocket.sendMessage(message);

      // Auto-clear typing indicator after 3 seconds
      if (isTyping) {
        setTimeout(() => {
          this.sendTypingIndicator(user, conversationId, false);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  /**
   * Update user presence
   */
  async updateUserPresence(
    user: AuthenticatedUser,
    isOnline: boolean,
    currentConversationId?: string
  ): Promise<void> {
    try {
      const presence: UserPresence = {
        userId: user.id,
        userName: user.name,
        isOnline: isOnline,
        lastSeen: new Date(),
        currentConversationId: currentConversationId
      };

      // Update local presence state
      this.userPresence.set(user.id, presence);

      // Broadcast presence update
      const message: WebSocketMessage = {
        type: 'presence',
        channel: `experience:${user.experienceId}`,
        data: presence,
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      whopWebSocket.sendMessage(message);
    } catch (error) {
      console.error('Failed to update user presence:', error);
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(
    user: AuthenticatedUser,
    messageId: string
  ): Promise<void> {
    try {
      // Update message read status in database
      await db.update(messages)
        .set({
          // Note: We don't have an isRead field in the schema, so we'll track this in metadata
          metadata: { isRead: true, readBy: user.id, readAt: new Date() }
        })
        .where(eq(messages.id, messageId));

      // Broadcast read receipt
      const message: WebSocketMessage = {
        type: 'update',
        channel: 'system',
        data: {
          action: 'message_read',
          messageId: messageId,
          userId: user.id,
          timestamp: new Date()
        },
        timestamp: new Date(),
        userId: user.id,
        experienceId: user.experienceId
      };

      whopWebSocket.sendMessage(message);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }

  /**
   * Subscribe to conversation messages
   */
  subscribeToConversation(
    conversationId: string,
    handler: (message: ChatMessage) => void
  ): void {
    this.messageHandlers.set(conversationId, handler);
  }

  /**
   * Subscribe to typing indicators
   */
  subscribeToTyping(
    conversationId: string,
    handler: (typing: TypingIndicator) => void
  ): void {
    this.typingHandlers.set(conversationId, handler);
  }

  /**
   * Subscribe to user presence updates
   */
  subscribeToPresence(
    experienceId: string,
    handler: (presence: UserPresence) => void
  ): void {
    this.presenceHandlers.set(experienceId, handler);
  }

  /**
   * Get current typing users for a conversation
   */
  getTypingUsers(conversationId: string): string[] {
    return Array.from(this.typingUsers.get(conversationId) || []);
  }

  /**
   * Get user presence information
   */
  getUserPresence(userId: string): UserPresence | undefined {
    return this.userPresence.get(userId);
  }

  /**
   * Get all online users for an experience
   */
  getOnlineUsers(experienceId: string): UserPresence[] {
    return Array.from(this.userPresence.values())
      .filter(presence => presence.isOnline);
  }

  /**
   * Join experience-specific channels
   */
  private async joinExperienceChannels(experienceId: string): Promise<void> {
    try {
      // Join experience-wide channel for presence updates
      await whopWebSocket.joinChannel(`experience:${experienceId}`);
      
      // Join system channel for general updates
      await whopWebSocket.joinChannel('system');
      
      console.log(`Joined channels for experience: ${experienceId}`);
    } catch (error) {
      console.error('Failed to join experience channels:', error);
      throw error;
    }
  }

  /**
   * Set up message handlers for WebSocket events
   */
  private setupMessageHandlers(): void {
    // Handle incoming messages
    whopWebSocket.subscribe('messages', (message: WebSocketMessage) => {
      if (message.type === 'message') {
        const chatMessage = message.data as ChatMessage;
        const handler = this.messageHandlers.get(chatMessage.conversationId);
        if (handler) {
          handler(chatMessage);
        }
      }
    });

    // Handle typing indicators
    whopWebSocket.subscribe('typing', (message: WebSocketMessage) => {
      if (message.type === 'typing') {
        const typing = message.data as TypingIndicator;
        const handler = this.typingHandlers.get(typing.conversationId);
        if (handler) {
          handler(typing);
        }
      }
    });

    // Handle presence updates
    whopWebSocket.subscribe('presence', (message: WebSocketMessage) => {
      if (message.type === 'presence') {
        const presence = message.data as UserPresence;
        const handler = this.presenceHandlers.get(`company:${presence.userId}`);
        if (handler) {
          handler(presence);
        }
      }
    });
  }

  /**
   * Broadcast message to conversation channel
   */
  private async broadcastMessage(conversationId: string, message: ChatMessage): Promise<void> {
    const wsMessage: WebSocketMessage = {
      type: 'message',
      channel: `conversation:${conversationId}`,
      data: message,
      timestamp: new Date(),
      userId: message.userId,
      experienceId: undefined // Will be set by the sender
    };

    whopWebSocket.sendMessage(wsMessage);
  }
}

// Export singleton instance
export const realTimeMessaging = new RealTimeMessaging();

// Export types
// Types are already exported above
