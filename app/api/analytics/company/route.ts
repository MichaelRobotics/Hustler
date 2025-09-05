import { NextRequest, NextResponse } from 'next/server';
import { withCustomerProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../lib/middleware';
import { analyticsSystem } from '../../../../lib/analytics/analytics';

/**
 * Company Analytics API Route
 * Handles company-wide analytics with proper authentication and authorization
 */

/**
 * GET /api/analytics/company - Get company analytics
 */
async function getCompanyAnalyticsHandler(context: ProtectedRouteContext) {
  try {
    const { user, request } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined;
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined;

    // Get company analytics
    const analytics = await analyticsSystem.getCompanyAnalytics(user, {
      startDate,
      endDate
    });

    return createSuccessResponse(analytics, 'Company analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting company analytics:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const GET = withCustomerProtection(getCompanyAnalyticsHandler);
