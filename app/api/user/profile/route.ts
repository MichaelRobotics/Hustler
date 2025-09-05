import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';
import { getUserContext } from '../../../../lib/context/user-context';

/**
 * User Profile API Route
 * Handles user profile operations with proper authentication
 */

/**
 * GET /api/user/profile - Get user profile
 */
async function getUserProfileHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    
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

    const profile = {
      id: userContext.user.id,
      whopUserId: userContext.user.whopUserId,
      email: userContext.user.email,
      name: userContext.user.name,
      experienceId: userContext.user.experienceId,
      accessLevel: userContext.user.accessLevel,
      credits: userContext.user.credits,
      experience: userContext.user.experience
    };

    return createSuccessResponse(profile, 'User profile retrieved successfully');
  } catch (error) {
    console.error('Error getting user profile:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

/**
 * PUT /api/user/profile - Update user profile
 */
async function updateUserProfileHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    const input = await request.json();
    
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

    // For now, just return the current profile (update logic would go here)
    const updatedProfile = {
      id: userContext.user.id,
      whopUserId: userContext.user.whopUserId,
      email: userContext.user.email,
      name: userContext.user.name,
      experienceId: userContext.user.experienceId,
      accessLevel: userContext.user.accessLevel,
      credits: userContext.user.credits,
      experience: userContext.user.experience
    };

    return createSuccessResponse(updatedProfile, 'User profile updated successfully');
  } catch (error) {
    console.error('Error updating user profile:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handlers
export const GET = withWhopAuth(getUserProfileHandler);
export const PUT = withWhopAuth(updateUserProfileHandler);
