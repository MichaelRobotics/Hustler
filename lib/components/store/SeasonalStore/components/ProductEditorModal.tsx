'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Heading, Text, Card, Progress } from 'frosted-ui';
import { Edit, X, Package, Sparkles, Star, Award, ChevronDown, Bold, Italic, Palette, Type } from 'lucide-react';
import { ButtonColorControls } from './ButtonColorControls';
import { tailwindTextColorToHex } from '../utils/colors';
import { EMOJI_DATABASE } from '../actions/constants';
import type { DiscountSettings } from '../types';
import { ProductPageModal } from './ProductPageModal';
import type { LegacyTheme } from '../types';
import { apiPost, apiGet } from '@/lib/utils/api-client';
import { removeProductPromoData, checkDiscountStatus, type DiscountData } from '../utils/discountHelpers';
import { 
  FormattingToolbar, 
  BadgeSelector, 
  ProductStatsSection, 
  ProductDiscountStatus, 
  ButtonStyleSection, 
  CardStyleSection,
  ProductDiscountForm,
  ClaimButtonSettings,
  ProductEditorModalHeader,
  EditProductPageButton
} from './product';

interface Product {
  id: number | string;
  name: string;
  description: string;
  price: number;
  image: string;
  containerAsset?: {
    src: string;
    alt: string;
    id: string;
    scale: number;
    rotation: number;
  };
  cardClass?: string;
  buttonText?: string;
  buttonClass?: string;
  buttonAnimColor?: string;
  titleClass?: string;
  descClass?: string;
  buttonLink?: string;
  // WHOP attachment support for product images
  imageAttachmentId?: string | null;
  imageAttachmentUrl?: string | null;
  whopProductId?: string; // ID of the actual Whop product/app (for synced products)
  // Product type and file support
  type?: "LINK" | "FILE"; // Product type: LINK for external links, FILE for downloadable files
  storageUrl?: string; // File download URL for FILE type products
  productImages?: string[]; // Array of up to 3 product image URLs for FILE type products
  // Badge support
  badge?: 'new' | '5star' | 'bestseller' | null;
  // Promo support
  promoEnabled?: boolean;
  promoDiscountType?: 'percentage' | 'fixed';
  promoDiscountAmount?: number;
  promoLimitQuantity?: number;
  promoQuantityLeft?: number;
  promoShowFireIcon?: boolean;
  promoScope?: 'product' | 'plan'; // Whether promo applies to product or plan
  promoCodeId?: string; // ID of selected promo code from database
  promoCode?: string; // Promo code string (saved to template for display)
  promoDurationType?: 'one-time' | 'forever' | 'duration_months'; // Discount duration type
  promoDurationMonths?: number; // Duration in months (when duration_months selected)
  checkoutConfigurationId?: string; // Checkout configuration ID (if checkout-only)
  salesCount?: number;
  showSalesCount?: boolean;
  starRating?: number;
  reviewCount?: number;
  showRatingInfo?: boolean;
}

interface ProductEditorModalProps {
  isOpen: boolean;
  productEditor: {
    isOpen: boolean;
    productId: number | string | null;
    target: string;
  };
  products: Product[];
  promoButton: {
    text: string;
    icon: string;
    buttonClass: string;
    ringClass: string;
    ringHoverClass: string;
  };
  legacyTheme: {
    accent: string;
    card: string;
    text: string;
  };
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  discountSettings?: DiscountSettings;
  // Handlers
  onClose: () => void;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
  setPromoButton: (fn: (prev: any) => any) => void;
  getThemeQuickColors?: (theme: any) => string[];
  backgroundUrl?: string | null;
  isInitialLoadComplete?: boolean;
  isStoreContentReady?: boolean;
  isTemplateLoaded?: boolean;
  lastSavedSnapshot?: string | null;
  experienceId?: string; // Experience ID for API calls
  onProductUpdated?: () => void; // Callback to trigger template auto-save after product update
  onUserUpdate?: () => Promise<void>; // Callback to refresh user context after payment
  // Template management props
  templates?: any[]; // All templates
  setTemplates?: (templates: any[] | ((prev: any[]) => any[])) => void;
  updateCachedTemplates?: (updater: (prev: Map<string, any>) => Map<string, any>) => void;
  updateTemplate?: (templateId: string, updates: { templateData?: any }) => Promise<any>;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  isOpen,
  productEditor,
  products,
  promoButton,
  legacyTheme,
  backgroundAnalysis,
  discountSettings,
  onClose,
  updateProduct,
  setPromoButton,
  getThemeQuickColors,
  backgroundUrl,
  isInitialLoadComplete = true,
  isStoreContentReady = true,
  isTemplateLoaded = false,
  lastSavedSnapshot = null,
  experienceId,
  onProductUpdated,
  onUserUpdate,
  templates,
  setTemplates,
  updateCachedTemplates,
  updateTemplate,
}) => {
  // Refs for inline editing focus
  
  // Local state for transparency slider
  const [transparencyValue, setTransparencyValue] = useState(90);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  
  // State for ProductPageModal
  const [showProductPageModal, setShowProductPageModal] = useState(false);
  
  // Memoize current product to avoid repeated finds
  const currentProduct = useMemo(() => 
    productEditor.productId !== null 
      ? products.find(p => p.id === productEditor.productId)
      : null,
    [products, productEditor.productId]
  );
  
  // Determine product type
  const isProductType = Boolean(currentProduct?.whopProductId);
  const isCheckoutType = Boolean(!currentProduct?.whopProductId && currentProduct?.checkoutConfigurationId);
  
  // Local state for discount fields
  const [localPromoDiscountType, setLocalPromoDiscountType] = useState<'percentage' | 'fixed' | undefined>(currentProduct?.promoDiscountType);
  const [localPromoDiscountAmount, setLocalPromoDiscountAmount] = useState<number | undefined>(currentProduct?.promoDiscountAmount);
  const [localPromoLimitQuantity, setLocalPromoLimitQuantity] = useState<number | undefined>(currentProduct?.promoLimitQuantity);
  const [localPromoShowFireIcon, setLocalPromoShowFireIcon] = useState(currentProduct?.promoShowFireIcon || false);
  const [localShowSalesCount, setLocalShowSalesCount] = useState(currentProduct?.showSalesCount || false);
  const [localSalesCount, setLocalSalesCount] = useState<number | undefined>(currentProduct?.salesCount);
  const [localShowRatingInfo, setLocalShowRatingInfo] = useState(currentProduct?.showRatingInfo || false);
  const [localStarRating, setLocalStarRating] = useState<number | undefined>(currentProduct?.starRating);
  const [localReviewCount, setLocalReviewCount] = useState<number | undefined>(currentProduct?.reviewCount);

  // Auto-enable fire icon when global discount has quantity per product set
  useEffect(() => {
    if (discountSettings?.quantityPerProduct !== undefined && 
        discountSettings.quantityPerProduct !== -1 && 
        discountSettings.quantityPerProduct > 0) {
      // Auto-enable fire icon if not already enabled
      if (!localPromoShowFireIcon) {
        setLocalPromoShowFireIcon(true);
      }
      // Also set the limit quantity to match global discount quantity if not set
      if (!localPromoLimitQuantity || localPromoLimitQuantity === 0) {
        setLocalPromoLimitQuantity(discountSettings.quantityPerProduct);
      }
    }
  }, [discountSettings?.quantityPerProduct, localPromoShowFireIcon, localPromoLimitQuantity]);
  const [discountValidationError, setDiscountValidationError] = useState<string | null>(null);
  
  // Local state for new promo fields
  // For resources with plans, scope always defaults to 'plan'
  const [localPromoScope, setLocalPromoScope] = useState<'product' | 'plan' | undefined>(
    currentProduct?.promoScope || undefined
  );
  const [localPromoCodeId, setLocalPromoCodeId] = useState<string | undefined>(undefined);
  const [localPromoCode, setLocalPromoCode] = useState<string | undefined>(currentProduct?.promoCode);
  const [localPromoDurationType, setLocalPromoDurationType] = useState<'one-time' | 'forever' | 'duration_months' | undefined>(currentProduct?.promoDurationType);
  const [localPromoDurationMonths, setLocalPromoDurationMonths] = useState<number | undefined>(currentProduct?.promoDurationMonths);
  const [localPromoUnlimitedQuantity, setLocalPromoUnlimitedQuantity] = useState<boolean>(currentProduct?.promoLimitQuantity === -1);
  const [availablePromoCodes, setAvailablePromoCodes] = useState<Array<{id: string; code: string}>>([]);
  const [hasDiscountSelected, setHasDiscountSelected] = useState<boolean>(Boolean(currentProduct?.promoDiscountType || currentProduct?.promoDiscountAmount));
  const [currentResource, setCurrentResource] = useState<{planId?: string; whopProductId?: string; checkoutConfigurationId?: string} | null>(null);
  const [isLoadingResource, setIsLoadingResource] = useState(false);
  
  // For resources without plans: track if using global discount or custom discount
  const [promoMode, setPromoMode] = useState<'global' | 'custom'>('custom');
  
  // For resources without plans in custom mode: manual promo code input
  const [localManualPromoCode, setLocalManualPromoCode] = useState<string>('');
  
  // Track if promo data is loaded from database (for resources with plan_id)
  const [promoDataFromDb, setPromoDataFromDb] = useState<{
    promoId?: string;
    promoCode?: string;
    amountOff?: number;
    promoType?: 'percentage' | 'flat_amount';
    stock?: number;
    unlimitedStock?: boolean;
    promoDurationMonths?: number;
  } | null>(null);
  const [isLoadingPromoFromDb, setIsLoadingPromoFromDb] = useState(false);

  const [seasonalDiscountStatus, setSeasonalDiscountStatus] = useState<{
    status: 'none' | 'upcoming' | 'active' | 'expired';
    startDate?: string;
    endDate?: string;
  } | null>(null);
  
  // Store full discount data from database for use in handlers
  const [databaseDiscountData, setDatabaseDiscountData] = useState<DiscountData | null>(null);
  
  // Track if we've initiated promo loading (to prevent flicker)
  const [hasInitiatedPromoLoad, setHasInitiatedPromoLoad] = useState(false);
  
  // Track if promo deletion is in progress
  const [isDeletingPromo, setIsDeletingPromo] = useState(false);
  
  // Reset flag when modal closes, resource changes, or seasonal discount status changes to expired/none
  useEffect(() => {
    if (!isOpen) {
      setHasInitiatedPromoLoad(false);
      return;
    }
    
    // Reset when currentResource changes (not just planId)
    // This ensures we reset when switching between products
    setHasInitiatedPromoLoad(false);
  }, [isOpen, currentResource]);
  
  // Reset flag when seasonal discount status changes to expired/none
  useEffect(() => {
    if (seasonalDiscountStatus && 
        (seasonalDiscountStatus.status === 'expired' || seasonalDiscountStatus.status === 'none')) {
      setHasInitiatedPromoLoad(false);
    }
  }, [seasonalDiscountStatus]);
  
  // Mark that we've initiated loading when isLoadingPromoFromDb becomes true
  useEffect(() => {
    if (isLoadingPromoFromDb) {
      setHasInitiatedPromoLoad(true);
    }
  }, [isLoadingPromoFromDb]);
  
  // Determine if Product Discount is fully loaded
  const isProductDiscountLoading = useMemo(() => {
    // 1. If modal is not open, not loading
    if (!isOpen) return false;
    
    // 2. If currentResource is loading, still loading
    if (isLoadingResource) return true;
    
    // 3. If seasonal discount status is not loaded yet, still loading
    if (!seasonalDiscountStatus) return true;
    
    // 4. If discount is expired or none, fully loaded (no promo data needed)
    if (seasonalDiscountStatus.status === 'expired' || seasonalDiscountStatus.status === 'none') {
      return false;
    }
    
    // 5. If currentResource has planId: need to wait for promo data from DB to finish loading
    if (currentResource?.planId) {
      // Still loading if:
      // - Promo data fetch is in progress, OR
      // - We need to load promo data but haven't initiated the load yet
      //   (This prevents flickering when seasonalDiscountStatus is set but the useEffect hasn't run yet)
      const needsPromoLoad = seasonalDiscountStatus.status === 'active' || seasonalDiscountStatus.status === 'upcoming';
      const waitingForLoadToStart = needsPromoLoad && !hasInitiatedPromoLoad && !isLoadingPromoFromDb;
      
      return isLoadingPromoFromDb || waitingForLoadToStart;
    }
    
    // 6. If currentResource is null (and not loading), fully loaded (no planId, fully loaded)
    // For resources without plan_id: fully loaded once seasonal discount status is known and resource is resolved
    return false;
  }, [isOpen, isLoadingResource, seasonalDiscountStatus, currentResource?.planId, isLoadingPromoFromDb, hasInitiatedPromoLoad]);
  
  // Determine if resource has plans (for showing PRODUCT_DISCOUNT section)
  const hasPlans = useMemo(() => {
    if (!currentResource) return false;
    return Boolean(
      currentResource.whopProductId || 
      currentResource.planId || 
      currentResource.checkoutConfigurationId
    );
  }, [currentResource]);

  // Ensure scope is always 'plan' for resources with plans (default behavior)
  useEffect(() => {
    if (hasPlans && localPromoScope !== 'plan') {
      setLocalPromoScope('plan');
    }
  }, [hasPlans, localPromoScope]);
  
  // State for promo creation and loaded data
  const [isCreatingPromo, setIsCreatingPromo] = useState(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false); // Track when API call is in progress
  const [generatedPromoName, setGeneratedPromoName] = useState<string>('');
  
  // Reset isCreatingPromo when modal opens/closes or product changes
  useEffect(() => {
    if (!isOpen) {
      setIsCreatingPromo(false);
      setGeneratedPromoName('');
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset when product changes
    setIsCreatingPromo(false);
    setGeneratedPromoName('');
  }, [productEditor.productId]);
  const [selectedPromoData, setSelectedPromoData] = useState<{
    code: string;
    amountOff: number;
    promoType: 'percentage' | 'flat_amount';
    planIds?: string[];
    stock?: number;
    unlimitedStock?: boolean;
    promoDurationMonths?: number;
  } | null>(null);
  const [isPromoDataLoaded, setIsPromoDataLoaded] = useState(false);
  const [isLoadingPromos, setIsLoadingPromos] = useState(false);
  
  // Ref to store generatePromoName function to avoid initialization issues
  const generatePromoNameRef = useRef<((baseCode: string, discountType: 'percentage' | 'fixed', discountAmount: number) => string) | null>(null);
  
  // State for seasonal discount check
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // State for formatting toolbars (Claim Button Text)
  const [claimButtonTextRef, setClaimButtonTextRef] = useState<HTMLDivElement | null>(null);
  const [showClaimButtonToolbar, setShowClaimButtonToolbar] = useState(false);
  const [showClaimButtonColorPicker, setShowClaimButtonColorPicker] = useState(false);
  const [showClaimButtonEmojiPicker, setShowClaimButtonEmojiPicker] = useState(false);
  const [showClaimButtonFontSize, setShowClaimButtonFontSize] = useState(false);
  const [selectedClaimButtonColor, setSelectedClaimButtonColor] = useState('#000000');
  const claimButtonToolbarRef = useRef<HTMLDivElement | null>(null);

  // State for formatting toolbars (Product Button Text)
  const [productButtonTextRef, setProductButtonTextRef] = useState<HTMLDivElement | null>(null);
  const [showProductButtonToolbar, setShowProductButtonToolbar] = useState(false);
  const [showProductButtonColorPicker, setShowProductButtonColorPicker] = useState(false);
  const [showProductButtonEmojiPicker, setShowProductButtonEmojiPicker] = useState(false);
  const [showProductButtonFontSize, setShowProductButtonFontSize] = useState(false);
  const [selectedProductButtonColor, setSelectedProductButtonColor] = useState('#000000');
  const productButtonToolbarRef = useRef<HTMLDivElement | null>(null);

  // Font size options
  const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];

  // Quick colors - get from theme or use defaults
  const [quickColors, setQuickColors] = useState<string[]>(['#FFFFFF', '#000000', '#F3F4F6', '#1F2937']);
  
  useEffect(() => {
    const loadQuickColors = async () => {
      const themeTextColorHex = legacyTheme?.text ? tailwindTextColorToHex(legacyTheme.text) : null;
      if (backgroundUrl) {
        try {
          const { extractColorsFromImage } = await import('../utils/backgroundAnalyzer');
          const extractedColors = await extractColorsFromImage(backgroundUrl, 7);
          if (extractedColors && extractedColors.length > 0) {
            const colors = [...extractedColors];
            if (themeTextColorHex && !colors.includes(themeTextColorHex)) {
              colors.unshift(themeTextColorHex);
            }
            setQuickColors(colors.slice(0, 12));
            return;
          }
        } catch (error) {
          console.warn('Failed to extract colors from background, using theme colors:', error);
        }
      }
      if (getThemeQuickColors && legacyTheme) {
        try {
          const themeColors = getThemeQuickColors(legacyTheme);
          const colors = [...themeColors];
          if (themeTextColorHex && !colors.includes(themeTextColorHex)) {
            colors.unshift(themeTextColorHex);
          }
          setQuickColors(colors.slice(0, 12));
        } catch {
          const fallback = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937'];
          if (themeTextColorHex && !fallback.includes(themeTextColorHex)) {
            fallback.unshift(themeTextColorHex);
          }
          setQuickColors(fallback);
        }
      } else {
        const fallback = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937'];
        if (themeTextColorHex && !fallback.includes(themeTextColorHex)) {
          fallback.unshift(themeTextColorHex);
        }
        setQuickColors(fallback);
      }
    };
    loadQuickColors();
  }, [backgroundUrl, legacyTheme?.accent, legacyTheme?.text, getThemeQuickColors]);
  
  // Track previous isOpen state to detect when modal closes
  const prevIsOpenRef = useRef(isOpen);

  // Store initial page load state snapshots - captured after everything is loaded
  // This represents the state after initial load completes, similar to lastSavedSnapshot in SeasonalStore
  const initialProductsSnapshotRef = useRef<Product[] | null>(null);
  const initialPromoButtonSnapshotRef = useRef<typeof promoButton | null>(null);
  const hasCapturedInitialStateRef = useRef(false);
  const prevTemplateLoadedRef = useRef(isTemplateLoaded);

  // Capture initial state after everything is loaded (same logic as save button)
  useEffect(() => {
    // Wait for everything to be loaded before capturing initial state
    if (!isInitialLoadComplete || !isStoreContentReady) {
      return;
    }

    // If lastSavedSnapshot is available, use it to ensure exact match with saved state
    if (lastSavedSnapshot) {
      try {
        const savedState = JSON.parse(lastSavedSnapshot);
        // Capture initial state once after initial load completes
        if (!hasCapturedInitialStateRef.current) {
          initialProductsSnapshotRef.current = savedState.products ? JSON.parse(JSON.stringify(savedState.products)) : JSON.parse(JSON.stringify(products));
          initialPromoButtonSnapshotRef.current = savedState.promoButton ? JSON.parse(JSON.stringify(savedState.promoButton)) : JSON.parse(JSON.stringify(promoButton));
          hasCapturedInitialStateRef.current = true;
          prevTemplateLoadedRef.current = isTemplateLoaded;
          return;
        }

        // Reset snapshot when a template finishes loading (transition from false -> true)
        // This ensures we capture the state after template is fully loaded
        if (isTemplateLoaded && !prevTemplateLoadedRef.current) {
          initialProductsSnapshotRef.current = savedState.products ? JSON.parse(JSON.stringify(savedState.products)) : JSON.parse(JSON.stringify(products));
          initialPromoButtonSnapshotRef.current = savedState.promoButton ? JSON.parse(JSON.stringify(savedState.promoButton)) : JSON.parse(JSON.stringify(promoButton));
        }
      } catch (error) {
        console.error('Error parsing lastSavedSnapshot:', error);
        // Fallback to using current props
        if (!hasCapturedInitialStateRef.current) {
          initialProductsSnapshotRef.current = JSON.parse(JSON.stringify(products));
          initialPromoButtonSnapshotRef.current = JSON.parse(JSON.stringify(promoButton));
          hasCapturedInitialStateRef.current = true;
        }
      }
    } else {
      // Fallback: capture from props if lastSavedSnapshot not available
      if (!hasCapturedInitialStateRef.current) {
        initialProductsSnapshotRef.current = JSON.parse(JSON.stringify(products));
        initialPromoButtonSnapshotRef.current = JSON.parse(JSON.stringify(promoButton));
        hasCapturedInitialStateRef.current = true;
        prevTemplateLoadedRef.current = isTemplateLoaded;
        return;
      }

      // Reset snapshot when a template finishes loading (transition from false -> true)
      if (isTemplateLoaded && !prevTemplateLoadedRef.current) {
        initialProductsSnapshotRef.current = JSON.parse(JSON.stringify(products));
        initialPromoButtonSnapshotRef.current = JSON.parse(JSON.stringify(promoButton));
      }
    }

    prevTemplateLoadedRef.current = isTemplateLoaded;
  }, [isInitialLoadComplete, isStoreContentReady, isTemplateLoaded, lastSavedSnapshot, products, promoButton]);

  // Store product-specific snapshot for the current product being edited
  const initialProductSnapshotRef = useRef<Product | null>(null);
  const snapshotProductIdRef = useRef<number | string | null>(null);

  // Sync local state when modal opens or product changes
  useEffect(() => {
    const currentProductId = productEditor.productId;
    
    // Reset product-specific snapshot only if product changed (editing a different product)
    if (snapshotProductIdRef.current !== null && snapshotProductIdRef.current !== currentProductId) {
      initialProductSnapshotRef.current = null;
      snapshotProductIdRef.current = null;
    }
    
    if (isOpen) {
      // Get the initial state for this product from the page load snapshot
      // This ensures we reset to the state when the page was loaded, not when modal opened
      if (currentProduct && snapshotProductIdRef.current !== currentProductId) {
        // Find the initial product state from when page was loaded
        const initialProduct = initialProductsSnapshotRef.current?.find(p => p.id === currentProductId);
        if (initialProduct) {
          initialProductSnapshotRef.current = JSON.parse(JSON.stringify(initialProduct));
        } else {
          // Fallback: use current product if initial snapshot not available
          initialProductSnapshotRef.current = JSON.parse(JSON.stringify(currentProduct));
        }
        snapshotProductIdRef.current = currentProductId;
      }
      
      // Sync discount fields (only if editing a product)
      if (currentProduct) {
      setLocalPromoDiscountType(currentProduct.promoDiscountType);
      setLocalPromoDiscountAmount(currentProduct.promoDiscountAmount);
      setLocalPromoLimitQuantity(currentProduct.promoLimitQuantity);
      setLocalPromoShowFireIcon(currentProduct.promoShowFireIcon || false);
      setLocalShowSalesCount(currentProduct.showSalesCount || false);
      setLocalSalesCount(typeof currentProduct.salesCount === 'number' ? currentProduct.salesCount : undefined);
      setLocalShowRatingInfo(currentProduct.showRatingInfo || false);
      setLocalStarRating(typeof currentProduct.starRating === 'number' ? currentProduct.starRating : undefined);
      setLocalReviewCount(typeof currentProduct.reviewCount === 'number' ? currentProduct.reviewCount : undefined);
      // For resources with plans, always use 'plan' scope (default behavior)
      // Only use product's promoScope if it exists and resource doesn't have plans
      const shouldUsePlanScope = hasPlans;
      setLocalPromoScope(shouldUsePlanScope ? 'plan' : (currentProduct.promoScope || undefined));
      setLocalPromoCodeId(currentProduct.promoCodeId);
      setLocalPromoDurationType(currentProduct.promoDurationType);
      setLocalPromoDurationMonths(currentProduct.promoDurationMonths);
      setLocalPromoUnlimitedQuantity(currentProduct.promoLimitQuantity === -1);
      setDiscountValidationError(null);
      setHasDiscountSelected(Boolean(currentProduct.promoDiscountType || currentProduct.promoDiscountAmount));
      // Reset promo data loaded state when product changes
      setIsPromoDataLoaded(false);
      setSelectedPromoData(null);
      setIsCreatingPromo(false);
      setGeneratedPromoName('');
      
      // For resources without plans: initialize manual promo code if it exists and doesn't match global
      if (!hasPlans && currentProduct.promoCode) {
        const isGlobalPromo = discountSettings?.globalDiscount && 
                             discountSettings?.promoCode === currentProduct.promoCode;
        if (!isGlobalPromo) {
          setLocalManualPromoCode(currentProduct.promoCode);
        } else {
          setLocalManualPromoCode('');
        }
      } else {
        setLocalManualPromoCode('');
      }
    }
    }
    // Note: Initial snapshots are captured from page load state
    // Product-specific snapshot is taken from initialProductsSnapshotRef when editing starts
    // This allows Clear to reset to the original page load state
  }, [isOpen, currentProduct?.id, productEditor.productId]);

  // Update hasDiscountSelected when discount fields change
  useEffect(() => {
    setHasDiscountSelected(Boolean(localPromoDiscountType || localPromoDiscountAmount));
  }, [localPromoDiscountType, localPromoDiscountAmount]);

  // Update current time every second (for seasonal discount check)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Check if seasonal discount exists (has seasonalDiscountId)
  // This matches the logic used in Shop Manager (TemplateManagerModal uses hasExistingDiscount)
  const hasSeasonalDiscount = useMemo(() => {
    return Boolean(discountSettings?.seasonalDiscountId);
  }, [discountSettings?.seasonalDiscountId]);
  
  // Show +New button when seasonal discount exists in database (approaching or active)
  // Users can create product-specific discounts regardless of global discount status
  const showNewPromoButton = useMemo(() => {
    // Check if discount exists in database (via seasonalDiscountStatus)
    if (seasonalDiscountStatus) {
      return seasonalDiscountStatus.status === 'upcoming' || seasonalDiscountStatus.status === 'active';
    }
    // Fallback: check if discountSettings has seasonalDiscountId
    return hasSeasonalDiscount;
  }, [seasonalDiscountStatus, hasSeasonalDiscount]);

  // Generate promo name with price/percentage suffix
  const generatePromoName = useCallback((
    baseCode: string,
    discountType: 'percentage' | 'fixed',
    discountAmount: number
  ): string => {
    const suffix = Math.round(discountAmount).toString();
    const baseName = `${baseCode}${suffix}`;
    
    // Check if promo with this name exists
    const existingPromo = availablePromoCodes.find(p => {
      const promoCode = p.code.toUpperCase();
      return promoCode === baseName.toUpperCase() || promoCode.startsWith(baseName.toUpperCase());
    });
    
    if (existingPromo) {
      // Find the highest letter suffix already used
      let maxLetter = 'A';
      availablePromoCodes.forEach(p => {
        const code = p.code.toUpperCase();
        if (code.startsWith(baseName.toUpperCase())) {
          const remaining = code.substring(baseName.length);
          if (remaining.length === 1 && remaining >= 'A' && remaining <= 'Z') {
            if (remaining > maxLetter) {
              maxLetter = remaining;
            }
          }
        }
      });
      
      // Increment to next letter
      if (maxLetter === 'Z') {
        // If Z is used, wrap to AA (though unlikely)
        return `${baseName}AA`;
      }
      const nextLetter = String.fromCharCode(maxLetter.charCodeAt(0) + 1);
      return `${baseName}${nextLetter}`;
    }
    
    return baseName;
  }, [availablePromoCodes]);

  // Store generatePromoName in ref for use in useEffect
  useEffect(() => {
    generatePromoNameRef.current = generatePromoName;
  }, [generatePromoName]);

  // Update generated promo name when discount type/amount changes in creation mode
  useEffect(() => {
    if (isCreatingPromo && discountSettings?.promoCode && localPromoDiscountType && localPromoDiscountAmount && generatePromoNameRef.current) {
      const updatedName = generatePromoNameRef.current(
        discountSettings.promoCode,
        localPromoDiscountType,
        localPromoDiscountAmount
      );
      setGeneratedPromoName(updatedName);
    }
  }, [isCreatingPromo, discountSettings?.promoCode, localPromoDiscountType, localPromoDiscountAmount]);

  // Handle promo selection - load promo data
  const handlePromoSelection = useCallback(async (promoId: string) => {
    if (!promoId || !experienceId) {
      setIsPromoDataLoaded(false);
      setSelectedPromoData(null);
      return;
    }

    try {
      const response = await apiPost(
        '/api/promos/get-by-id',
        { promoId },
        experienceId
      );

      if (response.ok) {
        const data = await response.json();
        const promo = data.promo;

        if (promo) {
          // Map promo data to form fields
          setLocalPromoDiscountType(promo.promoType === 'percentage' ? 'percentage' : 'fixed');
          setLocalPromoDiscountAmount(parseFloat(promo.amountOff));
          
          // Map stock
          if (promo.unlimitedStock) {
            setLocalPromoUnlimitedQuantity(true);
            setLocalPromoLimitQuantity(-1);
          } else {
            setLocalPromoUnlimitedQuantity(false);
            setLocalPromoLimitQuantity(promo.stock || undefined);
          }

          // Map duration
          if (promo.promoDurationMonths === 0) {
            setLocalPromoDurationType('one-time');
            setLocalPromoDurationMonths(undefined);
          } else if (promo.promoDurationMonths >= 999) {
            setLocalPromoDurationType('forever');
            setLocalPromoDurationMonths(undefined);
          } else {
            setLocalPromoDurationType('duration_months');
            setLocalPromoDurationMonths(promo.promoDurationMonths);
          }

          // Store promo data
          // Handle planIds: Drizzle should parse JSONB automatically, but handle edge cases
          let parsedPlanIds: string[] | undefined = undefined;
          if (promo.planIds) {
            if (Array.isArray(promo.planIds)) {
              parsedPlanIds = promo.planIds;
            } else if (typeof promo.planIds === 'string') {
              try {
                const parsed = JSON.parse(promo.planIds);
                parsedPlanIds = Array.isArray(parsed) ? parsed : undefined;
              } catch (e) {
                // If parsing fails, it might be a single plan ID string, wrap it in an array
                parsedPlanIds = [promo.planIds];
              }
            }
          }
          
          setSelectedPromoData({
            code: promo.code,
            amountOff: parseFloat(promo.amountOff),
            promoType: promo.promoType,
            planIds: parsedPlanIds,
            stock: promo.stock || undefined,
            unlimitedStock: promo.unlimitedStock || false,
            promoDurationMonths: promo.promoDurationMonths,
          });

          setIsPromoDataLoaded(true);
          setHasDiscountSelected(true);
          
          // Don't auto-apply promo to template - user must click "Apply Discount" button
        }
      }
    } catch (error) {
      console.error('Error loading promo data:', error);
      setIsPromoDataLoaded(false);
      setSelectedPromoData(null);
    }
  }, [experienceId, apiPost, productEditor.productId, updateProduct]);

  // Handle promo deletion
  const handleDeletePromo = useCallback(async () => {
    if (!localPromoCodeId || !experienceId) {
      console.warn('Cannot delete promo: missing required data');
      return;
    }

    if (!confirm('Are you sure you want to delete this promo? This action cannot be undone.')) {
      return;
    }

    setIsDeletingPromo(true);
    try {
      const response = await apiPost(
        '/api/promos/delete',
        {
          promoId: localPromoCodeId,
          experienceId, // Endpoint will resolve companyId from experienceId
        },
        experienceId
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete promo');
      }

      // Clear local state
      setLocalPromoCodeId(undefined);
      setSelectedPromoData(null);
      setIsPromoDataLoaded(false);
      setHasDiscountSelected(false);

      // Update product to remove ALL promo data - explicitly set all promo fields to undefined
      if (productEditor.productId !== null && currentProduct) {
        updateProduct(productEditor.productId, {
          promoCode: undefined,
          promoCodeId: undefined,
          promoDiscountType: undefined,
          promoDiscountAmount: undefined,
          promoLimitQuantity: undefined,
          promoQuantityLeft: undefined,
          promoShowFireIcon: undefined,
          promoScope: undefined,
          promoDurationType: undefined,
          promoDurationMonths: undefined,
        });
      }

      // Remove deleted promo from availablePromoCodes list
      setAvailablePromoCodes(prev => prev.filter(p => p.id !== localPromoCodeId));

      // Remove promo from all templates that have products with this promoCodeId
      if (templates && setTemplates && updateCachedTemplates && updateTemplate) {
        try {
          // Prepare cleaned templates - only remove promo data from products with matching promoCodeId
          const cleanedTemplates = templates.map(template => {
            const cleanedTemplateProducts = (template.templateData?.products || []).map((product: Product) => {
              // Only clean products that have the deleted promoCodeId
              if (product.promoCodeId === localPromoCodeId) {
                // Explicitly set all promo fields to undefined to ensure they're removed
                return {
                  ...product,
          promoCode: undefined,
                  promoCodeId: undefined,
                  promoDiscountType: undefined,
                  promoDiscountAmount: undefined,
                  promoLimitQuantity: undefined,
                  promoQuantityLeft: undefined,
                  promoShowFireIcon: undefined,
                  promoScope: undefined,
                  promoDurationType: undefined,
                  promoDurationMonths: undefined,
                };
      }
              return product; // Keep other products unchanged
            });
            
            // Only update template if it has products with the deleted promo
            const hasProductsWithPromo = cleanedTemplateProducts.some((p: Product, index: number) => {
              const originalProduct = (template.templateData?.products || [])[index];
              return originalProduct?.promoCodeId === localPromoCodeId;
            });
            
            if (hasProductsWithPromo) {
              return {
                ...template,
                templateData: {
                  ...template.templateData,
                  products: cleanedTemplateProducts,
                },
              };
            }
            return template; // No changes needed
          });

          // Filter to only templates that actually have changes
          const templatesWithChanges = cleanedTemplates.filter(template => {
            const originalTemplate = templates.find(t => t.id === template.id);
            if (originalTemplate) {
              const originalProducts = originalTemplate.templateData?.products || [];
              return originalProducts.some((p: Product) => p.promoCodeId === localPromoCodeId);
            }
            return false;
          });
          
          if (templatesWithChanges.length > 0) {
            // Update templates in local state immediately for UI responsiveness
            setTemplates(prev => prev.map(template => {
              const updatedTemplate = templatesWithChanges.find(t => t.id === template.id);
              return updatedTemplate || template;
            }));

            // Update templates in cache immediately
            updateCachedTemplates(prev => {
              const newCache = new Map(prev);
              templatesWithChanges.forEach(template => {
                // Get the original template from cache to preserve all properties
                const originalTemplate = prev.get(template.id);
                if (originalTemplate) {
                  // Update only the templateData while preserving other properties
                  newCache.set(template.id, {
                    ...originalTemplate,
                    templateData: template.templateData,
                  } as any);
                } else {
                  // If not in cache, use the template as-is
                  newCache.set(template.id, template as any);
                }
              });
              return newCache;
            });

            // Save all affected templates to database
            // Note: updateTemplate will also update state and cache, but that's fine (idempotent)
            console.log(`💾 Saving ${templatesWithChanges.length} cleaned templates to database after promo delete`);
            const savePromises = templatesWithChanges.map(template => 
              updateTemplate(template.id, {
                templateData: template.templateData,
              }).catch(error => {
                console.warn(`⚠️ Failed to save template ${template.id} to database:`, error);
                // Continue with other templates even if one fails
                return null;
              })
            );

            await Promise.all(savePromises);
            console.log('✅ All templates saved to database after promo delete');
          }
        } catch (error) {
          console.error('⚠️ Error removing promo from templates:', error);
          // Don't block the delete operation if template update fails
        }
      }

      // Trigger template auto-save callback
      if (onProductUpdated) {
        setTimeout(() => {
          onProductUpdated();
        }, 100);
      }

      console.log('✅ Promo deleted successfully');
    } catch (error) {
      console.error('Error deleting promo:', error);
      alert('Failed to delete promo. Please try again.');
    } finally {
      setIsDeletingPromo(false);
    }
  }, [localPromoCodeId, experienceId, apiPost, productEditor.productId, currentProduct, updateProduct, onProductUpdated, templates, setTemplates, updateCachedTemplates, updateTemplate]);

  // Handle applying existing promo to template (without creating new promo)
  const handleApplyExistingPromo = useCallback(() => {
    if (productEditor.productId === null || !localPromoCodeId || !selectedPromoData) {
      console.warn('Cannot apply existing promo: missing required data');
      return;
    }

    const updates: Partial<Product> = {
      promoCodeId: localPromoCodeId,
      promoCode: selectedPromoData.code, // Use promo code from selected promo
      promoScope: localPromoScope,
      promoDiscountType: localPromoDiscountType,
      promoDiscountAmount: localPromoDiscountAmount,
      promoLimitQuantity: localPromoUnlimitedQuantity ? -1 : localPromoLimitQuantity,
      promoQuantityLeft: localPromoShowFireIcon && !localPromoUnlimitedQuantity && localPromoLimitQuantity 
        ? localPromoLimitQuantity 
        : (localPromoUnlimitedQuantity ? undefined : (localPromoLimitQuantity ?? undefined)),
      promoShowFireIcon: localPromoShowFireIcon,
      promoDurationType: localPromoDurationType,
      promoDurationMonths: localPromoDurationMonths,
    };
    
    console.log('💾 Applying existing promotion to product (template update only):', productEditor.productId, updates);
    updateProduct(productEditor.productId, updates);
    
    // Trigger template auto-save callback
    if (onProductUpdated) {
      setTimeout(() => {
        onProductUpdated();
      }, 100);
    }
  }, [
    productEditor.productId,
    localPromoCodeId,
    selectedPromoData,
    localPromoScope,
    localPromoDiscountType,
    localPromoDiscountAmount,
    localPromoUnlimitedQuantity,
    localPromoLimitQuantity,
    localPromoShowFireIcon,
    localPromoDurationType,
    localPromoDurationMonths,
    updateProduct,
    onProductUpdated,
  ]);

  // Handle applying global discount to template (for resources without plans)
  const handleApplyGlobalDiscount = useCallback(() => {
    if (productEditor.productId === null || !discountSettings?.promoCode || !discountSettings?.globalDiscount) {
      console.warn('Cannot apply global discount: missing required data');
      return;
    }

    // Determine if fire icon should be enabled (if quantity per product is set)
    const hasLimitedQuantity = discountSettings.quantityPerProduct !== undefined && 
                              discountSettings.quantityPerProduct !== -1 && 
                              discountSettings.quantityPerProduct > 0;

    const updates: Partial<Product> = {
      // Don't set promoCodeId (global promo is not a product-specific promo)
      promoCode: discountSettings.promoCode, // Use global promo code
      promoScope: undefined, // Global discount doesn't have scope
      promoDiscountType: discountSettings.globalDiscountType || 'percentage',
      promoDiscountAmount: discountSettings.globalDiscountAmount || discountSettings.percentage || 0,
      // Set limit quantity and fire icon if global discount has quantity per product
      promoLimitQuantity: hasLimitedQuantity ? discountSettings.quantityPerProduct : undefined,
      promoQuantityLeft: hasLimitedQuantity ? discountSettings.quantityPerProduct : undefined,
      promoShowFireIcon: hasLimitedQuantity,
      promoDurationType: discountSettings.durationType,
      promoDurationMonths: discountSettings.durationMonths,
    };
    
    console.log('💾 Applying global discount to product (template update only):', productEditor.productId, updates);
    updateProduct(productEditor.productId, updates);
    
    // Trigger template auto-save callback
    if (onProductUpdated) {
      setTimeout(() => {
        onProductUpdated();
      }, 100);
    }
  }, [
    productEditor.productId,
    discountSettings,
    updateProduct,
    onProductUpdated,
  ]);

  // Handle promo code change - load promo data when selected
  useEffect(() => {
    if (localPromoCodeId) {
      handlePromoSelection(localPromoCodeId);
    } else {
      setIsPromoDataLoaded(false);
      setSelectedPromoData(null);
      // Don't clear discount fields when promo is deselected - user might want to keep them
      // Only clear if they explicitly deselect
    }
  }, [localPromoCodeId, handlePromoSelection]);
  
  // Set default promo code for Plan scope when product has promoCodeId
  useEffect(() => {
    if (localPromoScope === 'plan' && currentProduct?.promoCodeId && !localPromoCodeId) {
      setLocalPromoCodeId(currentProduct.promoCodeId);
    }
  }, [localPromoScope, currentProduct?.promoCodeId]);

  // Helper function to find an available promo code
  const findAvailablePromoCode = useCallback((baseCode: string, existingCodes: Set<string>): string => {
    // If base code doesn't exist, use it
    if (!existingCodes.has(baseCode)) {
      return baseCode;
    }

    // Try appending letters A-Z
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i); // A-Z
      const candidateCode = baseCode + letter;
      if (!existingCodes.has(candidateCode)) {
        return candidateCode;
      }
    }

    // If all letters are taken, try numbers (A1, A2, etc.)
    for (let i = 1; i <= 99; i++) {
      const candidateCode = baseCode + 'A' + i;
      if (!existingCodes.has(candidateCode)) {
        return candidateCode;
      }
    }

    // Fallback: return base code with timestamp (shouldn't reach here)
    return baseCode + Date.now().toString().slice(-4);
  }, []);

  // Handle +New button click
  const handleNewPromoClick = useCallback(async () => {
    // Get promo code from discountSettings or database discount data
    const promoCode = discountSettings?.promoCode || databaseDiscountData?.seasonalDiscountPromo;
    
    if (!promoCode) {
      console.warn('Cannot create promo: seasonal discount promo code is missing');
      return;
    }

    if (!experienceId) {
      console.warn('Cannot create promo: experienceId is missing');
      return;
    }

    let promoCodeToUse = promoCode;

    // If discount type and amount are set, generate the initial promo name
    if (localPromoDiscountType && localPromoDiscountAmount) {
      const baseName = generatePromoName(
        promoCode,
        localPromoDiscountType,
        localPromoDiscountAmount
      );
      promoCodeToUse = baseName;
    }

    // Check for existing promo codes before setting the name
    try {
      const listResponse = await apiPost(
        '/api/promos/list-by-company',
        { experienceId },
        experienceId
      );

      if (listResponse.ok) {
        const listData = await listResponse.json();
        const existingCodes = new Set<string>((listData.promos || []).map((p: string) => p.toUpperCase()));
        
        // Check if promo code exists (case-insensitive) and find available code
        const originalCode = promoCodeToUse;
        const availableCode = findAvailablePromoCode(promoCodeToUse.toUpperCase(), existingCodes);
        
        // If code was modified, update and show message
        if (availableCode !== originalCode.toUpperCase()) {
          promoCodeToUse = availableCode;
          // Show user-friendly info message
          alert(`Promo code '${originalCode}' already exists. Using '${availableCode}' instead.`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to check existing promo codes, proceeding with original code:', error);
      // Continue with original code - server will catch duplicate if it exists
    }

    // Set the final generated name
    setGeneratedPromoName(promoCodeToUse);

    setIsCreatingPromo(true);
    setIsPromoDataLoaded(false);
    
    // Ensure discount fields are visible by setting hasDiscountSelected if not already set
    if (!hasDiscountSelected) {
      setHasDiscountSelected(true);
    }
  }, [discountSettings?.promoCode, databaseDiscountData?.seasonalDiscountPromo, localPromoDiscountType, localPromoDiscountAmount, generatePromoName, hasDiscountSelected, experienceId, findAvailablePromoCode]);

  // Handle Apply Promo
  const handleApplyPromo = useCallback(async () => {
    // Validate required fields before creating promo
    if (productEditor.productId === null) {
      console.warn('Cannot apply promo: no product selected');
      return;
    }

    // Only require generatedPromoName for resources with plans
    if (hasPlans && (!experienceId || !generatedPromoName)) {
      console.warn('Cannot apply promo: missing experienceId or promo name');
      return;
    }

    // For resources without plans, require localManualPromoCode
    if (!hasPlans && (!experienceId || !localManualPromoCode?.trim())) {
      console.warn('Cannot apply custom discount: missing experienceId or promo code');
      return;
    }
    
    if (!localPromoDiscountType || !localPromoDiscountAmount || localPromoDiscountAmount <= 0) {
      setDiscountValidationError('Select a discount type and enter an amount greater than 0.');
      return;
    }

    if (localPromoShowFireIcon && !localPromoUnlimitedQuantity && (!localPromoLimitQuantity || localPromoLimitQuantity <= 0)) {
      setDiscountValidationError('Enter a quantity limit above 0 to show the fire icon.');
      return;
    }

    setDiscountValidationError(null);
    
    // Set loading state for create operation (API call in progress)
    setIsApplyingPromo(true);
    
    // Update generated name if discount type/amount changed
    // This ensures generatedPromoName is always up-to-date before creating the promo
    if (discountSettings?.promoCode && localPromoDiscountType && localPromoDiscountAmount) {
      const updatedName = generatePromoName(
        discountSettings.promoCode,
        localPromoDiscountType,
        localPromoDiscountAmount
      );
      setGeneratedPromoName(updatedName);
      console.log('🔄 Updated generated promo name:', updatedName);
    }

    // Validate currentResource is available
    if (!currentResource) {
      console.error('Cannot apply promo: currentResource is not available');
      setDiscountValidationError('Product resource information is not available. Please try refreshing the page.');
      return;
    }

    // For resources without plans, just update template with manual promo code
    if (!hasPlans) {
      // Check if manual promo code matches global discount - if so, don't apply custom
      if (discountSettings?.globalDiscount && 
          discountSettings?.promoCode === localManualPromoCode) {
        console.warn('Cannot apply custom discount: promo code matches global discount');
        setDiscountValidationError('This promo code is already used by the global discount. Please use a different code.');
        return;
      }
      
      const updates: Partial<Product> = {
        promoCode: localManualPromoCode || undefined,
        promoScope: undefined,
        promoDiscountType: localPromoDiscountType,
        promoDiscountAmount: localPromoDiscountAmount,
        promoLimitQuantity: localPromoUnlimitedQuantity ? -1 : localPromoLimitQuantity,
        promoQuantityLeft: localPromoShowFireIcon && !localPromoUnlimitedQuantity && localPromoLimitQuantity 
          ? localPromoLimitQuantity 
          : (localPromoUnlimitedQuantity ? undefined : (localPromoLimitQuantity ?? undefined)),
        promoShowFireIcon: localPromoShowFireIcon,
        promoDurationType: localPromoDurationType,
        promoDurationMonths: localPromoDurationMonths,
      };
      
      console.log('💾 Applying manual promo code to product (template update only):', productEditor.productId, updates);
      updateProduct(productEditor.productId!, updates);
      
      if (onProductUpdated) {
        setTimeout(() => {
          onProductUpdated();
        }, 100);
      }
      
      // Exit creation mode
      setIsCreatingPromo(false);
      setIsApplyingPromo(false);
      setGeneratedPromoName('');
      return;
    }

    // Check if this is design-only mode (no whopProductId and no plans)
    const isDesignOnly = !currentResource.whopProductId && !currentResource.planId && !currentResource.checkoutConfigurationId;

    if (isDesignOnly) {
      // Design-only mode: just update template, no API calls
      const promoCodeToUse = generatedPromoName || discountSettings?.promoCode || 'PROMO';
      
      if (productEditor.productId !== null) {
        const updates: Partial<Product> = {
          // Don't set promoCodeId (no real promo created)
          promoCode: promoCodeToUse, // Save promo code string for display
          promoScope: localPromoScope,
          promoDiscountType: localPromoDiscountType,
          promoDiscountAmount: localPromoDiscountAmount,
          promoLimitQuantity: localPromoUnlimitedQuantity ? -1 : localPromoLimitQuantity,
          // Set promoQuantityLeft to the limit quantity when fire icon is enabled and we have a limit
          promoQuantityLeft: localPromoShowFireIcon && !localPromoUnlimitedQuantity && localPromoLimitQuantity 
            ? localPromoLimitQuantity 
            : undefined,
          promoShowFireIcon: localPromoShowFireIcon,
          promoDurationType: localPromoDurationType,
          promoDurationMonths: localPromoDurationMonths,
        };
        
        console.log('💾 Applying design-only promotion to product (no API call):', productEditor.productId, updates);
        updateProduct(productEditor.productId, updates);
        
        // Trigger template auto-save callback if provided
        if (onProductUpdated) {
          setTimeout(() => {
            onProductUpdated();
          }, 100);
        }
      }
      
      // Exit creation mode
      setIsCreatingPromo(false);
      setIsApplyingPromo(false);
      setGeneratedPromoName('');
      return; // Exit early, skip API call
    }

    try {
      // Determine planIds based on scope
      let planIds: string[] = [];
      
      if (localPromoScope === 'plan' && currentResource?.planId) {
        planIds = [currentResource.planId];
      } else if (localPromoScope === 'product' && currentResource?.whopProductId) {
        // Get all plans for the product
        try {
          const plansResponse = await apiGet(
            `/api/plans?whopProductId=${currentResource.whopProductId}`,
            experienceId
          );
          
          if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            const plans = plansData.data || [];
            planIds = plans.map((plan: any) => plan.planId).filter((id: string) => Boolean(id));
          } else {
            const errorData = await plansResponse.json().catch(() => ({}));
            console.error('Error fetching plans for product:', errorData);
            setDiscountValidationError('Failed to fetch plans for this product. Please ensure the product has plans configured.');
            return;
          }
        } catch (error) {
          console.error('Error fetching plans for product:', error);
          setDiscountValidationError('Failed to fetch plans for this product. Please try again.');
          return;
        }
      }

      if (planIds.length === 0) {
        const errorMessage = localPromoScope === 'plan' 
          ? 'No plan selected. Please select a plan for this product first.'
          : 'No plans found for this product. Please ensure the product has plans configured in Whop.';
        console.error('No plans found for promo creation:', { localPromoScope, currentResource });
        setDiscountValidationError(errorMessage);
        return;
      }

      // Map duration to months
      let promoDurationMonths = 0;
      if (localPromoDurationType === 'forever') {
        promoDurationMonths = 999;
      } else if (localPromoDurationType === 'duration_months' && localPromoDurationMonths) {
        promoDurationMonths = localPromoDurationMonths;
      }

      // Use the current generatedPromoName (which may have been updated above)
      // Ensure we have a valid promo code name - this should always be set by the useEffect above
      let promoCodeToUse = generatedPromoName;
      if (!promoCodeToUse) {
        console.error('Cannot apply promo: generatedPromoName is missing', {
          generatedPromoName,
          discountSettings: discountSettings?.promoCode,
          localPromoDiscountType,
          localPromoDiscountAmount,
        });
        setDiscountValidationError('Promo code name is required. Please ensure discount settings are configured.');
        return;
      }

      // Check for existing promo codes before creating
      try {
        const listResponse = await apiPost(
          '/api/promos/list-by-company',
          { experienceId },
          experienceId
        );

        if (listResponse.ok) {
          const listData = await listResponse.json();
          const existingCodes = new Set<string>((listData.promos || []).map((p: string) => p.toUpperCase()));
          
          // Check if promo code exists (case-insensitive)
          const originalCode = promoCodeToUse;
          const availableCode = findAvailablePromoCode(promoCodeToUse.toUpperCase(), existingCodes);
          
          // If code was modified, update generatedPromoName and show message
          if (availableCode !== originalCode.toUpperCase()) {
            promoCodeToUse = availableCode;
            setGeneratedPromoName(availableCode);
            // Show user-friendly info message
            alert(`Promo code '${originalCode}' already exists. Using '${availableCode}' instead.`);
            setDiscountValidationError(null); // Clear any previous errors
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to check existing promo codes, proceeding with original code:', error);
        // Continue with original code - server will catch duplicate if it exists
      }
      
      console.log('🎫 Using promo code for creation and template save:', promoCodeToUse);
      
      // Prepare request data
      const requestData = {
        experienceId, // Pass experienceId, endpoint will resolve companyId
        promoCode: promoCodeToUse,
        amountOff: localPromoDiscountAmount,
        promoType: localPromoDiscountType === 'percentage' ? 'percentage' : 'flat_amount',
        planIds,
        stock: localPromoUnlimitedQuantity ? undefined : localPromoLimitQuantity,
        unlimitedStock: localPromoUnlimitedQuantity,
        promoDurationMonths,
      };
      
      console.log('📤 Creating promo with data:', {
        ...requestData,
        planIdsCount: planIds.length,
        planIds: planIds,
      });
      
      // Create promo - endpoint will resolve companyId from experienceId
      const createResponse = await apiPost(
        '/api/promos/create',
        requestData,
        experienceId
      );

      if (createResponse.ok) {
        const createData = await createResponse.json();
        
        // Refresh available promos by adding the new one
        setAvailablePromoCodes(prev => [...prev, { id: createData.promoId, code: generatedPromoName }]);
        
        // Select the newly created promo
        setLocalPromoCodeId(createData.promoId);
        
        // Update product with ALL discount fields (same as handleSaveDiscount)
        if (productEditor.productId !== null) {
          const updates: Partial<Product> = {
            promoCodeId: createData.promoId,
            promoCode: promoCodeToUse, // Save promo code string to template for display
            promoScope: localPromoScope,
            promoDiscountType: localPromoDiscountType,
            promoDiscountAmount: localPromoDiscountAmount,
            promoLimitQuantity: localPromoUnlimitedQuantity ? -1 : localPromoLimitQuantity,
            // Set promoQuantityLeft to the limit quantity when fire icon is enabled and we have a limit
            // This represents the initial "left" count (will decrease as items are sold)
            promoQuantityLeft: localPromoShowFireIcon && !localPromoUnlimitedQuantity && localPromoLimitQuantity 
              ? localPromoLimitQuantity 
              : (localPromoUnlimitedQuantity ? undefined : (localPromoLimitQuantity ?? undefined)),
            promoShowFireIcon: localPromoShowFireIcon,
            promoDurationType: localPromoDurationType,
            promoDurationMonths: localPromoDurationMonths,
          };
          
          console.log('💾 Applying promotion to product:', productEditor.productId, updates);
          console.log('🎫 Promo code being saved:', {
            promoCodeId: updates.promoCodeId,
            promoCode: updates.promoCode,
            promoScope: updates.promoScope,
          });
          console.log('🔥 Fire icon settings:', {
            promoShowFireIcon: updates.promoShowFireIcon,
            promoQuantityLeft: updates.promoQuantityLeft,
            promoLimitQuantity: updates.promoLimitQuantity,
            localPromoUnlimitedQuantity,
            willShowFire: updates.promoShowFireIcon && updates.promoQuantityLeft !== undefined && updates.promoQuantityLeft > 0
          });
          updateProduct(productEditor.productId, updates);
          
          // Trigger template auto-save callback if provided
          if (onProductUpdated) {
            // Use setTimeout to ensure product update is processed first
            setTimeout(() => {
              onProductUpdated();
            }, 100);
          }
        }
        
        // Exit creation mode
        setIsCreatingPromo(false);
        setIsApplyingPromo(false);
        setGeneratedPromoName('');
      } else {
        // Get error details
        const status = createResponse.status;
        const statusText = createResponse.statusText;
        let errorMessage = 'Failed to create promotion.';
        
        try {
          const errorData = await createResponse.json();
          console.error('Failed to create promo:', {
            status,
            statusText,
            error: errorData,
            requestData: {
              promoCode: promoCodeToUse,
              amountOff: localPromoDiscountAmount,
              promoType: localPromoDiscountType,
              planIds,
            }
          });
          
          // Extract error message from response
          if (errorData?.error) {
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : errorData.error.message || errorMessage;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // Response might not be JSON, try to get text
          try {
            const errorText = await createResponse.text();
            console.error('Failed to create promo (non-JSON response):', {
              status,
              statusText,
              responseText: errorText,
            });
            errorMessage = errorText || `Server returned ${status} ${statusText}`;
          } catch (textError) {
            console.error('Failed to create promo (could not read response):', {
              status,
              statusText,
              parseError,
              textError,
            });
            errorMessage = `Server returned ${status} ${statusText}`;
          }
        }
        
        setDiscountValidationError(errorMessage);
        setIsApplyingPromo(false);
      }
    } catch (error) {
      console.error('Error applying promo:', error);
      setIsApplyingPromo(false);
    }
  }, [
    productEditor.productId,
    experienceId,
    generatedPromoName,
    hasPlans,
    localManualPromoCode,
    localPromoDiscountType,
    localPromoDiscountAmount,
    localPromoScope,
    currentResource,
    findAvailablePromoCode,
    localPromoDurationType,
    localPromoDurationMonths,
    localPromoUnlimitedQuantity,
    localPromoLimitQuantity,
    localPromoShowFireIcon,
    apiPost,
    generatePromoName,
    discountSettings?.promoCode,
    setDiscountValidationError,
    updateProduct,
    onProductUpdated,
  ]);

  // Fetch resource data for current product
  useEffect(() => {
    if (!isOpen || !currentProduct || !experienceId) {
      setCurrentResource(null);
      setIsLoadingResource(false);
      return;
    }

    const fetchResource = async () => {
      setIsLoadingResource(true);
      try {
        // Try to get resource by whopProductId or product id
        const productId = currentProduct.whopProductId || currentProduct.id;
        const response = await apiPost(
          '/api/resources/get-by-product',
          {
            productId: String(productId),
            experienceId,
          },
          experienceId
        );

        if (response.ok) {
          const data = await response.json();
          console.log('📦 Resource fetched:', data.resource);
          setCurrentResource(data.resource);
        } else {
          console.log('⚠️ Resource fetch failed:', response.status);
          setCurrentResource(null);
        }
      } catch (error) {
        console.error('Error fetching resource:', error);
        setCurrentResource(null);
      } finally {
        setIsLoadingResource(false);
      }
    };

    fetchResource();
  }, [isOpen, currentProduct?.id, currentProduct?.whopProductId, experienceId, apiPost]);

  // Load seasonal discount from database (not template) for all resources
  useEffect(() => {
    if (!isOpen || !experienceId) {
      setDatabaseDiscountData(null);
      setSeasonalDiscountStatus(null);
      return;
    }

    const loadSeasonalDiscount = async () => {
      try {
        const response = await apiPost(
          '/api/seasonal-discount/get',
          { experienceId },
          experienceId
        );

        if (response.ok) {
          const data = await response.json();
          const discountData = data.discountData;
          
          // Store discount data for use in handlers
          setDatabaseDiscountData(discountData || null);
          
          if (!discountData) {
            setSeasonalDiscountStatus({ status: 'none' });
            return;
          }

          // Use checkDiscountStatus helper to properly determine status from experience record
          // The API returns SeasonalDiscountData which matches DiscountData interface
          const discountStatus = checkDiscountStatus(discountData as DiscountData);

          // Map to ProductDiscountStatus format
          let status: 'none' | 'upcoming' | 'active' | 'expired';
          if (discountStatus === 'non-existent') {
            status = 'none';
          } else if (discountStatus === 'approaching') {
            status = 'upcoming';
          } else if (discountStatus === 'active') {
            status = 'active';
          } else {
            status = 'expired';
          }

            setSeasonalDiscountStatus({ 
            status,
            startDate: discountData.seasonalDiscountStart ? (typeof discountData.seasonalDiscountStart === 'string' ? discountData.seasonalDiscountStart : discountData.seasonalDiscountStart.toISOString()) : undefined,
            endDate: discountData.seasonalDiscountEnd ? (typeof discountData.seasonalDiscountEnd === 'string' ? discountData.seasonalDiscountEnd : discountData.seasonalDiscountEnd.toISOString()) : undefined
            });
        } else {
          setDatabaseDiscountData(null);
          setSeasonalDiscountStatus({ status: 'none' });
        }
      } catch (error) {
        console.error('Error loading seasonal discount from database:', error);
        setDatabaseDiscountData(null);
        setSeasonalDiscountStatus({ status: 'none' });
      }
    };

    loadSeasonalDiscount();
  }, [isOpen, experienceId, apiPost]);

  // Load promo data from database if resource has plan_id
  useEffect(() => {
    if (!isOpen || !currentResource?.planId || !experienceId) {
      setPromoDataFromDb(null);
      return;
    }

    // Don't load promo data if discount is expired or none
    if (seasonalDiscountStatus && 
        (seasonalDiscountStatus.status === 'expired' || seasonalDiscountStatus.status === 'none')) {
      setPromoDataFromDb(null);
      return;
    }

    const loadPromoFromDatabase = async () => {
      setIsLoadingPromoFromDb(true);
      try {
        const planResponse = await apiPost(
          '/api/plans/get-by-plan-id',
          { planId: currentResource.planId },
          experienceId
        );

        if (planResponse.ok) {
          const planData = await planResponse.json();
          if (planData.promo) {
            setPromoDataFromDb({
              promoId: planData.promo.id,
              promoCode: planData.promo.code,
              amountOff: parseFloat(planData.promo.amountOff || '0'),
              promoType: planData.promo.promoType,
              stock: planData.promo.stock ?? undefined,
              unlimitedStock: planData.promo.unlimitedStock ?? false,
              promoDurationMonths: planData.promo.promoDurationMonths ?? undefined,
            });
          } else {
            setPromoDataFromDb(null);
          }
        }
      } catch (error) {
        console.error('Error loading promo from database:', error);
        setPromoDataFromDb(null);
      } finally {
        setIsLoadingPromoFromDb(false);
      }
    };

    loadPromoFromDatabase();
  }, [isOpen, currentResource?.planId, experienceId, seasonalDiscountStatus, apiPost]);

  // Clear promo data when discount is expired or none
  useEffect(() => {
    if (seasonalDiscountStatus && 
        (seasonalDiscountStatus.status === 'expired' || seasonalDiscountStatus.status === 'none')) {
      // Clear all promo-related state
      setLocalPromoDiscountType(undefined);
      setLocalPromoDiscountAmount(undefined);
      setLocalPromoLimitQuantity(undefined);
      setLocalPromoCodeId(undefined);
      setLocalPromoCode(undefined);
      setLocalPromoUnlimitedQuantity(false);
      setLocalPromoDurationType(undefined);
      setLocalPromoDurationMonths(undefined);
      setLocalPromoShowFireIcon(false);
      setPromoDataFromDb(null);
      setAvailablePromoCodes([]);
    }
  }, [seasonalDiscountStatus]);

  // Update local state when database promo data loads (only if active/upcoming)
  useEffect(() => {
    // If discount is expired or none, don't set any promo data (already cleared by clear promo data useEffect)
    if (seasonalDiscountStatus && 
        (seasonalDiscountStatus.status === 'expired' || seasonalDiscountStatus.status === 'none')) {
      // Promo data is already cleared by the clear promo data useEffect
      return;
    }

    if (promoDataFromDb && currentResource?.planId) {
      // Resource has plan_id and discount is active/upcoming - use database data
      setLocalPromoDiscountType(promoDataFromDb.promoType === 'percentage' ? 'percentage' : (promoDataFromDb.promoType === 'flat_amount' ? 'fixed' : undefined));
      setLocalPromoDiscountAmount(promoDataFromDb.amountOff);
      setLocalPromoLimitQuantity(promoDataFromDb.unlimitedStock ? -1 : (promoDataFromDb.stock ?? undefined));
      setLocalPromoCodeId(promoDataFromDb.promoId);
      setLocalPromoCode(promoDataFromDb.promoCode);
      setLocalPromoUnlimitedQuantity(promoDataFromDb.unlimitedStock ?? false);
      if (promoDataFromDb.promoDurationMonths) {
        setLocalPromoDurationType('duration_months');
        setLocalPromoDurationMonths(promoDataFromDb.promoDurationMonths);
      }
    } else if (!currentResource?.planId && currentProduct) {
      // Resource has no plan_id and discount is active/upcoming - use template data
      setLocalPromoDiscountType(currentProduct.promoDiscountType);
      setLocalPromoDiscountAmount(currentProduct.promoDiscountAmount);
      setLocalPromoLimitQuantity(currentProduct.promoLimitQuantity);
      setLocalPromoCodeId(currentProduct.promoCodeId);
      setLocalPromoCode(currentProduct.promoCode);
      setLocalPromoUnlimitedQuantity(currentProduct.promoLimitQuantity === -1);
      setLocalPromoDurationType(currentProduct.promoDurationType);
      setLocalPromoDurationMonths(currentProduct.promoDurationMonths);
    }
  }, [promoDataFromDb, currentResource?.planId, currentProduct, seasonalDiscountStatus]);

  // Initialize promoMode for resources without plans
  useEffect(() => {
    if (!hasPlans && currentProduct && discountSettings) {
      // Set to 'global' if product promo code matches global discount promo code
      const isUsingGlobalDiscount = discountSettings.globalDiscount && 
                                    discountSettings.promoCode && 
                                    currentProduct.promoCode === discountSettings.promoCode;
      setPromoMode(isUsingGlobalDiscount ? 'global' : 'custom');
    }
  }, [hasPlans, currentProduct, discountSettings]);

  // Auto-enable fire icon when Global Discount is selected for resources without plans and has limited quantity
  useEffect(() => {
    if (!hasPlans && 
        promoMode === 'global' && 
        discountSettings?.quantityPerProduct !== undefined && 
        discountSettings.quantityPerProduct !== -1 && 
        discountSettings.quantityPerProduct > 0) {
      // Auto-enable fire icon if not already enabled
      if (!localPromoShowFireIcon) {
        setLocalPromoShowFireIcon(true);
      }
      // Set the limit quantity to match global discount quantity
      if (!localPromoLimitQuantity || localPromoLimitQuantity !== discountSettings.quantityPerProduct) {
        setLocalPromoLimitQuantity(discountSettings.quantityPerProduct);
      }
      // Ensure unlimited quantity is false when fire icon is enabled
      if (localPromoUnlimitedQuantity) {
        setLocalPromoUnlimitedQuantity(false);
      }
    }
  }, [hasPlans, promoMode, discountSettings?.quantityPerProduct, localPromoShowFireIcon, localPromoLimitQuantity, localPromoUnlimitedQuantity]);

  // Fetch promos based on selected scope
  useEffect(() => {
    if (!isOpen || !localPromoScope || !currentResource || !experienceId) {
      setAvailablePromoCodes([]);
      return;
    }

    const fetchPromos = async () => {
      try {
        if (localPromoScope === 'plan') {
          // For plan scope, we need planId from currentResource
          if (!currentResource.planId) {
            console.log('⚠️ Plan scope selected but currentResource.planId is missing:', currentResource);
            setAvailablePromoCodes([]);
            return;
          }
          
          console.log('📞 Fetching promos for plan:', currentResource.planId);
          // Fetch promos for plan
          const response = await apiPost(
            '/api/promos/list-by-plan',
            {
              planId: currentResource.planId,
            },
            experienceId
          );

          if (response.ok) {
            const data = await response.json();
            const promos = data.promos || [];
            console.log(`✅ Found ${promos.length} promos for plan ${currentResource.planId}:`, promos.map((p: {id: string; code: string}) => p.code));
            setAvailablePromoCodes(promos);
            
            // If currentProduct has a promoCodeId, ensure it's in the list or set it as selected
            if (currentProduct?.promoCodeId && !promos.some((p: {id: string}) => p.id === currentProduct.promoCodeId)) {
              console.log(`⚠️ Product has promoCodeId ${currentProduct.promoCodeId} but it's not in plan's promoIds, attempting to fetch...`);
              // Promo might exist but not be in the plan's promoIds yet, try to fetch it
              try {
                const promoResponse = await apiPost(
                  '/api/promos/get-by-id',
                  { promoId: currentProduct.promoCodeId },
                  experienceId
                );
                if (promoResponse.ok) {
                  const promoData = await promoResponse.json();
                  // Add to available promos if it exists
                  if (promoData.promo) {
                    console.log(`✅ Found promo ${promoData.promo.code} via get-by-id, adding to list`);
                    setAvailablePromoCodes(prev => [...prev, { id: promoData.promo.id, code: promoData.promo.code }]);
                  }
                } else {
                  console.warn(`⚠️ Failed to fetch promo ${currentProduct.promoCodeId} via get-by-id`);
                }
              } catch (err) {
                console.error(`❌ Error fetching promo ${currentProduct.promoCodeId}:`, err);
              }
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error(`❌ Failed to fetch promos for plan ${currentResource.planId}:`, errorData);
            setAvailablePromoCodes([]);
          }
        } else if (localPromoScope === 'product') {
          if (currentResource.whopProductId) {
            console.log('📞 Fetching plans for product:', currentResource.whopProductId);
            // Get all plans for the product
            try {
              const plansResponse = await apiGet(
                `/api/plans?whopProductId=${currentResource.whopProductId}`,
                experienceId
              );
              
              if (plansResponse.ok) {
                const plansData = await plansResponse.json();
                const plans = plansData.data || [];
                
                // Fetch promos for each plan
                const allPromos = new Map<string, {id: string; code: string}>();
                let successCount = 0;
                let errorCount = 0;
                
                console.log(`📞 Fetching promos for ${plans.length} plans of product ${currentResource.whopProductId}`);
                
                for (const plan of plans) {
                  if (plan.planId) {
                    try {
                      const promoResponse = await apiPost(
                        '/api/promos/list-by-plan',
                        { planId: plan.planId },
                        experienceId
                      );
                      
                      if (promoResponse.ok) {
                        const promoData = await promoResponse.json();
                        if (promoData.promos && promoData.promos.length > 0) {
                          console.log(`✅ Found ${promoData.promos.length} promos for plan ${plan.planId}`);
                          promoData.promos.forEach((promo: {id: string; code: string}) => {
                            if (!allPromos.has(promo.id)) {
                              allPromos.set(promo.id, promo);
                            }
                          });
                          successCount++;
                        } else {
                          console.log(`ℹ️ No promos found for plan ${plan.planId}`);
                        }
                      } else {
                        const errorData = await promoResponse.json().catch(() => ({}));
                        console.error(`❌ Failed to fetch promos for plan ${plan.planId}:`, errorData);
                        errorCount++;
                      }
                    } catch (err) {
                      console.error(`❌ Error fetching promos for plan ${plan.planId}:`, err);
                      errorCount++;
                    }
                  }
                }
                
                console.log(`📊 Product promo fetch summary: ${allPromos.size} unique promos found, ${successCount} plans succeeded, ${errorCount} plans failed`);
                setAvailablePromoCodes(Array.from(allPromos.values()));
              } else {
                setAvailablePromoCodes([]);
              }
            } catch (error) {
              console.error('Error fetching plans for product:', error);
              setAvailablePromoCodes([]);
            }
          } else if (currentResource.checkoutConfigurationId && currentResource.planId) {
            // For checkout-only resources, fetch promos for the plan
            const response = await apiPost(
              '/api/promos/list-by-plan',
              {
                planId: currentResource.planId,
              },
              experienceId
            );

            if (response.ok) {
              const data = await response.json();
              setAvailablePromoCodes(data.promos || []);
            } else {
              setAvailablePromoCodes([]);
            }
          } else {
            setAvailablePromoCodes([]);
          }
        } else {
          setAvailablePromoCodes([]);
        }
      } catch (error) {
        console.error('Error fetching promos:', error);
        setAvailablePromoCodes([]);
      } finally {
        setIsLoadingPromos(false);
      }
    };

    fetchPromos();
  }, [isOpen, localPromoScope, currentResource, experienceId, currentProduct?.promoCodeId, apiPost]);

  // Handle placeholder for contentEditable divs
  const updatePlaceholder = useCallback((ref: HTMLDivElement | null) => {
    if (ref) {
      const text = ref.textContent || '';
      const isEmpty = text.trim() === '' || text.trim() === '\u200B' || text.trim() === '\u00A0';
      if (isEmpty) {
        ref.classList.add('empty');
      } else {
        ref.classList.remove('empty');
      }
    }
  }, []);

  useEffect(() => {
    if (claimButtonTextRef) {
      updatePlaceholder(claimButtonTextRef);
    }
  }, [claimButtonTextRef, promoButton.text, updatePlaceholder]);

  useEffect(() => {
    if (productButtonTextRef) {
      updatePlaceholder(productButtonTextRef);
    }
  }, [productButtonTextRef, productEditor.productId, products, updatePlaceholder]);

  // Sync contentEditable with button text values
  useEffect(() => {
    if (claimButtonTextRef) {
      const text = promoButton.text || '';
      const hasHTML = /<[^>]+>/.test(text);
      if (hasHTML) {
        if (claimButtonTextRef.innerHTML !== text) {
          claimButtonTextRef.innerHTML = text;
        }
      } else {
        if (claimButtonTextRef.textContent !== text) {
          claimButtonTextRef.textContent = text;
        }
      }
      updatePlaceholder(claimButtonTextRef);
    }
  }, [claimButtonTextRef, promoButton.text, isOpen, updatePlaceholder]);

  useEffect(() => {
    if (productButtonTextRef && productEditor.productId !== null) {
      const product = products.find(p => p.id === productEditor.productId);
      const buttonText = product?.buttonText || '';
      const hasHTML = /<[^>]+>/.test(buttonText);
      if (hasHTML) {
        if (productButtonTextRef.innerHTML !== buttonText) {
          productButtonTextRef.innerHTML = buttonText;
        }
      } else {
        if (productButtonTextRef.textContent !== buttonText) {
          productButtonTextRef.textContent = buttonText;
        }
      }
      updatePlaceholder(productButtonTextRef);
    }
  }, [productButtonTextRef, productEditor.productId, products, isOpen, updatePlaceholder]);

  const handleSaveDiscount = useCallback(() => {
    if (productEditor.productId === null) return;

    if (!localPromoDiscountType || !localPromoDiscountAmount || localPromoDiscountAmount <= 0) {
      setDiscountValidationError('Select a discount type and enter an amount greater than 0.');
      return;
    }

    if (localPromoShowFireIcon && !localPromoUnlimitedQuantity && (!localPromoLimitQuantity || localPromoLimitQuantity <= 0)) {
      setDiscountValidationError('Enter a quantity limit above 0 to show the fire icon.');
      return;
    }

    setDiscountValidationError(null);

    const updates: Partial<Product> = {
      promoDiscountType: localPromoDiscountType,
      promoDiscountAmount: localPromoDiscountAmount,
      promoLimitQuantity: localPromoUnlimitedQuantity ? -1 : localPromoLimitQuantity,
      // Set promoQuantityLeft to the limit quantity when fire icon is enabled and we have a limit
      // This represents the initial "left" count (will decrease as items are sold)
      promoQuantityLeft: localPromoShowFireIcon && !localPromoUnlimitedQuantity && localPromoLimitQuantity 
        ? localPromoLimitQuantity 
        : (localPromoUnlimitedQuantity ? undefined : (localPromoLimitQuantity ?? undefined)),
      promoShowFireIcon: localPromoShowFireIcon,
      promoScope: localPromoScope,
      promoCodeId: localPromoCodeId,
      // Note: promoCode is not updated here as it's only set when creating a new promo via "Apply Promotion"
      // If user selects an existing promo, we should fetch and save its code
      promoDurationType: localPromoDurationType,
      promoDurationMonths: localPromoDurationMonths,
    };

    console.log('💾 Saving product discount:', productEditor.productId, updates);
    updateProduct(productEditor.productId, updates);
  }, [
    productEditor.productId,
    localPromoDiscountType,
    localPromoDiscountAmount,
    localPromoLimitQuantity,
    localPromoShowFireIcon,
    updateProduct,
  ]);

  const handleClearDiscount = useCallback(async () => {
    if (productEditor.productId === null || !currentProduct) return;
    
    // Check if product has custom discount (not global)
    const hasCustomDiscount = currentProduct.promoCode && 
      !(discountSettings?.globalDiscount && discountSettings?.promoCode === currentProduct.promoCode);
    
    if (!hasCustomDiscount) {
      // No custom discount to clear, just clear local state
    if (!hasPlans) {
      setLocalManualPromoCode('');
    }
      setLocalPromoDiscountType(undefined);
      setLocalPromoDiscountAmount(undefined);
      setLocalPromoLimitQuantity(undefined);
      setLocalPromoShowFireIcon(false);
      setDiscountValidationError(null);
      return;
    }
    
    // Get the custom promo code to find in other templates
    const customPromoCode = currentProduct.promoCode;
    
    // Clear local state
    if (!hasPlans) {
      setLocalManualPromoCode('');
    }
    setLocalPromoDiscountType(undefined);
    setLocalPromoDiscountAmount(undefined);
    setLocalPromoLimitQuantity(undefined);
    setLocalPromoShowFireIcon(false);
    setDiscountValidationError(null);

    // Clear custom discount from current product (preserve global discount fields)
    updateProduct(productEditor.productId, {
      promoCode: undefined,
      promoCodeId: undefined,
      promoScope: undefined,
      promoDiscountType: undefined,
      promoDiscountAmount: undefined,
      promoLimitQuantity: undefined,
      promoQuantityLeft: undefined,
      promoShowFireIcon: undefined,
      promoDurationType: undefined,
      promoDurationMonths: undefined,
    });
    
    // Remove custom discount from all templates that have products with this custom promo code
    if (templates && setTemplates && updateCachedTemplates && updateTemplate) {
      try {
        // Prepare cleaned templates - only remove custom discount data from products with matching custom promo code
        const cleanedTemplates = templates.map(template => {
          const cleanedTemplateProducts = (template.templateData?.products || []).map((product: Product) => {
            // Only clean products that have the custom promo code AND it's not a global discount
            const isProductGlobalDiscount = discountSettings?.globalDiscount && 
              discountSettings?.promoCode === product.promoCode;
            
            if (product.promoCode === customPromoCode && !isProductGlobalDiscount) {
              // Explicitly set all promo fields to undefined to ensure they're removed
              return {
                ...product,
                promoCode: undefined,
                promoCodeId: undefined,
                promoScope: undefined,
                promoDiscountType: undefined,
                promoDiscountAmount: undefined,
                promoLimitQuantity: undefined,
                promoQuantityLeft: undefined,
                promoShowFireIcon: undefined,
                promoDurationType: undefined,
                promoDurationMonths: undefined,
              };
            }
            return product; // Keep other products unchanged
          });
          
          // Check if template has products with the custom discount
          const hasProductsWithCustomDiscount = cleanedTemplateProducts.some((p: Product, index: number) => {
            const originalProduct = (template.templateData?.products || [])[index];
            const isOriginalGlobalDiscount = discountSettings?.globalDiscount && 
              discountSettings?.promoCode === originalProduct?.promoCode;
            return originalProduct?.promoCode === customPromoCode && !isOriginalGlobalDiscount;
          });
          
          if (hasProductsWithCustomDiscount) {
            return {
              ...template,
              templateData: {
                ...template.templateData,
                products: cleanedTemplateProducts,
              },
            };
          }
          return template; // No changes needed
        });
        
        // Filter to only templates that actually have changes
        const templatesWithChanges = cleanedTemplates.filter(template => {
          const originalTemplate = templates.find(t => t.id === template.id);
          if (originalTemplate) {
            const originalProducts = originalTemplate.templateData?.products || [];
            return originalProducts.some((p: Product) => {
              const isGlobalDiscount = discountSettings?.globalDiscount && 
                discountSettings?.promoCode === p.promoCode;
              return p.promoCode === customPromoCode && !isGlobalDiscount;
            });
          }
          return false;
        });
        
        if (templatesWithChanges.length > 0) {
          // Update templates in local state
          setTemplates(prev => prev.map(template => {
            const updatedTemplate = templatesWithChanges.find(t => t.id === template.id);
            return updatedTemplate || template;
          }));
          
          // Update templates in cache
          updateCachedTemplates(prev => {
            const newCache = new Map(prev);
            templatesWithChanges.forEach(template => {
              const originalTemplate = prev.get(template.id);
              if (originalTemplate) {
                newCache.set(template.id, {
                  ...originalTemplate,
                  templateData: template.templateData,
                } as any);
              } else {
                newCache.set(template.id, template as any);
              }
            });
            return newCache;
          });
          
          // Save all affected templates to database
          console.log(`💾 Saving ${templatesWithChanges.length} cleaned templates to database after custom discount clear`);
          const savePromises = templatesWithChanges.map(template => 
            updateTemplate(template.id, {
              templateData: template.templateData,
            }).catch(error => {
              console.warn(`⚠️ Failed to save template ${template.id} to database:`, error);
              return null;
            })
          );
          
          await Promise.all(savePromises);
          console.log('✅ All templates saved to database after custom discount clear');
        }
      } catch (error) {
        console.error('⚠️ Error removing custom discount from templates:', error);
      }
    }
    
    // Trigger template auto-save callback for current template
    if (onProductUpdated) {
      setTimeout(() => {
        onProductUpdated();
      }, 100);
    }
  }, [productEditor.productId, currentProduct, discountSettings, updateProduct, templates, setTemplates, updateCachedTemplates, updateTemplate, onProductUpdated, hasPlans]);

  // Save changes when modal closes (detect transition from open to closed)
  useEffect(() => {
    // Update ref for next render
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Close handler
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Clear handler - reset all changes to saved state (from lastSavedSnapshot)
  // This does NOT trigger database save - it only resets the React state
  const handleClear = useCallback(() => {
    console.log('🧹 Clear button clicked - resetting to saved state');
    console.log('🧹 lastSavedSnapshot:', lastSavedSnapshot ? 'exists' : 'missing', lastSavedSnapshot?.substring(0, 100));
    
    // Try to use lastSavedSnapshot first (most accurate - matches what Save button uses)
    let savedPromoButton = null;
    let savedProducts: Product[] | null = null;

    if (lastSavedSnapshot) {
      try {
        const savedState = JSON.parse(lastSavedSnapshot);
        savedPromoButton = savedState.promoButton;
        savedProducts = savedState.products;
        console.log('🧹 Parsed saved state:', {
          productsCount: savedProducts?.length,
          promoButtonExists: !!savedPromoButton,
        });
      } catch (error) {
        console.error('Error parsing lastSavedSnapshot in handleClear:', error);
      }
    }

    // Fallback to initial snapshots if lastSavedSnapshot not available
    if (!savedPromoButton && initialPromoButtonSnapshotRef.current) {
      savedPromoButton = initialPromoButtonSnapshotRef.current;
    }
    if (!savedProducts && initialProductsSnapshotRef.current) {
      savedProducts = initialProductsSnapshotRef.current;
    }

    // Reset promo button to saved state
    if (savedPromoButton) {
      setPromoButton(() => ({
        text: savedPromoButton.text,
        icon: savedPromoButton.icon,
        buttonClass: savedPromoButton.buttonClass,
        ringClass: savedPromoButton.ringClass,
        ringHoverClass: savedPromoButton.ringHoverClass,
      }));

      // Reset contentEditable ref for claim button
      if (claimButtonTextRef) {
        claimButtonTextRef.innerHTML = savedPromoButton.text || '';
        updatePlaceholder(claimButtonTextRef);
      }
    }

    // Reset product to saved state (if editing a product)
    if (productEditor.productId !== null) {
      // Get saved product from lastSavedSnapshot or initial snapshot
      const savedProduct = savedProducts?.find(p => p.id === productEditor.productId) ||
        initialProductSnapshotRef.current ||
        initialProductsSnapshotRef.current?.find(p => p.id === productEditor.productId);
      
      if (!savedProduct) {
        console.log('🧹 Cannot reset - no saved product found');
        return; // Can't reset if no saved state available
      }
      
      console.log('🧹 Resetting product:', {
        productId: productEditor.productId,
        savedProductBadge: savedProduct.badge,
        savedProductKeys: Object.keys(savedProduct),
      });
      
      // Reset product to EXACT saved state (including all properties as they are in snapshot)
      // Use spread to ensure we get all properties, then normalize badge to match snapshot normalization
      const resetProduct = {
        ...savedProduct,
        // Ensure badge matches snapshot normalization (null, not undefined)
        badge: savedProduct.badge ?? null,
      };
      
      console.log('🧹 Reset product data:', {
        badge: resetProduct.badge,
        hasBadge: 'badge' in resetProduct,
      });
      
      updateProduct(productEditor.productId, resetProduct);

      // Reset local state
      setLocalPromoDiscountType(savedProduct.promoDiscountType);
      setLocalPromoDiscountAmount(savedProduct.promoDiscountAmount);
      setLocalPromoLimitQuantity(savedProduct.promoLimitQuantity);
      setLocalPromoShowFireIcon(savedProduct.promoShowFireIcon || false);
      setLocalShowSalesCount(savedProduct.showSalesCount || false);
      setLocalSalesCount(savedProduct.salesCount);
      setLocalShowRatingInfo(savedProduct.showRatingInfo || false);
      setLocalStarRating(savedProduct.starRating);
      setLocalReviewCount(savedProduct.reviewCount);
      setDiscountValidationError(null);

      // Reset contentEditable ref for product button
      if (productButtonTextRef && savedProduct.buttonText) {
        productButtonTextRef.innerHTML = savedProduct.buttonText;
        updatePlaceholder(productButtonTextRef);
      }
      
      console.log('🧹 Product reset complete:', productEditor.productId);
    }
    
    console.log('🧹 Clear operation complete - state updates should trigger detection');
    console.log('🧹 Note: Detection effect should run after state updates complete');
  }, [
    productEditor.productId,
    updateProduct,
    setPromoButton,
    claimButtonTextRef,
    productButtonTextRef,
    updatePlaceholder,
    lastSavedSnapshot,
  ]);
  
  // Update transparency value when product changes
  useEffect(() => {
    if (productEditor.productId !== null && !isUserInteracting && currentProduct) {
      const current = currentProduct.cardClass || legacyTheme.card;
      console.log('🎨 Updating transparency from product:', current);
      
      // Enhanced regex patterns to catch more transparency formats
      const patterns = [
        // Standard Tailwind format: bg-white/90, bg-gray-900/95
        /bg-[^\s/]+(?:\[[^\]]+\])?\/(\d{1,3})/,
        // Alternative format: bg-white/90 backdrop-blur
        /bg-[^\s]+(?:\[[^\]]+\])?\/(\d{1,3})/,
        // Fallback: any /XX pattern
        /\/(\d{1,3})/
      ];
      
      let transparencyFound = false;
      for (const pattern of patterns) {
        const match = current.match(pattern);
        if (match && match[1]) {
          const val = parseInt(match[1], 10);
          // Ensure the value is within valid range and round to nearest 5%
          const roundedVal = Math.round(val / 5) * 5;
          const clampedVal = Math.max(0, Math.min(100, roundedVal));
          console.log('🎨 Found transparency:', val, 'rounded to:', clampedVal);
          setTransparencyValue(clampedVal);
          transparencyFound = true;
          break;
        }
      }
      
      if (!transparencyFound) {
        console.log('🎨 No transparency found, defaulting to 90');
        setTransparencyValue(90);
      }
    }
  }, [productEditor.productId, currentProduct, legacyTheme.card, isUserInteracting]);

  // Watch for changes in the specific product's cardClass
  const currentCardClass = currentProduct?.cardClass || legacyTheme.card;
  
  useEffect(() => {
    if (productEditor.productId !== null && currentCardClass && !isUserInteracting) {
      console.log('🎨 Product cardClass changed:', currentCardClass);
      // Improved regex to match transparency values more reliably
      const transparencyMatch = currentCardClass.match(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/(\d{1,3}))?/);
      console.log('🎨 Transparency match result:', transparencyMatch);
      if (transparencyMatch && transparencyMatch[1]) {
        const val = parseInt(transparencyMatch[1], 10);
        console.log('🎨 Updating transparency from cardClass change:', val);
        setTransparencyValue(val);
      } else {
        // Try alternative regex patterns
        const altMatch1 = currentCardClass.match(/bg-[^\s]+(?:\[[^\]]+\])?\/(\d{1,3})/);
        const altMatch2 = currentCardClass.match(/\/(\d{1,3})/);
        console.log('🎨 Alternative matches:', { altMatch1, altMatch2 });
        
        if (altMatch1 && altMatch1[1]) {
          const val = parseInt(altMatch1[1], 10);
          console.log('🎨 Using alt match 1:', val);
          setTransparencyValue(val);
        } else if (altMatch2 && altMatch2[1]) {
          const val = parseInt(altMatch2[1], 10);
          console.log('🎨 Using alt match 2:', val);
          setTransparencyValue(val);
        } else {
          console.log('🎨 No transparency found in cardClass, keeping current value');
        }
      }
    }
  }, [currentCardClass, productEditor.productId, isUserInteracting]);

  // Prevent body scroll and viewport movement on mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll to prevent background movement
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalHeight = document.body.style.height;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Lock body to prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        // Restore body styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.top = originalTop;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getModalTitle = () => {
    if (productEditor.target === 'button') {
      return productEditor.productId === null ? 'Edit Claim Button' : 'Edit Button';
    }
    return 'Edit Product';
  };

  const getModalIcon = () => {
    if (productEditor.target === 'button') {
      return productEditor.productId === null ? <Package className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />;
    }
    return <Edit className="w-5 h-5" />;
  };

  // FormattingToolbar is now imported from ./product

  return (
    <>
      <style>{`
        [contenteditable][data-placeholder].empty::before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
        .dark [contenteditable][data-placeholder].empty::before {
          color: #6B7280;
        }
      `}</style>
      <Dialog.Root open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleClose();
      }
    }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-transparent z-50" />
        <Dialog.Description className="sr-only">
          {getModalTitle()}
        </Dialog.Description>
        <Dialog.Content
          className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-gray-900 text-foreground shadow-2xl z-[60] flex flex-col transform transition-transform duration-500 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onEscapeKeyDown={handleClose}
          onPointerDownOutside={(e) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking on inputs, buttons, or inside the modal content
            if (target.tagName === 'INPUT' || 
                target.tagName === 'TEXTAREA' || 
                target.tagName === 'SELECT' ||
                target.tagName === 'BUTTON' ||
                target.closest('input') ||
                target.closest('textarea') ||
                target.closest('select') ||
                target.closest('button') ||
                target.closest('[role="dialog"]') ||
                target.closest('[data-radix-dialog-content]')) {
              e.preventDefault();
              return;
            }
            handleClose();
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking on inputs, buttons, or inside the modal content
            if (target.tagName === 'INPUT' || 
                target.tagName === 'TEXTAREA' || 
                target.tagName === 'SELECT' ||
                target.tagName === 'BUTTON' ||
                target.closest('input') ||
                target.closest('textarea') ||
                target.closest('select') ||
                target.closest('button') ||
                target.closest('[role="dialog"]') ||
                target.closest('[data-radix-dialog-content]')) {
              e.preventDefault();
              return;
            }
            handleClose();
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <ProductEditorModalHeader
            modalTitle={getModalTitle()}
            modalIcon={getModalIcon()}
            onClose={handleClose}
          />
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50 dark:bg-gray-950 overflow-x-visible">
            <div className="space-y-6 min-w-0">
              {/* Edit Product Page Button - Only for FILE type products */}
              {currentProduct?.type === "FILE" && (
                <EditProductPageButton
                  onClick={() => setShowProductPageModal(true)}
                />
              )}
              
              {productEditor.productId !== null && (
                <>
                  {productEditor.target !== 'button' && (
                    <>
                      <Card 
                      className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="fui-reset px-6 py-6">
                        <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
                          Product Details
                        </Heading>
                        
                        <div className="space-y-5 min-w-0">
                        {/* Badge Selector */}
                        {productEditor.productId !== null && (
                          <BadgeSelector
                            currentProduct={currentProduct ?? null}
                            updateProduct={updateProduct}
                            productId={productEditor.productId}
                          />
                        )}

                        {/* Product Stats */}
                        {productEditor.productId !== null && (
                          <ProductStatsSection
                            productId={productEditor.productId}
                            localShowSalesCount={localShowSalesCount}
                            setLocalShowSalesCount={setLocalShowSalesCount}
                            localSalesCount={localSalesCount}
                            setLocalSalesCount={setLocalSalesCount}
                            localShowRatingInfo={localShowRatingInfo}
                            setLocalShowRatingInfo={setLocalShowRatingInfo}
                            localStarRating={localStarRating}
                            setLocalStarRating={setLocalStarRating}
                            localReviewCount={localReviewCount}
                            setLocalReviewCount={setLocalReviewCount}
                            updateProduct={updateProduct}
                          />
                        )}
                        </div>
                      </div>
                    </Card>
                    </>
                  )}

                  {/* Button-only section (distinct modal experience) */}
                  {productEditor.target === 'button' && (
                    <Card 
                      className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="fui-reset px-6 py-6">
                        <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
                          Button Settings
                        </Heading>
                        
                        <div className="space-y-5 min-w-0">
                        
                        {/* Button Style for individual products */}
                        {productEditor.productId !== null && (
                          <ButtonStyleSection
                            currentProduct={currentProduct ?? null}
                            products={products}
                            productId={productEditor.productId}
                            legacyTheme={legacyTheme}
                            updateProduct={updateProduct}
                          />
                        )}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Card Style Presets (apply per-card or all) */}
                  {productEditor.target !== 'button' && (
                    <Card 
                      className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="fui-reset px-6 py-6">
                        {productEditor.productId !== null && (
                          <CardStyleSection
                            currentProduct={currentProduct ?? null}
                            products={products}
                            productId={productEditor.productId}
                            legacyTheme={legacyTheme}
                            transparencyValue={transparencyValue}
                            setTransparencyValue={setTransparencyValue}
                            setIsUserInteracting={setIsUserInteracting}
                            updateProduct={updateProduct}
                          />
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Product Discount Section */}
                  {productEditor.target !== 'button' && (
                  <ProductDiscountForm
                    currentProduct={currentProduct ?? null}
                    productEditor={productEditor}
                    discountSettings={discountSettings}
                    experienceId={experienceId}
                    hasPlans={hasPlans}
                    isProductType={isProductType}
                    seasonalDiscountStatus={seasonalDiscountStatus}
                    isProductDiscountLoading={isProductDiscountLoading}
                    localPromoScope={localPromoScope}
                    setLocalPromoScope={setLocalPromoScope}
                    localPromoCodeId={localPromoCodeId}
                    setLocalPromoCodeId={setLocalPromoCodeId}
                    localManualPromoCode={localManualPromoCode}
                    setLocalManualPromoCode={setLocalManualPromoCode}
                    promoMode={promoMode}
                    setPromoMode={setPromoMode}
                    localPromoDiscountType={localPromoDiscountType}
                    setLocalPromoDiscountType={setLocalPromoDiscountType}
                    localPromoDiscountAmount={localPromoDiscountAmount}
                    setLocalPromoDiscountAmount={setLocalPromoDiscountAmount}
                    localPromoLimitQuantity={localPromoLimitQuantity}
                    setLocalPromoLimitQuantity={setLocalPromoLimitQuantity}
                    localPromoUnlimitedQuantity={localPromoUnlimitedQuantity}
                    setLocalPromoUnlimitedQuantity={setLocalPromoUnlimitedQuantity}
                    localPromoShowFireIcon={localPromoShowFireIcon}
                    setLocalPromoShowFireIcon={setLocalPromoShowFireIcon}
                    localPromoDurationType={localPromoDurationType}
                    setLocalPromoDurationType={setLocalPromoDurationType}
                    localPromoDurationMonths={localPromoDurationMonths}
                    setLocalPromoDurationMonths={setLocalPromoDurationMonths}
                    isCreatingPromo={isCreatingPromo}
                    setIsCreatingPromo={setIsCreatingPromo}
                    isApplyingPromo={isApplyingPromo}
                    generatedPromoName={generatedPromoName}
                    setGeneratedPromoName={setGeneratedPromoName}
                    availablePromoCodes={availablePromoCodes}
                    isLoadingPromos={isLoadingPromos}
                    isPromoDataLoaded={isPromoDataLoaded}
                    setIsPromoDataLoaded={setIsPromoDataLoaded}
                    setSelectedPromoData={setSelectedPromoData}
                    hasDiscountSelected={hasDiscountSelected}
                    discountValidationError={discountValidationError}
                    setDiscountValidationError={setDiscountValidationError}
                    showNewPromoButton={showNewPromoButton}
                    updateProduct={updateProduct}
                    onProductUpdated={onProductUpdated}
                    handleNewPromoClick={handleNewPromoClick}
                    handleApplyPromo={handleApplyPromo}
                    handleApplyExistingPromo={handleApplyExistingPromo}
                    handleDeletePromo={handleDeletePromo}
                    isDeletingPromo={isDeletingPromo}
                    handleClearDiscount={handleClearDiscount}
                    handleApplyGlobalDiscount={handleApplyGlobalDiscount}
                  />
                  )}
                </>
              )}
              
              {/* Button-only section for Claim button (no productId) */}
              {productEditor.productId === null && productEditor.target === 'button' && (
                <ClaimButtonSettings
                  promoButton={promoButton}
                  setPromoButton={setPromoButton}
                  legacyTheme={legacyTheme}
                  products={products}
                  updateProduct={updateProduct}
                />
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      
      {/* Product Page Modal */}
      {currentProduct && showProductPageModal && (
        <ProductPageModal
          isOpen={showProductPageModal}
          onClose={() => setShowProductPageModal(false)}
          product={currentProduct}
          theme={{
            name: 'Store',
            accent: legacyTheme.accent,
            card: legacyTheme.card,
            text: legacyTheme.text,
            welcomeColor: legacyTheme.text,
            background: '',
            aiMessage: '',
            emojiTip: '',
          } as LegacyTheme}
          storeName="Store"
          experienceId={experienceId}
          isEditMode={true}
          onUserUpdate={onUserUpdate}
        />
      )}
    </Dialog.Root>
    </>
  );
};















  