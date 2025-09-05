import { NextRequest, NextResponse } from 'next/server';
import { withResourceProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../lib/middleware';
import { getResourceById, updateResource, deleteResource } from '../../../../lib/actions/resource-actions';

/**
 * Individual Resource API Route
 * Handles operations on specific resources with resource-level authorization
 */

/**
 * GET /api/resources/[resourceId] - Get specific resource
 */
async function getResourceHandler(context: ProtectedRouteContext) {
  try {
    const resourceId = context.request.nextUrl.pathname.split('/').pop();
    
    if (!resourceId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Resource ID is required'
      );
    }

    // Get resource using server action
    const resource = await getResourceById(context.user, resourceId);

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
async function updateResourceHandler(context: ProtectedRouteContext) {
  try {
    const resourceId = context.request.nextUrl.pathname.split('/').pop();
    const input = await context.request.json();
    
    if (!resourceId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Resource ID is required'
      );
    }

    // Update resource using server action
    const updatedResource = await updateResource(context.user, resourceId, input);

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
async function deleteResourceHandler(context: ProtectedRouteContext) {
  try {
    const resourceId = context.request.nextUrl.pathname.split('/').pop();
    
    if (!resourceId) {
      return createErrorResponse(
        'MISSING_RESOURCE_ID',
        'Resource ID is required'
      );
    }

    // Delete resource using server action
    const deleted = await deleteResource(context.user, resourceId);

    return createSuccessResponse(
      { id: resourceId, deleted }, 
      'Resource deleted successfully'
    );
  } catch (error) {
    console.error('Error deleting resource:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers with resource protection
export const GET = withResourceProtection('resource', 'customer', getResourceHandler);
export const PUT = withResourceProtection('resource', 'customer', updateResourceHandler);
export const DELETE = withResourceProtection('resource', 'customer', deleteResourceHandler);