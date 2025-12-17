import { Product, DiscountSettings } from '../types';

/**
 * Discount status types
 */
export type DiscountStatus = 'active' | 'approaching' | 'expired' | 'non-existent';

/**
 * Discount data from database API
 */
export interface DiscountData {
  seasonalDiscountId?: string;
  seasonalDiscountStart?: string | Date;
  seasonalDiscountEnd?: string | Date;
  seasonalDiscountText?: string;
  seasonalDiscountPromo?: string;
  seasonalDiscountDurationType?: 'one-time' | 'forever' | 'duration_months';
  seasonalDiscountDurationMonths?: number;
  seasonalDiscountQuantityPerProduct?: number;
  globalDiscount?: boolean;
  isExpired?: boolean; // Flag to indicate if discount has expired
}

/**
 * Check discount status based on current time and discount dates
 */
export function checkDiscountStatus(discountData: DiscountData | null): DiscountStatus {
  if (!discountData || !discountData.seasonalDiscountId) {
    return 'non-existent';
  }

  const now = new Date();
  const startDate = discountData.seasonalDiscountStart 
    ? new Date(discountData.seasonalDiscountStart) 
    : null;
  const endDate = discountData.seasonalDiscountEnd 
    ? new Date(discountData.seasonalDiscountEnd) 
    : null;

  // If no dates, consider it non-existent
  if (!startDate && !endDate) {
    return 'non-existent';
  }

  // Check if expired
  if (endDate && now > endDate) {
    return 'expired';
  }

  // Check if active (between start and end, or just end if no start)
  if (startDate && endDate && now >= startDate && now <= endDate) {
    return 'active';
  }
  if (!startDate && endDate && now <= endDate) {
    return 'active';
  }
  if (startDate && !endDate && now >= startDate) {
    return 'active';
  }

  // Check if approaching (start date is in the future)
  if (startDate && now < startDate) {
    return 'approaching';
  }

  // Default to non-existent if we can't determine status
  return 'non-existent';
}

/**
 * Remove all promo-related fields from a product
 */
export function removeProductPromoData(product: Product): Product {
  const {
    promoCode,
    promoCodeId,
    promoDiscountType,
    promoDiscountAmount,
    promoLimitQuantity,
    promoQuantityLeft,
    promoShowFireIcon,
    promoScope,
    promoDurationType,
    promoDurationMonths,
    ...cleanedProduct
  } = product;
  
  return cleanedProduct;
}

/**
 * Convert database discount data to DiscountSettings format
 */
export function convertDiscountDataToSettings(discountData: DiscountData): DiscountSettings {
  return {
    enabled: true,
    globalDiscount: discountData.globalDiscount || false,
    globalDiscountType: 'percentage',
    globalDiscountAmount: 0,
    percentage: 0,
    startDate: discountData.seasonalDiscountStart 
      ? new Date(discountData.seasonalDiscountStart).toISOString() 
      : '',
    endDate: discountData.seasonalDiscountEnd 
      ? new Date(discountData.seasonalDiscountEnd).toISOString() 
      : '',
    discountText: discountData.seasonalDiscountText || '',
    promoCode: discountData.seasonalDiscountPromo || '',
    durationType: discountData.seasonalDiscountDurationType,
    durationMonths: discountData.seasonalDiscountDurationMonths,
    quantityPerProduct: discountData.seasonalDiscountQuantityPerProduct,
    seasonalDiscountId: discountData.seasonalDiscountId,
    prePromoMessages: [],
    activePromoMessages: [],
  };
}

/**
 * Create default empty discount settings
 */
export function createDefaultDiscountSettings(): DiscountSettings {
  return {
    enabled: false,
    globalDiscount: false,
    globalDiscountType: 'percentage',
    globalDiscountAmount: 20,
    percentage: 20,
    startDate: '',
    endDate: '',
    discountText: '',
    promoCode: '',
    prePromoMessages: [],
    activePromoMessages: [],
  };
}

