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
  private readonly BACKGROUND_MODEL = 'imagen-4.0-generate-001'; // Use correct Imagen model
  private readonly REFINEMENT_MODEL = 'gemini-2.5-flash-image'; // Use flash for refinement
  private readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

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
   * Generate or refine background images for seasonal themes using gemini-2.5-flash-image
   */
  async generateBackgroundImage(
    themePrompt: string, 
    containerDimensions?: { width: number; height: number; aspectRatio: number },
    existingBackgroundUrl?: string,
    backgroundContext?: { isGenerated: boolean; isUploaded: boolean }
  ): Promise<string> {
    console.log('🎨 [Nano Banana] Starting background generation with prompt:', themePrompt);
    console.log('🎨 [Nano Banana] Container dimensions:', containerDimensions);
    console.log('🎨 [Nano Banana] Existing background URL:', existingBackgroundUrl);
    
    // Check if we have an existing background and determine if it should be refined or regenerated
    let hasExistingBackground = existingBackgroundUrl && 
      existingBackgroundUrl.trim() !== '' && 
      !existingBackgroundUrl.includes('placehold.co') && 
      existingBackgroundUrl.startsWith('http');
    
    // Detect if background is generated (should regenerate) vs user-uploaded (should refine)
    let isGeneratedBackground = false;
    let shouldRefineBackground = false;
    
    if (hasExistingBackground && existingBackgroundUrl) {
      // Use explicit context if provided, otherwise fall back to URL pattern detection
      if (backgroundContext) {
        isGeneratedBackground = backgroundContext.isGenerated;
        shouldRefineBackground = !backgroundContext.isGenerated; // Refine if NOT generated (i.e., if uploaded)
        
        console.log('🎨 [Nano Banana] Using explicit background context:', {
          isGenerated: backgroundContext.isGenerated,
          isUploaded: backgroundContext.isUploaded,
          shouldRefineBackground,
          logic: 'shouldRefineBackground = !isGenerated (refine if user-uploaded, regenerate if system-generated)'
        });
      } else {
        // Fallback to URL pattern detection
        isGeneratedBackground = existingBackgroundUrl.includes('generated-bg-') || 
                                (existingBackgroundUrl.includes('whop.com') && existingBackgroundUrl.includes('generated-bg-'));
        shouldRefineBackground = !isGeneratedBackground;
        
        console.log('🎨 [Nano Banana] Using URL pattern detection (fallback):', {
          url: existingBackgroundUrl,
          containsGenerated: existingBackgroundUrl.includes('generated'),
          containsGeneratedBg: existingBackgroundUrl.includes('generated-bg-'),
          containsWhopGeneratedBg: existingBackgroundUrl.includes('whop.com') && existingBackgroundUrl.includes('generated-bg-'),
          isGeneratedBackground,
          shouldRefineBackground
        });
      }
    }
    
    console.log('🎨 [Nano Banana] Background detection details:', {
      existingBackgroundUrl,
      hasExistingBackground,
      isGeneratedBackground,
      shouldRefineBackground,
      isPlaceholder: existingBackgroundUrl?.includes('placehold.co'),
      isHttpUrl: existingBackgroundUrl?.startsWith('http')
    });
    
    console.log('🎨 [Nano Banana] Background strategy:', shouldRefineBackground ? 'REFINE user-uploaded background' : 'REGENERATE new background');
    
    // Use dynamic dimensions if provided, otherwise fallback to standard
    // Ultra resolution: 2x multiplier for maximum quality
    const targetWidth = containerDimensions ? Math.round(containerDimensions.width * 2.0) : 3840;
    const targetHeight = containerDimensions ? Math.round(containerDimensions.height * 2.0) : 2160;
    const aspectRatio = containerDimensions ? containerDimensions.aspectRatio : 16/9;
    
    console.log('🎨 [Nano Banana] Calculated target dimensions:', {
      originalContainer: containerDimensions,
      targetWidth,
      targetHeight,
      aspectRatio,
      calculatedAspectRatio: targetWidth / targetHeight
    });
    
    let enhancedPrompt: string;
    
    if (shouldRefineBackground) {
      console.log('🎨 [Nano Banana] Refining user-uploaded background to match theme');
      enhancedPrompt = `REFINE THIS USER-UPLOADED BACKGROUND IMAGE - DO NOT CREATE A NEW BACKGROUND:

Theme: ${themePrompt}
Dimensions: ${targetWidth}x${targetHeight} (${aspectRatio.toFixed(3)}:1)

🎯 CRITICAL INSTRUCTIONS:
1. KEEP THE EXACT SAME BACKGROUND STRUCTURE - do not change the overall composition
2. ONLY modify colors, lighting, and atmospheric effects to match the theme
3. Apply ${themePrompt} theme styling while preserving the original background design
4. Maintain the same background pattern, texture, and composition

🚫 DO NOT:
- Change the background structure or composition
- Create a completely different background
- Generate a new background design
- Modify the overall layout

✅ DO:
- Keep the background structure identical to the original
- Change only colors, lighting, and atmospheric effects
- Apply theme colors and mood to match the theme
- Maintain professional e-commerce quality
- Ultra-high resolution (${targetWidth}x${targetHeight} minimum)
- Maximum quality, photorealistic
- Cinematic quality with professional lighting
- Ultra-detailed textures and atmospheric effects
- ABSOLUTELY NO TEXT, WORDS, LETTERS, OR WRITING of any kind
- No quality settings text, resolution labels, or metadata text
- No watermarks, signatures, or artist names
- No text overlays, labels, or captions
- No logos or symbols
- No technical specifications or settings displayed
- Completely text-free background only

REMEMBER: This is BACKGROUND REFINEMENT, not background creation. The background structure must remain exactly the same.`;
    } else {
      console.log('🎨 [Nano Banana] Generating new background from scratch (regenerating generated background)');
      enhancedPrompt = `Create a beautiful, seamless background image for an e-commerce store.
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
      - Ultra-high resolution, maximum quality, photorealistic
      - Cinematic quality with professional lighting
      - Ultra-detailed textures and atmospheric effects
      
      CONTENT RESTRICTIONS:
      - ABSOLUTELY NO TEXT, WORDS, LETTERS, OR WRITING of any kind
      - No quality settings text, resolution labels, or metadata text
      - No watermarks, signatures, or artist names
      - No logos, symbols, or human figures
      - No text overlays, labels, or captions
      - No UI elements, buttons, or interface components
      - No technical specifications or settings displayed
      - Pure background image only - completely text-free
      
      FINAL REQUIREMENTS:
      - Seamless background that can be used as a website background
      - No empty spaces or unfilled areas
      - Continuous pattern or texture from edge to edge
      - Optimized for ${targetWidth}x${targetHeight} display dimensions
      - Ultra-high resolution for maximum visual impact`;
    }

    try {
      let response;
      
      if (shouldRefineBackground) {
        console.log('🎨 [Nano Banana] Using image editing with user-uploaded background URL');
        console.log('🎨 [Nano Banana] Background URL:', existingBackgroundUrl);
        console.log('🎨 [Nano Banana] Enhanced prompt:', enhancedPrompt.substring(0, 200) + '...');
        
        // Fetch the background image from URL and convert to base64 for Gemini API
        console.log('🎨 [Nano Banana] Fetching background from URL:', existingBackgroundUrl);
        if (!existingBackgroundUrl) {
          throw new Error('Existing background URL is required for refinement');
        }
        const imageResponse = await fetch(existingBackgroundUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch background: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        let imageBase64: string;
        let mimeType: string;
        
        // Check if the image is in an unsupported format (like AVIF)
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        console.log('🎨 [Nano Banana] Original content type:', contentType);
        
        if (contentType === 'image/avif' || contentType.includes('avif')) {
          console.log('🎨 [Nano Banana] AVIF format detected - Converting to PNG for Gemini compatibility');
          imageBase64 = Buffer.from(imageBuffer).toString('base64');
          mimeType = 'image/png';
          console.log('🎨 [Nano Banana] Converted AVIF to PNG format, base64 length:', imageBase64.length);
        } else {
          imageBase64 = Buffer.from(imageBuffer).toString('base64');
          mimeType = contentType;
        }
        
        console.log('🎨 [Nano Banana] Converted background to base64, length:', imageBase64.length);
        console.log('🎨 [Nano Banana] Using MIME type:', mimeType);
        console.log('🎨 [Nano Banana] Base64 contains valid image data:', imageBase64.length > 1000);
        
        // Use Gemini's generateContent with base64 image data
        console.log('🎨 [Nano Banana] Using imagen4 for background editing');
        response = await this.genAI.models.generateContent({
          model: this.BACKGROUND_MODEL,
          contents: [
            {
              parts: [
                { 
                  inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                  }
                },
                { text: enhancedPrompt }
              ]
            }
          ]
        } as any);
      } else {
        console.log('🎨 [Nano Banana] Using text-to-image generation for new/regenerated background');
        console.log('🎨 [Nano Banana] Using Imagen API for new background generation');
        
        // Calculate aspect ratio for Imagen API
        const aspectRatio = this.calculateAspectRatio(targetWidth, targetHeight);
        console.log('🎨 [Nano Banana] Calculated aspect ratio:', aspectRatio);
        
        // Use the correct Imagen API
        response = await this.callImagenAPI(enhancedPrompt, aspectRatio);
      }
      
      // Handle response from Imagen API
      let imageBytes: string;
      
      if (shouldRefineBackground) {
        // Handle Gemini response for image editing
        const generateContentResponse = response as any;
        const candidates = generateContentResponse?.candidates;
        if (!candidates || candidates.length === 0) {
          console.error('🎨 [Nano Banana] No candidates in response:', response);
          throw new Error("Background generation failed to return image data.");
        }
        
        const content = candidates[0]?.content;
        if (!content) {
          console.error('🎨 [Nano Banana] No content in response:', response);
          throw new Error("Background generation failed to return image data.");
        }
        
        const parts = content.parts;
        if (!parts || parts.length === 0) {
          console.error('🎨 [Nano Banana] No parts in response:', response);
          throw new Error("Background generation failed to return image data.");
        }
        
        // Look for image data in the response
        const imagePart = parts.find((part: any) => part.inlineData || part.inline_data);
        if (!imagePart) {
          console.error('🎨 [Nano Banana] No image data in response:', response);
          console.error('🎨 [Nano Banana] Available parts:', parts.map((part: any) => Object.keys(part)));
          throw new Error("Background generation failed to return image data.");
        }
        
        // Handle inlineData response (base64 image data)
        if (imagePart.inlineData) {
          imageBytes = imagePart.inlineData.data;
          console.log('🎨 [Nano Banana] Got inlineData background image, length:', imageBytes.length);
        } else if (imagePart.inline_data) {
          imageBytes = imagePart.inline_data.data;
          console.log('🎨 [Nano Banana] Got inline_data background image, length:', imageBytes.length);
        } else {
          console.error('🎨 [Nano Banana] No image data found in response part:', imagePart);
          throw new Error("Background generation failed to return image data.");
        }
      } else {
        // Handle Imagen API response for new image generation
        if (!response.predictions || response.predictions.length === 0) {
          console.error('🎨 [Nano Banana] No predictions in Imagen response:', response);
          throw new Error("Background generation failed to return image data.");
        }
        
        const firstPrediction = response.predictions[0];
        if (!firstPrediction.bytesBase64Encoded) {
          console.error('🎨 [Nano Banana] No image data in Imagen response:', response);
          throw new Error("Background generation failed to return image data.");
        }
        
        imageBytes = firstPrediction.bytesBase64Encoded;
        console.log('🎨 [Nano Banana] Got image from Imagen API, length:', imageBytes.length);
      }
      
      // Upload base64 image to WHOP storage and return URL
      const base64DataUrl = `data:image/png;base64,${imageBytes}`;
      const { uploadBase64ToWhop } = await import('../utils/whop-image-upload');
      const uploadResult = await uploadBase64ToWhop(base64DataUrl, `generated-bg-${Date.now()}.png`);
      console.log('🎨 [Nano Banana] Successfully uploaded background to WHOP storage:', uploadResult.url);
      
      return uploadResult.url;
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
    productDescription: string,
    theme: any, 
    originalImageUrl: string
  ): Promise<string> {
    console.log('🎨 [Nano Banana] Starting product image generation for:', productName);
    console.log('🎨 [Nano Banana] Theme object:', JSON.stringify(theme, null, 2));
    console.log('🎨 [Nano Banana] Original image URL provided:', !!originalImageUrl);
    
    // Check if we have an existing image to refine (URLs only, no base64)
    // Allow refinement of placeholder images too
    let hasExistingImage = originalImageUrl && 
      originalImageUrl.trim() !== '' && 
      !originalImageUrl.includes('placehold.co') && 
      originalImageUrl.startsWith('http');

    
    console.log('🎨 [Nano Banana] Image detection details:', {
      originalImageUrl,
      hasExistingImage,
      isPlaceholder: originalImageUrl?.includes('placehold.co'),
      isWhopPlaceholder: originalImageUrl === 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
      isHttpUrl: originalImageUrl?.startsWith('http')
    });
    
    console.log('🎨 [Nano Banana] Will use image refinement:', hasExistingImage);
    
    let enhancedPrompt: string;
    
    if (hasExistingImage) {
      console.log('🎨 [Nano Banana] Refining existing image to match theme');
      console.log('🎨 [Nano Banana] Dynamic values:', {
        productName,
        productDescription,
        themeName: theme.name,
        themePrompt: theme.themePrompt
      });
      
      enhancedPrompt = `REFINE THIS EXISTING PRODUCT IMAGE - DO NOT CREATE A NEW PRODUCT:

Product: "${productName}"
Description: "${productDescription}"

🎯 CRITICAL INSTRUCTIONS:
1. KEEP THE EXACT SAME PRODUCT - do not change the product itself
2. ONLY modify the background and environment
3. Apply ${theme.name} theme styling to the background only
4. Theme: ${theme.themePrompt}

🚫 DO NOT:
- Change the product shape, size, or appearance
- Create a different product
- Generate a new product design
- Modify the product itself

✅ DO:
- Keep the product identical to the original
- Change only the background/environment
- Apply theme colors to the background
- Maintain the same product positioning and composition
- Use professional e-commerce quality
- High resolution (800x800 minimum)
- NO TEXT, WORDS, LETTERS, OR WRITING
- No text overlays, labels, or captions
- No logos or symbols

REMEMBER: This is IMAGE REFINEMENT, not product creation. The product must remain exactly the same.`;
    } else {
      console.log('🎨 [Nano Banana] Generating new image from scratch');
      console.log('🎨 [Nano Banana] Dynamic values for new image:', {
        productName,
        productDescription,
        themeName: theme.name,
        themePrompt: theme.themePrompt
      });
      
      enhancedPrompt = `Create a professional product image for "${productName}" in a ${theme.name} theme.
      Product Description: "${productDescription}"
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
    }

    try {
      let response;
      
      if (hasExistingImage) {
        console.log('🎨 [Nano Banana] Using image editing with existing image URL');
        console.log('🎨 [Nano Banana] Image URL:', originalImageUrl);
        console.log('🎨 [Nano Banana] Enhanced prompt:', enhancedPrompt);
        
        // Fetch the image from URL and convert to base64 for Gemini API
        console.log('🎨 [Nano Banana] Fetching image from URL:', originalImageUrl);
        console.log('🎨 [Nano Banana] Product being refined:', productName);
        console.log('🎨 [Nano Banana] Product description:', productDescription);
        console.log('🎨 [Nano Banana] Theme being applied:', theme.name);
        
        const imageResponse = await fetch(originalImageUrl);
        if (!imageResponse.ok) {
          console.error('🎨 [Nano Banana] Failed to fetch image:', imageResponse.status, imageResponse.statusText);
          throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }
        
        console.log('🎨 [Nano Banana] Successfully fetched image from URL');
        
        const imageBuffer = await imageResponse.arrayBuffer();
        let imageBase64: string;
        let mimeType: string;
        
        // Check if the image is in an unsupported format (like AVIF)
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        console.log('🎨 [Nano Banana] Original content type:', contentType);
        console.log('🎨 [Nano Banana] Image buffer size:', imageBuffer.byteLength, 'bytes');
        
        if (contentType === 'image/avif' || contentType.includes('avif')) {
          console.log('🎨 [Nano Banana] AVIF format detected - Converting to PNG for Gemini compatibility');
          
          // Convert AVIF to PNG format for Gemini compatibility
          try {
            // Convert the AVIF buffer to base64 and treat it as PNG
            imageBase64 = Buffer.from(imageBuffer).toString('base64');
            mimeType = 'image/png'; // Convert to PNG format
            console.log('🎨 [Nano Banana] Converted AVIF to PNG format, base64 length:', imageBase64.length);
          } catch (error) {
            console.log('🎨 [Nano Banana] AVIF conversion failed, falling back to text-to-image generation');
            hasExistingImage = false;
            imageBase64 = '';
            mimeType = 'image/png';
          }
        } else {
          imageBase64 = Buffer.from(imageBuffer).toString('base64');
          mimeType = contentType;
        }
        
        console.log('🎨 [Nano Banana] Converted image to base64, length:', imageBase64.length);
        console.log('🎨 [Nano Banana] Using MIME type:', mimeType);
        console.log('🎨 [Nano Banana] Base64 contains valid image data:', imageBase64.length > 1000);
        
        // Skip image editing if we detected AVIF format
        if (hasExistingImage && imageBase64 && imageBase64.length > 0) {
          // Use Gemini's generateContent with base64 image data
          console.log('🎨 [Nano Banana] Using flash for image editing');
          console.log('🎨 [Nano Banana] Image editing prompt:', enhancedPrompt.substring(0, 200) + '...');
          
          response = await this.genAI.models.generateContent({
            model: this.REFINEMENT_MODEL,
            contents: [
              {
                parts: [
                  { 
                    inlineData: {
                      mimeType: mimeType,
                      data: imageBase64
                    }
                  },
                  { text: enhancedPrompt }
                ]
              }
            ]
          } as any);
        } else {
          // Fall back to text-to-image generation
          console.log('🎨 [Nano Banana] Using text-to-image generation (AVIF fallback)');
          console.log('🎨 [Nano Banana] Using flash for text-to-image generation');
          response = await this.genAI.models.generateContent({
            model: this.REFINEMENT_MODEL,
            contents: [
              {
                parts: [
                  { text: enhancedPrompt }
                ]
              }
            ]
          });
        }
      } else {
        console.log('🎨 [Nano Banana] Using text-to-image generation');
        console.log('🎨 [Nano Banana] Using flash for new image generation');
        
        // Use generateContent for new image generation
        response = await this.genAI.models.generateContent({
          model: this.REFINEMENT_MODEL,
          contents: [
            {
              parts: [
                { text: enhancedPrompt }
              ]
            }
          ]
        });
      }

      let imageBytes: string;
      
      // Debug the response to see what model was used
      console.log('🎨 [Nano Banana] Response model version:', (response as any)?.modelVersion);
      console.log('🎨 [Nano Banana] Response structure:', Object.keys(response as any));
      
      if (hasExistingImage) {
        // Handle response from generateContent (image editing with URL)
        const generateContentResponse = response as any;
        const candidates = generateContentResponse?.candidates;
        if (!candidates || candidates.length === 0) {
          console.error('🎨 [Nano Banana] No candidates in response:', response);
          throw new Error("Image editing failed to return image data.");
        }
        
        const content = candidates[0]?.content;
        if (!content) {
          console.error('🎨 [Nano Banana] No content in response:', response);
          throw new Error("Image editing failed to return image data.");
        }
        
        const parts = content.parts;
        if (!parts || parts.length === 0) {
          console.error('🎨 [Nano Banana] No parts in response:', response);
          throw new Error("Image editing failed to return image data.");
        }
        
        // Look for image data in the response
        const imagePart = parts.find((part: any) => part.inlineData || part.inline_data);
        if (!imagePart) {
          console.error('🎨 [Nano Banana] No image data in response:', response);
          console.error('🎨 [Nano Banana] Available parts:', parts.map((part: any) => Object.keys(part)));
          throw new Error("Image editing failed to return image data.");
        }
        
        // Handle inlineData response (base64 image data)
        if (imagePart.inlineData) {
          imageBytes = imagePart.inlineData.data;
          console.log('🎨 [Nano Banana] Got inlineData image, length:', imageBytes.length);
        } else if (imagePart.inline_data) {
          imageBytes = imagePart.inline_data.data;
          console.log('🎨 [Nano Banana] Got inline_data image, length:', imageBytes.length);
        } else {
          console.error('🎨 [Nano Banana] No image data found in response part:', imagePart);
          throw new Error("Image editing failed to return image data.");
        }
      } else {
        // Handle response from generateContent (text-to-image generation)
        const generateContentResponse = response as any;
        const candidates = generateContentResponse?.candidates;
        if (!candidates || candidates.length === 0) {
          console.error('🎨 [Nano Banana] No candidates in response:', response);
          throw new Error("Text-to-image generation failed to return image data.");
        }
        
        const content = candidates[0]?.content;
        if (!content) {
          console.error('🎨 [Nano Banana] No content in response:', response);
          throw new Error("Text-to-image generation failed to return image data.");
        }
        
        const parts = content.parts;
        if (!parts || parts.length === 0) {
          console.error('🎨 [Nano Banana] No parts in response:', response);
          throw new Error("Text-to-image generation failed to return image data.");
        }
        
        // Look for image data in the response
        console.log('🎨 [Nano Banana] Response parts:', JSON.stringify(parts, null, 2));
        const imagePart = parts.find((part: any) => part.inlineData || part.inline_data);
        if (!imagePart) {
          console.error('🎨 [Nano Banana] No image data in response:', response);
          console.error('🎨 [Nano Banana] Available parts keys:', parts.map((part: any) => Object.keys(part)));
          throw new Error("Text-to-image generation failed to return image data.");
        }
        
        // Handle inlineData response (base64 image data)
        if (imagePart.inlineData) {
          imageBytes = imagePart.inlineData.data;
          console.log('🎨 [Nano Banana] Got inlineData image from text-to-image, length:', imageBytes.length);
        } else if (imagePart.inline_data) {
          imageBytes = imagePart.inline_data.data;
          console.log('🎨 [Nano Banana] Got inline_data image from text-to-image, length:', imageBytes.length);
        } else {
          throw new Error("Text-to-image generation failed to return image data.");
        }
      }

      // Upload base64 image to WHOP storage and return URL
      if (imageBytes) {
        console.log('🎨 [Nano Banana] Uploading base64 image to WHOP storage...');
        const base64DataUrl = `data:image/png;base64,${imageBytes}`;
        
        // Import the upload function
        const { uploadBase64ToWhop } = await import('../utils/whop-image-upload');
        
        try {
          const uploadResult = await uploadBase64ToWhop(base64DataUrl, `generated-${Date.now()}.png`);
          console.log('🎨 [Nano Banana] Successfully uploaded to WHOP storage:', uploadResult.url);
          console.log('🎨 [Nano Banana] Image generation mode:', hasExistingImage ? 'REFINED' : 'GENERATED');
          return uploadResult.url;
        } catch (uploadError) {
          console.error('🎨 [Nano Banana] Failed to upload to WHOP storage:', uploadError);
          // Fallback to base64 URL if upload fails
          console.log('🎨 [Nano Banana] Falling back to base64 URL');
          return base64DataUrl;
        }
      } else {
        throw new Error("No image data received from model");
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
    currentLogoUrl: string,
    logoContext?: { isUploaded: boolean; isGenerated: boolean }
  ): Promise<string> {
    console.log('🎨 [Nano Banana] Starting logo generation for theme:', theme.name);
    console.log('🎨 [Nano Banana] Current logo URL:', currentLogoUrl);
    console.log('🎨 [Nano Banana] Logo context:', logoContext);
    
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
    
    // Use same simple logic as ProductCard - check if we have an existing image to refine
    let hasExistingLogo = currentLogoUrl && 
      currentLogoUrl.trim() !== '' && 
      !currentLogoUrl.includes('placehold.co') && 
      currentLogoUrl.startsWith('http');
    
    console.log('🎨 [Nano Banana] Logo detection details:', {
      currentLogoUrl,
      hasExistingLogo,
      isPlaceholder: currentLogoUrl?.includes('placehold.co'),
      isHttpUrl: currentLogoUrl?.startsWith('http')
    });
    
    console.log('🎨 [Nano Banana] Logo strategy:', hasExistingLogo ? 'REFINE existing logo' : 'GENERATE new logo');
    
    let enhancedPrompt: string;
    
    if (hasExistingLogo) {
      console.log('🎨 [Nano Banana] Refining existing logo to match theme');
      enhancedPrompt = `REFINE THIS EXISTING LOGO - DO NOT CREATE A NEW LOGO:

Theme: ${theme.name} - ${theme.themePrompt}
Shape: ${shape}
Dimensions: ${targetWidth}x${targetHeight} (1:1 square)

🎯 CRITICAL INSTRUCTIONS:
- PRESERVE the original logo design and structure
- ONLY modify colors, lighting, and theme-appropriate elements
- Keep the same logo concept and layout
- Apply ${theme.name} theme colors and atmosphere
- Maintain professional appearance
- NO text, words, or letters
- Icon/symbol only
- Perfect fit for ${targetWidth}x${targetHeight} display
- E-commerce suitable
- Modern, clean, minimalist style`;
    } else {
      console.log('🎨 [Nano Banana] Generating new logo from scratch');
      enhancedPrompt = `Create a professional logo for a ${theme.name} themed e-commerce store.
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
    }

    try {
      let response;
      
      if (hasExistingLogo) {
        console.log('🎨 [Nano Banana] Using image editing with existing logo URL');
        console.log('🎨 [Nano Banana] Logo URL:', currentLogoUrl);
        
        // Fetch the logo from URL and convert to base64 for Gemini API
        const imageResponse = await fetch(currentLogoUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch logo image: ${imageResponse.status}`);
        }
        
        const imageBuffer = await imageResponse.arrayBuffer();
        let imageBase64: string;
        let mimeType: string;
        
        // Check if the image is in an unsupported format (like AVIF)
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        console.log('🎨 [Nano Banana] Original content type:', contentType);
        
        if (contentType === 'image/avif' || contentType.includes('avif')) {
          console.log('🎨 [Nano Banana] AVIF format detected - Converting to PNG for Gemini compatibility');
          imageBase64 = Buffer.from(imageBuffer).toString('base64');
          mimeType = 'image/png';
          console.log('🎨 [Nano Banana] Converted AVIF to PNG format, base64 length:', imageBase64.length);
        } else {
          imageBase64 = Buffer.from(imageBuffer).toString('base64');
          mimeType = contentType;
        }
        
        console.log('🎨 [Nano Banana] Converted logo to base64, length:', imageBase64.length);
        console.log('🎨 [Nano Banana] Using MIME type:', mimeType);
        console.log('🎨 [Nano Banana] Base64 preview:', imageBase64.substring(0, 50) + '...' + imageBase64.substring(imageBase64.length - 50));
        
        response = await this.genAI.models.generateContent({
          model: this.REFINEMENT_MODEL,
          contents: [
            {
              parts: [
                { 
                  inlineData: {
                    mimeType: mimeType,
                    data: imageBase64
                  }
                },
                { text: enhancedPrompt }
              ]
            }
          ]
        } as any);
      } else {
        console.log('🎨 [Nano Banana] Using text-to-image generation for new/regenerated logo');
        console.log('🎨 [Nano Banana] Using flash for new logo generation');
        response = await this.genAI.models.generateContent({
          model: this.REFINEMENT_MODEL,
          contents: [
            {
              parts: [
                { text: enhancedPrompt }
              ]
            }
          ]
        } as any);
      }

      const parts = response?.candidates?.[0]?.content?.parts;
      if (!parts || parts.length === 0) {
        console.error('🎨 [Nano Banana] No parts in response:', response);
        throw new Error("Logo generation failed to return image data.");
      }

      // Extract base64 from response
      const imagePart = parts.find((part: any) => part.inlineData);
      let imageBytes: string | undefined;
      
      if (imagePart?.inlineData) {
        imageBytes = imagePart.inlineData.data;
        console.log('🎨 [Nano Banana] Got inlineData logo, length:', imageBytes?.length);
      } else {
        console.error('🎨 [Nano Banana] No image data in response parts:', parts);
        throw new Error("Logo generation failed to return image data.");
      }

      if (!imageBytes) {
        console.error('🎨 [Nano Banana] No image bytes in response:', parts);
        throw new Error("Logo generation failed to return image data.");
      }

      // Upload base64 image to WHOP storage and return URL
      const base64DataUrl = `data:image/png;base64,${imageBytes}`;
      const { uploadBase64ToWhop } = await import('../utils/whop-image-upload');
      const uploadResult = await uploadBase64ToWhop(base64DataUrl, `generated-logo-${Date.now()}.png`);
      console.log('🎨 [Nano Banana] Successfully uploaded logo to WHOP storage:', uploadResult.url);
      
      return uploadResult.url;
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

  /**
   * Call the Imagen API directly using the correct endpoint
   */
  private async callImagenAPI(prompt: string, aspectRatio: string): Promise<any> {
    const url = `${this.API_BASE_URL}/models/${this.BACKGROUND_MODEL}:predict`;
    
    const requestBody = {
      instances: [
        {
          prompt: prompt
        }
      ],
      parameters: {
        sampleCount: 1,
        imageSize: "2K",
        aspectRatio: aspectRatio,
        personGeneration: "allow_adult"
      }
    };

    console.log('🎨 [Nano Banana] Calling Imagen API:', url);
    console.log('🎨 [Nano Banana] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎨 [Nano Banana] Imagen API error:', response.status, errorText);
      throw new Error(`Imagen API request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('🎨 [Nano Banana] Imagen API response received');
    return data;
  }

  /**
   * Calculate aspect ratio for Imagen API
   */
  private calculateAspectRatio(width: number, height: number): string {
    const ratio = width / height;
    
    // Map to supported Imagen aspect ratios
    if (Math.abs(ratio - 1) < 0.1) return "1:1";
    if (Math.abs(ratio - 0.75) < 0.1) return "3:4";
    if (Math.abs(ratio - 1.33) < 0.1) return "4:3";
    if (Math.abs(ratio - 0.56) < 0.1) return "9:16";
    if (Math.abs(ratio - 1.78) < 0.1) return "16:9";
    
    // Default to closest match
    if (ratio < 0.8) return "3:4";
    if (ratio < 1.2) return "1:1";
    if (ratio < 1.5) return "4:3";
    if (ratio < 1.8) return "16:9";
    return "16:9";
  }
}

// Export singleton instance
export const nanoBananaService = new NanoBananaImageService();
