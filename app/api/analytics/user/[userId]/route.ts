import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../../lib/middleware/whop-auth';
import { analyticsSystem } from '../../../../../lib/analytics/analytics';

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
    const analytics = await analyticsSystem.getUserInteractionAnalytics(user, targetUserId, {
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
export const GET = withCustomerAuth(getUserAnalyticsHandler);
