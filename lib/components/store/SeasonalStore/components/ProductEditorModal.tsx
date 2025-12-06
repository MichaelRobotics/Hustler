'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Heading, Text, Card, Separator } from 'frosted-ui';
import { Edit, X, Package, Sparkles, Star, Award, ChevronDown, Flame, Bold, Italic, Palette, Type } from 'lucide-react';
import { ButtonColorControls } from './ButtonColorControls';
import { tailwindTextColorToHex } from '../utils/colors';
import { EMOJI_DATABASE } from '../actions/constants';

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
  // Badge support
  badge?: 'new' | '5star' | 'bestseller' | null;
  // Promo support
  promoEnabled?: boolean;
  promoDiscountType?: 'percentage' | 'fixed';
  promoDiscountAmount?: number;
  promoLimitQuantity?: number;
  promoQuantityLeft?: number;
  promoShowFireIcon?: boolean;
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
  discountSettings?: {
    enabled: boolean;
    startDate: string;
    endDate: string;
  };
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
}) => {
  // Refs for inline editing focus
  
  // Local state for transparency slider
  const [transparencyValue, setTransparencyValue] = useState(90);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  
  // Memoize current product to avoid repeated finds
  const currentProduct = useMemo(() => 
    productEditor.productId !== null 
      ? products.find(p => p.id === productEditor.productId)
      : null,
    [products, productEditor.productId]
  );
  
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
  const [discountValidationError, setDiscountValidationError] = useState<string | null>(null);
  
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
      setDiscountValidationError(null);
    }
    }
    // Note: Initial snapshots are captured from page load state
    // Product-specific snapshot is taken from initialProductsSnapshotRef when editing starts
    // This allows Clear to reset to the original page load state
  }, [isOpen, currentProduct?.id, productEditor.productId]);

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

    if (localPromoShowFireIcon && (!localPromoLimitQuantity || localPromoLimitQuantity <= 0)) {
      setDiscountValidationError('Enter a quantity limit above 0 to show the fire icon.');
      return;
    }

    setDiscountValidationError(null);

    const updates: Partial<Product> = {
      promoDiscountType: localPromoDiscountType,
      promoDiscountAmount: localPromoDiscountAmount,
      promoLimitQuantity: localPromoLimitQuantity,
      promoQuantityLeft: localPromoLimitQuantity ?? undefined,
      promoShowFireIcon: localPromoShowFireIcon,
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

  const handleClearDiscount = useCallback(() => {
    if (productEditor.productId === null) return;

    setLocalPromoDiscountType(undefined);
    setLocalPromoDiscountAmount(undefined);
    setLocalPromoLimitQuantity(undefined);
    setLocalPromoShowFireIcon(false);
    setDiscountValidationError(null);

    updateProduct(productEditor.productId, {
      promoDiscountType: undefined,
      promoDiscountAmount: undefined,
      promoLimitQuantity: undefined,
      promoQuantityLeft: undefined,
      promoShowFireIcon: false,
    });
  }, [productEditor.productId, updateProduct]);

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

  // FormattingToolbar component (simplified version)
  const FormattingToolbar: React.FC<{
    show: boolean;
    elementRef: HTMLDivElement | null;
    toolbarRef: React.RefObject<HTMLDivElement | null>;
    showColorPicker: boolean;
    setShowColorPicker: (show: boolean) => void;
    showEmojiPicker?: boolean;
    setShowEmojiPicker?: (show: boolean) => void;
    showFontSize: boolean;
    setShowFontSize: (show: boolean) => void;
    selectedColor: string;
    setSelectedColor: (color: string) => void;
    quickColors: string[];
    fontSizeOptions: number[];
    emojiDatabase?: Array<{ emoji: string; name: string; keywords: string[] }>;
    onBold: () => void;
    onItalic: () => void;
    onColorChange: (color: string) => void;
    onEmojiSelect?: (emoji: string) => void;
    onFontSizeChange: (size: number) => void;
    hideFontSize?: boolean;
    hideBoldItalic?: boolean;
  }> = ({ 
    show, 
    elementRef, 
    toolbarRef, 
    showColorPicker, 
    setShowColorPicker,
    showEmojiPicker = false,
    setShowEmojiPicker,
    showFontSize, 
    setShowFontSize,
    selectedColor,
    setSelectedColor,
    quickColors,
    fontSizeOptions,
    emojiDatabase = [],
    onBold,
    onItalic,
    onColorChange,
    onEmojiSelect,
    onFontSizeChange,
    hideFontSize = false,
    hideBoldItalic = false,
  }) => {
    if (!show || !elementRef || typeof window === 'undefined') return null;
    
    const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);
    
    const saveSelection = () => {
      if (!elementRef) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (elementRef.contains(range.commonAncestorContainer)) {
          const preCaretRange = document.createRange();
          preCaretRange.selectNodeContents(elementRef);
          preCaretRange.setEnd(range.startContainer, range.startOffset);
          const start = preCaretRange.toString().length;
          const end = start + range.toString().length;
          savedSelectionRef.current = { start, end };
        }
      } else {
        const textLength = elementRef.textContent?.length || 0;
        savedSelectionRef.current = { start: textLength, end: textLength };
      }
    };
    
    const restoreSelection = () => {
      if (!elementRef || !savedSelectionRef.current) return;
      const { start, end } = savedSelectionRef.current;
      const selection = window.getSelection();
      try {
        let currentOffset = 0;
        const walker = document.createTreeWalker(elementRef, NodeFilter.SHOW_TEXT, null);
        let targetTextNode: Text | null = null;
        let startOffset = 0;
        let endOffset = 0;
        let node: Text | null;
        while (node = walker.nextNode() as Text | null) {
          const nodeLength = node.textContent?.length || 0;
          if (currentOffset + nodeLength >= start) {
            targetTextNode = node;
            startOffset = Math.max(0, start - currentOffset);
            endOffset = Math.min(end - currentOffset, nodeLength);
            break;
          }
          currentOffset += nodeLength;
        }
        if (targetTextNode) {
          const range = document.createRange();
          range.setStart(targetTextNode, startOffset);
          range.setEnd(targetTextNode, endOffset);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } else {
          const range = document.createRange();
          if (elementRef.firstChild && elementRef.firstChild.nodeType === Node.TEXT_NODE) {
            const textNode = elementRef.firstChild as Text;
            range.setStart(textNode, Math.min(start, textNode.length));
            range.setEnd(textNode, Math.min(end, textNode.length));
          } else {
            range.setStart(elementRef, 0);
            range.setEnd(elementRef, 0);
          }
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } catch (err) {
        const range = document.createRange();
        if (elementRef.firstChild && elementRef.firstChild.nodeType === Node.TEXT_NODE) {
          const textNode = elementRef.firstChild as Text;
          range.setStart(textNode, textNode.length);
          range.setEnd(textNode, textNode.length);
        } else {
          range.setStart(elementRef, 0);
          range.setEnd(elementRef, 0);
        }
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    };
    
    const getToolbarPosition = () => {
      if (!elementRef) return { top: 0, left: 0 };
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (elementRef.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          return { top: rect.top - 50, left: rect.left + (rect.width / 2) };
        }
      }
      const rect = elementRef.getBoundingClientRect();
      return { top: rect.top - 50, left: rect.left + (rect.width / 2) };
    };
    
    const [position, setPosition] = useState(() => ({ top: 0, left: 0 }));
    const positionRef = useRef<{ top: number; left: number } | null>(null);
    const hasSetInitialPosition = useRef(false);
    
    // Update position only when toolbar first appears
    useEffect(() => {
      if (show && elementRef && !hasSetInitialPosition.current) {
        // Use requestAnimationFrame to ensure element is rendered
        requestAnimationFrame(() => {
          if (!elementRef) return;
          const newPosition = getToolbarPosition();
          // Only set position if it's valid (not 0,0)
          if (newPosition.top !== 0 || newPosition.left !== 0) {
            positionRef.current = newPosition;
            setPosition(newPosition);
            hasSetInitialPosition.current = true;
          }
        });
      } else if (!show) {
        // Reset flag when toolbar is hidden
        hasSetInitialPosition.current = false;
        positionRef.current = null;
        setPosition({ top: 0, left: 0 });
      }
    }, [show, elementRef]);
    
    // Use stored position if available, to prevent drift
    // Once positionRef is set, always use it - never fall back to position state
    const stablePosition = positionRef.current || (position.top !== 0 || position.left !== 0 ? position : { top: 0, left: 0 });
    
    // Don't render if not showing, no element reference, or invalid position
    if (!show || !elementRef || (stablePosition.top === 0 && stablePosition.left === 0 && !positionRef.current)) {
      return null;
    }
    
    return createPortal(
      <div
        ref={toolbarRef}
        className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-2"
        style={{
          pointerEvents: 'auto',
          zIndex: 999999,
          top: `${stablePosition.top}px`,
          left: `${stablePosition.left}px`,
          transform: 'translateX(-50%)',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {!hideBoldItalic && (
          <>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (elementRef) {
                  elementRef.focus();
                  saveSelection();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (elementRef) {
                  elementRef.focus();
                  restoreSelection();
                  onBold();
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (elementRef) {
                  elementRef.focus();
                  saveSelection();
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (elementRef) {
                  elementRef.focus();
                  restoreSelection();
                  onItalic();
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
          </>
        )}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (elementRef) {
                elementRef.focus();
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  let element: Element | null = null;
                  if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
                    element = range.commonAncestorContainer.parentElement;
                  } else {
                    element = range.commonAncestorContainer as Element;
                  }
                  while (element && element !== elementRef) {
                    const style = element.getAttribute('style');
                    if (style) {
                      const colorMatch = style.match(/color:\s*([^;]+)/i);
                      if (colorMatch) {
                        setSelectedColor(colorMatch[1].trim());
                        break;
                      }
                    }
                    element = element.parentElement;
                  }
                }
              }
              setShowColorPicker(!showColorPicker);
              if (setShowEmojiPicker) setShowEmojiPicker(false);
              setShowFontSize(false);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColorPicker && createPortal(
            <div
              className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2"
              style={{
                pointerEvents: 'auto',
                zIndex: 1000000,
                top: `${stablePosition.top}px`,
                left: `${stablePosition.left}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="grid grid-cols-6 gap-1 mb-2">
                {quickColors.map((color, index) => (
                  <button
                    key={`${color}-${index}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (elementRef) {
                        elementRef.focus();
                        // If no selection, select all first
                        const selection = window.getSelection();
                        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                          const range = document.createRange();
                          range.selectNodeContents(elementRef);
                          selection?.removeAllRanges();
                          selection?.addRange(range);
                        }
                      }
                      setSelectedColor(color);
                      onColorChange(color);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => {
                    const color = e.target.value;
                    if (elementRef) {
                      elementRef.focus();
                      // If no selection, select all first
                      const selection = window.getSelection();
                      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                        const range = document.createRange();
                        range.selectNodeContents(elementRef);
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                      }
                    }
                    setSelectedColor(color);
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                  className="w-full h-8 cursor-pointer border border-gray-300 dark:border-gray-600 rounded"
                  title="Custom Color"
                />
              </div>
            </div>,
            document.body
          )}
        </div>
        {setShowEmojiPicker && emojiDatabase && emojiDatabase.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (elementRef) {
                  elementRef.focus();
                }
                if (setShowEmojiPicker) {
                  setShowEmojiPicker(!showEmojiPicker);
                }
                setShowColorPicker(false);
                setShowFontSize(false);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
              title="Emoji"
            >
              😀
            </button>
            {showEmojiPicker && createPortal(
              <div
                className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 max-h-64 overflow-y-auto"
                style={{
                  pointerEvents: 'auto',
                  zIndex: 1000000,
                  top: `${stablePosition.top}px`,
                  left: `${stablePosition.left}px`,
                  transform: 'translateX(-50%)',
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {emojiDatabase.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (elementRef && onEmojiSelect) {
                        elementRef.focus();
                        const selection = window.getSelection();
                        let range: Range;
                        if (selection && selection.rangeCount > 0) {
                          range = selection.getRangeAt(0);
                        } else {
                          range = document.createRange();
                          if (elementRef.childNodes.length > 0) {
                            range.selectNodeContents(elementRef);
                            range.collapse(false);
                          } else {
                            range.setStart(elementRef, 0);
                            range.setEnd(elementRef, 0);
                          }
                        }
                        range.deleteContents();
                        range.insertNode(document.createTextNode(item.emoji));
                        range.collapse(false);
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                        onEmojiSelect(item.emoji);
                        setShowEmojiPicker(false);
                      }
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                    title={item.name}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>
        )}
        {!hideFontSize && (
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                saveSelection();
                setShowFontSize(!showFontSize);
                setShowColorPicker(false);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Font Size"
            >
              <Type className="w-4 h-4" />
            </button>
          {showFontSize && createPortal(
            <div
              className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 max-h-64 overflow-y-auto"
              style={{
                pointerEvents: 'auto',
                zIndex: 1000000,
                top: `${stablePosition.top}px`,
                left: `${stablePosition.left}px`,
                transform: 'translateX(-50%)',
                minWidth: '120px',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {fontSizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (elementRef) {
                      elementRef.focus();
                      restoreSelection();
                    }
                    onFontSizeChange(size);
                    setShowFontSize(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                >
                  {size}px
                </button>
              ))}
            </div>,
            document.body
          )}
          </div>
        )}
      </div>,
      document.body
    );
  };

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
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title asChild>
                <Heading
                  size="5"
                  weight="bold"
                  className="flex items-center gap-3 text-gray-900 dark:text-white text-2xl font-bold tracking-tight"
                >
                  {getModalIcon()}
                  {getModalTitle()}
                </Heading>
              </Dialog.Title>
              <div className="flex items-center gap-2">
              <Dialog.Close asChild>
                <Button
                  size="2"
                  variant="soft"
                  color="gray"
                  className="!px-4 !py-2"
                >
                  Close
                </Button>
              </Dialog.Close>
              </div>
            </div>
            <Separator size="1" color="gray" />
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50 dark:bg-gray-950 overflow-x-visible">
            <div className="space-y-6 min-w-0">
              {productEditor.productId !== null && (
                <>
                  {productEditor.target !== 'button' && (
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
                        <div>
                          <Text
                            as="label"
                            size="3"
                            weight="medium"
                            className="block mb-3"
                          >
                            Badge
                          </Text>
                          {(() => {
                            const currentBadge = currentProduct?.badge;
                            const isNoneSelected = !currentBadge;
                            const isNewSelected = currentBadge === 'new';
                            const is5StarSelected = currentBadge === '5star';
                            const isBestSellerSelected = currentBadge === 'bestseller';
                            
                            return (
                              <div className="flex flex-wrap gap-3">
                                <Button
                                  size="3"
                                  variant="surface"
                                  color="gray"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateProduct(productEditor.productId!, { badge: null });
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
                                    updateProduct(productEditor.productId!, { badge: 'new' });
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
                                    updateProduct(productEditor.productId!, { badge: '5star' });
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
                                    updateProduct(productEditor.productId!, { badge: 'bestseller' });
                                  }}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className={`!px-6 !py-3 shadow-lg shadow-orange-500/25 hover:!bg-orange-500 hover:!text-white hover:shadow-orange-500/40 hover:scale-105 active:!bg-orange-600 active:!text-white transition-all duration-300 dark:shadow-orange-500/30 dark:hover:shadow-orange-500/50 dark:hover:!bg-orange-600 dark:active:!bg-orange-700 ${isBestSellerSelected ? '!bg-orange-500 !text-white' : ''}`}
                                >
                                  BestSeller
                                </Button>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Product Stats */}
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
                                    if (productEditor.productId !== null) {
                                      updateProduct(productEditor.productId, { showSalesCount: checked });
                                    }
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
                                  if (productEditor.productId !== null) {
                                    updateProduct(productEditor.productId, { salesCount: parsed });
                                  }
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
                                    if (productEditor.productId !== null) {
                                      updateProduct(productEditor.productId, { showRatingInfo: checked });
                                    }
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
                                      if (productEditor.productId !== null) {
                                        updateProduct(productEditor.productId, { starRating: parsed });
                                      }
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
                                      if (productEditor.productId !== null) {
                                        updateProduct(productEditor.productId, { reviewCount: parsed });
                                      }
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
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Product Discount Section */}
                  {productEditor.target !== 'button' && discountSettings && discountSettings.startDate && discountSettings.endDate && discountSettings.startDate.trim() !== '' && discountSettings.endDate.trim() !== '' && (
                    <Card 
                      className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="fui-reset px-6 py-6">
                        <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
                          Product Discount
                        </Heading>
                        
                        <div className="space-y-5">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocalPromoDiscountType('percentage');
                                  setDiscountValidationError(null);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="!px-6 !py-3"
                              >
                                Percentage
                              </Button>
                              <Button
                                size="3"
                                variant={localPromoDiscountType === 'fixed' ? 'solid' : 'soft'}
                                color="violet"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocalPromoDiscountType('fixed');
                                  setDiscountValidationError(null);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="!px-6 !py-3"
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
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              setLocalPromoDiscountAmount(Number.isNaN(value) ? undefined : value);
                              setDiscountValidationError(null);
                            }}
                            placeholder={localPromoDiscountType === 'percentage' ? 'Enter percentage (e.g., 20)' : 'Enter amount (e.g., 10.00)'}
                            className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
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
                          <input
                            type="number"
                            min="0"
                            value={localPromoLimitQuantity ?? ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              setLocalPromoLimitQuantity(Number.isNaN(value) || value <= 0 ? undefined : value);
                              setDiscountValidationError(null);
                            }}
                            placeholder="Enter limit (e.g., 50)"
                            className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
                              discountValidationError && discountValidationError.includes('quantity') ? 'border-red-500 dark:border-red-500' : ''
                            }`}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          />
                          <Text size="2" className="text-gray-500 dark:text-gray-400 mt-2">
                            Optional limit for discounted purchases (required if showing fire icon).
                          </Text>
                        </div>

                          {/* Show Fire Icon Toggle */}
                          <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={localPromoShowFireIcon}
                                onChange={(e) => {
                                  setLocalPromoShowFireIcon(e.target.checked);
                                }}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
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

                          {/* Validation Error */}
                          {discountValidationError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <Text size="2" className="text-red-600 dark:text-red-400">
                                {discountValidationError}
                              </Text>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex justify-end gap-3 pt-2">
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
                                handleSaveDiscount();
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="!px-6 !py-3"
                            >
                              Save Discount
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
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
                        {/* Button Text (per-product) */}
                        <div>
                          <Text
                            as="label"
                            size="3"
                            weight="medium"
                            className="block mb-3"
                          >
                            Button Text (This card only)
                          </Text>
                          <div
                            ref={setProductButtonTextRef}
                            contentEditable
                            onInput={(e) => {
                              const target = e.target as HTMLDivElement;
                              const html = target.innerHTML;
                              updatePlaceholder(target);
                              if (productEditor.productId !== null) {
                                updateProduct(productEditor.productId, { buttonText: html });
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (productButtonTextRef) {
                                productButtonTextRef.focus();
                                const selection = window.getSelection();
                                if (selection && productButtonTextRef.textContent === '') {
                                  const range = document.createRange();
                                  range.selectNodeContents(productButtonTextRef);
                                  range.collapse(false);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                }
                              }
                              setShowProductButtonToolbar(true);
                            }}
                            onSelect={() => {
                              setShowProductButtonToolbar(true);
                            }}
                            onFocus={() => {
                              if (productButtonTextRef && productButtonTextRef.textContent === '') {
                                const selection = window.getSelection();
                                if (selection) {
                                  const range = document.createRange();
                                  range.selectNodeContents(productButtonTextRef);
                                  range.collapse(false);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                }
                              }
                            }}
                            onBlur={(e) => {
                              const html = (e.target as HTMLDivElement).innerHTML;
                              if (productEditor.productId !== null) {
                                updateProduct(productEditor.productId, { buttonText: html });
                              }
                              setTimeout(() => {
                                if (!productButtonToolbarRef.current?.contains(document.activeElement)) {
                                  setShowProductButtonToolbar(false);
                                  setShowProductButtonColorPicker(false);
                                  setShowProductButtonEmojiPicker(false);
                                  setShowProductButtonFontSize(false);
                                }
                              }, 200);
                            }}
                            className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 min-h-[48px]"
                            data-placeholder="Enter button text"
                            style={{ boxSizing: 'border-box' }}
                            onPointerDown={(e) => e.stopPropagation()}
                          />
                          <FormattingToolbar
                            show={showProductButtonToolbar}
                            elementRef={productButtonTextRef}
                            toolbarRef={productButtonToolbarRef}
                            showColorPicker={showProductButtonColorPicker}
                            setShowColorPicker={setShowProductButtonColorPicker}
                            showEmojiPicker={showProductButtonEmojiPicker}
                            setShowEmojiPicker={setShowProductButtonEmojiPicker}
                            showFontSize={showProductButtonFontSize}
                            setShowFontSize={setShowProductButtonFontSize}
                            selectedColor={selectedProductButtonColor}
                            setSelectedColor={setSelectedProductButtonColor}
                            quickColors={quickColors}
                            fontSizeOptions={fontSizeOptions}
                            emojiDatabase={EMOJI_DATABASE}
                            hideFontSize={true}
                            hideBoldItalic={true}
                            onBold={() => {
                              if (productButtonTextRef) {
                                productButtonTextRef.focus();
                                const selection = window.getSelection();
                                if (selection && selection.rangeCount === 0) {
                                  const range = document.createRange();
                                  range.selectNodeContents(productButtonTextRef);
                                  range.collapse(false);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                }
                                document.execCommand('bold', false);
                                const html = productButtonTextRef.innerHTML;
                                if (productEditor.productId !== null) {
                                  updateProduct(productEditor.productId, { buttonText: html });
                                }
                              }
                            }}
                            onItalic={() => {
                              if (productButtonTextRef) {
                                productButtonTextRef.focus();
                                const selection = window.getSelection();
                                if (selection && selection.rangeCount === 0) {
                                  const range = document.createRange();
                                  range.selectNodeContents(productButtonTextRef);
                                  range.collapse(false);
                                  selection.removeAllRanges();
                                  selection.addRange(range);
                                }
                                document.execCommand('italic', false);
                                const html = productButtonTextRef.innerHTML;
                                if (productEditor.productId !== null) {
                                  updateProduct(productEditor.productId, { buttonText: html });
                                }
                              }
                            }}
                            onColorChange={(color) => {
                              if (productButtonTextRef) {
                                document.execCommand('foreColor', false, color);
                                const html = productButtonTextRef.innerHTML;
                                if (productEditor.productId !== null) {
                                  updateProduct(productEditor.productId, { buttonText: html });
                                }
                              }
                            }}
                            onEmojiSelect={(emoji) => {
                              if (productButtonTextRef) {
                                const html = productButtonTextRef.innerHTML;
                                if (productEditor.productId !== null) {
                                  updateProduct(productEditor.productId, { buttonText: html });
                                }
                              }
                            }}
                            onFontSizeChange={() => {}}
                          />
                        </div>
                        
                        {/* Button Style for individual products */}
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
                              updateProduct(productEditor.productId!, { buttonClass: cls });
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
                              const current = products.find(p => p.id === productEditor.productId!)?.buttonClass || legacyTheme.accent;
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
                            updateProduct(productEditor.productId!, { cardClass: preset.card, titleClass: preset.title, descClass: preset.desc });
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
                              key={`transparency-${productEditor.productId}`}
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
                                
                                const current = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                                
                                const baseMatch = current.match(/bg-[^\s/]+(?:\[[^\]]+\])?/);
                                if (baseMatch) {
                                  const baseClass = baseMatch[0];
                                  const restOfClasses = current.replace(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/\d{1,3})?/, '').trim();
                                  const newCardClass = `${baseClass}/${clampedVal}${restOfClasses ? ' ' + restOfClasses : ''}`;
                                  updateProduct(productEditor.productId!, { cardClass: newCardClass });
                                } else {
                                  const newCardClass = `bg-white/${clampedVal} backdrop-blur-sm shadow-xl`;
                                  updateProduct(productEditor.productId!, { cardClass: newCardClass });
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
                              const currentCard = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                              const currentTitle = products.find(p => p.id === productEditor.productId!)?.titleClass || legacyTheme.text;
                              const currentDesc = products.find(p => p.id === productEditor.productId!)?.descClass || legacyTheme.text;
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
                      </div>
                    </Card>
                  )}
                </>
              )}
              
              {/* Button-only section for Claim button (no productId) */}
              {productEditor.productId === null && productEditor.target === 'button' && (
                <Card 
                  className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="fui-reset px-6 py-6">
                    <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
                      Claim Button Settings
                    </Heading>
                    
                    <div className="space-y-5 min-w-0">
                    {/* Claim Button Text */}
                    <div>
                      <Text
                        as="label"
                        size="3"
                        weight="medium"
                        className="block mb-3"
                      >
                        Button Text
                      </Text>
                      <div
                        ref={setClaimButtonTextRef}
                        contentEditable
                        onInput={(e) => {
                          const target = e.target as HTMLDivElement;
                          const html = target.innerHTML;
                          updatePlaceholder(target);
                          setPromoButton(prev => ({ ...prev, text: html }));
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (claimButtonTextRef) {
                            claimButtonTextRef.focus();
                            const selection = window.getSelection();
                            if (selection && claimButtonTextRef.textContent === '') {
                              const range = document.createRange();
                              range.selectNodeContents(claimButtonTextRef);
                              range.collapse(false);
                              selection.removeAllRanges();
                              selection.addRange(range);
                            }
                          }
                          setShowClaimButtonToolbar(true);
                        }}
                        onSelect={() => {
                          setShowClaimButtonToolbar(true);
                        }}
                        onFocus={() => {
                          if (claimButtonTextRef && claimButtonTextRef.textContent === '') {
                            const selection = window.getSelection();
                            if (selection) {
                              const range = document.createRange();
                              range.selectNodeContents(claimButtonTextRef);
                              range.collapse(false);
                              selection.removeAllRanges();
                              selection.addRange(range);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const html = (e.target as HTMLDivElement).innerHTML;
                          setPromoButton(prev => ({ ...prev, text: html }));
                          setTimeout(() => {
                            if (!claimButtonToolbarRef.current?.contains(document.activeElement)) {
                              setShowClaimButtonToolbar(false);
                              setShowClaimButtonColorPicker(false);
                              setShowClaimButtonEmojiPicker(false);
                              setShowClaimButtonFontSize(false);
                            }
                          }, 200);
                        }}
                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 min-h-[48px]"
                        data-placeholder="Enter claim button text"
                        style={{ boxSizing: 'border-box' }}
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                      <FormattingToolbar
                        show={showClaimButtonToolbar}
                        elementRef={claimButtonTextRef}
                        toolbarRef={claimButtonToolbarRef}
                        showColorPicker={showClaimButtonColorPicker}
                        setShowColorPicker={setShowClaimButtonColorPicker}
                        showEmojiPicker={showClaimButtonEmojiPicker}
                        setShowEmojiPicker={setShowClaimButtonEmojiPicker}
                        showFontSize={showClaimButtonFontSize}
                        setShowFontSize={setShowClaimButtonFontSize}
                        selectedColor={selectedClaimButtonColor}
                        setSelectedColor={setSelectedClaimButtonColor}
                        quickColors={quickColors}
                        fontSizeOptions={fontSizeOptions}
                        emojiDatabase={EMOJI_DATABASE}
                        hideFontSize={true}
                        hideBoldItalic={true}
                        onBold={() => {
                          if (claimButtonTextRef) {
                            claimButtonTextRef.focus();
                            const selection = window.getSelection();
                            if (selection && selection.rangeCount === 0) {
                              const range = document.createRange();
                              range.selectNodeContents(claimButtonTextRef);
                              range.collapse(false);
                              selection.removeAllRanges();
                              selection.addRange(range);
                            }
                            document.execCommand('bold', false);
                            const html = claimButtonTextRef.innerHTML;
                            setPromoButton(prev => ({ ...prev, text: html }));
                          }
                        }}
                        onItalic={() => {
                          if (claimButtonTextRef) {
                            claimButtonTextRef.focus();
                            const selection = window.getSelection();
                            if (selection && selection.rangeCount === 0) {
                              const range = document.createRange();
                              range.selectNodeContents(claimButtonTextRef);
                              range.collapse(false);
                              selection.removeAllRanges();
                              selection.addRange(range);
                            }
                            document.execCommand('italic', false);
                            const html = claimButtonTextRef.innerHTML;
                            setPromoButton(prev => ({ ...prev, text: html }));
                          }
                        }}
                        onColorChange={(color) => {
                          if (claimButtonTextRef) {
                            document.execCommand('foreColor', false, color);
                            const html = claimButtonTextRef.innerHTML;
                            setPromoButton(prev => ({ ...prev, text: html }));
                          }
                        }}
                        onEmojiSelect={(emoji) => {
                          if (claimButtonTextRef) {
                            const html = claimButtonTextRef.innerHTML;
                            setPromoButton(prev => ({ ...prev, text: html }));
                          }
                        }}
                        onFontSizeChange={() => {}}
                      />
                    </div>
                    
                    {/* Claim Button Class via presets */}
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
                        const isSelected = promoButton.buttonClass === cls;
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
                              setPromoButton(prev => ({ ...prev, buttonClass: cls }));
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
                            const current = promoButton.buttonClass || legacyTheme.accent;
                            products.forEach(p => {
                              updateProduct(p.id, { buttonClass: current });
                            });
                            setPromoButton(prev => ({ ...prev, buttonClass: current }));
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          className="!px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
                        >
                          Apply to All Buttons
                        </Button>
                      </div>
                    </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
};















  