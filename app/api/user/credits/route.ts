import { NextRequest, NextResponse } from 'next/server';
import { withRouteProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../../lib/middleware';
import { getUserCredits } from '../../../../lib/context/user-context';

/**
 * User Credits API Route
 * Handles credit-related operations with authentication
 */

/**
 * GET /api/user/credits - Get current user credits
 */
async function getUserCreditsHandler(context: ProtectedRouteContext) {
  try {
    const { user } = context;
    
    // Get fresh credits from database
    const currentCredits = await getUserCredits(user.whopUserId);
    
    const creditsInfo = {
      current: currentCredits,
      user: {
        id: user.id,
        whopUserId: user.whopUserId,
        name: user.name
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
export const GET = withRouteProtection(getUserCreditsHandler);
