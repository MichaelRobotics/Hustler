import { NextRequest, NextResponse } from 'next/server';
import { withCustomerAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../../lib/middleware/whop-auth';
import { getUserCredits } from '../../../../lib/context/user-context';

/**
 * User Credits API Route
 * Handles credit-related operations with authentication
 */

/**
 * GET /api/user/credits - Get current user credits
 */
async function getUserCreditsHandler(request: NextRequest, context: AuthContext) {
  try {
    const { user } = context;
    
    // Get fresh credits from database
    const currentCredits = await getUserCredits(user.userId);
    
    const creditsInfo = {
      current: currentCredits,
      user: {
        id: user.userId,
        whopUserId: user.userId,
        name: 'User' // WhopUser doesn't have name property
      }
    };

    return createSuccessResponse(creditsInfo, 'User credits retrieved successfully');
  } catch (error) {
    console.error('Error getting user credits:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const GET = withCustomerAuth(getUserCreditsHandler);
