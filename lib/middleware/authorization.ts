import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '../whop-sdk';
import { db } from '../supabase/db';
import { funnels, resources, conversations } from '../supabase/schema';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedUser } from './auth';

export interface AuthorizationContext {
  user: AuthenticatedUser;
  hasAccess: boolean;
  reason?: string;
}

/**
 * Authorization Patterns for WHOP App
 * Handles different levels of access control and resource ownership validation
 */

/**
 * Check if user has access to a specific experience
 */
export async function checkExperienceAccess(
  userId: string,
  experienceId: string
): Promise<AuthorizationContext> {
  try {
    const result = await whopSdk.access.checkIfUserHasAccessToExperience({
      userId,
      experienceId,
    });

    const hasAccess = result.accessLevel === 'admin' || result.accessLevel === 'customer';
    
    return {
      user: {} as AuthenticatedUser, // Will be populated by caller
      hasAccess,
      reason: hasAccess ? undefined : `Access level: ${result.accessLevel}`
    };
  } catch (error) {
    console.error('Error checking experience access:', error);
    return {
      user: {} as AuthenticatedUser,
      hasAccess: false,
      reason: 'Failed to verify experience access'
    };
  }
}

/**
 * Check if user has access to a specific company
 */
export async function checkCompanyAccess(
  userId: string,
  companyId: string,
  requiredLevel: 'admin' | 'customer' = 'customer'
): Promise<AuthorizationContext> {
  try {
    const result = await whopSdk.access.checkIfUserHasAccessToCompany({
      userId,
      companyId
    });

    const hasAccess = result.hasAccess && 
      (requiredLevel === 'customer' || result.accessLevel === 'admin');
    
    return {
      user: {} as AuthenticatedUser, // Will be populated by caller
      hasAccess,
      reason: hasAccess ? undefined : `Insufficient access level for company`
    };
  } catch (error) {
    console.error('Error checking company access:', error);
    return {
      user: {} as AuthenticatedUser,
      hasAccess: false,
      reason: 'Failed to verify company access'
    };
  }
}

/**
 * Check if user owns or has access to a specific funnel
 */
export async function checkFunnelAccess(
  user: AuthenticatedUser,
  funnelId: string,
  requiredLevel: 'admin' | 'customer' = 'customer'
): Promise<AuthorizationContext> {
  try {
    // Check if funnel exists and belongs to user's company
    const funnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.companyId, user.companyId)
      )
    });

    if (!funnel) {
      return {
        user,
        hasAccess: false,
        reason: 'Funnel not found or access denied'
      };
    }

    // Admin users can access all funnels in their company
    if (user.accessLevel === 'admin') {
      return {
        user,
        hasAccess: true
      };
    }

    // Customer users can only access funnels they created
    if (user.accessLevel === 'customer' && funnel.userId === user.id) {
      return {
        user,
        hasAccess: true
      };
    }

    return {
      user,
      hasAccess: false,
      reason: 'Insufficient permissions for this funnel'
    };
  } catch (error) {
    console.error('Error checking funnel access:', error);
    return {
      user,
      hasAccess: false,
      reason: 'Failed to verify funnel access'
    };
  }
}

/**
 * Check if user owns or has access to a specific resource
 */
export async function checkResourceAccess(
  user: AuthenticatedUser,
  resourceId: string,
  requiredLevel: 'admin' | 'customer' = 'customer'
): Promise<AuthorizationContext> {
  try {
    // Check if resource exists and belongs to user's company
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, resourceId),
        eq(resources.companyId, user.companyId)
      )
    });

    if (!resource) {
      return {
        user,
        hasAccess: false,
        reason: 'Resource not found or access denied'
      };
    }

    // Admin users can access all resources in their company
    if (user.accessLevel === 'admin') {
      return {
        user,
        hasAccess: true
      };
    }

    // Customer users can only access resources they created
    if (user.accessLevel === 'customer' && resource.userId === user.id) {
      return {
        user,
        hasAccess: true
      };
    }

    return {
      user,
      hasAccess: false,
      reason: 'Insufficient permissions for this resource'
    };
  } catch (error) {
    console.error('Error checking resource access:', error);
    return {
      user,
      hasAccess: false,
      reason: 'Failed to verify resource access'
    };
  }
}

/**
 * Check if user has access to a specific conversation
 */
export async function checkConversationAccess(
  user: AuthenticatedUser,
  conversationId: string
): Promise<AuthorizationContext> {
  try {
    // Check if conversation exists and belongs to user's company
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.companyId, user.companyId)
      )
    });

    if (!conversation) {
      return {
        user,
        hasAccess: false,
        reason: 'Conversation not found or access denied'
      };
    }

    // Both admin and customer users can access conversations in their company
    return {
      user,
      hasAccess: true
    };
  } catch (error) {
    console.error('Error checking conversation access:', error);
    return {
      user,
      hasAccess: false,
      reason: 'Failed to verify conversation access'
    };
  }
}

/**
 * Check if user has sufficient credits for an operation
 */
export async function checkCreditsAccess(
  user: AuthenticatedUser,
  requiredCredits: number = 1
): Promise<AuthorizationContext> {
  try {
    const hasAccess = user.credits >= requiredCredits;
    
    return {
      user,
      hasAccess,
      reason: hasAccess ? undefined : `Insufficient credits. Required: ${requiredCredits}, Available: ${user.credits}`
    };
  } catch (error) {
    console.error('Error checking credits access:', error);
    return {
      user,
      hasAccess: false,
      reason: 'Failed to verify credits'
    };
  }
}

/**
 * Middleware wrapper for API routes that require specific resource access
 */
export function withResourceAccess(
  resourceType: 'funnel' | 'resource' | 'conversation',
  requiredLevel: 'admin' | 'customer' = 'customer'
) {
  return function(handler: (request: NextRequest, context: AuthorizationContext) => Promise<NextResponse>) {
    return async (request: NextRequest, context: { user: AuthenticatedUser }): Promise<NextResponse> => {
      const resourceId = request.nextUrl.searchParams.get('id') || 
                        request.nextUrl.pathname.split('/').pop() ||
                        (await request.json()).id;

      if (!resourceId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Resource ID Required',
            message: 'Resource ID is required for this operation' 
          },
          { status: 400 }
        );
      }

      let authContext: AuthorizationContext;

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
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid Resource Type',
              message: 'Invalid resource type specified' 
            },
            { status: 400 }
          );
      }

      if (!authContext.hasAccess) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Access Denied',
            message: authContext.reason || 'Insufficient permissions for this resource' 
          },
          { status: 403 }
        );
      }

      return handler(request, authContext);
    };
  };
}

/**
 * Middleware wrapper for API routes that require credits
 */
export function withCreditsAccess(requiredCredits: number = 1) {
  return function(handler: (request: NextRequest, context: AuthorizationContext) => Promise<NextResponse>) {
    return async (request: NextRequest, context: { user: AuthenticatedUser }): Promise<NextResponse> => {
      const authContext = await checkCreditsAccess(context.user, requiredCredits);

      if (!authContext.hasAccess) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient Credits',
            message: authContext.reason || 'Not enough credits for this operation' 
          },
          { status: 402 }
        );
      }

      return handler(request, authContext);
    };
  };
}

/**
 * Middleware wrapper for API routes that require experience access
 */
export function withExperienceAccess(handler: (request: NextRequest, context: AuthorizationContext) => Promise<NextResponse>) {
  return async (request: NextRequest, context: { user: AuthenticatedUser }): Promise<NextResponse> => {
    const experienceId = request.nextUrl.searchParams.get('experienceId') || 
                        request.nextUrl.pathname.split('/')[2];

    if (!experienceId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Experience ID Required',
          message: 'Experience ID is required for this operation' 
        },
        { status: 400 }
      );
    }

    const authContext = await checkExperienceAccess(context.user.whopUserId, experienceId);

    if (!authContext.hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access Denied',
          message: authContext.reason || 'Insufficient permissions for this experience' 
        },
        { status: 403 }
      );
    }

    return handler(request, authContext);
  };
}
