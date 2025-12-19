"use client";

import React, { useRef, useCallback, useEffect, useState, useMemo, startTransition } from 'react';
import { useSeasonalStoreDatabase } from './hooks/useSeasonalStoreDatabase';
import { useElementHeight } from '@/lib/hooks/useElementHeight';
import { useTheme } from '../../common/ThemeProvider';
import AIFunnelBuilderPage from '../../funnelBuilder/AIFunnelBuilderPage';
import { FloatingAsset as FloatingAssetType, FixedTextStyles, LegacyTheme, Product } from './types';
import { FloatingAsset } from './components/FloatingAsset';
import { AdminAssetSheet } from './components/AdminAssetSheet';
import { TopNavbar } from './components/TopNavbar';
import { LoadingScreen } from './components/LoadingScreen';
import { ProductShowcase } from './components/ProductShowcase';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { Notifications } from './components/Notifications';
import { PromoButton } from './components/PromoButton';
import { ProductEditorModal } from './components/ProductEditorModal';
import { TextEditorModal } from './components/TextEditorModal';
import { ProductPageModal } from './components/ProductPageModal';
import { LogoSection } from './components/LogoSection';
import { StoreResourceLibrary } from '../../products/StoreResourceLibrary';
import { StoreHeader } from './components/StoreHeader';
import { ConditionalReturns } from './components/ConditionalReturns';
import { 
  PresentIcon, 
  XIcon, 
  MessageCircleIcon, 
  ZapIcon, 
  AlertTriangleIcon, 
  SettingsIcon, 
  PlusCircleIcon, 
  EyeIcon, 
  EditIcon,
  TrashIcon
} from './components/Icons';
// AI service functions are now handled by useAIGeneration hook
import { uploadUrlToWhop } from '../../../utils/whop-image-upload';
import { useIframeDimensions } from './utils/iframeDimensions';
import { useBackgroundAnalysis } from './utils/backgroundAnalyzer';
import { useThemeUtils } from './hooks/useThemeUtils';
import { useProductNavigation } from './hooks/useProductNavigation';
import { useAIGeneration } from './hooks/useAIGeneration';
import { useProductImageUpload } from './hooks/useProductImageUpload';
import { useTemplateSave } from './hooks/useTemplateSave';
import { usePreviewLiveTemplate } from './hooks/usePreviewLiveTemplate';
import { useMarketStallOrderSnapshot } from './hooks/useMarketStallOrderSnapshot';
import { useAutoAddResources } from './hooks/useAutoAddResources';
import { useClickOutside } from './hooks/useClickOutside';
import { useStoreSnapshot } from './hooks/useStoreSnapshot';
import { useThemeApplication } from './hooks/useThemeApplication';
import { checkDiscountStatus, DiscountData } from './utils/discountHelpers';
import { apiPost } from '@/lib/utils/api-client';
import { useLiveFunnel } from './hooks/useLiveFunnel';
import { usePreviewMode } from './hooks/usePreviewMode';
import { useModalAnimation } from './hooks/useModalAnimation';
import { useNotifications } from './hooks/useNotifications';
import { useProductHandlers } from './hooks/useProductHandlers';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useResourceLibraryProducts } from './hooks/useResourceLibraryProducts';
import { useTemplateManager } from './hooks/useTemplateManager';
import { useStateRestoration } from './hooks/useStateRestoration';
import { useSeasonalDiscountActions } from './hooks/useSeasonalDiscountActions';
import { convertThemeToLegacy, truncateDescription } from './utils';
import { applyThemeStylesToProducts, convertResourcesToProducts } from './utils/productUtils';
import { getBackgroundStyle as getBackgroundStyleUtil } from './utils/getThemePlaceholder';
import { handleUpdateTheme as handleUpdateThemeUtil } from './utils/themeUpdate';
import SeasonalStoreChat from './components/SeasonalStoreChat';
import { apiGet } from '../../../utils/api-client';
import type { FunnelFlow } from '../../../types/funnel';
import type { AuthenticatedUser } from '../../../types/user';
import { deleteTheme as deleteThemeAction } from '../../../actions/themes-actions';

import type { UpdateSyncResult } from '../../../sync/update-product-sync';
import type { Resource } from '@/lib/types/resource';

interface UpdateSyncProps {
  isChecking: boolean;
  syncResult: UpdateSyncResult | null;
  showPopup: boolean;
  error: string | null;
  hasCheckedOnce: boolean;
  checkForUpdates: () => Promise<UpdateSyncResult | null | undefined>;
  applyChanges: () => Promise<any>;
  closePopup: () => void;
  resetState?: () => void; // Optional reset function
  onSyncComplete?: () => void; // Callback to refresh resources after sync
}

interface SeasonalStoreProps {
  onBack?: () => void;
  user?: AuthenticatedUser | null; // Changed from experienceId to full user object
  allResources?: any[];
  setAllResources?: (resources: any[]) => void;
  previewLiveTemplate?: any;
  hideEditorButtons?: boolean;
  onTemplateLoaded?: () => void; // Callback when template is fully loaded on frontend
  isStorePreview?: boolean; // Indicates if this SeasonalStore is being used in StorePreview context
  isActive?: boolean; // Indicates if this SeasonalStore is currently the active view
  updateSyncProps?: UpdateSyncProps; // Optional update sync props from AdminPanel
}

export const SeasonalStore: React.FC<SeasonalStoreProps> = ({ onBack, user, allResources = [], setAllResources = () => {}, previewLiveTemplate, hideEditorButtons = false, onTemplateLoaded, isStorePreview = false, isActive = false, updateSyncProps }) => {
  // Extract experienceId from user object
  const experienceId = user?.experienceId;
  
  // Theme functionality
  const { appearance, toggleTheme } = useTheme();
  
  // Track iframe container dimensions for responsive background generation
  const iframeDimensions = useIframeDimensions();
  
  // Flag to prevent multiple simultaneous background generations
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const isGeneratingRef = useRef(false);
  
  // State to highlight save button after background generation
  const [highlightSaveButton, setHighlightSaveButton] = useState(false);
  
  // Chat functionality
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // FunnelBuilder view state
  const [showFunnelBuilder, setShowFunnelBuilder] = useState(false);
  
  // Store ResourceLibrary state
  const [showStoreResourceLibrary, setShowStoreResourceLibrary] = useState(false);
  
  // Use live funnel hook
  const {
    funnelFlow,
    liveFunnel,
    isFunnelActive,
    isFunnelCheckComplete,
  } = useLiveFunnel({ experienceId });
  
  // Preview mode state (will be synced from usePreviewMode hook)
  const [isInPreviewModeLocal, setIsInPreviewModeLocal] = useState(false);
  const [previewTemplateLocal, setPreviewTemplateLocal] = useState<any>(null);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  
  // Track deleted ResourceLibrary products (template-based, not theme-based)
  const [deletedResourceLibraryProducts, setDeletedResourceLibraryProducts] = useState<Set<string>>(new Set());
  
  // Update sync functionality - ONLY use props from AdminPanel (no local hook)
  const {
    isChecking: isCheckingUpdates,
    syncResult,
    showPopup: showSyncPopup,
    error: syncError,
    hasCheckedOnce,
    checkForUpdates,
    applyChanges,
    closePopup: closeSyncPopup,
    resetState: resetUpdateSyncState,
  } = updateSyncProps || {
    isChecking: false,
    syncResult: null,
    showPopup: false,
    error: null,
    hasCheckedOnce: false,
    checkForUpdates: async () => null,
    applyChanges: async () => {},
    closePopup: () => {},
    resetState: () => {},
  };
  
  // State for sync applying
  const [isApplyingSync, setIsApplyingSync] = useState(false);
  
  
  // Sync handlers
  const handleApplyChanges = async () => {
    setIsApplyingSync(true);
    try {
      await applyChanges();
    } catch (error) {
      console.error('Error applying sync changes:', error);
    } finally {
      setIsApplyingSync(false);
    }
  };

  const handleSyncSuccess = () => {
    // Reset ResourceLibrary context by refreshing resources
    if (updateSyncProps?.onSyncComplete) {
      updateSyncProps.onSyncComplete();
    }
    console.log('🔄 ResourceLibrary context reset after successful sync');
  };
  
  // Load products from theme when theme changes (initial load from DB) - moved after database hook
  
  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Show notification when no funnel is live (only after funnel check is complete)
  useEffect(() => {
    if (isFunnelCheckComplete && (!funnelFlow || !isFunnelActive)) {
      setShowNotification(true);
      
      // Auto-hide notification after 7 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 7000);
    }
  }, [isFunnelCheckComplete, funnelFlow, isFunnelActive]);

  
  const {
    // State
    allThemes,
    setAllThemes,
    themes,
    currentSeason,
    theme,
    products,
    floatingAssets,
    availableAssets,
    fixedTextStyles,
    logoAsset,
    generatedBackground,
    uploadedBackground,
    backgroundAttachmentId,
    backgroundAttachmentUrl,
    logoAttachmentId,
    logoAttachmentUrl,
    editorState,
    loadingState,
    apiError,
    templates,
    liveTemplate,
    currentlyLoadedTemplateId,
    discountSettings,
    setDiscountSettings,
    
    // Actions
    setCurrentSeason,
    setAvailableAssets,
    setFixedTextStyles,
    setLogoAsset,
    setBackground,
    setBackgroundAttachmentId,
    setBackgroundAttachmentUrl,
    setLogoAttachmentId,
    setLogoAttachmentUrl,
    setProducts: setProductsFromHook,
    setError,
    
    // Product Management - REMOVED (frontend-only now)
    
    // Asset Management
    addFloatingAsset,
    updateFloatingAsset,
    deleteFloatingAsset,
    setFloatingAssets,
    
    // Theme Management
    addCustomTheme,
    
    // Editor State
    toggleEditorView,
    toggleSheet,
    toggleAdminSheet,
    setSelectedAsset,
    
    // Loading State
    setTextLoading,
    setImageLoading,
    setUploadingImage,
    setGeneratingImage,
    
    // Template Management
    saveTemplate,
    loadTemplate: loadTemplateFromHook,
    deleteTemplate,
    setLiveTemplate,
    updateTemplate,
    setTemplates,
    updateCachedTemplates,
    
    // Theme Management
    createTheme,
    updateTheme,
    
    // Origin template
    originTemplate,
    loadOriginTemplate,
    
    // Promo button management
    promoButton: dbPromoButton,
    setPromoButton: setDbPromoButton,
    
    // Limit helpers
    canAddCustomTheme,
    canAddTemplate,
    MAX_CUSTOM_THEMES,
    MAX_CUSTOM_TEMPLATES,
    
    // Template ResourceLibrary product IDs
    templateResourceLibraryProductIds,
    setTemplateResourceLibraryProductIds,
    
    // Loading state
    isInitialLoadComplete,
    isStoreContentReady,
    isLoadingTemplate,
    
    // Store Navigation State Management
    lastActiveTheme,
    saveLastActiveTheme,
    lastEditedTemplate,
    
    // Theme loading
    loadThemes,
  } = useSeasonalStoreDatabase(experienceId || 'default-experience');
  
  // Create ref to store setProductsAndReorder for passing to hook
  const setProductsAndReorderRef = useRef<((products: Product[] | ((prev: Product[]) => Product[])) => void) | undefined>(undefined);
  
  // Calculate discount status for ProductCard components
  const [discountStatus, setDiscountStatus] = useState<'active' | 'approaching' | 'expired' | 'non-existent'>('non-existent');
  const [seasonalDiscountId, setSeasonalDiscountId] = useState<string | undefined>(undefined);
  const [currentDiscountPromoCode, setCurrentDiscountPromoCode] = useState<string | undefined>(undefined);
  
  // Fetch discount status from database
  useEffect(() => {
    const fetchDiscountStatus = async () => {
      if (!experienceId) return;
      
      try {
        const response = await apiPost(
          '/api/seasonal-discount/get',
          { experienceId },
          experienceId
        );
        if (response.ok) {
          const { discountData } = await response.json();
          const status = checkDiscountStatus(discountData);
          setDiscountStatus(status);
          setSeasonalDiscountId(discountData?.seasonalDiscountId);
          setCurrentDiscountPromoCode(discountData?.seasonalDiscountPromo);
        } else {
          setDiscountStatus('non-existent');
          setSeasonalDiscountId(undefined);
          setCurrentDiscountPromoCode(undefined);
        }
      } catch (error) {
        console.warn('⚠️ Error fetching discount status:', error);
        setDiscountStatus('non-existent');
        setSeasonalDiscountId(undefined);
        setCurrentDiscountPromoCode(undefined);
      }
    };
    
    fetchDiscountStatus();
    // Refresh discount status periodically (every 30 seconds) to catch approaching discounts becoming active
    const interval = setInterval(fetchDiscountStatus, 30000);
    return () => clearInterval(interval);
  }, [experienceId]);
  
  // Load origin template on mount
  useEffect(() => {
    if (experienceId && loadOriginTemplate) {
      loadOriginTemplate();
    }
  }, [experienceId, loadOriginTemplate]);

  // Auto-highlight save button after background generation completes
  useEffect(() => {
    if (!loadingState.isImageLoading && !loadingState.isGeneratingImage && !loadingState.isUploadingImage) {
      // Background generation just completed
      if (backgroundAttachmentUrl || generatedBackground) {
        console.log('🎨 Background generation completed - highlighting save button');
        setHighlightSaveButton(true);
        
        // Remove highlight after 10 seconds
        const timer = setTimeout(() => {
          setHighlightSaveButton(false);
          console.log('🎨 Save button highlight removed');
        }, 10000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [loadingState.isImageLoading, loadingState.isGeneratingImage, loadingState.isUploadingImage, backgroundAttachmentUrl, generatedBackground]);
  
  // Update sync is now handled entirely by AdminPanel - no local logic needed
  
  // Use products from the current template
  const combinedProducts = useMemo(() => [...products], [products]);

  // Check if resource is in current template
  const isResourceInTemplate = useCallback((resourceId: string) => {
    const productId = `resource-${resourceId}`;
    return products.some((p: any) => p.id === productId);
  }, [products]);
  
  // Product navigation state
  const [isSliding, setIsSliding] = useState(false);
  
  // Use product navigation hook
  const {
    currentProductIndex,
    setCurrentProductIndex,
    swipeDirection,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    navigateToPrevious,
    navigateToNext,
  } = useProductNavigation({ 
    products: combinedProducts, 
    isEditorView: editorState.isEditorView,
    isSliding,
    setIsSliding
  });
  
  // Use the utility function for theme conversion
  const convertThemeToLegacyCallback = useCallback((dbTheme: any): LegacyTheme => {
    return convertThemeToLegacy(dbTheme);
  }, []);
  
  // Convert current theme to legacy format for UI components
  // If theme is already a LegacyTheme (from initialThemes), use it directly
  // If theme is a database Theme, convert it to LegacyTheme
  const legacyTheme = theme && 'background' in theme ? theme : convertThemeToLegacy(theme);
  
  // Use ResourceLibrary products hook (must be before product handlers)
  const {
    resourceLibraryProducts,
    hasLoadedResourceLibrary,
    handleDeleteResourceLibraryProduct: handleDeleteResourceLibraryProductFromHook,
  } = useResourceLibraryProducts({
    experienceId,
    allResources,
    deletedResourceLibraryProducts,
    legacyTheme,
    products,
    setProducts: setProductsFromHook,
  });

  // Use product handlers hook
  const {
    addProduct,
    updateProduct,
    deleteProduct,
    handleAddToTemplate,
    handleRemoveFromTemplate,
  } = useProductHandlers({
    setProducts: setProductsFromHook,
    legacyTheme,
    handleDeleteResourceLibraryProduct: (productId: string) => {
      const resourceId = handleDeleteResourceLibraryProductFromHook(productId);
      setDeletedResourceLibraryProducts(prev => new Set([...prev, resourceId]));
    },
  });

  // Use theme utilities hook
  const {
    getThemeColors,
    getInitialStyleClass,
    applyThemeColorsToText,
    getHoverRingClass,
    getGlowBgClass,
    getGlowBgStrongClass,
    getThemeQuickColors,
  } = useThemeUtils(legacyTheme);

  // Use AI generation hook
  const {
    handleRefineAll,
    handleGenerateAssetFromText,
    handleGenerateBgClick,
    handleBgImageUpload,
    handleLogoGeneration,
    handleLogoImageUpload,
  } = useAIGeneration({
    theme,
    setTextLoading,
    setGeneratingImage,
    setImageLoading,
    setUploadingImage,
    setError,
    updateProduct,
    setAvailableAssets,
    setBackground,
    setBackgroundAttachmentId,
    setLogoAsset: (fn: (prev: any) => any) => {
      // Convert function call to direct assignment
      const result = fn(logoAsset);
      setLogoAsset(result);
    },
    setProducts: setProductsFromHook,
    currentSeason,
    backgroundAttachmentUrl: backgroundAttachmentUrl ?? undefined,
    generatedBackground: generatedBackground ?? undefined,
    uploadedBackground: uploadedBackground ?? undefined,
    isEditorView: editorState.isEditorView,
    logoAttachmentUrl: logoAttachmentUrl ?? undefined,
    iframeDimensions: iframeDimensions ?? undefined,
    toggleEditorView,
  });

  // Custom add product function that resets index to show new product at front
  const handleAddProduct = useCallback(() => {
    // Show StoreResourceLibrary instead of adding product directly
    setShowStoreResourceLibrary(true);
  }, []);

  // Get filtered paid resources
  const getFilteredPaidResources = useCallback(() => {
    if (!experienceId || allResources.length === 0) return [];
    return allResources.filter(resource => 
      resource.category === "PAID" && resource.name && resource.price
    );
  }, [experienceId, allResources]);

  // Store ResourceLibrary handlers will be declared after handleProductImageUpload

  // Product handlers are now managed by useProductHandlers hook


  // Analyze background brightness for dynamic text colors
  const backgroundAnalysis = useBackgroundAnalysis(generatedBackground);

  // REMOVED: Responsive background regeneration useEffect
  // This was causing continuous background generation
  // Backgrounds are now only generated on manual button click

  const appRef = useRef<HTMLDivElement>(null);
  const welcomeMessageRef = useRef<HTMLDivElement>(null);
  const sheetOffsetHeight = useElementHeight(welcomeMessageRef);

  // Simple Text Editing State
  const [editingText, setEditingText] = useState<{
    isOpen: boolean;
    targetId: string; // Changed to string to support productName-* and productDesc-*
  }>({
    isOpen: false,
    targetId: 'mainHeader'
  });









  // Use promo button state from database hook
  const promoButton = dbPromoButton;
  const setPromoButton = setDbPromoButton;

  // Use preview live template hook
  // Ref to track if initial reorder has been done for the current template load
  const initialReorderDoneRef = useRef(false);
  const lastTemplateIdRef = useRef<string | null>(null);

  // Helper function to reorder products array to match Market Stall order
  const reorderProductsArray = useCallback((productsToReorder: Product[]): Product[] => {
    if (!allResources.length || !productsToReorder.length) return productsToReorder;

    // Get Market Stall resources sorted by displayOrder
    const marketStallOrdered = allResources
      .filter((r) => r.category === 'PAID')
      .sort((a, b) => {
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          return a.displayOrder - b.displayOrder;
        }
        if (a.displayOrder !== undefined) return -1;
        if (b.displayOrder !== undefined) return 1;
        return 0;
      });

    // Create a map of resource ID to resource
    const resourceMap = new Map(marketStallOrdered.map((r) => [r.id, r]));

    // Get current Market Stall order (resource IDs in displayOrder)
    const marketStallOrder = marketStallOrdered.map((r) => r.id);

    // Reorder products to match Market Stall order
    const reorderedProducts = marketStallOrder
      .map((resourceId) => {
        // Find product that matches this resource ID
        const product = productsToReorder.find(
          (p) =>
            (typeof p.id === 'string' && p.id === `resource-${resourceId}`) ||
            (p.whopProductId && resourceMap.get(resourceId)?.whopProductId === p.whopProductId)
        );
        return product;
      })
      .filter((p): p is Product => p !== undefined);

    // Add any products that weren't in the Market Stall order (shouldn't happen, but safety check)
    const remainingProducts = productsToReorder.filter(
      (p) => !reorderedProducts.includes(p)
    );
    return [...reorderedProducts, ...remainingProducts];
  }, [allResources]);

  // Wrapper function that sets products - only reorder when NOT loading from template
  const setProductsAndReorder = useCallback((newProducts: Product[] | ((prev: Product[]) => Product[])) => {
    // During template load, preserve template order (don't reorder)
    if (isLoadingTemplate) {
      // During template load, preserve template order (don't reorder)
      if (typeof newProducts === 'function') {
        setProductsFromHook(newProducts);
      } else {
        setProductsFromHook(newProducts);
      }
      return;
    }
    
    // Normal operation: reorder to Market Stall order
    if (typeof newProducts === 'function') {
      setProductsFromHook((prevProducts) => {
        const updatedProducts = newProducts(prevProducts);
        return reorderProductsArray(updatedProducts);
      });
    } else {
      const reordered = reorderProductsArray(newProducts);
      setProductsFromHook(reordered);
    }
  }, [setProductsFromHook, reorderProductsArray, isLoadingTemplate]);

  // Update ref so hook can access it
  setProductsAndReorderRef.current = setProductsAndReorder;

  // Wrap loadTemplate to use setProductsAndReorder
  // Since we can't pass it to the hook at initialization, we'll intercept the call
  // and manually reorder after loadTemplate completes
  const loadTemplateWithReorder = useCallback(async (templateId: string) => {
    await loadTemplateFromHook(templateId);
    // After loadTemplate sets products, manually trigger reorder if resources are available
    // The reordering effect should also catch this, but this ensures it happens
    if (allResources.length > 0 && products.length > 0) {
      const reordered = reorderProductsArray(products);
      if (JSON.stringify(reordered.map(p => p.id)) !== JSON.stringify(products.map(p => p.id))) {
        setProductsAndReorder(reordered);
      }
    }
  }, [loadTemplateFromHook, setProductsAndReorder, reorderProductsArray, allResources, products]);

  // Actually, better approach: Modify the hook to accept setProducts override
  // But since we can't do that easily, let's use a different strategy:
  // Create a wrapper that intercepts setProducts calls

  // CRITICAL: Pass Market Stall resources to filter template products
  // Only use preview template hook when in preview mode or when previewLiveTemplate is explicitly provided and we're not in edit view
  // In edit view, we should use loadTemplate from useSeasonalStoreDatabase instead
  const shouldUsePreviewTemplate = isInPreviewModeLocal || (previewLiveTemplate && !editorState.isEditorView);
  
  const activePreviewTemplate = useMemo(() => {
    if (!shouldUsePreviewTemplate) return null;
    return (isInPreviewModeLocal && previewTemplateLocal) ? previewTemplateLocal : previewLiveTemplate;
  }, [shouldUsePreviewTemplate, isInPreviewModeLocal, previewTemplateLocal, previewLiveTemplate, editorState.isEditorView]);
  
  const { isTemplateLoaded } = usePreviewLiveTemplate({
    previewLiveTemplate: activePreviewTemplate, // Will be null in edit view, disabling the hook
    onTemplateLoaded,
    setBackground,
    setLogoAsset,
    setFixedTextStyles,
    setProducts: setProductsAndReorder, // Use wrapper that auto-reorders to Market Stall order
    setPromoButton,
    setFloatingAssets,
    setDiscountSettings, // CRITICAL: Pass setDiscountSettings so preview mode can set discount
    allResources, // Market Stall resources for filtering
    experienceId, // For fetching Market Stall if allResources not available
  });

  // Track Market Stall order changes and detect conflicts
  const {
    hasOrderChanged,
    currentOrder,
    snapshotOrder,
    updateSnapshot: updateOrderSnapshot,
  } = useMarketStallOrderSnapshot({
    allResources,
    isTemplateLoaded,
  });

  // Track previous values to detect changes
  const previousResourcesLengthRef = useRef(allResources.length);
  const previousProductsLengthRef = useRef(products.length);
  const previousTemplateIdRef = useRef<string | null>(null);
  const previousProductsIdsRef = useRef<string[]>([]);
  const isFirstTemplateLoadRef = useRef(true); // Track if this is the first template load
  
  // Auto-reorder products to Market Stall order when template is first loaded or products change
  useEffect(() => {
    // Check if template has changed (new template loaded)
    const currentTemplateId = currentlyLoadedTemplateId || previewLiveTemplate?.id || null;
    const templateChanged = currentTemplateId !== previousTemplateIdRef.current;
    
    // Detect first template load: when templateId transitions from null to a value
    const isFirstLoad = isFirstTemplateLoadRef.current && currentTemplateId !== null && previousTemplateIdRef.current === null;
    if (isFirstLoad) {
      console.log('🔄 First template load detected:', currentTemplateId);
      initialReorderDoneRef.current = false; // Ensure reorder happens on first load
    }
    
    // Check if products array changed (new products set, not just reordered)
    const currentProductIds = products.map(p => String(p.id));
    const productsChanged = JSON.stringify(currentProductIds) !== JSON.stringify(previousProductsIdsRef.current);
    
    // Check if products were just set (length changed from 0 to >0)
    const productsJustSet = products.length > 0 && previousProductsLengthRef.current === 0;
    
    // Check if resources just became available (length transitioned from 0 to >0)
    const resourcesJustBecameAvailable = allResources.length > 0 && previousResourcesLengthRef.current === 0;
    
    // CRITICAL: Check if resources became available AFTER products were already set
    // This handles the first load race condition where products load before resources
    const resourcesBecameAvailableWithProducts = 
      resourcesJustBecameAvailable && 
      products.length > 0 && 
      previousProductsLengthRef.current > 0; // Products were already set before resources arrived
    
    if (templateChanged) {
      // Template changed, reset the initial reorder flag
      initialReorderDoneRef.current = false;
      previousTemplateIdRef.current = currentTemplateId;
      isFirstTemplateLoadRef.current = false; // No longer first load after first template change
      console.log('🔄 Template changed, resetting reorder flag:', currentTemplateId);
    }

    // Perform reorder when:
    // 1. Resources are available AND products exist AND initial reorder not done yet
    // 2. AND (resources just became available OR products just set OR template changed OR products changed OR first load OR resources became available with existing products)
    // 3. SAFETY FALLBACK: If products exist and resources exist and reorder not done, always attempt reorder (for first load safety)
    const shouldReorder = 
      allResources.length > 0 && 
      products.length > 0 &&
      !initialReorderDoneRef.current &&
      (
        resourcesJustBecameAvailable || 
        productsJustSet || 
        templateChanged || 
        productsChanged || 
        isFirstLoad ||
        resourcesBecameAvailableWithProducts ||
        // Safety fallback: if both exist and reorder not done, attempt it (catches edge cases)
        (isFirstTemplateLoadRef.current && allResources.length > 0 && products.length > 0)
      );

    if (shouldReorder) {
      const reason = 
        isFirstLoad ? 'first template load' :
        resourcesBecameAvailableWithProducts ? 'resources became available after products were set' :
        resourcesJustBecameAvailable ? 'resources became available' : 
        productsJustSet ? 'products just set' : 
        templateChanged ? 'template changed' : 
        productsChanged ? 'products changed' : 
        'safety fallback';
        
      console.log('🔄 Reordering products to Market Stall order:', {
        templateId: currentTemplateId,
        productCount: products.length,
        resourceCount: allResources.length,
        previousResourceCount: previousResourcesLengthRef.current,
        previousProductCount: previousProductsLengthRef.current,
        reason,
        isFirstLoad: isFirstTemplateLoadRef.current
      });
      
      const reordered = reorderProductsArray(products);
      // Only update if order actually changed
      if (JSON.stringify(reordered.map(p => p.id)) !== JSON.stringify(products.map(p => p.id))) {
        setProductsFromHook(reordered);
        initialReorderDoneRef.current = true;
        // Update snapshot after reorder to prevent false change detection
        updateOrderSnapshot();
        console.log('✅ Reordered products to Market Stall order:', {
          templateId: currentTemplateId,
          productCount: reordered.length,
          originalOrder: products.map(p => p.id).slice(0, 3),
          newOrder: reordered.map(p => p.id).slice(0, 3),
          reason
        });
      } else {
        // Order is already correct, just mark as done
        initialReorderDoneRef.current = true;
        updateOrderSnapshot();
        console.log('✅ Products already in correct Market Stall order');
      }
      
      // Mark first load as complete after successful reorder
      if (isFirstLoad) {
        isFirstTemplateLoadRef.current = false;
      }
    }
    
    // Update refs for next comparison
    previousResourcesLengthRef.current = allResources.length;
    previousProductsLengthRef.current = products.length;
    previousTemplateIdRef.current = currentTemplateId;
    previousProductsIdsRef.current = currentProductIds;
  }, [isTemplateLoaded, allResources, products, reorderProductsArray, setProductsFromHook, updateOrderSnapshot, currentlyLoadedTemplateId, previewLiveTemplate?.id]);

  // Auto-sync product order when Market Stall order changes (after initial load)
  useEffect(() => {
    if (hasOrderChanged && isTemplateLoaded && initialReorderDoneRef.current && allResources.length > 0 && products.length > 0) {
      const reordered = reorderProductsArray(products);
      if (JSON.stringify(reordered.map(p => p.id)) !== JSON.stringify(products.map(p => p.id))) {
        setProductsFromHook(reordered);
        updateOrderSnapshot();
        console.log('✅ Auto-synced SeasonalStore products to Market Stall order');
      }
    }
  }, [hasOrderChanged, isTemplateLoaded, allResources, products, reorderProductsArray, setProductsFromHook, updateOrderSnapshot]);






  // Use product image upload hook
  const { handleProductImageUpload } = useProductImageUpload({
    setUploadingImage,
    setError,
    setProducts: setProductsFromHook,
    updateProduct,
    currentSeason,
  });

  // Use template manager hook
  const {
    templateManagerOpen,
    setTemplateManagerOpen,
    templateManagerAnimOpen,
    adminSheetAnimOpen,
    openTemplateManager,
    closeTemplateManager,
    closeTemplateManagerAnimated,
    closeAdminSheetAnimated: closeAdminSheetAnimatedFromHook,
  } = useTemplateManager(editorState);


  // Template save handler
  const handleSaveTemplate = useCallback((templateData: any) => {
    saveTemplate(templateData);
  }, [saveTemplate]);

  // Use store snapshot hook (needed for updateSnapshot in useTemplateSave)
  const {
    lastSavedSnapshot,
    hasUnsavedChanges,
    updateSnapshot,
    computeStoreSnapshot,
    restoreFromSnapshot,
    resetSnapshot,
  } = useStoreSnapshot({
    snapshotData: {
      products,
      floatingAssets,
      currentSeason,
      fixedTextStyles,
      logoAsset,
      generatedBackground,
      uploadedBackground,
      backgroundAttachmentId,
      backgroundAttachmentUrl,
      logoAttachmentId,
      logoAttachmentUrl,
      promoButton,
      discountSettings,
    },
    isInitialLoadComplete,
    isStoreContentReady,
    isTemplateLoaded,
    isInPreviewMode: isInPreviewModeLocal,
    currentlyLoadedTemplateId,
  });

  // Seasonal discount actions hook (moved here to access updateSnapshot)
  const { handleSaveDiscountSettings } = useSeasonalDiscountActions({
    experienceId: experienceId || undefined,
    user,
    updateTemplate,
    setDiscountSettings,
    templates,
    currentlyLoadedTemplateId,
    setProducts: setProductsFromHook,
    setTemplates,
    updateCachedTemplates,
    updateSnapshot,
  });

  // Auto-update template in database when Market Stall order changes
  useEffect(() => {
    if (hasOrderChanged && isTemplateLoaded && initialReorderDoneRef.current && allResources.length > 0 && products.length > 0) {
      const currentTemplateId = currentlyLoadedTemplateId || previewLiveTemplate?.id || null;
      if (currentTemplateId && updateTemplate) {
        // Find current template to merge with existing templateData
        const currentTemplate = templates.find((t: any) => t.id === currentTemplateId);
        if (currentTemplate) {
          // Auto-update template asynchronously
          const autoUpdateTemplate = async () => {
            try {
              // Filter products to only resource products (same as useTemplateSave)
              const frontendProducts = products.filter(product => typeof product.id === 'string' && product.id.startsWith('resource-'));
              
              console.log('💾 Auto-updating template with Market Stall order:', {
                templateId: currentTemplateId,
                productCount: frontendProducts.length,
                orderChanged: hasOrderChanged
              });
              
              await updateTemplate(currentTemplateId, {
                templateData: {
                  ...currentTemplate.templateData,
                  products: frontendProducts,
                },
              });
              
              console.log('✅ Template auto-updated with Market Stall order');
              
              // Update snapshot after template save completes
              if (updateSnapshot) {
                setTimeout(() => {
                  updateSnapshot();
                  console.log('📸 Snapshot updated after template auto-update');
                }, 100);
              }
            } catch (error) {
              console.warn('⚠️ Failed to auto-update template with Market Stall order:', error);
              // Continue even if auto-update fails - order is still updated in UI
            }
          };
          autoUpdateTemplate();
        }
      }
    }
  }, [hasOrderChanged, isTemplateLoaded, allResources, products, currentlyLoadedTemplateId, previewLiveTemplate?.id, updateTemplate, templates, updateSnapshot]);

  // Sync product prices when MarketStall resource prices change
  useEffect(() => {
    if (!isTemplateLoaded || products.length === 0 || allResources.length === 0) return;
    
    // Create a map of resource ID to resource for quick lookup
    const resourceMap = new Map(allResources.map((r: any) => [r.id, r]));
    const resourceByWhopIdMap = new Map(
      allResources
        .filter((r: any) => r.whopProductId)
        .map((r: any) => [r.whopProductId, r])
    );
    
    // Check if any product prices need updating
    let pricesUpdated = false;
    const updatedProducts = products.map((product) => {
      let matchedResource: any | null = null;
      
      // Match by resource ID
      if (typeof product.id === 'string' && product.id.startsWith('resource-')) {
        const resourceId = product.id.replace('resource-', '');
        matchedResource = resourceMap.get(resourceId);
      }
      
      // Match by whopProductId
      if (!matchedResource && product.whopProductId) {
        matchedResource = resourceByWhopIdMap.get(product.whopProductId);
      }
      
      if (matchedResource) {
        const marketStallPrice = parseFloat(matchedResource.price || '0');
        if (product.price !== marketStallPrice) {
          pricesUpdated = true;
          return { ...product, price: marketStallPrice };
        }
      }
      
      return product;
    });
    
    if (pricesUpdated) {
      console.log('💰 Syncing product prices with MarketStall prices');
      setProductsFromHook(updatedProducts);
      
      // Update snapshot after price sync to prevent drift
      updateSnapshot();
      
      // Auto-save template with updated prices (same as product order update)
      const currentTemplateId = currentlyLoadedTemplateId || previewLiveTemplate?.id || null;
      if (currentTemplateId && updateTemplate) {
        // Find current template to merge with existing templateData
        const currentTemplate = templates.find((t: any) => t.id === currentTemplateId);
        if (currentTemplate) {
          // Auto-save template asynchronously
          const autoSaveTemplate = async () => {
            try {
              console.log('💾 Auto-saving template with updated product prices:', currentTemplateId);
              await updateTemplate(currentTemplateId, {
                templateData: {
                  ...currentTemplate.templateData,
                  products: updatedProducts,
                },
              });
              console.log('✅ Template auto-saved with updated product prices');
            } catch (error) {
              console.warn('⚠️ Failed to auto-save template with updated prices:', error);
              // Continue even if auto-save fails - prices are still updated in UI
            }
          };
          autoSaveTemplate();
        }
      }
    }
  }, [allResources, products, isTemplateLoaded, setProductsFromHook, currentlyLoadedTemplateId, previewLiveTemplate?.id, updateTemplate, templates, updateSnapshot]);

  // Use template save hook
  const { handleSaveTemplateForNavbar } = useTemplateSave({
    saveTemplate,
    updateTemplate,
    createTheme,
    experienceId: experienceId || 'default-experience',
    currentSeason,
    theme,
    legacyTheme,
    fixedTextStyles,
    logoAsset,
    generatedBackground,
    uploadedBackground,
    backgroundAttachmentId,
    backgroundAttachmentUrl,
    logoAttachmentId,
    logoAttachmentUrl,
    products: products, // Use template products (not theme-specific)
    floatingAssets,
    promoButton,
    setError,
    allResources, // Pass allResources for ResourceLibrary product checking
    currentTemplateId: currentlyLoadedTemplateId, // Pass currently loaded template ID for updates
    onSavingStarted: (templateName: string) => {
      // Show saving notification
      setTemplateSaveNotification({ isOpen: true, isSaving: true, templateName });
    },
    onTemplateSaved: (templateName: string, templateId: string) => {
      // Update notification to saved state
      setTemplateSaveNotification({ isOpen: true, isSaving: false, templateName });
      // Highlight the saved template
      setHighlightedTemplateId(templateId);
      // Remove highlight after 10 seconds
      setTimeout(() => {
        setHighlightedTemplateId(undefined);
      }, 10000);
    },
    updateSnapshot: updateSnapshot,
    onOpenTemplateManager: () => {
      // Open template manager
      openTemplateManager();
    },
    onTemplateLimitReached: () => {
      // Close saving notification if it was shown
      setTemplateSaveNotification({ isOpen: false, isSaving: false, templateName: '' });
      // Show limit notification and automatically open Shop Manager
      setTemplateLimitNotification(true);
      openTemplateManager();
    },
    canAddTemplate: () => {
      // Match backend limit check (counts all templates)
      return templates.length < MAX_CUSTOM_TEMPLATES;
    },
  });

  // Wrapper for setLogoAsset (needed for component prop signature)
  const setLogoAssetWrapper = useCallback((fn: (prev: any) => any) => {
    setLogoAsset(fn(logoAsset));
  }, [logoAsset, setLogoAsset]);



  // Use preview mode hook (after snapshot hook)
  const {
    previewTemplate: previewTemplateFromHook,
    isInPreviewMode: isInPreviewModeFromHook,
    handlePreviewTemplate: handlePreviewTemplateFromHook,
    handleExitPreview: handleExitPreviewFromHook,
  } = usePreviewMode({
    templates,
    editorState,
    toggleEditorView,
    currentlyLoadedTemplateId,
  });

  // Sync preview mode state from hook
  useEffect(() => {
    setIsInPreviewModeLocal(isInPreviewModeFromHook);
    setPreviewTemplateLocal(previewTemplateFromHook);
  }, [isInPreviewModeFromHook, previewTemplateFromHook]);

  const previewTemplate = previewTemplateLocal;
  const isInPreviewMode = isInPreviewModeLocal;

  // Exit preview handler - loads latest non-live template if exiting from Live Preview, otherwise loads previewed template
  const handleExitPreview = useCallback(async () => {
    const templateToLoad = previewTemplate;
    
    // Exit preview mode first
    handleExitPreviewFromHook();
    
    // Check if we were previewing the live template
    const isPreviewingLiveTemplate = liveTemplate && templateToLoad && templateToLoad.id === liveTemplate.id;
    
    if (isPreviewingLiveTemplate) {
      // If previewing live template, load the latest non-live template instead
      const nonLiveTemplates = templates.filter(t => !t.isLive);
      const latestTemplate = nonLiveTemplates.length > 0
        ? [...nonLiveTemplates].sort((a, b) => {
            const timeB = new Date((b.updatedAt || b.createdAt || new Date(0))).getTime();
            const timeA = new Date((a.updatedAt || a.createdAt || new Date(0))).getTime();
            return timeB - timeA;
          })[0]
        : null;
      
      if (latestTemplate) {
        console.log('📂 Exiting Live Preview - loading latest non-live template:', latestTemplate.name);
        // Load the latest non-live template
        // Snapshot will be taken automatically by useStoreSnapshot when template finishes loading
        await loadTemplateWithReorder(latestTemplate.id);
      } else {
        console.log('⚠️ No non-live templates found to load after exiting Live Preview');
      }
    } else if (templateToLoad) {
      // If previewing a regular template, load that template
      console.log('📂 Exiting preview - loading previewed template:', templateToLoad.name);
      // Load the template that was being previewed
      // Snapshot will be taken automatically by useStoreSnapshot when template finishes loading
      await loadTemplateWithReorder(templateToLoad.id);
    }
  }, [previewTemplate, liveTemplate, templates, loadTemplateWithReorder, handleExitPreviewFromHook]);

  // Preview handler - use hook's function directly
  const handlePreviewTemplate = handlePreviewTemplateFromHook;

  // Reset handler - restores store to last saved snapshot
  // Uses startTransition to batch updates and prevent cascading recalculations
  const handleResetChanges = useCallback(() => {
    const snapshotData = restoreFromSnapshot();
    if (!snapshotData) {
      console.warn('No snapshot available to restore from');
      return;
    }

    console.log('🔄 Resetting store to snapshot state');
    
    // Immediately reset the snapshot flag to prevent diff detection during state restoration
    resetSnapshot();
    
    // Batch all state updates in a transition to prevent cascading recalculations
    startTransition(() => {
    // Restore all state from snapshot
    setProductsFromHook(snapshotData.products);
    setFloatingAssets(snapshotData.floatingAssets);
    setCurrentSeason(snapshotData.currentSeason);
    setFixedTextStyles(snapshotData.fixedTextStyles);
    setLogoAsset(snapshotData.logoAsset);
    
    // Restore background - use setBackground which handles both generated and uploaded
    if (snapshotData.generatedBackground) {
      setBackground('generated', snapshotData.generatedBackground);
    } else if (snapshotData.uploadedBackground) {
      setBackground('uploaded', snapshotData.uploadedBackground);
    } else {
      // Clear both backgrounds if neither exists
      setBackground('generated', null);
      setBackground('uploaded', null);
    }
    
    setBackgroundAttachmentId(snapshotData.backgroundAttachmentId);
    setBackgroundAttachmentUrl(snapshotData.backgroundAttachmentUrl);
    setLogoAttachmentId(snapshotData.logoAttachmentId);
    setLogoAttachmentUrl(snapshotData.logoAttachmentUrl);
    setPromoButton(snapshotData.promoButton);
    setDiscountSettings(snapshotData.discountSettings || {
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
      });
    });
    
    // Snapshot will be updated automatically by useStoreSnapshot when state stabilizes
  }, [restoreFromSnapshot, resetSnapshot, setProductsFromHook, setFloatingAssets, setCurrentSeason, setFixedTextStyles, setLogoAsset, setBackground, setBackgroundAttachmentId, setBackgroundAttachmentUrl, setLogoAttachmentId, setLogoAttachmentUrl, setPromoButton, setDiscountSettings]);

  // Determine if we're in preview mode (either from prop or internal state)
  const effectiveIsStorePreview = isStorePreview || isInPreviewMode;


  // Use state restoration hook - loads latest edited template when store is ready
  useStateRestoration({
    isStoreContentReady,
    isActive,
    liveTemplate,
    lastEditedTemplate,
    currentSeason,
    loadTemplate: loadTemplateWithReorder,
    saveLastActiveTheme,
  });

  // ResourceLibrary products are managed by useResourceLibraryProducts hook



  const handleRemoveSticker = useCallback((productId: number | string) => {
    updateProduct(productId, { containerAsset: undefined });
  }, [updateProduct]);

  // ResourceLibrary product deletion is handled by useProductHandlers hook

  // ResourceLibrary product management is handled by useResourceLibraryProducts hook

  // Use auto-add resources hook
  // IMPORTANT: allResources prop MUST contain ONLY Market Stall (global ResourceLibrary) products
  // This ensures auto-add ONLY uses Market Stall products, not funnel-specific products
  const { hasAutoAddedResources, isAutoAddComplete } = useAutoAddResources({
    allResources, // Market Stall (global ResourceLibrary) products only
    hasLoadedResourceLibrary,
    products, // Pass template products
    deletedResourceLibraryProducts,
    legacyTheme,
    setProducts: setProductsFromHook, // Use setProducts instead of setThemeProducts
    handleProductImageUpload,
    templateResourceLibraryProductIds, // Pass template ResourceLibrary product IDs
    isTemplateLoaded, // Pass internal template loaded state
  });

  // Store Loading Logic: Wait for content to be ready before showing store
  // - If live template exists: loads live template data
  // - If no live template: auto-adds synced WHOP products as default
  // - Store only renders when content is ready (no default Fall theme flash)
  const isProductsReady = isInitialLoadComplete; // Products are ready when initial load completes
  
  // Promo button is ready when store content is ready
  const isPromoButtonReady = isStoreContentReady;

  // Product deletion is handled by useProductHandlers hook


  // Use drag and drop hook
  const {
    handleDropAsset,
    handleDropOnProduct,
    handleDragStart,
  } = useDragAndDrop({
    editorState,
    addFloatingAsset,
    updateProduct,
    setAvailableAssets,
    appRef,
  });


  const { mainHeader, headerMessage, subHeader, promoMessage } = fixedTextStyles || {};




  useEffect(() => {
    // Always sync Claim button to current theme on theme change
    // Use ring-2 to match ProductCard buttons (default gray ring)
    setPromoButton((prev: any) => ({
      ...prev,
      buttonClass: legacyTheme.accent,
      ringClass: '', // Empty string - will use default ring-2 from ProductCard style
      ringHoverClass: '', // Empty string - will use default ring-2 from ProductCard style
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyTheme.accent]);

  // Apply theme styles when theme changes (managed by useThemeApplication hook)
  useThemeApplication({
    currentSeason,
    isTemplateLoaded,
    products,
    legacyTheme,
    fixedTextStyles,
    backgroundAttachmentUrl,
    uploadedBackground: uploadedBackground ?? null,
    originTemplate,
    applyThemeColorsToText,
    setProducts: setProductsFromHook,
    setFixedTextStyles,
    setPromoButton,
    setBackground,
  });






  // Add visual feedback for editable text
  useEffect(() => {
    if (editorState.isEditorView) {
      // Add cursor pointer to all editable elements
      const editableElements = document.querySelectorAll('[contenteditable="true"]');
      editableElements.forEach(el => {
        (el as HTMLElement).style.cursor = 'text';
        (el as HTMLElement).style.outline = 'none';
        (el as HTMLElement).style.border = '2px dashed transparent';
      });
    }
  }, [editorState.isEditorView]);

  // Debug: Log when mainHeader styleClass changes
  useEffect(() => {
    if (mainHeader) {
    console.log('🎨 MainHeader styleClass changed:', mainHeader.styleClass);
    }
  }, [mainHeader?.styleClass]);

  // Determine background style with smooth transitions
  const getBackgroundStyle = useMemo(() => {
    return getBackgroundStyleUtil(backgroundAttachmentUrl, currentSeason, legacyTheme);
  }, [backgroundAttachmentUrl, currentSeason, legacyTheme]);

  // Product editor slide-over state
  const [productEditor, setProductEditor] = useState<{ isOpen: boolean; productId: number | string | null; target: 'name' | 'description' | 'card' | 'button' | null }>({ isOpen: false, productId: null, target: null });
  const [productPageModal, setProductPageModal] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
  
  const openProductPageModal = useCallback((product: Product) => {
    setProductPageModal({ isOpen: true, product });
  }, []);
  
  const closeProductPageModal = useCallback(() => {
    setProductPageModal({ isOpen: false, product: null });
  }, []);
  
  const openProductEditor = (productId: number | string | null, target: 'name' | 'description' | 'card' | 'button') => {
    setProductEditor({ isOpen: true, productId, target });
  };
  const closeProductEditor = () => setProductEditor({ isOpen: false, productId: null, target: null });


  // Template manager state is managed by useTemplateManager hook
  
  // Use notifications hook
  const {
    templateSaveNotification,
    setTemplateSaveNotification,
    themeGenerationNotification,
    setThemeGenerationNotification,
    makePublicNotification,
    setMakePublicNotification,
    templateLimitNotification,
    setTemplateLimitNotification,
  } = useNotifications();
  
  // Highlighted template state
  const [highlightedTemplateId, setHighlightedTemplateId] = useState<string | undefined>(undefined);




  const closeTextEditorAnimated = () => {
    setEditingText({ isOpen: false, targetId: 'mainHeader' });
  };

  const closeAdminSheetAnimated = () => {
    closeAdminSheetAnimatedFromHook(toggleAdminSheet);
  };

  const closeProductEditorAnimated = () => {
    closeProductEditor();
  };

  // Close modals when clicking outside (must be after function definitions)
  useClickOutside(editingText.isOpen, closeTextEditorAnimated, '[role="dialog"][aria-label="Edit Text"]');
  useClickOutside(productEditor.isOpen, closeProductEditorAnimated, '[role="dialog"][aria-label="Edit Product"]');

  // Generate background button location state
  const [showGenerateBgInNavbar, setShowGenerateBgInNavbar] = useState(true); // Start in navbar
  
  // State for coordinating with ConditionalReturns loading
  const [isConditionalReturnsReady, setIsConditionalReturnsReady] = useState(false);
  
  // Wrapper functions for component prop type mismatches (required by child components)
  const setEditingTextWrapper = useCallback((state: { isOpen: boolean; targetId: string }) => {
    setEditingText(state as any);
  }, [setEditingText]);

  const applyThemeColorsToTextWrapper = useCallback((text: any, type: string) => {
    return applyThemeColorsToText(text, type as any);
  }, [applyThemeColorsToText]);

  const deleteProductWrapper = useCallback((product: any) => {
    deleteProduct(product.id);
  }, [deleteProduct]);

  const openProductEditorWrapper = useCallback((id: number | string | null, target: string) => {
    openProductEditor(id, target as any);
  }, [openProductEditor]);

  const handleDropOnProductWrapper = useCallback((productId: number | string, asset: any) => {
    // Convert to drag event format for handleDropOnProduct
    const mockEvent = {
      preventDefault: () => {},
      stopPropagation: () => {},
      dataTransfer: { getData: () => JSON.stringify(asset) },
    } as any;
    handleDropOnProduct(mockEvent, typeof productId === 'number' ? productId : parseInt(productId.toString()) || 0);
  }, [handleDropOnProduct]);

  // ALL CONDITIONAL RETURNS MUST BE AFTER ALL HOOKS
  // Use ConditionalReturns component to handle all conditional rendering
  const conditionalReturn = ConditionalReturns({
    // FunnelBuilder props
    showFunnelBuilder,
    liveFunnel,
    setShowFunnelBuilder,
    setLiveFunnel: () => {}, // Managed by useLiveFunnel hook
    isFunnelActive,
    experienceId,
    user,
    backgroundStyle: getBackgroundStyle,

    // StoreResourceLibrary props
    showStoreResourceLibrary,
    setShowStoreResourceLibrary,
    currentSeason,
    theme,
    resourceLibraryProducts,
    products, // Pass template products instead of themeProducts
    allResources,
    setAllResources,
    handleAddToTemplate,
    handleRemoveFromTemplate,
    isResourceInTemplate,
    getFilteredPaidResources,

    // Loading overlay props
    previewLiveTemplate,
    isTemplateLoaded,
    onConditionalReturnsReady: useCallback((isReady: boolean) => {
      // Update loading state based on ConditionalReturns readiness
      setIsConditionalReturnsReady(isReady);
      if (isReady) {
        console.log('🔄 [SeasonalStore] ConditionalReturns is ready, can hide loading screen');
      } else {
        console.log('🔄 [SeasonalStore] ConditionalReturns not ready, keep loading screen');
      }
    }, []),
  });

  // If conditional return exists, return it
  if (conditionalReturn) {
    return conditionalReturn;
  }

  // ProductEditor wrapper to handle type mismatch
  const productEditorWrapper = {
    ...productEditor,
    target: productEditor.target || 'name'
  };

  return (
    <>
      {/* Show loading screen while waiting for store content AND ConditionalReturns to be ready */}
      {(!isStoreContentReady || !isConditionalReturnsReady) && (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden loading-screen-fade-in">
          {/* Main content */}
          <div className="text-center relative z-10">
            {/* Whop-style loading spinner */}
            <div className="relative mb-6">
              <div className="w-8 h-8 mx-auto relative">
                <div className="absolute inset-0 border-2 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            </div>
            
            {/* Whop-style loading text */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Calling for Merchant
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Preparing showcase items...
              </p>
            </div>
            
            {/* Loading dots animation */}
            <div className="flex justify-center space-x-2 mt-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Store content - only render when ready AND ConditionalReturns is ready */}
      {isStoreContentReady && isConditionalReturnsReady && (
        <div 
          ref={appRef} 
          className={`font-inter antialiased relative overflow-y-auto overflow-x-hidden transition-all duration-700 ${!uploadedBackground && !generatedBackground && !legacyTheme.backgroundImage ? legacyTheme.background : ''} ${editorState.isEditorView ? 'cursor-pointer' : ''}`}
          style={getBackgroundStyle}
          onClick={(e) => {
            // Only open AdminSheet if clicking directly on background (not on child elements)
            if (editorState.isEditorView) {
              const target = e.target as HTMLElement;
              
              // Check if click is on the background div itself
              if (target === e.currentTarget) {
                toggleAdminSheet();
                return;
              }
              
              // Check if click is on empty space (not on any interactive or content elements)
              const isInteractive = target.closest('button, a, input, select, textarea, [role="button"], [onclick], .product-container, .floating-asset, img, svg, canvas');
              const isContentArea = target.closest('[class*="product"], [class*="header"], [class*="logo"], [class*="promo"]');
              
              // If clicking on empty background area (main content container but not on content)
              if (!isInteractive && !isContentArea && target.classList.contains('relative')) {
                toggleAdminSheet();
              }
            }
          }}
        >
      <TopNavbar
        onBack={isInPreviewMode ? handleExitPreview : onBack}
        editorState={editorState}
        showGenerateBgInNavbar={showGenerateBgInNavbar}
        isChatOpen={isChatOpen}
        isGeneratingBackground={isGeneratingBackground}
        loadingState={loadingState}
        promoButton={promoButton}
        currentSeason={currentSeason}
        allThemes={allThemes}
        legacyTheme={legacyTheme}
        hideEditorButtons={hideEditorButtons}
        isStorePreview={effectiveIsStorePreview}
        highlightSaveButton={highlightSaveButton}
        hasUnsavedChanges={hasUnsavedChanges}
        isTemplateManagerOpen={templateManagerOpen}
        discountSettings={discountSettings}
        toggleEditorView={toggleEditorView}
        handleGenerateBgClick={handleGenerateBgClick}
        handleBgImageUpload={handleBgImageUpload}
        handleSaveTemplate={handleSaveTemplateForNavbar}
        onResetChanges={handleResetChanges}
        toggleAdminSheet={toggleAdminSheet}
        openTemplateManager={openTemplateManager}
        handleAddProduct={handleAddProduct}
        setIsChatOpen={setIsChatOpen}
        setCurrentSeason={setCurrentSeason}
        getHoverRingClass={getHoverRingClass}
        getGlowBgClass={getGlowBgClass}
        getGlowBgStrongClass={getGlowBgStrongClass}
      />



      <LoadingScreen loadingState={loadingState} />


      {/* Admin Asset Management Sheet */}
      {editorState.isEditorView && editorState.isAdminSheetOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${adminSheetAnimOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAdminSheetAnimated();
          }}
        >
          <AdminAssetSheet
            isOpen={editorState.isAdminSheetOpen}
            onClose={closeAdminSheetAnimated}
            floatingAssets={floatingAssets}
            availableAssets={availableAssets}
            setAvailableAssets={setAvailableAssets}
            backgroundAnalysis={backgroundAnalysis}
            onDeleteFloatingAsset={deleteFloatingAsset}
            onGenerateAsset={handleGenerateAssetFromText}
            isTextLoading={loadingState.isTextLoading}
            isImageLoading={loadingState.isImageLoading}
            apiError={apiError}
            selectedAssetId={editorState.selectedAssetId}
            onSelectAsset={setSelectedAsset}
            currentSeason={currentSeason}
            isEditorView={editorState.isEditorView}
            allThemes={allThemes}
            setAllThemes={setAllThemes}
            handleAddCustomTheme={addCustomTheme}
            currentTheme={theme}
            experienceId={experienceId}
            onThemeGeneration={(isGenerating, themeName) => {
              setThemeGenerationNotification({
                isOpen: true,
                isGenerating,
                themeName,
              });
            }}
            onDeleteTheme={async (themeId: string) => {
              if (!experienceId) {
                throw new Error('Experience ID is required to delete theme');
              }
              await deleteThemeAction(experienceId, themeId);
              // Reload themes from database to update the themes state
              await loadThemes();
            }}
            handleGenerateBgClick={handleGenerateBgClick}
            handleBgImageUpload={handleBgImageUpload}
            setCurrentSeason={setCurrentSeason}
            loadingState={loadingState}
            originTemplate={originTemplate}
            handleUpdateTheme={async (season, updates) => {
              await handleUpdateThemeUtil(season, updates, themes, setAllThemes, setError, experienceId || '');
            }}
            handleUpdateAsset={updateFloatingAsset}
            handleAddFloatingAsset={(assetData) => {
              if (assetData.id && assetData.type) {
                addFloatingAsset(assetData as FloatingAssetType);
              }
            }}
            fixedTextStyles={fixedTextStyles}
            setFixedTextStyles={setFixedTextStyles}
            canAddCustomTheme={canAddCustomTheme()}
            canAddTemplate={canAddTemplate()}
            maxCustomThemes={MAX_CUSTOM_THEMES}
            maxCustomTemplates={MAX_CUSTOM_TEMPLATES}
          />
        </div>
      )}


      {/* Main Content Container */}
      <div 
        className={`relative z-30 flex flex-col items-center pt-1 pb-8 px-3 sm:px-6 max-w-7xl mx-auto transition-all duration-500 overflow-y-auto overflow-x-hidden h-full w-full`}
        onClick={(e) => {
          if (editorState.isEditorView) {
            const target = e.target as HTMLElement;
            // If clicking on empty space in the content container, open AdminSheet
            if (target === e.currentTarget || (!target.closest('button, a, input, select, textarea, [role="button"], [onclick], .product-container, .floating-asset, img, svg, canvas, [class*="product"], [class*="header"], [class*="logo"], [class*="promo"]'))) {
              toggleAdminSheet();
            } else {
              setSelectedAsset(null);
            }
          }
        }}
        onDragOver={(e) => editorState.isEditorView && e.preventDefault()}
        onDrop={editorState.isEditorView ? handleDropAsset : undefined}
      >
        <LogoSection
          editorState={editorState}
          logoAsset={logoAsset || { src: '', shape: 'round' }}
          currentSeason={currentSeason}
          legacyTheme={legacyTheme}
          loadingState={loadingState}
          handleLogoImageUpload={handleLogoImageUpload}
          handleLogoGeneration={handleLogoGeneration}
          setLogoAsset={setLogoAssetWrapper}
        />
        
        <StoreHeader
          editorState={editorState}
          fixedTextStyles={fixedTextStyles}
          backgroundAnalysis={backgroundAnalysis}
          legacyTheme={legacyTheme}
          setFixedTextStyles={setFixedTextStyles}
          applyThemeColorsToText={applyThemeColorsToTextWrapper}
          getThemeColors={getThemeColors}
          setEditingText={setEditingTextWrapper}
        />

        {/* API Error Display */}
        {editorState.isEditorView && apiError && (
          <div className="w-full max-w-5xl p-6 mb-8 bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-100 rounded-2xl flex items-center shadow-2xl">
            <AlertTriangleIcon className="w-6 h-6 mr-3 flex-shrink-0 text-red-300" />
            <p className="font-medium text-sm sm:text-base">{apiError}</p>
          </div>
        )}
        
        <ProductShowcase
          combinedProducts={combinedProducts}
          currentProductIndex={currentProductIndex}
          swipeDirection={swipeDirection}
          editorState={editorState}
          legacyTheme={legacyTheme}
          loadingState={loadingState}
          isProductsReady={isProductsReady}
          navigateToPrevious={navigateToPrevious}
          navigateToNext={navigateToNext}
          setCurrentProductIndex={setCurrentProductIndex}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          updateProduct={updateProduct}
          deleteProduct={deleteProductWrapper}
          handleProductImageUpload={handleProductImageUpload}
          handleRefineAll={handleRefineAll}
          handleRemoveSticker={handleRemoveSticker}
          handleDropOnProduct={handleDropOnProductWrapper}
          openProductEditor={openProductEditorWrapper}
          onOpenProductPage={openProductPageModal}
          storeName={legacyTheme.name || "Store"}
          experienceId={experienceId}
          discountSettings={discountSettings ? {
            enabled: discountSettings.enabled,
            startDate: discountSettings.startDate || '',
            endDate: discountSettings.endDate || '',
            promoCode: discountSettings.promoCode,
          } : undefined}
          discountStatus={discountStatus}
          seasonalDiscountId={seasonalDiscountId}
          currentDiscountPromoCode={currentDiscountPromoCode}
        />

        <PromoButton
          funnelFlow={funnelFlow}
          isFunnelActive={isFunnelActive}
          editorState={editorState}
          promoButton={promoButton}
          backgroundAnalysis={backgroundAnalysis}
          fixedTextStyles={fixedTextStyles}
          legacyTheme={legacyTheme}
          isPromoButtonReady={isPromoButtonReady}
          onOpenProductEditor={openProductEditorWrapper}
          setIsChatOpen={setIsChatOpen}
          setFixedTextStyles={setFixedTextStyles}
          getThemeColors={getThemeColors}
          applyThemeColorsToText={applyThemeColorsToTextWrapper}
          getHoverRingClass={getHoverRingClass}
          getGlowBgClass={getGlowBgClass}
          getGlowBgStrongClass={getGlowBgStrongClass}
        />


        {/* Floating Thematic Assets - Now positioned relative to content */}
        {floatingAssets.map((asset: any) => (
          <FloatingAsset
            key={asset.id}
            asset={asset}
            isAdminSheetOpen={editorState.isAdminSheetOpen && editorState.isEditorView}
            selectedAssetId={editorState.selectedAssetId}
            onUpdateAsset={updateFloatingAsset}
            onSelectAsset={setSelectedAsset}
            onDeleteAsset={deleteFloatingAsset}
            appRef={appRef}
            isEditorView={editorState.isEditorView}
          />
        ))}
        
        {/* Bottom padding to ensure CLAIM GIFT button is never at the bottom */}
        <div className="h-20"></div>
      </div>


      <TextEditorModal
        isOpen={editingText.isOpen}
        editingText={editingText}
        fixedTextStyles={fixedTextStyles}
        backgroundAnalysis={backgroundAnalysis}
        legacyTheme={legacyTheme}
        onClose={closeTextEditorAnimated}
        setFixedTextStyles={setFixedTextStyles}
        getThemeQuickColors={getThemeQuickColors}
      />

      {productPageModal.product && (
        <ProductPageModal
          isOpen={productPageModal.isOpen}
          onClose={closeProductPageModal}
          product={productPageModal.product}
          theme={legacyTheme}
          storeName={legacyTheme.name || "Store"}
          experienceId={experienceId}
        />
      )}
      
      <ProductEditorModal
        isOpen={productEditor.isOpen}
        productEditor={productEditorWrapper}
        products={products as any}
        promoButton={promoButton}
        legacyTheme={legacyTheme}
        backgroundAnalysis={backgroundAnalysis}
        discountSettings={discountSettings}
        onClose={closeProductEditorAnimated}
        updateProduct={updateProduct}
        setPromoButton={setPromoButton}
        experienceId={experienceId}
        templates={templates}
        setTemplates={setTemplates}
        updateCachedTemplates={updateCachedTemplates}
        updateTemplate={updateTemplate}
        onProductUpdated={async () => {
          // Auto-save template after product update (similar to price update auto-save)
          // Use a longer delay to ensure React state has updated
          setTimeout(async () => {
            const currentTemplateId = currentlyLoadedTemplateId || previewLiveTemplate?.id || null;
            if (currentTemplateId && updateTemplate && isTemplateLoaded) {
              const currentTemplate = templates.find((t: any) => t.id === currentTemplateId);
              if (currentTemplate) {
                try {
                  // Get the latest products from state (they should be updated by now)
                  // The products array should already be updated by updateProduct
                  const latestProducts = products;
                  console.log('💾 Auto-saving template after product promo update:', currentTemplateId);
                  
                  // Log promo fields for debugging
                  const productsWithPromo = latestProducts.filter(p => p.promoCodeId || p.promoCode || p.promoShowFireIcon);
                  if (productsWithPromo.length > 0) {
                    console.log('🎫 Products with promo fields:', productsWithPromo.map(p => ({
                      id: p.id,
                      name: p.name?.substring(0, 30),
                      promoCodeId: p.promoCodeId,
                      promoCode: p.promoCode,
                      promoShowFireIcon: p.promoShowFireIcon,
                      promoQuantityLeft: p.promoQuantityLeft,
                      promoLimitQuantity: p.promoLimitQuantity,
                      promoDiscountType: p.promoDiscountType,
                      promoDiscountAmount: p.promoDiscountAmount,
                    })));
                  }
                  
                  // Filter to only resource products (same as useTemplateSave)
                  const frontendProducts = latestProducts.filter(product => typeof product.id === 'string' && product.id.startsWith('resource-'));
                  
                  // Verify promoCode is in the products being saved
                  const productsWithPromoCode = frontendProducts.filter(p => p.promoCode);
                  if (productsWithPromoCode.length > 0) {
                    console.log('🎫 Products with promoCode being saved to template:', productsWithPromoCode.map(p => ({
                      id: p.id,
                      name: p.name?.substring(0, 30),
                      promoCode: p.promoCode,
                      promoCodeId: p.promoCodeId,
                    })));
                  }
                  
                  await updateTemplate(currentTemplateId, {
                    templateData: {
                      ...currentTemplate.templateData,
                      products: frontendProducts, // Use filtered products array with all fields including promoCode
                    },
                  });
                  console.log('✅ Template auto-saved after product promo update');
                } catch (error) {
                  console.warn('⚠️ Failed to auto-save template after product promo update:', error);
                }
              }
            }
          }, 200); // Increased delay to ensure state is updated
        }}
      />


      <TemplateManagerModal
        isOpen={templateManagerOpen}
        isAnimating={templateManagerAnimOpen}
        templates={templates}
        liveTemplate={liveTemplate}
        highlightedTemplateId={highlightedTemplateId}
        originTemplate={originTemplate}
        backgroundAnalysis={backgroundAnalysis}
        onClose={closeTemplateManagerAnimated}
        loadTemplate={loadTemplateWithReorder || loadTemplateFromHook}
        deleteTemplate={deleteTemplate}
        setLiveTemplate={setLiveTemplate}
        onPreview={handlePreviewTemplate}
        maxTemplates={MAX_CUSTOM_TEMPLATES}
        onCreateNewShop={async () => {
          if (!originTemplate) return;
          
          try {
            // Create new template from origin template data
            const originData = originTemplate.defaultThemeData;
            const newTemplateName = `Shop ${templates.length + 1}`;
            
            // Extract theme data directly from default_theme_data
            const companyThemeName = originData.name || 'Company Theme';
            const companyThemeCard = originData.card || 'bg-white/95 backdrop-blur-sm shadow-xl';
            const companyThemeText = originData.text || 'text-gray-800';
            const companyThemeWelcomeColor = originData.welcomeColor || 'text-yellow-300';
            const companyThemeAccent = originData.accent || 'bg-indigo-500';
            const companyThemeRing = originData.ringColor || companyThemeAccent;
            const companyThemePrompt = originData.themePrompt || originTemplate.themePrompt || '';
            const companyThemeAiMessage = originData.aiMessage || originData.subHeader || '';
            const companyThemeEmojiTip = originData.emojiTip || '🎁';
            const companyThemeMainHeader = originData.mainHeader || null;
            const companyThemePlaceholderImage = originData.placeholderImage || originData.background;
            
            // Fetch Market Stall products to add to the template
            let marketStallProducts: Product[] = [];
            try {
              const response = await fetch(`/api/resources?experienceId=${experienceId}`);
              if (response.ok) {
                const data = await response.json();
                const marketStallResources = data.data?.resources || [];
                const paidMarketStallResources = marketStallResources.filter((resource: Resource) => 
                  resource.category === 'PAID'
                );
                
                const marketStallPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
                
                // Convert to products with company theme styles applied
                marketStallProducts = paidMarketStallResources.map((resource: Resource) => {
                  const productImage = resource.image || marketStallPlaceholder;
                  return {
                    id: `resource-${resource.id}`,
                    name: resource.name,
                    description: resource.description || '',
                    price: parseFloat(resource.price || '0'),
                    image: productImage,
                    imageAttachmentUrl: productImage,
                    buttonText: 'VIEW DETAILS',
                    buttonLink: resource.link || '',
                    whopProductId: resource.whopProductId,
                    // Apply company theme styles
                    cardClass: companyThemeCard,
                    titleClass: companyThemeText,
                    descClass: companyThemeText,
                    buttonClass: companyThemeAccent,
                  };
                });
                
                console.log(`📦 [onCreateNewShop] Fetched ${marketStallProducts.length} Market Stall products for new template`);
              }
            } catch (error) {
              console.warn('⚠️ [onCreateNewShop] Failed to fetch Market Stall products:', error);
            }
            
            // Use saveTemplate with origin template data
            const originProducts = originData.products || [];
            const allProducts = [...marketStallProducts, ...originProducts];
            const originFloatingAssets = originData.floatingAssets || [];
            const originTextStyles = originData.fixedTextStyles || fixedTextStyles;
            const originLogo = originData.logo || logoAsset;
            const originBackground = originData.background;
            const originPromoButton = originData.promoButton || promoButton;
            const originDiscountSettings = discountSettings || {
              enabled: false,
              globalDiscount: false,
              globalDiscountType: 'percentage',
              globalDiscountAmount: 0,
              percentage: 0,
              startDate: '',
              endDate: '',
              discountText: '',
              promoCode: '',
              prePromoMessages: [],
              activePromoMessages: [],
            };
            
            const newTemplate = await saveTemplate({
              name: newTemplateName,
              experienceId: experienceId || '',
              userId: user?.whopUserId || '',
              themeId: null,
              themeSnapshot: {
                id: `theme_${Date.now()}`,
                experienceId: experienceId || '',
                name: companyThemeName,
                season: 'Company',
                themePrompt: companyThemePrompt,
                accentColor: companyThemeAccent,
                ringColor: companyThemeRing,
                placeholderImage: companyThemePlaceholderImage || originBackground,
                mainHeader: companyThemeMainHeader,
                subHeader: companyThemeAiMessage,
                card: companyThemeCard,
                text: companyThemeText,
                welcomeColor: companyThemeWelcomeColor,
                background: originBackground || '',
                aiMessage: companyThemeAiMessage,
                emojiTip: companyThemeEmojiTip,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              currentSeason: 'Company',
              templateData: {
                // PRIMARY DATA: Flat structure
                products: allProducts, // Include Market Stall products with company theme styles
                floatingAssets: originFloatingAssets,
                fixedTextStyles: originTextStyles,
                logoAsset: originLogo,
                generatedBackground: originBackground,
                uploadedBackground: originBackground,
                backgroundAttachmentId: null,
                backgroundAttachmentUrl: originBackground,
                logoAttachmentId: null,
                logoAttachmentUrl: originLogo?.src || null,
                currentTheme: {
                  name: companyThemeName,
                  themePrompt: companyThemePrompt,
                  accent: companyThemeAccent,
                  card: companyThemeCard,
                  text: companyThemeText,
                  welcomeColor: companyThemeWelcomeColor,
                  background: originBackground || '',
                  backgroundImage: originBackground,
                  placeholderImage: companyThemePlaceholderImage || originBackground,
                  aiMessage: companyThemeAiMessage,
                  mainHeader: companyThemeMainHeader,
                  emojiTip: companyThemeEmojiTip
                },
                promoButton: originPromoButton,
                discountSettings: originDiscountSettings,
                
                // LEGACY COMPATIBILITY: Theme-specific nested structures
                themeTextStyles: { 'Company': originTextStyles },
                themeLogos: { 'Company': originLogo },
                themeGeneratedBackgrounds: { 'Company': originBackground },
                themeUploadedBackgrounds: { 'Company': originBackground },
                themeProducts: { 'Company': allProducts }, // Include Market Stall products
                themeFloatingAssets: { 'Company': originFloatingAssets },
              },
              isLive: false,
              isLastEdited: false,
            });
            
            // Load the new template
            await loadTemplateWithReorder(newTemplate.id);
            
            // Close template manager
            closeTemplateManagerAnimated();
          } catch (error) {
            console.error('Error creating new shop from origin template:', error);
            setError(`Failed to create new shop: ${(error as Error).message}`);
          }
        }}
        onMakePublic={async (templateId) => {
          // Find the template name
          const template = templates.find((t: any) => t.id === templateId);
          const templateName = template?.name || 'Template';
          
          // Show make public notification
          setMakePublicNotification({ isOpen: true, templateName });
        }}
        onRenameTemplate={async (templateId, updates) => {
          if (!experienceId) {
            throw new Error('Experience ID is required to rename template');
          }
          return await updateTemplate(templateId, updates);
        }}
        discountSettings={discountSettings}
        experienceId={experienceId}
        onSaveDiscountSettings={handleSaveDiscountSettings}
        updateTemplate={updateTemplate}
        setDiscountSettings={setDiscountSettings}
        products={products}
        subscription={user?.experience?.subscription}
        currentlyLoadedTemplateId={currentlyLoadedTemplateId}
        setProducts={setProductsFromHook}
        setTemplates={(templatesOrUpdater) => {
          if (typeof templatesOrUpdater === 'function') {
            setTemplates((prev) => {
              const updated = templatesOrUpdater(prev as any);
              return updated as any;
            });
          } else {
            setTemplates(templatesOrUpdater as any);
          }
        }}
        updateCachedTemplates={updateCachedTemplates}
      />

      {/* All Notifications */}
      <Notifications
        notifications={{
          templateSave: templateSaveNotification,
          themeGeneration: themeGenerationNotification,
          makePublic: makePublicNotification,
          templateLimit: templateLimitNotification,
          sync: {
            isOpen: showSyncPopup,
            syncResult,
            isLoading: isCheckingUpdates,
            isApplying: isApplyingSync,
          },
        }}
        onCloseTemplateSave={() => setTemplateSaveNotification({ isOpen: false, isSaving: false, templateName: '' })}
        onCloseThemeGeneration={() => setThemeGenerationNotification({ isOpen: false, isGenerating: false, themeName: '' })}
        onCloseMakePublic={() => setMakePublicNotification({ isOpen: false, templateName: '' })}
        onCloseTemplateLimit={() => setTemplateLimitNotification(false)}
        onOpenShopManager={openTemplateManager}
        onCloseSync={closeSyncPopup}
        onApplySyncChanges={handleApplyChanges}
        onSyncSuccess={handleSyncSuccess}
        isActive={isActive}
      />

      {/* Seasonal Store Chat - Half View with Unfold/Fold Animation */}
      {/* When text editing modals are open, show chat as overlay above them */}
      <div className={`fixed inset-x-0 bottom-0 ${(editingText.isOpen || productEditor.isOpen) ? 'z-[70]' : 'z-50'} bg-white/40 dark:bg-black/40 backdrop-blur-md text-gray-900 dark:text-gray-100 shadow-2xl border-t border-b-0 border-white/20 dark:border-gray-700/20 transition-all duration-300 ease-in-out transform ${
        isChatOpen 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      }`}>
         <div className={`w-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
           isChatOpen 
             ? isMobile ? 'max-h-[100vh] opacity-100' : 'max-h-[50vh] opacity-100'
             : 'max-h-0 opacity-0'
         }`} style={{ 
           height: isChatOpen ? (isMobile ? '100vh' : '50vh') : '0vh', 
           maxHeight: isChatOpen ? (isMobile ? '100vh' : '50vh') : '0vh' 
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
                <SeasonalStoreChat
                  funnelFlow={funnelFlow}
                  resources={liveFunnel?.resources || []}
                  experienceId={experienceId}
                  onMessageSent={(message, conversationId) => {
                    console.log('Chat message sent:', message, conversationId);
                  }}
                  onBack={() => setIsChatOpen(false)}
                  hideAvatar={false}
                  onEditMerchant={() => {
                    console.log('Edit merchant clicked');
                    setIsChatOpen(false);
                    setShowFunnelBuilder(true);
                  }}
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
                         There's no live funnel to preview yet.
                       </p>
                       
                       <button
                        onClick={() => {
                          console.log('[SeasonalStore] Manual refresh triggered');
                          window.location.reload();
                        }}
                         className="px-4 py-2 bg-blue-500/90 dark:bg-blue-600/90 backdrop-blur-sm text-white rounded-lg hover:bg-blue-600/90 dark:hover:bg-blue-700/90 transition-colors border border-blue-400/30 dark:border-blue-500/30 shadow-lg"
                       >
                         Refresh
                       </button>
                     </div>
                   </div>
                 )}
            </div>
          </div>
        </div>
      </div>
      )}
      
      {/* Green Popup - No Merchant is Live */}
      {showNotification && !isFunnelActive && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
          <div className="bg-green-500 text-white rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              {/* Green play icon */}
              <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7z" />
                </svg>
              </div>
              
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">No Merchant is Live. Go to</h4>
                <p className="text-xs text-green-100 mb-2">
                  My Merchants → Select Merchant → Edit Merchant → Go Live!
                </p>
                
                {/* Close button */}
                <button
                  onClick={() => setShowNotification(false)}
                  className="text-green-100 hover:text-white transition-colors text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

