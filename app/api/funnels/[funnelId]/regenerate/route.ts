import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../../lib/middleware/whop-auth';
import { regenerateFunnelFlow } from '../../../../../lib/actions/funnel-actions';

/**
 * Regenerate Funnel API Route
 * Handles funnel regeneration with proper authentication, authorization, and credit protection
 */

/**
 * POST /api/funnels/[funnelId]/regenerate - Regenerate a funnel flow using AI
 */
async function regenerateFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const funnelId = request.nextUrl.pathname.split('/')[3]; // Extract funnelId from path
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Regenerate funnel using server action (requires 1 credit)
    const regeneratedFunnel = await regenerateFunnelFlow(context.user, funnelId);

    return createSuccessResponse(regeneratedFunnel, 'Funnel regenerated successfully');
  } catch (error) {
    console.error('Error regenerating funnel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const POST = withCustomerAuth(regenerateFunnelHandler);