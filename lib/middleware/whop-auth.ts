import { headers } from "next/headers";
import { validateToken } from "@whop-apps/sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Simple WHOP Authentication using validateToken from @whop-apps/sdk
 * Based on WHOP documentation examples
 */

export interface WhopUser {
  userId: string;
  experienceId?: string;
}

export interface AuthContext {
  user: WhopUser;
  isAuthenticated: boolean;
}

/**
 * Simple WHOP authentication using validateToken
 */
export async function authenticateWhopUser(request?: NextRequest): Promise<AuthContext | null> {
  try {
    const headersList = await headers();
    const { userId } = await validateToken({ headers: headersList });
    
    if (!userId) {
      console.log('No valid WHOP user token found');
      return null;
    }

    // Extract experienceId from request URL if available
    let experienceId: string | undefined;
    if (request) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const experienceIndex = pathParts.indexOf('experiences');
      experienceId = (experienceIndex !== -1 && pathParts[experienceIndex + 1]) ? pathParts[experienceIndex + 1] : undefined;
    }

    return {
      user: { userId, experienceId },
      isAuthenticated: true
    };
  } catch (error) {
    console.error('WHOP authentication error:', error);
    return null;
  }
}

/**
 * Middleware wrapper for WHOP authenticated routes
 */
export function withWhopAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authContext = await authenticateWhopUser(request);
    
    if (!authContext?.isAuthenticated) {
      return NextResponse.json(
        { error: "Valid WHOP user token required" },
        { status: 401 }
      );
    }

    return handler(request, authContext);
  };
}

/**
 * Get user ID from WHOP token (for use in API routes)
 */
export async function getWhopUserId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const { userId } = await validateToken({ headers: headersList });
    return userId || null;
  } catch (error) {
    console.error('Error getting WHOP user ID:', error);
    return null;
  }
}

/**
 * Simple resource auth functions for backward compatibility
 * These are simplified versions that just use WHOP auth
 */
export function withFunnelAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return withWhopAuth(handler);
}

export function withResourceAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return withWhopAuth(handler);
}

export function withConversationAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return withWhopAuth(handler);
}

/**
 * Simple response helpers for backward compatibility
 */
export function createSuccessResponse<T>(data: T, message?: string, status: number = 200) {
  return NextResponse.json(
    { success: true, data, message },
    { status }
  );
}

export function createErrorResponse(error: string, message: string, status: number = 500) {
  return NextResponse.json(
    { success: false, error, message },
    { status }
  );
}
