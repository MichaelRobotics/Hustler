import { useEffect } from 'react';

/**
 * Hook to handle clicks outside of a specific element
 * @param isOpen - Whether the element is open
 * @param onClose - Callback to close the element
 * @param selector - CSS selector for the element to check (e.g., '[role="dialog"]')
 * @param delay - Delay before attaching listener (prevents immediate closure)
 */
export function useClickOutside(
  isOpen: boolean,
  onClose: () => void,
  selector: string,
  delay: number = 100
) {
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const element = document.querySelector(selector);
      
      if (element && element.contains(target)) {
        return; // Don't close if clicking inside the element
      }
      
      // Close the element
      onClose();
    };

    // Add small delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose, selector, delay]);
}


