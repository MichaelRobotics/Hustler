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
      "accent": "Tailwind CSS classes for buttons and interactive elements. Examples: 'bg-blue-600 hover:bg-blue-700 text-white ring-blue-500', 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white ring-purple-400', 'bg-emerald-500 hover:bg-emerald-600 text-white ring-emerald-400', 'bg-orange-500 hover:bg-orange-600 text-white ring-orange-400'",
      "card": "Tailwind CSS classes for product cards. Examples: 'bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30', 'bg-gradient-to-br from-white/95 to-gray-50/95 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-purple-500/25', 'bg-amber-50/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-amber-500/30', 'bg-slate-50/90 backdrop-blur-md shadow-xl hover:shadow-2xl shadow-slate-500/25'",
      "text": "Tailwind CSS classes for body text. Examples: 'text-gray-800', 'text-slate-700', 'text-gray-900', 'text-zinc-800', 'text-neutral-800'",
      "welcomeColor": "Tailwind CSS classes for welcome/accent text. Examples: 'text-blue-200', 'text-purple-200', 'text-emerald-200', 'text-orange-200', 'text-cyan-200', 'text-pink-200', 'text-yellow-200', 'text-indigo-200'",
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

    Examples of good theme combinations:
    - Ocean theme: accent='bg-gradient-to-r from-cyan-500 to-blue-600', card='bg-white/90 backdrop-blur-sm shadow-xl shadow-cyan-500/30', welcomeColor='text-cyan-200'
    - Forest theme: accent='bg-gradient-to-r from-green-500 to-emerald-600', card='bg-white/90 backdrop-blur-sm shadow-xl shadow-green-500/30', welcomeColor='text-green-200'
    - Sunset theme: accent='bg-gradient-to-r from-orange-500 to-pink-600', card='bg-white/90 backdrop-blur-sm shadow-xl shadow-orange-500/30', welcomeColor='text-orange-200'
    - Galaxy theme: accent='bg-gradient-to-r from-purple-500 to-indigo-600', card='bg-white/90 backdrop-blur-sm shadow-xl shadow-purple-500/30', welcomeColor='text-purple-200'

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
