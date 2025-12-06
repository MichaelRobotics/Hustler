// AI Service for Seasonal Store
// This file contains client-side functions that make API calls to server-side endpoints

import { 
  measureIframeContainer, 
  validateImageCoverage, 
  resizeImageToFit,
  getOptimalImageDimensions 
} from '../utils/iframeDimensions';

// Utility for exponential backoff retry logic
const retryFetch = async (url: string, options: RequestInit, maxRetries = 5): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error as Error;
      const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(`Max retries reached. Last error: ${lastError?.message}`);
};

// Utility to convert file to Base64 data URL
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Return base64 part only
    };
    reader.onerror = error => reject(error);
  });
};

// Utility to convert emoji to SVG data URL
export const emojiToSvgDataURL = (emoji: string): string => {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="90">${emoji}</text>
  </svg>`;
  const base64Svg = btoa(unescape(encodeURIComponent(svgContent)));
  return `data:image/svg+xml;base64,${base64Svg}`;
};

// Generate product text using AI
export const generateProductText = async (
  productName: string, 
  productDescription: string, 
  theme: any
): Promise<{ newName: string; newDescription: string }> => {
  try {
    const requestBody = {
      productName,
      productDescription,
      theme
    };
    
    console.log('🎯 [Frontend] Sending request to generate-product-text:', requestBody);
    
    const response = await retryFetch('/api/seasonal-store/generate-product-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Product text generation failed');
    }
    return data.data;
  } catch (error) {
    console.error('Error generating product text:', error);
    throw new Error(`Failed to generate product text: ${(error as Error).message}`);
  }
};

// Generate emoji match using AI
export const generateEmojiMatch = async (prompt: string): Promise<string> => {
  try {
    console.log('🎯 [AI Service] Starting emoji match generation for prompt:', prompt);
    
    const response = await retryFetch('/api/seasonal-store/generate-emoji-match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    console.log('🎯 [AI Service] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎯 [AI Service] HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const data = await response.json();
    console.log('🎯 [AI Service] Response data:', data);
    return data.emoji;
  } catch (error) {
    console.error('🎯 [AI Service] Error generating emoji match:', error);
    throw new Error(`Failed to generate emoji match: ${(error as Error).message}`);
  }
};

// Generate product image using Nano Banana service
export const generateProductImage = async (
  productName: string, 
  productDescription: string,
  theme: any, 
  originalImageUrl: string
): Promise<string> => {
  try {
    const response = await retryFetch('/api/seasonal-store/generate-product-image-nanobanana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName,
        productDescription,
        theme,
        originalImageUrl
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Product image generation failed');
    }
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating product image:', error);
    throw new Error(`Failed to generate product image: ${(error as Error).message}`);
  }
};

// Generate background image using Nano Banana service with container dimensions
export const generateBackgroundImage = async (
  themePrompt: string, 
  containerDimensions?: { width: number; height: number; aspectRatio: number },
  existingBackgroundUrl?: string,
  backgroundContext?: { isGenerated: boolean; isUploaded: boolean }
): Promise<string> => {
  try {
    const response = await retryFetch('/api/seasonal-store/generate-background-nanobanana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        themePrompt,
        containerDimensions,
        existingBackgroundUrl,
        backgroundContext
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Background generation failed');
    }
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating background image:', error);
    throw new Error(`Failed to generate background image: ${(error as Error).message}`);
  }
};

// Generate logo using Nano Banana service
export const generateLogo = async (
  theme: any, 
  shape: 'round' | 'square', 
  currentLogoUrl: string,
  logoContext?: { isUploaded: boolean; isGenerated: boolean }
): Promise<string> => {
  try {
    const response = await retryFetch('/api/seasonal-store/generate-logo-nanobanana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme,
        shape,
        currentLogoUrl,
        logoContext
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Logo generation failed');
    }
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating logo:', error);
    throw new Error(`Failed to generate logo: ${(error as Error).message}`);
  }
};

// Responsive background generation with iframe container measurement
export const generateResponsiveBackgroundImage = async (
  themePrompt: string, 
  existingBackgroundUrl?: string,
  backgroundContext?: { isGenerated: boolean; isUploaded: boolean }
): Promise<string> => {
  try {
    console.log('🎨 [Responsive AI] Starting responsive background generation...');
    console.log('🎨 [Responsive AI] Existing background URL:', existingBackgroundUrl);
    
    // Measure iframe container dimensions
    const containerDimensions = measureIframeContainer();
    if (!containerDimensions) {
      console.warn('🎨 [Responsive AI] Could not measure container, using fallback dimensions');
      // Fallback to standard dimensions
      return await generateBackgroundImage(themePrompt, undefined, existingBackgroundUrl, backgroundContext);
    }
    
    console.log('🎨 [Responsive AI] Container dimensions:', containerDimensions);
    
    // Generate image with container dimensions
    const imageUrl = await generateBackgroundImage(themePrompt, containerDimensions, existingBackgroundUrl, backgroundContext);
    
    // Validate image coverage
    const validation = await validateImageCoverage(imageUrl, containerDimensions);
    console.log('🎨 [Responsive AI] Image validation:', validation);
    
    if (validation.isValid) {
      console.log('🎨 [Responsive AI] Image fits perfectly, no resizing needed');
      return imageUrl;
    }
    
    if (validation.needsResize && validation.optimalDimensions) {
      console.log('🎨 [Responsive AI] Image needs resizing, optimal dimensions:', validation.optimalDimensions);
      
      try {
        const resizedImageUrl = await resizeImageToFit(
          imageUrl, 
          validation.optimalDimensions.width, 
          validation.optimalDimensions.height
        );
        console.log('🎨 [Responsive AI] Image successfully resized');
        return resizedImageUrl;
      } catch (resizeError) {
        console.error('🎨 [Responsive AI] Resizing failed, using original image:', resizeError);
        return imageUrl;
      }
    }
    
    return imageUrl;
  } catch (error) {
    console.error('🎨 [Responsive AI] Error in responsive background generation:', error);
    
    // Check if it's a quota error - don't retry in that case
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.warn('🎨 [Responsive AI] Quota exceeded, not retrying to avoid double API calls');
      throw error; // Re-throw the quota error instead of retrying
    }
    
    // Only fallback for non-quota errors
    return await generateBackgroundImage(themePrompt, undefined, undefined, backgroundContext);
  }
};