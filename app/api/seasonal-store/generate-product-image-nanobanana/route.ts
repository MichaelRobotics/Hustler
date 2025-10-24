import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/services/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🎨 [Nano Banana API] Received request body:', JSON.stringify(body, null, 2));
    
    const { productName, theme, originalImageUrl } = body;

    if (!productName || !theme) {
      console.log('🎨 [Nano Banana API] Missing required fields:', { productName: !!productName, theme: !!theme });
      return NextResponse.json(
        { error: 'Product name and theme are required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting product image generation for:', productName);
    
    const result = await nanoBananaService.generateProductImage(productName, theme, originalImageUrl || '');
    
    console.log('🎨 [Nano Banana API] Generated product image result:', result);
    
    return NextResponse.json({ 
      success: true,
      imageUrl: result.url,
      attachmentId: result.attachmentId,
      message: 'Product image generated successfully using Nano Banana service'
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
