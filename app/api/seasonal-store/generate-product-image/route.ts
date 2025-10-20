import { NextRequest, NextResponse } from 'next/server';
import { generateProductImage } from '@/lib/actions/seasonal-store-actions';
import { Theme } from '@/lib/components/store/SeasonalStore/types';

export async function POST(request: NextRequest) {
  try {
    const { productName, theme, existingImage } = await request.json();

    if (!productName || !theme) {
      return NextResponse.json(
        { error: 'Missing required parameters: productName, theme' },
        { status: 400 }
      );
    }

    const result = await generateProductImage(productName, theme as Theme, existingImage);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in generate-product-image API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}


