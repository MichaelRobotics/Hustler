import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '../whop-sdk';
import { getUserContext } from '../context/user-context';

/**
 * Simplified WHOP Authentication Middleware
 * Single source of truth for authentication and authorization
 */

export interface AuthenticatedUser {
  id: string;
  whopUserId: string;
  experienceId: string; // Experience-based scoping
  email: string;
  name: string;
  avatar?: string;
  credits: number;
  accessLevel: 'admin' | 'customer' | 'no_access';
  experience: {
    id: string;
    whopExperienceId: string;
    whopCompanyId: string;
    name: string;
    description?: string;
    logo?: string;
  };
}

export interface AuthContext {
  user: AuthenticatedUser;
  isAuthenticated: boolean;
  hasAccess: boolean;
}

/**
 * Extract WHOP user token from request headers
 */
function extractWhopToken(request: NextRequest): string | null {
  return request.headers.get('x-whop-user-token') ||
         request.headers.get('whop-dev-user-token') || 
         request.headers.get('authorization')?.replace('Bearer ', '') ||
         null;
}

/**
 * Extract company ID from request headers or environment
 */
function extractCompanyId(request: NextRequest): string | null {
  return request.headers.get('x-whop-company-id') ||
         request.headers.get('whop-company-id') ||
         process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ||
         null;
}

/**
 * Extract experience ID from request headers or URL
 */
function extractExperienceId(request: NextRequest): string | null {
  // Try different header variations
  const experienceId = request.headers.get('x-whop-experience-id') ||
                      request.headers.get('whop-experience-id') ||
                      request.headers.get('experience-id');
  
  // If not in headers, try to extract from URL path
  if (!experienceId) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const experienceIndex = pathParts.indexOf('experiences');
    if (experienceIndex !== -1 && pathParts[experienceIndex + 1]) {
      return pathParts[experienceIndex + 1];
    }
  }
  
  return experienceId;
}

/**
 * Authenticate request and return user context
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthContext | null> {
  try {
    // Extract token
    const userToken = extractWhopToken(request);
    if (!userToken) {
      console.log('No WHOP user token found');
      return null;
    }

    // Development mode: Allow test token
    if (process.env.NODE_ENV === 'development' && userToken === 'test-token') {
      console.log('Using test token for development');
      return await createTestUserContext();
    }

    // Verify token with WHOP SDK
    const tokenData = await whopSdk.verifyUserToken(request.headers);
    if (!tokenData?.userId) {
      console.log('Invalid WHOP token');
      return null;
    }

    // Get company ID
    const whopCompanyId = extractCompanyId(request);
    if (!whopCompanyId) {
      console.log('No company ID found');
      return null;
    }

    // Get experience ID
    const whopExperienceId = extractExperienceId(request);
    if (!whopExperienceId) {
      console.log('No experience ID found');
      return null;
    }

    // Validate company access
    const companyAccess = await whopSdk.access.checkIfUserHasAccessToCompany({
      companyId: whopCompanyId,
      userId: tokenData.userId
    });

    if (!companyAccess.hasAccess) {
      console.log(`User ${tokenData.userId} does not have access to company ${whopCompanyId}`);
      return null;
    }

    // Get user context
    const userContext = await getUserContext(tokenData.userId, whopCompanyId, whopExperienceId);
    if (!userContext?.isAuthenticated) {
      console.log('Failed to get user context');
      return null;
    }

    return {
      user: userContext.user,
      isAuthenticated: true,
      hasAccess: userContext.user.accessLevel !== 'no_access'
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Create test user context for development
 */
async function createTestUserContext(): Promise<AuthContext> {
  const whopCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  const whopUserId = 'test-user-id';
  
  if (!whopCompanyId) {
    throw new Error('Company ID not found in environment');
  }

  const userContext = await getUserContext(whopUserId, whopCompanyId, 'test-experience-id');
  if (!userContext?.isAuthenticated) {
    throw new Error('Failed to create test user context');
  }

  return {
    user: userContext.user,
    isAuthenticated: true,
    hasAccess: true
  };
}

/**
 * Standard error response
 */
export function createErrorResponse(error: string, message: string, status: number = 500) {
  return NextResponse.json(
    { success: false, error, message },
    { status }
  );
}

/**
 * Standard success response
 */
export function createSuccessResponse<T>(data: T, message?: string, status: number = 200) {
  return NextResponse.json(
    { success: true, data, message },
    { status }
  );
}

/**
 * Base middleware for protected routes
 */
export function withAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authContext = await authenticateRequest(request);
    
    if (!authContext?.isAuthenticated) {
      return createErrorResponse('Authentication Required', 'Valid WHOP user token required', 401);
    }

    if (!authContext.hasAccess) {
      return createErrorResponse('Access Denied', 'Insufficient permissions', 403);
    }

    return handler(request, authContext);
  };
}

/**
 * Middleware for admin-only routes
 */
export function withAdminAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return withAuth(async (request, context) => {
    if (context.user.accessLevel !== 'admin') {
      return createErrorResponse('Admin Access Required', 'Admin permissions required', 403);
    }
    return handler(request, context);
  });
}

/**
 * Middleware for customer or admin routes
 */
export function withCustomerAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return withAuth(async (request, context) => {
    if (context.user.accessLevel === 'no_access') {
      return createErrorResponse('Access Denied', 'Customer or admin access required', 403);
    }
    return handler(request, context);
  });
}

/**
 * Middleware for routes that require credits
 */
export function withCreditsAuth(requiredCredits: number = 1) {
  return function(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
    return withAuth(async (request, context) => {
      if (context.user.credits < requiredCredits) {
        return createErrorResponse(
          'Insufficient Credits',
          `This operation requires ${requiredCredits} credits. You have ${context.user.credits} credits.`,
          402
        );
      }
      return handler(request, context);
    });
  };
}
