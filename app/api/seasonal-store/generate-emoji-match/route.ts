import { NextRequest, NextResponse } from 'next/server';
import { generateEmojiMatch } from '@/lib/actions/seasonal-store-actions';
import { requireRequestExperience } from '@/lib/helpers/experience-access-gate';

export async function POST(request: NextRequest) {
  try {
    const access = await requireRequestExperience(request, { requireAdmin: true });
    if (!access.ok) return access.response;
    console.log('🎯 [API] Emoji match request received');
    
    const { prompt } = await request.json();
    console.log('🎯 [API] Request prompt:', prompt);

    if (!prompt) {
      console.log('🎯 [API] Missing prompt parameter');
      return NextResponse.json(
        { error: 'Missing required parameter: prompt' },
        { status: 400 }
      );
    }

    console.log('🎯 [API] Calling generateEmojiMatch with prompt:', prompt);
    const result = await generateEmojiMatch(prompt);
    console.log('🎯 [API] Generated emoji result:', result);
    
    return NextResponse.json({ success: true, emoji: result });
  } catch (error) {
    console.error('🎯 [API] Error in generate-emoji-match API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}


