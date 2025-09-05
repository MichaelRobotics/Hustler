import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';
import { performanceMonitoring } from '../../../../lib/monitoring/performance';

/**
 * Performance Monitoring API Route
 * Handles system performance monitoring with admin-only access
 */

/**
 * GET /api/monitoring/performance - Get system performance metrics
 */
async function getPerformanceMetricsHandler(request: NextRequest, context: AuthContext) {
  try {
    const url = new URL(request.url);
    
    // Extract query parameters
    const type = url.searchParams.get('type') || 'summary';

    let data;
    switch (type) {
      case 'health':
        data = await performanceMonitoring.getSystemHealthStatus();
        break;
      case 'summary':
        data = performanceMonitoring.getPerformanceSummary();
        break;
      case 'slow-queries':
        const limit = parseInt(url.searchParams.get('limit') || '10');
        data = performanceMonitoring.getSlowQueriesReport(limit);
        break;
      case 'errors':
        const errorLimit = parseInt(url.searchParams.get('limit') || '10');
        data = performanceMonitoring.getErrorReport(errorLimit);
        break;
      default:
        return createErrorResponse(
          'INVALID_INPUT',
          'Invalid type parameter. Valid types: health, summary, slow-queries, errors'
        );
    }

    return createSuccessResponse(data, 'Performance metrics retrieved successfully');
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/monitoring/performance - Record system metrics
 */
async function recordPerformanceMetricsHandler(request: NextRequest, context: AuthContext) {
  try {
    await performanceMonitoring.recordSystemMetrics();
    
    return createSuccessResponse(
      { recorded: true, timestamp: new Date() },
      'Performance metrics recorded successfully'
    );
  } catch (error) {
    console.error('Error recording performance metrics:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const GET = withAdminAuth(getPerformanceMetricsHandler);
export const POST = withAdminAuth(recordPerformanceMetricsHandler);
