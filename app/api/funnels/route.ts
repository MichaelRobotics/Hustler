import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, withAdminAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/simple-auth';
import { getFunnels, createFunnel } from '../../../lib/actions/funnel-actions';

/**
 * Funnels API Route
 * Handles CRUD operations for funnels with proper authentication and authorization
 */

/**
 * GET /api/funnels - List user's funnels
 */
async function getFunnelsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;

    // Get funnels using server action
    const result = await getFunnels(user, page, limit, search);

    return createSuccessResponse(result, 'Funnels retrieved successfully');
  } catch (error) {
    console.error('Error getting funnels:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/funnels - Create a new funnel
 */
async function createFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const input = await request.json();

    if (!input.name) {
      return createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Funnel name is required'
      );
    }

    // Create funnel using server action
    const newFunnel = await createFunnel(user, input);

    return createSuccessResponse(newFunnel, 'Funnel created successfully', 201);
  } catch (error) {
    console.error('Error creating funnel:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const GET = withCustomerAuth(getFunnelsHandler); // Both admin and customer can view funnels
export const POST = withAdminAuth(createFunnelHandler); // Only admin can create funnels