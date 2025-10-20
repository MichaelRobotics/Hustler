# Nano Banana Image Generation Setup

## Overview

This document explains the complete setup for using nano-banana (based on Context7 documentation) for AI image generation in the Seasonal Store application.

## Architecture

### Backend Service (`/lib/services/nanobananaService.ts`)

The nano-banana service provides a clean, professional interface for image generation using Google's Gemini 2.5 Flash Image model.

**Key Features:**
- ✅ **Background Image Generation**: High-quality, cinematic backgrounds for seasonal themes
- ✅ **Product Image Generation**: Professional e-commerce product images
- ✅ **Logo Generation**: Theme-appropriate logos with shape variations
- ✅ **Image Variations**: Multiple styles and variations support
- ✅ **Error Handling**: Comprehensive error handling and logging

**Service Methods:**
```typescript
// Generate background images
await nanoBananaService.generateBackgroundImage(themePrompt: string): Promise<string>

// Generate product images
await nanoBananaService.generateProductImage(productName: string, theme: any, originalImageUrl: string): Promise<string>

// Generate logos
await nanoBananaService.generateLogo(theme: any, shape: 'round' | 'square', currentLogoUrl: string): Promise<string>

// Generate image variations
await nanoBananaService.generateImageVariations(request: ImageGenerationRequest): Promise<ImageGenerationResponse>
```

### API Endpoints

#### New Nano Banana Endpoints
- **`/api/seasonal-store/generate-background-nanobanana`**: Background image generation using Imagen 3.0
- **`/api/seasonal-store/generate-product-image-nanobanana`**: Product image generation using Imagen 3.0
- **`/api/seasonal-store/generate-logo-nanobanana`**: Logo generation using Imagen 3.0
- **Enhanced Error Handling**: Better error messages and success indicators
- **Improved Logging**: Detailed logging for debugging

#### Legacy Endpoints (Still Available)
- **`/api/seasonal-store/generate-background-image`**: Original implementation
- **`/api/seasonal-store/generate-product-image`**: Original product image generation
- **`/api/seasonal-store/generate-logo`**: Original logo generation

### Frontend Integration

The client-side `aiService.ts` has been updated to use the new nano-banana endpoint:

```typescript
// Updated to use nano-banana service
export const generateBackgroundImage = async (themePrompt: string): Promise<string> => {
  const response = await retryFetch('/api/seasonal-store/generate-background-nanobanana', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themePrompt }),
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Background generation failed');
  }
  return data.imageUrl;
};
```

## Setup Requirements

### Environment Variables

Ensure your `.env.local` file contains:

```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Important**: Replace `your_actual_gemini_api_key_here` with your real Google AI Studio API key.

### Dependencies

The setup uses the latest Google Gen AI SDK:

```json
{
  "@google/genai": "^0.21.0"
}
```

**Installation:**
```bash
pnpm add @google/genai
```

## Usage Examples

### 1. Generate Background Image

```typescript
// In your component
const handleGenerateBackground = async () => {
  try {
    const imageUrl = await generateBackgroundImage("A cozy winter forest scene with snow");
    setBackground('generated', imageUrl);
  } catch (error) {
    console.error('Background generation failed:', error);
  }
};
```

### 2. Generate Product Image

```typescript
// In your component
const handleGenerateProductImage = async (product) => {
  try {
    const imageUrl = await generateProductImage(product.name, theme, product.image);
    updateProduct(product.id, { image: imageUrl });
  } catch (error) {
    console.error('Product image generation failed:', error);
  }
};
```

### 3. Generate Logo

```typescript
// In your component
const handleGenerateLogo = async () => {
  try {
    const imageUrl = await generateLogo(theme, 'round', currentLogo.src);
    setLogoAsset(prev => ({ ...prev, src: imageUrl }));
  } catch (error) {
    console.error('Logo generation failed:', error);
  }
};
```

### 4. Generate Product Text Refinement

```typescript
// In your component
const handleRefineProductText = async (product) => {
  try {
    const refinedText = await generateProductText(product.name, product.description, theme);
    updateProduct(product.id, {
      name: refinedText.newName,
      description: refinedText.newDescription
    });
  } catch (error) {
    console.error('Product text refinement failed:', error);
  }
};
```

## Error Handling

The nano-banana service includes comprehensive error handling:

### Common Errors

1. **API Key Missing**: `GEMINI_API_KEY environment variable is required`
2. **Invalid API Key**: `Please set a valid GEMINI_API_KEY in your environment variables`
3. **Generation Failed**: `Background image generation failed: [specific error]`

### Error Response Format

```typescript
{
  success: false,
  error: "Background generation failed",
  details: "Specific error message"
}
```

## Performance Optimizations

### Retry Logic
- **Exponential Backoff**: Automatic retry with increasing delays
- **Max Retries**: 5 attempts before giving up
- **Random Jitter**: Prevents thundering herd problems

### Caching
- **Base64 Data URLs**: Images are returned as data URLs for immediate use
- **No File System**: No temporary files created
- **Memory Efficient**: Direct base64 encoding

## Testing

### Manual Testing

1. **Start the server**: `npm run dev`
2. **Open the app**: Navigate to your seasonal store
3. **Switch to Editor View**: Click the "Editor View" button
4. **Generate Background**: Click the background generation button
5. **Check Console**: Look for nano-banana service logs

### Expected Logs

```
🎨 [Nano Banana Service] Starting background generation with prompt: A cozy winter forest scene
🎨 [Nano Banana Service] Generated image URL length: 1234567
🎨 [Nano Banana API] Generated image URL length: 1234567
```

## Troubleshooting

### Common Issues

1. **"API key is missing"**: Check your `.env.local` file
2. **"No base64 data in response"**: API quota exceeded or model issues
3. **"Background generation failed"**: Check network connection and API key validity

### Debug Steps

1. **Check Environment**: Verify `GEMINI_API_KEY` is set correctly
2. **Check Logs**: Look for detailed error messages in console
3. **Test API Key**: Try generating a simple image first
4. **Check Quotas**: Ensure you haven't exceeded API limits

## Migration from Old System

The new nano-banana service is backward compatible:

- ✅ **Existing Code**: No changes needed in components
- ✅ **Same Interface**: All functions work the same way
- ✅ **Better Errors**: More descriptive error messages
- ✅ **Enhanced Logging**: Better debugging capabilities

## Future Enhancements

### Planned Features

1. **Style Variations**: Multiple artistic styles per image
2. **Batch Generation**: Generate multiple images at once
3. **Image Editing**: Modify existing images with natural language
4. **Caching Layer**: Redis-based caching for generated images
5. **Webhook Support**: Async image generation with callbacks

### API Improvements

1. **Rate Limiting**: Built-in rate limiting for API calls
2. **Image Optimization**: Automatic image compression and optimization
3. **Format Support**: Support for different image formats (WebP, AVIF)
4. **Size Variations**: Multiple resolution options

## Support

For issues with the nano-banana setup:

1. **Check Logs**: Look for detailed error messages
2. **Verify API Key**: Ensure your Gemini API key is valid
3. **Test Endpoints**: Use the new `/generate-background-nanobanana` endpoint
4. **Check Network**: Ensure your server can reach Google's API

The nano-banana service provides a robust, production-ready solution for AI image generation in your seasonal store application.
