import { NextRequest, NextResponse } from 'next/server';
import { generateFunnelFlow, AIError, ValidationError } from '../../../lib/actions/ai-actions';
import { withWhopAuth, createSuccessResponse, createErrorResponse, type AuthContext } from '../../../lib/middleware/whop-auth';
import { getUserContext } from '../../../lib/context/user-context';
import { updateUserCredits } from '../../../lib/context/user-context';
import { db } from '../../../lib/supabase/db';
import { funnels } from '../../../lib/supabase/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Generate Funnel API Route
 * Protected route that requires authentication and credits
 */
async function generateFunnelHandler(request: NextRequest, context: AuthContext) {
  try {
    const { resources, funnelId } = await request.json();
    
    if (!funnelId) {
      return createErrorResponse(
        'MISSING_FUNNEL_ID',
        'Funnel ID is required for generation'
      );
    }
    
    // Check if user has sufficient credits before generation
    const userContext = await getUserContext(context.user.userId, '', context.user.experienceId || '');
    if (!userContext || userContext.user.credits < 1) {
      return createErrorResponse(
        'INSUFFICIENT_CREDITS',
        'Insufficient credits to generate funnel. Please purchase more credits.'
      );
    }
    
    // Verify funnel exists and user has access
    const existingFunnel = await db.query.funnels.findFirst({
      where: and(
        eq(funnels.id, funnelId),
        eq(funnels.experienceId, userContext.user.experienceId)
      )
    });

    if (!existingFunnel) {
      return createErrorResponse(
        'FUNNEL_NOT_FOUND',
        'Funnel not found or access denied'
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
    
    // Save the generated flow directly to the database
    const [updatedFunnel] = await db.update(funnels)
      .set({
        flow: generatedFlow,
        generationStatus: 'completed',
        isDeployed: false, // Reset deployment status
        updatedAt: new Date()
      })
      .where(eq(funnels.id, funnelId))
      .returning();
    
    // Deduct credit AFTER successful generation and database save (server-side for security)
    const creditDeducted = await updateUserCredits(userContext.user.whopUserId, 1, 'subtract');
    if (!creditDeducted) {
      console.warn('Failed to deduct credits for user:', userContext.user.whopUserId);
      // Note: Generation succeeded but credit deduction failed - this is logged but not blocking
    } else {
      console.log(`Credit deducted for user ${userContext.user.whopUserId} after successful generation`);
    }
    
    return createSuccessResponse(generatedFlow, 'Funnel generated and saved successfully');
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