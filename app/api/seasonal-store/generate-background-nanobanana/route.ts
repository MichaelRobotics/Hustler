import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/services/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const { themePrompt } = await request.json();

    if (!themePrompt) {
      return NextResponse.json(
        { error: 'Theme prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting background generation with prompt:', themePrompt);
    
    const imageUrl = await nanoBananaService.generateBackgroundImage(themePrompt);
    
    console.log('🎨 [Nano Banana API] Generated image URL length:', imageUrl.length);
    
    return NextResponse.json({ 
      success: true,
      imageUrl,
      message: 'Background image generated successfully using Nano Banana service'
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

