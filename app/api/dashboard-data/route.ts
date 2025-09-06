import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/whop-auth';
import { getFunnels } from '../../../lib/actions/funnel-actions';
import { getResources } from '../../../lib/actions/resource-actions';
import { db } from '../../../lib/supabase/db';
import { users, experiences } from '../../../lib/supabase/schema';
import { eq, and } from 'drizzle-orm';

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
    const whopExperienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV';

    // Check cache first
    const cacheKey = `${user.userId}:${whopExperienceId}:${page}:${limit}:${search || ''}`;
    const cached = dashboardCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return createSuccessResponse(cached.data, 'Dashboard data retrieved from cache');
    }

    // First get the experience UUID from the WHOP experience ID
    const experience = await db.query.experiences.findFirst({
      where: eq(experiences.whopExperienceId, whopExperienceId),
      columns: { id: true }
    });

    if (!experience) {
      return createErrorResponse(
        'EXPERIENCE_NOT_FOUND',
        'Experience not found in database'
      );
    }

    // Get the database user ID efficiently without full user context
    const dbUser = await db.query.users.findFirst({
      where: and(
        eq(users.whopUserId, user.userId),
        eq(users.experienceId, experience.id)
      ),
      columns: {
        id: true,
        whopUserId: true,
        experienceId: true,
        email: true,
        name: true,
        credits: true
      }
    });

    if (!dbUser) {
      return createErrorResponse(
        'USER_NOT_FOUND',
        'User not found in database'
      );
    }

    // Create lightweight authenticated user with correct database ID
    const authenticatedUser = {
      id: dbUser.id, // This is the correct database UUID
      whopUserId: dbUser.whopUserId,
      experienceId: dbUser.experienceId,
      email: dbUser.email,
      name: dbUser.name,
      credits: dbUser.credits,
      accessLevel: 'customer' as const,
      experience: {
        id: dbUser.experienceId,
        whopExperienceId: whopExperienceId,
        whopCompanyId: '',
        name: 'Experience',
        description: undefined,
        logo: undefined
      }
    };

    // Fetch funnels and resources in parallel for better performance
    const [funnelsResult, resourcesResult] = await Promise.all([
      getFunnels(authenticatedUser, page, limit, search),
      getResources(authenticatedUser, page, limit, search)
    ]);

    const dashboardData = {
      funnels: funnelsResult,
      resources: resourcesResult,
      user: {
        id: authenticatedUser.id,
        experienceId: authenticatedUser.experienceId,
        accessLevel: authenticatedUser.accessLevel
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
