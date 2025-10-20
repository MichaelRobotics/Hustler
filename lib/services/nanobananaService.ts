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
   * Generate background images for seasonal themes using Imagen 3.0
   */
  async generateBackgroundImage(themePrompt: string): Promise<string> {
    console.log('🎨 [Nano Banana] Starting background generation with prompt:', themePrompt);
    
    const enhancedPrompt = `Create a stunning, high-resolution background image for an e-commerce store that FULLY COVERS THE ENTIRE SCREEN. 
    Theme: ${themePrompt}. 
    Style: Cinematic, dreamy, ultra-detailed with shallow depth of field and gentle bokeh effects.
    Requirements: 
    - 1920x1080 resolution (16:9 aspect ratio)
    - FULL SCREEN COVERAGE - image must extend to all edges without empty spaces
    - Full, complete image with rich details and textures covering every pixel
    - NO solid black or white backgrounds - use vibrant, themed colors
    - Smooth gradient color scheme with multiple color layers filling the entire canvas
    - Subtle ambient lighting and atmospheric effects across the full image
    - Rich environmental details (textures, patterns, natural elements) covering the entire background
    - ABSOLUTELY NO TEXT, WORDS, LETTERS, OR WRITING of any kind
    - No logos, symbols, or human figures
    - No text overlays, labels, or captions
    - Professional e-commerce aesthetic
    - High quality, photorealistic
    - Ensure the ENTIRE IMAGE is filled with thematic content from edge to edge
    - NO empty spaces, borders, or unfilled areas
    - Background must be seamless and continuous across the full screen`;

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
      throw new Error(`Background image generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate product images with style variations using Imagen 3.0
   */
  async generateProductImage(
    productName: string, 
    theme: any, 
    originalImageUrl: string
  ): Promise<string> {
    console.log('🎨 [Nano Banana] Starting product image generation for:', productName);
    console.log('🎨 [Nano Banana] Theme object:', JSON.stringify(theme, null, 2));
    
    const enhancedPrompt = `Create a professional product image for "${productName}" in a ${theme.name} theme.
    Style: Clean, modern, e-commerce ready
    Background: ${theme.themePrompt}
    Requirements:
    - High resolution (800x800 minimum)
    - Full, complete image with rich thematic background
    - NO solid black or white backgrounds - use vibrant, themed colors
    - Themed environment that complements the product
    - Professional lighting with atmospheric effects
    - Product-focused composition with contextual surroundings
    - Rich environmental details (textures, patterns, thematic elements)
    - ABSOLUTELY NO TEXT, WORDS, LETTERS, OR WRITING of any kind
    - No text overlays, labels, or captions
    - No logos or symbols
    - E-commerce optimized
    - Ensure the entire image is filled with thematic content`;

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
      
      return imageUrl;
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
    
    const enhancedPrompt = `Create a professional logo for a ${theme.name} themed e-commerce store.
    Style: Modern, clean, minimalist
    Shape: ${shape}
    Theme: ${theme.themePrompt}
    Requirements:
    - High resolution (1024x1024 minimum) - generate large image for better cropping
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
    - Generate larger image so it can be properly cropped by circular/square frames`;

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
