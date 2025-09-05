import { NextRequest, NextResponse } from 'next/server';
import { generateFunnelFlow, AIError, ValidationError } from '../../../lib/actions/ai-actions';
import { withCreditsProtection, createSuccessResponse, createErrorResponse, type ProtectedRouteContext } from '../../../lib/middleware';
import { updateUserCredits } from '../../../lib/context/user-context';

/**
 * Generate Funnel API Route
 * Protected route that requires authentication and credits
 */
async function generateFunnelHandler(context: ProtectedRouteContext) {
  try {
    const { resources } = await context.request.json();
    
    // Generate the funnel flow using AI
    const generatedFlow = await generateFunnelFlow(resources || []);
    
    // Deduct 1 credit for the operation
    const creditDeducted = await updateUserCredits(context.user.whopUserId, 1, 'subtract');
    
    if (!creditDeducted) {
      console.warn('Failed to deduct credits for user:', context.user.whopUserId);
    }
    
    console.log(`User ${context.user.whopUserId} consumed 1 credit. Remaining: ${context.user.credits - 1}`);
    
    return createSuccessResponse(generatedFlow, 'Funnel generated successfully');
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ValidationError) {
      return createErrorResponse(
        'INVALID_INPUT',
        error.message
      );
    }
    
    if (error instanceof AIError) {
      let errorType: keyof typeof import('../../../lib/middleware/error-handling').ERROR_TYPES = 'INTERNAL_ERROR';
      switch (error.type) {
        case 'AUTHENTICATION':
          errorType = 'INVALID_TOKEN';
          break;
        case 'RATE_LIMIT':
          errorType = 'INTERNAL_ERROR';
          break;
        case 'NETWORK':
          errorType = 'INTERNAL_ERROR';
          break;
        case 'CONTENT':
          errorType = 'INVALID_INPUT';
          break;
        default:
          errorType = 'INTERNAL_ERROR';
      }
      
      return createErrorResponse(
        errorType,
        error.message
      );
    }
    
    // Generic error
    return createErrorResponse(
      'INTERNAL_ERROR',
      (error as Error).message
    );
  }
}

// Export the protected route handler
export const POST = withCreditsProtection(1, generateFunnelHandler);