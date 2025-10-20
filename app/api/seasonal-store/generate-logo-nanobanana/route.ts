import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/services/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const { theme, shape, currentLogoUrl } = await request.json();

    if (!theme || !shape) {
      return NextResponse.json(
        { error: 'Theme and shape are required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting logo generation for theme:', theme.name);
    
    const imageUrl = await nanoBananaService.generateLogo(theme, shape, currentLogoUrl || '');
    
    console.log('🎨 [Nano Banana API] Generated logo URL length:', imageUrl.length);
    
    return NextResponse.json({ 
      success: true,
      imageUrl,
      message: 'Logo generated successfully using Nano Banana service'
    });

  } catch (error) {
    console.error('🎨 [Nano Banana API] Error generating logo:', error);
    
    return NextResponse.json(
      { 
        error: 'Logo generation failed',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

