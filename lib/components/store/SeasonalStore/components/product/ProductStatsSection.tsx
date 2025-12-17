'use client';

import React from 'react';
import { Heading, Text } from 'frosted-ui';
import type { Product } from './types';

interface ProductStatsSectionProps {
  productId: number | string;
  localShowSalesCount: boolean;
  setLocalShowSalesCount: (value: boolean) => void;
  localSalesCount: number | undefined;
  setLocalSalesCount: (value: number | undefined) => void;
  localShowRatingInfo: boolean;
  setLocalShowRatingInfo: (value: boolean) => void;
  localStarRating: number | undefined;
  setLocalStarRating: (value: number | undefined) => void;
  localReviewCount: number | undefined;
  setLocalReviewCount: (value: number | undefined) => void;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
}

export const ProductStatsSection: React.FC<ProductStatsSectionProps> = ({
  productId,
  localShowSalesCount,
  setLocalShowSalesCount,
  localSalesCount,
  setLocalSalesCount,
  localShowRatingInfo,
  setLocalShowRatingInfo,
  localStarRating,
  setLocalStarRating,
  localReviewCount,
  setLocalReviewCount,
  updateProduct,
}) => {
  return (
    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-5">
      <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 text-sm font-medium uppercase tracking-wider">
        Product Stats
      </Heading>

      {/* Sales Count */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text size="3" weight="medium" className="text-gray-800 dark:text-gray-100">
              Show Sales Count
            </Text>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={localShowSalesCount}
              onChange={(e) => {
                const checked = e.target.checked;
                setLocalShowSalesCount(checked);
                updateProduct(productId, { showSalesCount: checked });
              }}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <Text size="2" className="text-gray-700 dark:text-gray-200">
              {localShowSalesCount ? 'On' : 'Off'}
            </Text>
          </label>
        </div>
        {localShowSalesCount && (
          <input
            type="number"
            min="0"
            value={localSalesCount ?? ''}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              const parsed = Number.isNaN(value) ? undefined : Math.max(0, value);
              setLocalSalesCount(parsed);
              updateProduct(productId, { salesCount: parsed });
            }}
            placeholder="Enter total sales (e.g., 250)"
            className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Rating + Reviews */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text size="3" weight="medium" className="text-gray-800 dark:text-gray-100">
              Show Rating & Reviews
            </Text>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={localShowRatingInfo}
              onChange={(e) => {
                const checked = e.target.checked;
                setLocalShowRatingInfo(checked);
                updateProduct(productId, { showRatingInfo: checked });
              }}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <Text size="2" className="text-gray-700 dark:text-gray-200">
              {localShowRatingInfo ? 'On' : 'Off'}
            </Text>
          </label>
        </div>
        {localShowRatingInfo && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Text
                as="label"
                size="2"
                className="block mb-2 text-gray-600 dark:text-gray-300"
              >
                Star Rating (0-5)
              </Text>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={localStarRating ?? ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  const parsed = Number.isNaN(value) ? undefined : Math.min(5, Math.max(0, value));
                  setLocalStarRating(parsed);
                  updateProduct(productId, { starRating: parsed });
                }}
                placeholder="4.8"
                className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
            <div>
              <Text
                as="label"
                size="2"
                className="block mb-2 text-gray-600 dark:text-gray-300"
              >
                Review Count
              </Text>
              <input
                type="number"
                min="0"
                value={localReviewCount ?? ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  const parsed = Number.isNaN(value) ? undefined : Math.max(0, value);
                  setLocalReviewCount(parsed);
                  updateProduct(productId, { reviewCount: parsed });
                }}
                placeholder="120"
                className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

