import { useCallback, useEffect, useState, useRef } from "react";
import { useWebsocket, useWebsocketStatus, useBroadcastWebsocketMessage, useOnWebsocketMessage } from "@whop/react";

export interface UserChatMessage {
	id: string;
	type: "user" | "bot" | "system";
	content: string;
	metadata?: any;
	createdAt: Date;
	timestamp?: Date;
}

export interface WhopWebSocketConfig {
	conversationId: string;
	experienceId: string;
	userId?: string;
	onMessage?: (message: UserChatMessage) => void;
	onTyping?: (isTyping: boolean, userId?: string) => void;
	onError?: (error: string) => void;
}

/**
 * Custom hook for UserChat WebSocket integration using Whop React hooks
 * 
 * Uses the official @whop/react WebSocket hooks for proper integration
 */
export function useWhopWebSocket(config: WhopWebSocketConfig) {
	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
	const [reconnectAttempts, setReconnectAttempts] = useState(0);
	const [lastMessageTime, setLastMessageTime] = useState<number>(0);
	
	// Refs for cleanup and performance
	const messageQueue = useRef<UserChatMessage[]>([]);
	const isProcessing = useRef(false);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	
	// Use Whop React hooks
	const websocketContext = useWebsocket();
	const connectionStatus = useWebsocketStatus();
	const broadcast = useBroadcastWebsocketMessage();

	// Get the actual websocket client from context
	const websocket = websocketContext.status === "initializing" ? null : websocketContext.websocket;

	// Update connection status with reconnection logic (background initialization)
	useEffect(() => {
		const connected = connectionStatus === "connected";
		setIsConnected(connected);
		
		if (connected) {
			setError(null);
			setReconnectAttempts(0);
			// Process any queued messages
			processMessageQueue();
			console.log("UserChat WebSocket: Connected for real-time updates");
		} else if (connectionStatus === "disconnected" && reconnectAttempts < 5) {
			// Exponential backoff reconnection (background only)
			const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
			reconnectTimeoutRef.current = setTimeout(() => {
				setReconnectAttempts(prev => prev + 1);
				console.log("UserChat WebSocket: Attempting reconnection...");
				// The WebSocket will automatically reconnect
			}, delay);
		}
		
		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, [connectionStatus, reconnectAttempts]);

	// Process queued messages
	const processMessageQueue = useCallback(() => {
		if (isProcessing.current || messageQueue.current.length === 0) return;
		
		isProcessing.current = true;
		const messages = [...messageQueue.current];
		messageQueue.current = [];
		
		messages.forEach(message => {
			config.onMessage?.(message);
		});
		
		isProcessing.current = false;
	}, [config]);

	// Handle incoming messages using the proper React hook
	useOnWebsocketMessage((message) => {
		try {
			// Parse the message
			const parsedMessage = JSON.parse(message.json);
			
			// Check if it's a conversation message
			if (parsedMessage.conversationId === config.conversationId) {
				// Handle typing indicators separately
				if (parsedMessage.type === "typing") {
					config.onTyping?.(parsedMessage.isTyping, parsedMessage.userId);
					return;
				}
				
				// Only process actual chat messages (not typing indicators)
				if (parsedMessage.type === "message" || parsedMessage.messageType) {
					const chatMessage: UserChatMessage = {
						id: parsedMessage.id || `ws-${Date.now()}`,
						type: parsedMessage.messageType || parsedMessage.type || "bot",
						content: parsedMessage.content || "",
						metadata: parsedMessage.metadata,
						createdAt: parsedMessage.timestamp ? new Date(parsedMessage.timestamp) : new Date(),
						timestamp: new Date(),
					};

					// Update last message time for connection health
					setLastMessageTime(Date.now());
					
					// If connected, process immediately; otherwise queue
					if (isConnected) {
						config.onMessage?.(chatMessage);
					} else {
						messageQueue.current.push(chatMessage);
					}
				}
			}
		} catch (err) {
			console.error("Error handling WebSocket message:", err);
			config.onError?.("Failed to process message");
		}
	});

	// Send message with caching and optimization
	const sendMessage = useCallback(async (
		content: string, 
		type: "user" | "bot" | "system" = "user", 
		metadata?: any
	): Promise<boolean> => {
		try {
			if (!isConnected) {
				// Queue message for when connection is restored
				messageQueue.current.push({
					id: `queued-${Date.now()}`,
					type,
					content,
					metadata,
					createdAt: new Date(),
				});
				return false;
			}

			// Note: User messages are now processed via API in UserChat component
			// WebSocket only handles real-time broadcasting, not database operations

			// Send the original message via WebSocket
			const message = {
				type: "message",
				conversationId: config.conversationId,
				messageType: type,
				content: content,
				metadata: metadata,
				userId: config.userId,
				timestamp: new Date().toISOString(),
			};

			await broadcast({
				message: JSON.stringify(message),
				target: "everyone",
			});

			return true;
		} catch (err) {
			console.error("Failed to send message via WebSocket:", err);
			config.onError?.("Failed to send message");
			return false;
		}
	}, [isConnected, config, broadcast]);

	// Send typing indicator
	const sendTypingIndicator = useCallback(async (isTyping: boolean): Promise<boolean> => {
		try {
			if (!isConnected) {
				return false;
			}

			const message = {
				type: "typing",
				conversationId: config.conversationId,
				isTyping: isTyping,
				userId: config.userId,
			};

			await broadcast({
				message: JSON.stringify(message),
				target: "everyone",
			});

			return true;
		} catch (err) {
			console.error("Failed to send typing indicator:", err);
			return false;
		}
	}, [isConnected, config, broadcast]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, []);

	return {
		isConnected,
		isConnecting: connectionStatus === "connecting",
		error,
		typingUsers: Array.from(typingUsers),
		reconnectAttempts,
		lastMessageTime,
		queuedMessages: messageQueue.current.length,
		connect: () => {}, // Connection is handled by WhopWebsocketProvider
		disconnect: () => {}, // Disconnection is handled by WhopWebsocketProvider
		sendMessage,
		sendTypingIndicator,
	};
}
