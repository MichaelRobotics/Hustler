import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';
import { whopProductSync } from '../../../../lib/sync/whop-product-sync';
import { getUserContext } from '../../../../lib/context/user-context';

/**
 * Resource Sync API Route
 * Handles resource synchronization with Whop products
 */

/**
 * POST /api/resources/sync - Sync resources with Whop products
 */
async function syncResourcesHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    
    // Use experience ID from URL or fallback to a default
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV'; // Fallback for API routes

    // Get the full user context from the simplified auth (whopCompanyId is now optional)
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

    // Start sync process
    const syncResult = await whopProductSync.syncCompanyProducts(userContext.user);

    return createSuccessResponse(syncResult, 'Resource sync initiated successfully');
  } catch (error) {
    console.error('Error syncing resources:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * GET /api/resources/sync - Get sync status
 */
async function getSyncStatusHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    
    // Use experience ID from URL or fallback to a default
    const experienceId = user.experienceId || 'exp_wl5EtbHqAqLdjV'; // Fallback for API routes

    // Get the full user context from the simplified auth (whopCompanyId is now optional)
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

    // Get sync status
    const syncStatus = await whopProductSync.getSyncStatus(userContext.user.experience.whopCompanyId);

    return createSuccessResponse(syncStatus, 'Sync status retrieved successfully');
  } catch (error) {
    console.error('Error getting sync status:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const POST = withWhopAuth(syncResourcesHandler);
export const GET = withWhopAuth(getSyncStatusHandler);
