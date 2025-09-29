/**
 * WebSocket Server Cleanup Utilities
 * 
 * Functions to clear WebSocket server message queues before client connections
 * to ensure clean message delivery without old/pending messages.
 */

import { apiPost } from "./api-client";

/**
 * Clear WebSocket server message queue for an experience
 * 
 * This should be called before establishing WebSocket connections to ensure
 * that new clients don't receive old/pending messages from the server queue.
 * 
 * @param experienceId - The experience ID to clear queues for
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function clearWebSocketServerQueue(experienceId: string): Promise<boolean> {
	try {
		console.log("🧹 [WebSocket Cleanup] Clearing server queue for experience:", experienceId);
		
		const response = await apiPost('/api/websocket/clear-queue', {
			experienceId
		}, experienceId);

		if (!response.ok) {
			console.error("❌ [WebSocket Cleanup] Failed to clear server queue:", response.status);
			return false;
		}

		const result = await response.json();
		
		if (result.success) {
			console.log("✅ [WebSocket Cleanup] Server queue cleared successfully:", {
				experienceId,
				channels: result.channels,
				timestamp: result.timestamp
			});
			return true;
		} else {
			console.error("❌ [WebSocket Cleanup] Server queue clearing failed:", result.error);
			return false;
		}

	} catch (error) {
		console.error("❌ [WebSocket Cleanup] Error clearing server queue:", error);
		return false;
	}
}

/**
 * Clear WebSocket server queue with retry logic
 * 
 * Attempts to clear the server queue with exponential backoff retry
 * in case of temporary failures.
 * 
 * @param experienceId - The experience ID to clear queues for
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function clearWebSocketServerQueueWithRetry(
	experienceId: string, 
	maxRetries: number = 3
): Promise<boolean> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			console.log(`🧹 [WebSocket Cleanup] Attempt ${attempt}/${maxRetries} to clear server queue`);
			
			const success = await clearWebSocketServerQueue(experienceId);
			
			if (success) {
				console.log(`✅ [WebSocket Cleanup] Server queue cleared on attempt ${attempt}`);
				return true;
			}
			
			if (attempt < maxRetries) {
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
				console.log(`⏳ [WebSocket Cleanup] Retrying in ${delay}ms...`);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
			
		} catch (error) {
			console.error(`❌ [WebSocket Cleanup] Attempt ${attempt} failed:`, error);
			
			if (attempt === maxRetries) {
				console.error("❌ [WebSocket Cleanup] All retry attempts failed");
				return false;
			}
		}
	}
	
	return false;
}

/**
 * Pre-connection cleanup for UserChat
 * 
 * Clears the WebSocket server queue before UserChat establishes connection
 * to prevent old messages from being delivered to the new client.
 * 
 * @param experienceId - The experience ID
 * @param conversationId - The conversation ID (optional)
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function preUserChatConnectionCleanup(
	experienceId: string, 
	conversationId?: string
): Promise<boolean> {
	console.log("🧹 [UserChat Pre-Connection] Starting server queue cleanup:", {
		experienceId,
		conversationId
	});
	
	const success = await clearWebSocketServerQueueWithRetry(experienceId);
	
	if (success) {
		console.log("✅ [UserChat Pre-Connection] Server queue cleared - ready for clean connection");
	} else {
		console.warn("⚠️ [UserChat Pre-Connection] Server queue clearing failed - proceeding with connection");
	}
	
	return success;
}

/**
 * Pre-connection cleanup for LiveChat
 * 
 * Clears the WebSocket server queue before LiveChat establishes connection
 * to prevent old messages from being delivered to the new client.
 * 
 * @param experienceId - The experience ID
 * @returns Promise<boolean> - True if successful, false otherwise
 */
export async function preLiveChatConnectionCleanup(experienceId: string): Promise<boolean> {
	console.log("🧹 [LiveChat Pre-Connection] Starting server queue cleanup:", {
		experienceId
	});
	
	const success = await clearWebSocketServerQueueWithRetry(experienceId);
	
	if (success) {
		console.log("✅ [LiveChat Pre-Connection] Server queue cleared - ready for clean connection");
	} else {
		console.warn("⚠️ [LiveChat Pre-Connection] Server queue clearing failed - proceeding with connection");
	}
	
	return success;
}
