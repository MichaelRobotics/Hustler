import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';

/**
 * WebSocket Channels API Route
 * Handles WebSocket channel management with proper authentication
 */

/**
 * POST /api/websocket/channels - Join WebSocket channels
 */
async function joinChannelsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const input = await request.json();
    
    // Use experience ID from URL or fallback to a default
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV'; // Fallback for API routes

    // Validate channel access
    const validateChannelAccess = (channelType: string, channelId: string) => {
      switch (channelType) {
        case 'experience':
          return channelId === experienceId;
        case 'funnel_updates':
        case 'resource_updates':
        case 'analytics':
          return channelId === experienceId;
        default:
          return false;
      }
    };

    const validChannels = input.channels.filter((channel: string) => {
      const [type, id] = channel.split(':');
      return validateChannelAccess(type, id);
    });

    return createSuccessResponse({
      joinedChannels: validChannels,
      userId: user.userId,
      experienceId
    }, 'Channels joined successfully');
  } catch (error) {
    console.error('Error joining channels:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * DELETE /api/websocket/channels - Leave WebSocket channels
 */
async function leaveChannelsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const input = await request.json();
    
    // Use experience ID from URL or fallback to a default
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV'; // Fallback for API routes

    return createSuccessResponse({
      leftChannels: input.channels || [],
      userId: user.userId,
      experienceId
    }, 'Channels left successfully');
  } catch (error) {
    console.error('Error leaving channels:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const POST = withWhopAuth(joinChannelsHandler);
export const DELETE = withWhopAuth(leaveChannelsHandler);
