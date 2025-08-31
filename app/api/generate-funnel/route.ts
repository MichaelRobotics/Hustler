import { NextRequest, NextResponse } from 'next/server';
import { generateFunnelFlow, AIError, ValidationError } from '../../../lib/actions/ai-actions';

export async function POST(request: NextRequest) {
  try {
    const { resources } = await request.json();
    
    // Generate the funnel flow using AI
    const generatedFlow = await generateFunnelFlow(resources || []);
    
    return NextResponse.json({ success: true, data: generatedFlow });
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration Error', 
          message: error.message 
        },
        { status: 400 }
      );
    }
    
    if (error instanceof AIError) {
      let statusCode = 500;
      switch (error.type) {
        case 'AUTHENTICATION':
          statusCode = 401;
          break;
        case 'RATE_LIMIT':
          statusCode = 429;
          break;
        case 'NETWORK':
          statusCode = 503;
          break;
        case 'CONTENT':
          statusCode = 422;
          break;
        default:
          statusCode = 500;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI Error', 
          message: error.message,
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
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
