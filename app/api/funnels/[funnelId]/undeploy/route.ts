import { NextRequest, NextResponse } from 'next/server';
import { withFunnelAuth, createSuccessResponse, createErrorResponse } from '../../../../../lib/middleware/whop-auth';
import { type AuthContext } from '../../../../../lib/middleware/whop-auth';
import { undeployFunnel } from '../../../../../lib/actions/funnel-actions';


import { getUserContext } from '../../../../../lib/context/user-context';

/**
 * Undeploy Funnel API Route
 * Handles funnel undeployment with proper authentication and authorization
 */

/**
 * POST /api/funnels/[funnelId]/undeploy - Undeploy a funnel
 */
async function undeployFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const funnelId = request.nextUrl.pathname.split('/')[3]; // Extract funnelId from path
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Use experience ID from URL or fallback to a default
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV'; // Fallback for API routes

    // Get the full user context from the simplified auth (whopCompanyId is now optional)
    const userContext = await getUserContext(
      user.userId,
      '', // whopCompanyId is optional for experience-based isolation
      experienceId,
      false, // forceRefresh
      'customer' // default access level
    );

    if (!userContext) {
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 401 }
      );
    }

    // Undeploy funnel using server action
    const undeployedFunnel = await undeployFunnel(userContext.user, funnelId);

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
export const POST = withFunnelAuth( undeployFunnelHandler);