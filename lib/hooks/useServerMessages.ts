"use client";

/**
 * Server Messages Hook
 * 
 * Receive-only WebSocket listener for server-sent messages.
 * All message sending goes through API calls, this hook only receives.
 * 
 * Note: WebSocket functionality is only available when running inside the Whop iframe.
 * When running locally or outside the iframe, the hooks will be no-ops.
 */

import { useEffect, useCallback, useRef } from "react";
import { useOnWebsocketMessage, useWebsocketStatus } from "@whop/react";

export type ServerMessageType = 
  | "chat_message" 
  | "typing" 
  | "notification" 
  | "bot_message" 
  | "stage_transition";

export interface ServerMessage {
  type: ServerMessageType;
  conversationId: string;
  messageId?: string;
  content?: string;
  senderId: string;
  senderType: "admin" | "customer" | "bot";
  timestamp: string;
  metadata?: {
    blockId?: string;
    stageTransition?: {
      currentStage: string;
      previousStage: string;
    };
    isTyping?: boolean;
    [key: string]: any;
  };
}

export interface UseServerMessagesConfig {
  /** Filter messages by conversation ID (optional) */
  conversationId?: string;
  /** Filter messages by experience ID (optional) */
  experienceId?: string;
  /** Callback when a chat message is received */
  onMessage?: (message: ServerMessage) => void;
  /** Callback when a typing indicator is received */
  onTyping?: (senderId: string, isTyping: boolean) => void;
  /** Callback when a stage transition is received */
  onStageTransition?: (currentStage: string, previousStage: string) => void;
  /** Callback for any message (before filtering) */
  onAnyMessage?: (message: ServerMessage) => void;
}

/**
 * Hook to receive server-sent WebSocket messages
 * 
 * This hook listens to the Whop WebSocket and processes messages
 * sent from the server via whopSdk.websockets.sendMessage()
 * 
 * Note: This hook requires the WhopWebsocketProvider to be mounted.
 * When running outside the Whop iframe, the provider may not be active
 * and messages will not be received.
 * 
 * @example
 * ```tsx
 * useServerMessages({
 *   conversationId: "conv-123",
 *   onMessage: (msg) => {
 *     setMessages(prev => [...prev, msg]);
 *   },
 *   onTyping: (userId, isTyping) => {
 *     setTypingUsers(isTyping ? [...prev, userId] : prev.filter(id => id !== userId));
 *   },
 * });
 * ```
 */
export function useServerMessages(config: UseServerMessagesConfig) {
  const {
    conversationId,
    experienceId,
    onMessage,
    onTyping,
    onStageTransition,
    onAnyMessage,
  } = config;

  // Track processed message IDs to prevent duplicates
  const processedMessages = useRef<Set<string>>(new Set());

  // Get connection status to log when WebSocket is not connected
  const connectionStatus = useWebsocketStatus();
  const hasLoggedDisconnected = useRef(false);

  useEffect(() => {
    if (connectionStatus === "disconnected" && !hasLoggedDisconnected.current) {
      console.log("[useServerMessages] WebSocket disconnected - messages will not be received in real-time");
      hasLoggedDisconnected.current = true;
    } else if (connectionStatus === "connected") {
      console.log("[useServerMessages] WebSocket connected - real-time messages enabled");
      hasLoggedDisconnected.current = false;
    }
  }, [connectionStatus]);

  // Message handler
  const handleMessage = useCallback((rawMessage: { json: string; isTrusted?: boolean }) => {
    try {
      const message: ServerMessage = JSON.parse(rawMessage.json);

      // Call onAnyMessage for all messages before filtering
      onAnyMessage?.(message);

      // Generate unique ID for deduplication
      const messageUniqueId = message.messageId || `${message.conversationId}-${message.timestamp}`;
      
      // Skip duplicate messages
      if (processedMessages.current.has(messageUniqueId)) {
        console.log(`[useServerMessages] Skipping duplicate message: ${messageUniqueId}`);
        return;
      }
      processedMessages.current.add(messageUniqueId);

      // Clean up old processed messages to prevent memory leak
      if (processedMessages.current.size > 1000) {
        const idsArray = Array.from(processedMessages.current);
        processedMessages.current = new Set(idsArray.slice(-500));
      }

      // Filter by conversation ID if specified
      if (conversationId && message.conversationId !== conversationId) {
        return;
      }

      console.log(`[useServerMessages] Received message:`, {
        type: message.type,
        conversationId: message.conversationId,
        senderType: message.senderType,
      });

      // Handle different message types
      switch (message.type) {
        case "chat_message":
        case "bot_message":
          onMessage?.(message);
          break;

        case "typing":
          if (message.metadata?.isTyping !== undefined) {
            onTyping?.(message.senderId, message.metadata.isTyping);
          }
          break;

        case "stage_transition":
          if (message.metadata?.stageTransition) {
            onStageTransition?.(
              message.metadata.stageTransition.currentStage,
              message.metadata.stageTransition.previousStage
            );
          }
          break;

        case "notification":
          onMessage?.(message);
          break;

        default:
          console.log(`[useServerMessages] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("[useServerMessages] Error parsing message:", error);
    }
  }, [conversationId, experienceId, onMessage, onTyping, onStageTransition, onAnyMessage]);

  // Use Whop's WebSocket hook to receive messages
  // This hook is a no-op when WebSocket provider is not mounted
  useOnWebsocketMessage(handleMessage);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processedMessages.current.clear();
    };
  }, []);

  // Return connection status for consumers to check
  return { connectionStatus };
}

/**
 * Hook to receive all messages for an experience (for admin monitoring)
 * 
 * @example
 * ```tsx
 * useExperienceMessages({
 *   experienceId: "exp-123",
 *   onMessage: (msg) => {
 *     // Handle message from any conversation in this experience
 *   },
 * });
 * ```
 */
export function useExperienceMessages(config: {
  experienceId: string;
  onMessage?: (message: ServerMessage) => void;
  onTyping?: (conversationId: string, senderId: string, isTyping: boolean) => void;
}) {
  const { experienceId, onMessage, onTyping } = config;

  return useServerMessages({
    experienceId,
    onAnyMessage: (message) => {
      // Pass all messages to the handler (no conversation filtering)
      if (message.type === "chat_message" || message.type === "bot_message") {
        onMessage?.(message);
      } else if (message.type === "typing" && message.metadata?.isTyping !== undefined) {
        onTyping?.(message.conversationId, message.senderId, message.metadata.isTyping);
      }
    },
  });
}

export default useServerMessages;
