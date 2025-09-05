import { NextRequest, NextResponse } from 'next/server';
import { withCustomerProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../lib/middleware';
import { whopWebSocket } from '../../../../lib/websocket/whop-websocket';
import { realTimeMessaging } from '../../../../lib/websocket/messaging';
import { realTimeUpdates } from '../../../../lib/websocket/updates';

/**
 * WebSocket Connection API Route
 * Handles WebSocket connection initialization and channel management
 */

/**
 * POST /api/websocket/connect - Initialize WebSocket connection
 */
async function connectWebSocketHandler(context: ProtectedRouteContext) {
  try {
    const { user, request } = context;
    const body = await request.json();
    
    const { experienceId, autoReconnect = true } = body;

    // Initialize WebSocket connection
    await whopWebSocket.connect({
      experienceId,
      companyId: user.companyId,
      userId: user.id,
      autoReconnect,
      reconnectInterval: 5000, // 5 seconds
      maxReconnectAttempts: 5
    });

    // Initialize real-time messaging
    await realTimeMessaging.initialize(user);

    // Initialize real-time updates
    await realTimeUpdates.initialize(user);

    // Update user presence
    await realTimeMessaging.updateUserPresence(user, true);

    return createSuccessResponse({
      connected: true,
      userId: user.id,
      companyId: user.companyId,
      experienceId: experienceId || null,
      channels: Array.from(whopWebSocket.getConnectionStatus().channels)
    }, 'WebSocket connection established successfully');
  } catch (error) {
    console.error('Error connecting WebSocket:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/websocket/disconnect - Disconnect WebSocket
 */
async function disconnectWebSocketHandler(context: ProtectedRouteContext) {
  try {
    const { user } = context;

    // Update user presence to offline
    await realTimeMessaging.updateUserPresence(user, false);

    // Disconnect WebSocket
    whopWebSocket.disconnect();

    return createSuccessResponse({
      connected: false,
      userId: user.id
    }, 'WebSocket disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting WebSocket:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * GET /api/websocket/status - Get WebSocket connection status
 */
async function getWebSocketStatusHandler(context: ProtectedRouteContext) {
  try {
    const { user } = context;
    const status = whopWebSocket.getConnectionStatus();

    return createSuccessResponse({
      ...status,
      userId: user.id,
      companyId: user.companyId
    }, 'WebSocket status retrieved successfully');
  } catch (error) {
    console.error('Error getting WebSocket status:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const POST = withCustomerProtection(connectWebSocketHandler);
export const DELETE = withCustomerProtection(disconnectWebSocketHandler);
export const GET = withCustomerProtection(getWebSocketStatusHandler);
