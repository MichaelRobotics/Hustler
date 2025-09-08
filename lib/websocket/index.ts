/**
 * WebSocket Module Index
 *
 * Exports all WebSocket functionality for real-time communication.
 */

// Core WebSocket functionality
export {
	whopWebSocket,
	type WebSocketMessage,
	type WebSocketConnection,
	type WebSocketConfig,
} from "./whop-websocket";

// Real-time messaging
export {
	realTimeMessaging,
	type ChatMessage,
	type TypingIndicator,
	type UserPresence,
	type MessageDeliveryStatus,
} from "./messaging";

// Real-time updates
export {
	realTimeUpdates,
	type FunnelUpdate,
	type ResourceUpdate,
	type AnalyticsUpdate,
	type SystemNotification,
	type CreditUpdate,
} from "./updates";

// React hook
export {
	useWebSocket,
	type UseWebSocketOptions,
	type UseWebSocketReturn,
} from "../hooks/useWebSocket";
