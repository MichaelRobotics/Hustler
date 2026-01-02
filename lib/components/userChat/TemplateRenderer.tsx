"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Sun, Moon } from 'lucide-react';
import UserChat from './UserChat';
import type { FunnelFlow } from '../../types/funnel';
import type { ConversationWithMessages } from '../../types/user';
import { getThemePlaceholderUrl } from '../store/SeasonalStore/utils/getThemePlaceholder';
import { filterProductsAgainstMarketStall } from '../store/SeasonalStore/utils/productUtils';
import { ProductCard } from '../store/SeasonalStore/components/ProductCard';
import { ProductPageModal } from '../store/SeasonalStore/components/ProductPageModal';
import { convertThemeToLegacy, getHoverRingClass, getGlowBgClass, getGlowBgStrongClass } from '../store/SeasonalStore/utils';
import type { LegacyTheme, Product } from '../store/SeasonalStore/types';
import { useTheme } from '../common/ThemeProvider';
import { TopNavbar } from '../store/SeasonalStore/components/TopNavbar';
import { createDefaultDiscountSettings, checkDiscountStatus, convertDiscountDataToSettings } from '../store/SeasonalStore/utils/discountHelpers';
import type { DiscountSettings } from '../store/SeasonalStore/types';
import type { DiscountData } from '../store/SeasonalStore/utils/discountHelpers';
import { apiPost } from '../../utils/api-client';
import { Button } from 'frosted-ui';

interface TemplateRendererProps {
  liveTemplate: any;
  onProductClick: () => void;
  onPromoClick: () => void;
  isMobile: boolean;
  isFunnelActive?: boolean;
  funnelFlow?: any;
  experienceId?: string;
  userName?: string;
  whopUserId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  conversationId?: string;
  conversation?: ConversationWithMessages;
  stageInfo?: {
    currentStage: string;
    isDMFunnelActive: boolean;
    isTransitionStage: boolean;
    isExperienceQualificationStage: boolean;
  };
  userType?: "admin" | "customer";
  onShowCustomerDashboard?: () => void;
  onPurchaseSuccess?: (planId: string) => void; // Callback for successful purchase (receives planId)
}

/**
 * TemplateRenderer Component
 * 
 * Renders live template content in CustomerView
 * Handles all template elements: background, logo, headers, products, promo button
 */
export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  liveTemplate,
  onProductClick,
  onPromoClick,
  isMobile,
  isFunnelActive = false,
  funnelFlow,
  experienceId,
  userName,
  whopUserId,
  onMessageSent,
  conversationId,
  conversation,
  stageInfo,
  userType = "customer",
  onShowCustomerDashboard,
  onPurchaseSuccess
}) => {
  const router = useRouter();
  const { appearance, toggleTheme } = useTheme();
  
  // Chat state management
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // ProductPageModal state
  const [productPageModal, setProductPageModal] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
  
  // Validated discount settings state (validated against database)
  const [validatedDiscountSettings, setValidatedDiscountSettings] = useState<DiscountSettings | null>(null);
  
  // Mobile detection
  const [isMobileDetected, setIsMobileDetected] = useState(false);
  
  // Product navigation state (like SeasonalStore ProductShowcase)
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const autoSwitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDetected(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  
  // Handle chat opening
  const handleChatOpen = () => {
    setIsChatOpen(true);
  };
  
  // Handle chat closing
  const handleChatClose = () => {
    setIsChatOpen(false);
  };
  
  // Handle ProductPageModal open/close
  const openProductPageModal = useCallback((product: Product) => {
    setProductPageModal({ isOpen: true, product });
  }, []);
  
  const closeProductPageModal = useCallback(() => {
    setProductPageModal({ isOpen: false, product: null });
  }, []);
  
  // Handle product purchase success
  const handleProductPurchaseSuccess = useCallback((planId: string) => {
    console.log('✅ [TemplateRenderer] Product purchase successful, planId:', planId);
    closeProductPageModal();
    if (onPurchaseSuccess) {
      onPurchaseSuccess(planId);
    }
  }, [onPurchaseSuccess, closeProductPageModal]);
  
  // Validate discount settings against database (same logic as usePreviewLiveTemplate)
  useEffect(() => {
    if (!liveTemplate || !liveTemplate.templateData || !experienceId) {
      setValidatedDiscountSettings(null);
      return;
    }

    const validateDiscountSettings = async () => {
      try {
        const templateData = liveTemplate.templateData || {};
        const templateDiscountSettings = templateData.discountSettings;

        // Fetch current discount from database
        let databaseDiscountData: DiscountData | null = null;
        try {
          const response = await apiPost(
            '/api/seasonal-discount/get',
            { experienceId },
            experienceId
          );
          if (response.ok) {
            const { discountData } = await response.json();
            databaseDiscountData = discountData || null;
          }
        } catch (error) {
          console.warn('⚠️ [TemplateRenderer] Error fetching discount from database:', error);
        }

        const discountStatus = checkDiscountStatus(databaseDiscountData);
        const isActiveOrApproaching = discountStatus === 'active' || discountStatus === 'approaching';

        // Case 1: Template HAS discountSettings
        if (templateDiscountSettings) {
          const templateSeasonalDiscountId = templateDiscountSettings.seasonalDiscountId;
          const databaseSeasonalDiscountId = databaseDiscountData?.seasonalDiscountId;

          // If promo is NON-EXISTENT or EXPIRED
          if (discountStatus === 'non-existent' || discountStatus === 'expired') {
            console.log('🧹 [TemplateRenderer] Removing discount settings - discount is non-existent or expired');
            setValidatedDiscountSettings(createDefaultDiscountSettings());
          }
          // If promo is ACTIVE/APPROACHING but different seasonal_discount_id
          else if (isActiveOrApproaching && databaseSeasonalDiscountId && templateSeasonalDiscountId !== databaseSeasonalDiscountId) {
            console.log('🔄 [TemplateRenderer] Updating discount settings - different active discount found');
            const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
            setValidatedDiscountSettings(newDiscountSettings);
          }
          // If promo is ACTIVE/APPROACHING and seasonal_discount_id MATCHES
          else if (isActiveOrApproaching && templateSeasonalDiscountId === databaseSeasonalDiscountId) {
            console.log('✅ [TemplateRenderer] Discount settings match active discount - using database discount');
            const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
            setValidatedDiscountSettings(newDiscountSettings);
          }
          // If template has discount but no seasonalDiscountId and database has active discount
          else if (!templateSeasonalDiscountId && isActiveOrApproaching && databaseSeasonalDiscountId) {
            console.log('🔄 [TemplateRenderer] Updating template discount - template has discount but no ID, database has active discount');
            const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
            setValidatedDiscountSettings(newDiscountSettings);
          }
          // Template has discount but database doesn't have active/approaching discount
          else {
            console.log('⚠️ [TemplateRenderer] Template has discount but database discount is not active/approaching');
            // Still use database discount data if available to ensure globalDiscount is correct
            if (databaseDiscountData) {
              const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
              setValidatedDiscountSettings(newDiscountSettings);
            } else {
              // Use template settings
              setValidatedDiscountSettings(templateDiscountSettings);
            }
          }
        }
        // Case 2: Template DOESN'T have discountSettings
        else {
          // If discount is ACTIVE/APPROACHING
          if (isActiveOrApproaching && databaseDiscountData) {
            console.log('✅ [TemplateRenderer] Applying active discount from database');
            const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
            setValidatedDiscountSettings(newDiscountSettings);
          }
          // If discount is NOT active/approaching - use default
          else {
            setValidatedDiscountSettings(createDefaultDiscountSettings());
          }
        }
      } catch (error) {
        console.warn('⚠️ [TemplateRenderer] Error validating discount, keeping template settings:', error);
        // Fallback to template settings if validation fails
        const templateData = liveTemplate.templateData || {};
        setValidatedDiscountSettings(templateData.discountSettings || createDefaultDiscountSettings());
      }
    };

    validateDiscountSettings();
  }, [liveTemplate, experienceId]);
  
  if (!liveTemplate || !liveTemplate.templateData) {
    return null;
  }

  const { templateData, currentSeason } = liveTemplate;

  // Debug logging
  console.log('[TemplateRenderer] Live template data:', {
    currentSeason,
    templateData: templateData,
    themeTextStyles: templateData.themeTextStyles,
    themeProducts: templateData.themeProducts,
    products: templateData.products,
    fixedTextStyles: templateData.fixedTextStyles,
    promoButton: templateData.promoButton,
    currentTheme: templateData.currentTheme,
    themeSnapshot: liveTemplate.themeSnapshot,
    customThemeMetadata: {
      mainHeader: templateData.currentTheme?.mainHeader || liveTemplate.themeSnapshot?.mainHeader,
      subHeader: templateData.currentTheme?.subHeader || liveTemplate.themeSnapshot?.subHeader,
      placeholderImage: templateData.currentTheme?.placeholderImage || liveTemplate.themeSnapshot?.placeholderImage
    }
  });

  // Get background image - check all sources in priority order:
  // 1. Theme-specific backgrounds (for custom themes)
  // 2. WHOP attachment URL
  // 3. Legacy backgrounds
  // 4. Custom theme placeholderImage (from currentTheme or themeSnapshot)
  // Do NOT use default Whop template placeholder if custom theme has placeholderImage
  let backgroundImage = templateData.themeGeneratedBackgrounds?.[currentSeason] 
    || templateData.themeUploadedBackgrounds?.[currentSeason]
    || templateData.backgroundAttachmentUrl
    || templateData.generatedBackground
    || templateData.uploadedBackground
    || null;
  
  // If no background image, check custom theme placeholderImage
  // Only fall back to default Whop template if no custom theme placeholder exists
  if (!backgroundImage) {
    // Check custom theme placeholderImage from currentTheme or themeSnapshot
    const customThemePlaceholder = templateData.currentTheme?.placeholderImage 
      || liveTemplate.themeSnapshot?.placeholderImage 
      || null;
    
    if (customThemePlaceholder) {
      backgroundImage = customThemePlaceholder;
      console.log('[TemplateRenderer] Using custom theme placeholderImage:', customThemePlaceholder);
    } else {
      // Only use default Whop template placeholder if no custom theme placeholder exists
      // Get theme name from template (check currentTheme or themeSnapshot)
      const themeName = templateData.currentTheme?.name || liveTemplate.themeSnapshot?.name || currentSeason;
      
      // Import and use getThemePlaceholderUrl function
      // Use helper function instead of inline map
      backgroundImage = getThemePlaceholderUrl(themeName) || getThemePlaceholderUrl(currentSeason);
      console.log('[TemplateRenderer] No custom theme background found, using default theme placeholder for:', themeName, 'fallback season:', currentSeason);
    }
  } else {
    console.log('[TemplateRenderer] Using background from template:', backgroundImage);
  }

  // Get logo - check both theme-specific and legacy
  const logoAsset = templateData.themeLogos?.[currentSeason] || templateData.logoAsset;
  
  console.log('[TemplateRenderer] Logo asset:', {
    logoAsset,
    hasSrc: !!logoAsset?.src,
    shape: logoAsset?.shape,
    themeLogos: templateData.themeLogos,
    legacyLogo: templateData.logoAsset
  });

  // Get theme snapshot for styling fallbacks (needed for product filtering and text styles)
  const themeSnapshot = liveTemplate.themeSnapshot || templateData.currentTheme || {};
  const currentTheme = templateData.currentTheme || liveTemplate.themeSnapshot || {};

  // Get text styles - check both theme-specific and legacy
  // Also check custom theme mainHeader/subHeader from currentTheme or themeSnapshot if not in textStyles
  let textStyles = templateData.themeTextStyles?.[currentSeason] || templateData.fixedTextStyles || {};
  
  // If textStyles are missing mainHeader/subHeader, try to restore from custom theme metadata
  if (!textStyles.mainHeader && (currentTheme.mainHeader || themeSnapshot.mainHeader)) {
    const mainHeaderText = currentTheme.mainHeader || themeSnapshot.mainHeader || '';
    const textColor = 'rgb(255, 237, 213)'; // Default text color
    textStyles = {
      ...textStyles,
      mainHeader: {
        content: mainHeaderText,
        color: textColor,
        styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg'
      },
      headerMessage: {
        content: mainHeaderText,
        color: textColor,
        styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
      }
    };
    console.log('[TemplateRenderer] Restored mainHeader from custom theme:', mainHeaderText);
  }
  
  if (!textStyles.subHeader && (currentTheme.subHeader || themeSnapshot.subHeader || currentTheme.aiMessage)) {
    const subHeaderText = currentTheme.subHeader || themeSnapshot.subHeader || currentTheme.aiMessage || '';
    const textColor = textStyles.mainHeader?.color || textStyles.headerMessage?.color || 'rgb(255, 237, 213)';
    textStyles = {
      ...textStyles,
      subHeader: {
        content: subHeaderText,
        color: textColor,
        styleClass: 'text-lg sm:text-xl font-normal'
      }
    };
    console.log('[TemplateRenderer] Restored subHeader from custom theme:', subHeaderText);
  }

  // State for filtered products (filtered against Market Stall like Preview)
  const [products, setProducts] = useState<any[]>([]);
  const [isFilteringProducts, setIsFilteringProducts] = useState(true);

  // Filter products against Market Stall resources (same as Preview)
  useEffect(() => {
    const filterProducts = async () => {
      setIsFilteringProducts(true);
      try {
        // Get raw products from template
        const rawProducts = templateData.themeProducts?.[currentSeason] || templateData.products || [];
        
        if (rawProducts.length === 0) {
          setProducts([]);
          setIsFilteringProducts(false);
          return;
        }

        // Fetch Market Stall resources if experienceId is available
        let marketStallResources: any[] = [];
        if (experienceId) {
          try {
            const response = await fetch(`/api/resources?experienceId=${experienceId}`);
            if (response.ok) {
              const data = await response.json();
              marketStallResources = data.data?.resources || [];
            }
          } catch (error) {
            console.error('[TemplateRenderer] Error fetching Market Stall resources:', error);
          }
        }

        // Filter products against Market Stall (same logic as Preview)
        if (marketStallResources.length > 0) {
          console.log(`[TemplateRenderer] Filtering ${rawProducts.length} template products against ${marketStallResources.length} Market Stall resources`);
          // Get theme from template for filtering (same as Preview)
          const theme = templateData.currentTheme || liveTemplate.themeSnapshot || null;
          const filteredProducts = await filterProductsAgainstMarketStall(rawProducts, marketStallResources, theme);
          setProducts(filteredProducts);
          console.log(`[TemplateRenderer] Filtered to ${filteredProducts.length} products`);
        } else {
          // No Market Stall resources - use raw products with styling fallbacks
          console.log('[TemplateRenderer] No Market Stall resources found, using raw template products');
          const styledProducts = rawProducts.map((p: any) => ({
            ...p,
            // Ensure imageAttachmentUrl fallback for ProductCard image logic
            imageAttachmentUrl: p.imageAttachmentUrl || p.image || p.imageUrl || p.imageSrc || null,
            // Styling fallbacks derived from theme snapshot when missing
            cardClass: p.cardClass || themeSnapshot.card || 'bg-white',
            titleClass: p.titleClass || themeSnapshot.text || 'text-gray-900',
            descClass: p.descClass || themeSnapshot.text || 'text-gray-600',
            buttonClass: p.buttonClass || 'bg-indigo-500 hover:bg-indigo-600 text-white',
            buttonText: p.buttonText || 'View Details',
          }));
          setProducts(styledProducts);
        }
      } catch (error) {
        console.error('[TemplateRenderer] Error filtering products:', error);
        // Fallback to raw products on error
        const rawProducts = templateData.themeProducts?.[currentSeason] || templateData.products || [];
        setProducts(rawProducts);
      } finally {
        setIsFilteringProducts(false);
      }
    };

    filterProducts();
  }, [templateData, currentSeason, experienceId, liveTemplate.themeSnapshot, themeSnapshot]);

  // Floating assets (emojis, tickets, etc.) - theme-specific or legacy
  const floatingAssets = (templateData.themeFloatingAssets?.[currentSeason] || templateData.floatingAssets || []) as any[];

  // Get promo button
  const promoButton = templateData.promoButton;

  // Product navigation functions (like SeasonalStore ProductShowcase - fade animations)
  const navigateToPrevious = useCallback((skipSlideAnimation?: boolean) => {
    if (isNavigating) return;
    if (currentProductIndex === 0) return;
    
    setIsNavigating(true);
    setIsFadingOut(true);
    
    // After fade out completes, change products and wait for render
    setTimeout(() => {
      setCurrentProductIndex(prev => Math.max(0, prev - 1));
      // Use requestAnimationFrame to ensure products are rendered before fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsFadingOut(false); // This will trigger fade in
          setIsNavigating(false);
        });
      });
    }, 300);
  }, [currentProductIndex, isNavigating]);

  const navigateToNext = useCallback((skipSlideAnimation?: boolean) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    setIsFadingOut(true);
    
    // After fade out completes, change products and wait for render
    setTimeout(() => {
      // Switch products first (handles wrap-around)
      setCurrentProductIndex(prev => {
        const maxIndex = products.length - 2;
        return prev >= maxIndex ? 0 : prev + 1;
      });
      // Use requestAnimationFrame to ensure products are rendered before fade in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsFadingOut(false); // This will trigger fade in
          setIsNavigating(false);
        });
      });
    }, 300);
  }, [currentProductIndex, products.length, isNavigating]);

  // Auto-switch products with fade animation (same as ProductShowcase)
  useEffect(() => {
    if (autoSwitchIntervalRef.current) {
      clearInterval(autoSwitchIntervalRef.current);
    }
    
    if (products.length <= 2) return;
    if (isNavigating) return;
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const switchTimeout = isMobile ? 3000 : 5000;
    
    autoSwitchIntervalRef.current = setInterval(() => {
      // Only auto-switch if not currently navigating
      if (!isNavigating) {
        // Use the same fade animation as manual navigation
        setIsNavigating(true);
        setIsFadingOut(true);
        
        // After fade out completes, change products and wait for render
        setTimeout(() => {
          // Switch products first (handles wrap-around)
          setCurrentProductIndex(prev => {
            const maxIndex = products.length - 2;
            return prev >= maxIndex ? 0 : prev + 1;
          });
          // Use requestAnimationFrame to ensure products are rendered before fade in
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsFadingOut(false); // This will trigger fade in
              setIsNavigating(false);
            });
          });
        }, 300);
      }
    }, switchTimeout);
    
    return () => {
      if (autoSwitchIntervalRef.current) {
        clearInterval(autoSwitchIntervalRef.current);
      }
    };
  }, [products.length, isNavigating, currentProductIndex]);

  // Touch swipe handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentProductIndex < products.length - 2) {
      navigateToNext();
    }
    if (isRightSwipe && currentProductIndex > 0) {
      navigateToPrevious();
    }
    
    // Reset touch values
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, currentProductIndex, products.length, navigateToNext, navigateToPrevious]);

  // Reset index when products change
  useEffect(() => {
    if (currentProductIndex >= products.length - 1) {
      setCurrentProductIndex(0);
    }
  }, [products.length, currentProductIndex]);

  console.log('[TemplateRenderer] Processed data:', {
    backgroundImage,
    logoAsset,
    textStyles,
    products: products.length,
    promoButton
  });

  return (
    <>
      <style jsx>{`
        @keyframes productFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes productFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes productLoadingAnimation {
          0% { opacity: 0; transform: translateY(1rem); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .product-fade-out {
          animation: productFadeOut 0.3s ease-in-out forwards;
        }
        .product-fade-in {
          animation: productFadeIn 0.3s ease-in-out forwards;
        }
        .product-navigating {
          pointer-events: none;
        }
        .product-loading-animation {
          animation: productLoadingAnimation 0.5s ease-out forwards;
        }
      `}</style>
      <div className="w-full h-full relative">
        {/* Template Background - Full page coverage */}
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat fixed inset-0"
          style={{
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined
          }}
        />
      
      {/* TopNavbar - Using SeasonalStore TopNavbar */}
      {(() => {
        // Extract template data for TopNavbar
        const promoButton = templateData.promoButton || {
          text: "CLAIM YOUR GIFT!",
          buttonClass: "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600",
          ringClass: "ring-yellow-400",
          ringHoverClass: "ring-yellow-500",
          icon: "gift"
        };

        // Use validated discountSettings if available, otherwise use template discountSettings or default
        const discountSettings = validatedDiscountSettings || templateData.discountSettings || createDefaultDiscountSettings();

        const allThemes = {}; // Empty for now, can be populated if needed
        
        // Get legacyTheme from templateData.currentTheme or themeSnapshot
        const legacyTheme = templateData.currentTheme || liveTemplate.themeSnapshot || {
          accent: "bg-indigo-500",
          card: "bg-white/95 backdrop-blur-sm shadow-xl",
          text: "text-gray-800"
        };

        return (
          <TopNavbar
            editorState={{ isEditorView: false }}
            showGenerateBgInNavbar={false}
            isChatOpen={isChatOpen}
            isGeneratingBackground={false}
            loadingState={{ isImageLoading: false }}
            promoButton={promoButton}
            currentSeason={currentSeason}
            allThemes={allThemes}
            legacyTheme={legacyTheme}
            previewLiveTemplate={liveTemplate}
            hideEditorButtons={true}
            isStorePreview={true}
            discountSettings={discountSettings}
            toggleEditorView={() => {}}
            handleGenerateBgClick={() => {}}
            handleBgImageUpload={() => {}}
            handleSaveTemplate={() => {}}
            toggleAdminSheet={() => {}}
            openTemplateManager={() => {}}
            handleAddProduct={() => {}}
            setIsChatOpen={setIsChatOpen}
            setCurrentSeason={() => {}}
            getHoverRingClass={getHoverRingClass}
            getGlowBgClass={getGlowBgClass}
            getGlowBgStrongClass={getGlowBgStrongClass}
            rightSideContent={
              (userType === "customer" || userType === "admin") ? (
                <Button
                  size="3"
                  color="violet"
                  variant="surface"
                  onClick={() => {
                    if (onShowCustomerDashboard) {
                      onShowCustomerDashboard();
                    }
                  }}
                  className="px-3 sm:px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
                  title="View Memberships & Files"
                >
                  <User size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
                  <span className="ml-1 hidden sm:inline">Membership</span>
                </Button>
              ) : undefined
            }
          />
        );
      })()}
      
      {/* Template Content Container */}
      <div className="relative z-30 flex flex-col items-center pt-1 pb-8 px-3 sm:px-6 max-w-7xl mx-auto transition-all duration-500 overflow-y-auto overflow-x-hidden h-full w-full">
        {/* Floating assets layer (emojis/images) - above product cards */}
        {floatingAssets && floatingAssets.length > 0 && (
          <div className="pointer-events-none absolute inset-0 z-20">
            {floatingAssets.map((asset: any) => (
              <div
                key={asset.id}
                style={{
                  position: 'absolute',
                  left: asset.x,
                  top: asset.y,
                  transform: `translate(-50%, -50%) rotate(${
                    typeof asset.rotation === 'string'
                      ? (asset.rotation.endsWith('deg') ? asset.rotation : `${asset.rotation}deg`)
                      : `${asset.rotation || 0}deg`
                  }) scale(${asset.scale ?? 1})`,
                  zIndex: typeof asset.z === 'number' ? asset.z : 1,
                }}
              >
                {asset.type === 'text' && asset.content ? (
                  <span className={asset.styleClass || ''} style={{ fontSize: '2rem', lineHeight: 1 }}>
                    {asset.content}
                  </span>
                ) : asset.type === 'image' && asset.src ? (
                  <img
                    src={asset.src}
                    alt={asset.alt || ''}
                    className={asset.styleClass || ''}
                    style={{ width: asset.isLogo ? '150px' : '100px', height: 'auto' }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
        {/* Template Content */}
        <div className="relative z-10 w-full">
        {/* Logo */}
        {(logoAsset?.src || logoAsset) && (
          <div className="w-full max-w-5xl mx-auto mb-4 pt-2">
            <div className={`w-24 h-24 mx-auto overflow-hidden ${(logoAsset?.shape || 'square') === 'round' ? 'rounded-full' : 'rounded-3xl'}`}>
              <div 
                className={`w-full h-full ${(logoAsset?.shape || 'square') === 'round' ? 'rounded-full' : 'rounded-3xl'}`}
                style={{
                  backgroundImage: `url(${logoAsset?.src || logoAsset})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Header Message - matches StoreHeader exactly (non-editor view) */}
        {textStyles.headerMessage && textStyles.headerMessage.content && (
          <div className="text-center mb-2 relative w-full">
            <p 
              className={`${textStyles.headerMessage.styleClass || 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'} font-bold`}
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                maxWidth: '48rem',
                marginLeft: 'auto',
                marginRight: 'auto',
                color: textStyles.headerMessage.color || '#FFFFFF',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              }}
              data-prevent-bg-toggle="true"
              dangerouslySetInnerHTML={{ __html: textStyles.headerMessage.content || '' }}
            />
          </div>
        )}
        
        {/* Sub Header - matches StoreHeader exactly (non-editor view) */}
        {textStyles.subHeader && textStyles.subHeader.content && (
          <div className="text-center mb-2 relative w-full">
            <p 
              className={`${textStyles.subHeader.styleClass || 'text-lg sm:text-xl font-normal'}`}
              style={{ 
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                maxWidth: '48rem',
                marginLeft: 'auto',
                marginRight: 'auto',
                color: textStyles.subHeader.color || '#FFFFFF',
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              }}
              data-prevent-bg-toggle="true"
              dangerouslySetInnerHTML={{ __html: textStyles.subHeader.content || '' }}
            />
          </div>
        )}
        
          {/* Products Grid - matches SeasonalStore exactly */}
          {products.length > 0 && (
            <div className="w-full max-w-5xl my-4 mx-auto">
              <div className="flex items-center gap-4">
                {/* Left Arrow - Only show on desktop when there are more than 2 products */}
                {products.length > 2 && (
                  <button
                    onClick={() => navigateToPrevious()}
                    disabled={currentProductIndex === 0 || isNavigating}
                    className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
                    title="Previous products"
                  >
                    <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                
                {/* Product Grid - Show 1 product on mobile, 2 on desktop with fade animation (like ProductShowcase) */}
                <div 
                  className={`flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto overflow-hidden w-full ${
                    isNavigating ? 'product-navigating' : 
                    isFadingOut ? 'product-fade-out' : 'product-fade-in'
                  }`}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {products.slice(currentProductIndex, currentProductIndex + 2).map((product: any, index: number) => (
                    <div 
                      key={`${product.id}-${currentProductIndex}-${index}`}
                      className={`${
                        isNavigating ? 'product-navigating' :
                        !isFilteringProducts && !isNavigating
                          ? 'product-loading-animation'
                          : !isFilteringProducts
                          ? 'opacity-0 translate-y-8'
                          : ''
                      } ${index === 1 ? 'hidden md:block' : ''}`}
                      style={{ 
                        animationDelay: !isFilteringProducts && !isNavigating ? `${index * 100}ms` : '0ms',
                        transform: swipeDirection === 'left' 
                          ? 'translateX(100%)' 
                          : swipeDirection === 'right'
                          ? 'translateX(-100%)'
                          : 'translateX(0%)',
                        opacity: swipeDirection === 'left' || swipeDirection === 'right' ? 0 : undefined,
                        transitionDelay: swipeDirection ? `${index * 40}ms` : '0ms'
                      }}
                    >
                    <ProductCard
                      product={product}
                      theme={convertThemeToLegacy(themeSnapshot) as LegacyTheme}
                      isEditorView={false}
                      loadingState={{
                        isTextLoading: false,
                        isImageLoading: false,
                        isUploadingImage: false,
                        isGeneratingImage: false,
                      }}
                      onUpdateProduct={() => {}}
                      onDeleteProduct={() => {}}
                      onProductImageUpload={() => {}}
                      onRefineProduct={() => {}}
                      onRemoveSticker={() => {}}
                      onDropAsset={() => {}}
                      onOpenEditor={() => {}}
                      onOpenProductPage={product.type === 'FILE' ? () => openProductPageModal(product) : undefined}
                      storeName=""
                      experienceId={experienceId}
                    />
                    </div>
                  ))}
                </div>
                
                {/* Right Arrow - Only show on desktop when there are more than 2 products */}
                {products.length > 2 && (
                  <button
                    onClick={() => navigateToNext()}
                    disabled={currentProductIndex >= products.length - 2 || isNavigating}
                    className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
                    title="Next products"
                  >
                    <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Navigation Dots - Only show on mobile when there are multiple products */}
              {products.length > 1 && (
                <div className="flex justify-center mt-4 space-x-2 md:hidden">
                  {Array.from({ length: Math.max(1, products.length - 1) }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (index !== currentProductIndex) {
                          if (index > currentProductIndex) {
                            navigateToNext();
                          } else {
                            navigateToPrevious();
                          }
                        }
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentProductIndex
                          ? 'bg-white scale-125'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        
        {/* PromoButton Component - Only show when funnel is active - matches SeasonalStore exactly */}
        {isFunnelActive && (
          <div className="w-full max-w-3xl my-1 text-center mx-auto">
            {/* Claim Button */}
            {promoButton && (
              <div className="relative w-full">
                <button
                  onClick={handleChatOpen}
                  className={`group relative z-10 flex items-center justify-center w-full py-4 text-xl rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ${promoButton.ringClass || 'ring-white/30 hover:ring-slate-400'} ${promoButton.buttonClass || 'bg-rose-600 hover:bg-rose-700 text-white'} shadow-2xl`}
                >
                  {promoButton.icon && (
                    <span className="mr-3 text-2xl animate-pulse">
                      {promoButton.icon}
                    </span>
                  )}
                  {promoButton.text || 'Claim Now'}
                </button>
                {/* Below-button glow (positioned vertically lower than the button) */}
                <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-6 w-full max-w-[110%] h-10 opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500 ${promoButton.ringHoverClass || 'bg-slate-400/40'}`}></span>
                <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-4 w-full max-w-[90%] h-8 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-500 ${promoButton.ringHoverClass || 'bg-slate-400/60'}`}></span>
              </div>
            )}
          </div>
        )}
        
        {/* Bottom padding to ensure content is never at the bottom */}
        <div className="h-20"></div>
        </div>
      </div>
      
      {/* Chat Resizing System - matches SeasonalStore exactly */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-white/40 dark:bg-black/40 backdrop-blur-md text-gray-900 dark:text-gray-100 shadow-2xl border-t border-b-0 border-white/20 dark:border-gray-700/20 transition-all duration-300 ease-in-out transform ${
        isChatOpen 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      }`}>
        <div className={`w-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          isChatOpen 
            ? isMobileDetected ? 'max-h-[100vh] opacity-100' : 'max-h-[50vh] opacity-100'
            : 'max-h-0 opacity-0'
        }`} style={{ 
          height: isChatOpen ? (isMobileDetected ? '100vh' : '50vh') : '0vh', 
          maxHeight: isChatOpen ? (isMobileDetected ? '100vh' : '50vh') : '0vh' 
        }}>
          {/* Beautiful Golden Separator Line */}
          <div className="absolute top-0 left-0 right-0 z-20">
            {/* Main golden line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 via-amber-500 to-transparent shadow-lg shadow-yellow-500/30"></div>
            {/* Subtle glow effect */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-300 via-amber-400 to-transparent opacity-60 blur-sm"></div>
            {/* Animated shimmer effect */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
          </div>
          <div className="flex-1 overflow-hidden relative border-t border-yellow-500/20" style={{ height: '100%', maxHeight: '100%' }}>
            {funnelFlow && isFunnelActive ? (
              <UserChat
                funnelFlow={funnelFlow}
                conversationId={conversationId}
                conversation={conversation}
                experienceId={experienceId}
                onMessageSent={onMessageSent}
                userType={userType}
                stageInfo={stageInfo}
                onBack={handleChatClose}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-sm">
                <div className="text-center max-w-md mx-auto p-6">
                  <div className="w-16 h-16 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Live Funnel</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    There's no active funnel to chat with right now.
                  </p>
                  
                  <button
                    onClick={handleChatClose}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
      
      {/* ProductPageModal */}
      {productPageModal.product && (
        <ProductPageModal
          isOpen={productPageModal.isOpen}
          onClose={closeProductPageModal}
          product={productPageModal.product}
          theme={convertThemeToLegacy(themeSnapshot) as LegacyTheme}
          storeName=""
          experienceId={experienceId}
          disableImageEditing={true}
          checkoutConfigurationId={productPageModal.product.checkoutConfigurationId}
          planId={productPageModal.product.planId}
          onPurchaseSuccess={handleProductPurchaseSuccess}
        />
      )}
    </>
  );
};
