import { NextRequest, NextResponse } from 'next/server';
import { generateLogo } from '@/lib/actions/seasonal-store-actions';
import { Theme } from '@/lib/components/store/SeasonalStore/types';

export async function POST(request: NextRequest) {
  try {
    const { theme, shape, existingLogo } = await request.json();

    if (!theme || !shape) {
      return NextResponse.json(
        { error: 'Missing required parameters: theme, shape' },
        { status: 400 }
      );
    }

    const result = await generateLogo(theme as Theme, shape as 'round' | 'square', existingLogo);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in generate-logo API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}


