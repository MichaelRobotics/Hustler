'use client';

import React, { useState, useEffect } from 'react';
import { Heading, Text } from 'frosted-ui';
import { Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/utils/api-client';
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
  productType?: "LINK" | "FILE" | "WHOP";
  whopProductId?: string;
  resourceId?: string;
  experienceId?: string;
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
  productType,
  whopProductId,
  resourceId,
  experienceId,
}) => {
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [dbStats, setDbStats] = useState<{
    sold: number | null;
    starRating: number;
    reviewCount: number;
    promoStock: number | null;
  } | null>(null);

  // Determine if this is a WHOP or FILE type product that should fetch from DB
  // WHOP products may be converted to LINK type in frontend, so check for whopProductId
  // FILE products should always fetch from DB if they have resourceId or whopProductId
  const shouldFetchFromDB = Boolean(((productType === 'FILE') || (productType === 'WHOP') || (productType === 'LINK' && whopProductId)) && (resourceId || whopProductId) && experienceId);
  const isReadOnly = shouldFetchFromDB;

  // Fetch stats from database for WHOP and FILE types
  useEffect(() => {
    if (!shouldFetchFromDB) return;

    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        // Use resourceId if available, otherwise use whopProductId
        const idToUse = resourceId || whopProductId || String(productId);
        const url = `/api/resources/${idToUse}/stats?experienceId=${encodeURIComponent(experienceId!)}`;
        
        const response = await apiGet(url, experienceId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.status}`);
        }

        const stats = await response.json();
        setDbStats(stats);

        // Auto-populate local state with fetched stats
        if (stats.sold !== null && stats.sold !== undefined) {
          setLocalSalesCount(stats.sold);
          updateProduct(productId, { salesCount: stats.sold });
          // Auto-enable showSalesCount if sold count exists
          if (!localShowSalesCount && stats.sold > 0) {
            setLocalShowSalesCount(true);
            updateProduct(productId, { showSalesCount: true });
          }
        }

        if (stats.starRating > 0 || stats.reviewCount > 0) {
          setLocalStarRating(stats.starRating);
          setLocalReviewCount(stats.reviewCount);
          updateProduct(productId, {
            starRating: stats.starRating,
            reviewCount: stats.reviewCount,
          });
          // Auto-enable showRatingInfo if reviews exist
          if (!localShowRatingInfo && stats.reviewCount > 0) {
            setLocalShowRatingInfo(true);
            updateProduct(productId, { showRatingInfo: true });
          }
        }
      } catch (error) {
        console.error('Error fetching product stats:', error);
        // Don't show error to user, just fall back to current values
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, productType, resourceId, whopProductId, experienceId]);

  // Use DB stats if available, otherwise use local state
  const displaySalesCount = isReadOnly && dbStats ? dbStats.sold : localSalesCount;
  const displayStarRating = isReadOnly && dbStats ? dbStats.starRating : localStarRating;
  const displayReviewCount = isReadOnly && dbStats ? dbStats.reviewCount : localReviewCount;
  const displayPromoStock = isReadOnly && dbStats ? dbStats.promoStock : null;

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
            {isReadOnly && (
              <Text size="1" className="text-gray-500 dark:text-gray-400 mt-1 block">
                (Auto-synced from database)
              </Text>
            )}
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
          <div className="relative">
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : isReadOnly ? (
              <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white">
                {displaySalesCount !== null && displaySalesCount !== undefined
                  ? displaySalesCount.toLocaleString()
                  : 'N/A'}
              </div>
            ) : (
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
        )}
      </div>

      {/* Rating + Reviews */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Text size="3" weight="medium" className="text-gray-800 dark:text-gray-100">
              Show Rating & Reviews
            </Text>
            {isReadOnly && (
              <Text size="1" className="text-gray-500 dark:text-gray-400 mt-1 block">
                (Auto-synced from database)
              </Text>
            )}
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
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : isReadOnly ? (
                <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white">
                  {displayStarRating && displayStarRating > 0 ? displayStarRating.toFixed(1) : 'N/A'}
                </div>
              ) : (
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
              )}
            </div>
            <div>
              <Text
                as="label"
                size="2"
                className="block mb-2 text-gray-600 dark:text-gray-300"
              >
                Review Count
              </Text>
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : isReadOnly ? (
                <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white">
                  {displayReviewCount && displayReviewCount > 0 ? displayReviewCount.toLocaleString() : 'N/A'}
                </div>
              ) : (
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
              )}
            </div>
          </div>
        )}
      </div>

      {/* Promo Stock (only for WHOP and FILE types) */}
      {isReadOnly && displayPromoStock !== null && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Text size="3" weight="medium" className="text-gray-800 dark:text-gray-100">
                Promo Stock
              </Text>
              <Text size="1" className="text-gray-500 dark:text-gray-400 mt-1 block">
                (Auto-synced from database)
              </Text>
            </div>
          </div>
          {isLoadingStats ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white">
              {displayPromoStock.toLocaleString()} left
            </div>
          )}
        </div>
      )}
    </div>
  );
};



