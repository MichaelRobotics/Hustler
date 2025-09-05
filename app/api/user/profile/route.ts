import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/simple-auth';

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
    
    // Return user profile with company information
    const profile = {
      id: user.id,
      whopUserId: user.whopUserId,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      credits: user.credits,
      accessLevel: user.accessLevel,
      experience: user.experience,
      createdAt: new Date().toISOString() // You might want to add this to the schema
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
    const { name, avatar } = await request.json();

    // Note: In a real implementation, you might want to update the database
    // For now, we'll just return the current user data
    // The actual profile updates should be handled through WHOP's user management
    
    const updatedProfile = {
      id: user.id,
      whopUserId: user.whopUserId,
      email: user.email,
      name: name || user.name,
      avatar: avatar || user.avatar,
      credits: user.credits,
      accessLevel: user.accessLevel,
      experience: user.experience
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
export const GET = withCustomerAuth(getUserProfileHandler);
export const PUT = withCustomerAuth(updateUserProfileHandler);
