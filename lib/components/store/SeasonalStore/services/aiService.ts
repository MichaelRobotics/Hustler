// AI Service for Seasonal Store
// This file contains client-side functions that make API calls to server-side endpoints

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
    const response = await retryFetch('/api/seasonal-store/generate-product-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName,
        productDescription,
        theme
      }),
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

// Generate background image using Nano Banana service
export const generateBackgroundImage = async (themePrompt: string): Promise<string> => {
  try {
    const response = await retryFetch('/api/seasonal-store/generate-background-nanobanana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ themePrompt }),
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
  currentLogoUrl: string
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
        currentLogoUrl
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