import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/simple-auth';
import { whopProductSync } from '../../../../lib/sync/whop-product-sync';

/**
 * WHOP Products Sync API Route
 * Handles syncing WHOP products to resources with proper authentication and authorization
 */

/**
 * GET /api/resources/sync - Get sync status and available WHOP products
 */
async function getSyncStatusHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    
    // Get sync status
    const syncStatus = await whopProductSync.getSyncStatus(user.company.whopCompanyId);

    return createSuccessResponse(syncStatus, 'Sync status retrieved successfully');
  } catch (error) {
    console.error('Error getting sync status:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/resources/sync - Sync WHOP products to resources
 */
async function syncWhopProductsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const body = await request.json();
    
    const { forceUpdate = false, batchSize = 10, includeInactive = false } = body;

    // Sync WHOP products using the new sync system
    const syncResult = await whopProductSync.syncCompanyProducts(user, {
      forceUpdate,
      batchSize,
      includeInactive,
      onProgress: (progress, message) => {
        console.log(`Sync progress: ${progress}% - ${message}`);
      }
    });

    return createSuccessResponse(syncResult, 'WHOP products synced successfully');
  } catch (error) {
    console.error('Error syncing WHOP products:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const GET = withCustomerAuth(getSyncStatusHandler);
export const POST = withCustomerAuth(syncWhopProductsHandler);