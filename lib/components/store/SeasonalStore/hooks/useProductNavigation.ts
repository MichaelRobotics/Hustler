import { useCallback, useRef, useState, useEffect } from 'react';

interface UseProductNavigationProps {
  products: any[];
  isEditorView: boolean;
  isSliding: boolean;
  setIsSliding: (sliding: boolean) => void;
}

export const useProductNavigation = ({ 
  products, 
  isEditorView, 
  isSliding, 
  setIsSliding 
}: UseProductNavigationProps) => {
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoSwitchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to start auto-switch timer
  const startAutoSwitch = useCallback(() => {
    if (autoSwitchIntervalRef.current) {
      clearInterval(autoSwitchIntervalRef.current);
    }
    
    if (products.length <= 2) return; // Don't auto-switch if 2 or fewer products
    if (isEditorView) return; // Don't auto-switch in edit mode
    
    // Shorter timeout for mobile (5 seconds) vs desktop (10 seconds)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const switchTimeout = isMobile ? 5000 : 10000;
    
    autoSwitchIntervalRef.current = setInterval(() => {
      if (!isSliding) {
        setIsSliding(true);
        setSwipeDirection('left'); // Auto-switch slides left
        setTimeout(() => {
          setCurrentProductIndex(prevIndex => {
            const maxIndex = products.length - 2;
            return prevIndex >= maxIndex ? 0 : prevIndex + 1;
          });
          setSwipeDirection('right'); // Slide in from right
          setTimeout(() => {
            setSwipeDirection(null);
            setIsSliding(false);
          }, 150); // Faster: 300ms -> 150ms
        }, 100); // Faster: 200ms -> 100ms
      }
    }, switchTimeout);
  }, [products.length, isEditorView, isSliding, setIsSliding]);

  // Smooth navigation functions
  const navigateToPrevious = useCallback((skipSlideAnimation = false) => {
    if (currentProductIndex > 0 && !isSliding) {
      setIsSliding(true);
      
      if (skipSlideAnimation) {
        // Skip slide animation - just change the index immediately
        setCurrentProductIndex(prev => Math.max(0, prev - 1));
        setSwipeDirection(null);
        setIsSliding(false);
      } else {
        // Use slide animation
        setSwipeDirection('right');
        setTimeout(() => {
          setCurrentProductIndex(prev => Math.max(0, prev - 1));
          setSwipeDirection('left'); // Slide in from left
          setTimeout(() => {
            setSwipeDirection(null);
            setIsSliding(false);
          }, 150); // Faster: 300ms -> 150ms
        }, 100); // Faster: 200ms -> 100ms
      }
      startAutoSwitch();
    }
  }, [currentProductIndex, startAutoSwitch, isSliding, setIsSliding]);

  const navigateToNext = useCallback((skipSlideAnimation = false) => {
    if (currentProductIndex < products.length - 2 && !isSliding) {
      setIsSliding(true);
      
      if (skipSlideAnimation) {
        // Skip slide animation - just change the index immediately
        setCurrentProductIndex(prev => Math.min(products.length - 2, prev + 1));
        setSwipeDirection(null);
        setIsSliding(false);
      } else {
        // Use slide animation
        setSwipeDirection('left');
        setTimeout(() => {
          setCurrentProductIndex(prev => Math.min(products.length - 2, prev + 1));
          setSwipeDirection('right'); // Slide in from right
          setTimeout(() => {
            setSwipeDirection(null);
            setIsSliding(false);
          }, 150); // Faster: 300ms -> 150ms
        }, 100); // Faster: 200ms -> 100ms
      }
      startAutoSwitch();
    }
  }, [currentProductIndex, products.length, startAutoSwitch, isSliding, setIsSliding]);

  // Touch swipe handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    console.log('Touch swipe detected:', { distance, isLeftSwipe, isRightSwipe, currentProductIndex, productsLength: products.length });

    if (isLeftSwipe && currentProductIndex < products.length - 2) {
      console.log('Navigating to next product');
      navigateToNext();
    }
    if (isRightSwipe && currentProductIndex > 0) {
      console.log('Navigating to previous product');
      navigateToPrevious();
    }
    
    // Reset touch values
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, currentProductIndex, products.length, navigateToNext, navigateToPrevious]);

  // Auto-switch products every 10 seconds (disabled in edit mode)
  useEffect(() => {
    startAutoSwitch();
    return () => {
      if (autoSwitchIntervalRef.current) {
        clearInterval(autoSwitchIntervalRef.current);
      }
    };
  }, [startAutoSwitch]);

  // Reset index when products change
  useEffect(() => {
    if (currentProductIndex >= products.length - 1) {
      setCurrentProductIndex(0);
    }
  }, [products.length, currentProductIndex]);

  return {
    currentProductIndex,
    setCurrentProductIndex,
    swipeDirection,
    touchStart,
    touchEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    navigateToPrevious,
    navigateToNext,
  };
};

