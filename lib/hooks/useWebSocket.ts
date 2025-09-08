/**
 * WebSocket Hook
 *
 * React hook for managing WebSocket connections and real-time communication.
 * Provides easy integration with the WHOP WebSocket system.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ChatMessage,
	type TypingIndicator,
	type UserPresence,
	realTimeMessaging,
} from "../websocket/messaging";
import {
	type CreditUpdate,
	type FunnelUpdate,
	type ResourceUpdate,
	type SystemNotification,
	realTimeUpdates,
} from "../websocket/updates";
import {
	type WebSocketConnection,
	WebSocketMessage,
	whopWebSocket,
} from "../websocket/whop-websocket";

export interface UseWebSocketOptions {
	autoConnect?: boolean;
	experienceId?: string;
	onConnectionChange?: (connected: boolean) => void;
	onError?: (error: Error) => void;
}

export interface UseWebSocketReturn {
	// Connection state
	connection: WebSocketConnection;
	isConnected: boolean;
	isConnecting: boolean;

	// Connection methods
	connect: () => Promise<void>;
	disconnect: () => void;

	// Channel methods
	joinChannel: (channel: string) => Promise<void>;
	leaveChannel: (channel: string) => Promise<void>;

	// Messaging methods
	sendMessage: (
		conversationId: string,
		content: string,
		type?: "user" | "bot" | "system",
	) => Promise<ChatMessage>;
	sendTypingIndicator: (
		conversationId: string,
		isTyping: boolean,
	) => Promise<void>;
	markMessageAsRead: (messageId: string) => Promise<void>;

	// Presence methods
	updatePresence: (
		isOnline: boolean,
		currentConversationId?: string,
	) => Promise<void>;

	// Subscription methods
	subscribeToConversation: (
		conversationId: string,
		handler: (message: ChatMessage) => void,
	) => void;
	subscribeToTyping: (
		conversationId: string,
		handler: (typing: TypingIndicator) => void,
	) => void;
	subscribeToPresence: (
		experienceId: string,
		handler: (presence: UserPresence) => void,
	) => void;
	subscribeToFunnelUpdates: (
		experienceId: string,
		handler: (update: FunnelUpdate) => void,
	) => void;
	subscribeToResourceUpdates: (
		experienceId: string,
		handler: (update: ResourceUpdate) => void,
	) => void;
	subscribeToNotifications: (
		userId: string,
		handler: (notification: SystemNotification) => void,
	) => void;
	subscribeToCreditUpdates: (
		userId: string,
		handler: (update: CreditUpdate) => void,
	) => void;

	// Utility methods
	getTypingUsers: (conversationId: string) => string[];
	getUserPresence: (userId: string) => UserPresence | undefined;
	getOnlineUsers: (experienceId: string) => UserPresence[];
}

export function useWebSocket(
	options: UseWebSocketOptions = {},
): UseWebSocketReturn {
	const {
		autoConnect = false,
		experienceId,
		onConnectionChange,
		onError,
	} = options;

	const [connection, setConnection] = useState<WebSocketConnection>({
		isConnected: false,
		isConnecting: false,
		channels: new Set(),
	});

	const userRef = useRef<any>(null);
	const initializedRef = useRef(false);

	// Update connection state
	const updateConnectionState = useCallback(() => {
		const status = whopWebSocket.getConnectionStatus();
		setConnection(status);
		onConnectionChange?.(status.isConnected);
	}, [onConnectionChange]);

	// Initialize WebSocket connection
	const connect = useCallback(async () => {
		if (!userRef.current) {
			throw new Error("User not authenticated");
		}

		try {
			setConnection((prev) => ({ ...prev, isConnecting: true }));

			// Connect WebSocket
			await whopWebSocket.connect({
				experienceId: userRef.current.experienceId,
				userId: userRef.current.id,
				autoReconnect: true,
				reconnectInterval: 5000,
				maxReconnectAttempts: 5,
			});

			// Initialize real-time messaging
			await realTimeMessaging.initialize(userRef.current);

			// Initialize real-time updates
			await realTimeUpdates.initialize(userRef.current);

			// Update user presence
			await realTimeMessaging.updateUserPresence(userRef.current, true);

			updateConnectionState();
		} catch (error) {
			setConnection((prev) => ({ ...prev, isConnecting: false }));
			onError?.(error as Error);
			throw error;
		}
	}, [experienceId, updateConnectionState, onError]);

	// Disconnect WebSocket
	const disconnect = useCallback(async () => {
		if (userRef.current) {
			await realTimeMessaging.updateUserPresence(userRef.current, false);
		}
		whopWebSocket.disconnect();
		updateConnectionState();
	}, [updateConnectionState]);

	// Join channel
	const joinChannel = useCallback(
		async (channel: string) => {
			await whopWebSocket.joinChannel(channel);
			updateConnectionState();
		},
		[updateConnectionState],
	);

	// Leave channel
	const leaveChannel = useCallback(
		async (channel: string) => {
			await whopWebSocket.leaveChannel(channel);
			updateConnectionState();
		},
		[updateConnectionState],
	);

	// Send message
	const sendMessage = useCallback(
		async (
			conversationId: string,
			content: string,
			type: "user" | "bot" | "system" = "user",
		) => {
			if (!userRef.current) {
				throw new Error("User not authenticated");
			}
			return await realTimeMessaging.sendMessage(
				userRef.current,
				conversationId,
				content,
				type,
			);
		},
		[],
	);

	// Send typing indicator
	const sendTypingIndicator = useCallback(
		async (conversationId: string, isTyping: boolean) => {
			if (!userRef.current) {
				throw new Error("User not authenticated");
			}
			await realTimeMessaging.sendTypingIndicator(
				userRef.current,
				conversationId,
				isTyping,
			);
		},
		[],
	);

	// Mark message as read
	const markMessageAsRead = useCallback(async (messageId: string) => {
		if (!userRef.current) {
			throw new Error("User not authenticated");
		}
		await realTimeMessaging.markMessageAsRead(userRef.current, messageId);
	}, []);

	// Update presence
	const updatePresence = useCallback(
		async (isOnline: boolean, currentConversationId?: string) => {
			if (!userRef.current) {
				throw new Error("User not authenticated");
			}
			await realTimeMessaging.updateUserPresence(
				userRef.current,
				isOnline,
				currentConversationId,
			);
		},
		[],
	);

	// Subscription methods
	const subscribeToConversation = useCallback(
		(conversationId: string, handler: (message: ChatMessage) => void) => {
			realTimeMessaging.subscribeToConversation(conversationId, handler);
		},
		[],
	);

	const subscribeToTyping = useCallback(
		(conversationId: string, handler: (typing: TypingIndicator) => void) => {
			realTimeMessaging.subscribeToTyping(conversationId, handler);
		},
		[],
	);

	const subscribeToPresence = useCallback(
		(experienceId: string, handler: (presence: UserPresence) => void) => {
			realTimeMessaging.subscribeToPresence(experienceId, handler);
		},
		[],
	);

	const subscribeToFunnelUpdates = useCallback(
		(experienceId: string, handler: (update: FunnelUpdate) => void) => {
			realTimeUpdates.subscribeToFunnelUpdates(experienceId, handler);
		},
		[],
	);

	const subscribeToResourceUpdates = useCallback(
		(experienceId: string, handler: (update: ResourceUpdate) => void) => {
			realTimeUpdates.subscribeToResourceUpdates(experienceId, handler);
		},
		[],
	);

	const subscribeToNotifications = useCallback(
		(userId: string, handler: (notification: SystemNotification) => void) => {
			realTimeUpdates.subscribeToSystemNotifications(userId, handler);
		},
		[],
	);

	const subscribeToCreditUpdates = useCallback(
		(userId: string, handler: (update: CreditUpdate) => void) => {
			realTimeUpdates.subscribeToCreditUpdates(userId, handler);
		},
		[],
	);

	// Utility methods
	const getTypingUsers = useCallback((conversationId: string) => {
		return realTimeMessaging.getTypingUsers(conversationId);
	}, []);

	const getUserPresence = useCallback((userId: string) => {
		return realTimeMessaging.getUserPresence(userId);
	}, []);

	const getOnlineUsers = useCallback((experienceId: string) => {
		return realTimeMessaging.getOnlineUsers(experienceId);
	}, []);

	// Set up connection status monitoring
	useEffect(() => {
		whopWebSocket.onConnectionChange(updateConnectionState);
		return () => {
			// Cleanup handled by WebSocket manager
		};
	}, [updateConnectionState]);

	// Auto-connect if enabled
	useEffect(() => {
		if (autoConnect && !initializedRef.current) {
			// Get user from context or authentication
			// This would need to be implemented based on your auth system
			const user = getUserFromContext(); // Placeholder
			if (user) {
				userRef.current = user;
				connect().catch(onError);
				initializedRef.current = true;
			}
		}
	}, [autoConnect, connect, onError]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (initializedRef.current) {
				disconnect();
			}
		};
	}, [disconnect]);

	return {
		// Connection state
		connection,
		isConnected: connection.isConnected,
		isConnecting: connection.isConnecting,

		// Connection methods
		connect,
		disconnect,

		// Channel methods
		joinChannel,
		leaveChannel,

		// Messaging methods
		sendMessage,
		sendTypingIndicator,
		markMessageAsRead,

		// Presence methods
		updatePresence,

		// Subscription methods
		subscribeToConversation,
		subscribeToTyping,
		subscribeToPresence,
		subscribeToFunnelUpdates,
		subscribeToResourceUpdates,
		subscribeToNotifications,
		subscribeToCreditUpdates,

		// Utility methods
		getTypingUsers,
		getUserPresence,
		getOnlineUsers,
	};
}

// Placeholder function - would need to be implemented based on your auth system
function getUserFromContext(): any {
	// This would get the current user from your authentication context
	// For now, return null to prevent auto-connection
	return null;
}

export default useWebSocket;
