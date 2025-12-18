import React, { useState, useEffect, useRef } from 'react';
import { ProductCard } from './ProductCard';
import { LegacyTheme, Product } from '../types';

interface ProductShowcaseProps {
  combinedProducts: Product[];
  currentProductIndex: number;
  swipeDirection: 'left' | 'right' | null;
  editorState: {
    isEditorView: boolean;
  };
  legacyTheme: LegacyTheme;
  loadingState: {
    isTextLoading: boolean;
    isImageLoading: boolean;
    isUploadingImage: boolean;
    isGeneratingImage: boolean;
  };
  isProductsReady: boolean; // Updated prop name for products-specific loading
  
  // Handlers
  navigateToPrevious: (skipSlideAnimation?: boolean) => void;
  navigateToNext: (skipSlideAnimation?: boolean) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: (e: React.TouchEvent) => void;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
  deleteProduct: (product: Product) => void;
  handleProductImageUpload: (id: number | string, file: File) => void;
  handleRefineAll: (product: Product) => void;
  handleRemoveSticker: (id: number | string) => void;
  handleDropOnProduct: (productId: number | string, asset: any) => void;
  openProductEditor: (id: number | string | null, target: string) => void;
  discountSettings?: {
    enabled: boolean;
    startDate: string;
    endDate: string;
    promoCode?: string; // Promo code for seasonal discount
  };
  discountStatus?: 'active' | 'approaching' | 'expired' | 'non-existent'; // Discount status from database
  seasonalDiscountId?: string; // Seasonal discount ID to match against product's discount
  currentDiscountPromoCode?: string; // Current discount promo code from experience record
  getThemeQuickColors?: (theme: any) => string[];
  backgroundUrl?: string | null;
  onOpenProductPage?: (product: Product) => void; // Handler to open ProductPageModal for FILE type products
  storeName?: string; // Store name for modal
  experienceId?: string; // Experience ID for payment
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  combinedProducts,
  currentProductIndex,
  swipeDirection,
  editorState,
  legacyTheme,
  loadingState,
  isProductsReady,
  navigateToPrevious,
  navigateToNext,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  updateProduct,
  deleteProduct,
  handleProductImageUpload,
  handleRefineAll,
  handleRemoveSticker,
  handleDropOnProduct,
  openProductEditor,
  discountSettings,
  discountStatus,
  seasonalDiscountId,
  currentDiscountPromoCode,
  getThemeQuickColors,
  backgroundUrl,
  onOpenProductPage,
  storeName,
  experienceId,
}) => {
  const [showNavigation, setShowNavigation] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const autoSwitchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Show navigation arrows after products finish loading
  useEffect(() => {
    if (isProductsReady && combinedProducts.length > 0) {
      // Check if products are already visible (loaded from session storage)
      // If they are, show navigation immediately
      const timer = setTimeout(() => {
        setShowNavigation(true);
      }, 100); // Short delay to ensure products are rendered
      
      return () => clearTimeout(timer);
    } else {
      setShowNavigation(false);
    }
  }, [isProductsReady, combinedProducts.length]);

  // Auto-switch products with fade animation (same as manual navigation)
  useEffect(() => {
    // Clear existing interval
    if (autoSwitchIntervalRef.current) {
      clearInterval(autoSwitchIntervalRef.current);
    }
    
    // Don't auto-switch if:
    // - 2 or fewer products
    // - In editor view
    // - Currently navigating
    if (combinedProducts.length <= 2) return;
    if (editorState.isEditorView) return;
    if (isNavigating) return;
    
    // Auto-switch timeout: 5 seconds for desktop, 3 seconds for mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const switchTimeout = isMobile ? 3000 : 5000;
    
    autoSwitchIntervalRef.current = setInterval(() => {
      // Only auto-switch if not currently navigating
      if (!isNavigating) {
        // Use the same fade animation as manual navigation
        setIsNavigating(true);
        setIsFadingOut(true);
        
        // After fade out completes, change products and wait for render
        setTimeout(() => {
          navigateToNext(true); // Skip built-in slide animation (handles wrap-around)
          // Use requestAnimationFrame to ensure products are rendered before fade in
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsFadingOut(false); // This will trigger fade in
              setIsNavigating(false);
            });
          });
        }, 300);
      }
    }, switchTimeout);
    
    return () => {
      if (autoSwitchIntervalRef.current) {
        clearInterval(autoSwitchIntervalRef.current);
      }
    };
  }, [combinedProducts.length, editorState.isEditorView, isNavigating, currentProductIndex, navigateToNext]);

  // Navigation handlers with fade animation
  const handleNavigateNext = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    console.log('🔄 Starting NEXT navigation');
    
    // Start fade out
    setIsFadingOut(true);
    
    // After fade out completes, change products and wait for render
    setTimeout(() => {
      console.log('🔄 Calling navigateToNext() with skipSlideAnimation=true');
      navigateToNext(true); // Skip built-in slide animation
      // Use requestAnimationFrame to ensure products are rendered before fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('🔄 Starting fade-in for NEXT');
          setIsFadingOut(false); // This will trigger fade in
          setIsNavigating(false);
        });
      });
    }, 300);
  };

  const handleNavigatePrevious = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    console.log('🔄 Starting PREVIOUS navigation');
    
    // Start fade out
    setIsFadingOut(true);
    
    // After fade out completes, change products and wait for render
    setTimeout(() => {
      console.log('🔄 Calling navigateToPrevious() with skipSlideAnimation=true');
      navigateToPrevious(true); // Skip built-in slide animation
      // Use requestAnimationFrame to ensure products are rendered before fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          console.log('🔄 Starting fade-in for PREVIOUS');
          setIsFadingOut(false); // This will trigger fade in
          setIsNavigating(false);
        });
      });
    }, 300);
  };

  // Debug logging - only log when state actually changes
  const prevState = useRef({ isProductsReady, showNavigation, productCount: combinedProducts.length });
  useEffect(() => {
    const currentState = { isProductsReady, showNavigation, productCount: combinedProducts.length };
    if (JSON.stringify(prevState.current) !== JSON.stringify(currentState)) {
      console.log('Navigation state:', currentState);
      prevState.current = currentState;
    }
  }, [isProductsReady, showNavigation, combinedProducts.length]);

  return (
    <div className="w-full max-w-5xl my-4">
      {combinedProducts.length > 0 ? (
        <div className="flex items-center gap-4">
          {/* Left Arrow - Only show on desktop when there are more than 2 products */}
          {combinedProducts.length > 2 && showNavigation && (
            <button
              onClick={handleNavigatePrevious}
              disabled={currentProductIndex === 0 || isNavigating}
              className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
              title="Previous products"
            >
              <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Product Grid - Show 1 product on mobile, 2 on desktop with fade animation */}
          <div 
            className={`flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto overflow-hidden w-full ${
              isNavigating ? 'product-navigating' : 
              isFadingOut ? 'product-fade-out' : 'product-fade-in'
            }`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {combinedProducts.slice(currentProductIndex, currentProductIndex + 2).map((product, index) => (
              <div 
                key={`${product.id}-${currentProductIndex}-${index}`}
                className={`${
                  isNavigating ? 'product-navigating' :
                  !editorState.isEditorView && isProductsReady && !isNavigating
                    ? 'product-loading-animation'
                    : !isProductsReady
                    ? 'opacity-0 translate-y-8'
                    : ''
                } ${index === 1 ? 'hidden md:block' : ''}`}
                style={{ 
                  animationDelay: !editorState.isEditorView && isProductsReady && !isNavigating ? `${index * 100}ms` : '0ms',
                  transform: swipeDirection === 'left' 
                    ? 'translateX(100%)' 
                    : swipeDirection === 'right'
                    ? 'translateX(-100%)'
                    : 'translateX(0%)',
                  opacity: swipeDirection === 'left' || swipeDirection === 'right' ? 0 : undefined,
                  transitionDelay: swipeDirection ? `${index * 40}ms` : '0ms'
                }}
              >
                <ProductCard
                  product={product}
                  theme={legacyTheme}
                  isEditorView={editorState.isEditorView}
                  loadingState={loadingState}
                  onUpdateProduct={updateProduct}
                  onDeleteProduct={() => deleteProduct(product)}
                  onProductImageUpload={handleProductImageUpload}
                  onRefineProduct={() => handleRefineAll(product)}
                  onRemoveSticker={handleRemoveSticker}
                  onDropAsset={(e) => handleDropOnProduct(product.id, e)}
                  onOpenEditor={(id, target) => openProductEditor(id, target)}
                  discountSettings={discountSettings}
                  discountStatus={discountStatus}
                  seasonalDiscountId={seasonalDiscountId}
                  currentDiscountPromoCode={currentDiscountPromoCode}
                  getThemeQuickColors={getThemeQuickColors}
                  backgroundUrl={backgroundUrl}
                  onOpenProductPage={onOpenProductPage}
                  storeName={storeName}
                  experienceId={experienceId}
                />
              </div>
            ))}
          </div>
          
          {/* Right Arrow - Only show on desktop when there are more than 2 products */}
          {combinedProducts.length > 2 && showNavigation && (
            <button
              onClick={handleNavigateNext}
              disabled={currentProductIndex >= combinedProducts.length - 2 || isNavigating}
              className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
              title="Next products"
            >
              <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      ) : isProductsReady ? (
        <div className="text-center py-8 text-gray-400">
          <p>No products yet. Click "Add New Product" to get started!</p>
        </div>
      ) : null}
      
      {/* Navigation Dots - Only show on mobile when there are multiple products */}
      {combinedProducts.length > 1 && showNavigation && (
        <div className="flex justify-center mt-4 space-x-2 md:hidden">
          {Array.from({ length: Math.max(1, combinedProducts.length - 1) }, (_, index) => (
            <button
              key={index}
              onClick={() => {
                if (index !== currentProductIndex) {
                  if (index > currentProductIndex) {
                    navigateToNext();
                  } else {
                    navigateToPrevious();
                  }
                }
              }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentProductIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};




