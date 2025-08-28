import { NextRequest, NextResponse } from 'next/server';
import { generateFunnelFlow, AIError, ValidationError } from '../../../lib/ai-actions';
import { validateAndRepairFunnelFlow, createMinimalValidFunnelFlow } from '../../../lib/utils/funnelValidation';

export async function POST(request: NextRequest) {
  try {
    const { resources } = await request.json();
    
    // Generate the funnel flow using AI
    const generatedFlow = await generateFunnelFlow(resources || []);
    
    // Final validation before sending to frontend
    const validatedFlow = validateAndRepairFunnelFlow(generatedFlow);
    if (!validatedFlow) {
      throw new AIError('Generated funnel flow failed final validation. Please try again.', 'CONTENT');
    }
    
    return NextResponse.json({ 
      success: true, 
      data: validatedFlow,
      message: 'Funnel generated successfully'
    });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration Error', 
          message: error.message,
          details: 'Please check your environment configuration and try again.',
          action: 'Check API key configuration'
        },
        { status: 400 }
      );
    }
    
    if (error instanceof AIError) {
      let statusCode = 500;
      let userMessage = error.message;
      let details = '';
      let action = '';
      
      switch (error.type) {
        case 'AUTHENTICATION':
          statusCode = 401;
          details = 'The AI service authentication failed.';
          action = 'Check your API key and try again';
          break;
        case 'RATE_LIMIT':
          statusCode = 429;
          details = 'Too many requests to the AI service.';
          action = 'Wait a moment and try again';
          break;
        case 'NETWORK':
          statusCode = 503;
          details = 'Network connection to AI service failed.';
          action = 'Check your internet connection and try again';
          break;
        case 'CONTENT':
          statusCode = 422;
          details = 'The AI generated invalid content that could not be processed.';
          action = 'Try generating again with different resources';
          break;
        default:
          statusCode = 500;
          details = 'An unexpected error occurred during generation.';
          action = 'Try again or contact support if the problem persists';
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI Error', 
          message: userMessage,
          details,
          action,
          type: error.type 
        },
        { status: statusCode }
      );
    }
    
    // Generic error
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected Error', 
        message: (error as Error).message,
        details: 'An unexpected error occurred while processing your request.',
        action: 'Try again or contact support if the problem persists'
      },
      { status: 500 }
    );
  }
}
