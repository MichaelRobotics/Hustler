import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/whop-auth';
import { getResources, createResource } from '../../../lib/actions/resource-actions';
import { getUserContext } from '../../../lib/context/user-context';

/**
 * Resources API Route
 * Handles CRUD operations for resources with proper authentication and authorization
 */

/**
 * GET /api/resources - List user's resources
 */
async function getResourcesHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || undefined;
    const type = url.searchParams.get('type') as 'AFFILIATE' | 'MY_PRODUCTS' | undefined;
    const category = url.searchParams.get('category') as 'PAID' | 'FREE_VALUE' | undefined;

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

    // Get resources using server action
    const result = await getResources(userContext.user, page, limit, search, type, category);

    return createSuccessResponse(result, 'Resources retrieved successfully');
  } catch (error) {
    console.error('Error getting resources:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * POST /api/resources - Create a new resource
 */
async function createResourceHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const input = await request.json();

    // Validation
    if (!input.name || !input.type || !input.category || !input.link) {
      return createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Name, type, category, and link are required'
      );
    }

    if (!['AFFILIATE', 'MY_PRODUCTS'].includes(input.type)) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Type must be either AFFILIATE or MY_PRODUCTS'
      );
    }

    if (!['PAID', 'FREE_VALUE'].includes(input.category)) {
      return createErrorResponse(
        'INVALID_INPUT',
        'Category must be either PAID or FREE_VALUE'
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

    // Create resource using server action
    const newResource = await createResource(userContext.user, input);

    return createSuccessResponse(newResource, 'Resource created successfully', 201);
  } catch (error) {
    console.error('Error creating resource:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const GET = withCustomerAuth(getResourcesHandler);
export const POST = withCustomerAuth(createResourceHandler);