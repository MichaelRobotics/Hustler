import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/whop-auth';
import { getFunnels } from '../../../lib/actions/funnel-actions';
import { getResources } from '../../../lib/actions/resource-actions';
import { getUserContext } from '../../../lib/context/user-context';

/**
 * Dashboard Data API Route
 * Returns combined funnels and resources data in a single request
 * Optimizes frontend by reducing multiple API calls to one
 */

/**
 * GET /api/dashboard-data - Get combined dashboard data
 */
async function getDashboardDataHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;

    // Use experience ID from URL or fallback to a default
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV';

    // Get the full user context (cached for performance)
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

    // Fetch funnels and resources in parallel for better performance
    const [funnelsResult, resourcesResult] = await Promise.all([
      getFunnels(userContext.user, page, limit, search),
      getResources(userContext.user, page, limit, search)
    ]);

    const dashboardData = {
      funnels: funnelsResult,
      resources: resourcesResult,
      user: {
        id: userContext.user.id,
        experienceId: userContext.user.experienceId,
        accessLevel: userContext.user.accessLevel
      }
    };

    return createSuccessResponse(dashboardData, 'Dashboard data retrieved successfully');
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export handler with authentication middleware
export const GET = withCustomerAuth(getDashboardDataHandler);
