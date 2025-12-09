import { NextRequest, NextResponse } from "next/server";
import { nanoBananaService } from '@/lib/components/store/SeasonalStore/actions/nanobananaService';

export async function POST(request: NextRequest) {
  try {
    const { name, description, action, existingImageUrl } = await request.json();

    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      );
    }

    if (!action || !['generate', 'refine'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "generate" or "refine"' },
        { status: 400 }
      );
    }

    console.log('🎨 [ResourceLibrary AI] Starting image generation/refinement:', {
      name,
      description: description.substring(0, 100) + '...',
      action,
      hasExistingImage: !!existingImageUrl
    });

    let imageUrl: string;

    if (action === 'generate') {
      // Generate new image based on name and description
      imageUrl = await nanoBananaService.generateProductImage(name, description, {
        name: 'ResourceLibrary',
        themePrompt: 'Professional e-commerce product thumbnail optimized for digital store display. High-quality product image with clean, modern styling, perfect for product listings and digital storefronts. Optimized for thumbnail display with clear product visibility and attractive presentation.'
      }, '');
    } else {
      // Refine existing image
      if (!existingImageUrl) {
        return NextResponse.json(
          { error: 'Existing image URL is required for refinement' },
          { status: 400 }
        );
      }
      imageUrl = await nanoBananaService.generateProductImage(name, description, {
        name: 'ResourceLibrary',
        themePrompt: 'Professional e-commerce product thumbnail optimized for digital store display. High-quality product image with clean, modern styling, perfect for product listings and digital storefronts. Optimized for thumbnail display with clear product visibility and attractive presentation.'
      }, existingImageUrl);
    }

    console.log('🎨 [ResourceLibrary AI] Generated image URL length:', imageUrl.length);
    console.log('🎨 [ResourceLibrary AI] Generated image preview:', imageUrl.startsWith('data:') ? 
      imageUrl.substring(0, 50) + '...' + imageUrl.substring(imageUrl.length - 50) : 
      imageUrl);

    return NextResponse.json({ 
      success: true,
      imageUrl,
      action,
      message: `Image ${action}d successfully`
    });

  } catch (error) {
    console.error('🎨 [ResourceLibrary AI] Error generating image:', error);
    
    return NextResponse.json(
      { 
        error: 'Image generation failed',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}


