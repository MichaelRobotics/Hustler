'use client';

import React from 'react';
import { Button, Text } from 'frosted-ui';
import type { Product } from './types';

interface BadgeSelectorProps {
  currentProduct: Product | null;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
  productId: number | string;
}

export const BadgeSelector: React.FC<BadgeSelectorProps> = ({
  currentProduct,
  updateProduct,
  productId,
}) => {
  const currentBadge = currentProduct?.badge;
  const isNoneSelected = !currentBadge;
  const isNewSelected = currentBadge === 'new';
  const is5StarSelected = currentBadge === '5star';
  const isBestSellerSelected = currentBadge === 'bestseller';

  return (
    <div>
      <Text
        as="label"
        size="3"
        weight="medium"
        className="block mb-3"
      >
        Badge
      </Text>
      <div className="flex flex-wrap gap-3">
        <Button
          size="3"
          variant="surface"
          color="gray"
          onClick={(e) => {
            e.stopPropagation();
            updateProduct(productId, { badge: null });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`!px-6 !py-3 shadow-lg shadow-gray-500/25 hover:!bg-gray-500 hover:!text-white hover:shadow-gray-500/40 hover:scale-105 active:!bg-gray-600 active:!text-white transition-all duration-300 dark:shadow-gray-500/30 dark:hover:shadow-gray-500/50 dark:hover:!bg-gray-600 dark:active:!bg-gray-700 ${isNoneSelected ? '!bg-gray-500 !text-white' : ''}`}
        >
          None
        </Button>
        <Button
          size="3"
          variant="surface"
          color="green"
          onClick={(e) => {
            e.stopPropagation();
            updateProduct(productId, { badge: 'new' });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`!px-6 !py-3 shadow-lg shadow-green-500/25 hover:!bg-green-500 hover:!text-white hover:shadow-green-500/40 hover:scale-105 active:!bg-green-600 active:!text-white transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 dark:hover:!bg-green-600 dark:active:!bg-green-700 ${isNewSelected ? '!bg-green-500 !text-white' : ''}`}
        >
          New
        </Button>
        <Button
          size="3"
          variant="surface"
          color="amber"
          onClick={(e) => {
            e.stopPropagation();
            updateProduct(productId, { badge: '5star' });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`!px-6 !py-3 shadow-lg shadow-amber-500/25 hover:!bg-amber-500 hover:!text-white hover:shadow-amber-500/40 hover:scale-105 active:!bg-amber-600 active:!text-white transition-all duration-300 dark:shadow-amber-500/30 dark:hover:shadow-amber-500/50 dark:hover:!bg-amber-600 dark:active:!bg-amber-700 ${is5StarSelected ? '!bg-amber-500 !text-white' : ''}`}
        >
          5 ⭐
        </Button>
        <Button
          size="3"
          variant="surface"
          color="orange"
          onClick={(e) => {
            e.stopPropagation();
            updateProduct(productId, { badge: 'bestseller' });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`!px-6 !py-3 shadow-lg shadow-orange-500/25 hover:!bg-orange-500 hover:!text-white hover:shadow-orange-500/40 hover:scale-105 active:!bg-orange-600 active:!text-white transition-all duration-300 dark:shadow-orange-500/30 dark:hover:shadow-orange-500/50 dark:hover:!bg-orange-600 dark:active:!bg-orange-700 ${isBestSellerSelected ? '!bg-orange-500 !text-white' : ''}`}
        >
          BestSeller
        </Button>
      </div>
    </div>
  );
};

