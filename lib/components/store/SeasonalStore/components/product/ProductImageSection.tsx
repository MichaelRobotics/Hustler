'use client';

import React from 'react';
import { Button } from 'frosted-ui';
import { Zap, Flame, Star } from 'lucide-react';
import type { Product } from './types';
import type { LegacyTheme, LoadingState } from '../../types/index';
import { BadgeDisplay } from './BadgeDisplay';

interface ProductImageSectionProps {
  product: Product;
  theme: LegacyTheme;
  isEditorView: boolean;
  loadingState: LoadingState;
  shouldShowRatingInfo: boolean;
  ratingValue: number | null;
  reviewCountValue: number | null;
  shouldShowSalesInfo: boolean;
  salesCountValue: number | null;
  onRefineProduct: (product: Product) => void;
  onDropAsset: (e: React.DragEvent, productId: number | string) => void;
}

export const ProductImageSection: React.FC<ProductImageSectionProps> = ({
  product,
  theme,
  isEditorView,
  loadingState,
  shouldShowRatingInfo,
  ratingValue,
  reviewCountValue,
  shouldShowSalesInfo,
  salesCountValue,
  onRefineProduct,
  onDropAsset,
}) => {
  const showFire =
    product.promoShowFireIcon &&
    product.promoQuantityLeft !== undefined &&
    product.promoQuantityLeft > 0;

  return (
    <div className="relative h-56 w-full">
      {/* Background Image - fills top half */}
      <div 
        className="absolute inset-0 rounded-t-2xl overflow-hidden"
        style={{
          backgroundImage: product.imageAttachmentUrl 
            ? `url(${product.imageAttachmentUrl})` 
            : product.image
              ? `url(${product.image})`
              : `url(https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: `drop-shadow(0 10px 10px ${
            theme.name === 'Fall' ? 'rgba(160, 82, 45, 0.5)' : 
            theme.name === 'Winter' ? 'rgba(31, 74, 155, 0.5)' : 
            'rgba(232, 160, 2, 0.5)'
          })`
        }}
      />
      
      {/* Fire Icon + "X left" text - Top Right Corner */}
      {showFire && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
          <Flame className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-bold">
            {product.promoQuantityLeft} left
          </span>
        </div>
      )}

      {/* Badge Display */}
      <BadgeDisplay badge={product.badge ?? null} />
      
      {shouldShowRatingInfo && ratingValue !== null && (
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 rounded-full bg-black/70 text-white text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm shadow-lg">
          <Star className="w-4 h-4 text-amber-300 fill-current" fill="currentColor" />
          <span>{ratingValue.toFixed(1)}</span>
          <span className="text-white/80">
            ({(reviewCountValue ?? 0).toLocaleString()} reviews)
          </span>
        </div>
      )}

      {shouldShowSalesInfo && salesCountValue !== null && (
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-full bg-white/90 text-gray-900 text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm shadow-lg">
          <span>{salesCountValue.toLocaleString()} sold</span>
        </div>
      )}

      {/* Theme Up Button - Top Right (Only visible in Editor View and on hover) */}
      {isEditorView && (
        <Button
          size="3"
          color="green"
          onClick={() => onRefineProduct(product)}
          disabled={loadingState.isTextLoading || loadingState.isImageLoading}
          className={`absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group ${
            (loadingState.isTextLoading || loadingState.isImageLoading) 
              ? 'cursor-not-allowed' 
              : ''
          }`}
          title="Theme Up!"
        >
          <Zap
            size={20}
            strokeWidth={2.5}
            className="group-hover:scale-110 transition-transform duration-300"
          />
          <span className="ml-1">Theme Up!</span>
        </Button>
      )}

      {/* Drop Zone for Assets - covers entire card */}
      <div 
        className="absolute inset-0 product-container-drop-zone"
        onDragOver={(e) => isEditorView && e.preventDefault()}
        onDrop={(e) => onDropAsset(e, product.id)}
      />
    </div>
  );
};

