import { useCallback, useState, useEffect } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/desktop viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Auto-switch is now handled in ProductShowcase component with fade animation
  // This function is kept for compatibility but does nothing
  const startAutoSwitch = useCallback(() => {
    // Auto-switch is now handled in ProductShowcase component
  }, []);

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
      // Auto-switch is now handled in ProductShowcase component
    }
  }, [currentProductIndex, isSliding, setIsSliding]);

  const navigateToNext = useCallback((skipSlideAnimation = false) => {
    if (!isSliding) {
      setIsSliding(true);
      
      // Desktop shows 2 products, so max index is length - 2
      // Mobile shows 1 product, so max index is length - 1
      const maxIndex = isMobile ? products.length - 1 : products.length - 2;
      
      if (skipSlideAnimation) {
        // Skip slide animation - just change the index immediately with wrap-around
        setCurrentProductIndex(prevIndex => {
          return prevIndex >= maxIndex ? 0 : prevIndex + 1;
        });
        setSwipeDirection(null);
        setIsSliding(false);
      } else {
        // Use slide animation (only if not at the end)
        if (currentProductIndex < maxIndex) {
          setSwipeDirection('left');
          setTimeout(() => {
            setCurrentProductIndex(prev => Math.min(maxIndex, prev + 1));
            setSwipeDirection('right'); // Slide in from right
            setTimeout(() => {
              setSwipeDirection(null);
              setIsSliding(false);
            }, 150); // Faster: 300ms -> 150ms
          }, 100); // Faster: 200ms -> 100ms
        } else {
          setIsSliding(false);
        }
      }
      // Auto-switch is now handled in ProductShowcase component
    }
  }, [currentProductIndex, products.length, isSliding, setIsSliding, isMobile]);

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

    // Mobile shows 1 product, so max index is length - 1
    // Desktop shows 2 products, so max index is length - 2 (but touch is mobile-only)
    const maxIndex = products.length - 1;
    if (isLeftSwipe && currentProductIndex < maxIndex) {
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

  // Auto-switch is now handled in ProductShowcase component with fade animation

  // Reset index when products change or viewport changes (clamp to appropriate max)
  useEffect(() => {
    if (products.length === 0) {
      setCurrentProductIndex(0);
      return;
    }
    
    // Desktop shows 2 products, so max index is length - 2
    // Mobile shows 1 product, so max index is length - 1
    const maxIndex = isMobile ? products.length - 1 : Math.max(0, products.length - 2);
    
    if (currentProductIndex > maxIndex) {
      setCurrentProductIndex(maxIndex);
    }
  }, [products.length, currentProductIndex, isMobile]);

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

