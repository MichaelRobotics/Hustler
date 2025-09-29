"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWebsocket, useWebsocketStatus, useBroadcastWebsocketMessage, useOnWebsocketMessage } from "@whop/react";
import type { AuthenticatedUser } from "../types/user";
import type { LiveChatConversation } from "../types/liveChat";
import { preLiveChatConnectionCleanup } from "../utils/websocket-server-cleanup";

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
	sendMessage: (message: string, type: "bot" | "system", messageId?: string) => Promise<void>;
	sendTyping: (isTyping: boolean) => void;
	subscribeToConversation: (conversationId: string) => void;
	unsubscribeFromConversation: (conversationId: string) => void;
	error: string | null;
	reconnect: () => void;
	reset: () => Promise<void>; // ✅ NEW: Complete WebSocket reset
	clearMessageQueue: () => void; // ✅ NEW: Clear pending messages
	stopSending: () => void; // ✅ NEW: Stop sending messages
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
	const processedMessages = useRef<Set<string>>(new Set());

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
			// ✅ FIXED: Clear server queue before establishing connection
			console.log("🧹 [LiveChat] Clearing WebSocket server queue before connection establishment");
			preLiveChatConnectionCleanup(experienceId)
				.then(success => {
					if (success) {
						console.log("✅ [LiveChat] Server queue cleared - ready for clean connection");
					} else {
						console.warn("⚠️ [LiveChat] Server queue clearing failed - proceeding with connection");
					}
				})
				.catch(error => {
					console.error("❌ [LiveChat] Server queue clearing error:", error);
				});

			// ✅ FIXED: Clear local message queue before establishing connection
			console.log("🧹 [LiveChat] Clearing local message queue before WebSocket connection establishment");
			processedMessages.current.clear();
			setMessageQueue([]); // ✅ FIXED: Clear message queue state
			console.log("✅ [LiveChat] Local message queue cleared - starting with clean slate");
			
			console.log("🔌 [LiveChat] WebSocket: Connected for real-time updates", {
				experienceId,
				userId: user.id,
				channels: [`experience:${experienceId}`, `livechat:${experienceId}`]
			});
		}
	}, [isConnected, experienceId, user.id]);

	// ✅ ENHANCED: WebSocket connection instance identification
	useEffect(() => {
		console.log("🔌 [LiveChat] WebSocket Connection Instance:", {
			instanceId: `livechat-${experienceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			conversationId,
			experienceId,
			userId: user.id,
			userName: user.name,
			connectionStatus,
			websocketContext: websocket.status,
			websocketClient: websocket,
			isConnected,
			channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
			timestamp: new Date().toISOString()
		});
	}, [conversationId, experienceId, user.id, user.name, connectionStatus, websocket.status, websocket, isConnected]);

	// ACTUAL WebSocket message listener - this was missing!
	useOnWebsocketMessage((message) => {
		try {
			// Parse the message
			const parsedMessage = JSON.parse(message.json);
			console.log("📨 [LiveChat] BEFORE RECEIVING MESSAGE:", {
				instanceId: `livechat-${experienceId}-${Date.now()}`,
				conversationId,
				experienceId,
				userId: user.id,
				userName: user.name,
				receivedMessageType: parsedMessage.type,
				receivedConversationId: parsedMessage.conversationId,
				receivedContent: parsedMessage.content?.substring(0, 50) + "...",
				receivedUserId: parsedMessage.userId,
				receivedExperienceId: parsedMessage.experienceId,
				receivedTimestamp: parsedMessage.timestamp,
				rawMessage: message.json,
				channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
				connectionStatus,
				websocketContext: websocket.status,
				timestamp: new Date().toISOString()
			});
			
			// Call the message handler
			handleWebSocketMessage(parsedMessage);
		} catch (err) {
			console.error("LiveChat WebSocket: Error parsing message:", err);
		}
	});

	// Handle WebSocket messages from UserChat system
	const handleWebSocketMessage = useCallback((data: any) => {
		try {
			// Parse the message if it's a string
			const message = typeof data === 'string' ? JSON.parse(data) : data;

			// ✅ FIXED: Enhanced multitenancy isolation
			// Check experience ID first (primary isolation)
			if (message.experienceId && message.experienceId !== experienceId) {
				console.log("🚫 [LiveChat] Message blocked - different experience:", {
					messageExperienceId: message.experienceId,
					currentExperienceId: experienceId,
					messageType: message.type,
					conversationId: message.conversationId
				});
				return; // Not for our experience
			}

			// ✅ FIXED: Add message deduplication to prevent duplicate processing
			const messageId = message.id || `${message.conversationId}-${message.timestamp}`;
			if (processedMessages.current.has(messageId)) {
				console.log("🚫 [LiveChat] Message blocked - duplicate detected:", {
					messageId,
					messageType: message.type,
					conversationId: message.conversationId,
					processedCount: processedMessages.current.size
				});
				return;
			}
			processedMessages.current.add(messageId);
			console.log("✅ [LiveChat] Message passed deduplication check:", {
				messageId,
				messageType: message.type,
				conversationId: message.conversationId
			});

			// ✅ FIXED: Prevent duplicate messages from optimistic UI
			// Skip WebSocket messages that are from the current user (to avoid duplicates from optimistic UI)
			if (message.userId && user.id && message.userId === user.id) {
				console.log("🚫 [LiveChat] Skipping message from current user to prevent duplicate from optimistic UI:", {
					messageUserId: message.userId,
					currentUserId: user.id,
					conversationId: message.conversationId,
					messageContent: message.content?.substring(0, 50) + "..."
				});
				return;
			}

			// ✅ FIXED: Implement proper user access level filtering
			// Allow admin to see all messages within the same experience
			// This ensures proper multitenancy while allowing admin monitoring
			if (message.userId && user.id && message.userId !== user.id) {
				console.log("LiveChat: Message from different user, allowing admin monitoring");
				// Continue processing - admin should see all messages in their experience
			}

			// Handle different message types from UserChat system
			console.log("🔍 [LiveChat] Processing message type:", message.type);
			switch (message.type) {
				case "message":
					// ✅ FIXED: Process messages from ANY conversation in the same experience
					// This allows admin to monitor all conversations
					if (message.conversationId && message.content) {
						console.log(`📨 [LiveChat] Processing message for conversation ${message.conversationId}:`, {
							content: message.content.substring(0, 50) + "...",
							messageType: message.messageType,
							userId: message.userId,
							experienceId: message.experienceId
						});
						
						console.log("✅ [LiveChat] AFTER RECEIVING MESSAGE:", {
							instanceId: `livechat-${experienceId}-${Date.now()}`,
							conversationId,
							experienceId,
							userId: user.id,
							userName: user.name,
							processedMessageType: message.type,
							processedConversationId: message.conversationId,
							processedContent: message.content.substring(0, 50) + "...",
							processedUserId: message.userId,
							processedExperienceId: message.experienceId,
							processedTimestamp: message.timestamp,
							messageId: message.id || `msg-${Date.now()}`,
							messageType: message.messageType || "user",
							channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
							connectionStatus,
							websocketContext: websocket.status,
							timestamp: new Date().toISOString()
						});
						
						console.log("✅ [LiveChat] Calling onMessage callback...");
						onMessage?.({
							type: "message",
							conversationId: message.conversationId,
							message: {
								id: message.id || `msg-${Date.now()}`,
								type: message.messageType || "user",
								content: message.content,
								timestamp: message.timestamp || new Date().toISOString(),
								metadata: {
									...message.metadata,
									userId: message.userId, // Include user ID for admin monitoring
									experienceId: message.experienceId, // Include experience ID for multitenancy
								},
							},
						});
						console.log("✅ [LiveChat] onMessage callback completed");
					} else {
						console.log("⚠️ [LiveChat] Message missing required fields:", {
							hasConversationId: !!message.conversationId,
							hasContent: !!message.content,
							messageType: message.type
						});
					}
					break;

				case "new_conversation":
					// ✅ FIXED: Only process new conversation events when they are actually new
					// This prevents false alerts from duplicate message broadcasting
					if (message.conversationId && message.experienceId === experienceId) {
						// Check if this conversation already exists in the admin's view
						// This prevents duplicate new conversation alerts
						console.log("LiveChat: New conversation detected:", message.conversationId);
						
						// Create a proper conversation object for the admin
						const newConversation: LiveChatConversation = {
							id: message.conversationId,
							status: "open" as const,
							createdAt: message.timestamp || new Date().toISOString(),
							updatedAt: message.timestamp || new Date().toISOString(),
							lastMessage: message.metadata?.messageContent || "New conversation started",
							lastMessageAt: message.timestamp || new Date().toISOString(),
							messageCount: 1,
							userId: message.userId || "unknown",
							funnelId: "unknown", // Will be populated by the API
							funnelName: "Unknown Funnel", // Will be populated by the API
							startedAt: message.timestamp || new Date().toISOString(),
							user: {
								id: message.userId || "unknown",
								name: "New User", // Will be populated by the API
								email: undefined,
								isOnline: true, // Assume new user is online
							},
							messages: [], // Will be populated when conversation is selected
							metadata: {
								...message.metadata,
								userId: message.userId,
								experienceId: message.experienceId,
								isNewConversation: true,
							},
						};

						// Trigger conversation list update
						onConversationUpdate?.(newConversation);
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
	const sendMessage = useCallback(async (message: string, type: "bot" | "system", messageId?: string) => {
		console.log("🔊 [LiveChat] BEFORE SENDING MESSAGE:", {
			instanceId: `livechat-${experienceId}-${Date.now()}`,
			conversationId,
			experienceId,
			userId: user.id,
			userName: user.name,
			message: message.substring(0, 50) + "...",
			type,
			isConnected,
			connectionStatus,
			websocketContext: websocket.status,
			channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
			timestamp: new Date().toISOString()
		});

		// Don't throw errors - just log and return silently
		if (!isConnected) {
			console.warn("🚫 [LiveChat] WebSocket not connected, skipping message send");
			return;
		}

		// ✅ NEW: Check if sending is blocked
		if (isSendingBlocked) {
			console.warn("🚫 [LiveChat] Message sending is blocked, skipping message send");
			return;
		}

		if (!conversationId) {
			console.warn("🚫 [LiveChat] No conversation selected, skipping message send");
			return;
		}

		try {
			const messageData = {
				id: messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ✅ FIXED: Use provided messageId or generate one
				type: "message", // ✅ FIXED: Use same type as UserChat
				conversationId,
				messageType: type,
				content: message, // ✅ FIXED: Use 'content' field like UserChat
				metadata: {
					userId: user.id,
					experienceId,
					timestamp: new Date().toISOString(),
					isOptimistic: !!messageId, // ✅ FIXED: Mark as optimistic if messageId provided
				},
				userId: user.id,
				experienceId,
				timestamp: new Date().toISOString(),
			};

			console.log("🔊 [LiveChat] About to broadcast message:", {
				messageData: JSON.stringify(messageData),
				target: "everyone",
				experienceId,
				conversationId,
				channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
				timestamp: new Date().toISOString()
			});

			// Use Whop's broadcast hook to send messages
			// ✅ FIXED: Use same target as UserChat for cross-device synchronization
			const broadcastResult = await broadcast({
				message: JSON.stringify(messageData),
				target: "everyone", // ✅ FIXED: Broadcast to all connected clients like UserChat
			});

			console.log("✅ [LiveChat] AFTER SENDING MESSAGE:", {
				instanceId: `livechat-${experienceId}-${Date.now()}`,
				conversationId,
				experienceId,
				userId: user.id,
				userName: user.name,
				message: message.substring(0, 50) + "...",
				type,
				target: "everyone",
				broadcastResult,
				isConnected,
				connectionStatus,
				websocketContext: websocket.status,
				channels: [`experience:${experienceId}`, `livechat:${experienceId}`],
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			console.error("❌ [LiveChat] Failed to send WebSocket message:", error);
			// Don't throw - just log the error
		}
	}, [conversationId, user.id, user.name, experienceId, isConnected, connectionStatus, websocket.status, broadcast]);

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

	// ✅ NEW: WebSocket reset functions
	const [isSendingBlocked, setIsSendingBlocked] = useState(false);
	const [messageQueue, setMessageQueue] = useState<any[]>([]);

	// Complete WebSocket reset - stops all messages and reconnects clean
	const reset = useCallback(async () => {
		console.log("🔄 [LiveChat] Starting complete WebSocket reset...");
		
		try {
			// 1. Stop sending messages
			setIsSendingBlocked(true);
			console.log("🚫 [LiveChat] Blocked message sending");
			
			// 2. Clear message queue
			setMessageQueue([]);
			console.log("🧹 [LiveChat] Cleared message queue");
			
			// 3. Clear processed messages to prevent duplicates
			processedMessages.current.clear();
			console.log("🧹 [LiveChat] Cleared processed messages cache");
			
			// 4. Force WebSocket reconnection
			if (reconnect) {
				console.log("🔄 [LiveChat] Triggering WebSocket reconnection...");
				reconnect();
			}
			
			// 5. Wait a moment for reconnection
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// 6. Re-enable sending
			setIsSendingBlocked(false);
			console.log("✅ [LiveChat] WebSocket reset completed - ready for clean messages");
			
		} catch (error) {
			console.error("❌ [LiveChat] WebSocket reset failed:", error);
			setIsSendingBlocked(false); // Re-enable sending even if reset fails
		}
	}, [reconnect]);

	// Clear message queue without reconnecting
	const clearMessageQueue = useCallback(() => {
		console.log("🧹 [LiveChat] Clearing message queue...");
		setMessageQueue([]);
		processedMessages.current.clear();
		console.log("✅ [LiveChat] Message queue cleared");
	}, []);

	// ✅ NEW: Clear message queue before WebSocket connection (called automatically)
	const clearMessageQueueBeforeConnection = useCallback(() => {
		console.log("🧹 [LiveChat] Pre-connection cleanup: Clearing message queue before WebSocket establishment");
		setMessageQueue([]);
		processedMessages.current.clear();
		console.log("✅ [LiveChat] Pre-connection cleanup completed - ready for clean WebSocket start");
	}, []);

	// Stop sending messages (but keep connection alive)
	const stopSending = useCallback(() => {
		console.log("🚫 [LiveChat] Stopping message sending...");
		setIsSendingBlocked(true);
		console.log("✅ [LiveChat] Message sending stopped");
	}, []);

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
		reset, // ✅ NEW: Complete WebSocket reset
		clearMessageQueue, // ✅ NEW: Clear pending messages
		stopSending, // ✅ NEW: Stop sending messages
	};
}
