import { NextRequest, NextResponse } from 'next/server';
import { withFunnelAuth, createSuccessResponse, createErrorResponse } from '../../../../../lib/middleware/whop-auth';
import { type AuthContext } from '../../../../../lib/middleware/whop-auth';
import { getUserContext } from '../../../../../lib/context/user-context';
import { db } from '../../../../../lib/supabase/db';
import { funnels } from '../../../../../lib/supabase/schema';
import { eq, and } from 'drizzle-orm';
import { VisualizationState } from '../../../../../lib/types/visualization';

/**
 * Funnel Visualization State API Route
 * Handles saving and loading visualization state for funnels
 */

/**
 * GET /api/funnels/[funnelId]/visualization - Get visualization state
 */
async function getVisualizationStateHandler(request: NextRequest, context: AuthContext) {
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
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV';

    // Get the full user context
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

    // Get funnel with visualization state
    const funnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.experienceId, userContext.user.experienceId)
      ),
      columns: {
        id: true,
        visualizationState: true
      }
    });

    if (!funnel) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Funnel not found'
      );
    }

    // Check access permissions
    if (userContext.user.accessLevel === 'customer' && funnel.userId !== userContext.user.id) {
      return createErrorResponse(
        'ACCESS_DENIED',
        'Access denied: You can only access your own funnels'
      );
    }

    // Return visualization state (default to empty object if null)
    const visualizationState = funnel.visualizationState || {};

    return createSuccessResponse(visualizationState, 'Visualization state retrieved successfully');
  } catch (error) {
    console.error('Error getting visualization state:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * PUT /api/funnels/[funnelId]/visualization - Save visualization state
 */
async function saveVisualizationStateHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const funnelId = request.nextUrl.pathname.split('/')[3]; // Extract funnelId from path
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Parse request body
    const visualizationState: VisualizationState = await request.json();

    // Validate visualization state structure
    if (!visualizationState || typeof visualizationState !== 'object') {
      return createErrorResponse(
        'INVALID_INPUT',
        'Invalid visualization state format'
      );
    }

    // Use experience ID from URL or fallback to a default
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV';

    // Get the full user context
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

    // Check if funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.experienceId, userContext.user.experienceId)
      )
    });

    if (!existingFunnel) {
      return createErrorResponse(
        'RESOURCE_NOT_FOUND',
        'Funnel not found'
      );
    }

    // Check access permissions
    if (userContext.user.accessLevel === 'customer' && existingFunnel.userId !== userContext.user.id) {
      return createErrorResponse(
        'ACCESS_DENIED',
        'Access denied: You can only update your own funnels'
      );
    }

    // Update funnel with new visualization state
    const [updatedFunnel] = await db.update(funnels)
      .set({
        visualizationState: visualizationState,
        updatedAt: new Date()
      })
      .where(eq(funnels.id, funnelId))
      .returning({
        id: funnels.id,
        visualizationState: funnels.visualizationState
      });

    return createSuccessResponse(updatedFunnel, 'Visualization state saved successfully');
  } catch (error) {
    console.error('Error saving visualization state:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const GET = withFunnelAuth(getVisualizationStateHandler);
export const PUT = withFunnelAuth(saveVisualizationStateHandler);
