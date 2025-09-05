import { NextRequest, NextResponse } from 'next/server';
import { withCustomerProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../../lib/middleware';
import { analyticsSystem } from '../../../../../lib/analytics/analytics';

/**
 * Funnel Analytics API Route
 * Handles funnel-specific analytics with proper authentication and authorization
 */

/**
 * GET /api/analytics/funnel/[funnelId] - Get funnel performance metrics
 */
async function getFunnelAnalyticsHandler(context: ProtectedRouteContext) {
  try {
    const { user, request } = context;
    const url = new URL(request.url);
    
    // Extract funnel ID from path
    const funnelId = url.pathname.split('/').pop();
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Funnel ID is required'
      );
    }

    // Extract query parameters
    const startDate = url.searchParams.get('startDate') ? new Date(url.searchParams.get('startDate')!) : undefined;
    const endDate = url.searchParams.get('endDate') ? new Date(url.searchParams.get('endDate')!) : undefined;

    // Get funnel performance metrics
    const metrics = await analyticsSystem.getFunnelPerformanceMetrics(user, funnelId, {
      startDate,
      endDate
    });

    return createSuccessResponse(metrics, 'Funnel analytics retrieved successfully');
  } catch (error) {
    console.error('Error getting funnel analytics:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const GET = withCustomerProtection(getFunnelAnalyticsHandler);
