"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWebsocket, useWebsocketStatus, useBroadcastWebsocketMessage } from "@whop/react";
import type { AuthenticatedUser } from "../types/user";
import type { LiveChatConversation } from "../types/liveChat";

export interface LiveChatIntegrationMessage {
	type: "conversation_update" | "message" | "stage_transition" | "connection_status";
	conversationId?: string;
	conversation?: LiveChatConversation;
	message?: {
		id: string;
		type: "user" | "bot" | "system";
		content: string;
		timestamp: string;
		metadata?: any;
	};
	stageInfo?: {
		currentStage: string;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
		isDMFunnelActive: boolean;
	};
	status?: "connected" | "disconnected" | "connecting";
}

export interface UseLiveChatIntegrationOptions {
	user: AuthenticatedUser;
	experienceId: string;
	conversationId?: string;
	onConversationUpdate?: (conversation: LiveChatConversation) => void;
	onMessage?: (message: LiveChatIntegrationMessage) => void;
	onStageTransition?: (stageInfo: any) => void;
	onConnectionChange?: (status: "connected" | "disconnected" | "connecting") => void;
}

export interface UseLiveChatIntegrationReturn {
	isConnected: boolean;
	connectionStatus: "connected" | "disconnected" | "connecting";
	sendMessage: (message: string, type: "bot" | "system") => Promise<void>;
	sendTyping: (isTyping: boolean) => void;
	subscribeToConversation: (conversationId: string) => void;
	unsubscribeFromConversation: (conversationId: string) => void;
	error: string | null;
	reconnect: () => void;
}

/**
 * LiveChat Integration Hook
 * 
 * This hook integrates livechat with the UserChat WebSocket system by:
 * 1. Listening to UserChat WebSocket messages for conversations in the current experience
 * 2. Intercepting TRANSITION stage changes and other conversation updates
 * 3. Providing real-time updates to the livechat interface
 */
export function useLiveChatIntegration({
	user,
	experienceId,
	conversationId,
	onConversationUpdate,
	onMessage,
	onStageTransition,
	onConnectionChange,
}: UseLiveChatIntegrationOptions): UseLiveChatIntegrationReturn {
	const [error, setError] = useState<string | null>(null);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Use Whop React hooks for WebSocket functionality
	const websocket = useWebsocket();
	const connectionStatus = useWebsocketStatus();
	const broadcast = useBroadcastWebsocketMessage();

	// Convert Whop connection status to our format
	const isConnected = connectionStatus === "connected";
	const status: "connected" | "disconnected" | "connecting" = 
		connectionStatus === "connected" ? "connected" :
		connectionStatus === "connecting" ? "connecting" : "disconnected";

	// Log WebSocket status for debugging
	useEffect(() => {
		if (isConnected) {
			console.log("LiveChat WebSocket: Connected for real-time updates (background)");
		}
	}, [isConnected]);

	// Handle WebSocket messages from UserChat system
	const handleWebSocketMessage = useCallback((data: any) => {
		try {
			// Parse the message if it's a string
			const message = typeof data === 'string' ? JSON.parse(data) : data;

			// Check if this message is relevant to our experience
			if (message.experienceId && message.experienceId !== experienceId) {
				return; // Not for our experience
			}

			// Handle different message types from UserChat system
			switch (message.type) {
				case "message":
					// New message in a conversation
					if (message.conversationId && message.content) {
						onMessage?.({
							type: "message",
							conversationId: message.conversationId,
							message: {
								id: message.id || `msg-${Date.now()}`,
								type: message.messageType || "user",
								content: message.content,
								timestamp: message.timestamp || new Date().toISOString(),
								metadata: message.metadata,
							},
						});
					}
					break;

				case "conversation_update":
					// Conversation state changed (stage transition, etc.)
					if (message.conversationId) {
						onConversationUpdate?.(message.conversation);
					}
					break;

				case "stage_transition":
					// Stage transition occurred (TRANSITION -> EXPERIENCE_QUALIFICATION)
					if (message.stageInfo) {
						onStageTransition?.(message.stageInfo);
					}
					break;

				case "connection_status":
					// Connection status change
					if (message.status) {
						onConnectionChange?.(message.status);
					}
					break;

				default:
					// Handle UserChat specific messages
					if (message.conversationId && message.funnelResponse) {
						// This is a funnel response from UserChat
						onMessage?.({
							type: "message",
							conversationId: message.conversationId,
							message: {
								id: `funnel-${Date.now()}`,
								type: "bot",
								content: message.funnelResponse.botMessage || "Bot response",
								timestamp: new Date().toISOString(),
								metadata: {
									blockId: message.funnelResponse.nextBlockId,
									stageTransition: message.funnelResponse.stageTransition,
								},
							},
						});

						// If there's a stage transition, notify about it
						if (message.funnelResponse.stageTransition) {
							onStageTransition?.({
								currentStage: message.funnelResponse.stageTransition.currentStage,
								isTransitionStage: message.funnelResponse.stageTransition.isTransitionStage,
								isExperienceQualificationStage: message.funnelResponse.stageTransition.isExperienceQualificationStage,
								isDMFunnelActive: message.funnelResponse.stageTransition.isDMFunnelActive,
							});
						}
					}
					break;
			}
		} catch (err) {
			console.error("Error processing WebSocket message in livechat integration:", err);
			setError("Failed to process WebSocket message");
		}
	}, [experienceId, onMessage, onConversationUpdate, onStageTransition, onConnectionChange]);

	// Send message to a specific conversation
	const sendMessage = useCallback(async (message: string, type: "bot" | "system") => {
		// Don't throw errors - just log and return silently
		if (!isConnected) {
			console.warn("WebSocket not connected, skipping message send");
			return;
		}

		if (!conversationId) {
			console.warn("No conversation selected, skipping message send");
			return;
		}

		try {
			const messageData = {
				type: "livechat_message",
				conversationId,
				message,
				messageType: type,
				userId: user.id,
				experienceId,
				timestamp: new Date().toISOString(),
			};

			// Use Whop's broadcast hook to send messages
			broadcast({
				message: JSON.stringify(messageData),
				target: { customId: `conversation:${conversationId}` },
			});
		} catch (error) {
			console.warn("Failed to send WebSocket message:", error);
			// Don't throw - just log the error
		}
	}, [conversationId, user.id, experienceId, isConnected, broadcast]);

	// Send typing indicator
	const sendTyping = useCallback((isTyping: boolean) => {
		if (!isConnected) {
			return;
		}

		if (!conversationId) {
			return;
		}

		// Clear existing timeout
		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}

		// Send typing indicator
		const typingData = {
			type: "typing",
			conversationId,
			userId: user.id,
			experienceId,
			isTyping,
			timestamp: new Date().toISOString(),
		};

		// Use Whop's broadcast hook to send typing indicators
		broadcast({
			message: JSON.stringify(typingData),
			target: { customId: `conversation:${conversationId}` },
		});

		// Auto-stop typing after 3 seconds
		if (isTyping) {
			typingTimeoutRef.current = setTimeout(() => {
				sendTyping(false);
			}, 3000);
		}
	}, [conversationId, user.id, experienceId, isConnected, broadcast]);

	// Subscribe to conversation updates
	const subscribeToConversation = useCallback((convId: string) => {
		if (!isConnected) {
			return;
		}

		// Subscribe to conversation-specific updates
		broadcast({
			message: JSON.stringify({
				type: "subscribe_conversation",
				conversationId: convId,
				experienceId,
				userId: user.id,
			}),
			target: { customId: `conversation:${convId}` },
		});
	}, [isConnected, experienceId, user.id, broadcast]);

	// Unsubscribe from conversation updates
	const unsubscribeFromConversation = useCallback((convId: string) => {
		if (!isConnected) {
			return;
		}

		// Unsubscribe from conversation-specific updates
		broadcast({
			message: JSON.stringify({
				type: "unsubscribe_conversation",
				conversationId: convId,
				experienceId,
				userId: user.id,
			}),
			target: { customId: `conversation:${convId}` },
		});
	}, [isConnected, experienceId, user.id, broadcast]);

	// Reconnect function
	const reconnect = useCallback(async () => {
		// Reconnection is handled by WhopWebsocketProvider
		console.log("LiveChat integration reconnection handled by WhopWebsocketProvider");
	}, []);

	// Effect to handle conversation changes
	useEffect(() => {
		if (conversationId && isConnected) {
			subscribeToConversation(conversationId);
		}

		return () => {
			if (conversationId) {
				unsubscribeFromConversation(conversationId);
			}
		};
	}, [conversationId, isConnected, subscribeToConversation, unsubscribeFromConversation]);

	// Effect to handle connection status changes
	useEffect(() => {
		onConnectionChange?.(status);
	}, [status, onConnectionChange]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, []);

	return {
		isConnected,
		connectionStatus: status,
		sendMessage,
		sendTyping,
		subscribeToConversation,
		unsubscribeFromConversation,
		error,
		reconnect,
	};
}
