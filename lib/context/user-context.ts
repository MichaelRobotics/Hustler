import { whopSdk } from '../whop-sdk';
import { db } from '../supabase/db';
import { companies, users } from '../supabase/schema';
import { eq } from 'drizzle-orm';
import { AuthenticatedUser } from '../middleware/simple-auth';

/**
 * User Context Management
 * Handles user data extraction, caching, and automatic synchronization with WHOP
 */

export interface UserContext {
  user: AuthenticatedUser;
  isAuthenticated: boolean;
  lastSync: Date;
  cacheExpiry: Date;
}

// In-memory cache for user contexts (in production, consider using Redis)
const userContextCache = new Map<string, UserContext>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get or create user context with automatic sync
 */
export async function getUserContext(
  whopUserId: string,
  whopCompanyId: string,
  forceRefresh: boolean = false,
  accessLevel?: 'admin' | 'customer' | 'no_access'
): Promise<UserContext | null> {
  const cacheKey = `${whopUserId}:${whopCompanyId}`;
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = userContextCache.get(cacheKey);
    if (cached && cached.cacheExpiry > new Date()) {
      return cached;
    }
  }

  try {
    // Fetch fresh user data
    const userContext = await createUserContext(whopUserId, whopCompanyId, accessLevel);
    
    if (userContext) {
      // Cache the result
      userContextCache.set(cacheKey, userContext);
      
      // Clean up expired cache entries
      cleanupExpiredCache();
    }
    
    return userContext;
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

/**
 * Create fresh user context with WHOP sync
 */
async function createUserContext(
  whopUserId: string,
  whopCompanyId: string,
  accessLevel?: 'admin' | 'customer' | 'no_access'
): Promise<UserContext | null> {
  try {
    // Get or create company
    console.log('Looking for company with whopCompanyId:', whopCompanyId);
    let company = await db.query.companies.findFirst({
      where: eq(companies.whopCompanyId, whopCompanyId)
    });

    if (!company) {
      console.log('Company not found, creating new company...');
      // Create company in our database with basic info
      const [newCompany] = await db.insert(companies).values({
        whopCompanyId: whopCompanyId,
        name: 'Company', // Will be updated when we get more info
        description: null,
        logo: null
      }).returning();
      
      console.log('New company created:', newCompany);
      company = newCompany;
    } else {
      console.log('Existing company found:', company);
    }

    // Get or create user
    let user = await db.query.users.findFirst({
      where: eq(users.whopUserId, whopUserId),
      with: {
        company: true
      }
    });

    if (!user) {
      // Handle test user for development
      if (process.env.NODE_ENV === 'development' && whopUserId === 'test-user-id') {
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
      } else {
        // Fetch user data from WHOP API
        const whopUser = await whopSdk.users.getUser({ userId: whopUserId });
        
        if (!whopUser) {
          console.error('User not found in WHOP API:', whopUserId);
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
      }
    } else {
      // Sync user data with WHOP
      await syncUserData(user);
    }

    // Determine access level (use provided level if available, otherwise determine from WHOP)
    const finalAccessLevel = accessLevel || await determineAccessLevel(whopUserId, whopCompanyId);

    if (!user) {
      console.error('User not found after creation/update');
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
      accessLevel: finalAccessLevel,
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
      lastSync: new Date(),
      cacheExpiry: new Date(Date.now() + CACHE_DURATION)
    };

  } catch (error) {
    console.error('Error creating user context:', error);
    return null;
  }
}

/**
 * Sync company data with WHOP API
 */
async function syncCompanyData(company: any): Promise<void> {
  // Company sync is not needed for now since we're using environment variable
  // In the future, you might want to fetch company details from WHOP API
}

/**
 * Sync user data with WHOP API
 */
async function syncUserData(user: any): Promise<void> {
  try {
    const whopUser = await whopSdk.users.getUser({ userId: user.whopUserId });
    
    if (whopUser && user && (
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
    }
  } catch (error) {
    console.error('Error syncing user data:', error);
  }
}

/**
 * Determine user access level based on WHOP permissions
 */
async function determineAccessLevel(whopUserId: string, whopCompanyId: string): Promise<'admin' | 'customer' | 'no_access'> {
  try {
    console.log('Determining access level for:', { whopUserId, whopCompanyId });
    
    // Handle test user for development
    if (process.env.NODE_ENV === 'development' && whopUserId === 'test-user-id') {
      console.log('Using test user access level: customer');
      return 'customer';
    }

    // Check if user has access to the company
    console.log('Checking WHOP access for user to company...');
    const result = await whopSdk.access.checkIfUserHasAccessToCompany({
      userId: whopUserId,
      companyId: whopCompanyId
    });

    console.log('WHOP access check result:', result);
    const accessLevel = result.accessLevel || 'no_access';
    console.log('Final access level:', accessLevel);
    
    return accessLevel;
  } catch (error) {
    console.error('Error determining access level:', error);
    return 'no_access';
  }
}

/**
 * Update user credits in context and database
 */
export async function updateUserCredits(
  whopUserId: string,
  creditChange: number,
  operation: 'add' | 'subtract' = 'subtract'
): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.whopUserId, whopUserId)
    });

    if (!user) {
      console.error('User not found for credit update:', whopUserId);
      return false;
    }

    const newCredits = operation === 'add' 
      ? user.credits + creditChange 
      : Math.max(0, user.credits - creditChange);

    await db.update(users)
      .set({
        credits: newCredits,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // Invalidate cache for this user
    invalidateUserCache(whopUserId);

    return true;
  } catch (error) {
    console.error('Error updating user credits:', error);
    return false;
  }
}

/**
 * Get user credits from context or database
 */
export async function getUserCredits(whopUserId: string): Promise<number> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.whopUserId, whopUserId)
    });

    return user?.credits || 0;
  } catch (error) {
    console.error('Error getting user credits:', error);
    return 0;
  }
}

/**
 * Invalidate user cache
 */
export function invalidateUserCache(whopUserId: string): void {
  const keysToDelete: string[] = [];
  
  for (const [key, context] of userContextCache.entries()) {
    if (context.user.whopUserId === whopUserId) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => userContextCache.delete(key));
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache(): void {
  const now = new Date();
  
  for (const [key, context] of userContextCache.entries()) {
    if (context.cacheExpiry <= now) {
      userContextCache.delete(key);
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: userContextCache.size,
    entries: Array.from(userContextCache.keys())
  };
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  userContextCache.clear();
}
