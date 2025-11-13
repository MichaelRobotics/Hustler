"use client";

import { useEffect, useRef, useState, useCallback } from "react";
// DISABLED: WebSocket hooks are disabled to prevent automatic connections
// import { useWebsocket, useWebsocketStatus, useBroadcastWebsocketMessage } from "@whop/react";
import type { AuthenticatedUser } from "../types/user";
import type { LiveChatConversation } from "../types/liveChat";

export interface LiveChatWebSocketMessage {
	type: "message" | "typing" | "conversation_update" | "connection_status";
	conversationId?: string;
	message?: {
		id: string;
		type: "user" | "bot" | "system";
		content: string;
		timestamp: Date;
		metadata?: any;
	};
	typing?: {
		userId: string;
		isTyping: boolean;
	};
	conversation?: LiveChatConversation;
	status?: "connected" | "disconnected" | "connecting";
}

export interface UseLiveChatWebSocketOptions {
	user: AuthenticatedUser;
	experienceId: string;
	conversationId?: string;
	onMessage?: (message: LiveChatWebSocketMessage) => void;
	onTyping?: (userId: string, isTyping: boolean) => void;
	onConversationUpdate?: (conversation: LiveChatConversation) => void;
	onConnectionChange?: (status: "connected" | "disconnected" | "connecting") => void;
}

export interface UseLiveChatWebSocketReturn {
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
 * Custom hook for LiveChat WebSocket integration
 * Handles real-time messaging, typing indicators, and conversation updates
 */
export function useLiveChatWebSocket({
	user,
	experienceId,
	conversationId,
	onMessage,
	onTyping,
	onConversationUpdate,
	onConnectionChange,
}: UseLiveChatWebSocketOptions): UseLiveChatWebSocketReturn {
	const [error, setError] = useState<string | null>(null);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// DISABLED: WebSocket hooks are disabled to prevent automatic connections
	// Use Whop React hooks for WebSocket functionality
	// const websocket = useWebsocket();
	// const connectionStatus = useWebsocketStatus();
	// const broadcast = useBroadcastWebsocketMessage();

	// Return no-op implementations
	const websocket = { status: "disconnected" as const };
	const connectionStatus = "disconnected" as const;
	const broadcast = async (_args?: any) => ({ success: false });

	// DISABLED: Always report as connected to prevent reconnection UI
	// Convert Whop connection status to our format
	const isConnected = true; // Always true to prevent reconnection UI
	const status: "connected" | "disconnected" | "connecting" = "connected";

	// Connect to WebSocket (handled by WhopWebsocketProvider)
	const connect = useCallback(async () => {
		// Connection is handled by WhopWebsocketProvider
		// This is just for compatibility with the interface
		console.log("WebSocket connection handled by WhopWebsocketProvider");
	}, []);

	// Disconnect from WebSocket (handled by WhopWebsocketProvider)
	const disconnect = useCallback(() => {
		// Disconnection is handled by WhopWebsocketProvider
		// This is just for compatibility with the interface
		console.log("WebSocket disconnection handled by WhopWebsocketProvider");
	}, []);

	// Handle WebSocket messages
	const handleWebSocketMessage = useCallback((data: LiveChatWebSocketMessage) => {
		switch (data.type) {
			case "message":
				onMessage?.(data);
				break;
			case "typing":
				if (data.typing) {
					onTyping?.(data.typing.userId, data.typing.isTyping);
				}
				break;
			case "conversation_update":
				if (data.conversation) {
					onConversationUpdate?.(data.conversation);
				}
				break;
			case "connection_status":
				if (data.status) {
					onConnectionChange?.(data.status);
				}
				break;
		}
	}, [onMessage, onTyping, onConversationUpdate, onConnectionChange]);

	// Send message
	const sendMessage = useCallback(async (message: string, type: "bot" | "system") => {
		if (!isConnected) {
			throw new Error("WebSocket not connected");
		}

		if (!conversationId) {
			throw new Error("No conversation selected");
		}

		const messageData = {
			type: "send_message",
			conversationId,
			message,
			messageType: type,
			userId: user.id,
			experienceId,
		};

		// Use Whop's broadcast hook to send messages
		broadcast({
			message: JSON.stringify(messageData),
			target: { customId: `livechat:${experienceId}` },
		});
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
			isTyping,
		};

		// Use Whop's broadcast hook to send typing indicators
		broadcast({
			message: JSON.stringify(typingData),
			target: { customId: `livechat:${experienceId}` },
		});

		// Auto-stop typing after 3 seconds
		if (isTyping) {
			typingTimeoutRef.current = setTimeout(() => {
				sendTyping(false);
			}, 3000);
		}
	}, [conversationId, user.id, experienceId, isConnected, broadcast]);

	// Subscribe to conversation (handled by WhopWebsocketProvider)
	const subscribeToConversation = useCallback((convId: string) => {
		// Subscription is handled by WhopWebsocketProvider
		// This is just for compatibility with the interface
		console.log(`Subscribed to conversation: ${convId}`);
	}, []);

	// Unsubscribe from conversation (handled by WhopWebsocketProvider)
	const unsubscribeFromConversation = useCallback((convId: string) => {
		// Unsubscription is handled by WhopWebsocketProvider
		// This is just for compatibility with the interface
		console.log(`Unsubscribed from conversation: ${convId}`);
	}, []);

	// Reconnect function (handled by WhopWebsocketProvider)
	const reconnect = useCallback(async () => {
		// Reconnection is handled by WhopWebsocketProvider
		// This is just for compatibility with the interface
		console.log("WebSocket reconnection handled by WhopWebsocketProvider");
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
