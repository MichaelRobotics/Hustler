'use client';

import React from 'react';
import { Button, Text } from 'frosted-ui';
import type { Product } from './types';

interface ButtonStyleSectionProps {
  currentProduct: Product | null;
  products: Product[];
  productId: number | string;
  legacyTheme: {
    accent: string;
  };
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
}

export const ButtonStyleSection: React.FC<ButtonStyleSectionProps> = ({
  currentProduct,
  products,
  productId,
  legacyTheme,
  updateProduct,
}) => {
  return (
    <div>
      <Text
        as="label"
        size="3"
        weight="medium"
        className="block mb-3"
      >
        Button Style
      </Text>
      <div className="flex flex-wrap gap-3 mb-5">
        {[legacyTheme.accent,
          'bg-violet-600 hover:bg-violet-700 text-white',
          'bg-gray-600 hover:bg-gray-700 text-white',
          'bg-green-600 hover:bg-green-700 text-white',
          'bg-red-600 hover:bg-red-700 text-white',
          'bg-amber-500 hover:bg-amber-600 text-gray-900',
          'bg-purple-600 hover:bg-purple-700 text-white',
          'bg-slate-800 hover:bg-slate-700 text-white',
          'bg-orange-600 hover:bg-orange-700 text-white'
        ].map((cls, idx) => {
          const isSelected = currentProduct?.buttonClass === cls;
          const colorMap: Array<'violet' | 'gray' | 'green' | 'red' | 'purple' | 'orange'> = ['violet', 'violet', 'gray', 'green', 'red', 'violet', 'violet', 'violet', 'violet'];
          const shadowClassMap: Record<number, string> = {
            0: 'shadow-violet-500/25 hover:shadow-violet-500/40 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 hover:!bg-violet-500 active:!bg-violet-600 dark:hover:!bg-violet-600 dark:active:!bg-violet-700',
            1: 'shadow-violet-500/25 hover:shadow-violet-500/40 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 hover:!bg-violet-500 active:!bg-violet-600 dark:hover:!bg-violet-600 dark:active:!bg-violet-700',
            2: 'shadow-gray-500/25 hover:shadow-gray-500/40 dark:shadow-gray-500/30 dark:hover:shadow-gray-500/50 hover:!bg-gray-500 active:!bg-gray-600 dark:hover:!bg-gray-600 dark:active:!bg-gray-700',
            3: 'shadow-green-500/25 hover:shadow-green-500/40 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 hover:!bg-green-500 active:!bg-green-600 dark:hover:!bg-green-600 dark:active:!bg-green-700',
            4: 'shadow-red-500/25 hover:shadow-red-500/40 dark:shadow-red-500/30 dark:hover:shadow-red-500/50 hover:!bg-red-500 active:!bg-red-600 dark:hover:!bg-red-600 dark:active:!bg-red-700',
            5: 'shadow-purple-500/25 hover:shadow-purple-500/40 dark:shadow-purple-500/30 dark:hover:shadow-purple-500/50 hover:!bg-purple-500 active:!bg-purple-600 dark:hover:!bg-purple-600 dark:active:!bg-purple-700',
            6: 'shadow-slate-500/25 hover:shadow-slate-500/40 dark:shadow-slate-500/30 dark:hover:shadow-slate-500/50 hover:!bg-slate-500 active:!bg-slate-600 dark:hover:!bg-slate-600 dark:active:!bg-slate-700',
            7: 'shadow-orange-500/25 hover:shadow-orange-500/40 dark:shadow-orange-500/30 dark:hover:shadow-orange-500/50 hover:!bg-orange-500 active:!bg-orange-600 dark:hover:!bg-orange-600 dark:active:!bg-orange-700',
            8: 'shadow-violet-500/25 hover:shadow-violet-500/40 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 hover:!bg-violet-500 active:!bg-violet-600 dark:hover:!bg-violet-600 dark:active:!bg-violet-700',
          };
          const selectedClassMap: Record<number, string> = {
            0: isSelected ? '!bg-violet-500 !text-white' : '',
            1: isSelected ? '!bg-violet-500 !text-white' : '',
            2: isSelected ? '!bg-gray-500 !text-white' : '',
            3: isSelected ? '!bg-green-500 !text-white' : '',
            4: isSelected ? '!bg-red-500 !text-white' : '',
            5: isSelected ? '!bg-purple-500 !text-white' : '',
            6: isSelected ? '!bg-slate-500 !text-white' : '',
            7: isSelected ? '!bg-orange-500 !text-white' : '',
            8: isSelected ? '!bg-violet-500 !text-white' : '',
          };
          const currentColor = colorMap[idx] || 'violet';
          const shadowClasses = shadowClassMap[idx] || shadowClassMap[0];
          const selectedClasses = selectedClassMap[idx] || '';
          return (
            <Button
              key={`${cls}-${idx}`}
              size="3"
              variant="surface"
              color={currentColor}
              onClick={(e) => {
                e.stopPropagation();
                updateProduct(productId, { buttonClass: cls });
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className={`!px-6 !py-3 shadow-lg ${shadowClasses} hover:!text-white hover:scale-105 active:!text-white transition-all duration-300 ${selectedClasses} ${cls}`}
            >
              {idx === 0 ? 'Theme Accent' : 'Preset'}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center justify-end w-full">
        <Button
          size="3"
          color="violet"
          variant="surface"
          onClick={(e) => {
            e.stopPropagation();
            const current = products.find(p => p.id === productId)?.buttonClass || legacyTheme.accent;
            products.forEach(p => {
              updateProduct(p.id, { buttonClass: current });
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="!px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
        >
          Apply to All Buttons
        </Button>
      </div>
    </div>
  );
};

