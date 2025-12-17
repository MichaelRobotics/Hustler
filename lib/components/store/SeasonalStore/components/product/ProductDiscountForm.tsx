'use client';

import React, { useMemo, useEffect } from 'react';
import { Card, Heading, Text, Button } from 'frosted-ui';
import { Flame, Star } from 'lucide-react';
import type { Product } from './types';
import type { DiscountSettings } from '../../types';
import { ProductDiscountStatus } from './ProductDiscountStatus';

interface ProductDiscountFormProps {
  currentProduct: Product | null;
  productEditor: { productId: number | string | null; target: string };
  discountSettings?: DiscountSettings;
  experienceId?: string;
  hasPlans: boolean;
  isProductType: boolean;
  seasonalDiscountStatus: { status: 'none' | 'upcoming' | 'active' | 'expired'; startDate?: string; endDate?: string } | null;
  isProductDiscountLoading: boolean;
  localPromoScope: 'product' | 'plan' | undefined;
  setLocalPromoScope: (scope: 'product' | 'plan' | undefined) => void;
  localPromoCodeId: string | undefined;
  setLocalPromoCodeId: (id: string | undefined) => void;
  localManualPromoCode: string;
  setLocalManualPromoCode: (code: string) => void;
  promoMode: 'global' | 'custom';
  setPromoMode: (mode: 'global' | 'custom') => void;
  localPromoDiscountType: 'percentage' | 'fixed' | undefined;
  setLocalPromoDiscountType: (type: 'percentage' | 'fixed' | undefined) => void;
  localPromoDiscountAmount: number | undefined;
  setLocalPromoDiscountAmount: (amount: number | undefined) => void;
  localPromoLimitQuantity: number | undefined;
  setLocalPromoLimitQuantity: (quantity: number | undefined) => void;
  localPromoUnlimitedQuantity: boolean;
  setLocalPromoUnlimitedQuantity: (unlimited: boolean) => void;
  localPromoShowFireIcon: boolean;
  setLocalPromoShowFireIcon: (show: boolean) => void;
  localPromoDurationType: 'one-time' | 'forever' | 'duration_months' | undefined;
  setLocalPromoDurationType: (type: 'one-time' | 'forever' | 'duration_months' | undefined) => void;
  localPromoDurationMonths: number | undefined;
  setLocalPromoDurationMonths: (months: number | undefined) => void;
  isCreatingPromo: boolean;
  setIsCreatingPromo: (creating: boolean) => void;
  generatedPromoName: string;
  setGeneratedPromoName: (name: string) => void;
  availablePromoCodes: Array<{id: string; code: string}>;
  isLoadingPromos: boolean;
  isPromoDataLoaded: boolean;
  setIsPromoDataLoaded: (loaded: boolean) => void;
  setSelectedPromoData: (data: {
    code: string;
    amountOff: number;
    promoType: 'percentage' | 'flat_amount';
    planIds?: string[];
    stock?: number;
    unlimitedStock?: boolean;
    promoDurationMonths?: number;
  } | null) => void;
  hasDiscountSelected: boolean;
  discountValidationError: string | null;
  setDiscountValidationError: (error: string | null) => void;
  showNewPromoButton: boolean;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
  onProductUpdated?: () => void;
  handleNewPromoClick: () => void;
  handleApplyPromo: () => void;
  handleApplyExistingPromo: () => void;
  handleDeletePromo: () => void;
  handleClearDiscount: () => void;
  handleApplyGlobalDiscount: () => void;
}

export const ProductDiscountForm: React.FC<ProductDiscountFormProps> = ({
  currentProduct,
  productEditor,
  discountSettings,
  hasPlans,
  isProductType,
  seasonalDiscountStatus,
  isProductDiscountLoading,
  localPromoScope,
  setLocalPromoScope,
  localPromoCodeId,
  setLocalPromoCodeId,
  localManualPromoCode,
  setLocalManualPromoCode,
  promoMode,
  setPromoMode,
  localPromoDiscountType,
  setLocalPromoDiscountType,
  localPromoDiscountAmount,
  setLocalPromoDiscountAmount,
  localPromoLimitQuantity,
  setLocalPromoLimitQuantity,
  localPromoUnlimitedQuantity,
  setLocalPromoUnlimitedQuantity,
  localPromoShowFireIcon,
  setLocalPromoShowFireIcon,
  localPromoDurationType,
  setLocalPromoDurationType,
  localPromoDurationMonths,
  setLocalPromoDurationMonths,
  isCreatingPromo,
  setIsCreatingPromo,
  generatedPromoName,
  setGeneratedPromoName,
  availablePromoCodes,
  isLoadingPromos,
  isPromoDataLoaded,
  setIsPromoDataLoaded,
  setSelectedPromoData,
  hasDiscountSelected,
  discountValidationError,
  setDiscountValidationError,
  showNewPromoButton,
  updateProduct,
  onProductUpdated,
  handleNewPromoClick,
  handleApplyPromo,
  handleApplyExistingPromo,
  handleDeletePromo,
  handleClearDiscount,
  handleApplyGlobalDiscount,
}) => {
  if (productEditor.target === 'button') {
    return null;
  }

  // Don't show PRODUCT DISCOUNT until it fully loads
  if (isProductDiscountLoading) {
    return null;
  }

  // Ensure scope is always 'plan' for resources with plans (default behavior)
  useEffect(() => {
    if (hasPlans && localPromoScope !== 'plan') {
      setLocalPromoScope('plan');
    }
  }, [hasPlans, localPromoScope, setLocalPromoScope]);

  // Determine if a promo is selected (for resources with plans)
  // Scope is always 'plan', so check localPromoCodeId or currentProduct promoCodeId
  const hasPromoSelected = useMemo(() => {
    if (!hasPlans) return false;
    return Boolean(localPromoCodeId || currentProduct?.promoCodeId);
  }, [hasPlans, localPromoCodeId, currentProduct?.promoCodeId]);

  // Determine if the selected promo is applied to the current product
  // For resources with plans: check if selected promo matches product's promoCodeId
  const isSelectedPromoApplied = useMemo(() => {
    if (isCreatingPromo) {
      // When creating new promo, buttons should be enabled
      return true;
    }
    
    if (hasPlans) {
      // For resources with plans: scope is always 'plan', check if selected promo matches product's promoCodeId
      const selectedPromoId = localPromoCodeId || currentProduct?.promoCodeId;
      return Boolean(selectedPromoId && selectedPromoId === currentProduct?.promoCodeId);
    }
    
    // For resources without plans: buttons are enabled when in custom mode
    return promoMode === 'custom';
  }, [hasPlans, localPromoCodeId, currentProduct?.promoCodeId, isCreatingPromo, promoMode]);

  // Buttons should be disabled if:
  // 1. Promo data is loaded from DB (read-only mode), OR
  // 2. A promo is selected but not applied (for resources with plans)
  // ANY promo selection locks the fields by default, only unlocks if:
  // - Creating a new promo, OR
  // - The selected promo is applied to the product
  const areButtonsDisabled: boolean = Boolean(
    isPromoDataLoaded || 
    (hasPromoSelected && !isCreatingPromo && !isSelectedPromoApplied)
  );

  return (
    <Card 
      className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="fui-reset px-6 py-6">
        <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
          Product Discount
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </Heading>
        
        {/* Status Message */}
        <ProductDiscountStatus
          seasonalDiscountStatus={seasonalDiscountStatus}
          isProductDiscountLoading={isProductDiscountLoading}
        />
        
        {/* Product Discount Form Fields - Only show when fully loaded */}
        {(!seasonalDiscountStatus || 
          seasonalDiscountStatus.status === 'upcoming' || 
          seasonalDiscountStatus.status === 'active') && (
          <div className="space-y-5">
          {/* Promo Code - Always visible for resources with plans (scope defaults to 'plan') */}
          {hasPlans && (
            <div>
              <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                Promo Code Name
              </Text>
              <div className="flex gap-3">
              {isCreatingPromo ? (
                <>
                  <input
                    type="text"
                    value={generatedPromoName}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="3"
                    variant="soft"
                    color="gray"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingPromo(false);
                      setGeneratedPromoName('');
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="!px-6 !py-3"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <select
                    value={localPromoCodeId || currentProduct?.promoCodeId || ''}
                    onChange={(e) => {
                      setLocalPromoCodeId(e.target.value || undefined);
                    }}
                    disabled={isLoadingPromos}
                    className={`flex-1 px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${isLoadingPromos ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <option value="">{isLoadingPromos ? 'Loading promos...' : 'Select promo code...'}</option>
                    {availablePromoCodes.map((promo) => (
                      <option key={promo.id} value={promo.id}>
                        {promo.code}
                      </option>
                    ))}
                  </select>
                  {showNewPromoButton && (
                    <Button
                      size="3"
                      variant="soft"
                      color="violet"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNewPromoClick();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="!px-6 !py-3"
                    >
                      + New
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          )}

          {/* Discount Source Selector - Only visible for resources without plans */}
          {!hasPlans && (
            <div>
              <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                Discount Source
              </Text>
              <div className="flex gap-3">
                <Button
                  size="3"
                  variant={promoMode === 'global' ? 'solid' : 'soft'}
                  color="violet"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPromoMode('global');
                    // Reset custom promo fields when switching to global
                    setLocalPromoCodeId(undefined);
                    setSelectedPromoData(null);
                    setIsPromoDataLoaded(false);
                    setIsCreatingPromo(false);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="!px-6 !py-3"
                  disabled={!discountSettings?.globalDiscount || !discountSettings?.promoCode}
                >
                  Global Discount
                </Button>
                <Button
                  size="3"
                  variant={promoMode === 'custom' ? 'solid' : 'soft'}
                  color="violet"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPromoMode('custom');
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="!px-6 !py-3"
                >
                  Custom Discount
                </Button>
              </div>
            </div>
          )}

          {/* Promo Code Input - Only visible for resources without plans in custom mode */}
          {!hasPlans && promoMode === 'custom' && (
            <div>
              <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                Promo Code
              </Text>
              <input
                type="text"
                value={localManualPromoCode}
                onChange={(e) => {
                  setLocalManualPromoCode(e.target.value);
                }}
                placeholder="Enter promo code..."
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Discount fields - Visible when discount is selected OR when creating new promo OR when resource has no plans */}
          {/* For resources with plans: only show when promo code is selected AND promo data is loaded (or creating new promo) */}
          {/* For resources without plans: show when Custom Discount mode is selected, discount is selected, or creating new promo */}
          {/* Hide fields until promo is fully loaded to prevent intermediate locked state */}
          {/* Scope is always 'plan', so we check localPromoCodeId or currentProduct promoCodeId */}
          {((hasPlans && (((localPromoCodeId || currentProduct?.promoCodeId) && (isPromoDataLoaded || isCreatingPromo)) || isCreatingPromo)) || 
            (!hasPlans && (promoMode === 'custom' || hasDiscountSelected || isCreatingPromo))) && (
            <>
          {/* Global Promo Code Display - Only visible when promoMode is 'global' and resource has no plans */}
          {!hasPlans && promoMode === 'global' && discountSettings?.promoCode && (
            <div>
              <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                Promo Code
              </Text>
              <input
                type="text"
                value={discountSettings.promoCode}
                readOnly
                className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 cursor-not-allowed"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <Text size="2" className="text-gray-500 dark:text-gray-400 mt-2">
                Using global discount promo code. Discount: {discountSettings.globalDiscountType === 'percentage' ? `${discountSettings.globalDiscountAmount || discountSettings.percentage}%` : `$${discountSettings.globalDiscountAmount}`}
              </Text>
            </div>
          )}

          {/* Discount Type - Only show for custom mode or resources with plans (and promo is selected and loaded) */}
          {/* Hide until promo is fully loaded to prevent intermediate locked state */}
          {/* Scope is always 'plan', so we check localPromoCodeId or currentProduct promoCodeId */}
          {((!hasPlans && promoMode === 'custom') || (hasPlans && (((localPromoCodeId || currentProduct?.promoCodeId) && (isPromoDataLoaded || isCreatingPromo)) || isCreatingPromo))) && (
          <>
          {/* Discount Type */}
          <div>
            <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
              Discount Type
            </Text>
            <div className="flex gap-3">
              <Button
                size="3"
                variant={localPromoDiscountType === 'percentage' ? 'solid' : 'soft'}
                color="violet"
                disabled={areButtonsDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!areButtonsDisabled) {
                    setLocalPromoDiscountType('percentage');
                    setDiscountValidationError(null);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="!px-6 !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Percentage
              </Button>
              <Button
                size="3"
                variant={localPromoDiscountType === 'fixed' ? 'solid' : 'soft'}
                color="violet"
                disabled={areButtonsDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!areButtonsDisabled) {
                    setLocalPromoDiscountType('fixed');
                    setDiscountValidationError(null);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="!px-6 !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fixed Price
              </Button>
            </div>
          </div>


        {/* Discount Amount */}
        <div>
          <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
            {localPromoDiscountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
          </Text>
          <input
            type="number"
            min="0"
            max={localPromoDiscountType === 'percentage' ? 100 : undefined}
            step={localPromoDiscountType === 'percentage' ? 1 : 0.01}
            value={localPromoDiscountAmount ?? ''}
            disabled={areButtonsDisabled}
            onChange={(e) => {
              if (!areButtonsDisabled) {
                const value = parseFloat(e.target.value);
                setLocalPromoDiscountAmount(Number.isNaN(value) ? undefined : value);
                setDiscountValidationError(null);
              }
            }}
            placeholder={localPromoDiscountType === 'percentage' ? 'Enter percentage (e.g., 20)' : 'Enter amount (e.g., 10.00)'}
            className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600 ${
              discountValidationError && discountValidationError.includes('amount') ? 'border-red-500 dark:border-red-500' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* Limit Quantity */}
        <div>
          <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
            Limit Quantity
          </Text>
          <div className="space-y-3">
            <label className={`flex items-center gap-3 ${areButtonsDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={localPromoUnlimitedQuantity}
                disabled={areButtonsDisabled}
                onChange={(e) => {
                  if (!areButtonsDisabled) {
                    const isUnlimited = e.target.checked;
                    setLocalPromoUnlimitedQuantity(isUnlimited);
                    if (isUnlimited) {
                      setLocalPromoLimitQuantity(-1);
                      // If fire icon is enabled and we switch to unlimited, disable fire icon
                      if (localPromoShowFireIcon) {
                        setLocalPromoShowFireIcon(false);
                        setDiscountValidationError(null);
                      }
                    } else {
                      setLocalPromoLimitQuantity(undefined);
                      // If fire icon is enabled but we don't have a limit, show validation error
                      if (localPromoShowFireIcon) {
                        setDiscountValidationError('Enter a quantity limit above 0 to show the fire icon.');
                      }
                    }
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300">
                Unlimited
              </Text>
            </label>
            <input
              type="number"
              min="0"
              value={localPromoUnlimitedQuantity ? '' : (localPromoLimitQuantity ?? '')}
              onChange={(e) => {
                if (!areButtonsDisabled) {
                  const value = parseInt(e.target.value, 10);
                  const newLimit = Number.isNaN(value) || value <= 0 ? undefined : value;
                  setLocalPromoLimitQuantity(newLimit);
                  
                  // If fire icon is enabled, validate that we have a valid quantity
                  if (localPromoShowFireIcon && (!newLimit || newLimit <= 0)) {
                    setDiscountValidationError('Enter a quantity limit above 0 to show the fire icon.');
                  } else {
                    setDiscountValidationError(null);
                  }
                }
              }}
              disabled={localPromoUnlimitedQuantity || areButtonsDisabled}
              placeholder="Enter limit (e.g., 50)"
              className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600 ${
                discountValidationError && discountValidationError.includes('quantity') ? 'border-red-500 dark:border-red-500' : ''
              }`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <Text size="2" className="text-gray-500 dark:text-gray-400 mt-2">
              Optional limit for discounted purchases (required if showing fire icon).
            </Text>
          </div>
          </div>

          {/* Discount Duration - Only visible when resource has plans */}
          {hasPlans && (
            <>
              <div>
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                  Discount Duration
                </Text>
                <div className="flex gap-3">
                  <Button
                    size="3"
                    variant={localPromoDurationType === 'one-time' ? 'solid' : 'soft'}
                    color="violet"
                    disabled={areButtonsDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!areButtonsDisabled) {
                        setLocalPromoDurationType('one-time');
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="!px-6 !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    One-Time
                  </Button>
                  <Button
                    size="3"
                    variant={localPromoDurationType === 'forever' ? 'solid' : 'soft'}
                    color="violet"
                    disabled={areButtonsDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!areButtonsDisabled) {
                        setLocalPromoDurationType('forever');
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="!px-6 !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Forever
                  </Button>
                  <Button
                    size="3"
                    variant={localPromoDurationType === 'duration_months' ? 'solid' : 'soft'}
                    color="violet"
                    disabled={areButtonsDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!areButtonsDisabled) {
                        setLocalPromoDurationType('duration_months');
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="!px-6 !py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Duration
                  </Button>
                </div>
              </div>

              {/* Duration Months (only shown when duration_months selected) */}
              {localPromoDurationType === 'duration_months' && (
            <div>
              <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                Duration (Months)
              </Text>
              <input
                type="number"
                min="1"
                value={localPromoDurationMonths ?? ''}
                disabled={areButtonsDisabled}
                onChange={(e) => {
                  if (!areButtonsDisabled) {
                    const value = parseInt(e.target.value, 10);
                    setLocalPromoDurationMonths(Number.isNaN(value) || value <= 0 ? undefined : value);
                  }
                }}
                placeholder="Enter number of months (e.g., 3)"
                className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
            </>
          )}
          </>
          )}

          {/* Show Fire Icon Toggle - Only show for custom mode or resources with plans (and promo is selected and loaded) */}
          {/* Hide until promo is fully loaded to prevent intermediate locked state */}
          {/* Scope is always 'plan', so we check localPromoCodeId or currentProduct promoCodeId */}
          {((!hasPlans && promoMode === 'custom') || (hasPlans && (((localPromoCodeId || currentProduct?.promoCodeId) && (isPromoDataLoaded || isCreatingPromo)) || isCreatingPromo))) && (
          <>
          {/* Show Fire Icon Toggle */}
          <div>
            <label className={`flex items-center gap-3 ${areButtonsDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                checked={localPromoShowFireIcon}
                disabled={areButtonsDisabled}
                onChange={(e) => {
                  if (!areButtonsDisabled) {
                    const checked = e.target.checked;
                    setLocalPromoShowFireIcon(checked);
                    
                    // If enabling fire icon and we have a limit quantity, ensure it's set
                    if (checked && !localPromoUnlimitedQuantity && localPromoLimitQuantity && localPromoLimitQuantity > 0) {
                      // Fire icon is enabled, quantity is already set - this is good
                      // The quantity will be saved when "Apply Promotion" is clicked
                    } else if (checked && (!localPromoLimitQuantity || localPromoLimitQuantity <= 0)) {
                      // Fire icon enabled but no valid quantity - show validation error
                      setDiscountValidationError('Enter a quantity limit above 0 to show the fire icon.');
                    } else {
                      // Fire icon disabled or validation passed - clear error
                      setDiscountValidationError(null);
                    }
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" />
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300">
                  Show Fire Icon + "X left" text
                </Text>
              </div>
            </label>
          </div>
          </>
          )}

          {/* Validation Error */}
          {discountValidationError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <Text size="2" className="text-red-600 dark:text-red-400">
                {discountValidationError}
              </Text>
            </div>
          )}
            </>
          )}

          {/* Actions - Show buttons for discount management */}
          {(!hasPlans || isCreatingPromo || localPromoCodeId) && (
            <div className="flex justify-end gap-3 pt-2">
              {isCreatingPromo && (
                <>
                  {/* Clear button only shown for resources without plans */}
                  {!hasPlans && (
                    <Button
                      size="3"
                      color="gray"
                      variant="soft"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearDiscount();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="!px-6 !py-3"
                    >
                      Clear
                    </Button>
                  )}
                  <Button
                    size="3"
                    color="violet"
                    variant="solid"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyPromo();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="!px-6 !py-3"
                    disabled={!localPromoDiscountType || !localPromoDiscountAmount || localPromoDiscountAmount <= 0}
                  >
                    Create Discount
                  </Button>
                </>
              )}
              {localPromoCodeId && !isCreatingPromo && isPromoDataLoaded && (
                <>
                  {/* Only show "Apply Discount" if selected promo is not the currently applied one */}
                  {localPromoCodeId !== currentProduct?.promoCodeId && (
                    <Button
                      size="3"
                      color="violet"
                      variant="solid"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyExistingPromo();
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="!px-6 !py-3"
                    >
                      Apply Discount
                    </Button>
                  )}
                  <Button
                    size="3"
                    variant="solid"
                    color="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePromo();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="!px-6 !py-3"
                  >
                    Delete
                  </Button>
                </>
              )}
              {!hasPlans && !isCreatingPromo && (
                <>
                  {promoMode === 'global' ? (
                    <>
                      {/* Only show "Apply Discount" if global discount is not already applied */}
                      {!(currentProduct?.promoCode && 
                         discountSettings?.globalDiscount && 
                         discountSettings?.promoCode === currentProduct.promoCode) && (
                        <Button
                          size="3"
                          color="violet"
                          variant="solid"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyGlobalDiscount();
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="!px-6 !py-3"
                          disabled={!discountSettings?.globalDiscount || !discountSettings?.promoCode}
                        >
                          Apply Discount
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Check if custom discount is already applied */}
                      {currentProduct?.promoCode && 
                       currentProduct.promoCode === localManualPromoCode && 
                       localManualPromoCode.trim() !== '' &&
                       !(discountSettings?.globalDiscount && discountSettings?.promoCode === currentProduct.promoCode) ? (
                        // Custom discount already applied - show only Clear button (which will de-apply)
                        <Button
                          size="3"
                          color="gray"
                          variant="soft"
                          onClick={(e) => {
                            e.stopPropagation();
                            // De-apply custom discount: remove from template and clear fields
                            const updates: Partial<Product> = {
                              promoCode: undefined,
                              promoCodeId: undefined,
                              promoScope: undefined,
                              promoDiscountType: undefined,
                              promoDiscountAmount: undefined,
                              promoLimitQuantity: undefined,
                              promoQuantityLeft: undefined,
                              promoShowFireIcon: false,
                              promoDurationType: undefined,
                              promoDurationMonths: undefined,
                            };
                            updateProduct(productEditor.productId!, updates);
                            // Clear local state
                            setLocalManualPromoCode('');
                            setLocalPromoDiscountType(undefined);
                            setLocalPromoDiscountAmount(undefined);
                            setLocalPromoLimitQuantity(undefined);
                            setLocalPromoShowFireIcon(false);
                            setLocalPromoDurationType(undefined);
                            setLocalPromoDurationMonths(undefined);
                            if (onProductUpdated) {
                              setTimeout(() => {
                                onProductUpdated();
                              }, 100);
                            }
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="!px-6 !py-3"
                        >
                          Clear
                        </Button>
                      ) : (
                        // Custom discount not applied - show Clear and Apply Discount buttons
                        <>
                          <Button
                            size="3"
                            color="gray"
                            variant="soft"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearDiscount();
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="!px-6 !py-3"
                          >
                            Clear
                          </Button>
                          <Button
                            size="3"
                            color="violet"
                            variant="solid"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyPromo();
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="!px-6 !py-3"
                            disabled={!localPromoDiscountType || !localPromoDiscountAmount || localPromoDiscountAmount <= 0 || !localManualPromoCode?.trim()}
                          >
                            Apply Discount
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          </div>
        )}
      </div>
    </Card>
  );
};



