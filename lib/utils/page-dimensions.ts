// Page Dimensions Utility
// Provides functions to get current page/viewport dimensions for image generation

export interface PageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  devicePixelRatio: number;
}

/**
 * Get current page dimensions from the browser
 * This function should be called on the client side
 */
export const getPageDimensions = (): PageDimensions => {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      width: 1920,
      height: 1080,
      aspectRatio: 16/9,
      devicePixelRatio: 1
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const aspectRatio = width / height;

  return {
    width,
    height,
    aspectRatio,
    devicePixelRatio
  };
};

/**
 * Get optimized dimensions for background images
 * Ensures the image will cover the full viewport
 */
export const getBackgroundDimensions = (): PageDimensions => {
  const dimensions = getPageDimensions();
  
  // For backgrounds, we want to ensure full coverage
  // Use a slightly larger resolution to account for high-DPI displays
  const scaleFactor = Math.max(1, dimensions.devicePixelRatio);
  
  return {
    width: Math.ceil(dimensions.width * scaleFactor),
    height: Math.ceil(dimensions.height * scaleFactor),
    aspectRatio: dimensions.aspectRatio,
    devicePixelRatio: dimensions.devicePixelRatio
  };
};

/**
 * Get optimized dimensions for product images
 * Uses square format by default, but can be customized
 */
export const getProductDimensions = (customSize?: number): PageDimensions => {
  const baseSize = customSize || 800;
  const dimensions = getPageDimensions();
  
  // For products, we typically want square images
  // But we can adjust based on the container size
  const scaleFactor = Math.max(1, dimensions.devicePixelRatio);
  const size = Math.ceil(baseSize * scaleFactor);
  
  return {
    width: size,
    height: size,
    aspectRatio: 1,
    devicePixelRatio: dimensions.devicePixelRatio
  };
};

/**
 * Get responsive dimensions based on screen size
 * Returns appropriate dimensions for different screen sizes
 */
export const getResponsiveDimensions = (type: 'background' | 'product'): PageDimensions => {
  const dimensions = getPageDimensions();
  
  if (type === 'background') {
    return getBackgroundDimensions();
  } else {
    // For products, use a size that works well on the current screen
    const screenSize = Math.min(dimensions.width, dimensions.height);
    const productSize = Math.min(800, Math.max(400, screenSize * 0.3));
    return getProductDimensions(productSize);
  }
};

/**
 * Validate dimensions to ensure they're reasonable
 */
export const validateDimensions = (dimensions: PageDimensions): boolean => {
  return (
    dimensions.width > 0 &&
    dimensions.height > 0 &&
    dimensions.width <= 4096 && // Max reasonable width
    dimensions.height <= 4096 && // Max reasonable height
    dimensions.aspectRatio > 0 &&
    dimensions.aspectRatio < 10 // Reasonable aspect ratio range
  );
};

/**
 * Get dimensions with fallback for invalid values
 */
export const getSafeDimensions = (type: 'background' | 'product'): PageDimensions => {
  const dimensions = getResponsiveDimensions(type);
  
  if (!validateDimensions(dimensions)) {
    console.warn('Invalid dimensions detected, using fallback');
    return type === 'background' 
      ? { width: 1920, height: 1080, aspectRatio: 16/9, devicePixelRatio: 1 }
      : { width: 800, height: 800, aspectRatio: 1, devicePixelRatio: 1 };
  }
  
  return dimensions;
};
