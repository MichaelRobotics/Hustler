import { type NextRequest, NextResponse } from "next/server";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../../lib/middleware/whop-auth";
import { whopWebSocket } from "../../../../lib/websocket/whop-websocket";

/**
 * WebSocket Connection API Route
 * Handles WebSocket connection establishment with proper authentication
 */

/**
 * POST /api/websocket/connect - Establish WebSocket connection
 */
async function connectWebSocketHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;

		// Use experience ID from URL or fallback to a default
		const experienceId = user.experienceId || "exp_wl5EtbHqAqLdjV"; // Fallback for API routes

		// Connect to WebSocket
		const connectionResult = await whopWebSocket.connect({
			userId: user.userId,
			experienceId,
			autoReconnect: true,
			reconnectInterval: 5000,
			maxReconnectAttempts: 5,
		});

		return createSuccessResponse(
			{
				connected: true,
				userId: user.userId,
				experienceId,
			},
			"WebSocket connection established successfully",
		);
	} catch (error) {
		console.error("Error connecting to WebSocket:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

/**
 * GET /api/websocket/connect - Get WebSocket connection status
 */
async function getWebSocketStatusHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;

		// Use experience ID from URL or fallback to a default
		const experienceId = user.experienceId || "exp_wl5EtbHqAqLdjV"; // Fallback for API routes

		return createSuccessResponse(
			{
				connected: false,
				userId: user.userId,
				experienceId,
			},
			"WebSocket status retrieved successfully",
		);
	} catch (error) {
		console.error("Error getting WebSocket status:", error);
		return createErrorResponse("INTERNAL_ERROR", (error as Error).message);
	}
}

// Export the protected route handlers
export const POST = withWhopAuth(connectWebSocketHandler);
export const GET = withWhopAuth(getWebSocketStatusHandler);
