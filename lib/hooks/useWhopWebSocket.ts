import { useCallback, useEffect, useState, useRef } from "react";
import { useWebsocket, useWebsocketStatus, useBroadcastWebsocketMessage, useOnWebsocketMessage } from "@whop/react";
import { apiPost } from "../utils/api-client";
import { cache, CacheKeys, CACHE_TTL } from "../middleware/cache";
import { preUserChatConnectionCleanup } from "../utils/websocket-server-cleanup";

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
	const processedMessages = useRef<Set<string>>(new Set());
	
	// Use Whop React hooks
	const websocketContext = useWebsocket();
	const connectionStatus = useWebsocketStatus();
	const broadcast = useBroadcastWebsocketMessage();
	
	// Debug broadcast function availability
	useEffect(() => {
		console.log("🔌 [useWhopWebSocket] Broadcast function check:", {
			broadcastType: typeof broadcast,
			broadcastFunction: broadcast,
			isFunction: typeof broadcast === 'function',
			connectionStatus,
			websocketContext: websocketContext.status
		});
	}, [broadcast, connectionStatus, websocketContext.status]);

	// Get the actual websocket client from context
	const websocket = websocketContext.status === "initializing" ? null : websocketContext.websocket;

	// ✅ ENHANCED: WebSocket connection instance identification
	useEffect(() => {
		console.log("🔌 [UserChat] WebSocket Connection Instance:", {
			instanceId: `userchat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			conversationId: config.conversationId,
			experienceId: config.experienceId,
			userId: config.userId,
			connectionStatus,
			websocketContext: websocketContext.status,
			websocketClient: websocket,
			isConnected,
			channels: [`experience:${config.experienceId}`, `livechat:${config.experienceId}`],
			timestamp: new Date().toISOString()
		});
	}, [config.conversationId, config.experienceId, config.userId, connectionStatus, websocketContext.status, websocket, isConnected]);

	// Update connection status with reconnection logic (background initialization)
	useEffect(() => {
		const connected = connectionStatus === "connected";
		setIsConnected(connected);
		
		if (connected) {
			// ✅ FIXED: Clear server queue before establishing connection
			console.log("🧹 [UserChat] Clearing WebSocket server queue before connection establishment");
			preUserChatConnectionCleanup(config.experienceId, config.conversationId)
				.then(success => {
					if (success) {
						console.log("✅ [UserChat] Server queue cleared - ready for clean connection");
					} else {
						console.warn("⚠️ [UserChat] Server queue clearing failed - proceeding with connection");
					}
				})
				.catch(error => {
					console.error("❌ [UserChat] Server queue clearing error:", error);
				});

			// ✅ FIXED: Clear local message queue before establishing connection
			console.log("🧹 [UserChat] Clearing local message queue before WebSocket connection establishment");
			messageQueue.current = [];
			processedMessages.current.clear();
			console.log("✅ [UserChat] Local message queue cleared - starting with clean slate");
			
			setError(null);
			setReconnectAttempts(0);
			// Process any queued messages (should be empty now)
			processMessageQueue();
			console.log("🔌 [UserChat] WebSocket: Connected for real-time updates", {
				experienceId: config.experienceId,
				conversationId: config.conversationId,
				userId: config.userId,
				channels: [`experience:${config.experienceId}`, `livechat:${config.experienceId}`],
				websocketStatus: connectionStatus,
				websocketContext: websocketContext.status
			});
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
			
			// ✅ FIXED: Remove conversation filtering to allow cross-conversation monitoring
			// Still maintain multitenancy by checking experienceId
			if (parsedMessage.experienceId && parsedMessage.experienceId !== config.experienceId) {
				return; // Not for our experience - maintain multitenancy isolation
			}
			
			console.log("📨 [UserChat] BEFORE RECEIVING MESSAGE:", {
				instanceId: `userchat-${config.conversationId}-${Date.now()}`,
				conversationId: config.conversationId,
				experienceId: config.experienceId,
				userId: config.userId,
				receivedMessageType: parsedMessage.type,
				receivedConversationId: parsedMessage.conversationId,
				receivedContent: parsedMessage.content?.substring(0, 50) + "...",
				receivedUserId: parsedMessage.userId,
				receivedExperienceId: parsedMessage.experienceId,
				receivedTimestamp: parsedMessage.timestamp,
				channels: [`experience:${config.experienceId}`, `livechat:${config.experienceId}`],
				connectionStatus,
				websocketContext: websocketContext.status,
				timestamp: new Date().toISOString()
			});
			
			// Handle typing indicators separately
			if (parsedMessage.type === "typing") {
				// Only process typing for current conversation to avoid noise
				if (parsedMessage.conversationId === config.conversationId) {
					config.onTyping?.(parsedMessage.isTyping, parsedMessage.userId);
				}
				return;
			}
			
			// Only process actual chat messages (not typing indicators)
			if (parsedMessage.type === "message" || parsedMessage.messageType) {
				// ✅ FIXED: Add message deduplication to prevent duplicate processing
				const messageId = parsedMessage.id || `${parsedMessage.conversationId}-${parsedMessage.timestamp}`;
				if (processedMessages.current.has(messageId)) {
					console.log("UserChat: Duplicate message detected, skipping:", messageId);
					return;
				}
				processedMessages.current.add(messageId);

				// ✅ FIXED: Process messages from ANY conversation in the same experience
				// This allows admin monitoring across all conversations
				const chatMessage: UserChatMessage = {
					id: parsedMessage.id || `ws-${Date.now()}`,
					type: parsedMessage.messageType || parsedMessage.type || "bot",
					content: parsedMessage.content || "",
					metadata: {
						...parsedMessage.metadata,
						conversationId: parsedMessage.conversationId, // Include conversation ID for filtering
						userId: parsedMessage.userId, // Include user ID for multitenancy
						experienceId: parsedMessage.experienceId, // Include experience ID for multitenancy
					},
					createdAt: parsedMessage.timestamp ? new Date(parsedMessage.timestamp) : new Date(),
					timestamp: new Date(),
				};

				console.log("✅ [UserChat] AFTER RECEIVING MESSAGE:", {
					instanceId: `userchat-${config.conversationId}-${Date.now()}`,
					conversationId: config.conversationId,
					experienceId: config.experienceId,
					userId: config.userId,
					processedMessage: chatMessage,
					messageId: chatMessage.id,
					messageType: chatMessage.type,
					messageContent: chatMessage.content.substring(0, 50) + "...",
					messageMetadata: chatMessage.metadata,
					channels: [`experience:${config.experienceId}`, `livechat:${config.experienceId}`],
					connectionStatus,
					websocketContext: websocketContext.status,
					timestamp: new Date().toISOString()
				});

				// Update last message time for connection health
				setLastMessageTime(Date.now());
				
				// If connected, process immediately; otherwise queue
				if (isConnected) {
					config.onMessage?.(chatMessage);
				} else {
					messageQueue.current.push(chatMessage);
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
		console.log("🔊 [UserChat] BEFORE SENDING MESSAGE:", {
			instanceId: `userchat-${config.conversationId}-${Date.now()}`,
			conversationId: config.conversationId,
			experienceId: config.experienceId,
			userId: config.userId,
			content: content.substring(0, 50) + "...",
			type,
			metadata,
			isConnected,
			connectionStatus,
			websocketContext: websocketContext.status,
			channels: [`experience:${config.experienceId}`, `livechat:${config.experienceId}`],
			timestamp: new Date().toISOString()
		});
		
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
				console.log("⚠️ [useWhopWebSocket] Message queued (not connected)");
				return false;
			}

			// ✅ REMOVED: Database save when WebSocket sends messages
			// WebSocket should only handle real-time communication, not database persistence
			// Database saves should only happen when user directly interacts (typing, clicking options)
			console.log("🔊 [UserChat WebSocket] Sending message without database save:", {
				content: content.substring(0, 50) + "...",
				type,
				conversationId: config.conversationId,
				experienceId: config.experienceId
			});

			// Send the original message via WebSocket
			const message = {
				id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ✅ FIXED: Add unique message ID
				type: "message",
				conversationId: config.conversationId,
				messageType: type,
				content: content,
				metadata: metadata,
				userId: config.userId,
				experienceId: config.experienceId, // ✅ FIXED: Include experience ID for multitenancy
				timestamp: new Date().toISOString(),
			};

			console.log("🔊 [useWhopWebSocket] About to broadcast message:", {
				message: JSON.stringify(message),
				target: "everyone",
				experienceId: config.experienceId,
				conversationId: config.conversationId,
				broadcastFunction: typeof broadcast,
				isConnected
			});
			
			try {
				const broadcastResult = await broadcast({
					message: JSON.stringify(message),
					target: "everyone", // ✅ FIXED: Broadcast to all connected clients in the experience
				});

				console.log("✅ [UserChat] AFTER SENDING MESSAGE:", {
					instanceId: `userchat-${config.conversationId}-${Date.now()}`,
					conversationId: message.conversationId,
					experienceId: message.experienceId,
					userId: message.userId,
					type: message.type,
					content: message.content.substring(0, 50) + "...",
					target: "everyone",
					messageId: message.id,
					timestamp: message.timestamp,
					broadcastResult: broadcastResult,
					channels: [`experience:${config.experienceId}`, `livechat:${config.experienceId}`],
					connectionStatus,
					websocketContext: websocketContext.status
				});
			} catch (broadcastError) {
				console.error("❌ [useWhopWebSocket] Broadcast failed:", broadcastError);
				throw broadcastError;
			}
			
			// ✅ TEST: Send a test message to verify cross-device communication
			console.log("🧪 [TEST] Cross-device WebSocket test - this message should appear in LiveChat if WebSocket is working");

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

	// ✅ NEW: Clear message queue before WebSocket connection (called automatically)
	const clearMessageQueueBeforeConnection = useCallback(() => {
		console.log("🧹 [UserChat] Pre-connection cleanup: Clearing message queue before WebSocket establishment");
		messageQueue.current = [];
		processedMessages.current.clear();
		console.log("✅ [UserChat] Pre-connection cleanup completed - ready for clean WebSocket start");
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
		clearMessageQueueBeforeConnection, // ✅ NEW: Pre-connection cleanup
	};
}
