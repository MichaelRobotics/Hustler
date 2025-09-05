import { NextRequest, NextResponse } from 'next/server';
import { withCreditsProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../../lib/middleware';
import { regenerateFunnelFlow } from '../../../../../lib/actions/funnel-actions';

/**
 * Regenerate Funnel API Route
 * Handles funnel regeneration with proper authentication, authorization, and credit protection
 */

/**
 * POST /api/funnels/[funnelId]/regenerate - Regenerate a funnel flow using AI
 */
async function regenerateFunnelHandler(context: ProtectedRouteContext) {
  try {
    const funnelId = context.request.nextUrl.pathname.split('/')[3]; // Extract funnelId from path
    
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

// Export the protected route handler with credits protection (1 credit required)
export const POST = withCreditsProtection(1, regenerateFunnelHandler);