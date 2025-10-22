// Iframe Container Dimension Utilities
// Measures and tracks iframe container dimensions for responsive image generation

import React from 'react';

export interface ContainerDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  devicePixelRatio: number;
}

/**
 * Measure the current iframe container dimensions
 */
export const measureIframeContainer = (): ContainerDimensions | null => {
  if (typeof window === 'undefined') return null;

  try {
    // Try multiple selectors for iframe container with more comprehensive search
    const iframeSelectors = [
      'active-app-container',
      'iframe[src*="localhost"]',
      'iframe[src*="experiences"]',
      'iframe[src*="3000"]',
      'iframe[src*="whop"]',
      'iframe'
    ];
    
    let iframe: HTMLIFrameElement | null = null;
    
    console.log('🎨 [Dimension Debug] Searching for iframe container...');
    
    for (const selector of iframeSelectors) {
      if (selector.startsWith('iframe')) {
        iframe = document.querySelector(selector) as HTMLIFrameElement;
      } else {
        iframe = document.getElementById(selector) as HTMLIFrameElement;
      }
      
      if (iframe) {
        const rect = iframe.getBoundingClientRect();
        console.log(`🎨 [Dimension Debug] Found iframe with selector "${selector}":`, {
          element: iframe,
          rect: rect,
          src: iframe.src,
          width: rect.width,
          height: rect.height
        });
        
        if (rect.width > 0 && rect.height > 0) {
          break;
        }
      }
    }
    
    if (iframe && iframe.getBoundingClientRect().width > 0) {
      const rect = iframe.getBoundingClientRect();
      const dimensions = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        aspectRatio: rect.width / rect.height,
        devicePixelRatio: window.devicePixelRatio || 1
      };
      
      console.log('🎨 [Dimension Debug] Iframe container found:', {
        element: iframe,
        rect: rect,
        dimensions: dimensions,
        windowSize: { width: window.innerWidth, height: window.innerHeight }
      });
      
      return dimensions;
    }

    // Fallback to window dimensions if iframe not found
    const fallbackDimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      aspectRatio: window.innerWidth / window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
    
    console.log('🎨 [Dimension Debug] Iframe not found, using window dimensions:', fallbackDimensions);
    return fallbackDimensions;
  } catch (error) {
    console.error('Error measuring iframe container:', error);
    return null;
  }
};

/**
 * Get optimal image dimensions for the container
 * Ensures the image will cover the container without gaps
 */
export const getOptimalImageDimensions = (container: ContainerDimensions): { width: number; height: number } => {
  // Add 20% padding to ensure full coverage
  const paddingFactor = 1.2;
  
  return {
    width: Math.round(container.width * paddingFactor),
    height: Math.round(container.height * paddingFactor)
  };
};

/**
 * Validate if an image will properly cover the container
 */
export const validateImageCoverage = (
  imageUrl: string, 
  container: ContainerDimensions
): Promise<{ isValid: boolean; needsResize: boolean; optimalDimensions?: { width: number; height: number } }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const imageAspectRatio = img.naturalWidth / img.naturalHeight;
      const containerAspectRatio = container.aspectRatio;
      
      console.log('🎨 [Validation Debug] Image vs Container:', {
        imageDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        imageAspectRatio: imageAspectRatio,
        containerDimensions: { width: container.width, height: container.height },
        containerAspectRatio: containerAspectRatio,
        aspectRatioDiff: Math.abs(imageAspectRatio - containerAspectRatio)
      });
      
      // Check if image aspect ratio matches container (stricter tolerance)
      const aspectRatioDiff = Math.abs(imageAspectRatio - containerAspectRatio);
      const needsResize = aspectRatioDiff > 0.05; // 5% tolerance (stricter)
      
      // Check if image is large enough (with some buffer)
      const isLargeEnough = img.naturalWidth >= container.width * 0.9 && img.naturalHeight >= container.height * 0.9;
      
      const result = {
        isValid: !needsResize && isLargeEnough,
        needsResize: needsResize || !isLargeEnough,
        optimalDimensions: (needsResize || !isLargeEnough) ? getOptimalImageDimensions(container) : undefined
      };
      
      console.log('🎨 [Validation Debug] Validation result:', result);
      resolve(result);
    };
    img.onerror = () => {
      console.error('🎨 [Validation Debug] Failed to load image for validation');
      resolve({ isValid: false, needsResize: true });
    };
    img.src = imageUrl;
  });
};

/**
 * Resize an image to fit the container perfectly
 */
export const resizeImageToFit = (
  imageUrl: string, 
  targetWidth: number, 
  targetHeight: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        console.log('🎨 [Resize Debug] Original image dimensions:', {
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight
        });
        
        console.log('🎨 [Resize Debug] Target dimensions:', {
          width: targetWidth,
          height: targetHeight,
          aspectRatio: targetWidth / targetHeight
        });
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        // Use 'cover' style resizing to maintain aspect ratio while filling the canvas
        const sourceAspectRatio = img.naturalWidth / img.naturalHeight;
        const targetAspectRatio = targetWidth / targetHeight;
        
        let sourceX = 0, sourceY = 0, sourceWidth = img.naturalWidth, sourceHeight = img.naturalHeight;
        
        if (sourceAspectRatio > targetAspectRatio) {
          // Source is wider, crop width
          sourceWidth = img.naturalHeight * targetAspectRatio;
          sourceX = (img.naturalWidth - sourceWidth) / 2;
        } else {
          // Source is taller, crop height
          sourceHeight = img.naturalWidth / targetAspectRatio;
          sourceY = (img.naturalHeight - sourceHeight) / 2;
        }
        
        console.log('🎨 [Resize Debug] Crop parameters:', {
          sourceX, sourceY, sourceWidth, sourceHeight
        });
        
        // Draw image with proper cropping to maintain aspect ratio
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, targetWidth, targetHeight
        );
        
        // Convert to data URL
        const resizedImageUrl = canvas.toDataURL('image/png', 0.9);
        console.log('🎨 [Resize Debug] Resized image created successfully');
        resolve(resizedImageUrl);
      } catch (error) {
        console.error('🎨 [Resize Debug] Error during resizing:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      console.error('🎨 [Resize Debug] Failed to load image for resizing');
      reject(new Error('Failed to load image for resizing'));
    };
    img.src = imageUrl;
  });
};

/**
 * Hook to track iframe container dimension changes
 */
export const useIframeDimensions = () => {
  const [dimensions, setDimensions] = React.useState<ContainerDimensions | null>(null);
  
  React.useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = measureIframeContainer();
      if (newDimensions) {
        setDimensions(newDimensions);
      }
    };
    
    // Initial measurement
    updateDimensions();
    
    // Listen for resize events
    window.addEventListener('resize', updateDimensions);
    
    // Listen for iframe load events
    const iframe = document.getElementById('active-app-container') as HTMLIFrameElement;
    if (iframe) {
      iframe.addEventListener('load', updateDimensions);
    }
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (iframe) {
        iframe.removeEventListener('load', updateDimensions);
      }
    };
  }, []);
  
  return dimensions;
};
