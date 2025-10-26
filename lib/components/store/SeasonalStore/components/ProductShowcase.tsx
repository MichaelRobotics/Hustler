'use client';

import React from 'react';
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
  inlineEditTarget: string | null;
  inlineProductId: number | null;
  
  // Handlers
  navigateToPrevious: () => void;
  navigateToNext: () => void;
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
}

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  combinedProducts,
  currentProductIndex,
  swipeDirection,
  editorState,
  legacyTheme,
  loadingState,
  inlineEditTarget,
  inlineProductId,
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
}) => {
  return (
    <div className="w-full max-w-5xl my-4">
      {combinedProducts.length > 0 ? (
        <div className="flex items-center gap-4">
          {/* Left Arrow - Only show on desktop when there are more than 2 products */}
          {combinedProducts.length > 2 && (
            <button
              onClick={navigateToPrevious}
              disabled={currentProductIndex === 0}
              className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
              title="Previous products"
            >
              <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Product Grid - Show 1 product on mobile, 2 on desktop with slide-out and slide-in animation */}
          <div 
            className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto overflow-hidden w-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {combinedProducts.slice(currentProductIndex, currentProductIndex + 2).map((product, index) => (
              <div 
                key={`${product.id}-${currentProductIndex}-${index}`}
                className={`transition-all duration-150 ease-in-out transform ${
                  !editorState.isEditorView 
                    ? 'animate-in zoom-in-95 fade-in'
                    : ''
                } ${index === 1 ? 'hidden md:block' : ''}`}
                style={{ 
                  animationDelay: !editorState.isEditorView ? `${index * 50}ms` : '0ms',
                  animationDuration: !editorState.isEditorView ? '150ms' : '0ms',
                  transform: swipeDirection === 'left' 
                    ? 'translateX(100%)' 
                    : swipeDirection === 'right'
                    ? 'translateX(-100%)'
                    : 'translateX(0%)',
                  opacity: swipeDirection === 'left' || swipeDirection === 'right' ? 0 : 1,
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
                  inlineNameActive={inlineEditTarget === 'productName' && inlineProductId === product.id}
                  inlineDescActive={inlineEditTarget === 'productDesc' && inlineProductId === product.id}
                />
              </div>
            ))}
          </div>
          
          {/* Right Arrow - Only show on desktop when there are more than 2 products */}
          {combinedProducts.length > 2 && (
            <button
              onClick={navigateToNext}
              disabled={currentProductIndex >= combinedProducts.length - 2}
              className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
              title="Next products"
            >
              <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <p>No products yet. Click "Add New Product" to get started!</p>
        </div>
      )}
      
      {/* Navigation Dots - Only show on mobile when there are multiple products */}
      {combinedProducts.length > 1 && (
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




