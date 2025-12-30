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
  checkoutConfigurationId?: string;
  planId?: string;
  experienceId?: string;
  onPurchaseSuccess?: (paymentId: string) => void; // Not used directly here, but passed to ProductPageModal
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
  checkoutConfigurationId,
  planId,
  experienceId,
  onPurchaseSuccess,
}) => {
  if (isEditorView && inlineButtonEditing) {
    return (
      <input
        type="text"
        defaultValue={productPromoCode || product.buttonText || 'VIEW DETAILS'}
        onChange={(e) => onInlineButtonSave && onInlineButtonSave(e.target.value)}
        onBlur={(e) => {
          // Use setTimeout to prevent immediate button click after blur
          // This ensures inlineButtonEditing state updates before button becomes clickable
          setTimeout(() => {
            onInlineButtonEnd && onInlineButtonEnd();
          }, 100);
        }}
        onKeyDown={(e) => {
          // Allow Enter to save and Escape to cancel
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            onInlineButtonEnd && onInlineButtonEnd();
          }
        }}
        onClick={(e) => {
          // Prevent clicks from propagating to parent elements
          e.stopPropagation();
        }}
        autoFocus
        className="w-full max-w-48 mx-auto py-2 px-3 rounded-full bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-center font-bold uppercase tracking-wider"
      />
    );
  }

  return (
    <button 
      className={`w-full max-w-48 py-1.5 px-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] ${buttonBaseClass} shadow-xl ring-2 ring-offset-2 ring-offset-white mx-auto`}
      onClick={async (e) => { 
        // Prevent any action if inline editing is active
        if (inlineButtonEditing) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }

        // Use props values if product object doesn't have them
        const effectiveCheckoutConfigId = checkoutConfigurationId || product.checkoutConfigurationId;
        const effectivePlanId = planId || product.planId;
        
        console.log('🔵 [ProductCard] Button clicked:', {
          productId: product.id,
          productName: product.name,
          isEditorView,
          inlineButtonEditing,
          hasOnOpenEditor: !!onOpenEditor,
          hasButtonLink: !!product.buttonLink,
          buttonLink: product.buttonLink,
          buttonText: buttonText,
          productType: product.type,
          hasStorageUrl: !!product.storageUrl,
          checkoutConfigFromProps: checkoutConfigurationId,
          checkoutConfigFromProduct: product.checkoutConfigurationId,
          effectiveCheckoutConfig: effectiveCheckoutConfigId,
          planIdFromProps: planId,
          planIdFromProduct: product.planId,
          effectivePlanId: effectivePlanId,
          hasOnPurchaseSuccess: !!onPurchaseSuccess,
          buttonLinkType: product.buttonLink ? (product.buttonLink.startsWith('http') ? 'external' : 'relative') : 'none',
        });
        
        if (isEditorView && onOpenEditor) { 
          console.log('🔵 [ProductCard] Editor view - opening editor for button');
          e.stopPropagation(); 
          onOpenEditor(product.id, 'button'); 
          return;
        }

        // For FILE type products: Always open ProductPageModal (not direct purchase)
        // The "Buy Now" button inside ProductPageModal will handle the inAppPurchase flow
        if (product.type === "FILE" && onOpenProductPage) {
          console.log('🔵 [ProductCard] Opening ProductPageModal for FILE type product', {
            hasCheckoutConfig: !!checkoutConfigurationId,
            hasPlanId: !!planId,
          });
          e.stopPropagation();
          // Ensure product object includes checkoutConfigurationId and planId from props
          // (in case they're not on the product object itself)
          const productWithCheckout = {
            ...product,
            checkoutConfigurationId: effectiveCheckoutConfigId,
            planId: effectivePlanId,
          };
          console.log('🔵 [ProductCard] Opening ProductPageModal with product:', {
            productId: productWithCheckout.id,
            hasCheckoutConfig: !!productWithCheckout.checkoutConfigurationId,
            hasPlanId: !!productWithCheckout.planId,
          });
          onOpenProductPage(productWithCheckout);
          return;
        }

        // Fallback: Use buttonLink for navigation
        if (product.buttonLink) {
          console.log('🔵 [ProductCard] Redirecting to buttonLink:', product.buttonLink);
          if (product.buttonLink.startsWith('http')) {
            console.log('🔵 [ProductCard] Opening external link in new tab:', product.buttonLink);
            window.open(product.buttonLink, '_blank');
          } else {
            console.log('🔵 [ProductCard] Navigating to relative path:', product.buttonLink);
            window.location.href = product.buttonLink;
          }
          return;
        }

        console.warn('🔵 [ProductCard] No action available - button click does nothing. Product:', {
          id: product.id,
          name: product.name,
          hasButtonLink: !!product.buttonLink,
          productType: product.type,
          hasCheckoutConfigurationId: !!checkoutConfigurationId,
          fullProduct: product
        });
      }}
      dangerouslySetInnerHTML={{ __html: buttonText }}
    >
    </button>
  );
};



