'use client';

import React from 'react';
import { Text, Spinner } from 'frosted-ui';

interface SeasonalDiscountStatus {
  status: 'none' | 'upcoming' | 'active' | 'expired';
  startDate?: string;
  endDate?: string;
}

interface ProductDiscountStatusProps {
  seasonalDiscountStatus: SeasonalDiscountStatus | null;
  isProductDiscountLoading: boolean;
}

export const ProductDiscountStatus: React.FC<ProductDiscountStatusProps> = ({
  seasonalDiscountStatus,
  isProductDiscountLoading,
}) => {
  if (!seasonalDiscountStatus) return null;

  return (
    <div className="mb-5">
      <div style={{ width: 300 }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
            {seasonalDiscountStatus.status === 'none' && (
              <Text size="2" className="text-gray-600 dark:text-gray-400">
                No active discount
              </Text>
            )}
            {seasonalDiscountStatus.status === 'upcoming' && (
              <Text size="2" className="text-blue-600 dark:text-blue-400">
                Discount approaching
                {seasonalDiscountStatus.startDate && (
                  <span className="ml-1">
                    (starts {new Date(seasonalDiscountStatus.startDate).toLocaleDateString()})
                  </span>
                )}
              </Text>
            )}
            {seasonalDiscountStatus.status === 'active' && (
              <Text size="2" className="text-green-600 dark:text-green-400">
                Discount active
                {seasonalDiscountStatus.endDate && (
                  <span className="ml-1">
                    (ends {new Date(seasonalDiscountStatus.endDate).toLocaleDateString()})
                  </span>
                )}
              </Text>
            )}
            {seasonalDiscountStatus.status === 'expired' && (
              <Text size="2" className="text-red-600 dark:text-red-400">
                Discount expired
                {seasonalDiscountStatus.endDate && (
                  <span className="ml-1">
                    (ended {new Date(seasonalDiscountStatus.endDate).toLocaleDateString()})
                  </span>
                )}
              </Text>
            )}
          </div>
          {isProductDiscountLoading && (
            <Spinner
              loading
              size="2"
            />
          )}
        </div>
      </div>
    </div>
  );
};



