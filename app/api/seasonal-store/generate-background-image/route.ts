import { NextRequest, NextResponse } from 'next/server';
import { generateBackgroundImage } from '@/lib/actions/seasonal-store-actions';

export async function POST(request: NextRequest) {
  try {
    const { themePrompt } = await request.json();

    if (!themePrompt) {
      return NextResponse.json(
        { error: 'Missing required parameter: themePrompt' },
        { status: 400 }
      );
    }

    const result = await generateBackgroundImage(themePrompt);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error in generate-background-image API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}


