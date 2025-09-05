import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '../whop-sdk';
import { getUserContext } from '../context/user-context';
import { AuthenticatedUser, AuthContext } from './auth';
import { AuthorizationContext } from './authorization';

/**
 * API Route Protection Middleware
 * Provides standardized protection for API routes with automatic authentication injection
 */

export interface ProtectedRouteContext {
  auth: AuthContext;
  request: NextRequest;
  user: AuthenticatedUser;
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
      code,
      details
    },
    { status }
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message
    },
    { status }
  );
}

/**
 * Extract WHOP user token from request headers
 */
export function extractWhopToken(request: NextRequest): string | null {
  // Try different header formats (prioritize x-whop-user-token for iframe apps)
  const userToken = request.headers.get('x-whop-user-token') ||
                   request.headers.get('whop-dev-user-token') || 
                   request.headers.get('authorization')?.replace('Bearer ', '') ||
                   request.headers.get('whop-user-token');
  
  return userToken;
}

/**
 * Extract company ID from request headers or query params
 */
export function extractCompanyId(request: NextRequest): string | null {
  const companyId = request.headers.get('x-whop-company-id') ||
                   request.nextUrl.searchParams.get('companyId') ||
                   request.nextUrl.searchParams.get('company_id');
  
  return companyId;
}

/**
 * Extract experience ID from request headers or query params
 */
export function extractExperienceId(request: NextRequest): string | null {
  const experienceId = request.headers.get('x-whop-experience-id') ||
                      request.nextUrl.searchParams.get('experienceId') ||
                      request.nextUrl.searchParams.get('experience_id');
  
  return experienceId;
}

/**
 * Base middleware for protected routes
 */
export function withRouteProtection(
  handler: (context: ProtectedRouteContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Extract WHOP token
      const userToken = extractWhopToken(request);
      
      if (!userToken) {
        return createErrorResponse(
          'Authentication Required',
          'WHOP user token is required',
          401,
          'MISSING_TOKEN'
        );
      }

      // Development mode: Allow test token for testing
      let tokenData: any;
      if (process.env.NODE_ENV === 'development' && userToken === 'test-token') {
        console.log('Using test token for development in route protection');
        tokenData = { userId: 'test-user-id' };
      } else {
        // Verify token with WHOP SDK (pass headers object, not just token)
        tokenData = await whopSdk.verifyUserToken(request.headers);
        
        if (!tokenData || !tokenData.userId) {
          return createErrorResponse(
            'Invalid Token',
            'Invalid or expired WHOP user token',
            401,
            'INVALID_TOKEN'
          );
        }
      }

          const whopUserId = tokenData.userId;
    const whopCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

      if (!whopCompanyId) {
        return createErrorResponse(
          'Company Required',
          'Company ID is required for this operation',
          400,
          'MISSING_COMPANY'
        );
      }

      // Get user context with caching
      const userContext = await getUserContext(whopUserId, whopCompanyId);
      
      if (!userContext || !userContext.isAuthenticated) {
        return createErrorResponse(
          'Authentication Failed',
          'Failed to authenticate user or create user context',
          401,
          'AUTH_FAILED'
        );
      }

      // Create protected route context
      const context: ProtectedRouteContext = {
        auth: {
          user: userContext.user,
          isAuthenticated: true,
          hasAccess: userContext.user.accessLevel !== 'no_access'
        },
        request,
        user: userContext.user
      };

      // Check if user has any access
      if (!context.auth.hasAccess) {
        return createErrorResponse(
          'Access Denied',
          'User does not have access to this company',
          403,
          'NO_ACCESS'
        );
      }

      // Call the protected handler
      return await handler(context);

    } catch (error) {
      console.error('Route protection error:', error);
      
      if (error instanceof Error) {
        return createErrorResponse(
          'Internal Server Error',
          'An unexpected error occurred',
          500,
          'INTERNAL_ERROR',
          { message: error.message }
        );
      }
      
      return createErrorResponse(
        'Internal Server Error',
        'An unexpected error occurred',
        500,
        'INTERNAL_ERROR'
      );
    }
  };
}

/**
 * Middleware for admin-only routes
 */
export function withAdminProtection(
  handler: (context: ProtectedRouteContext) => Promise<NextResponse>
) {
  return withRouteProtection(async (context) => {
    if (context.user.accessLevel !== 'admin') {
      return createErrorResponse(
        'Admin Access Required',
        'Admin permissions are required for this operation',
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    return await handler(context);
  });
}

/**
 * Middleware for customer or admin routes
 */
export function withCustomerProtection(
  handler: (context: ProtectedRouteContext) => Promise<NextResponse>
) {
  return withRouteProtection(async (context) => {
    if (context.user.accessLevel === 'no_access') {
      return createErrorResponse(
        'Access Denied',
        'Customer or admin access is required for this operation',
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    return await handler(context);
  });
}

/**
 * Middleware for routes that require credits
 */
export function withCreditsProtection(
  requiredCredits: number = 1,
  handler: (context: ProtectedRouteContext) => Promise<NextResponse>
) {
  return withRouteProtection(async (context) => {
    if (context.user.credits < requiredCredits) {
      return createErrorResponse(
        'Insufficient Credits',
        `This operation requires ${requiredCredits} credits. You have ${context.user.credits} credits.`,
        402,
        'INSUFFICIENT_CREDITS',
        {
          required: requiredCredits,
          available: context.user.credits
        }
      );
    }

    return await handler(context);
  });
}

/**
 * Middleware for routes that require experience access
 */
export function withExperienceProtection(
  handler: (context: ProtectedRouteContext) => Promise<NextResponse>
) {
  return withRouteProtection(async (context) => {
    const experienceId = extractExperienceId(context.request);
    
    if (!experienceId) {
      return createErrorResponse(
        'Experience ID Required',
        'Experience ID is required for this operation',
        400,
        'MISSING_EXPERIENCE_ID'
      );
    }

    try {
      const result = await whopSdk.access.checkIfUserHasAccessToExperience({
        userId: context.user.whopUserId,
        experienceId,
      });

      if (result.accessLevel === 'no_access') {
        return createErrorResponse(
          'Experience Access Denied',
          'You do not have access to this experience',
          403,
          'NO_EXPERIENCE_ACCESS'
        );
      }

      return await handler(context);
    } catch (error) {
      console.error('Experience access check error:', error);
      return createErrorResponse(
        'Access Check Failed',
        'Failed to verify experience access',
        500,
        'ACCESS_CHECK_FAILED'
      );
    }
  });
}

/**
 * Middleware for routes that require specific resource access
 */
export function withResourceProtection(
  resourceType: 'funnel' | 'resource' | 'conversation',
  requiredLevel: 'admin' | 'customer' = 'customer',
  handler: (context: ProtectedRouteContext) => Promise<NextResponse>
) {
  return withRouteProtection(async (context) => {
    const resourceId = context.request.nextUrl.searchParams.get('id') || 
                      context.request.nextUrl.pathname.split('/').pop();

    if (!resourceId) {
      return createErrorResponse(
        'Resource ID Required',
        'Resource ID is required for this operation',
        400,
        'MISSING_RESOURCE_ID'
      );
    }

    // Import authorization functions dynamically to avoid circular imports
    const { checkFunnelAccess, checkResourceAccess, checkConversationAccess } = 
      await import('./authorization');

    let authContext: AuthorizationContext;

    try {
      switch (resourceType) {
        case 'funnel':
          authContext = await checkFunnelAccess(context.user, resourceId, requiredLevel);
          break;
        case 'resource':
          authContext = await checkResourceAccess(context.user, resourceId, requiredLevel);
          break;
        case 'conversation':
          authContext = await checkConversationAccess(context.user, resourceId);
          break;
        default:
          return createErrorResponse(
            'Invalid Resource Type',
            'Invalid resource type specified',
            400,
            'INVALID_RESOURCE_TYPE'
          );
      }

      if (!authContext.hasAccess) {
        return createErrorResponse(
          'Resource Access Denied',
          authContext.reason || 'Insufficient permissions for this resource',
          403,
          'NO_RESOURCE_ACCESS'
        );
      }

      return await handler(context);
    } catch (error) {
      console.error('Resource access check error:', error);
      return createErrorResponse(
        'Access Check Failed',
        'Failed to verify resource access',
        500,
        'ACCESS_CHECK_FAILED'
      );
    }
  });
}

/**
 * Utility function to get user from request (for non-protected routes that need user info)
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const userToken = extractWhopToken(request);
    
    if (!userToken) {
      return null;
    }

    const tokenData = await whopSdk.verifyUserToken(userToken);
    
    if (!tokenData || !tokenData.userId) {
      return null;
    }

    const whopCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    if (!whopCompanyId) {
      return null;
    }

    const userContext = await getUserContext(tokenData.userId, whopCompanyId);
    
    return userContext?.user || null;
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}
