'use client';

import React from 'react';
import type { Product } from './types';

interface ProductButtonSectionProps {
  product: Product;
  isEditorView: boolean;
  inlineButtonEditing?: boolean;
  buttonText: string;
  buttonBaseClass: string;
  productPromoCode?: string | null;
  onOpenEditor?: (productId: number | string, target: 'name' | 'description' | 'card' | 'button') => void;
  onInlineButtonSave?: (text: string) => void;
  onInlineButtonEnd?: () => void;
  onOpenProductPage?: (product: Product) => void;
}

export const ProductButtonSection: React.FC<ProductButtonSectionProps> = ({
  product,
  isEditorView,
  inlineButtonEditing,
  buttonText,
  buttonBaseClass,
  productPromoCode,
  onOpenEditor,
  onInlineButtonSave,
  onInlineButtonEnd,
  onOpenProductPage,
}) => {
  if (isEditorView && inlineButtonEditing) {
    return (
      <input
        type="text"
        defaultValue={productPromoCode || product.buttonText || 'VIEW DETAILS'}
        onChange={(e) => onInlineButtonSave && onInlineButtonSave(e.target.value)}
        onBlur={() => onInlineButtonEnd && onInlineButtonEnd()}
        className="w-full max-w-48 mx-auto py-2 px-3 rounded-full bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-center font-bold uppercase tracking-wider"
      />
    );
  }

  return (
    <button 
      className={`w-full max-w-48 py-1.5 px-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] ${buttonBaseClass} shadow-xl ring-2 ring-offset-2 ring-offset-white mx-auto`}
      onClick={(e) => { 
        console.log('🔵 [ProductCard] Button clicked:', {
          productId: product.id,
          productName: product.name,
          isEditorView,
          hasOnOpenEditor: !!onOpenEditor,
          hasButtonLink: !!product.buttonLink,
          buttonLink: product.buttonLink,
          buttonText: buttonText,
          productType: product.type,
          hasStorageUrl: !!product.storageUrl,
          buttonLinkType: product.buttonLink ? (product.buttonLink.startsWith('http') ? 'external' : 'relative') : 'none',
        });
        
        if (isEditorView && onOpenEditor) { 
          console.log('🔵 [ProductCard] Editor view - opening editor for button');
          e.stopPropagation(); 
          onOpenEditor(product.id, 'button'); 
        } else if (product.type === "FILE" && onOpenProductPage) {
          console.log('🔵 [ProductCard] Opening ProductPageModal for FILE type product');
          e.stopPropagation();
          onOpenProductPage(product);
        } else if (product.buttonLink) {
          console.log('🔵 [ProductCard] Redirecting to buttonLink:', product.buttonLink);
          if (product.buttonLink.startsWith('http')) {
            console.log('🔵 [ProductCard] Opening external link in new tab:', product.buttonLink);
            window.open(product.buttonLink, '_blank');
          } else {
            console.log('🔵 [ProductCard] Navigating to relative path:', product.buttonLink);
            window.location.href = product.buttonLink;
          }
        } else {
          console.warn('🔵 [ProductCard] No buttonLink found - button click does nothing. Product:', {
            id: product.id,
            name: product.name,
            hasButtonLink: !!product.buttonLink,
            productType: product.type,
            fullProduct: product
          });
        }
      }}
      dangerouslySetInnerHTML={{ __html: buttonText }}
    >
    </button>
  );
};



