import { NextRequest, NextResponse } from 'next/server';
import { generateProductText } from '@/lib/actions/seasonal-store-actions';
import { Theme } from '@/lib/components/store/SeasonalStore/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🎯 [API] Received request body:', JSON.stringify(body, null, 2));
    
    const { productName, productDescription, theme } = body;

    console.log('🎯 [API] Extracted parameters:', {
      productName: !!productName,
      productDescription: !!productDescription,
      theme: !!theme,
      productNameValue: productName,
      productDescriptionValue: productDescription,
      themeValue: theme
    });

    if (!productName || productDescription === undefined || productDescription === null || !theme) {
      console.log('🎯 [API] Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: productName, productDescription, theme' },
        { status: 400 }
      );
    }

    const result = await generateProductText(productName, productDescription, theme as Theme);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in generate-product-text API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}


