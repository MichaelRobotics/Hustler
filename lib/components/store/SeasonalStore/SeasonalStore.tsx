"use client";

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useSeasonalStoreDatabase } from '@/lib/hooks/useSeasonalStoreDatabase';
import { useElementHeight } from '@/lib/hooks/useElementHeight';
import { useTheme } from '../../common/ThemeProvider';
import AIFunnelBuilderPage from '../../funnelBuilder/AIFunnelBuilderPage';
import { FloatingAsset as FloatingAssetType, FixedTextStyles, LegacyTheme } from './types';
import { ProductCard } from './components/ProductCard';
import { FloatingAsset } from './components/FloatingAsset';
import { AdminAssetSheet } from './components/AdminAssetSheet';
import { TopNavbar } from './components/TopNavbar';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ProductShowcase } from './components/ProductShowcase';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { TemplateSaveNotification } from './components/TemplateSaveNotification';
import { ThemeGenerationNotification } from './components/ThemeGenerationNotification';
import { MakePublicNotification } from './components/MakePublicNotification';
import { TemplateLimitNotification } from './components/TemplateLimitNotification';
import { PromoButton } from './components/PromoButton';
import { ProductEditorModal } from './components/ProductEditorModal';
import { TextEditorModal } from './components/TextEditorModal';
import { ButtonColorControls } from './components/ButtonColorControls';
import { LogoSection } from './components/LogoSection';
import { StoreResourceLibrary } from '../../products/StoreResourceLibrary';
import { StoreHeader } from './components/StoreHeader';
import { ConditionalReturns } from './components/ConditionalReturns';
import EmojiBank from './EmojiBank';
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
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { 
  generateProductText, 
  generateProductImage, 
  generateBackgroundImage, 
  generateResponsiveBackgroundImage,
  generateLogo, 
  generateEmojiMatch,
  fileToBase64 
} from './services/aiService';
import { uploadUrlToWhop } from '../../../utils/whop-image-upload';
import { useIframeDimensions } from './utils/iframeDimensions';
import { useBackgroundAnalysis } from './utils/backgroundAnalyzer';
import { useThemeUtils } from './hooks/useThemeUtils';
import { useProductNavigation } from './hooks/useProductNavigation';
import { useAIGeneration } from './hooks/useAIGeneration';
import { useProductImageUpload } from './hooks/useProductImageUpload';
import { useTemplateSave } from './hooks/useTemplateSave';
import { usePreviewLiveTemplate } from './hooks/usePreviewLiveTemplate';
import { useAutoAddResources } from './hooks/useAutoAddResources';
import { SyncChangesPopup } from './components/SyncChangesPopup';
import { convertThemeToLegacy, formatPrice, generateAssetId, truncateDescription } from './utils';
import SeasonalStoreChat from './components/SeasonalStoreChat';
import { apiGet } from '../../../utils/api-client';
import type { FunnelFlow } from '../../../types/funnel';
import type { AuthenticatedUser } from '../../../types/user';
import { deleteTheme as deleteThemeAction } from '../../../actions/themes-actions';

import type { UpdateSyncResult } from '../../../sync/update-product-sync';

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
  const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
  const [liveFunnel, setLiveFunnel] = useState<any>(null);
  const [isFunnelActive, setIsFunnelActive] = useState(false);
  const [isFunnelCheckComplete, setIsFunnelCheckComplete] = useState(false); // Track if funnel check is complete
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // FunnelBuilder view state
  const [showFunnelBuilder, setShowFunnelBuilder] = useState(false);
  
  // Store ResourceLibrary state
  const [showStoreResourceLibrary, setShowStoreResourceLibrary] = useState(false);
  
  // Preview mode state
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [isInPreviewMode, setIsInPreviewMode] = useState(false);
  
  // Determine if we're in preview mode (either from prop or internal state)
  const effectiveIsStorePreview = isStorePreview || isInPreviewMode;
  
  // Track unsaved changes
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  
  // ResourceLibrary integration state
  const [resourceLibraryProducts, setResourceLibraryProducts] = useState<any[]>([]);
  const [hasLoadedResourceLibrary, setHasLoadedResourceLibrary] = useState(false);
  const [deletedResourceLibraryProducts, setDeletedResourceLibraryProducts] = useState<Record<string, Set<string>>>({});
  
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
    themeProducts,
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
    setThemeProducts,
    setError,
    
    // Product Management - REMOVED (frontend-only now)
    
    // Asset Management
    addFloatingAsset,
    updateFloatingAsset,
    deleteFloatingAsset,
    
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
    loadTemplate,
    deleteTemplate,
    setLiveTemplate,
    
    // Theme Management
    createTheme,
    updateTheme,
    
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
    setIsStoreContentReady,
    
    // Store Navigation State Management
    lastActiveTheme,
    lastActiveTemplate,
    saveLastActiveTheme,
    saveLastActiveTemplate,
    restoreLastActiveState,
    
    // Theme loading
    loadThemes,
  } = useSeasonalStoreDatabase(experienceId || 'default-experience');
  
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
  
  // Use only products that are in the current theme
  const combinedProducts = useMemo(() => {
    const themeProductsList = themeProducts[currentSeason] || [];
    console.log(`[SeasonalStore] Displaying ${themeProductsList.length} theme products`);
    return [...themeProductsList];
  }, [themeProducts, currentSeason]);
  
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
  
  // Frontend product management functions (no database calls)
  const addProduct = useCallback(() => {
    const newProduct = {
      id: Date.now(),
      name: 'New Product',
      description: 'Product description',
      price: 0,
      image: 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
      buttonText: 'VIEW DETAILS',
      buttonLink: '',
      cardClass: legacyTheme.card,
      titleClass: legacyTheme.text,
      descClass: legacyTheme.text,
      buttonClass: legacyTheme.accent,
    };
    
    // Update themeProducts
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: [newProduct, ...(prev[currentSeason] || [])]
    }));
    
    console.log('🔄 Added product to themeProducts:', newProduct);
  }, [legacyTheme, currentSeason, setThemeProducts]);
  
  const updateProduct = useCallback((id: number | string, updates: any) => {
    console.log('🔄 Updating product:', id, updates);
    
    // All products (both ResourceLibrary and frontend) are now managed through themeProducts
    console.log('🔄 Updating product in themeProducts state');
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: (prev[currentSeason] || []).map((p: any) =>
        p.id === id ? { ...p, ...updates } : p
      )
    }));
    
    console.log('🔄 Product updated successfully in themeProducts');
  }, [currentSeason, setThemeProducts]);
  
  // deleteProduct function moved after handleDeleteResourceLibraryProduct is defined

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
    setThemeProducts,
    currentSeason,
    backgroundAttachmentUrl: backgroundAttachmentUrl ?? undefined,
    generatedBackground: generatedBackground ?? undefined,
    uploadedBackground: uploadedBackground ?? undefined,
    logoAttachmentUrl: logoAttachmentUrl ?? undefined,
    iframeDimensions: iframeDimensions ?? undefined,
    toggleEditorView,
  });

  // Custom add product function that resets index to show new product at front
  const handleAddProduct = useCallback(() => {
    // Show StoreResourceLibrary instead of adding product directly
    setShowStoreResourceLibrary(true);
  }, []);

  // Get the same filtered products that SeasonalStore uses
  const getFilteredPaidResources = useCallback(() => {
    if (!experienceId || allResources.length === 0) return [];
    
    return allResources.filter(resource => 
      resource.category === "PAID" && 
      resource.name && 
      resource.price
    );
  }, [experienceId, allResources]);

  // Store ResourceLibrary handlers will be declared after handleProductImageUpload

  const handleRemoveFromTheme = useCallback((resource: any) => {
    const productId = `resource-${resource.id}`;
    
    // Only remove from theme products (not from resourceLibraryProducts)
    // This way the product stays in Market Stall but is removed from SeasonalStore
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: (prev[currentSeason] || []).filter(p => p.id !== productId)
    }));
    
    console.log('🔄 Removed resource from theme (kept in Market Stall):', resource.name);
  }, [currentSeason, setThemeProducts]);

  const isResourceInTheme = useCallback((resourceId: string) => {
    const productId = `resource-${resourceId}`;
    
    // Check if the product exists in the current theme's products (authoritative source)
    const currentThemeProducts = themeProducts[currentSeason] || [];
    const isInThemeProducts = currentThemeProducts.some(p => p.id === productId);
    
    console.log('🔍 isResourceInTheme check:', {
      resourceId,
      productId,
      isInThemeProducts,
      currentSeason,
      themeProductsCount: currentThemeProducts.length
    });
    
    return isInThemeProducts;
  }, [themeProducts, currentSeason]);


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
    targetId: keyof FixedTextStyles;
  }>({
    isOpen: false,
    targetId: 'mainHeader'
  });









  // Use promo button state from database hook
  const promoButton = dbPromoButton;
  const setPromoButton = setDbPromoButton;

  // Use preview live template hook
  // CRITICAL: Pass Market Stall resources to filter template products
  // Use previewTemplate if in preview mode, otherwise use previewLiveTemplate prop
  const activePreviewTemplate = isInPreviewMode ? previewTemplate : previewLiveTemplate;
  const { isTemplateLoaded } = usePreviewLiveTemplate({
    previewLiveTemplate: activePreviewTemplate,
    onTemplateLoaded,
    setBackground,
    setLogoAsset,
    setFixedTextStyles,
    setThemeProducts,
    setPromoButton,
    allResources, // Market Stall resources for filtering
    experienceId, // For fetching Market Stall if allResources not available
  });






  // Use product image upload hook
  const { handleProductImageUpload } = useProductImageUpload({
    setUploadingImage,
    setError,
    setThemeProducts,
    updateProduct,
    currentSeason,
  });

  // Store ResourceLibrary handlers
  const handleAddToTheme = useCallback(async (resource: any) => {
    console.log('🔄 Adding resource to theme:', resource.name, 'ID:', resource.id);
    
    // Convert resource to product format and add to theme
    const newProduct = {
      id: `resource-${resource.id}`,
      name: resource.name,
      description: resource.description || '',
      price: parseFloat(resource.price) || 0,
      image: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
      buttonText: 'VIEW DETAILS',
      buttonLink: resource.link || '',
      cardClass: legacyTheme.card,
      titleClass: legacyTheme.text,
      descClass: legacyTheme.text,
      buttonClass: legacyTheme.accent,
    };
    
    console.log('🔄 Created new product:', newProduct);
    
    // Add to theme products (this will trigger database save)
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: [newProduct, ...(prev[currentSeason] || [])]
    }));
    
    // Trigger a reload of the theme to get complete resource data from database
    // This will cause the theme loading effect to run and load the complete resource data
    console.log('🔄 Added resource to theme, will trigger database reload:', resource.name);
  }, [legacyTheme, currentSeason, setThemeProducts, handleProductImageUpload]);

  // Template manager functions
  const openTemplateManager = () => setTemplateManagerOpen(true);
  const closeTemplateManager = () => setTemplateManagerOpen(false);
  const closeTemplateManagerAnimated = () => {
    setTemplateManagerAnimOpen(false);
    setTimeout(() => setTemplateManagerOpen(false), 300);
  };
  
  // Preview handler - loads template and enters preview mode
  const handlePreviewTemplate = useCallback(async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      console.error('Template not found:', templateId);
      return;
    }
    
    console.log('👁️ Entering preview mode for template:', template.name);
    
    // Set preview mode and template
    setIsInPreviewMode(true);
    setPreviewTemplate(template);
    
    // Switch to page view (not editor view) for preview
    if (editorState.isEditorView) {
      toggleEditorView();
    }
  }, [templates, editorState.isEditorView, toggleEditorView]);
  
  // Exit preview mode handler - also opens Store Manager modal
  const handleExitPreview = useCallback(() => {
    setIsInPreviewMode(false);
    setPreviewTemplate(null);
    // Switch back to editor view so buttons are visible
    if (!editorState.isEditorView) {
      toggleEditorView();
    }
    // Open Store Manager modal when exiting preview
    setTemplateManagerOpen(true);
  }, [editorState.isEditorView, toggleEditorView]);

  // Live funnel loading function
  const loadLiveFunnel = useCallback(async () => {
    if (!experienceId) return;
    
    try {
      console.log('[SeasonalStore] Loading live funnel for experience:', experienceId);
      const response = await apiGet(`/api/funnels/live`, experienceId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.hasLiveFunnel && data.funnelFlow) {
          // Create complete funnel data object like StorePreview does
          const funnelData = {
            id: data.funnel.id,
            name: data.funnel.name,
            flow: data.funnelFlow,
            isDeployed: data.funnel.isDeployed,
            resources: data.resources || []
          };
          setLiveFunnel(funnelData);
          setFunnelFlow(data.funnelFlow);
          setIsFunnelActive(true);
          console.log('[SeasonalStore] Live funnel loaded:', funnelData);
        } else {
          console.log('[SeasonalStore] No live funnel found for experience:', experienceId);
          setLiveFunnel(null);
          setFunnelFlow(null);
          setIsFunnelActive(false);
        }
      } else {
        console.log('[SeasonalStore] No live funnel found for experience:', experienceId);
        setLiveFunnel(null);
        setFunnelFlow(null);
        setIsFunnelActive(false);
      }
      
      // Mark funnel check as complete
      setIsFunnelCheckComplete(true);
    } catch (error) {
      console.error('[SeasonalStore] Error loading live funnel:', error);
      setLiveFunnel(null);
      setFunnelFlow(null);
      setIsFunnelActive(false);
      
      // Mark funnel check as complete even on error
      setIsFunnelCheckComplete(true);
    }
  }, [experienceId]);

  // Template save handler
  const handleSaveTemplate = useCallback((templateData: any) => {
    saveTemplate(templateData);
  }, [saveTemplate]);

  // Use template save hook
  const { handleSaveTemplateForNavbar } = useTemplateSave({
    saveTemplate,
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
    products: themeProducts[currentSeason] || [], // Use only products in current theme
    floatingAssets,
    promoButton,
    setError,
    allResources, // Pass allResources for ResourceLibrary product checking
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
      // Update snapshot after save
      const snapshot = JSON.stringify({
        products: themeProducts[currentSeason] || [],
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
      });
      setLastSavedSnapshot(snapshot);
      setHasUnsavedChanges(false);
    },
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

  // Wrapper for setLogoAsset to handle function signature mismatch
  const setLogoAssetWrapper = useCallback((fn: (prev: any) => any) => {
    const result = fn(logoAsset);
    setLogoAsset(result);
  }, [logoAsset, setLogoAsset]);


  // Detect unsaved changes
  useEffect(() => {
    if (!editorState.isEditorView || isInPreviewMode) {
      return; // Don't track changes in preview mode or page view
    }
    
    const currentSnapshot = JSON.stringify({
      products: themeProducts[currentSeason] || [],
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
    });
    
    if (lastSavedSnapshot === null) {
      // First time - set initial snapshot
      setLastSavedSnapshot(currentSnapshot);
      setHasUnsavedChanges(false);
    } else {
      // Compare with last saved snapshot
      setHasUnsavedChanges(currentSnapshot !== lastSavedSnapshot);
    }
  }, [
    themeProducts,
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
    lastSavedSnapshot,
    editorState.isEditorView,
    isInPreviewMode,
  ]);

  // Reset snapshot when template is loaded (to avoid false positives)
  useEffect(() => {
    if (isTemplateLoaded && !isInPreviewMode) {
      // Template has been loaded, reset snapshot to current state
      const snapshot = JSON.stringify({
        products: themeProducts[currentSeason] || [],
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
      });
      setLastSavedSnapshot(snapshot);
      setHasUnsavedChanges(false);
    }
  }, [isTemplateLoaded, isInPreviewMode]);

  // Load live funnel on mount
  useEffect(() => {
    console.log('[SeasonalStore] useEffect triggered, experienceId:', experienceId);
    loadLiveFunnel();
  }, [loadLiveFunnel]);

  // Save current state when theme or template changes
  useEffect(() => {
    if (currentSeason) {
      saveLastActiveTheme(currentSeason);
      console.log(`💾 Auto-saving current theme: ${currentSeason}`);
    }
  }, [currentSeason, saveLastActiveTheme]);

  useEffect(() => {
    if (liveTemplate) {
      saveLastActiveTemplate(liveTemplate);
      console.log(`💾 Auto-saving current template: ${liveTemplate.name}`);
    }
  }, [liveTemplate, saveLastActiveTemplate]);

  // Restore last active state when store loads (but only if no live template is being loaded)
  useEffect(() => {
    if (isStoreContentReady && !liveTemplate && lastActiveTemplate) {
      console.log(`🔄 Restoring last active state on store load`);
      restoreLastActiveState();
    }
  }, [isStoreContentReady, liveTemplate, lastActiveTemplate, restoreLastActiveState]);

  // Restore last active state when store becomes active (user switches back to store view)
  useEffect(() => {
    if (isActive && isStoreContentReady && !liveTemplate && lastActiveTemplate) {
      console.log(`🔄 Restoring last active state - store became active`);
      restoreLastActiveState();
    }
  }, [isActive, isStoreContentReady, liveTemplate, lastActiveTemplate, restoreLastActiveState]);

  // Load ResourceLibrary products on mount and when theme changes
  useEffect(() => {
    if (!experienceId || allResources.length === 0) return;
    
    console.log('[SeasonalStore] Loading ResourceLibrary products, experienceId:', experienceId, 'theme:', currentSeason, 'themeName:', theme?.name || 'No theme loaded');
    
    // Filter for "Paid" products only and exclude deleted ones for current theme
    const paidResources = allResources.filter(resource => 
      resource.category === "PAID" && 
      resource.name && 
      resource.price &&
      !(deletedResourceLibraryProducts[currentSeason]?.has(resource.id)) // Exclude deleted products for current theme only
    );
    
    console.log(`[SeasonalStore] Found ${paidResources.length} paid resources (${allResources.filter(r => r.category === "PAID" && r.name && r.price).length - paidResources.length} deleted in ${currentSeason})`);
    console.log('[SeasonalStore] Deleted resource IDs for current theme:', Array.from(deletedResourceLibraryProducts[currentSeason] || []));
    console.log('[SeasonalStore] All theme deletions:', Object.keys(deletedResourceLibraryProducts).map(theme => `${theme}: ${Array.from(deletedResourceLibraryProducts[theme] || []).length} deleted`));
    console.log('[SeasonalStore] Sample resource data:', paidResources[0]);
    console.log('[SeasonalStore] Sample price data:', paidResources[0]?.price, 'parsed:', paidResources[0]?.price ? parseFloat(paidResources[0].price) : 'N/A', 'formatted:', paidResources[0]?.price ? `$${(Math.round(parseFloat(paidResources[0].price) * 100) / 100).toFixed(2)}` : 'N/A');
    console.log('[SeasonalStore] Current theme properties:', {
      name: theme?.name || 'No theme loaded',
      accent: theme?.accent || 'default',
      card: theme?.card || 'default',
      text: theme?.text || 'default'
    });
    
    // Convert ResourceLibrary products to SeasonalStore format
    const convertedProducts = paidResources.map((resource, index) => {
      // Format price with dollar sign and ensure cents are shown
      const rawPrice = resource.price ? parseFloat(resource.price) : 0;
      const formattedPrice = Math.round(rawPrice * 100) / 100; // Ensure 2 decimal places
      
      console.log(`[SeasonalStore] Converting ResourceLibrary product ${resource.name}:`, {
        id: resource.id,
        name: resource.name,
        image: resource.image,
        hasImage: !!resource.image,
        imageType: typeof resource.image
      });
      
      // Use the current theme's styling (don't override name, description, image)
      return {
        id: `resource-${resource.id}`,
        name: resource.name, // Keep original name
        description: truncateDescription(resource.description || ''), // Truncate description to 2 lines
        price: formattedPrice,
        image: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp', // Keep original image or use placeholder
        imageAttachmentUrl: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp', // Map to imageAttachmentUrl for ProductCard
        buttonText: 'View Details',
        buttonClass: theme?.accent || 'bg-indigo-500', // Use theme's accent color
        buttonLink: resource.link, // Always use the resource link for navigation
        whopProductId: resource.whopProductId, // Track Whop product ID for synced products
        // Use theme's styling for everything else
        cardClass: theme?.card || 'bg-white', // Use theme's card styling
        titleClass: theme?.text || 'text-gray-900', // Use theme's text color
        descClass: theme?.text || 'text-gray-600', // Use theme's text color
        buttonAnimColor: theme?.accent?.includes('blue') ? 'blue' : 
                        theme?.accent?.includes('yellow') ? 'yellow' :
                        theme?.accent?.includes('orange') ? 'orange' :
                        theme?.accent?.includes('red') ? 'red' :
                        theme?.accent?.includes('pink') ? 'pink' :
                        theme?.accent?.includes('cyan') ? 'cyan' :
                        'indigo' // Default fallback
      };
    });
    
    setResourceLibraryProducts(convertedProducts);
    setHasLoadedResourceLibrary(true);
    
    console.log(`[SeasonalStore] Converted ${convertedProducts.length} ResourceLibrary products (no default products)`);
    console.log('[SeasonalStore] Sample converted product:', convertedProducts[0]);
    console.log('[SeasonalStore] Sample converted price:', convertedProducts[0]?.price, 'formatted as:', convertedProducts[0]?.price ? `$${convertedProducts[0].price.toFixed(2)}` : 'N/A');
    console.log('[SeasonalStore] Sample converted image:', convertedProducts[0]?.image, 'imageAttachmentUrl:', convertedProducts[0]?.imageAttachmentUrl);
    
  }, [experienceId, allResources, currentSeason, deletedResourceLibraryProducts]);

  // Debug chat state
  useEffect(() => {
    console.log('[SeasonalStore] Chat state changed:', {
      isChatOpen,
      funnelFlow: !!funnelFlow,
      isFunnelActive,
      experienceId
    });
  }, [isChatOpen, funnelFlow, isFunnelActive, experienceId]);


  const handleRemoveSticker = useCallback((productId: number | string) => {
    updateProduct(productId, { containerAsset: undefined });
  }, [updateProduct]);

  // Handle delete for ResourceLibrary products
  const handleDeleteResourceLibraryProduct = useCallback((productId: string) => {
    // Extract the original resource ID from the product ID
    const resourceId = productId.replace('resource-', '');
    
    // Only remove from theme products (NOT from resourceLibraryProducts)
    // This way the product stays in Market Stall but is removed from SeasonalStore
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: (prev[currentSeason] || []).filter(product => product.id !== productId)
    }));
    
    // Track this product as deleted for the current theme only
    setDeletedResourceLibraryProducts(prev => ({
      ...prev,
      [currentSeason]: new Set([...(prev[currentSeason] || []), resourceId])
    }));
    
    console.log(`[SeasonalStore] Removed ResourceLibrary product from theme (kept in Market Stall): ${productId} (resource ID: ${resourceId}) from theme: ${currentSeason}`);
  }, [currentSeason, setThemeProducts]);

  // Load products from theme when theme changes (initial load from DB)
  useEffect(() => {
    // Get products from themeProducts for current season
    const currentThemeProducts = themeProducts?.[currentSeason] || [];
    if (currentThemeProducts.length > 0) {
      console.log(`[SeasonalStore] Loading ${currentThemeProducts.length} products from theme:`, currentSeason);
      
      // Debug: Log buttonLink data in themeProducts
      currentThemeProducts.forEach((product, index) => {
        console.log(`[SeasonalStore] 🔍 Theme product ${index + 1} (${product.name}):`, {
          id: product.id,
          hasButtonLink: !!product.buttonLink,
          buttonLink: product.buttonLink,
          isResourceProduct: typeof product.id === 'string' && product.id.startsWith('resource-')
        });
      });
      
      // Separate ResourceLibrary products from frontend products
      const resourceLibraryProducts = currentThemeProducts.filter(product => 
        typeof product.id === 'string' && product.id.startsWith('resource-')
      );
      const frontendOnlyProducts = currentThemeProducts.filter(product => 
        !(typeof product.id === 'string' && product.id.startsWith('resource-'))
      );
      
      console.log(`[SeasonalStore] Separated products:`, {
        resourceLibrary: resourceLibraryProducts.length,
        frontend: frontendOnlyProducts.length,
        total: currentThemeProducts.length
      });
      
      // Debug: Check buttonLink in resourceLibraryProducts before setting state
      if (resourceLibraryProducts.length > 0) {
        resourceLibraryProducts.forEach((product, index) => {
          console.log(`[SeasonalStore] 🔍 ResourceLibrary product ${index + 1} (${product.name}) before setting state:`, {
            id: product.id,
            hasButtonLink: !!product.buttonLink,
            buttonLink: product.buttonLink
          });
        });
      }
      
      // Load ResourceLibrary products into resourceLibraryProducts state
      if (resourceLibraryProducts.length > 0) {
        console.log(`[SeasonalStore] Loading ${resourceLibraryProducts.length} ResourceLibrary products`);
        
        // Fix: Restore buttonLink from allResources if missing
        const productsWithLinks = resourceLibraryProducts.map(product => {
          // If buttonLink is missing, try to find it in allResources
          if (!product.buttonLink && typeof product.id === 'string' && product.id.startsWith('resource-')) {
            const resourceId = product.id.replace('resource-', '');
            const matchingResource = allResources.find(r => r.id === resourceId);
            
            if (matchingResource?.link) {
              console.log(`[SeasonalStore] 🔧 Restoring buttonLink for product "${product.name}" from resource:`, matchingResource.link);
              return {
                ...product,
                buttonLink: matchingResource.link
              };
            } else {
              console.warn(`[SeasonalStore] ⚠️ Could not find resource ${resourceId} in allResources to restore buttonLink for product "${product.name}"`);
            }
          }
          return product;
        });
        
        // Update both resourceLibraryProducts state AND themeProducts to persist the fix
        setResourceLibraryProducts(productsWithLinks);
        
        // Also update themeProducts to persist the restored buttonLink
        if (productsWithLinks.some(p => p.buttonLink && !resourceLibraryProducts.find(op => op.id === p.id && op.buttonLink))) {
          console.log(`[SeasonalStore] 🔧 Updating themeProducts to persist restored buttonLinks`);
          setThemeProducts(prev => ({
            ...prev,
            [currentSeason]: (prev[currentSeason] || []).map(product => {
              const restoredProduct = productsWithLinks.find(p => p.id === product.id);
              if (restoredProduct && restoredProduct.buttonLink && !product.buttonLink) {
                return restoredProduct;
              }
              return product;
            })
          }));
        }
      }
      
      // Load frontend products into frontendProducts state
      if (frontendOnlyProducts.length > 0) {
        console.log(`[SeasonalStore] Loading ${frontendOnlyProducts.length} frontend products`);
        // Frontend products are now handled through resourceLibraryProducts
      }
    }
  }, [themeProducts, currentSeason, allResources]);

  // Use auto-add resources hook
  // IMPORTANT: allResources prop MUST contain ONLY Market Stall (global ResourceLibrary) products
  // This ensures auto-add ONLY uses Market Stall products, not funnel-specific products
  const { hasAutoAddedResources, isAutoAddComplete } = useAutoAddResources({
    allResources, // Market Stall (global ResourceLibrary) products only
    hasLoadedResourceLibrary,
    currentSeason,
    themeProducts,
    deletedResourceLibraryProducts,
    legacyTheme,
    setThemeProducts,
    handleProductImageUpload,
    templateResourceLibraryProductIds, // Pass template ResourceLibrary product IDs
    setIsStoreContentReady, // Pass callback to notify when store content is ready
    isTemplateLoaded, // Pass internal template loaded state
  });

  // Store Loading Logic: Wait for content to be ready before showing store
  // - If live template exists: loads live template data
  // - If no live template: auto-adds synced WHOP products as default
  // - Store only renders when content is ready (no default Fall theme flash)
  const isProductsReady = isInitialLoadComplete; // Products are ready when initial load completes
  
  // Promo button is ready when store content is ready
  const isPromoButtonReady = isStoreContentReady;

  // Combined delete handler that routes to appropriate delete function
  const deleteProduct = useCallback((productId: number | string) => {
    if (typeof productId === 'string' && productId.startsWith('resource-')) {
      // This is a ResourceLibrary product
      handleDeleteResourceLibraryProduct(productId);
    } else {
      // This is a regular SeasonalStore product - update both states
      setThemeProducts(prev => ({
        ...prev,
        [currentSeason]: (prev[currentSeason] || []).filter(product => product.id !== productId)
      }));
      console.log('🔄 Deleted product from themeProducts:', productId);
    }
  }, [handleDeleteResourceLibraryProduct, currentSeason, setThemeProducts]);

  // Combined delete handler is now defined above with frontend product management

  // Drop Handlers
  const handleDropAsset = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.target instanceof HTMLElement && e.target.closest('.product-container-drop-zone')) return;
    if (!editorState.isEditorView) return;

    const assetJson = e.dataTransfer.getData("asset/json");
    if (!assetJson) return;

    const droppedAsset = JSON.parse(assetJson);
    const containerRect = appRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const newX = e.clientX - containerRect.left;
    const newY = e.clientY - containerRect.top;

    addFloatingAsset({
      ...droppedAsset,
      x: `${((newX / containerRect.width) * 100).toFixed(2)}%`,
      y: `${newY.toFixed(0)}px`,
    });

    setAvailableAssets(prev => prev.filter(a => a.id !== droppedAsset.id));
  }, [editorState.isEditorView, addFloatingAsset, setAvailableAssets]);

  const handleDropOnProduct = useCallback((e: React.DragEvent, productId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editorState.isEditorView) return;

    const assetJson = e.dataTransfer.getData("asset/json");
    if (!assetJson) return;

    const droppedAsset = JSON.parse(assetJson);
    
    updateProduct(productId, {
      containerAsset: {
        src: droppedAsset.src,
        alt: droppedAsset.alt,
        id: droppedAsset.id,
        scale: 1.0,
        rotation: 0,
      }
    });
    
    setAvailableAssets(prev => prev.filter(a => a.id !== droppedAsset.id));
  }, [editorState.isEditorView, updateProduct, setAvailableAssets]);

  // Drag Start Handler
  const handleDragStart = useCallback((e: React.DragEvent, asset: any) => {
    e.dataTransfer.setData("asset/json", JSON.stringify(asset));
    const dragImg = new Image(100, 100);
    dragImg.src = asset.src; 
    e.dataTransfer.setDragImage(dragImg, 50, 50);
  }, []);


  const { mainHeader, headerMessage, subHeader, promoMessage } = fixedTextStyles || {};




  useEffect(() => {
    // Always sync Claim button to current theme on theme change
    const ringToken = legacyTheme.accent.split(' ').find(cls => cls.startsWith('ring-') && !cls.startsWith('ring-offset')) || 'ring-indigo-400';
    setPromoButton(prev => ({
      ...prev,
      buttonClass: legacyTheme.accent,
      ringClass: ringToken,
      ringHoverClass: ringToken,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyTheme.accent]);

  // Keep all buttons (including Claim) in sync with theme changes when they still use previous theme accent
  const prevAccentRef = useRef(legacyTheme.accent);
  useEffect(() => {
    const prevAccent = prevAccentRef.current;
    if (prevAccent !== legacyTheme.accent) {
      // Update product buttons that were using previous theme accent
      const currentThemeProductsList = themeProducts[currentSeason] || [];
      currentThemeProductsList.forEach(product => {
        if (product.buttonClass === prevAccent) {
          updateProduct(product.id, { buttonClass: legacyTheme.accent });
        }
      });

      // Update claim button if it matched previous accent (or was empty)
      setPromoButton(prev => ({
        ...prev,
        buttonClass: (!prev.buttonClass || prev.buttonClass === prevAccent) ? legacyTheme.accent : prev.buttonClass,
        // If ring was derived from previous accent ring token, try to carry forward
        ringClass: prev.ringClass && prev.ringClass.includes(prevAccent.split(' ').find(c => c.startsWith('ring-') || '')!) ? (legacyTheme.accent.split(' ').find(c => c.startsWith('ring-') && !c.startsWith('ring-offset')) || prev.ringClass) : prev.ringClass,
        ringHoverClass: prev.ringHoverClass
      }));

      prevAccentRef.current = legacyTheme.accent;
    }
  }, [legacyTheme.accent, themeProducts, currentSeason, updateProduct]);






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
    // Only use WHOP attachment URL - no base64 fallbacks
    if (backgroundAttachmentUrl) {
      console.log('🎨 Using WHOP attachment background:', backgroundAttachmentUrl);
      return {
        backgroundImage: `url(${backgroundAttachmentUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        minHeight: '100vh',
        width: '100%',
        transition: 'background-image 0.5s ease-in-out, opacity 0.3s ease-in-out',
        opacity: 1
      };
    }
    // If no background image, use theme-specific placeholder
    // First check if theme has a custom placeholderImage (for custom themes)
    let placeholderUrl = (legacyTheme as any)?.placeholderImage || null;
    let placeholderFilter: string | undefined;
    
    // If no custom placeholder, use theme-specific placeholder
    if (!placeholderUrl) {
      placeholderUrl = 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
      
      // Use theme-specific placeholder if available
      if (currentSeason === 'Cyber Sale') {
      placeholderUrl = 'https://img-v2-prod.whop.com/Hyt2HKOnK0RRv7Y3AKEKx4D6q2pgaS6zIJ0O4nXz9IE/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/9bc22c82-ac07-4aa8-8a80-3609b273a384.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    } else if (currentSeason === 'Spring Renewal') {
      placeholderUrl = 'https://img-v2-prod.whop.com/rSJXS5NKttt8u2117kcOOwxIS6i46EjvNolcNoHEr0U/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/27a182d3-b2fb-4b67-9675-3361e7dd6820.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    } else if (currentSeason === 'Holiday Cheer') {
      placeholderUrl = 'https://img-v2-prod.whop.com/NZ7GNGGID4Xa4x8v6MggFBmA1OvefQKzR51uNiE4ZF8/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/ac7a903a-f73f-4c15-a3b8-62dcf5337742.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    } else if (currentSeason === 'Fall' || currentSeason === 'Spooky Night') {
      placeholderUrl = 'https://img-v2-prod.whop.com/aqN_MUYyIWK1YPCflECQlExGsDTd_rftFEEh4zp59vI/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/3a3e7c27-e3aa-43fb-8bbd-d18ef28f7e33.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    } else if (currentSeason === 'Summer') {
      placeholderUrl = 'https://img-v2-prod.whop.com/43qiVSNwFVt0p1Yl0FwS76ArpS_MaMTP0vN5fVz3svA/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/96ffbe3b-f279-4850-9ae3-5aa471201ea4.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    } else if (currentSeason === 'Winter' || currentSeason === 'Winter Frost') {
      placeholderUrl = 'https://img-v2-prod.whop.com/Ni_KZbrHHlNz2gw5zWinFI1_s4Q7mZ92vVANhQCu9eQ/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-30/db5bf662-2cdf-461d-b55c-7d20e77c6662.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    } else if (currentSeason === 'Autumn' || currentSeason === 'Autumn Harvest') {
      placeholderUrl = 'https://img-v2-prod.whop.com/zx2JzitsjsKHimZ-sTR6BLdvR7Ecn41Hzy1JPOUt7-c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-11-04/6911df86-f29f-4e0f-ace6-43e20f9a3820.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    } else if (currentSeason === 'Black Friday') {
      placeholderUrl = 'https://img-v2-prod.whop.com/LpAWtPhmyrvfSLDlQbkLwzdL4wwZI_9R4RJtSjIukeQ/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-11-04/edbb3d96-0248-4ecf-8345-921c100a064d.png';
      placeholderFilter = 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)';
    }
    }
    
    console.log('🎨 No background image, using placeholder for theme:', currentSeason, placeholderUrl ? '(custom placeholder)' : '(default placeholder)');
    return {
      backgroundImage: `url(${placeholderUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      width: '100%',
      transition: 'background-image 0.5s ease-in-out, opacity 0.3s ease-in-out',
      opacity: 1,
      filter: placeholderFilter
    };
  }, [backgroundAttachmentUrl, currentSeason, legacyTheme]);

  // Product editor slide-over state
  const [productEditor, setProductEditor] = useState<{ isOpen: boolean; productId: number | string | null; target: 'name' | 'description' | 'card' | 'button' | null }>({ isOpen: false, productId: null, target: null });
  const openProductEditor = (productId: number | string | null, target: 'name' | 'description' | 'card' | 'button') => setProductEditor({ isOpen: true, productId, target });
  const closeProductEditor = () => setProductEditor({ isOpen: false, productId: null, target: null });


  // Slide-over animations (match AdminAssetSheet feel)
  const [textSheetAnimOpen, setTextSheetAnimOpen] = useState(false);
  // Initialize animation state to match initial isAdminSheetOpen state (true)
  const [adminSheetAnimOpen, setAdminSheetAnimOpen] = useState(editorState.isAdminSheetOpen);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateManagerAnimOpen, setTemplateManagerAnimOpen] = useState(false);
  
  // Template save notification state
  const [templateSaveNotification, setTemplateSaveNotification] = useState<{
    isOpen: boolean;
    isSaving: boolean;
    templateName: string;
  }>({ isOpen: false, isSaving: false, templateName: '' });

  const [themeGenerationNotification, setThemeGenerationNotification] = useState<{
    isOpen: boolean;
    isGenerating: boolean;
    themeName: string;
  }>({ isOpen: false, isGenerating: false, themeName: '' });
  
  // Make public notification state
  const [makePublicNotification, setMakePublicNotification] = useState<{
    isOpen: boolean;
    templateName: string;
  }>({ isOpen: false, templateName: '' });

  // Template limit notification state
  const [templateLimitNotification, setTemplateLimitNotification] = useState(false);
  
  // Highlighted template state
  const [highlightedTemplateId, setHighlightedTemplateId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (editingText.isOpen) {
      // next tick to trigger transition
      const id = requestAnimationFrame(() => setTextSheetAnimOpen(true));
      return () => cancelAnimationFrame(id);
    } else {
      setTextSheetAnimOpen(false);
    }
  }, [editingText.isOpen]);


  // Close modal when clicking outside the edit panel
  useEffect(() => {
    if (!editingText.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is on the edit panel or inside it
      const editPanel = document.querySelector('[role="dialog"][aria-label="Edit Text"]');
      if (editPanel && editPanel.contains(target)) {
        return; // Don't close if clicking inside the edit panel
      }
      // Close the modal
      closeTextEditorAnimated();
    };

    // Add small delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [editingText.isOpen]);

  // Close product editor modal when clicking outside the edit panel
  useEffect(() => {
    if (!productEditor.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is on the product edit panel or inside it
      const productEditPanel = document.querySelector('[role="dialog"][aria-label="Edit Product"]');
      if (productEditPanel && productEditPanel.contains(target)) {
        return; // Don't close if clicking inside the product edit panel
      }
      // Close the modal
      closeProductEditorAnimated();
    };

    // Add small delay to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [productEditor.isOpen]);

  useEffect(() => {
    if (templateManagerOpen) {
      const id = requestAnimationFrame(() => setTemplateManagerAnimOpen(true));
      return () => cancelAnimationFrame(id);
    } else {
      setTemplateManagerAnimOpen(false);
    }
  }, [templateManagerOpen]);

  useEffect(() => {
    if (editorState.isAdminSheetOpen) {
      // next tick to trigger transition
      const id = requestAnimationFrame(() => setAdminSheetAnimOpen(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAdminSheetAnimOpen(false);
    }
  }, [editorState.isAdminSheetOpen]);

  const closeTextEditorAnimated = () => {
    setTextSheetAnimOpen(false);
    setTimeout(() => setEditingText({ isOpen: false, targetId: 'mainHeader' }), 500);
  };

  const closeAdminSheetAnimated = () => {
    setAdminSheetAnimOpen(false);
    setTimeout(() => toggleAdminSheet(), 500);
  };

  const [productSheetAnimOpen, setProductSheetAnimOpen] = useState(false);
  useEffect(() => {
    if (productEditor.isOpen) {
      const id = requestAnimationFrame(() => setProductSheetAnimOpen(true));
      return () => cancelAnimationFrame(id);
    } else {
      setProductSheetAnimOpen(false);
    }
  }, [productEditor.isOpen]);

  const closeProductEditorAnimated = () => {
    setProductSheetAnimOpen(false);
    setTimeout(() => closeProductEditor(), 500);
  };

  // Inline text editing on page
  const [inlineEditTarget, setInlineEditTarget] = useState<null | 'headerMessage' | 'subHeader' | 'promoMessage' | 'productName' | 'productDesc' | 'buttonText'>(null);
  const [inlineProductId, setInlineProductId] = useState<number | null>(null);
  const headerInputRef = useRef<HTMLInputElement | null>(null);
  const subHeaderInputRef = useRef<HTMLTextAreaElement | null>(null);
  const promoInputRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Generate background button location state
  const [showGenerateBgInNavbar, setShowGenerateBgInNavbar] = useState(true); // Start in navbar
  
  // State for coordinating with ConditionalReturns loading
  const [isConditionalReturnsReady, setIsConditionalReturnsReady] = useState(false);
  
  useEffect(() => {
    if (inlineEditTarget === 'headerMessage') headerInputRef.current?.focus();
    if (inlineEditTarget === 'subHeader') subHeaderInputRef.current?.focus();
    if (inlineEditTarget === 'promoMessage') promoInputRef.current?.focus();
  }, [inlineEditTarget]);


  // Exit inline editing when clicking outside the active input/textarea
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!inlineEditTarget) return;
      const target = e.target as HTMLElement;
      const isInsideHeader = headerInputRef.current && headerInputRef.current.contains(target as Node);
      const isInsideSub = subHeaderInputRef.current && subHeaderInputRef.current.contains(target as Node);
      const isInsidePromo = promoInputRef.current && promoInputRef.current.contains(target as Node);
      const isInsideProdName = inlineEditTarget === 'productName' && inlineProductId !== null && !!target.closest(`[data-inline-product-name="${inlineProductId}"]`);
      const isInsideProdDesc = inlineEditTarget === 'productDesc' && inlineProductId !== null && !!target.closest(`[data-inline-product-desc="${inlineProductId}"]`);
      if (!isInsideHeader && !isInsideSub && !isInsidePromo && !isInsideProdName && !isInsideProdDesc) {
        setInlineEditTarget(null);
        setInlineProductId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inlineEditTarget, inlineProductId]);

  // While in edit mode, clicking any text opens inline editing instead of opening the modal again
  const beginInlineFromPanel = (target: 'headerMessage' | 'subHeader' | 'promoMessage') => {
    // Close the modal first
    setEditingText({ isOpen: false, targetId: 'mainHeader' });
    // Then activate inline editing with a small delay to ensure modal closes first
    setTimeout(() => {
      setInlineEditTarget(target);
    }, 100);
  };

  // Wrapper functions for component prop type mismatches
  const setInlineEditTargetWrapper = useCallback((target: string | null) => {
    setInlineEditTarget(target as any);
  }, [setInlineEditTarget]);

  const setEditingTextWrapper = useCallback((state: { isOpen: boolean; targetId: string }) => {
    setEditingText(state as any);
  }, [setEditingText]);

  const applyThemeColorsToTextWrapper = useCallback((text: any, type: string) => {
    return applyThemeColorsToText(text, type as any);
  }, [applyThemeColorsToText]);


  // Ref wrappers to handle null types
  const headerInputRefWrapper = headerInputRef as React.RefObject<HTMLInputElement>;
  const subHeaderInputRefWrapper = subHeaderInputRef as React.RefObject<HTMLTextAreaElement>;
  const promoInputRefWrapper = promoInputRef as React.RefObject<HTMLTextAreaElement>;

  // Product wrapper to handle type mismatch
  const productsWrapper = (themeProducts[currentSeason] || []).map(product => ({
    ...product,
    buttonText: product.buttonText || '',
    buttonLink: product.buttonLink || '',
    cardClass: product.cardClass || '',
    titleClass: product.titleClass || '',
    descClass: product.descClass || '',
    buttonClass: product.buttonClass || ''
  }));

  // Function wrappers for parameter mismatches
  const handleDropOnProductWrapper = useCallback((productId: number | string, asset: any) => {
    // This is a simplified version - the original function expects a drag event
    console.log('Drop on product:', productId, asset);
  }, []);

  const deleteProductWrapper = useCallback((product: any) => {
    deleteProduct(product.id);
  }, [deleteProduct]);

  const openProductEditorWrapper = useCallback((id: number | string | null, target: string) => {
    openProductEditor(id, target as any);
  }, [openProductEditor]);

  // ALL CONDITIONAL RETURNS MUST BE AFTER ALL HOOKS
  // Use ConditionalReturns component to handle all conditional rendering
  const conditionalReturn = ConditionalReturns({
    // FunnelBuilder props
    showFunnelBuilder,
    liveFunnel,
    setShowFunnelBuilder,
    setLiveFunnel,
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
    themeProducts,
    allResources,
    setAllResources,
    handleAddToTheme,
    handleRemoveFromTheme,
    isResourceInTheme,
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
          className={`min-h-screen font-inter antialiased relative overflow-y-auto overflow-x-hidden transition-all duration-700 ${!uploadedBackground && !generatedBackground && !legacyTheme.backgroundImage ? legacyTheme.background : ''} ${editorState.isEditorView ? 'cursor-pointer' : ''}`}
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
        toggleEditorView={toggleEditorView}
        handleGenerateBgClick={handleGenerateBgClick}
        handleBgImageUpload={handleBgImageUpload}
        handleSaveTemplate={handleSaveTemplateForNavbar}
        toggleAdminSheet={toggleAdminSheet}
        openTemplateManager={openTemplateManager}
        handleAddProduct={handleAddProduct}
        setIsChatOpen={setIsChatOpen}
        setCurrentSeason={setCurrentSeason}
        getHoverRingClass={getHoverRingClass}
        getGlowBgClass={getGlowBgClass}
        getGlowBgStrongClass={getGlowBgStrongClass}
      />



      <LoadingOverlay loadingState={loadingState} />


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
            handleUpdateTheme={async (season, updates) => {
              try {
                console.log('🎨 Updating theme for season:', season, updates);
                
                // Find existing theme for this season
                const existingTheme = themes.find(t => t.season === season);
                
                if (existingTheme) {
                  // Update existing theme
                  console.log('📝 Updating existing theme:', existingTheme.id);
                  await updateTheme(existingTheme.id, {
                    name: updates.name || existingTheme.name,
                    themePrompt: updates.themePrompt,
                    accentColor: updates.accent,
                    ringColor: updates.accent
                  });
                } else {
                  // Create new theme for this season
                  console.log('🆕 Creating new theme for season:', season);
                  const newTheme = await createTheme({
                    name: updates.name || `${season} Custom Theme`,
                    season: season,
                    themePrompt: updates.themePrompt || '',
                    accentColor: updates.accent || 'bg-blue-600',
                    ringColor: updates.accent || 'bg-blue-600'
                  });
                  console.log('✅ Created new theme:', newTheme.id);
                }
                
                // Update local state
                setAllThemes(prev => ({
                  ...prev,
                  [season]: {
                    ...prev[season],
                    ...updates
                  }
                }));
                
                console.log('✅ Theme updated successfully');
              } catch (error) {
                console.error('❌ Failed to update theme:', error);
                setError(`Failed to update theme: ${(error as Error).message}`);
              }
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
          logoAsset={logoAsset}
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
          setInlineEditTarget={setInlineEditTargetWrapper}
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
          inlineEditTarget={inlineEditTarget}
          inlineProductId={inlineProductId}
          isProductsReady={isProductsReady}
          navigateToPrevious={navigateToPrevious}
          navigateToNext={navigateToNext}
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
        {floatingAssets.map(asset => (
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
        isAnimating={textSheetAnimOpen}
        editingText={editingText}
        fixedTextStyles={fixedTextStyles}
        backgroundAnalysis={backgroundAnalysis}
        legacyTheme={legacyTheme}
        onClose={closeTextEditorAnimated}
        setFixedTextStyles={setFixedTextStyles}
        getThemeQuickColors={getThemeQuickColors}
      />

      <ProductEditorModal
        isOpen={productEditor.isOpen}
        isAnimating={productSheetAnimOpen}
        productEditor={productEditorWrapper}
                      products={(themeProducts[currentSeason] || []) as any}
        promoButton={promoButton}
        legacyTheme={legacyTheme}
        backgroundAnalysis={backgroundAnalysis}
        onClose={closeProductEditorAnimated}
                      updateProduct={updateProduct}
                      setPromoButton={setPromoButton}
                    />


      <TemplateManagerModal
        isOpen={templateManagerOpen}
        isAnimating={templateManagerAnimOpen}
        templates={templates}
        liveTemplate={liveTemplate}
        highlightedTemplateId={highlightedTemplateId}
        backgroundAnalysis={backgroundAnalysis}
        onClose={closeTemplateManagerAnimated}
        loadTemplate={loadTemplate}
        deleteTemplate={deleteTemplate}
        setLiveTemplate={setLiveTemplate}
        onPreview={handlePreviewTemplate}
        maxTemplates={MAX_CUSTOM_TEMPLATES}
        onMakePublic={async (templateId) => {
          // Find the template name
          const template = templates.find(t => t.id === templateId);
          const templateName = template?.name || 'Template';
          
          // Show make public notification
          setMakePublicNotification({ isOpen: true, templateName });
        }}
      />

      {/* Template Save Notification */}
      <TemplateSaveNotification
        isOpen={templateSaveNotification.isOpen}
        isSaving={templateSaveNotification.isSaving}
        templateName={templateSaveNotification.templateName}
        onClose={() => setTemplateSaveNotification({ isOpen: false, isSaving: false, templateName: '' })}
      />

      {/* Theme Generation Notification */}
      <ThemeGenerationNotification
        isOpen={themeGenerationNotification.isOpen}
        isGenerating={themeGenerationNotification.isGenerating}
        themeName={themeGenerationNotification.themeName}
        onClose={() => setThemeGenerationNotification({ isOpen: false, isGenerating: false, themeName: '' })}
      />

      {/* Make Public Notification */}
      <MakePublicNotification
        isOpen={makePublicNotification.isOpen}
        templateName={makePublicNotification.templateName}
        onClose={() => setMakePublicNotification({ isOpen: false, templateName: '' })}
      />

      {/* Template Limit Notification */}
      <TemplateLimitNotification
        isOpen={templateLimitNotification}
        onClose={() => setTemplateLimitNotification(false)}
        onOpenShopManager={openTemplateManager}
      />

      {/* Seasonal Store Chat - Half View with Unfold/Fold Animation */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-white/40 dark:bg-black/40 backdrop-blur-md text-gray-900 dark:text-gray-100 shadow-2xl border-t border-b-0 border-white/20 dark:border-gray-700/20 transition-all duration-300 ease-in-out transform ${
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
                           loadLiveFunnel();
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

      {/* Sync Changes Popup - Only show in store view */}
      {isActive && (
        <SyncChangesPopup
          isOpen={showSyncPopup}
          onClose={closeSyncPopup}
          onApplyChanges={handleApplyChanges}
          syncResult={syncResult}
          isLoading={isCheckingUpdates}
          isApplying={isApplyingSync}
          onSyncSuccess={handleSyncSuccess}
        />
      )}
    </>
  );
};

