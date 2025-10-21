import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/services/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const { themePrompt, dimensions } = await request.json();

    if (!themePrompt) {
      return NextResponse.json(
        { error: 'Theme prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting background generation with prompt:', themePrompt);
    console.log('🎨 [Nano Banana API] Using dimensions:', dimensions || 'default');
    
    const imageUrl = await nanoBananaService.generateBackgroundImage(themePrompt, dimensions);
    
    console.log('🎨 [Nano Banana API] Generated image URL length:', imageUrl.length);
    
    return NextResponse.json({ 
      success: true,
      imageUrl,
      message: 'Background image generated successfully using Nano Banana service',
      dimensions: dimensions || { width: 1920, height: 1080 }
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

