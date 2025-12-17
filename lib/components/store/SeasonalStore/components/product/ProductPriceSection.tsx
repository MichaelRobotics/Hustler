'use client';

import React from 'react';
import type { Product } from './types';

interface ProductPriceSectionProps {
  product: Product;
  discountedPrice: number | null;
  discountDisplay: string | null;
  priceTextColor: string | undefined;
}

export const ProductPriceSection: React.FC<ProductPriceSectionProps> = ({
  product,
  discountedPrice,
  discountDisplay,
  priceTextColor,
}) => {
  return (
    <div className="text-xl font-extrabold mt-auto">
      <div className="flex items-center justify-center gap-3">
        {discountedPrice !== null ? (
          <>
            <span className={`text-2xl font-extrabold ${priceTextColor}`}>
              ${discountedPrice.toFixed(2)}
            </span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-500 line-through">
                ${product.price.toFixed(2)}
              </span>
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                {discountDisplay || ''}
              </span>
            </span>
          </>
        ) : (
          <span className={`text-2xl font-extrabold ${priceTextColor}`}>
            ${product.price.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
};

