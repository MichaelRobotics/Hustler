import { useState, useEffect } from 'react';

/**
 * Hook to manage modal animation state
 */
export function useModalAnimation(isOpen: boolean) {
  const [isAnimating, setIsAnimating] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setIsAnimating(true));
      return () => cancelAnimationFrame(id);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  return isAnimating;
}


