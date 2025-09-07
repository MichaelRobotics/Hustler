import { useState, useEffect, useCallback } from 'react';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  isAnimating: boolean;
}

/**
 * Custom hook for detecting mobile keyboard visibility and height
 * Uses viewport height changes to detect keyboard appearance
 */
export const useKeyboardDetection = () => {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    isAnimating: false,
  });

  const [initialViewportHeight, setInitialViewportHeight] = useState<number>(0);

  // Set initial viewport height on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInitialViewportHeight(window.innerHeight);
    }
  }, []);

  // Detect keyboard visibility based on viewport height changes
  const handleResize = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeight - currentHeight;
    
    // Consider keyboard visible if viewport height decreased by more than 150px
    // This threshold helps avoid false positives from browser UI changes
    const keyboardThreshold = 150;
    const isKeyboardVisible = heightDifference > keyboardThreshold;
    
    // Calculate keyboard height (with some buffer for smooth transitions)
    const keyboardHeight = isKeyboardVisible ? Math.max(heightDifference, 0) : 0;

    setKeyboardState(prev => {
      const wasVisible = prev.isVisible;
      const isNowVisible = isKeyboardVisible;
      
      // Detect if we're transitioning
      const isAnimating = wasVisible !== isNowVisible;
      
      return {
        isVisible: isNowVisible,
        height: keyboardHeight,
        isAnimating,
      };
    });
  }, [initialViewportHeight]);

  // Listen for viewport changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use visual viewport API if available (more accurate for mobile)
    if (window.visualViewport) {
      const handleVisualViewportChange = () => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        
        const keyboardThreshold = 150;
        const isKeyboardVisible = heightDifference > keyboardThreshold;
        const keyboardHeight = isKeyboardVisible ? Math.max(heightDifference, 0) : 0;

        setKeyboardState(prev => {
          const wasVisible = prev.isVisible;
          const isNowVisible = isKeyboardVisible;
          const isAnimating = wasVisible !== isNowVisible;
          
          return {
            isVisible: isNowVisible,
            height: keyboardHeight,
            isAnimating,
          };
        });
      };

      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      };
    } else {
      // Fallback to window resize for browsers without visual viewport API
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [handleResize, initialViewportHeight]);

  // Reset animation state after transition completes
  useEffect(() => {
    if (keyboardState.isAnimating) {
      const timer = setTimeout(() => {
        setKeyboardState(prev => ({
          ...prev,
          isAnimating: false,
        }));
      }, 300); // Match CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [keyboardState.isAnimating]);

  return keyboardState;
};
