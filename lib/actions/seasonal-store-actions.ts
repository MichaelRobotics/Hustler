/**
 * Seasonal Store AI Actions - Server-side AI Integration
 *
 * Contains all AI generation functionality for the seasonal store.
 * Uses the official @google/genai SDK on the server side.
 */

import { GoogleGenAI } from "@google/genai";
import { Theme } from "@/lib/components/store/SeasonalStore/types";
import { nanoBananaService } from "@/lib/services/nanobananaService";

// Custom error types for better error handling
export class SeasonalStoreAIError extends Error {
  constructor(
    message: string,
    public type:
      | "AUTHENTICATION"
      | "NETWORK"
      | "CONTENT"
      | "RATE_LIMIT"
      | "UNKNOWN",
  ) {
    super(message);
    this.name = "SeasonalStoreAIError";
  }
}

export class SeasonalStoreValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeasonalStoreValidationError";
  }
}

/**
 * Validates the API key and environment setup
 * @throws {SeasonalStoreValidationError} If API key is missing or invalid
 */
const validateEnvironment = (): void => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new SeasonalStoreValidationError(
      "GEMINI_API_KEY is not configured. Please check your environment variables.",
    );
  }
  if (apiKey === "your_gemini_api_key_here" || apiKey.includes("test-key")) {
    throw new SeasonalStoreValidationError(
      "Please configure a valid GEMINI_API_KEY in your environment variables.",
    );
  }
};

// Use the correct Google AI API endpoints
const LLM_MODEL = 'gemini-2.5-flash-preview-05-20';
const IMAGE_MODEL = 'gemini-2.5-flash-image-preview';

// Helper function to check if an image URL is a placeholder
const isPlaceholderImage = (url: string): boolean => {
  return url.includes('placehold.co') || url.includes('New+Product') || url.includes('Logo');
};

/**
 * Generates emoji SVG data URL from emoji character
 */
export const emojiToSvgDataURL = (emoji: string): string => {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <text x="50" y="50" font-size="60" text-anchor="middle" dominant-baseline="central">${emoji}</text>
  </svg>`;
  const base64Svg = btoa(unescape(encodeURIComponent(svgContent)));
  return `data:image/svg+xml;base64,${base64Svg}`;
};

/**
 * AI Text Generation for Product Refinement
 */
export const generateProductText = async (productName: string, productDescription: string, theme: Theme) => {
  // Validate environment before making API calls
  validateEnvironment();

  const systemPrompt = `You are a world-class e-commerce copywriter and creative director. The current promotional theme is "${theme.name}". Your task is to rewrite the provided product name and description to be extremely appealing and perfectly aligned with this theme. Be exciting, use relevant thematic vocabulary. 

CRITICAL: The description must be exactly 1 line, maximum 4 words. Keep it short, punchy, and impactful. Examples: "Cozy autumn warmth", "Perfect fall companion", "Seasonal comfort essential".

Your response MUST be a JSON object with "newName" and "newDescription" fields.`;

  const userQuery = `Original Product: Name: "${productName}", Description: "${productDescription}". Rewrite the name and description for the current theme of ${theme.name}.`;

  try {
    const fullPrompt = `${systemPrompt}\n\n${userQuery}`;
    
    // Initialize the Google Gen AI SDK
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await genAI.models.generateContent({
      model: LLM_MODEL,
      contents: fullPrompt,
    });

    const text = response.text;
    
    if (!text) {
      throw new Error("AI text generation failed.");
    }

    let jsonText = text;
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error in generateProductText:", error);
    throw new SeasonalStoreAIError(`Product text generation failed: ${(error as Error).message}`, "UNKNOWN");
  }
};

/**
 * AI Emoji Matching
 */
export const generateEmojiMatch = async (userPrompt: string): Promise<string> => {
  // Validate environment before making API calls
  validateEnvironment();
  
  console.log('🎯 [Server Action] Starting emoji match generation for:', userPrompt);
  
  const systemPrompt = `You are an expert asset sorter. The user will provide a description or a set of emojis. Your task is to select and return the **single best emoji character** that matches the input's thematic description. Your response MUST contain only the emoji character and absolutely no other text, explanation, or punctuation.`;
  const userQuery = `Find the single best emoji for this description: "${userPrompt}"`;

  try {
    const fullPrompt = `${systemPrompt}\n\n${userQuery}`;
    console.log('🎯 [Server Action] Full prompt:', fullPrompt);
    
    // Initialize the Google Gen AI SDK
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    console.log('🎯 [Server Action] Calling Gemini API with model:', LLM_MODEL);
    const response = await genAI.models.generateContent({
      model: LLM_MODEL,
      contents: fullPrompt,
    });

    console.log('🎯 [Server Action] Raw response:', response);
    const rawOutput = response.text || "";
    console.log('🎯 [Server Action] Raw output:', rawOutput);
    
    const trimmedOutput = rawOutput.trim();
    if (!trimmedOutput || trimmedOutput.length > 4) { 
      console.log('🎯 [Server Action] Invalid output length:', trimmedOutput.length);
      throw new Error("AI failed to return a valid single emoji character. Try a more direct prompt.");
    }
    
    console.log('🎯 [Server Action] Returning emoji:', trimmedOutput);
    return trimmedOutput;
  } catch (error) {
    console.error("🎯 [Server Action] Error in generateEmojiMatch:", error);
    throw new SeasonalStoreAIError(`Emoji generation failed: ${(error as Error).message}`, "UNKNOWN");
  }
};

/**
 * AI Image Generation for Products using Nano Banana Service
 */
export const generateProductImage = async (productName: string, theme: Theme, existingImage?: string): Promise<string> => {
  // Validate environment before making API calls
  validateEnvironment();
  
  console.log('🎨 [Nano Banana Service] Starting product image generation for:', productName);
  
  try {
    const imageUrl = await nanoBananaService.generateProductImage(productName, theme, existingImage || '');
    console.log('🎨 [Nano Banana Service] Generated product image URL length:', imageUrl.length);
    
    return imageUrl;
  } catch (error) {
    console.error("Error in generateProductImage:", error);
    throw new SeasonalStoreAIError(`Product image generation failed: ${(error as Error).message}`, "UNKNOWN");
  }
};

/**
 * AI Background Generation using Nano Banana Service
 */
export const generateBackgroundImage = async (themePrompt: string): Promise<string> => {
  // Validate environment before making API calls
  validateEnvironment();
  
  console.log('🎨 [Nano Banana Service] Starting background generation with prompt:', themePrompt);
  
  try {
    const imageUrl = await nanoBananaService.generateBackgroundImage(themePrompt);
    console.log('🎨 [Nano Banana Service] Generated image URL length:', imageUrl.length);
    console.log('🎨 [Nano Banana Service] Generated image URL preview:', imageUrl.substring(0, 100) + '...');
    
    return imageUrl;
  } catch (error) {
    console.error("Error in generateBackgroundImage:", error);
    throw new SeasonalStoreAIError(`Background image generation failed: ${(error as Error).message}`, "UNKNOWN");
  }
};

/**
 * AI Logo Generation using Nano Banana Service
 */
export const generateLogo = async (theme: Theme, shape: 'round' | 'square', existingLogo?: string): Promise<string> => {
  // Validate environment before making API calls
  validateEnvironment();
  
  console.log('🎨 [Nano Banana Service] Starting logo generation for theme:', theme.name);
  
  try {
    const imageUrl = await nanoBananaService.generateLogo(theme, shape, existingLogo || '');
    console.log('🎨 [Nano Banana Service] Generated logo URL length:', imageUrl.length);
    
    return imageUrl;
  } catch (error) {
    console.error("Error in generateLogo:", error);
    throw new SeasonalStoreAIError(`Logo generation failed: ${(error as Error).message}`, "UNKNOWN");
  }
};

