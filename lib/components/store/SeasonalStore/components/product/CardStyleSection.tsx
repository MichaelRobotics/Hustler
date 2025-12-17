'use client';

import React from 'react';
import { Button, Heading, Text } from 'frosted-ui';
import type { Product } from './types';

interface CardStyleSectionProps {
  currentProduct: Product | null;
  products: Product[];
  productId: number | string;
  legacyTheme: {
    card: string;
    text: string;
  };
  transparencyValue: number;
  setTransparencyValue: (value: number) => void;
  setIsUserInteracting: (value: boolean) => void;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
}

export const CardStyleSection: React.FC<CardStyleSectionProps> = ({
  currentProduct,
  products,
  productId,
  legacyTheme,
  transparencyValue,
  setTransparencyValue,
  setIsUserInteracting,
  updateProduct,
}) => {
  return (
    <>
      <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
        Card Style
      </Heading>
      <div className="grid grid-cols-2 gap-4 mb-5">
        {[
          // Frosted UI Violet
          { card: 'bg-violet-50/95 dark:bg-violet-900/20 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-violet-500/30 border border-violet-200 dark:border-violet-700', title: 'text-violet-900 dark:text-violet-100', desc: 'text-violet-700 dark:text-violet-300', name: 'Violet' },
          // Frosted UI Gray
          { card: 'bg-gray-50/95 dark:bg-gray-800/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-gray-500/30 border border-gray-200 dark:border-gray-700', title: 'text-gray-900 dark:text-gray-100', desc: 'text-gray-700 dark:text-gray-300', name: 'Gray' },
          // Frosted UI Green
          { card: 'bg-green-50/95 dark:bg-green-900/20 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-green-500/30 border border-green-200 dark:border-green-700', title: 'text-green-900 dark:text-green-100', desc: 'text-green-700 dark:text-green-300', name: 'Green' },
          // Frosted UI Red
          { card: 'bg-red-50/95 dark:bg-red-900/20 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-red-500/30 border border-red-200 dark:border-red-700', title: 'text-red-900 dark:text-red-100', desc: 'text-red-700 dark:text-red-300', name: 'Red' },
          // Frosted UI Blue
          { card: 'bg-blue-50/95 dark:bg-blue-900/20 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30 border border-blue-200 dark:border-blue-700', title: 'text-blue-900 dark:text-blue-100', desc: 'text-blue-700 dark:text-blue-300', name: 'Blue' },
          // Frosted UI Amber
          { card: 'bg-amber-50/95 dark:bg-amber-900/20 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-amber-500/30 border border-amber-200 dark:border-amber-700', title: 'text-amber-900 dark:text-amber-100', desc: 'text-amber-700 dark:text-amber-300', name: 'Amber' },
          // Dark theme
          { card: 'bg-gray-900/90 dark:bg-gray-950/95 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-violet-400/50 border border-violet-400/40', title: 'text-white', desc: 'text-gray-300', name: 'Dark' },
          // Dark Violet
          { card: 'bg-gray-900/90 dark:bg-gray-950/95 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-violet-400/50 border border-violet-400/40', title: 'text-white', desc: 'text-violet-300', name: 'Dark Violet' },
          // Dark Blue
          { card: 'bg-gray-900/90 dark:bg-gray-950/95 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-blue-400/50 border border-blue-400/40', title: 'text-white', desc: 'text-blue-300', name: 'Dark Blue' }
        ].map((preset, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              updateProduct(productId, { cardClass: preset.card, titleClass: preset.title, descClass: preset.desc });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={`p-4 rounded-xl text-left transition-all hover:scale-105 ${preset.card} ${
              currentProduct?.cardClass === preset.card ? 'ring-2 ring-violet-500 dark:ring-violet-400' : ''
            }`}
          >
            <div className={`text-sm font-bold ${preset.title}`}>Product Title</div>
            <div className={`text-xs mt-1 ${preset.desc}`}>Short description...</div>
          </button>
        ))}
      </div>
      {/* Card Transparency */}
      <div className="mt-6">
        <Text
          as="label"
          size="3"
          weight="medium"
          className="block mb-4"
        >
          Card Transparency
        </Text>
        
        {/* Slider */}
        <div className="flex items-center gap-4">
          <Text size="1">0%</Text>
          <input
            key={`transparency-${productId}`}
            type="range"
            min={0}
            max={100}
            step={5}
            value={transparencyValue}
            onChange={(e) => {
              e.stopPropagation();
              const val = parseInt(e.target.value, 10);
              const roundedVal = Math.round(val / 5) * 5;
              const clampedVal = Math.max(0, Math.min(100, roundedVal));
              
              setIsUserInteracting(true);
              setTransparencyValue(clampedVal);
              
              const current = products.find(p => p.id === productId)?.cardClass || legacyTheme.card;
              
              const baseMatch = current.match(/bg-[^\s/]+(?:\[[^\]]+\])?/);
              if (baseMatch) {
                const baseClass = baseMatch[0];
                const restOfClasses = current.replace(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/\d{1,3})?/, '').trim();
                const newCardClass = `${baseClass}/${clampedVal}${restOfClasses ? ' ' + restOfClasses : ''}`;
                updateProduct(productId, { cardClass: newCardClass });
              } else {
                const newCardClass = `bg-white/${clampedVal} backdrop-blur-sm shadow-xl`;
                updateProduct(productId, { cardClass: newCardClass });
              }
            }}
            onMouseUp={() => {
              setTimeout(() => setIsUserInteracting(false), 100);
            }}
            onTouchEnd={() => {
              setTimeout(() => setIsUserInteracting(false), 100);
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1"
          />
          <Text size="1">100%</Text>
          <Text size="2" weight="semi-bold">{transparencyValue}%</Text>
        </div>
      </div>
      
      <div className="flex items-center justify-end w-full mt-6">
        <Button
          size="3"
          color="violet"
          variant="surface"
          onClick={(e) => {
            e.stopPropagation();
            const currentCard = products.find(p => p.id === productId)?.cardClass || legacyTheme.card;
            const currentTitle = products.find(p => p.id === productId)?.titleClass || legacyTheme.text;
            const currentDesc = products.find(p => p.id === productId)?.descClass || legacyTheme.text;
            products.forEach(p => {
              updateProduct(p.id, { cardClass: currentCard, titleClass: currentTitle, descClass: currentDesc });
            });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="!px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
        >
          Apply to All Cards
        </Button>
      </div>
    </>
  );
};

