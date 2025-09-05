import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '../../../../lib/middleware/whop-auth';

/**
 * Individual Funnel API Route
 * Handles operations on specific funnels with resource-level authorization
 */

/**
 * GET /api/funnels/[funnelId] - Get specific funnel
 */
async function getFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const funnelId = request.nextUrl.pathname.split('/').pop();
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Get funnel using server action
    const funnel = await getFunnelById(context.user, funnelId);

    return createSuccessResponse(funnel, 'Funnel retrieved successfully');
  } catch (error) {
    console.error('Error getting funnel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * PUT /api/funnels/[funnelId] - Update specific funnel
 */
async function updateFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const funnelId = request.nextUrl.pathname.split('/').pop();
    const input = await request.json();
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Update funnel using server action
    const updatedFunnel = await updateFunnel(context.user, funnelId, input);

    return createSuccessResponse(updatedFunnel, 'Funnel updated successfully');
  } catch (error) {
    console.error('Error updating funnel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * DELETE /api/funnels/[funnelId] - Delete specific funnel
 */
async function deleteFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const funnelId = request.nextUrl.pathname.split('/').pop();
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Delete funnel using server action
    const deleted = await deleteFunnel(context.user, funnelId);

    return createSuccessResponse(
      { id: funnelId, deleted }, 
      'Funnel deleted successfully'
    );
  } catch (error) {
    console.error('Error deleting funnel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers with resource protection
export const GET = withFunnelAuth( getFunnelHandler);
export const PUT = withFunnelAuth( updateFunnelHandler);
export const DELETE = withFunnelAuth( deleteFunnelHandler);