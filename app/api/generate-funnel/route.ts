import { NextRequest, NextResponse } from 'next/server';
import { generateFunnelFlow, AIError, ValidationError } from '../../../lib/actions/ai-actions';
import { withWhopAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/whop-auth';
import { getUserContext } from '../../../lib/context/user-context';
import { updateUserCredits } from '../../../lib/context/user-context';

/**
 * Generate Funnel API Route
 * Protected route that requires authentication and credits
 */
async function generateFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const { resources } = await request.json();
    
    // Check if user has sufficient credits before generation
    const userContext = await getUserContext(context.user.userId, '', context.user.experienceId || '');
    if (!userContext || userContext.user.credits < 1) {
      return createErrorResponse(
        'INSUFFICIENT_CREDITS',
        'Insufficient credits to generate funnel. Please purchase more credits.'
      );
    }
    
    // Convert AIResource[] to Resource[] format
    const convertedResources = (resources || []).map((resource: any) => ({
      id: resource.id,
      type: resource.type,
      name: resource.name,
      link: resource.link,
      code: resource.code || '',
      category: resource.price || 'FREE_VALUE' // Map price to category
    }));
    
    // Generate the funnel flow using AI
    const generatedFlow = await generateFunnelFlow(convertedResources);
    
    // Note: Credit deduction is handled by the frontend to avoid double deduction
    // The frontend will call consumeCredit() after successful generation
    
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
export const POST = withWhopAuth(generateFunnelHandler);