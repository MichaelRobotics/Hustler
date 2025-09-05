import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../../lib/middleware/whop-auth';
import { analyticsSystem } from '../../../../../lib/analytics/analytics';
import { getUserContext } from '../../../../../lib/context/user-context';

/**
 * User Analytics API Route
 * Handles user-specific analytics with proper authentication and authorization
 */

/**
 * GET /api/analytics/user/[userId] - Get user interaction analytics
 */
async function getUserAnalyticsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    
    // Extract user ID from path
    const targetUserId = url.pathname.split('/').pop();
    if (!targetUserId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'User ID is required'
      );
    }

    // Extract query parameters
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined;
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined;

    // Get user interaction analytics
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

    const analytics = await // analyticsSystem.getUserInteractionAnalytics(context.user, targetUserId, {
      startDate,
      endDate
    });

    return createSuccessResponse(analytics, 'User analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting user analytics:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const GET = withWhopAuth(getUserAnalyticsHandler);
