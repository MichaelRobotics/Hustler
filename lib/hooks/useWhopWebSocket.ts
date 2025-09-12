import { useCallback, useEffect, useState } from "react";
import { useWebsocket, useWebsocketStatus, useBroadcastWebsocketMessage, useOnWebsocketMessage } from "@whop/react";
import { apiPost } from "../utils/api-client";

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
	
	// Use Whop React hooks
	const websocketContext = useWebsocket();
	const connectionStatus = useWebsocketStatus();
	const broadcast = useBroadcastWebsocketMessage();

	// Get the actual websocket client from context
	const websocket = websocketContext.status === "initializing" ? null : websocketContext.websocket;

	// Update connection status
	useEffect(() => {
		const connected = connectionStatus === "connected";
		setIsConnected(connected);
		if (connected) {
			setError(null);
		}
	}, [connectionStatus]);

	// Handle incoming messages using the proper React hook
	useOnWebsocketMessage((message) => {
		try {
			console.log("Received WebSocket message:", message);
			
			// Parse the message
			const parsedMessage = JSON.parse(message.json);
			console.log("Parsed message:", parsedMessage);
			
			// Check if it's a conversation message
			if (parsedMessage.conversationId === config.conversationId) {
				console.log("Message is for current conversation, processing...");
				
				const chatMessage: UserChatMessage = {
					id: parsedMessage.id || `ws-${Date.now()}`,
					type: parsedMessage.messageType || parsedMessage.type || "bot",
					content: parsedMessage.content || "",
					metadata: parsedMessage.metadata,
					createdAt: parsedMessage.timestamp ? new Date(parsedMessage.timestamp) : new Date(),
					timestamp: new Date(),
				};

				console.log("Calling onMessage with:", chatMessage);
				config.onMessage?.(chatMessage);
			} else {
				console.log("Message is not for current conversation:", parsedMessage.conversationId, "vs", config.conversationId);
			}
		} catch (err) {
			console.error("Error handling WebSocket message:", err);
			config.onError?.("Failed to process message");
		}
	});

	// Send message
	const sendMessage = useCallback(async (
		content: string, 
		type: "user" | "bot" | "system" = "user", 
		metadata?: any
	): Promise<boolean> => {
		try {
			if (!isConnected) {
				throw new Error("WebSocket not connected");
			}

			// For user messages, also process through funnel system
			if (type === "user") {
				try {
					const response = await apiPost('/api/userchat/process-message', {
						conversationId: config.conversationId,
						messageContent: content,
						messageType: type,
					}, config.experienceId);

					if (response.ok) {
						const result = await response.json();
						console.log("Message processed through funnel:", result);
						
						// If there's a bot response, send it via WebSocket
						if (result.funnelResponse?.botMessage) {
							const botMessage = {
								type: "message",
								conversationId: config.conversationId,
								messageType: "bot",
								content: result.funnelResponse.botMessage,
								metadata: {
									blockId: result.funnelResponse.nextBlockId,
									timestamp: new Date().toISOString(),
								},
								userId: "system",
								timestamp: new Date().toISOString(),
							};

							console.log("Broadcasting bot message:", botMessage);
							
							await broadcast({
								message: JSON.stringify(botMessage),
								target: "everyone",
							});
							
							// Also trigger the onMessage callback directly to ensure it's received
							const chatMessage: UserChatMessage = {
								id: `bot-${Date.now()}`,
								type: "bot",
								content: result.funnelResponse.botMessage,
								metadata: {
									blockId: result.funnelResponse.nextBlockId,
									timestamp: new Date().toISOString(),
								},
								createdAt: new Date(),
								timestamp: new Date(),
							};
							
							config.onMessage?.(chatMessage);
						}
					} else {
						console.error("Failed to process message through funnel:", response.statusText);
					}
				} catch (apiError) {
					console.error("Error calling message processing API:", apiError);
					// Continue with WebSocket message even if API fails
				}
			}

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

	return {
		isConnected,
		isConnecting: connectionStatus === "connecting",
		error,
		typingUsers: Array.from(typingUsers),
		connect: () => {}, // Connection is handled by WhopWebsocketProvider
		disconnect: () => {}, // Disconnection is handled by WhopWebsocketProvider
		sendMessage,
		sendTypingIndicator,
	};
}
