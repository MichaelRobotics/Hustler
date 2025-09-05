import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '../whop-sdk';
import { db } from '../supabase/db';
import { companies, users } from '../supabase/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedUser {
  id: string;
  whopUserId: string;
  companyId: string;
  email: string;
  name: string;
  avatar?: string;
  credits: number;
  accessLevel: 'admin' | 'customer' | 'no_access';
  company: {
    id: string;
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
 * WHOP Authentication Middleware
 * Verifies WHOP tokens and extracts user/company context
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthContext | null> {
  try {
    // Extract WHOP user token from headers
    const userToken = request.headers.get('whop-dev-user-token') || 
                     request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!userToken) {
      console.log('No WHOP user token found in request');
      return null;
    }

    // Development mode: Allow test token for testing
    if (process.env.NODE_ENV === 'development' && userToken === 'test-token') {
      console.log('Using test token for development');
      return await createTestUserContext();
    }

    // Verify the token with WHOP SDK
    const tokenData = await whopSdk.verifyUserToken(userToken);
    
    if (!tokenData || !tokenData.userId) {
      console.log('Invalid WHOP token or missing userId');
      return null;
    }

    const whopUserId = tokenData.userId;
    
    // Get company ID from environment or extract from user context
    const whopCompanyId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID;
    
    if (!whopCompanyId) {
      console.log('No company ID found in environment');
      return null;
    }

    // Get or create company in our database
    let company = await db.query.companies.findFirst({
      where: eq(companies.whopCompanyId, whopCompanyId)
    });

    if (!company) {
      // Create company in our database with basic info
      const [newCompany] = await db.insert(companies).values({
        whopCompanyId: whopCompanyId,
        name: 'Company', // Will be updated when we get more info
        description: null,
        logo: null
      }).returning();
      
      company = newCompany;
    }

    // Get or create user in our database
    let user = await db.query.users.findFirst({
      where: eq(users.whopUserId, whopUserId),
      with: {
        company: true
      }
    });

    if (!user) {
      // Fetch user data from WHOP API
      const whopUser = await whopSdk.users.getUser({ userId: whopUserId });
      
      if (!whopUser) {
        console.log('User not found in WHOP API');
        return null;
      }

      // Create user in our database
      const [newUser] = await db.insert(users).values({
        whopUserId: whopUser.id,
        companyId: company.id,
        email: '', // Email is not available in public profile
        name: whopUser.name || whopUser.username || 'Unknown User',
        avatar: whopUser.profilePicture?.sourceUrl || null,
        credits: 2 // Default credits for new users
      }).returning();
      
      // Fetch the user with company relation
      user = await db.query.users.findFirst({
        where: eq(users.id, newUser.id),
        with: {
          company: true
        }
      });
    } else {
      // Update user data if needed (sync with WHOP)
      const whopUser = await whopSdk.users.getUser({ userId: whopUserId });
      
      if (whopUser && (
        user.name !== (whopUser.name || whopUser.username) ||
        user.avatar !== (whopUser.profilePicture?.sourceUrl || null)
      )) {
        await db.update(users)
          .set({
            name: whopUser.name || whopUser.username || user.name,
            avatar: whopUser.profilePicture?.sourceUrl || user.avatar,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));
        
        // Update user object with new data
        user = {
          ...user,
          name: whopUser.name || whopUser.username || user.name,
          avatar: whopUser.profilePicture?.sourceUrl || user.avatar
        };
      }
    }

    // Determine access level
    const accessLevel = await determineAccessLevel(whopUserId, whopCompanyId);

    if (!user) {
      console.log('User not found after creation/update');
      return null;
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      whopUserId: user.whopUserId,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      avatar: user.avatar || undefined,
      credits: user.credits,
      accessLevel,
      company: {
        id: company.id,
        whopCompanyId: company.whopCompanyId,
        name: company.name,
        description: company.description || undefined,
        logo: company.logo || undefined
      }
    };

    return {
      user: authenticatedUser,
      isAuthenticated: true,
      hasAccess: accessLevel !== 'no_access'
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

  // Get or create test company
  let company = await db.query.companies.findFirst({
    where: eq(companies.whopCompanyId, whopCompanyId)
  });

  if (!company) {
    const [newCompany] = await db.insert(companies).values({
      whopCompanyId: whopCompanyId,
      name: 'Test Company',
      description: 'Test company for development',
      logo: null
    }).returning();
    company = newCompany;
  }

  // Get or create test user
  let user = await db.query.users.findFirst({
    where: eq(users.whopUserId, whopUserId),
    with: {
      company: true
    }
  });

  if (!user) {
    const [newUser] = await db.insert(users).values({
      whopUserId: whopUserId,
      companyId: company.id,
      email: 'test@example.com',
      name: 'Test User',
      avatar: null,
      credits: 10 // Give test user more credits
    }).returning();
    
    user = await db.query.users.findFirst({
      where: eq(users.id, newUser.id),
      with: {
        company: true
      }
    });
  }

  if (!user) {
    throw new Error('Failed to create test user');
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    whopUserId: user.whopUserId,
    companyId: user.companyId,
    email: user.email,
    name: user.name,
    avatar: user.avatar || undefined,
    credits: user.credits,
    accessLevel: 'customer', // Test user has customer access
    company: {
      id: company.id,
      whopCompanyId: company.whopCompanyId,
      name: company.name,
      description: company.description || undefined,
      logo: company.logo || undefined
    }
  };

  return {
    user: authenticatedUser,
    isAuthenticated: true,
    hasAccess: true
  };
}

/**
 * Determine user access level based on WHOP permissions
 */
async function determineAccessLevel(whopUserId: string, whopCompanyId: string): Promise<'admin' | 'customer' | 'no_access'> {
  try {
    // Check if user has access to the company
    const result = await whopSdk.access.checkIfUserHasAccessToCompany({
      userId: whopUserId,
      companyId: whopCompanyId
    });

    return result.accessLevel || 'no_access';
  } catch (error) {
    console.error('Error determining access level:', error);
    return 'no_access';
  }
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authContext = await authenticateRequest(request);
    
    if (!authContext || !authContext.isAuthenticated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication Required',
          message: 'Valid WHOP user token required' 
        },
        { status: 401 }
      );
    }

    if (!authContext.hasAccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access Denied',
          message: 'Insufficient permissions for this resource' 
        },
        { status: 403 }
      );
    }

    return handler(request, authContext);
  };
}

/**
 * Middleware wrapper for API routes that require admin access
 */
export function withAdminAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authContext = await authenticateRequest(request);
    
    if (!authContext || !authContext.isAuthenticated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication Required',
          message: 'Valid WHOP user token required' 
        },
        { status: 401 }
      );
    }

    if (authContext.user.accessLevel !== 'admin') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Admin Access Required',
          message: 'Admin permissions required for this resource' 
        },
        { status: 403 }
      );
    }

    return handler(request, authContext);
  };
}

/**
 * Middleware wrapper for API routes that require customer access or higher
 */
export function withCustomerAuth(handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authContext = await authenticateRequest(request);
    
    if (!authContext || !authContext.isAuthenticated) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication Required',
          message: 'Valid WHOP user token required' 
        },
        { status: 401 }
      );
    }

    if (authContext.user.accessLevel === 'no_access') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Access Denied',
          message: 'Customer or admin access required for this resource' 
        },
        { status: 403 }
      );
    }

    return handler(request, authContext);
  };
}
