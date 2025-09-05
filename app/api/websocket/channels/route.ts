import { NextRequest, NextResponse } from 'next/server';
import { withCustomerProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../lib/middleware';
import { whopWebSocket } from '../../../../lib/websocket/whop-websocket';

/**
 * WebSocket Channels API Route
 * Handles channel joining and leaving for real-time communication
 */

/**
 * POST /api/websocket/channels - Join a channel
 */
async function joinChannelHandler(context: ProtectedRouteContext) {
  try {
    const { user, request } = context;
    const body = await request.json();
    
    const { channel } = body;

    if (!channel) {
      return createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Channel name is required'
      );
    }

    // Validate channel access based on user permissions
    if (!validateChannelAccess(channel, user)) {
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'Access denied to this channel'
      );
    }

    // Join the channel
    await whopWebSocket.joinChannel(channel);

    return createSuccessResponse({
      channel,
      joined: true,
      userId: user.id
    }, 'Successfully joined channel');
  } catch (error) {
    console.error('Error joining channel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * DELETE /api/websocket/channels - Leave a channel
 */
async function leaveChannelHandler(context: ProtectedRouteContext) {
  try {
    const { user, request } = context;
    const body = await request.json();
    
    const { channel } = body;

    if (!channel) {
      return createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Channel name is required'
      );
    }

    // Leave the channel
    await whopWebSocket.leaveChannel(channel);

    return createSuccessResponse({
      channel,
      left: true,
      userId: user.id
    }, 'Successfully left channel');
  } catch (error) {
    console.error('Error leaving channel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * GET /api/websocket/channels - Get joined channels
 */
async function getChannelsHandler(context: ProtectedRouteContext) {
  try {
    const { user } = context;
    const status = whopWebSocket.getConnectionStatus();

    return createSuccessResponse({
      channels: Array.from(status.channels),
      userId: user.id,
      companyId: user.companyId
    }, 'Channels retrieved successfully');
  } catch (error) {
    console.error('Error getting channels:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * Validate if user has access to join a specific channel
 */
function validateChannelAccess(channel: string, user: any): boolean {
  // Parse channel type and validate access
  const [channelType, channelId] = channel.split(':');

  switch (channelType) {
    case 'company':
      // Users can only join their own company channels
      return channelId === user.companyId;

    case 'user':
      // Users can only join their own user channel
      return channelId === user.id;

    case 'conversation':
      // Users can join conversation channels if they have access to the conversation
      // This would need to be validated against the database
      return true; // Simplified for now

    case 'funnel_updates':
    case 'resource_updates':
    case 'analytics':
      // Company-wide channels - users can join their company's channels
      return channelId === user.companyId;

    case 'system':
      // System channel - all authenticated users can join
      return true;

    default:
      // Unknown channel type - deny access
      return false;
  }
}

// Export the protected route handlers
export const POST = withCustomerProtection(joinChannelHandler);
export const DELETE = withCustomerProtection(leaveChannelHandler);
export const GET = withCustomerProtection(getChannelsHandler);
