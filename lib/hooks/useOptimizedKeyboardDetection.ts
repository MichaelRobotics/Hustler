import { useState, useEffect, useCallback, useRef } from 'react';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  isAnimating: boolean;
}

/**
 * Ultra-optimized keyboard detection hook with RAF throttling
 * Designed for 60fps performance and minimal re-renders
 */
export const useOptimizedKeyboardDetection = () => {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    isAnimating: false,
  });

  const initialViewportHeight = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  const isUpdating = useRef<boolean>(false);

  // Set initial viewport height
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initialViewportHeight.current = window.innerHeight;
    }
  }, []);

  // Ultra-fast keyboard detection with RAF throttling
  const updateKeyboardState = useCallback(() => {
    if (typeof window === 'undefined' || isUpdating.current) return;

    const now = performance.now();
    // Throttle updates to max 60fps (16.67ms)
    if (now - lastUpdateTime.current < 16.67) {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      rafId.current = requestAnimationFrame(updateKeyboardState);
      return;
    }

    isUpdating.current = true;
    lastUpdateTime.current = now;

    const currentHeight = window.visualViewport?.height || window.innerHeight;
    const heightDifference = initialViewportHeight.current - currentHeight;
    
    // Optimized threshold check
    const keyboardThreshold = 150;
    const isKeyboardVisible = heightDifference > keyboardThreshold;
    const keyboardHeight = isKeyboardVisible ? Math.max(heightDifference, 0) : 0;

    setKeyboardState(prev => {
      const wasVisible = prev.isVisible;
      const isNowVisible = isKeyboardVisible;
      const isAnimating = wasVisible !== isNowVisible;
      
      // Only update if state actually changed
      if (prev.isVisible === isNowVisible && 
          prev.height === keyboardHeight && 
          prev.isAnimating === isAnimating) {
        isUpdating.current = false;
        return prev;
      }

      isUpdating.current = false;
      return {
        isVisible: isNowVisible,
        height: keyboardHeight,
        isAnimating,
      };
    });
  }, []);

  // Optimized event listener setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    if (window.visualViewport) {
      // Use visual viewport API for maximum accuracy
      const handleViewportChange = () => {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
        rafId.current = requestAnimationFrame(updateKeyboardState);
      };

      window.visualViewport.addEventListener('resize', handleViewportChange);
      
      cleanup = () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    } else {
      // Fallback for older browsers
      const handleResize = () => {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
        rafId.current = requestAnimationFrame(updateKeyboardState);
      };

      window.addEventListener('resize', handleResize);
      
      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }

    return cleanup;
  }, [updateKeyboardState]);

  // Reset animation state after transition
  useEffect(() => {
    if (keyboardState.isAnimating) {
      const timer = setTimeout(() => {
        setKeyboardState(prev => ({
          ...prev,
          isAnimating: false,
        }));
      }, 200); // Reduced from 300ms for faster response

      return () => clearTimeout(timer);
    }
  }, [keyboardState.isAnimating]);

  return keyboardState;
};
