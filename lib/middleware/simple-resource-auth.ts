import { NextRequest, NextResponse } from 'next/server';
import { db } from '../supabase/db';
import { funnels, resources, conversations } from '../supabase/schema';
import { eq, and } from 'drizzle-orm';
import { AuthenticatedUser, withAuth, createSuccessResponse, createErrorResponse } from './simple-auth';

/**
 * Simplified Resource Authorization
 * Handles resource-specific access control
 */

/**
 * Check if user owns or has access to a specific funnel
 */
export async function checkFunnelAccess(
  user: AuthenticatedUser,
  funnelId: string
): Promise<boolean> {
  try {
    const funnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.experienceId, user.experienceId)
      )
    });

    if (!funnel) return false;

    // Admin users can access all funnels in their company
    if (user.accessLevel === 'admin') return true;

    // Customer users can only access funnels they created
    return user.accessLevel === 'customer' && funnel.userId === user.id;
  } catch (error) {
    console.error('Error checking funnel access:', error);
    return false;
  }
}

/**
 * Check if user owns or has access to a specific resource
 */
export async function checkResourceAccess(
  user: AuthenticatedUser,
  resourceId: string
): Promise<boolean> {
  try {
    const resource = await db.query.resources.findFirst({
      where: and(
        eq(resources.id, resourceId),
        eq(resources.experienceId, user.experienceId)
      )
    });

    if (!resource) return false;

    // Admin users can access all resources in their company
    if (user.accessLevel === 'admin') return true;

    // Customer users can only access resources they created
    return user.accessLevel === 'customer' && resource.userId === user.id;
  } catch (error) {
    console.error('Error checking resource access:', error);
    return false;
  }
}

/**
 * Check if user has access to a specific conversation
 */
export async function checkConversationAccess(
  user: AuthenticatedUser,
  conversationId: string
): Promise<boolean> {
  try {
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, conversationId),
        eq(conversations.experienceId, user.experienceId)
      )
    });

    return !!conversation; // Both admin and customer can access conversations in their company
  } catch (error) {
    console.error('Error checking conversation access:', error);
    return false;
  }
}

/**
 * Extract resource ID from request
 */
function extractResourceId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('id') || 
         request.nextUrl.pathname.split('/').pop() ||
         null;
}

/**
 * Middleware for funnel access
 */
export function withFunnelAuth(handler: (request: NextRequest, context: any) => Promise<NextResponse>) {
  return withAuth(async (request, context) => {
    const funnelId = extractResourceId(request);
    if (!funnelId) {
      return NextResponse.json(
        { success: false, error: 'Funnel ID Required', message: 'Funnel ID is required' },
        { status: 400 }
      );
    }

    const hasAccess = await checkFunnelAccess(context.user, funnelId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access Denied', message: 'Insufficient permissions for this funnel' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}

/**
 * Middleware for resource access
 */
export function withResourceAuth(handler: (request: NextRequest, context: any) => Promise<NextResponse>) {
  return withAuth(async (request, context) => {
    const resourceId = extractResourceId(request);
    if (!resourceId) {
      return NextResponse.json(
        { success: false, error: 'Resource ID Required', message: 'Resource ID is required' },
        { status: 400 }
      );
    }

    const hasAccess = await checkResourceAccess(context.user, resourceId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access Denied', message: 'Insufficient permissions for this resource' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}

/**
 * Middleware for conversation access
 */
export function withConversationAuth(handler: (request: NextRequest, context: any) => Promise<NextResponse>) {
  return withAuth(async (request, context) => {
    const conversationId = extractResourceId(request);
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID Required', message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const hasAccess = await checkConversationAccess(context.user, conversationId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access Denied', message: 'Insufficient permissions for this conversation' },
        { status: 403 }
      );
    }

    return handler(request, context);
  });
}

// Export response functions
export { createSuccessResponse, createErrorResponse };
