// Nano Banana Image Generation Service
// Based on Context7 documentation for proper image generation

import { GoogleGenAI } from '@google/genai';

// Validate environment variables
const validateEnvironment = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  if (process.env.GEMINI_API_KEY === 'your_api_key_here') {
    throw new Error('Please set a valid GEMINI_API_KEY in your environment variables');
  }
};

// Image generation request interface
interface ImageGenerationRequest {
  prompt: string;
  outputCount?: number;
  styles?: string[];
  variations?: string[];
  format?: string;
  seed?: number;
  preview?: boolean;
}

// Image generation response interface
interface ImageGenerationResponse {
  success: boolean;
  message: string;
  generatedFiles?: string[];
  images?: string[];
  metadata?: {
    seed_used?: number;
    styles_applied?: string[];
    variations_applied?: string[];
  };
}

export class NanoBananaImageService {
  private genAI: GoogleGenAI;
  private readonly IMAGE_MODEL = 'gemini-2.5-flash-image-preview';

  constructor() {
    validateEnvironment();
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  /**
   * Generate fallback background when API quota is exceeded
   */
  public generateFallbackBackground(themePrompt: string, targetWidth: number, targetHeight: number): string {
    console.log('🎨 [Fallback] Generating fallback background due to quota limits');
    
    // Create a themed gradient background based on the prompt
    const isDark = themePrompt.toLowerCase().includes('dark') || 
                   themePrompt.toLowerCase().includes('night') || 
                   themePrompt.toLowerCase().includes('halloween') ||
                   themePrompt.toLowerCase().includes('forest');
    
    const isWarm = themePrompt.toLowerCase().includes('sunset') || 
                   themePrompt.toLowerCase().includes('autumn') || 
                   themePrompt.toLowerCase().includes('warm') ||
                   themePrompt.toLowerCase().includes('cozy');
    
    let gradientColors;
    if (isDark) {
      gradientColors = '#1a1a2e, #16213e, #0f3460';
    } else if (isWarm) {
      gradientColors = '#ff9a9e, #fecfef, #fecfef';
    } else {
      gradientColors = '#667eea, #764ba2, #f093fb';
    }
    
    const svg = `
      <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${gradientColors.split(',')[0]};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${gradientColors.split(',')[1]};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${gradientColors.split(',')[2]};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Generate background images for seasonal themes using Imagen 3.0
   */
  async generateBackgroundImage(
    themePrompt: string, 
    containerDimensions?: { width: number; height: number; aspectRatio: number }
  ): Promise<string> {
    console.log('🎨 [Nano Banana] Starting background generation with prompt:', themePrompt);
    console.log('🎨 [Nano Banana] Container dimensions:', containerDimensions);
    
    // Use dynamic dimensions if provided, otherwise fallback to standard
    const targetWidth = containerDimensions ? Math.round(containerDimensions.width * 1.2) : 1920;
    const targetHeight = containerDimensions ? Math.round(containerDimensions.height * 1.2) : 1080;
    const aspectRatio = containerDimensions ? containerDimensions.aspectRatio : 16/9;
    
    console.log('🎨 [Nano Banana] Calculated target dimensions:', {
      originalContainer: containerDimensions,
      targetWidth,
      targetHeight,
      aspectRatio,
      calculatedAspectRatio: targetWidth / targetHeight
    });
    
    const enhancedPrompt = `Create a beautiful, seamless background image for an e-commerce store.
    Theme: ${themePrompt}. 
    Style: Cinematic, dreamy, ultra-detailed with shallow depth of field and gentle bokeh effects.
    
    DIMENSION REQUIREMENTS:
    - Resolution: ${targetWidth} pixels wide by ${targetHeight} pixels tall
    - Aspect ratio: ${aspectRatio.toFixed(3)}:1 (width:height)
    
    DESIGN REQUIREMENTS:
    - Seamless, continuous background pattern or texture
    - Rich, vibrant colors that match the theme
    - Smooth gradient or natural texture covering the entire image
    - Subtle ambient lighting and atmospheric effects
    - Professional e-commerce aesthetic
    - High quality, photorealistic
    
    CONTENT RESTRICTIONS:
    - NO TEXT, WORDS, LETTERS, OR WRITING of any kind
    - No logos, symbols, or human figures
    - No text overlays, labels, or captions
    - No UI elements, buttons, or interface components
    - Pure background image only
    
    FINAL REQUIREMENTS:
    - Seamless background that can be used as a website background
    - No empty spaces or unfilled areas
    - Continuous pattern or texture from edge to edge
    - Optimized for ${targetWidth}x${targetHeight} display dimensions`;

    try {
      const response = await this.genAI.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
        },
      });

      const generatedImages = response?.generatedImages;
      if (!generatedImages || generatedImages.length === 0) {
        console.error('🎨 [Nano Banana] No images generated:', response);
        throw new Error("Image generation failed to return image data.");
      }

      const imageBytes = generatedImages[0]?.image?.imageBytes;
      if (!imageBytes) {
        console.error('🎨 [Nano Banana] No image bytes in response:', generatedImages[0]);
        throw new Error("Image generation failed to return image data.");
      }

      const imageUrl = `data:image/png;base64,${imageBytes}`;
      console.log('🎨 [Nano Banana] Generated image URL length:', imageUrl.length);
      
      return imageUrl;
    } catch (error) {
      console.error("Error in generateBackgroundImage:", error);
        
        // Handle quota exceeded error with fallback
        const errorMessage = (error as Error).message;
        if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
          console.warn('🎨 [Nano Banana] API quota exceeded, generating fallback background');
          return this.generateFallbackBackground(themePrompt, targetWidth, targetHeight);
        }
        
        throw new Error(`Background image generation failed: ${errorMessage}`);
      }
  }

  /**
   * Generate or refine product images based on whether an existing image exists
   */
  async generateProductImage(
    productName: string, 
    theme: any, 
    originalImageUrl: string
  ): Promise<{ url: string; attachmentId: string | null }> {
    console.log('🎨 [Nano Banana] Starting product image generation for:', productName);
    console.log('🎨 [Nano Banana] Theme object:', JSON.stringify(theme, null, 2));
    console.log('🎨 [Nano Banana] Original image URL provided:', !!originalImageUrl);
    console.log('🎨 [Nano Banana] Original image URL value:', originalImageUrl);
    console.log('🎨 [Nano Banana] Original image URL type:', typeof originalImageUrl);
    console.log('🎨 [Nano Banana] Original image URL length:', originalImageUrl?.length);
    
    // Always refine - never generate new images
    const hasExistingImage = true; // Force refinement mode
    
    console.log('🎨 [Nano Banana] Image detection details:', {
      originalImageUrl,
      hasExistingImage: true, // Always true now
      mode: 'REFINE_ONLY',
      isPlaceholder: originalImageUrl?.includes('placehold.co'),
      isBase64: originalImageUrl?.includes('data:image/'),
      isWhopPlaceholder: originalImageUrl === 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp'
    });
    
    let enhancedPrompt: string;
    
    // Always use refinement mode
    console.log('🎨 [Nano Banana] Refining image to match theme (always refine mode)');
      enhancedPrompt = `Refine and enhance this existing product image to perfectly match a ${theme.name} theme.
      
      IMPORTANT: Use the existing product image as your reference and base. Keep the same product, same composition, same product details, but transform the background, lighting, and environment to match the ${theme.name} theme.
      
      Original product: "${productName}"
      Theme: ${theme.name} - ${theme.themePrompt}
      
      Refinement requirements:
      - PRESERVE the exact same product from the original image
      - Keep the core product visible, recognizable, and unchanged
      - ONLY transform the background and environment to match the ${theme.name} theme
      - Apply theme-appropriate colors, lighting, and atmosphere to the background
      - Enhance the composition with thematic elements in the background only
      - Maintain professional e-commerce quality
      - Ensure the product remains the focal point and looks identical
      - Add theme-specific environmental details in the background
      - Professional lighting that matches the theme mood
      - High resolution (800x800 minimum)
      - ABSOLUTELY NO TEXT, WORDS, LETTERS, OR WRITING of any kind
      - No text overlays, labels, or captions
      - No logos or symbols
      - E-commerce optimized
      - Ensure the entire image is filled with thematic content
      - The product itself should look exactly the same, only the background/environment changes`;

    try {
      const response = await this.genAI.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
        },
      });

      const generatedImages = response?.generatedImages;
      if (!generatedImages || generatedImages.length === 0) {
        console.error('🎨 [Nano Banana] No images generated:', response);
        throw new Error("Product image generation failed to return image data.");
      }

      const imageBytes = generatedImages[0]?.image?.imageBytes;
      if (!imageBytes) {
        console.error('🎨 [Nano Banana] No image bytes in response:', generatedImages[0]);
        throw new Error("Product image generation failed to return image data.");
      }

      const imageUrl = `data:image/png;base64,${imageBytes}`;
      console.log('🎨 [Nano Banana] Generated product image URL length:', imageUrl.length);
      console.log('🎨 [Nano Banana] Image generation mode:', hasExistingImage ? 'REFINED' : 'GENERATED');
      
      // Upload the generated image to WHOP storage immediately using WHOP SDK
      console.log('📤 [Nano Banana] Uploading generated image to WHOP storage...');
      try {
        const { whopSdk } = await import('@/lib/whop-sdk');
        
        // Convert base64 to buffer
        const base64Data = imageUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Create a File-like object from the buffer
        const file = new File([buffer], `generated-product-${Date.now()}.png`, { type: 'image/png' });
        
        // Upload to WHOP storage
        const uploadResult = await whopSdk.attachments.uploadAttachment({
          file: file,
          record: "experience", // Store as experience-related attachment
        });
        
        console.log('📤 [Nano Banana] Upload result:', uploadResult);
        return { 
          url: uploadResult.attachment.source.url, 
          attachmentId: uploadResult.directUploadId 
        }; // Return both URL and attachmentId
      } catch (uploadError) {
        console.error('📤 [Nano Banana] Upload failed, returning base64 URL:', uploadError);
        return { url: imageUrl, attachmentId: null }; // Fallback to base64 if upload fails
      }
    } catch (error) {
      console.error("Error in generateProductImage:", error);
      throw new Error(`Product image generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate logo with style variations using Imagen 3.0
   */
  async generateLogo(
    theme: any, 
    shape: 'round' | 'square', 
    currentLogoUrl: string
  ): Promise<string> {
    console.log('🎨 [Nano Banana] Starting logo generation for theme:', theme.name);
    
    // Logo placeholder dimensions: w-24 h-24 = 96px x 96px
    const logoSize = 96;
    const targetWidth = logoSize;
    const targetHeight = logoSize;
    
    console.log('🎨 [Nano Banana] Logo dimensions:', {
      targetWidth,
      targetHeight,
      shape,
      theme: theme.name
    });
    
    const enhancedPrompt = `Create a professional logo for a ${theme.name} themed e-commerce store.
    Style: Modern, clean, minimalist
    Shape: ${shape}
    Theme: ${theme.themePrompt}
    Requirements:
    - EXACT resolution: ${targetWidth} pixels wide by ${targetHeight} pixels tall
    - EXACT aspect ratio: 1:1 (square)
    - The image MUST be exactly ${targetWidth}x${targetHeight} pixels
    - NO cropping, NO scaling, NO aspect ratio changes
    - Full, complete logo design with rich thematic elements
    - NO solid black or white backgrounds - use vibrant, themed colors
    - Scalable vector-style design with thematic background
    - Theme-appropriate colors and atmospheric effects
    - Professional appearance with contextual surroundings
    - ABSOLUTELY NO TEXT, WORDS, LETTERS, OR WRITING of any kind
    - Icon/symbol only - no text elements
    - No logos with text or lettering
    - E-commerce suitable
    - Ensure the entire logo area is filled with thematic content
    - Perfect fit for ${targetWidth}x${targetHeight} display dimensions`;

    try {
      const response = await this.genAI.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
        },
      });

      const generatedImages = response?.generatedImages;
      if (!generatedImages || generatedImages.length === 0) {
        console.error('🎨 [Nano Banana] No images generated:', response);
        throw new Error("Logo generation failed to return image data.");
      }

      const imageBytes = generatedImages[0]?.image?.imageBytes;
      if (!imageBytes) {
        console.error('🎨 [Nano Banana] No image bytes in response:', generatedImages[0]);
        throw new Error("Logo generation failed to return image data.");
      }

      const imageUrl = `data:image/png;base64,${imageBytes}`;
      console.log('🎨 [Nano Banana] Generated logo URL length:', imageUrl.length);
      
      return imageUrl;
    } catch (error) {
      console.error("Error in generateLogo:", error);
      throw new Error(`Logo generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate multiple image variations with styles using Imagen 3.0
   */
  async generateImageVariations(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    console.log('🎨 [Nano Banana] Starting image variations generation:', request);
    
    try {
      const images: string[] = [];
      const styles = request.styles || ['photorealistic', 'artistic', 'minimalist'];
      const variations = request.variations || ['lighting', 'mood'];
      
      for (let i = 0; i < (request.outputCount || 3); i++) {
        const style = styles[i % styles.length];
        const variation = variations[i % variations.length];
        
        const enhancedPrompt = `${request.prompt}. Style: ${style}. Variation: ${variation}. 
        High resolution, professional quality. 
        Full, complete image with rich details and textures. 
        NO solid black or white backgrounds - use vibrant, themed colors. 
        ABSOLUTELY NO TEXT, WORDS, LETTERS, OR WRITING of any kind.
        No text overlays, labels, or captions.
        Ensure the entire image is filled with thematic content.`;
        
        const response = await this.genAI.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: enhancedPrompt,
          config: {
            numberOfImages: 1,
            includeRaiReason: true,
          },
        });

        const generatedImages = response?.generatedImages;
        if (generatedImages && generatedImages.length > 0) {
          const imageBytes = generatedImages[0]?.image?.imageBytes;
          if (imageBytes) {
            const imageUrl = `data:image/png;base64,${imageBytes}`;
            images.push(imageUrl);
          }
        }
      }

      return {
        success: true,
        message: `Successfully generated ${images.length} image variation(s)`,
        images,
        metadata: {
          seed_used: request.seed,
          styles_applied: styles,
          variations_applied: variations
        }
      };
    } catch (error) {
      console.error("Error in generateImageVariations:", error);
      return {
        success: false,
        message: `Image variations generation failed: ${(error as Error).message}`,
        images: []
      };
    }
  }
}

// Export singleton instance
export const nanoBananaService = new NanoBananaImageService();
