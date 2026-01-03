/**
 * Server-side WebSocket Service
 * 
 * All WebSocket message broadcasting flows through this service.
 * Clients send messages via API calls, this service broadcasts to recipients.
 */

import { whopSdk } from "@/lib/whop-sdk";

export type MessagePayload = {
  type: "chat_message" | "typing" | "notification" | "bot_message" | "stage_transition";
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
    [key: string]: any;
  };
};

/**
 * Broadcast message to all users in a specific experience
 * Used for: Admin monitoring all conversations, general notifications
 */
export async function broadcastToExperience(
  experienceId: string, 
  payload: MessagePayload
): Promise<boolean> {
  try {
    console.log(`[WebSocket Service] Broadcasting to experience ${experienceId}:`, {
      type: payload.type,
      conversationId: payload.conversationId,
      senderType: payload.senderType
    });

    await whopSdk.websockets.sendMessage({
      message: JSON.stringify(payload),
      target: { experience: experienceId },
    });

    console.log(`[WebSocket Service] ✅ Broadcast to experience ${experienceId} successful`);
    return true;
  } catch (error) {
    console.error(`[WebSocket Service] ❌ Failed to broadcast to experience ${experienceId}:`, error);
    return false;
  }
}

/**
 * Send message to a specific user
 * Used for: Direct messages to customer from admin/bot
 */
export async function sendToUser(
  userId: string, 
  payload: MessagePayload
): Promise<boolean> {
  try {
    console.log(`[WebSocket Service] Sending to user ${userId}:`, {
      type: payload.type,
      conversationId: payload.conversationId,
      senderType: payload.senderType
    });

    await whopSdk.websockets.sendMessage({
      message: JSON.stringify(payload),
      target: { user: userId },
    });

    console.log(`[WebSocket Service] ✅ Message sent to user ${userId} successful`);
    return true;
  } catch (error) {
    console.error(`[WebSocket Service] ❌ Failed to send to user ${userId}:`, error);
    return false;
  }
}

/**
 * Broadcast to everyone connected to the app
 * Used for: System-wide notifications
 */
export async function broadcastToAll(payload: MessagePayload): Promise<boolean> {
  try {
    console.log(`[WebSocket Service] Broadcasting to all:`, {
      type: payload.type,
      senderType: payload.senderType
    });

    await whopSdk.websockets.sendMessage({
      message: JSON.stringify(payload),
      target: "everyone",
    });

    console.log(`[WebSocket Service] ✅ Broadcast to all successful`);
    return true;
  } catch (error) {
    console.error(`[WebSocket Service] ❌ Failed to broadcast to all:`, error);
    return false;
  }
}

/**
 * Send chat message - convenience wrapper for chat messages
 */
export async function sendChatMessage(params: {
  experienceId: string;
  conversationId: string;
  messageId: string;
  content: string;
  senderId: string;
  senderType: "admin" | "customer" | "bot";
  targetUserId?: string;
}): Promise<boolean> {
  const payload: MessagePayload = {
    type: "chat_message",
    conversationId: params.conversationId,
    messageId: params.messageId,
    content: params.content,
    senderId: params.senderId,
    senderType: params.senderType,
    timestamp: new Date().toISOString(),
  };

  // If targeting a specific user (e.g., admin sending to customer), send to that user
  // Also broadcast to experience so other admins can see
  if (params.targetUserId) {
    await sendToUser(params.targetUserId, payload);
  }
  
  // Always broadcast to experience for admin monitoring
  return broadcastToExperience(params.experienceId, payload);
}

/**
 * Send bot message - convenience wrapper for bot/funnel messages
 */
export async function sendBotMessage(params: {
  experienceId: string;
  conversationId: string;
  messageId: string;
  content: string;
  targetUserId: string;
  metadata?: MessagePayload["metadata"];
}): Promise<boolean> {
  const payload: MessagePayload = {
    type: "bot_message",
    conversationId: params.conversationId,
    messageId: params.messageId,
    content: params.content,
    senderId: "bot",
    senderType: "bot",
    timestamp: new Date().toISOString(),
    metadata: params.metadata,
  };

  // Send to the specific user
  await sendToUser(params.targetUserId, payload);
  
  // Also broadcast to experience for admin monitoring
  return broadcastToExperience(params.experienceId, payload);
}

/**
 * Send typing indicator
 */
export async function sendTypingIndicator(params: {
  experienceId: string;
  conversationId: string;
  senderId: string;
  senderType: "admin" | "customer";
  isTyping: boolean;
  targetUserId?: string;
}): Promise<boolean> {
  const payload: MessagePayload = {
    type: "typing",
    conversationId: params.conversationId,
    senderId: params.senderId,
    senderType: params.senderType,
    timestamp: new Date().toISOString(),
    metadata: { isTyping: params.isTyping },
  };

  if (params.targetUserId) {
    await sendToUser(params.targetUserId, payload);
  }
  
  return broadcastToExperience(params.experienceId, payload);
}

/**
 * Send stage transition notification
 */
export async function sendStageTransition(params: {
  experienceId: string;
  conversationId: string;
  targetUserId: string;
  currentStage: string;
  previousStage: string;
}): Promise<boolean> {
  const payload: MessagePayload = {
    type: "stage_transition",
    conversationId: params.conversationId,
    senderId: "system",
    senderType: "bot",
    timestamp: new Date().toISOString(),
    metadata: {
      stageTransition: {
        currentStage: params.currentStage,
        previousStage: params.previousStage,
      },
    },
  };

  // Send to user and broadcast to experience
  await sendToUser(params.targetUserId, payload);
  return broadcastToExperience(params.experienceId, payload);
}

