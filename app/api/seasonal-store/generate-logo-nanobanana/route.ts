import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/services/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const { theme, shape, currentLogoUrl, logoContext } = await request.json();

    if (!theme || !shape) {
      return NextResponse.json(
        { error: 'Theme and shape are required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting logo generation for theme:', theme.name);
    console.log('🎨 [Nano Banana API] Current logo URL:', currentLogoUrl?.startsWith('data:') ? 
      currentLogoUrl.substring(0, 50) + '...' + currentLogoUrl.substring(currentLogoUrl.length - 50) : 
      currentLogoUrl);
    console.log('🎨 [Nano Banana API] Logo context:', logoContext);
    
    const imageUrl = await nanoBananaService.generateLogo(theme, shape, currentLogoUrl || '', logoContext);
    
    console.log('🎨 [Nano Banana API] Generated logo URL length:', imageUrl.length);
    console.log('🎨 [Nano Banana API] Generated logo preview:', imageUrl.startsWith('data:') ? 
      imageUrl.substring(0, 50) + '...' + imageUrl.substring(imageUrl.length - 50) : 
      imageUrl);
    
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

