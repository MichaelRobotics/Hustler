import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    validateEnvironment();
    
    const { themeName, themePrompt } = await request.json();
    
    if (!themeName || !themePrompt) {
      return NextResponse.json(
        { error: 'Theme name and prompt are required' },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Generate theme colors and properties using AI
    const themeGenerationPrompt = `Generate a complete e-commerce theme design for "${themeName}" based on this description: "${themePrompt}".

    Create a JSON response with the following structure:
    {
      "accent": "Tailwind CSS classes for buttons and interactive elements (e.g., 'bg-blue-600 hover:bg-blue-700 text-white ring-blue-500')",
      "card": "Tailwind CSS classes for product cards (e.g., 'bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30')",
      "text": "Tailwind CSS classes for body text (e.g., 'text-gray-800')",
      "welcomeColor": "Tailwind CSS classes for welcome/accent text (e.g., 'text-blue-200')",
      "aiMessage": "A welcoming message for this theme (e.g., 'Welcome to our Neon Summer collection!')",
      "emojiTip": "Relevant emojis for this theme (e.g., '🌊🏄‍♀️☀️')",
      "colorPalette": {
        "primary": "hex color code",
        "secondary": "hex color code", 
        "accent": "hex color code",
        "text": "hex color code",
        "background": "hex color code"
      }
    }

    Requirements:
    - Use colors that match the theme description
    - Ensure good contrast and readability
    - Make it visually appealing and professional
    - Use appropriate Tailwind CSS classes
    - The accent color should be vibrant and eye-catching
    - The card design should be modern with backdrop blur effects
    - Text colors should be readable and theme-appropriate
    - Welcome color should complement the accent color
    - AI message should be engaging and theme-specific
    - Emojis should be relevant to the theme

    Return ONLY the JSON object, no additional text.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: themeGenerationPrompt,
    });
    
    let responseText = response.text || "";
    if (responseText.startsWith("```json")) {
      responseText = responseText
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    }
    
    const themeData = JSON.parse(responseText);

    // Generate background image using Imagen - simplified prompt like existing themes
    const backgroundPrompt = `${themePrompt}. Cinematic, high-resolution background for e-commerce store. Rich colors, no text, no logos, full coverage.`;

    const backgroundResponse = await genAI.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: backgroundPrompt,
      config: {
        numberOfImages: 1,
      },
    });

    const generatedImages = backgroundResponse?.generatedImages;
    let backgroundImageUrl = '';
    
    if (generatedImages && generatedImages.length > 0) {
      const imageBytes = generatedImages[0]?.image?.imageBytes;
      if (imageBytes) {
        backgroundImageUrl = `data:image/png;base64,${imageBytes}`;
      }
    }

    // Create the final theme data
    const finalThemeData = {
      accent: themeData.accent,
      card: themeData.card,
      text: themeData.text,
      welcomeColor: themeData.welcomeColor,
      background: backgroundImageUrl ? `bg-cover bg-center` : `bg-gradient-to-br from-${themeData.colorPalette.primary} to-${themeData.colorPalette.secondary}`,
      backgroundImage: backgroundImageUrl || null,
      aiMessage: themeData.aiMessage,
      emojiTip: themeData.emojiTip,
    };

    return NextResponse.json(finalThemeData);

  } catch (error) {
    console.error('Error generating custom theme:', error);
    return NextResponse.json(
      { error: `Failed to generate custom theme: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
