import { useState, useEffect } from 'react';

/**
 * Custom hook to calculate the height of an element from a reference point.
 * Used for positioning the chat sheet relative to the welcome message.
 */
export const useElementHeight = (ref: React.RefObject<HTMLElement | null>) => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const heightFromBottom = window.innerHeight - rect.top;
        setHeight(window.innerHeight - rect.top);
      }
    };
    
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [ref]);

  return height;
};


