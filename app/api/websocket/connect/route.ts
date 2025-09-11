import { type NextRequest, NextResponse } from "next/server";
import {
	type AuthContext,
	createErrorResponse,
	createSuccessResponse,
	withWhopAuth,
} from "../../../../lib/middleware/whop-auth";
// WebSocket functionality moved to React hooks

/**
 * WebSocket Connection API Route
 * Handles WebSocket connection establishment with proper authentication
 */

/**
 * POST /api/websocket/connect - WebSocket connection info
 * Note: WebSocket connections are now handled by React hooks
 */
async function connectWebSocketHandler(
	request: NextRequest,
	context: AuthContext,
) {
	try {
		const { user } = context;

		// Use experience ID from URL or fallback to a default
		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 },
			);
		}
		const experienceId = user.experienceId;

		// Return connection info (actual connection handled by React hooks)
		return createSuccessResponse(
			{
				connected: false, // Will be true when React hooks establish connection
				userId: user.userId,
				experienceId,
				message: "WebSocket connection handled by React hooks"
			},
			"WebSocket connection info retrieved successfully",
		);
	} catch (error) {
		console.error("Error getting WebSocket info:", error);
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
		// Validate experience ID is provided
		if (!user.experienceId) {
			return NextResponse.json(
				{ error: "Experience ID is required" },
				{ status: 400 },
			);
		}
		const experienceId = user.experienceId;

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
