import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';
import { analyticsSystem } from '../../../../lib/analytics/analytics';

/**
 * Analytics Tracking API Route
 * Handles real-time analytics tracking with proper authentication and authorization
 */

/**
 * POST /api/analytics/track - Track analytics events
 */
async function trackAnalyticsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const body = await request.json();
    
    const { event, funnelId, conversationId, data } = body;

    if (!event || !funnelId) {
      return createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Event and funnelId are required'
      );
    }

    // Track the event based on type
    switch (event) {
      case 'funnel_view':
        await analyticsSystem.trackFunnelView(funnelId, user.id);
        break;
      case 'funnel_start':
        if (!conversationId) {
          return createErrorResponse(
            'MISSING_REQUIRED_FIELDS',
            'ConversationId is required for funnel_start event'
          );
        }
        await analyticsSystem.trackFunnelStart(funnelId, conversationId, user.id);
        break;
      case 'funnel_completion':
        if (!conversationId) {
          return createErrorResponse(
            'MISSING_REQUIRED_FIELDS',
            'ConversationId is required for funnel_completion event'
          );
        }
        await analyticsSystem.trackFunnelCompletion(funnelId, conversationId, user.id);
        break;
      case 'conversion':
        if (!conversationId || !data?.revenue) {
          return createErrorResponse(
            'MISSING_REQUIRED_FIELDS',
            'ConversationId and revenue are required for conversion event'
          );
        }
        await analyticsSystem.trackConversion(funnelId, conversationId, data.revenue, user.id);
        break;
      default:
        return createErrorResponse(
          'INVALID_INPUT',
          `Unknown event type: ${event}`
        );
    }

    return createSuccessResponse(
      { event, funnelId, conversationId, tracked: true },
      'Analytics event tracked successfully'
    );
  } catch (error) {
    console.error('Error tracking analytics:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const POST = withCustomerAuth(trackAnalyticsHandler);
