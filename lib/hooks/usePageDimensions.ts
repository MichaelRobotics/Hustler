import { useState, useEffect } from 'react';
import { PageDimensions, getSafeDimensions } from '@/lib/utils/page-dimensions';

/**
 * Hook to get current page dimensions
 * Automatically updates when window is resized
 */
export const usePageDimensions = () => {
  const [dimensions, setDimensions] = useState<PageDimensions>(() => {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080, aspectRatio: 16/9, devicePixelRatio: 1 };
    }
    return getSafeDimensions('background');
  });

  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = getSafeDimensions('background');
      setDimensions(newDimensions);
    };

    // Set initial dimensions
    updateDimensions();

    // Listen for resize events
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  return dimensions;
};

/**
 * Hook to get background-specific dimensions
 */
export const useBackgroundDimensions = () => {
  const [dimensions, setDimensions] = useState<PageDimensions>(() => {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080, aspectRatio: 16/9, devicePixelRatio: 1 };
    }
    return getSafeDimensions('background');
  });

  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = getSafeDimensions('background');
      setDimensions(newDimensions);
    };

    updateDimensions();

    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  return dimensions;
};

/**
 * Hook to get product-specific dimensions
 */
export const useProductDimensions = (customSize?: number) => {
  const [dimensions, setDimensions] = useState<PageDimensions>(() => {
    if (typeof window === 'undefined') {
      return { width: 800, height: 800, aspectRatio: 1, devicePixelRatio: 1 };
    }
    return getSafeDimensions('product');
  });

  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = getSafeDimensions('product');
      setDimensions(newDimensions);
    };

    updateDimensions();

    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, [customSize]);

  return dimensions;
};
