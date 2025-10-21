import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/services/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const { themePrompt, containerDimensions } = await request.json();

    if (!themePrompt) {
      return NextResponse.json(
        { error: 'Theme prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting background generation with prompt:', themePrompt);
    console.log('🎨 [Nano Banana API] Container dimensions:', containerDimensions);
    
    const imageUrl = await nanoBananaService.generateBackgroundImage(themePrompt, containerDimensions);
    
    console.log('🎨 [Nano Banana API] Generated image URL length:', imageUrl.length);
    
    return NextResponse.json({ 
      success: true,
      imageUrl,
      message: 'Background image generated successfully using Nano Banana service',
      dimensions: containerDimensions
    });

  } catch (error) {
    console.error('🎨 [Nano Banana API] Error generating background:', error);
    
    return NextResponse.json(
      { 
        error: 'Background generation failed',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

