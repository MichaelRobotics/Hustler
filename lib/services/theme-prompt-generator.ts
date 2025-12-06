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

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    validateEnvironment();
    genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return genAI;
};

/**
 * Generate theme prompt from banner image using Gemini Flash
 * @param imageUrl - The banner image URL (sourceUrl from productResult.company.bannerImage.sourceUrl)
 * @returns Theme prompt string or null if generation fails
 */
export async function generateThemePromptFromImage(imageUrl: string): Promise<string | null> {
  try {
    const ai = getGenAI();
    
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    console.log('🎨 [Theme Prompt Generator] Analyzing banner image with Gemini Flash...');
    
    // Use Gemini Flash to analyze the image
    const prompt = `Analyze this company banner image and generate a detailed theme prompt for a seasonal store. 
    Focus on:
    - Dominant colors and color palette
    - Style and mood (e.g., modern, vintage, minimalist, bold)
    - Branding elements and visual identity
    - Overall aesthetic and atmosphere
    
    Generate a concise theme prompt (2-3 sentences) that captures the essence of this brand's visual identity for use in creating a seasonal store theme.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: contentType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    } as any);
    
    const themePrompt = response.text || '';
    console.log('✅ [Theme Prompt Generator] Generated theme prompt:', themePrompt);
    
    return themePrompt.trim();
  } catch (error) {
    console.error('❌ [Theme Prompt Generator] Error generating theme prompt:', error);
    return null;
  }
}

/**
 * Get default theme prompt (from default theme)
 * @returns Default theme prompt string
 */
export function getDefaultThemePrompt(): string {
  // Return a default theme prompt - this should match the default theme's prompt
  return "A modern, clean seasonal store with vibrant colors and engaging product displays";
}

