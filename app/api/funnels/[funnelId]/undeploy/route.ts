import { NextRequest, NextResponse } from 'next/server';
import { withResourceProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../../lib/middleware';
import { undeployFunnel } from '../../../../../lib/actions/funnel-actions';

/**
 * Undeploy Funnel API Route
 * Handles funnel undeployment with proper authentication and authorization
 */

/**
 * POST /api/funnels/[funnelId]/undeploy - Undeploy a funnel
 */
async function undeployFunnelHandler(context: ProtectedRouteContext) {
  try {
    const funnelId = context.request.nextUrl.pathname.split('/')[3]; // Extract funnelId from path
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Undeploy funnel using server action
    const undeployedFunnel = await undeployFunnel(context.user, funnelId);

    return createSuccessResponse(undeployedFunnel, 'Funnel undeployed successfully');
  } catch (error) {
    console.error('Error undeploying funnel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler with resource protection
export const POST = withResourceProtection('funnel', 'customer', undeployFunnelHandler);