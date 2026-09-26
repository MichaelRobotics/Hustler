import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaService } from '@/lib/components/store/SeasonalStore/actions/nanobananaService';
import { requireRequestExperience } from '@/lib/helpers/experience-access-gate';

export async function POST(request: NextRequest) {
  let themePrompt: string = '';
  let containerDimensions: any = undefined;
  let existingBackgroundUrl: string | undefined = undefined;
  let backgroundContext: { isGenerated: boolean; isUploaded: boolean } | undefined = undefined;
  
  try {
    const access = await requireRequestExperience(request, { requireAdmin: true });
    if (!access.ok) return access.response;
    const body = await request.json();
    themePrompt = body.themePrompt;
    containerDimensions = body.containerDimensions;
    existingBackgroundUrl = body.existingBackgroundUrl;
    backgroundContext = body.backgroundContext;

    if (!themePrompt) {
      return NextResponse.json(
        { error: 'Theme prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Nano Banana API] Starting background generation with prompt:', themePrompt);
    console.log('🎨 [Nano Banana API] Container dimensions:', containerDimensions);
    console.log('🎨 [Nano Banana API] Existing background URL:', existingBackgroundUrl);
    console.log('🎨 [Nano Banana API] Background context:', backgroundContext);
    
    const imageUrl = await nanoBananaService.generateBackgroundImage(themePrompt, containerDimensions, existingBackgroundUrl, backgroundContext);
    
    console.log('🎨 [Nano Banana API] Generated image URL length:', imageUrl.length);
    
    return NextResponse.json({ 
      success: true,
      imageUrl,
      message: 'Background image generated successfully using Nano Banana service',
      dimensions: containerDimensions
    });

  } catch (error) {
    console.error('🎨 [Nano Banana API] Error generating background:', error);
    
    // Handle quota exceeded error with fallback
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.warn('🎨 [Nano Banana API] API quota exceeded, generating fallback background');
      
      try {
        // Generate fallback background
        const fallbackImageUrl = nanoBananaService.generateFallbackBackground(themePrompt || 'default theme', 1920, 1080);
        
        return NextResponse.json({ 
          success: true,
          imageUrl: fallbackImageUrl,
          message: 'Fallback background generated due to quota limits',
          isFallback: true,
          dimensions: containerDimensions
        });
      } catch (fallbackError) {
        console.error('🎨 [Nano Banana API] Fallback generation failed:', fallbackError);
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Background generation failed',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

