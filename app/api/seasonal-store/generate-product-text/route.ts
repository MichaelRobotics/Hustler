import { NextRequest, NextResponse } from 'next/server';
import { generateProductText } from '@/lib/actions/seasonal-store-actions';
import { Theme } from '@/lib/components/store/SeasonalStore/types';

export async function POST(request: NextRequest) {
  try {
    const { productName, productDescription, theme } = await request.json();
    
    console.log('🔍 [API] Received request data:', {
      productName,
      productDescription,
      theme,
      productNameType: typeof productName,
      productDescriptionType: typeof productDescription,
      themeType: typeof theme,
      productNameEmpty: !productName,
      productDescriptionEmpty: !productDescription,
      themeEmpty: !theme
    });

    if (!productName || !theme) {
      console.log('❌ [API] Missing required parameters:', {
        hasProductName: !!productName,
        hasProductDescription: !!productDescription,
        hasTheme: !!theme
      });
      return NextResponse.json(
        { error: 'Missing required parameters: productName, theme' },
        { status: 400 }
      );
    }

    // Provide fallback description if empty
    const finalDescription = productDescription || `A premium ${productName} product`;

    const result = await generateProductText(productName, finalDescription, theme as Theme);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in generate-product-text API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}


