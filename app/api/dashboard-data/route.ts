import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/whop-auth';
import { getFunnels } from '../../../lib/actions/funnel-actions';
import { getResources } from '../../../lib/actions/resource-actions';

// Simple in-memory cache for dashboard responses
const dashboardCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

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

    // Check cache first
    const cacheKey = `${user.userId}:${experienceId}:${page}:${limit}:${search || ''}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return createSuccessResponse(cached.data, 'Dashboard data retrieved from cache');
    }

    // Create lightweight user object for performance (skip full user context)
    const lightweightUser = {
      id: user.userId,
      whopUserId: user.userId,
      experienceId: experienceId,
      email: '',
      name: 'User',
      credits: 0,
      accessLevel: 'customer' as const,
      experience: {
        id: experienceId,
        whopExperienceId: experienceId,
        whopCompanyId: '',
        name: 'Experience',
        description: undefined,
        logo: undefined
      }
    };

    // Fetch funnels and resources in parallel for better performance
    const [funnelsResult, resourcesResult] = await Promise.all([
      getFunnels(lightweightUser, page, limit, search),
      getResources(lightweightUser, page, limit, search)
    ]);

    const dashboardData = {
      funnels: funnelsResult,
      resources: resourcesResult,
      user: {
        id: lightweightUser.id,
        experienceId: lightweightUser.experienceId,
        accessLevel: lightweightUser.accessLevel
      }
    };

    // Cache the response
    dashboardCache.set(cacheKey, {
      data: dashboardData,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (dashboardCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of dashboardCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          dashboardCache.delete(key);
        }
      }
    }

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
