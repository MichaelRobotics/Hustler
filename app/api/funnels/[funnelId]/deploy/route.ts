import { NextRequest, NextResponse } from 'next/server';
import { withResourceProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../../lib/middleware';
import { deployFunnel } from '../../../../../lib/actions/funnel-actions';

/**
 * Deploy Funnel API Route
 * Handles funnel deployment with proper authentication and authorization
 */

/**
 * POST /api/funnels/[funnelId]/deploy - Deploy a funnel
 */
async function deployFunnelHandler(context: ProtectedRouteContext) {
  try {
    const funnelId = context.request.nextUrl.pathname.split('/')[3]; // Extract funnelId from path
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Deploy funnel using server action
    const deployedFunnel = await deployFunnel(context.user, funnelId);

    return createSuccessResponse(deployedFunnel, 'Funnel deployed successfully');
  } catch (error) {
    console.error('Error deploying funnel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler with resource protection
export const POST = withResourceProtection('funnel', 'customer', deployFunnelHandler);