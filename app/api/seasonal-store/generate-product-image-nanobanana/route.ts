import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/services/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🎨 [Nano Banana API] Received request body:', JSON.stringify(body, null, 2));
    
    const { productName, theme, originalImageUrl, dimensions } = body;

    if (!productName || !theme) {
      console.log('🎨 [Nano Banana API] Missing required fields:', { productName: !!productName, theme: !!theme });
      return NextResponse.json(
        { error: 'Product name and theme are required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting product image generation for:', productName);
    console.log('🎨 [Nano Banana API] Using dimensions:', dimensions || 'default');
    
    const imageUrl = await nanoBananaService.generateProductImage(productName, theme, originalImageUrl || '', dimensions);
    
    console.log('🎨 [Nano Banana API] Generated product image URL length:', imageUrl.length);
    
    return NextResponse.json({ 
      success: true,
      imageUrl,
      message: 'Product image generated successfully using Nano Banana service',
      dimensions: dimensions || { width: 800, height: 800 }
    });

  } catch (error) {
    console.error('🎨 [Nano Banana API] Error generating product image:', error);
    
    return NextResponse.json(
      { 
        error: 'Product image generation failed',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
