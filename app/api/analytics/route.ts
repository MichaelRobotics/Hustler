import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/simple-auth';
import { getFunnelAnalytics } from '../../../lib/actions/funnel-actions';

/**
 * Analytics API Route
 * Handles analytics operations with proper authentication and authorization
 */

/**
 * GET /api/analytics - Get analytics data
 */
async function getAnalyticsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const funnelId = url.searchParams.get('funnelId');
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined;
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined;

    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Get analytics using server action
    const analytics = await getFunnelAnalytics(user, funnelId, startDate, endDate);

    return createSuccessResponse(analytics, 'Analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting analytics:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const GET = withCustomerAuth(getAnalyticsHandler);
