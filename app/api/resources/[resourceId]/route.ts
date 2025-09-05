import { NextRequest, NextResponse } from 'next/server';
import { withResourceAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';
import { getResourceById, updateResource, deleteResource } from '../../../../lib/actions/resource-actions';
import { getUserContext } from '../../../../lib/context/user-context';

/**
 * Individual Resource API Route
 * Handles operations on specific resources with resource-level authorization
 */

/**
 * GET /api/resources/[resourceId] - Get specific resource
 */
async function getResourceHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const resourceId = request.nextUrl.pathname.split('/').pop();
    
    if (!resourceId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Resource ID is required'
      );
    }

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

    // Get resource using server action
    const resource = await getResourceById(userContext.user, resourceId);

    return createSuccessResponse(resource, 'Resource retrieved successfully');
  } catch (error) {
    console.error('Error getting resource:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * PUT /api/resources/[resourceId] - Update specific resource
 */
async function updateResourceHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const resourceId = request.nextUrl.pathname.split('/').pop();
    const input = await request.json();
    
    if (!resourceId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Resource ID is required'
      );
    }

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

    // Update resource using server action
    const updatedResource = await updateResource(userContext.user, resourceId, input);

    return createSuccessResponse(updatedResource, 'Resource updated successfully');
  } catch (error) {
    console.error('Error updating resource:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * DELETE /api/resources/[resourceId] - Delete specific resource
 */
async function deleteResourceHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const resourceId = request.nextUrl.pathname.split('/').pop();
    
    if (!resourceId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Resource ID is required'
      );
    }

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

    // Delete resource using server action
    await deleteResource(userContext.user, resourceId);

    return createSuccessResponse({ deleted: true }, 'Resource deleted successfully');
  } catch (error) {
    console.error('Error deleting resource:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers with resource protection
export const GET = withResourceAuth(getResourceHandler);
export const PUT = withResourceAuth(updateResourceHandler);
export const DELETE = withResourceAuth(deleteResourceHandler);
