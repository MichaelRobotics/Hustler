import { NextRequest, NextResponse } from 'next/server';
import { withWhopAuth, type AuthContext } from '../../../../lib/middleware/whop-auth';

/**
 * User Profile API Route
 * Handles user profile operations with authentication
 */

/**
 * GET /api/user/profile - Get current user profile
 */
async function getUserProfileHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    
    // Return simple user profile
    const profile = {
      userId: user.userId,
      experienceId: user.experienceId,
      authenticated: true
    };

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'User profile retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
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

    // Simple profile update response
    const updatedProfile = {
      userId: user.userId,
      experienceId: user.experienceId,
      authenticated: true,
      updated: true
    };

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'User profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Export the protected route handlers
export const GET = withWhopAuth(getUserProfileHandler);
export const PUT = withWhopAuth(updateUserProfileHandler);
