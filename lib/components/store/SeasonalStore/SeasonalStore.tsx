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
import SeasonalStoreChat from './components/SeasonalStoreChat';
import { apiGet } from '../../../utils/api-client';
import type { FunnelFlow } from '../../../types/funnel';

interface SeasonalStoreProps {
  onBack?: () => void;
  experienceId?: string;
  allResources?: any[];
}

export const SeasonalStore: React.FC<SeasonalStoreProps> = ({ onBack, experienceId, allResources = [] }) => {
  // Theme functionality
  const { appearance, toggleTheme } = useTheme();
  
  // Track iframe container dimensions for responsive background generation
  const iframeDimensions = useIframeDimensions();
  
  // Flag to prevent multiple simultaneous background generations
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const isGeneratingRef = useRef(false);
  
  // Product navigation state for reel functionality
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoSwitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Chat functionality
  const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
  const [liveFunnel, setLiveFunnel] = useState<any>(null);
  const [isFunnelActive, setIsFunnelActive] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // FunnelBuilder view state
  const [showFunnelBuilder, setShowFunnelBuilder] = useState(false);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Notification state
  const [showNotification, setShowNotification] = useState(false);
  
  // ResourceLibrary integration state
  const [resourceLibraryProducts, setResourceLibraryProducts] = useState<any[]>([]);
  const [hasLoadedResourceLibrary, setHasLoadedResourceLibrary] = useState(false);
  const [deletedResourceLibraryProducts, setDeletedResourceLibraryProducts] = useState<Record<string, Set<string>>>({});
  
  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Show notification when no funnel is live
  useEffect(() => {
    if (!funnelFlow || !isFunnelActive) {
      setShowNotification(true);
      
      // Auto-hide notification after 7 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 7000);
    }
  }, [funnelFlow, isFunnelActive]);
  
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
    setError,
    
    // Product Management
    addProduct,
    updateProduct,
    deleteProduct: deleteSeasonalStoreProduct,
    
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
  } = useSeasonalStoreDatabase(experienceId || 'default-experience');
  
  // Only use ResourceLibrary products (no default products)
  const combinedProducts = useMemo(() => {
    console.log(`[SeasonalStore] Displaying ${resourceLibraryProducts.length} ResourceLibrary products (no default products)`);
    return resourceLibraryProducts;
  }, [resourceLibraryProducts]);
  
  // Helper function to convert database Theme to LegacyTheme for UI components
  const convertThemeToLegacy = useCallback((dbTheme: any): LegacyTheme => {
    return {
      name: dbTheme.name,
      themePrompt: dbTheme.themePrompt,
      accent: dbTheme.accentColor || 'bg-indigo-500 hover:bg-indigo-600 text-white ring-indigo-400',
      card: 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30',
      text: 'text-gray-800',
      welcomeColor: 'text-yellow-300',
      background: `bg-[url('https://placehold.co/1920x1080/000000/ffffff?text=${dbTheme.name}')] bg-cover bg-center`,
      backgroundImage: null,
      aiMessage: `Welcome to our ${dbTheme.name} collection!`,
      emojiTip: "✨"
    };
  }, []);
  
  // Convert current theme to legacy format for UI components
  // If theme is already a LegacyTheme (from initialThemes), use it directly
  // If theme is a database Theme, convert it to LegacyTheme
  const legacyTheme = theme && 'background' in theme ? theme : convertThemeToLegacy(theme);

  // Custom add product function that resets index to show new product at front
  const handleAddProduct = useCallback(() => {
    addProduct();
    setCurrentProductIndex(0); // Reset to show the new product at the front
  }, [addProduct]);

  // Function to start auto-switch timer
  const startAutoSwitch = useCallback(() => {
    if (autoSwitchIntervalRef.current) {
      clearInterval(autoSwitchIntervalRef.current);
    }
    
    if (combinedProducts.length <= 2) return; // Don't auto-switch if 2 or fewer products
    if (editorState.isEditorView) return; // Don't auto-switch in edit mode
    
    // Shorter timeout for mobile (5 seconds) vs desktop (10 seconds)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const switchTimeout = isMobile ? 5000 : 10000;
    
    autoSwitchIntervalRef.current = setInterval(() => {
      if (!isSliding) {
        setIsSliding(true);
        setSwipeDirection('left'); // Auto-switch slides left
        setTimeout(() => {
      setCurrentProductIndex(prevIndex => {
        const maxIndex = combinedProducts.length - 2;
        return prevIndex >= maxIndex ? 0 : prevIndex + 1;
      });
          setSwipeDirection('right'); // Slide in from right
          setTimeout(() => {
            setSwipeDirection(null);
            setIsSliding(false);
          }, 150); // Faster: 300ms -> 150ms
        }, 100); // Faster: 200ms -> 100ms
      }
    }, switchTimeout);
  }, [combinedProducts.length, editorState.isEditorView, isSliding]);

  // Smooth navigation functions
  const navigateToPrevious = useCallback(() => {
    if (currentProductIndex > 0 && !isSliding) {
      setIsSliding(true);
      setSwipeDirection('right');
      setTimeout(() => {
        setCurrentProductIndex(prev => Math.max(0, prev - 1));
        setSwipeDirection('left'); // Slide in from left
        setTimeout(() => {
          setSwipeDirection(null);
          setIsSliding(false);
        }, 150); // Faster: 300ms -> 150ms
      }, 100); // Faster: 200ms -> 100ms
      startAutoSwitch();
    }
  }, [currentProductIndex, startAutoSwitch, isSliding]);

  const navigateToNext = useCallback(() => {
    if (currentProductIndex < combinedProducts.length - 2 && !isSliding) {
      setIsSliding(true);
      setSwipeDirection('left');
      setTimeout(() => {
        setCurrentProductIndex(prev => Math.min(combinedProducts.length - 2, prev + 1));
        setSwipeDirection('right'); // Slide in from right
        setTimeout(() => {
          setSwipeDirection(null);
          setIsSliding(false);
        }, 150); // Faster: 300ms -> 150ms
      }, 100); // Faster: 200ms -> 100ms
      startAutoSwitch();
    }
  }, [currentProductIndex, combinedProducts.length, startAutoSwitch, isSliding]);

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

    console.log('Touch swipe detected:', { distance, isLeftSwipe, isRightSwipe, currentProductIndex, productsLength: combinedProducts.length });

    if (isLeftSwipe && currentProductIndex < combinedProducts.length - 2) {
      console.log('Navigating to next product');
      navigateToNext();
    }
    if (isRightSwipe && currentProductIndex > 0) {
      console.log('Navigating to previous product');
      navigateToPrevious();
    }
    
    // Reset touch values
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, currentProductIndex, combinedProducts.length, navigateToNext, navigateToPrevious]);

  // Auto-switch products every 10 seconds (disabled in edit mode)
  useEffect(() => {
    startAutoSwitch();
    return () => {
      if (autoSwitchIntervalRef.current) {
        clearInterval(autoSwitchIntervalRef.current);
      }
    };
  }, [startAutoSwitch]);

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


  // AI Generation Handlers
  const handleRefineAll = useCallback(async (product: any) => {
    setTextLoading(true);
    setGeneratingImage(true);
    setError(null);

    try {
      console.log('🤖 Refining product:', product.name);
      console.log('🤖 Product description:', product.description);
      console.log('🤖 Product image URL:', product.image);
      console.log('🤖 Product imageAttachmentUrl:', product.imageAttachmentUrl);
      console.log('🤖 Product has existing image:', !!product.image && !product.image.includes('placehold.co'));
      console.log('🤖 Product has imageAttachmentUrl:', !!product.imageAttachmentUrl && !product.imageAttachmentUrl.includes('placehold.co'));
      console.log('🤖 Product ID:', product.id);
      console.log('🤖 Product type:', typeof product.id === 'string' && product.id.startsWith('resource-') ? 'ResourceLibrary' : 'SeasonalStore');
      
      const refinedText = await generateProductText(product.name, product.description, theme);
      console.log('🤖 Generated text:', refinedText);
      
      console.log('🎨 Generating/refining product image for:', refinedText.newName);
      const imageUrlToUse = product.imageAttachmentUrl || product.image;
      console.log('🎨 Original image URL being sent to AI:', imageUrlToUse);
      console.log('🎨 Using uploaded image for refinement:', !!product.imageAttachmentUrl);
      const finalImage = await generateProductImage(refinedText.newName, refinedText.newDescription, theme, imageUrlToUse);
      console.log('🎨 Generated product image URL:', finalImage);

      // Upload generated image to WHOP storage
      console.log('📤 Uploading generated product image to WHOP...');
      const uploadResult = await uploadUrlToWhop(finalImage);
      console.log('📤 Upload result:', uploadResult);

      console.log('🔄 Updating product with ID:', product.id);
      console.log('🔄 New image URL:', uploadResult.url);
      console.log('🔄 New attachment ID:', uploadResult.attachmentId);
      
      // Check if this is a ResourceLibrary product (string ID) or regular product (numeric ID)
      if (typeof product.id === 'string' && product.id.startsWith('resource-')) {
        console.log('🔄 Updating ResourceLibrary product in state');
        // Update ResourceLibrary product in local state
        setResourceLibraryProducts(prev => prev.map(p => 
          p.id === product.id 
            ? {
                ...p,
                name: refinedText.newName,
                description: refinedText.newDescription,
                image: finalImage,
                imageAttachmentId: uploadResult.attachmentId,
                imageAttachmentUrl: uploadResult.url,
              }
            : p
        ));
      } else {
        console.log('🔄 Updating regular SeasonalStore product');
        // Update regular SeasonalStore product
        updateProduct(product.id, {
          name: refinedText.newName,
          description: refinedText.newDescription,
          image: finalImage,
          imageAttachmentId: uploadResult.attachmentId,
          imageAttachmentUrl: uploadResult.url,
        });
      }
      
      console.log('✅ Product update called with new image data');
    } catch (error) {
      console.error('🤖 Product refinement failed:', error);
      setError(`Refinement Failed: ${(error as Error).message}`);
    } finally {
      setTextLoading(false);
      setGeneratingImage(false);
    }
  }, [theme, updateProduct, setTextLoading, setGeneratingImage, setError]);

  const handleGenerateAssetFromText = useCallback(async (userPrompt: string) => {
    setTextLoading(true);
    setError(null);
    
    try {
      const emoji = await generateEmojiMatch(userPrompt);
      const imageUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="90">${emoji}</text></svg>`)))}`;

      const newAsset: FloatingAssetType = {
        id: crypto.randomUUID(),
        type: 'image',
        src: imageUrl,
        alt: `Emoji: ${emoji} (${userPrompt.substring(0, 20)}...)`,
        x: '50%',
        y: '300px',
        rotation: '0',
        scale: 1.0,
        z: 50
      };
      console.log('🎯 Adding floating asset:', newAsset);
      addFloatingAsset(newAsset);
    } catch (error) {
      setError(`Failed to generate Emoji Asset. Error: ${(error as Error).message}`);
    } finally {
      setTextLoading(false);
    }
  }, [setTextLoading, setError, setAvailableAssets]);

  const handleGenerateBgClick = useCallback(async () => {
    if (isGeneratingRef.current) {
      console.log('🎨 Background generation already in progress, skipping...');
      return;
    }
    
    setImageLoading(true);
    setError(null);
    isGeneratingRef.current = true;
    setIsGeneratingBackground(true);
    // Keep button in navbar during generation

    try {
      console.log('🎨 Generating responsive background with prompt:', legacyTheme.themePrompt);
      console.log('🎨 Current background URL for refinement:', backgroundAttachmentUrl);
      console.log('🎨 Background type context:', {
        generatedBackground,
        uploadedBackground,
        isGenerated: generatedBackground === backgroundAttachmentUrl,
        isUploaded: uploadedBackground === backgroundAttachmentUrl
      });
      const imageUrl = await generateResponsiveBackgroundImage(
        legacyTheme.themePrompt || '', 
        backgroundAttachmentUrl || undefined,
        {
          isGenerated: generatedBackground === backgroundAttachmentUrl,
          isUploaded: uploadedBackground === backgroundAttachmentUrl
        }
      );
      console.log('🎨 Generated responsive background URL:', imageUrl);
      
      // Automatically upload to WHOP storage
      console.log('🔄 Uploading generated background to WHOP storage...');
      const uploadedImage = await uploadUrlToWhop(imageUrl, `generated-bg-${Date.now()}.png`);
      console.log('✅ Background uploaded to WHOP:', uploadedImage);
      
      // Set both the original URL and WHOP attachment
      setBackground('generated', imageUrl);
      setBackgroundAttachmentId(uploadedImage.attachmentId);
      setBackgroundAttachmentUrl(uploadedImage.url);
    } catch (error) {
      console.error('🎨 Background generation/upload failed:', error);
      setError(`Background Generation Failed: ${(error as Error).message}`);
    } finally {
      setImageLoading(false);
      isGeneratingRef.current = false;
      setIsGeneratingBackground(false);
      setShowGenerateBgInNavbar(false); // Move to original location after generation
    }
  }, [legacyTheme.themePrompt, backgroundAttachmentUrl, generatedBackground, uploadedBackground, setImageLoading, setError, setBackground]);

  const handleBgImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const base64Data = await fileToBase64(file);
      const imageUrl = `data:${file.type};base64,${base64Data}`;
      
      // Automatically upload to WHOP storage
      console.log('🔄 Uploading user background to WHOP storage...');
      
      // Use the API route for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-to-whop', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadedImage = await response.json();
      console.log('✅ User background uploaded to WHOP:', uploadedImage);
      
      // Set both the original URL and WHOP attachment
      setBackground('uploaded', imageUrl);
      setBackgroundAttachmentId(uploadedImage.attachmentId);
      setBackgroundAttachmentUrl(uploadedImage.url);
      setError(null);
    } catch (error) {
      setError(`Background upload failed: ${(error as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  }, [setUploadingImage, setError, setBackground, setBackgroundAttachmentId, setBackgroundAttachmentUrl]);


  const handleLogoGeneration = useCallback(async (currentLogo: any, shape: string, themeName: string) => {
    setImageLoading(true);
    setError(null);

    try {
      const imageUrl = await generateLogo(theme, shape as 'round' | 'square', currentLogo.src);
      
      // Automatically upload logo to WHOP storage
      console.log('🔄 Uploading generated logo to WHOP storage...');
      const uploadedImage = await uploadUrlToWhop(imageUrl, `${themeName}-logo-${Date.now()}.png`);
      console.log('✅ Logo uploaded to WHOP:', uploadedImage);
      
      setLogoAsset({ 
        ...currentLogo, 
        src: imageUrl, 
        alt: `AI Generated ${themeName} Logo`,
        shape: shape as 'round' | 'square'
      });
      
      // Store WHOP attachment data
      setLogoAttachmentId(uploadedImage.attachmentId);
      setLogoAttachmentUrl(uploadedImage.url);
    } catch (error) {
      setError(`Logo Image Generation Failed: ${(error as Error).message}`);
    } finally {
      setImageLoading(false);
    }
  }, [theme, setImageLoading, setError, setLogoAsset]);

  const handleLogoImageUpload = useCallback(async (file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      const base64Data = await fileToBase64(file);
      const imageUrl = `data:${file.type};base64,${base64Data}`;
      
      // Automatically upload logo to WHOP storage
      console.log('🔄 Uploading user logo to WHOP storage...');
      
      // Use the API route for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-to-whop', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadedImage = await response.json();
      console.log('✅ User logo uploaded to WHOP:', uploadedImage);
      
      setLogoAsset({ ...logoAsset, src: imageUrl, alt: 'Custom Uploaded Logo' });
      
      // Store WHOP attachment data
      setLogoAttachmentId(uploadedImage.attachmentId);
      setLogoAttachmentUrl(uploadedImage.url);
      setError(null);
    } catch (error) {
      setError(`Logo upload failed: ${(error as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  }, [setUploadingImage, setError, setLogoAsset]);

  // Use promo button state from database hook
  const promoButton = dbPromoButton;
  const setPromoButton = setDbPromoButton;

  const handleSaveTemplate = useCallback(async () => {
    try {
      const templateName = prompt('Enter template name:');
      if (!templateName) return;
      
      // Templates should always use themeSnapshot, never create database themes
      // This keeps templates self-contained and prevents theme dropdown pollution
      const themeId = null;
      console.log('🎨 Template will use themeSnapshot for rendering, no database theme needed');
      
      const templateData = {
        name: templateName,
        experienceId: '', // Will be set by the API
        userId: '', // Will be set by the API
        themeId: themeId, // Use the determined theme ID
        themeSnapshot: {
          id: `theme_${Date.now()}`, // Create new theme ID for template snapshot
          experienceId: experienceId || 'default-experience',
          name: legacyTheme.name,
          season: currentSeason,
          themePrompt: legacyTheme.themePrompt,
          accentColor: legacyTheme.accent,
          ringColor: legacyTheme.accent,
          card: legacyTheme.card,
          text: legacyTheme.text,
          welcomeColor: legacyTheme.welcomeColor,
          background: legacyTheme.background,
          aiMessage: legacyTheme.aiMessage,
          emojiTip: legacyTheme.emojiTip,
          createdAt: new Date(),
          updatedAt: new Date()
        }, // Complete snapshot of current theme
        currentSeason,
        templateData: {
          // Theme-specific data
          themeTextStyles: {
            [currentSeason]: {
              mainHeader: {
                content: fixedTextStyles.mainHeader?.content || '',
                color: fixedTextStyles.mainHeader?.color || '',
                styleClass: fixedTextStyles.mainHeader?.styleClass || ''
              },
              headerMessage: {
                content: fixedTextStyles.headerMessage?.content || '',
                color: fixedTextStyles.headerMessage?.color || '',
                styleClass: fixedTextStyles.headerMessage?.styleClass || ''
              },
              subHeader: {
                content: fixedTextStyles.subHeader?.content || '',
                color: fixedTextStyles.subHeader?.color || '',
                styleClass: fixedTextStyles.subHeader?.styleClass || ''
              },
              promoMessage: {
                content: fixedTextStyles.promoMessage?.content || '',
                color: fixedTextStyles.promoMessage?.color || '',
                styleClass: fixedTextStyles.promoMessage?.styleClass || ''
              }
            }
          },
          themeLogos: {
            [currentSeason]: logoAttachmentUrl ? {
              src: logoAttachmentUrl,
              shape: logoAsset?.shape || 'square',
              alt: logoAsset?.alt || 'Logo'
            } : logoAsset
          },
          themeGeneratedBackgrounds: {
            [currentSeason]: backgroundAttachmentUrl
          },
          themeUploadedBackgrounds: {
            [currentSeason]: backgroundAttachmentUrl
          },
          themeProducts: {
            [currentSeason]: products.map(product => ({
              id: product.id,
              name: product.name,
              price: product.price,
              description: product.description,
              image: product.imageAttachmentUrl || `https://placehold.co/200x200/c2410c/ffffff?text=${encodeURIComponent(product.name.toUpperCase())}`, // Use placeholder if no WHOP storage URL
              imageAttachmentId: product.imageAttachmentId,
              imageAttachmentUrl: product.imageAttachmentUrl,
              containerAsset: product.containerAsset,
              cardClass: product.cardClass,
              buttonText: product.buttonText,
              buttonClass: product.buttonClass,
              buttonAnimColor: product.buttonAnimColor,
              titleClass: product.titleClass,
              descClass: product.descClass,
              buttonLink: product.buttonLink
            }))
          },
          themeFloatingAssets: {
            [currentSeason]: floatingAssets.map(asset => ({
              id: asset.id,
              type: asset.type,
              src: asset.src,
              alt: asset.alt,
              x: asset.x,
              y: asset.y,
              rotation: asset.rotation,
              scale: asset.scale,
              z: asset.z,
              content: asset.content,
              color: asset.color,
              styleClass: asset.styleClass,
              isPromoMessage: asset.isPromoMessage,
              isPromoCode: asset.isPromoCode,
              isLogo: asset.isLogo,
              customData: asset.customData
            }))
          },
          
          // Current store state
          products: products.map(product => ({
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            image: product.imageAttachmentUrl || `https://placehold.co/200x200/c2410c/ffffff?text=${encodeURIComponent(product.name.toUpperCase())}`, // Use placeholder if no WHOP storage URL
            imageAttachmentId: product.imageAttachmentId,
            imageAttachmentUrl: product.imageAttachmentUrl,
            containerAsset: product.containerAsset,
            cardClass: product.cardClass,
            buttonText: product.buttonText,
            buttonClass: product.buttonClass,
            buttonAnimColor: product.buttonAnimColor,
            titleClass: product.titleClass,
            descClass: product.descClass,
            buttonLink: product.buttonLink
          })),
          floatingAssets: floatingAssets.map(asset => ({
            id: asset.id,
            type: asset.type,
            src: asset.src,
            alt: asset.alt,
            x: asset.x,
            y: asset.y,
            rotation: asset.rotation,
            scale: asset.scale,
            z: asset.z,
            content: asset.content,
            color: asset.color,
            styleClass: asset.styleClass,
            isPromoMessage: asset.isPromoMessage,
            isPromoCode: asset.isPromoCode,
            isLogo: asset.isLogo,
            customData: asset.customData
          })),
          fixedTextStyles: {
            mainHeader: {
              content: fixedTextStyles.mainHeader?.content || '',
              color: fixedTextStyles.mainHeader?.color || '',
              styleClass: fixedTextStyles.mainHeader?.styleClass || ''
            },
            headerMessage: {
              content: fixedTextStyles.headerMessage?.content || '',
              color: fixedTextStyles.headerMessage?.color || '',
              styleClass: fixedTextStyles.headerMessage?.styleClass || ''
            },
            subHeader: {
              content: fixedTextStyles.subHeader?.content || '',
              color: fixedTextStyles.subHeader?.color || '',
              styleClass: fixedTextStyles.subHeader?.styleClass || ''
            },
            promoMessage: {
              content: fixedTextStyles.promoMessage?.content || '',
              color: fixedTextStyles.promoMessage?.color || '',
              styleClass: fixedTextStyles.promoMessage?.styleClass || ''
            }
          },
          logoAsset: logoAttachmentUrl ? {
            src: logoAttachmentUrl,
            shape: logoAsset?.shape || 'square',
            alt: logoAsset?.alt || 'Logo'
          } : logoAsset,
          
          // Background assets (WHOP storage)
          generatedBackground: backgroundAttachmentUrl,
          uploadedBackground: backgroundAttachmentUrl,
          backgroundAttachmentId,
          backgroundAttachmentUrl,
          logoAttachmentId,
          logoAttachmentUrl,
          
          // Current theme styling
          currentTheme: {
            name: legacyTheme.name,
            themePrompt: legacyTheme.themePrompt,
            accent: legacyTheme.accent,
            card: legacyTheme.card,
            text: legacyTheme.text,
            welcomeColor: legacyTheme.welcomeColor,
            background: legacyTheme.background,
            backgroundImage: legacyTheme.backgroundImage,
            aiMessage: legacyTheme.aiMessage,
            emojiTip: legacyTheme.emojiTip
          },
          
          // Claim button styling
          promoButton: {
            text: promoButton.text,
            buttonClass: promoButton.buttonClass,
            ringClass: promoButton.ringClass,
            ringHoverClass: promoButton.ringHoverClass,
            icon: promoButton.icon
          }
        },
        isLive: false,
        isLastEdited: false,
      };
      
      console.log('🔍 Frontend - Complete template data being sent:', templateData);
      console.log('🔍 Frontend - themeSnapshot:', templateData.themeSnapshot);
      console.log('🔍 Frontend - themeId:', templateData.themeId);
      console.log('🔍 Frontend - products:', JSON.stringify(templateData.templateData.products, null, 2));
      console.log('🔍 Frontend - fixedTextStyles:', JSON.stringify(templateData.templateData.fixedTextStyles, null, 2));
      console.log('🔍 Frontend - floatingAssets:', JSON.stringify(templateData.templateData.floatingAssets, null, 2));
      
      await saveTemplate(templateData);
      
      alert('Template saved successfully!');
    } catch (error) {
      setError(`Failed to save template: ${(error as Error).message}`);
    }
  }, [saveTemplate, createTheme, products, floatingAssets, currentSeason, theme, fixedTextStyles, logoAsset, generatedBackground, uploadedBackground, backgroundAttachmentId, backgroundAttachmentUrl, logoAttachmentId, logoAttachmentUrl, promoButton, setError]);

  // Load live funnel for chat functionality
  const loadLiveFunnel = useCallback(async () => {
    if (!experienceId) {
      console.log('[SeasonalStore] No experienceId provided, skipping funnel load');
      return;
    }

    try {
      console.log(`[SeasonalStore] Loading live funnel for experienceId: ${experienceId}`);

      // Use the dedicated live funnel endpoint
      const response = await apiGet(`/api/funnels/live`, experienceId);
      
      console.log(`[SeasonalStore] API call made with experienceId: ${experienceId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[SeasonalStore] Live funnel response:`, data);
        
        if (data.success && data.hasLiveFunnel && data.funnelFlow) {
          // We have a live funnel
          const funnelData = {
            id: data.funnel.id,
            name: data.funnel.name,
            flow: data.funnelFlow,
            isDeployed: data.funnel.isDeployed,
            resources: data.resources || []
          };
          setFunnelFlow(data.funnelFlow);
          setLiveFunnel(funnelData);
          setIsFunnelActive(true);
          
          console.log(`[SeasonalStore] ✅ Found live funnel for experience ${experienceId}`);
          console.log(`[SeasonalStore] Funnel:`, data.funnel);
          console.log(`[SeasonalStore] Funnel flow:`, data.funnelFlow);
          console.log(`[SeasonalStore] Resources:`, data.resources);
        } else {
          // No live funnel
          setLiveFunnel(null);
          setFunnelFlow(null);
          setIsFunnelActive(false);
          console.log(`[SeasonalStore] ❌ No live funnel found for experience ${experienceId}`);
          console.log(`[SeasonalStore] Response data:`, data);
        }
      } else {
        console.error(`[SeasonalStore] Failed to check for live funnel: ${response.status}`);
        setError(`Failed to load live funnel: ${response.status}`);
      }
    } catch (err) {
      console.error("Error loading live funnel:", err);
      setError(`Error loading live funnel: ${(err as Error).message}`);
    }
  }, [experienceId, setError]);


  const openTemplateManager = () => setTemplateManagerOpen(true);
  const closeTemplateManager = () => setTemplateManagerOpen(false);
  const closeTemplateManagerAnimated = () => {
    setTemplateManagerAnimOpen(false);
    setTimeout(() => setTemplateManagerOpen(false), 300);
  };

  // Automatic template saving when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Auto-save template when leaving the page
      if (combinedProducts.length > 0 || floatingAssets.length > 0) {
        saveTemplate({
          name: `Auto-saved ${new Date().toLocaleString()}`,
          experienceId: '', // Will be set by the API
          userId: '', // Will be set by the API
          themeId: '', // Will be set by the API
          themeSnapshot: {
            id: `theme_${Date.now()}`, // Create new theme ID for template snapshot
            experienceId: experienceId || 'default-experience',
            name: theme.name,
            season: currentSeason,
            themePrompt: theme.themePrompt,
            accentColor: theme.accent,
            ringColor: theme.accent,
            createdAt: new Date(),
            updatedAt: new Date()
          }, // Snapshot of current theme
          currentSeason,
          templateData: {
            themeTextStyles: {
              [currentSeason]: {
                mainHeader: {
                  content: fixedTextStyles.mainHeader?.content || '',
                  color: fixedTextStyles.mainHeader?.color || '',
                  styleClass: fixedTextStyles.mainHeader?.styleClass || ''
                },
                headerMessage: {
                  content: fixedTextStyles.headerMessage?.content || '',
                  color: fixedTextStyles.headerMessage?.color || '',
                  styleClass: fixedTextStyles.headerMessage?.styleClass || ''
                },
                subHeader: {
                  content: fixedTextStyles.subHeader?.content || '',
                  color: fixedTextStyles.subHeader?.color || '',
                  styleClass: fixedTextStyles.subHeader?.styleClass || ''
                },
                promoMessage: {
                  content: fixedTextStyles.promoMessage?.content || '',
                  color: fixedTextStyles.promoMessage?.color || '',
                  styleClass: fixedTextStyles.promoMessage?.styleClass || ''
                }
              }
            },
            themeLogos: {
              [currentSeason]: logoAttachmentUrl ? {
                src: logoAttachmentUrl,
                shape: logoAsset?.shape || 'square',
                alt: logoAsset?.alt || 'Logo'
              } : logoAsset
            },
            themeGeneratedBackgrounds: {
              [currentSeason]: backgroundAttachmentUrl
            },
            themeUploadedBackgrounds: {
              [currentSeason]: backgroundAttachmentUrl
            },
            themeProducts: {
              [currentSeason]: products.map(product => ({
                id: product.id,
                name: product.name,
                price: product.price,
                description: product.description,
                image: product.imageAttachmentUrl || `https://placehold.co/200x200/c2410c/ffffff?text=${encodeURIComponent(product.name.toUpperCase())}`, // Use placeholder if no WHOP storage URL
                imageAttachmentId: product.imageAttachmentId,
                imageAttachmentUrl: product.imageAttachmentUrl,
                containerAsset: product.containerAsset,
                cardClass: product.cardClass,
                buttonText: product.buttonText,
                buttonClass: product.buttonClass,
                buttonAnimColor: product.buttonAnimColor,
                titleClass: product.titleClass,
                descClass: product.descClass,
                buttonLink: product.buttonLink
              }))
            },
            themeFloatingAssets: {
              [currentSeason]: floatingAssets.map(asset => ({
                id: asset.id,
                type: asset.type,
                src: asset.src,
                alt: asset.alt,
                x: asset.x,
                y: asset.y,
                rotation: asset.rotation,
                scale: asset.scale,
                z: asset.z,
                content: asset.content,
                color: asset.color,
                styleClass: asset.styleClass,
                isPromoMessage: asset.isPromoMessage,
                isPromoCode: asset.isPromoCode,
                isLogo: asset.isLogo,
                customData: asset.customData
              }))
            },
            products: products.map(product => ({
              id: product.id,
              name: product.name,
              price: product.price,
              description: product.description,
              image: product.imageAttachmentUrl || `https://placehold.co/200x200/c2410c/ffffff?text=${encodeURIComponent(product.name.toUpperCase())}`, // Use placeholder if no WHOP storage URL
              imageAttachmentId: product.imageAttachmentId,
              imageAttachmentUrl: product.imageAttachmentUrl,
              containerAsset: product.containerAsset,
              cardClass: product.cardClass,
              buttonText: product.buttonText,
              buttonClass: product.buttonClass,
              buttonAnimColor: product.buttonAnimColor,
              titleClass: product.titleClass,
              descClass: product.descClass,
              buttonLink: product.buttonLink
            })),
            floatingAssets: floatingAssets.map(asset => ({
              id: asset.id,
              type: asset.type,
              src: asset.src,
              alt: asset.alt,
              x: asset.x,
              y: asset.y,
              rotation: asset.rotation,
              scale: asset.scale,
              z: asset.z,
              content: asset.content,
              color: asset.color,
              styleClass: asset.styleClass,
              isPromoMessage: asset.isPromoMessage,
              isPromoCode: asset.isPromoCode,
              isLogo: asset.isLogo,
              customData: asset.customData
            })),
            fixedTextStyles: {
              mainHeader: {
                content: fixedTextStyles.mainHeader?.content || '',
                color: fixedTextStyles.mainHeader?.color || '',
                styleClass: fixedTextStyles.mainHeader?.styleClass || ''
              },
              headerMessage: {
                content: fixedTextStyles.headerMessage?.content || '',
                color: fixedTextStyles.headerMessage?.color || '',
                styleClass: fixedTextStyles.headerMessage?.styleClass || ''
              },
              subHeader: {
                content: fixedTextStyles.subHeader?.content || '',
                color: fixedTextStyles.subHeader?.color || '',
                styleClass: fixedTextStyles.subHeader?.styleClass || ''
              },
              promoMessage: {
                content: fixedTextStyles.promoMessage?.content || '',
                color: fixedTextStyles.promoMessage?.color || '',
                styleClass: fixedTextStyles.promoMessage?.styleClass || ''
              }
            },
            logoAsset: logoAttachmentUrl ? {
              src: logoAttachmentUrl,
              shape: logoAsset?.shape || 'square',
              alt: logoAsset?.alt || 'Logo'
            } : logoAsset,
            // Use WHOP storage URLs instead of base64
            generatedBackground: backgroundAttachmentUrl,
            uploadedBackground: backgroundAttachmentUrl,
            backgroundAttachmentId,
            backgroundAttachmentUrl,
            logoAttachmentId,
            logoAttachmentUrl,
            
            // Current theme and promo button
            currentTheme: {
              name: theme.name,
              themePrompt: theme.themePrompt,
              accent: theme.accent,
              card: theme.card,
              text: theme.text,
              welcomeColor: theme.welcomeColor,
              background: theme.background,
              aiMessage: theme.aiMessage,
              emojiTip: theme.emojiTip
            },
            promoButton: {
              text: promoButton?.text || 'CLAIM YOUR GIFT!',
              buttonClass: promoButton?.buttonClass || 'bg-indigo-600 hover:bg-indigo-700 text-white ring-indigo-500',
              ringClass: promoButton?.ringClass || 'ring-indigo-500',
              ringHoverClass: promoButton?.ringHoverClass || 'ring-indigo-500',
              icon: promoButton?.icon || '🎁'
            }
          },
          isLive: false,
          isLastEdited: false,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [products, floatingAssets, currentSeason, theme, fixedTextStyles, logoAsset, generatedBackground, uploadedBackground, backgroundAttachmentId, backgroundAttachmentUrl, logoAttachmentId, logoAttachmentUrl, saveTemplate]);

  // Load live funnel on mount
  useEffect(() => {
    console.log('[SeasonalStore] useEffect triggered, experienceId:', experienceId);
    loadLiveFunnel();
  }, [loadLiveFunnel]);

  // Load ResourceLibrary products on mount and when theme changes
  useEffect(() => {
    if (!experienceId || allResources.length === 0) return;
    
    console.log('[SeasonalStore] Loading ResourceLibrary products, experienceId:', experienceId, 'theme:', currentSeason, 'themeName:', theme.name);
    
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
      name: theme.name,
      accent: theme.accent,
      card: theme.card,
      text: theme.text
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
        description: resource.description || '', // Keep original description
        price: formattedPrice,
        image: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp', // Keep original image or use placeholder
        imageAttachmentUrl: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp', // Map to imageAttachmentUrl for ProductCard
        buttonText: 'View Details',
        buttonClass: theme.accent, // Use theme's accent color
        buttonLink: resource.type === "AFFILIATE" ? resource.link : resource.storageUrl,
        // Use theme's styling for everything else
        cardClass: theme.card, // Use theme's card styling
        titleClass: theme.text, // Use theme's text color
        descClass: theme.text, // Use theme's text color
        buttonAnimColor: theme.accent.includes('blue') ? 'blue' : 
                        theme.accent.includes('yellow') ? 'yellow' :
                        theme.accent.includes('orange') ? 'orange' :
                        theme.accent.includes('red') ? 'red' :
                        theme.accent.includes('pink') ? 'pink' :
                        theme.accent.includes('cyan') ? 'cyan' :
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

  const handleProductImageUpload = useCallback(async (productId: number, file: File) => {
    if (!file) return;
    try {
      setUploadingImage(true);
      console.log('🔄 Uploading product image to WHOP storage...');
      
      // Use the API route for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload-to-whop', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadedImage = await response.json();
      console.log('✅ Product image uploaded to WHOP:', uploadedImage);
      
      // Convert to base64 for local display
      const base64Data = await fileToBase64(file);
      const imageUrl = `data:${file.type};base64,${base64Data}`;
      
      console.log('🔄 Updating product with new image:', {
        productId,
        imageUrl: imageUrl.substring(0, 50) + '...',
        imageAttachmentId: uploadedImage.attachmentId,
        imageAttachmentUrl: uploadedImage.url
      });
      
      // Update ResourceLibrary products instead of themeProducts
      setResourceLibraryProducts(prev => prev.map(product => 
        product.id === productId 
          ? {
              ...product,
              image: imageUrl,
              imageAttachmentId: uploadedImage.attachmentId,
              imageAttachmentUrl: uploadedImage.url
            }
          : product
      ));
      
      console.log('✅ Product updated successfully');
      setError(null);
    } catch (error) {
      console.error('❌ Product image upload failed:', error);
      setError(`File upload failed: ${(error as Error).message}`);
    } finally {
      setUploadingImage(false);
    }
  }, [setUploadingImage, setError]);

  const handleRemoveSticker = useCallback((productId: number) => {
    updateProduct(productId, { containerAsset: undefined });
  }, [updateProduct]);

  // Handle delete for ResourceLibrary products
  const handleDeleteResourceLibraryProduct = useCallback((productId: string) => {
    // Extract the original resource ID from the product ID
    const resourceId = productId.replace('resource-', '');
    
    // Remove from resourceLibraryProducts state
    setResourceLibraryProducts(prev => prev.filter(product => product.id !== productId));
    
    // Track this product as deleted for the current theme only
    setDeletedResourceLibraryProducts(prev => ({
      ...prev,
      [currentSeason]: new Set([...(prev[currentSeason] || []), resourceId])
    }));
    
    console.log(`[SeasonalStore] Deleted ResourceLibrary product: ${productId} (resource ID: ${resourceId}) from theme: ${currentSeason}`);
  }, [currentSeason]);

  // Combined delete handler that routes to appropriate delete function
  const deleteProduct = useCallback((productId: number | string) => {
    if (typeof productId === 'string' && productId.startsWith('resource-')) {
      // This is a ResourceLibrary product
      handleDeleteResourceLibraryProduct(productId);
    } else {
      // This is a regular SeasonalStore product
      deleteSeasonalStoreProduct(productId as number);
    }
  }, [handleDeleteResourceLibraryProduct, deleteSeasonalStoreProduct]);

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

  // Extract theme colors for text styling
  const getThemeColors = useMemo(() => {
    const extractColorFromClass = (className: string, prefix: string) => {
      const match = className.match(new RegExp(`${prefix}-(\\w+)`));
      return match ? match[1] : null;
    };

    const extractTextColor = (className: string) => {
      const match = className.match(/text-(\w+)/);
      return match ? match[1] : 'gray-800';
    };

    const extractRingColor = (className: string) => {
      const match = className.match(/ring-(\w+)/);
      return match ? match[1] : 'blue-500';
    };

    // Get the actual color values from the theme
    const primaryColor = extractColorFromClass(legacyTheme.accent, 'bg') || 'blue-600';
    const textColor = extractTextColor(legacyTheme.text) || 'gray-800';
    const welcomeColor = extractTextColor(legacyTheme.welcomeColor) || 'blue-200';
    const ringColor = extractRingColor(legacyTheme.accent) || 'blue-500';

    return {
      primary: primaryColor,
      text: textColor,
      welcome: welcomeColor,
      ring: ringColor,
      // CSS classes for dynamic styling
      primaryClass: `text-${primaryColor}`,
      textClass: `text-${textColor}`,
      welcomeClass: `text-${welcomeColor}`,
      ringClass: `ring-${ringColor}`,
      borderClass: `border-${ringColor}`,
    };
  }, [legacyTheme]);

  // Get the initial style classes for reference
  const getInitialStyleClass = useCallback((type: 'header' | 'subheader' | 'promo') => {
    switch (type) {
      case 'header':
        return mainHeader?.styleClass || headerMessage?.styleClass || 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg';
      case 'subheader':
        return subHeader?.styleClass || 'text-lg sm:text-xl font-normal';
      case 'promo':
        return promoMessage?.styleClass || 'text-2xl sm:text-3xl font-semibold drop-shadow-md';
      default:
        return '';
    }
  }, [mainHeader, headerMessage, subHeader, promoMessage]);

  // Apply theme colors to text styles
  const applyThemeColorsToText = useCallback((textStyle: any, type: 'header' | 'subheader' | 'promo') => {
    const baseStyle = textStyle?.styleClass || getInitialStyleClass(type);
    let themeColorClass = '';
    
    switch (type) {
      case 'header':
        themeColorClass = getThemeColors.primaryClass;
        break;
      case 'subheader':
        themeColorClass = getThemeColors.textClass;
        break;
      case 'promo':
        themeColorClass = getThemeColors.welcomeClass;
        break;
    }
    
    // If no custom color is set, apply theme color
    if (!textStyle?.color) {
      return `${baseStyle} ${themeColorClass}`;
    }
    
    return baseStyle;
  }, [getThemeColors, getInitialStyleClass]);

  // Emoji search state
  const [emojiSearchQuery, setEmojiSearchQuery] = useState('');
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
      products.forEach(product => {
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
  }, [legacyTheme.accent, products, updateProduct]);

  // Map ring class to a safe hover:ring-* class included at build time
  const getHoverRingClass = (ringCls: string) => {
    switch (ringCls) {
      case 'ring-indigo-400':
        return 'hover:ring-indigo-400';
      case 'ring-cyan-400':
        return 'hover:ring-cyan-400';
      case 'ring-fuchsia-400':
        return 'hover:ring-fuchsia-400';
      case 'ring-emerald-400':
        return 'hover:ring-emerald-400';
      case 'ring-amber-400':
        return 'hover:ring-amber-400';
      case 'ring-purple-400':
        return 'hover:ring-purple-400';
      case 'ring-rose-400':
        return 'hover:ring-rose-400';
      case 'ring-blue-400':
        return 'hover:ring-blue-400';
      case 'ring-slate-400':
        return 'hover:ring-slate-400';
      case 'ring-orange-400':
        return 'hover:ring-orange-400';
      default:
        return 'hover:ring-indigo-400';
    }
  };

  // Map ring color to an under-glow background for hover
  const getGlowBgClass = (ringCls: string) => {
    switch (ringCls) {
      case 'ring-indigo-400':
        return 'bg-indigo-400/40';
      case 'ring-cyan-400':
        return 'bg-cyan-400/40';
      case 'ring-fuchsia-400':
        return 'bg-fuchsia-400/40';
      case 'ring-emerald-400':
        return 'bg-emerald-400/40';
      case 'ring-amber-400':
        return 'bg-amber-400/40';
      case 'ring-purple-400':
        return 'bg-purple-400/40';
      case 'ring-rose-400':
        return 'bg-rose-400/40';
      case 'ring-blue-400':
        return 'bg-blue-400/40';
      case 'ring-slate-400':
        return 'bg-slate-400/40';
      case 'ring-orange-400':
        return 'bg-orange-400/40';
      default:
        return 'bg-indigo-400/40';
    }
  };

  // Stronger glow color mapping for deeper halo
  const getGlowBgStrongClass = (ringCls: string) => {
    switch (ringCls) {
      case 'ring-indigo-400':
        return 'bg-indigo-400/70';
      case 'ring-cyan-400':
        return 'bg-cyan-400/70';
      case 'ring-fuchsia-400':
        return 'bg-fuchsia-400/70';
      case 'ring-emerald-400':
        return 'bg-emerald-400/70';
      case 'ring-amber-400':
        return 'bg-amber-400/70';
      case 'ring-purple-400':
        return 'bg-purple-400/70';
      case 'ring-rose-400':
        return 'bg-rose-400/70';
      case 'ring-blue-400':
        return 'bg-blue-400/70';
      case 'ring-slate-400':
        return 'bg-slate-400/70';
      case 'ring-orange-400':
        return 'bg-orange-400/70';
      default:
        return 'bg-indigo-400/70';
    }
  };

  // Quick text colors with contrast to current theme
  const getThemeQuickColors = (t: LegacyTheme): string[] => {
    const parseText = (cls: string) => cls.replace('text-', '').trim();
    const parseBgFamily = (cls: string) => {
      const m = cls.match(/bg-([a-z]+)-\d+/);
      return m?.[1] ?? undefined;
    };
    const parseRingFamily = (cls: string) => {
      const m = cls.match(/ring-([a-z]+)-\d+/);
      return m?.[1] ?? undefined;
    };
    
    // Get theme's main color families
    const accentFamily = parseBgFamily(t.accent || '') || 'blue';
    const ringFamily = parseRingFamily(t.accent || '') || 'blue';
    const welcome = parseText(t.welcomeColor);
    const body = parseText(t.text);
    
    // Define contrast colors - opposite/complementary to theme
    const contrastMap: Record<string, string[]> = {
      'blue': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
      'yellow': ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6'], // cool blues
      'orange': ['#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'], // cool purples
      'red': ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981'], // cool greens
      'pink': ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981'], // cool greens
      'purple': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
      'green': ['#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444'], // warm reds
      'cyan': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
      'emerald': ['#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444'], // warm reds
      'amber': ['#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'], // cool purples
      'slate': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
      'gray': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
    };
    
    // Get contrast colors for the theme's main families
    const contrastColors = [
      ...(contrastMap[accentFamily] || []),
      ...(contrastMap[ringFamily] || []),
      '#FFFFFF', '#F3F4F6', '#E5E7EB', // neutrals for readability
    ];
    
    // Remove duplicates and ensure we have at least 9 colors
    const uniq = Array.from(new Set(contrastColors.filter(Boolean)));
    const fallback = ['#FFFFFF', '#F3F4F6', '#E5E7EB', '#FEF3C7', '#FDE68A', '#DBEAFE', '#BFDBFE', '#D1FAE5', '#A7F3D0'];
    while (uniq.length < 9) {
      const next = fallback.shift();
      if (!next) break;
      if (!uniq.includes(next)) uniq.push(next);
    }
    
    return uniq.slice(0, 12); // provide up to 12 chips but at least 9
  };


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

  // Determine background style
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
        width: '100%'
      };
    }
    // Return empty object to let CSS classes handle the background
    // The className already includes legacyTheme.background for gradient backgrounds
    return {
      minHeight: '100vh',
      width: '100%'
    };
  }, [backgroundAttachmentUrl]);

  // Product editor slide-over state
  const [productEditor, setProductEditor] = useState<{ isOpen: boolean; productId: number | null; target: 'name' | 'description' | 'card' | 'button' | null }>({ isOpen: false, productId: null, target: null });
  const openProductEditor = (productId: number | null, target: 'name' | 'description' | 'card' | 'button') => setProductEditor({ isOpen: true, productId, target });
  const closeProductEditor = () => setProductEditor({ isOpen: false, productId: null, target: null });

  // Slide-over animations (match AdminAssetSheet feel)
  const [textSheetAnimOpen, setTextSheetAnimOpen] = useState(false);
  const [adminSheetAnimOpen, setAdminSheetAnimOpen] = useState(false);
  const [templateManagerOpen, setTemplateManagerOpen] = useState(false);
  const [templateManagerAnimOpen, setTemplateManagerAnimOpen] = useState(false);
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
  const subHeaderInputRef = useRef<HTMLInputElement | null>(null);
  const promoInputRef = useRef<HTMLInputElement | null>(null);
  
  // Generate background button location state
  const [showGenerateBgInNavbar, setShowGenerateBgInNavbar] = useState(true); // Start in navbar
  
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

  // Show FunnelBuilder if Edit Merchant was clicked
  if (showFunnelBuilder && liveFunnel) {
    return (
      <AIFunnelBuilderPage
        funnel={liveFunnel}
        onBack={() => setShowFunnelBuilder(false)}
        onUpdate={(updatedFunnel) => {
          setLiveFunnel(updatedFunnel);
          console.log('Funnel updated:', updatedFunnel);
        }}
        onGoToFunnelProducts={() => {
          console.log('Navigate to funnel products');
        }}
        user={{ experienceId }}
        hasAnyLiveFunnel={isFunnelActive}
        isSingleMerchant={true}
      />
    );
  }

  return (
    <>
      
      <div 
        ref={appRef} 
        className={`min-h-screen font-inter antialiased relative overflow-y-auto overflow-x-hidden transition-all duration-700 ${!uploadedBackground && !generatedBackground && !legacyTheme.backgroundImage ? legacyTheme.background : ''}`}
        style={getBackgroundStyle}
      >
      {/* Top Navbar with Integrated Progress Bar */}
      <div className="sticky top-0 z-30 flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg min-h-[4rem]">
        <div className="px-3 py-2 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              {/* Back Arrow */}
              <button
                onClick={onBack || (() => window.history.back())}
                className="p-1 text-white hover:text-gray-300 transition-colors duration-200"
                title="Go Back to Store Preview"
              >
                <ArrowLeft size={16} />
              </button>
            </div>

            {/* Center: Generate Background Button (Page view) or Hide Chat Button */}
            <div className="flex-1 flex justify-center">
              {/* Generate Background Button in Center (Page view only) */}
              {!editorState.isEditorView && showGenerateBgInNavbar && !isChatOpen && (
                <button 
                  onClick={handleGenerateBgClick}
                  disabled={loadingState.isImageLoading}
                  className={`px-4 py-2 rounded-xl group transition-all duration-300 transform hover:scale-105 relative shadow-lg flex items-center space-x-2 ${
                    loadingState.isImageLoading 
                      ? 'bg-gradient-to-r from-indigo-800 to-purple-800 text-indigo-400 cursor-not-allowed shadow-indigo-500/25' 
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                  }`}
                  title="Generate AI Background"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-medium text-white">Generate Background</span>
                </button>
              )}
              
              {/* Hide Chat Button when chat is open */}
              {isChatOpen && (
                <div className="relative">
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className={`group relative z-10 flex items-center justify-center px-6 py-3 text-sm rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ${promoButton.ringClass} ${getHoverRingClass(promoButton.ringHoverClass)} ${promoButton.buttonClass} shadow-2xl`}
                    title="Hide Chat"
                  >
                    {/* Chat Icon with 3 dots for Hide Chat */}
                    <div className="w-5 h-5 text-white relative z-10 mr-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {/* 3 Dots inside the circle */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex space-x-0.5">
                          <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                          <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                          <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold">HIDE CHAT</span>
                  </button>
                  {/* Below-button glow (positioned vertically lower than the button) */}
                  <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-3 w-full max-w-[110%] h-6 opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-500 ${getGlowBgClass(promoButton.ringHoverClass)}`}></span>
                  <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-full max-w-[90%] h-4 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-500 ${getGlowBgStrongClass(promoButton.ringHoverClass)}`}></span>
                </div>
              )}
            </div>

            {/* Right Side: Admin Controls */}
            <div className="p-1 rounded-lg bg-black/50 backdrop-blur text-white text-xs shadow-2xl flex items-center space-x-2 min-h-[2.5rem] h-full flex-shrink-0">
              {/* View Toggle */}
              <button 
                onClick={() => {
                  toggleEditorView();
                  // Close chat when switching to editor view
                  if (!editorState.isEditorView && isChatOpen) {
                    setIsChatOpen(false);
                  }
                }}
                className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 shadow-lg ${
                  editorState.isEditorView 
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-red-500/25 hover:shadow-red-500/40' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/25 hover:shadow-green-500/40'
                } text-white relative`}
                title={editorState.isEditorView ? 'Switch to Customer Page View' : 'Switch to Editor View'}
              >
                <div className="flex items-center justify-center">
                    {editorState.isEditorView ? (
                      <EyeIcon className="w-5 h-5" />
                    ) : (
                      <EditIcon className="w-5 h-5" />
                    )}
                </div>
                {/* Tooltip */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                  {editorState.isEditorView ? 'Page View' : 'Editor View'}
                </div>
              </button>

              {/* Generate Background Button - Icon in theme bar (Editor view only) */}
              {editorState.isEditorView && showGenerateBgInNavbar && !isChatOpen && (
                <button 
                  onClick={handleGenerateBgClick}
                  disabled={loadingState.isImageLoading}
                  className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 relative shadow-lg ${
                    loadingState.isImageLoading 
                      ? 'bg-gradient-to-r from-indigo-800 to-purple-800 text-indigo-400 cursor-not-allowed shadow-indigo-500/25' 
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                  }`}
                  title="Generate AI Background"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                    Generate Background
                  </div>
                </button>
              )}

              {editorState.isEditorView && (
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Theme Selector */}
                  <div className="flex items-center space-x-2">
                    <label htmlFor="season" className="font-semibold flex-shrink-0 hidden sm:inline text-white">Theme:</label>
                    <select
                      id="season"
                      value={currentSeason}
                      onChange={(e) => { 
                        setCurrentSeason(e.target.value);
                      }}
                      className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      {Object.keys(allThemes).map(s => (
                        <option key={s} value={s}>{allThemes[s].name}</option>
                      ))}
                    </select>
                  </div>
                  
                  
                  {/* Background Generate - Icon only when moved from navbar */}
                  {!showGenerateBgInNavbar && (
                    <button 
                      onClick={handleGenerateBgClick}
                      disabled={loadingState.isImageLoading}
                      className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 relative shadow-lg ${
                        loadingState.isImageLoading 
                          ? 'bg-gradient-to-r from-indigo-800 to-purple-800 text-indigo-400 cursor-not-allowed shadow-indigo-500/25' 
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                      }`}
                      title="Generate AI Background"
                    >
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                        Generate Background
                      </div>
                    </button>
                  )}
                  
                  {/* Background Upload */}
                  <label htmlFor="bg-upload" className="cursor-pointer p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 relative">
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Upload Background
                    </div>
                    <input 
                      type="file" 
                      id="bg-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleBgImageUpload(e.target.files?.[0]!)}
                      disabled={loadingState.isUploadingImage}
                    />
                  </label>
                  
                  {/* Save Template */}
                  <button 
                    onClick={handleSaveTemplate}
                    className="p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 relative"
                    title="Save Current Store as Template"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Save
                    </div>
                  </button>
                  
                  {/* Elements */}
                  <button 
                    onClick={toggleAdminSheet}
                    className="p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 relative"
                    title="Manage Elements & AI Tools"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Assets
                    </div>
                  </button>
                  
                  {/* Templates */}
                  <button 
                    onClick={openTemplateManager}
                    className="p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 relative"
                    title="Manage Templates"
                  >
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                      Templates
                    </div>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>



      {/* Loading Overlay */}
      {(loadingState.isTextLoading || loadingState.isImageLoading || loadingState.isUploadingImage || loadingState.isGeneratingImage) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="flex items-center text-white text-2xl p-6 rounded-xl bg-gray-800 shadow-2xl">
            <ZapIcon className="w-8 h-8 mr-4 animate-bounce text-cyan-400" />
            {loadingState.isGeneratingImage ? '🎨 Generating AI Image (nano-banana)...' : 
             loadingState.isUploadingImage ? '📤 Uploading Image to WHOP...' : 
             loadingState.isTextLoading ? '🤖 Refining Text/Emoji (Gemini)...' : 
             loadingState.isImageLoading ? '🎨 Generating AI Image (nano-banana)...' : 
             '✨ Working on AI Magic...'}
          </div>
        </div>
      )}


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
        onClick={() => editorState.isEditorView && setSelectedAsset(null)}
        onDragOver={(e) => editorState.isEditorView && e.preventDefault()}
        onDrop={editorState.isEditorView ? handleDropAsset : undefined}
      >
        {/* Logo Section */}
        {editorState.isEditorView ? (
          <div className="w-full max-w-5xl mx-auto mb-4">
            <div className="text-center">
              
              <div 
                className="relative w-24 h-24 mb-2 mx-auto overflow-hidden group"
                onMouseEnter={() => {
                  // Show controls when hovering over entire logo
                  const controls = document.querySelector('.logo-controls') as HTMLElement;
                  if (controls) controls.style.opacity = '1';
                }}
                onMouseLeave={() => {
                  // Hide controls when leaving entire logo
                  const controls = document.querySelector('.logo-controls') as HTMLElement;
                  if (controls) controls.style.opacity = '0';
                }}
              >
                <div className={`w-full h-full ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}>
                  <img
                    src={logoAsset.src}
                    alt={logoAsset.alt}
                    className={`w-full h-full object-cover ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}
                  />
                </div>
                
                {/* Logo Controls - Only visible when hovering over entire logo */}
                <div className="logo-controls absolute inset-0 flex flex-col items-center justify-center space-y-2 opacity-0 transition-opacity duration-300 bg-black/50 rounded-full">
                  {/* Upload Button - Top */}
                  <label htmlFor="logo-upload" className="cursor-pointer p-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <input 
                      type="file" 
                      id="logo-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleLogoImageUpload(e.target.files?.[0]!)}
                      disabled={loadingState.isUploadingImage}
                    />
                  </label>
                  
                  {/* Zap Button - Middle */}
                  <button
                    onClick={() => handleLogoGeneration(logoAsset, logoAsset.shape, legacyTheme.name)}
                    disabled={loadingState.isGeneratingImage || loadingState.isTextLoading}
                    className={`p-2 rounded-xl group transition-all duration-300 shadow-lg hover:scale-105 ${
                      (loadingState.isGeneratingImage || loadingState.isTextLoading) 
                        ? 'bg-indigo-800 text-indigo-400 cursor-not-allowed shadow-indigo-500/25' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
                    }`}
                    title={logoAsset.src.includes('placehold.co') ? `Generate ${currentSeason} Logo` : `Refine to ${currentSeason}`}
                  >
                    <div className="flex items-center justify-center">
                      <ZapIcon className="w-3 h-3" />
                    </div>
                  </button>
                  
                  {/* Shape Toggle - Bottom */}
                  <button
                    onClick={() => setLogoAsset({ 
                      ...logoAsset, 
                      shape: logoAsset.shape === 'round' ? 'square' : 'round' 
                    })}
                    className="px-3 py-1 text-xs font-medium rounded-xl transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
                    disabled={loadingState.isImageLoading}
                    title={`Switch to ${logoAsset.shape === 'round' ? 'Square' : 'Round'}`}
                  >
                    {logoAsset.shape === 'round' ? 'Round' : 'Square'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl mx-auto mb-4 pt-2">
            <div className={`w-24 h-24 mx-auto overflow-hidden ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}>
              <img
                src={logoAsset.src}
                alt={logoAsset.alt}
                className={`w-full h-full object-cover ${logoAsset.shape === 'round' ? 'rounded-full' : 'rounded-3xl'}`}
              />
            </div>
          </div>
        )}
        
        {/* Store Header - Direct on Background */}
        <div className="text-center mb-2 relative w-full">
          
          {inlineEditTarget === 'headerMessage' ? (
            <input
              ref={headerInputRef}
              type="text"
              value={headerMessage?.content || ''}
              onChange={(e) => setFixedTextStyles(prev => ({
                ...prev,
                headerMessage: { 
                  content: e.target.value,
                  color: prev.headerMessage?.color || '#FFFFFF',
                  styleClass: prev.headerMessage?.styleClass || 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
                }
              }))}
              onBlur={() => setInlineEditTarget(null)}
              className={`w-full text-center bg-white/20 backdrop-blur-sm border-2 rounded-lg px-4 py-2 outline-none focus:bg-white/30 transition-all duration-200 ${applyThemeColorsToText(headerMessage, 'header')} ${getThemeColors.borderClass}-400 focus:${getThemeColors.borderClass}-500`}
              style={{ 
                color: headerMessage?.color, 
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)' 
              }}
            />
          ) : (
            <p 
              className={`${applyThemeColorsToText(headerMessage, 'header')} ${editorState.isEditorView ? 'cursor-pointer hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1' : ''}`}
              style={{ 
                color: headerMessage?.color, 
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)' 
              }}
               onClick={() => {
                 if (editorState.isEditorView) {
                   // If modal is open for any text, don't handle clicks on page text elements
                   if (editingText.isOpen) {
                     return; // Do nothing when modal is open
                   }
                   // First click: open modal and immediately activate inline editing
                   setEditingText({ isOpen: true, targetId: 'headerMessage' });
                   setTimeout(() => setInlineEditTarget('headerMessage'), 100);
                 }
               }}
            >
              {headerMessage?.content || ''}
            </p>
          )}
          
          {inlineEditTarget === 'subHeader' ? (
            <textarea
              ref={subHeaderInputRef as any}
              rows={2}
              value={subHeader?.content || ''}
              onChange={(e) => setFixedTextStyles(prev => ({
                ...prev,
                subHeader: { 
                  content: e.target.value,
                  color: prev.subHeader?.color || '#FFFFFF',
                  styleClass: prev.subHeader?.styleClass || 'text-lg sm:text-xl font-normal'
                }
              }))}
              onBlur={() => setInlineEditTarget(null)}
              className={`w-full text-center bg-white/20 backdrop-blur-sm border-2 rounded-lg px-4 py-2 outline-none focus:bg-white/30 transition-all duration-200 resize-none ${applyThemeColorsToText(subHeader, 'subheader')} ${getThemeColors.borderClass}-400 focus:${getThemeColors.borderClass}-500`}
              style={{ 
                color: subHeader?.color, 
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)' 
              }}
            />
          ) : (
            <p 
              className={`${applyThemeColorsToText(subHeader, 'subheader')} ${editorState.isEditorView ? 'cursor-pointer hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1' : ''}`}
              style={{ 
                color: subHeader?.color, 
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)' 
              }}
               onClick={() => {
                 if (editorState.isEditorView) {
                   // If modal is open for any text, don't handle clicks on page text elements
                   if (editingText.isOpen) {
                     return; // Do nothing when modal is open
                   }
                   // First click: open modal and immediately activate inline editing
                   setEditingText({ isOpen: true, targetId: 'subHeader' });
                   setTimeout(() => setInlineEditTarget('subHeader'), 100);
                 }
               }}
            >
              {subHeader?.content || ''}
            </p>
          )}
        </div>

        {/* API Error Display */}
        {editorState.isEditorView && apiError && (
          <div className="w-full max-w-5xl p-6 mb-8 bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-100 rounded-2xl flex items-center shadow-2xl">
            <AlertTriangleIcon className="w-6 h-6 mr-3 flex-shrink-0 text-red-300" />
            <p className="font-medium text-sm sm:text-base">{apiError}</p>
          </div>
        )}

        {/* Floating Add Product Button - Only in Edit View */}
        {editorState.isEditorView && (
           <button
             onClick={handleAddProduct}
             className="fixed top-24 right-6 z-50 flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 backdrop-blur-sm border border-green-500/20"
           >
             <PlusCircleIcon className="w-4 h-4 mr-2" /> Add New Product
           </button>
        )}
        
        {/* Product Showcase */}
        <div className="w-full max-w-5xl my-4">
          {combinedProducts.length > 0 ? (
            <div className="flex items-center gap-4">
              {/* Left Arrow - Only show on desktop when there are more than 2 products */}
              {combinedProducts.length > 2 && (
                <button
                  onClick={navigateToPrevious}
                  disabled={currentProductIndex === 0}
                  className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
                  title="Previous products"
                >
                  <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              
              {/* Product Grid - Show 1 product on mobile, 2 on desktop with slide-out and slide-in animation */}
              <div 
                className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto overflow-hidden w-full"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {combinedProducts.slice(currentProductIndex, currentProductIndex + 2).map((product, index) => (
                  <div 
                    key={`${product.id}-${currentProductIndex}`}
                    className={`transition-all duration-150 ease-in-out transform ${
                      !editorState.isEditorView 
                        ? 'animate-in zoom-in-95 fade-in'
                        : ''
                    } ${index === 1 ? 'hidden md:block' : ''}`}
                    style={{ 
                      animationDelay: !editorState.isEditorView ? `${index * 50}ms` : '0ms',
                      animationDuration: !editorState.isEditorView ? '150ms' : '0ms',
                      transform: swipeDirection === 'left' 
                        ? 'translateX(100%)' 
                        : swipeDirection === 'right'
                        ? 'translateX(-100%)'
                        : 'translateX(0%)',
                      opacity: swipeDirection === 'left' || swipeDirection === 'right' ? 0 : 1,
                      transitionDelay: swipeDirection ? `${index * 40}ms` : '0ms'
                    }}
                  >
                    <ProductCard
                      product={product}
                      theme={legacyTheme}
                      isEditorView={editorState.isEditorView}
                      loadingState={loadingState}
                      onUpdateProduct={updateProduct}
                      onDeleteProduct={deleteProduct}
                      onProductImageUpload={handleProductImageUpload}
                      onRefineProduct={handleRefineAll}
                      onRemoveSticker={handleRemoveSticker}
                      onDropAsset={handleDropOnProduct}
                      onOpenEditor={(id, target) => openProductEditor(id, target)}
                      inlineNameActive={inlineEditTarget === 'productName' && inlineProductId === product.id}
                      inlineDescActive={inlineEditTarget === 'productDesc' && inlineProductId === product.id}
                    />
                  </div>
                ))}
              </div>
              
              
              {/* Right Arrow - Only show on desktop when there are more than 2 products */}
              {combinedProducts.length > 2 && (
                <button
                  onClick={navigateToNext}
                  disabled={currentProductIndex >= combinedProducts.length - 2}
                  className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
                  title="Next products"
                >
                  <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No products yet. Click "Add New Product" to get started!</p>
            </div>
          )}
          
        </div>

         {/* Navigation Dots - Only show on mobile when there are multiple products */}
         {combinedProducts.length > 1 && (
           <div className="flex justify-center mt-4 space-x-2 md:hidden">
             {Array.from({ length: Math.max(1, combinedProducts.length - 1) }, (_, index) => (
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

         {/* Fixed Gift Promotion Block - Only show when there's a live funnel */}
         {funnelFlow && isFunnelActive && (
           <div className="w-full max-w-3xl my-1 text-center">
             {inlineEditTarget === 'promoMessage' ? (
               <textarea
                 ref={promoInputRef as any}
                 rows={2}
                 value={promoMessage?.content || ''}
                 onChange={(e) => setFixedTextStyles(prev => ({
                   ...prev,
                   promoMessage: { 
                     content: e.target.value,
                     color: prev.promoMessage?.color || '#FFFFFF',
                     styleClass: prev.promoMessage?.styleClass || 'text-2xl sm:text-3xl font-semibold drop-shadow-md'
                   }
                 }))}
                 onBlur={() => setInlineEditTarget(null)}
                 className={`${applyThemeColorsToText(promoMessage, 'promo')} w-full mb-8 drop-shadow-md bg-white/20 backdrop-blur-sm border-2 rounded-lg px-4 py-2 outline-none focus:bg-white/30 transition-all duration-200 text-center resize-none ${getThemeColors.borderClass}-400 focus:${getThemeColors.borderClass}-500`}
                 style={{ 
                   color: promoMessage?.color, 
                   textShadow: '1px 1px 2px rgba(0,0,0,0.3)' 
                 }}
                 placeholder="Click to edit text..."
               />
             ) : (
               <p
                  onClick={() => {
                    if (editorState.isEditorView) {
                      // If modal is open for any text, don't handle clicks on page text elements
                      if (editingText.isOpen) {
                        return; // Do nothing when modal is open
                      }
                      // First click: open modal and immediately activate inline editing
                      setEditingText({ isOpen: true, targetId: 'promoMessage' });
                      setTimeout(() => setInlineEditTarget('promoMessage'), 100);
                    }
                  }}
                 className={`${applyThemeColorsToText(promoMessage, 'promo')} mb-8 drop-shadow-md ${editorState.isEditorView ? 'cursor-pointer hover:bg-white/10 rounded-lg p-2 transition-colors duration-200' : ''}`}
                 style={{ 
                   color: promoMessage?.color, 
                   textShadow: '1px 1px 2px rgba(0,0,0,0.3)' 
                 }}
               >
                 {promoMessage?.content || ''}
               </p>
             )}
             
             <div className="relative w-full mt-8">
               <button
               onClick={() => {
                 if (editorState.isEditorView) {
                   openProductEditor(null, 'button');
                 } else {
                   // Open chat when gift button is clicked
                   setIsChatOpen(true);
                 }
               }}
                 className={`group relative z-10 flex items-center justify-center w-full py-4 text-xl rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ${promoButton.ringClass} ${getHoverRingClass(promoButton.ringHoverClass)} ${promoButton.buttonClass} shadow-2xl`}
             >
               {promoButton.icon && (
                 <span className="mr-3 text-2xl animate-pulse">
                   {promoButton.icon}
                 </span>
               )}
               {promoButton.text}
             </button>
               {/* Below-button glow (positioned vertically lower than the button) */}
               <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-6 w-full max-w-[110%] h-10 opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500 ${getGlowBgClass(promoButton.ringHoverClass)}`}></span>
               <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-4 w-full max-w-[90%] h-8 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-500 ${getGlowBgStrongClass(promoButton.ringHoverClass)}`}></span>
             </div>
           </div>
         )}


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


      {/* Simple Text Editor Modal */}
      {editingText.isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${textSheetAnimOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTextEditorAnimated();
          }}
          style={{
            // Remove overlay blocking when modal is open for the same text element
            pointerEvents: editingText.targetId === 'headerMessage' || editingText.targetId === 'subHeader' || editingText.targetId === 'promoMessage' ? 'none' : 'auto'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Text"
            className={`fixed inset-y-0 right-0 w-80 bg-gray-900/70 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-500 z-[60] p-0 border-l border-gray-700/50 overflow-hidden ${textSheetAnimOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
              <h3 className={`text-sm font-semibold tracking-wide ${backgroundAnalysis.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>Edit Text</h3>
              <button
                onClick={closeTextEditorAnimated}
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4 overflow-y-auto h-full pb-28">
              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Content</label>
                <textarea
                  rows={4}
                  value={fixedTextStyles[editingText.targetId]?.content || ''}
                  onChange={(e) => setFixedTextStyles(prev => ({
                    ...prev,
                    [editingText.targetId]: { 
                      ...prev[editingText.targetId],
                      content: e.target.value,
                      color: prev[editingText.targetId]?.color || '#FFFFFF',
                      styleClass: prev[editingText.targetId]?.styleClass || ''
                    }
                  }))}
                  // Removed onFocus handler - textarea should work normally within modal
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 min-h-[96px]"
                />
              </div>

              {/* Delete Button */}
              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    setFixedTextStyles(prev => ({
                      ...prev,
                      [editingText.targetId]: { 
                        content: '',
                        color: prev[editingText.targetId]?.color || '#FFFFFF',
                        styleClass: prev[editingText.targetId]?.styleClass || ''
                      }
                    }));
                    closeTextEditorAnimated();
                  }}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Remove Text
                </button>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={fixedTextStyles[editingText.targetId]?.color || '#FFFFFF'}
                    onChange={(e) => setFixedTextStyles(prev => ({
                      ...prev,
                      [editingText.targetId]: { 
                        ...prev[editingText.targetId],
                        color: e.target.value,
                        content: prev[editingText.targetId]?.content || '',
                        styleClass: prev[editingText.targetId]?.styleClass || ''
                      }
                    }))}
                    className="w-10 h-8 rounded border-none cursor-pointer"
                  />
                  <input
                    type="text"
                    value={fixedTextStyles[editingText.targetId]?.color || '#FFFFFF'}
                    onChange={(e) => setFixedTextStyles(prev => ({
                      ...prev,
                      [editingText.targetId]: { 
                        ...prev[editingText.targetId],
                        color: e.target.value,
                        content: prev[editingText.targetId]?.content || '',
                        styleClass: prev[editingText.targetId]?.styleClass || ''
                      }
                    }))}
                    className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Typography */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Typography</label>
                <select
                  value={fixedTextStyles[editingText.targetId]?.styleClass || ''}
                  onChange={(e) => setFixedTextStyles(prev => ({
                    ...prev,
                    [editingText.targetId]: { 
                      ...prev[editingText.targetId],
                      styleClass: e.target.value,
                      content: prev[editingText.targetId]?.content || '',
                      color: prev[editingText.targetId]?.color || '#FFFFFF'
                    }
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                >
                  <option value="text-8xl sm:text-9xl font-extrabold tracking-tight drop-shadow-lg">Display Extra Large</option>
                  <option value="text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg">Display Large</option>
                  <option value="text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg">Display Medium</option>
                  <option value="text-4xl sm:text-5xl font-semibold tracking-tight drop-shadow-lg">Display Small</option>
                  <option value="text-3xl sm:text-4xl font-bold drop-shadow-md">Heading Large</option>
                  <option value="text-2xl sm:text-3xl font-semibold drop-shadow-md">Heading Medium</option>
                  <option value="text-xl sm:text-2xl font-medium drop-shadow-sm">Heading Small</option>
                  <option value="text-lg sm:text-xl font-normal">Body Large</option>
                  <option value="text-base sm:text-lg font-normal">Body Medium</option>
                  <option value="text-sm sm:text-base font-normal">Body Small</option>
                </select>
              </div>

              {/* Bold and Italic Controls */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Text Style</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-300">Bold:</label>
                    <button
                      onClick={() => {
                        const currentStyle = fixedTextStyles[editingText.targetId]?.styleClass || '';
                        const isBold = currentStyle.includes('font-bold') || currentStyle.includes('font-extrabold') || currentStyle.includes('font-black');
                        const newStyleClass = isBold 
                          ? currentStyle.replace(/font-\w+/g, 'font-normal')
                          : currentStyle.replace(/font-\w+/g, 'font-bold');
                        setFixedTextStyles(prev => ({
                          ...prev,
                          [editingText.targetId]: { 
                            ...prev[editingText.targetId],
                            styleClass: newStyleClass,
                            content: prev[editingText.targetId]?.content || '',
                            color: prev[editingText.targetId]?.color || '#FFFFFF'
                          }
                        }));
                      }}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        fixedTextStyles[editingText.targetId]?.styleClass?.includes('font-bold') || 
                        fixedTextStyles[editingText.targetId]?.styleClass?.includes('font-extrabold') || 
                        fixedTextStyles[editingText.targetId]?.styleClass?.includes('font-black')
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      B
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-300">Italic:</label>
                    <button
                      onClick={() => {
                        const currentStyle = fixedTextStyles[editingText.targetId]?.styleClass || '';
                        const isItalic = currentStyle.includes('italic');
                        const newStyleClass = isItalic 
                          ? currentStyle.replace(' italic', '').replace('italic', '')
                          : currentStyle + ' italic';
                        setFixedTextStyles(prev => ({
                          ...prev,
                          [editingText.targetId]: { 
                            ...prev[editingText.targetId],
                            styleClass: newStyleClass,
                            content: prev[editingText.targetId]?.content || '',
                            color: prev[editingText.targetId]?.color || '#FFFFFF'
                          }
                        }));
                      }}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        fixedTextStyles[editingText.targetId]?.styleClass?.includes('italic')
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                      }`}
                    >
                      I
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Colors (Theme-matched) */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Quick Colors</label>
                <div className="flex flex-wrap gap-2">
                  {getThemeQuickColors(legacyTheme).map((color) => (
                    <button
                      key={color}
                      onClick={() => setFixedTextStyles(prev => ({
                        ...prev,
                        [editingText.targetId]: { ...prev[editingText.targetId], color }
                      }))}
                      className="w-8 h-8 rounded-full border-2 border-gray-600 hover:border-gray-400 transition-colors"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="h-24" />
            </div>

            <div className="sticky bottom-0 z-10 px-4 py-3 border-t border-gray-800/50 bg-transparent backdrop-blur-sm flex justify-end gap-2">
              <button
                onClick={closeTextEditorAnimated}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={closeTextEditorAnimated}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Slide-over Editor */}
      {productEditor.isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${productSheetAnimOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeProductEditorAnimated(); }}
          style={{
            // Remove overlay blocking when product editor modal is open
            pointerEvents: 'none'
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Product"
            className={`fixed inset-y-0 right-0 w-80 bg-gray-900/70 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-500 z-[60] p-0 border-l border-gray-700/50 overflow-hidden ${productSheetAnimOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
              <h3 className={`text-sm font-semibold tracking-wide flex items-center ${backgroundAnalysis.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>
                {productEditor.target === 'button' ? (
                  productEditor.productId === null ? (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7z" />
                      </svg>
                      Edit Claim Button
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Edit Button
                    </>
                  )
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Product
                  </>
                )}
              </h3>
              <button onClick={closeProductEditorAnimated} className="text-gray-300 hover:text-white transition-colors" aria-label="Close">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            {productEditor.productId !== null && (
              <div className="space-y-4 px-4 py-4 overflow-y-auto h-full pb-28">
                {productEditor.target !== 'button' && (
                  <>
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
                      <input
                        type="text"
                        value={products.find(p => p.id === productEditor.productId)?.name || ''}
                        onChange={(e) => updateProduct(productEditor.productId!, { name: e.target.value })}
                        // Removed onFocus handler - input should work normally within modal
                        placeholder="Enter name"
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder-black"
                      />
                    </div>
                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                      <textarea
                        value={products.find(p => p.id === productEditor.productId)?.description || ''}
                        onChange={(e) => updateProduct(productEditor.productId!, { description: e.target.value })}
                        // Removed onFocus handler - textarea should work normally within modal
                        placeholder="Enter description"
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 h-24 placeholder-black"
                      />
                    </div>
                    {/* Removed Card Class (Tailwind) per request */}
                  </>
                )}
                {/* Button-only section (distinct modal experience) */}
                {productEditor.target === 'button' && (
                  <>
                    {/* Button Text (per-product) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Button Text (This card only)</label>
                      <input
                        type="text"
                        value={products.find(p => p.id === productEditor.productId)?.buttonText || ''}
                        onChange={(e) => updateProduct(productEditor.productId!, { buttonText: e.target.value })}
                        placeholder="Enter button text"
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder-black"
                      />
                    </div>
                    
                    {/* Button Link (per-product) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Button Link (Where to redirect when clicked)</label>
                      <input
                        type="url"
                        value={products.find(p => p.id === productEditor.productId)?.buttonLink || ''}
                        onChange={(e) => updateProduct(productEditor.productId!, { buttonLink: e.target.value })}
                        placeholder="https://example.com or /product-page"
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder-black"
                      />
                      <p className="text-xs text-gray-400 mt-1">Enter a full URL (https://...) or a relative path (/page)</p>
                    </div>
                    
                    {/* Button Class (apply to all option) */}
                    <ButtonColorControls 
                      products={products}
                      productId={productEditor.productId!}
                      themeAccent={legacyTheme.accent}
                      updateProduct={updateProduct}
                      setPromoButton={setPromoButton}
                    />
                    {/* Removed animation color per request */}
                  </>
                )}
                {/* Card Style Presets (apply per-card or all) */}
                {productEditor.target !== 'button' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Card Style</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {[
                        // Light glassy white
                        { card: 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30', title: 'text-gray-900', desc: 'text-gray-700' },
                        // Cyber dark
                        { card: 'bg-gray-900/90 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-cyan-400/50 border border-cyan-400', title: 'text-white', desc: 'text-cyan-200' },
                        // Autumn amber
                        { card: 'bg-amber-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-orange-500/30', title: 'text-amber-900', desc: 'text-amber-700' },
                        // Spring green
                        { card: 'bg-green-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-pink-400/30', title: 'text-green-900', desc: 'text-green-700' },
                        // Lavender
                        { card: 'bg-purple-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-purple-500/30', title: 'text-purple-900', desc: 'text-purple-700' },
                        // Sky
                        { card: 'bg-blue-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30', title: 'text-blue-900', desc: 'text-blue-700' },
                        // Rose
                        { card: 'bg-rose-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-rose-500/30', title: 'text-rose-900', desc: 'text-rose-700' },
                        // Emerald glass
                        { card: 'bg-emerald-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-emerald-500/30', title: 'text-emerald-900', desc: 'text-emerald-700' },
                        // Slate neutral
                        { card: 'bg-slate-100/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-slate-400/30', title: 'text-slate-900', desc: 'text-slate-700' },
                        // Night purple border
                        { card: 'bg-[#0f0b1f]/90 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-purple-400/40 border border-purple-400/40', title: 'text-purple-100', desc: 'text-purple-300' }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => updateProduct(productEditor.productId!, { cardClass: preset.card, titleClass: preset.title, descClass: preset.desc })}
                          className={`p-3 rounded-xl text-left ${preset.card}`}
                        >
                          <div className={`text-sm font-bold ${preset.title}`}>Product Title</div>
                          <div className={`text-xs ${preset.desc}`}>Short description goes here...</div>
                        </button>
                      ))}
                    </div>
                    {/* Card Transparency */}
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-300 mb-1">Card Transparency</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={(function(){
                            const current = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                            const m = current.match(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/(\d{1,3}))?/);
                            const v = m?.[1] ? parseInt(m[1], 10) : 90;
                            return isNaN(v) ? 90 : Math.max(0, Math.min(100, v));
                          })()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const current = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                            const next = current.replace(/(bg-[^\s/]+(?:\[[^\]]+\])?)(?:\/\d{1,3})?/, `$1/${val}`);
                            updateProduct(productEditor.productId!, { cardClass: next });
                          }}
                          className="w-full"
                        />
                        <span className="text-xs text-gray-400 w-10 text-right">{(function(){
                          const current = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                          const m = current.match(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/(\d{1,3}))?/);
                          const v = m?.[1] ? parseInt(m[1], 10) : 90;
                          return isNaN(v) ? 90 : v;
                        })()}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => {
                          const currentCard = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                          const currentTitle = products.find(p => p.id === productEditor.productId!)?.titleClass || legacyTheme.text;
                          const currentDesc = products.find(p => p.id === productEditor.productId!)?.descClass || legacyTheme.text;
                          products.forEach(p => {
              updateProduct(p.id, { cardClass: currentCard, titleClass: currentTitle, descClass: currentDesc });
            });
                        }}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-xs"
                      >
                        Apply to All Cards
                      </button>
                    </div>
                  </div>
                )}
                <div className="h-24" />
              </div>
            )}
            {/* Button-only section for Claim button (no productId) */}
            {productEditor.productId === null && productEditor.target === 'button' && (
              <div className="space-y-4 px-4 py-4 overflow-y-auto h-full pb-28">
                {/* Claim Button Text */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Button Text</label>
                  <input
                    type="text"
                    value={promoButton.text}
                    onChange={(e) => setPromoButton(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter claim button text"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                  />
                </div>
                
                {/* Claim Button Icon */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Button Icon</label>
                  
                  {/* Search Input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search emojis (e.g., pumpkin, heart)..."
                      value={emojiSearchQuery}
                      onChange={(e) => setEmojiSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                    />
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-3">
                    {(() => {
                      // Comprehensive emoji database with proper search functionality
                      const EMOJI_DATABASE = [
                        // Halloween & Spooky
                        { emoji: '🎃', name: 'Pumpkin', keywords: ['pumpkin', 'halloween', 'orange', 'jack', 'lantern', 'carved'] },
                        { emoji: '👻', name: 'Ghost', keywords: ['ghost', 'spooky', 'white', 'scary', 'spirit', 'haunted'] },
                        { emoji: '💀', name: 'Skull', keywords: ['skull', 'bone', 'death', 'spooky', 'skeleton', 'dead'] },
                        { emoji: '🕷️', name: 'Spider', keywords: ['spider', 'web', 'bug', 'creepy', 'arachnid', 'crawly'] },
                        { emoji: '🦇', name: 'Bat', keywords: ['bat', 'flying', 'dark', 'night', 'winged', 'vampire'] },
                        { emoji: '🧙‍♀️', name: 'Witch', keywords: ['witch', 'magic', 'hat', 'broom', 'spell', 'wizard'] },
                        { emoji: '🧹', name: 'Broom', keywords: ['broom', 'cleaning', 'witch', 'flying', 'sweep', 'handle'] },
                        { emoji: '🍭', name: 'Candy', keywords: ['candy', 'sweet', 'lollipop', 'treat', 'sugar', 'sucker'] },
                        { emoji: '⚰️', name: 'Coffin', keywords: ['coffin', 'death', 'burial', 'dark', 'grave', 'casket'] },
                        { emoji: '🔮', name: 'Crystal Ball', keywords: ['crystal', 'ball', 'magic', 'fortune', 'future', 'prediction'] },
                        { emoji: '🧟‍♂️', name: 'Zombie', keywords: ['zombie', 'undead', 'walking', 'dead', 'monster', 'infected'] },
                        { emoji: '🧛‍♂️', name: 'Vampire', keywords: ['vampire', 'blood', 'fangs', 'night', 'undead', 'dracula'] },

                        // Christmas & Winter
                        { emoji: '🎄', name: 'Tree', keywords: ['tree', 'christmas', 'pine', 'decorated', 'holiday', 'fir'] },
                        { emoji: '🎁', name: 'Gift', keywords: ['gift', 'present', 'box', 'wrapped', 'surprise', 'package'] },
                        { emoji: '🎅', name: 'Santa', keywords: ['santa', 'claus', 'beard', 'red', 'christmas', 'jolly'] },
                        { emoji: '⛄', name: 'Snowman', keywords: ['snowman', 'snow', 'winter', 'carrot', 'frosty', 'cold'] },
                        { emoji: '🔔', name: 'Bell', keywords: ['bell', 'ring', 'sound', 'gold', 'jingle', 'chime'] },
                        { emoji: '⭐', name: 'Star', keywords: ['star', 'bright', 'shining', 'gold', 'sparkle', 'twinkle'] },
                        { emoji: '👼', name: 'Angel', keywords: ['angel', 'wings', 'heaven', 'white', 'divine', 'holy'] },
                        { emoji: '🦌', name: 'Reindeer', keywords: ['reindeer', 'deer', 'antlers', 'brown', 'rudolph', 'christmas'] },
                        { emoji: '🛷', name: 'Sleigh', keywords: ['sleigh', 'sled', 'santa', 'ride', 'snow', 'winter'] },
                        { emoji: '🎀', name: 'Bow', keywords: ['bow', 'ribbon', 'decoration', 'gift', 'pretty', 'tie'] },
                        { emoji: '🔥', name: 'Fire', keywords: ['fire', 'flame', 'warm', 'cozy', 'heat', 'burn'] },
                        { emoji: '❄️', name: 'Snowflake', keywords: ['snowflake', 'snow', 'ice', 'cold', 'winter', 'frozen'] },
                        { emoji: '🧊', name: 'Ice', keywords: ['ice', 'cold', 'frozen', 'crystal', 'winter', 'chill'] },
                        { emoji: '🥶', name: 'Cold Face', keywords: ['cold', 'freezing', 'blue', 'face', 'winter', 'chilly'] },
                        { emoji: '☕', name: 'Hot Drink', keywords: ['hot', 'drink', 'coffee', 'warm', 'mug', 'beverage'] },
                        { emoji: '🧤', name: 'Mittens', keywords: ['mittens', 'gloves', 'hands', 'warm', 'winter', 'fingers'] },
                        { emoji: '🧣', name: 'Scarf', keywords: ['scarf', 'neck', 'warm', 'wrapped', 'winter', 'cozy'] },
                        { emoji: '🥾', name: 'Boots', keywords: ['boots', 'shoes', 'feet', 'warm', 'winter', 'hiking'] },
                        { emoji: '🎿', name: 'Ski', keywords: ['ski', 'snow', 'sport', 'winter', 'slope', 'mountain'] },
                        { emoji: '🐧', name: 'Penguin', keywords: ['penguin', 'bird', 'black', 'white', 'antarctic', 'waddle'] },
                        { emoji: '🐻‍❄️', name: 'Polar Bear', keywords: ['polar', 'bear', 'white', 'arctic', 'cold', 'snow'] },

                        // Spring & Nature
                        { emoji: '🌸', name: 'Flower', keywords: ['flower', 'blossom', 'pink', 'spring', 'petal', 'bloom'] },
                        { emoji: '🌷', name: 'Tulip', keywords: ['tulip', 'flower', 'red', 'spring', 'bulb', 'garden'] },
                        { emoji: '🌹', name: 'Rose', keywords: ['rose', 'flower', 'red', 'love', 'romantic', 'thorn'] },
                        { emoji: '🌻', name: 'Sunflower', keywords: ['sunflower', 'yellow', 'bright', 'summer', 'sun', 'seed'] },
                        { emoji: '🦋', name: 'Butterfly', keywords: ['butterfly', 'wings', 'colorful', 'flying', 'insect', 'beautiful'] },
                        { emoji: '🐝', name: 'Bee', keywords: ['bee', 'buzz', 'yellow', 'black', 'honey', 'pollen'] },
                        { emoji: '🐞', name: 'Ladybug', keywords: ['ladybug', 'red', 'spots', 'bug', 'lucky', 'garden'] },
                        { emoji: '🌈', name: 'Rainbow', keywords: ['rainbow', 'colors', 'arc', 'sky', 'rain', 'prism'] },
                        { emoji: '☀️', name: 'Sun', keywords: ['sun', 'bright', 'yellow', 'warm', 'day', 'light'] },
                        { emoji: '🌧️', name: 'Rain', keywords: ['rain', 'water', 'drops', 'cloud', 'wet', 'storm'] },
                        { emoji: '☂️', name: 'Umbrella', keywords: ['umbrella', 'rain', 'protection', 'cover', 'dry', 'shelter'] },
                        { emoji: '🌱', name: 'Seedling', keywords: ['seedling', 'plant', 'grow', 'green', 'sprout', 'new'] },

                        // Summer & Beach
                        { emoji: '🏖️', name: 'Beach', keywords: ['beach', 'sand', 'ocean', 'summer', 'shore', 'vacation'] },
                        { emoji: '🌴', name: 'Palm Tree', keywords: ['palm', 'tree', 'tropical', 'green', 'coconut', 'island'] },
                        { emoji: '🕶️', name: 'Sunglasses', keywords: ['sunglasses', 'glasses', 'sun', 'cool', 'shade', 'style'] },
                        { emoji: '🍦', name: 'Ice Cream', keywords: ['ice', 'cream', 'cold', 'sweet', 'dessert', 'treat'] },
                        { emoji: '🍉', name: 'Watermelon', keywords: ['watermelon', 'fruit', 'red', 'green', 'summer', 'juicy'] },
                        { emoji: '🍋', name: 'Lemon', keywords: ['lemon', 'yellow', 'sour', 'citrus', 'fruit', 'tart'] },
                        { emoji: '🥥', name: 'Coconut', keywords: ['coconut', 'tropical', 'brown', 'white', 'milk', 'island'] },
                        { emoji: '🩴', name: 'Flip Flops', keywords: ['flip', 'flops', 'sandals', 'beach', 'summer', 'feet'] },
                        { emoji: '🏊‍♂️', name: 'Swimming', keywords: ['swimming', 'pool', 'water', 'sport', 'swim', 'dive'] },
                        { emoji: '🏄‍♂️', name: 'Surfing', keywords: ['surfing', 'wave', 'ocean', 'board', 'ride', 'beach'] },
                        { emoji: '⛺', name: 'Camping', keywords: ['camping', 'tent', 'outdoor', 'nature', 'wild', 'adventure'] },

                        // Fall & Harvest
                        { emoji: '🍂', name: 'Leaf', keywords: ['leaf', 'brown', 'fall', 'autumn', 'tree', 'season'] },
                        { emoji: '🍁', name: 'Maple Leaf', keywords: ['maple', 'leaf', 'red', 'canada', 'fall', 'autumn'] },
                        { emoji: '🍎', name: 'Apple', keywords: ['apple', 'red', 'fruit', 'harvest', 'healthy', 'crisp'] },
                        { emoji: '🌰', name: 'Acorn', keywords: ['acorn', 'nut', 'brown', 'oak', 'tree', 'squirrel'] },
                        { emoji: '🍄', name: 'Mushroom', keywords: ['mushroom', 'fungus', 'red', 'white', 'forest', 'spotted'] },
                        { emoji: '🧥', name: 'Sweater', keywords: ['sweater', 'warm', 'clothing', 'cozy', 'knit', 'comfortable'] },
                        { emoji: '🌳', name: 'Tree', keywords: ['tree', 'green', 'nature', 'tall', 'forest', 'wood'] },
                        { emoji: '🐿️', name: 'Squirrel', keywords: ['squirrel', 'brown', 'nut', 'tail', 'forest', 'cute'] },
                        { emoji: '🦉', name: 'Owl', keywords: ['owl', 'bird', 'wise', 'night', 'hoot', 'nocturnal'] },

                        // General & Symbols
                        { emoji: '❤️', name: 'Heart', keywords: ['heart', 'love', 'red', 'emotion', 'romance', 'passion'] },
                        { emoji: '💎', name: 'Diamond', keywords: ['diamond', 'gem', 'blue', 'precious', 'jewel', 'sparkle'] },
                        { emoji: '⚡', name: 'Lightning', keywords: ['lightning', 'bolt', 'electric', 'yellow', 'power', 'energy'] },
                        { emoji: '✨', name: 'Sparkles', keywords: ['sparkles', 'stars', 'magic', 'shiny', 'glitter', 'shine'] },
                        { emoji: '🎉', name: 'Party', keywords: ['party', 'celebration', 'confetti', 'fun', 'festive', 'joy'] },
                        { emoji: '🏆', name: 'Trophy', keywords: ['trophy', 'award', 'gold', 'winner', 'victory', 'champion'] },
                        { emoji: '👑', name: 'Crown', keywords: ['crown', 'king', 'royal', 'gold', 'queen', 'majesty'] },
                        { emoji: '💰', name: 'Money', keywords: ['money', 'cash', 'dollar', 'green', 'wealth', 'rich'] },
                        { emoji: '', name: 'None', keywords: ['none', 'empty', 'no', 'remove', 'clear', 'delete'] }
                      ];

                      // Smart search function
                      const searchEmojis = (query: string) => {
                        if (!query.trim()) return EMOJI_DATABASE;
                        
                        const searchTerm = query.toLowerCase().trim();
                        
                        return EMOJI_DATABASE.filter(item => 
                          item.name.toLowerCase().includes(searchTerm) ||
                          item.keywords.some(keyword => keyword.includes(searchTerm)) ||
                          item.emoji.includes(searchTerm)
                        );
                      };

                      // Get filtered results
                      const filteredEmojis = searchEmojis(emojiSearchQuery);

                      // Group by category for display
                      const groupedEmojis = filteredEmojis.reduce((acc, item) => {
                        let category = 'General & Symbols';
                        
                        if (['🎃', '👻', '💀', '🕷️', '🦇', '🧙‍♀️', '🧹', '🍭', '⚰️', '🔮', '🧟‍♂️', '🧛‍♂️'].includes(item.emoji)) {
                          category = 'Halloween & Spooky';
                        } else if (['🎄', '🎁', '🎅', '⛄', '🔔', '⭐', '👼', '🦌', '🛷', '🎀', '🔥', '❄️', '🧊', '🥶', '☕', '🧤', '🧣', '🥾', '🎿', '🐧', '🐻‍❄️'].includes(item.emoji)) {
                          category = 'Christmas & Winter';
                        } else if (['🌸', '🌷', '🌹', '🌻', '🦋', '🐝', '🐞', '🌈', '☀️', '🌧️', '☂️', '🌱'].includes(item.emoji)) {
                          category = 'Spring & Nature';
                        } else if (['🏖️', '🌴', '🕶️', '🍦', '🍉', '🍋', '🥥', '🩴', '🏊‍♂️', '🏄‍♂️', '⛺'].includes(item.emoji)) {
                          category = 'Summer & Beach';
                        } else if (['🍂', '🍁', '🍎', '🌰', '🍄', '🧥', '🌳', '🐿️', '🦉'].includes(item.emoji)) {
                          category = 'Fall & Harvest';
                        }

                        if (!acc[category]) acc[category] = [];
                        acc[category].push(item);
                        return acc;
                      }, {} as Record<string, any[]>);

                      // If searching, show all results in one section
                      if (emojiSearchQuery.trim()) {
                        return (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                              🔍 Search Results ({filteredEmojis.length})
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {filteredEmojis.map((item, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setPromoButton(prev => ({ ...prev, icon: item.emoji }))}
                                  className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${
                                    promoButton.icon === item.emoji 
                                      ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' 
                                      : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                                  }`}
                                  title={`${item.name} (${item.keywords.slice(0, 3).join(', ')})`}
                                >
                                  {item.emoji === '' ? (
                                    <span className="text-gray-400 text-sm">No Icon</span>
                                  ) : (
                                    <span className="text-lg">{item.emoji}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // Show categorized view when not searching
                      return Object.entries(groupedEmojis).map(([category, items]) => (
                        <div key={category}>
                          <h4 className="text-sm font-semibold uppercase text-gray-300 mt-2 mb-1">
                            {category}
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {items.map((item: any, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => setPromoButton(prev => ({ ...prev, icon: item.emoji }))}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors ${
                                  promoButton.icon === item.emoji 
                                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' 
                                    : 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                                }`}
                                title={item.name}
                              >
                                {item.emoji === '' ? (
                                  <span className="text-gray-400 text-sm">No Icon</span>
                                ) : (
                                  <span className="text-lg">{item.emoji}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                {/* Claim Button Class via presets */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Button Style</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[legacyTheme.accent,
                      'bg-indigo-600 hover:bg-indigo-700 text-white',
                      'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
                      'bg-cyan-600 hover:bg-cyan-700 text-gray-900',
                      'bg-emerald-600 hover:bg-emerald-700 text-white',
                      'bg-rose-600 hover:bg-rose-700 text-white',
                      'bg-amber-500 hover:bg-amber-600 text-gray-900',
                      'bg-purple-600 hover:bg-purple-700 text-white',
                      'bg-slate-800 hover:bg-slate-700 text-white',
                      'bg-orange-600 hover:bg-orange-700 text-white'
                    ].map((cls, idx) => (
                      <button
                        key={`${cls}-${idx}`}
                        onClick={() => setPromoButton(prev => ({ ...prev, buttonClass: cls }))}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-gray-700 ${cls}`}
                      >
                        {idx === 0 ? 'Theme Accent' : 'Preset'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        const current = promoButton.buttonClass || legacyTheme.accent;
                        products.forEach(p => {
                          updateProduct(p.id, { buttonClass: current });
                        });
                        setPromoButton(prev => ({ ...prev, buttonClass: current }));
                      }}
                      className="px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-xs"
                    >
                      Apply to All Buttons
                    </button>
                  </div>
                </div>
                {/* Removed Custom Button Classes per request */}
                {/* Removed Claim Button Animation Color per request */}
                {/* Claim Button Outer Ring Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Outer Ring Color</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['ring-indigo-400', 'ring-cyan-400', 'ring-fuchsia-400', 'ring-emerald-400', 'ring-amber-400', 'ring-rose-400', 'ring-blue-400', 'ring-slate-400', 'ring-orange-400'].map(cls => (
                      <button
                        key={cls}
                        onClick={() => setPromoButton(prev => ({ ...prev, ringClass: 'ring-white/30', ringHoverClass: cls }))}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 ring-offset-2 ring-white/30 bg-gray-800 hover:bg-gray-700 ${cls.replace('ring-', 'hover:ring-')}`}
                      >
                        {cls.replace('ring-', '')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-24" />
              </div>
            )}
            <div className="sticky bottom-0 z-10 px-4 py-3 border-t border-gray-800/50 bg-transparent backdrop-blur-sm flex justify-end gap-2">
              <button onClick={closeProductEditorAnimated} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
              <button onClick={closeProductEditorAnimated} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/50">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Button Color Controls (inline component) */}
      {/* Keeping component inline for brevity; could be extracted */}

      {/* Safelist background opacity variants for Tailwind JIT (used by Card Transparency slider) */}
      <div className="hidden">
        <span className="
          bg-white/40 bg-white/45 bg-white/50 bg-white/55 bg-white/60 bg-white/65 bg-white/70 bg-white/75 bg-white/80 bg-white/85 bg-white/90 bg-white/95 bg-white/100
          bg-amber-50/40 bg-amber-50/45 bg-amber-50/50 bg-amber-50/55 bg-amber-50/60 bg-amber-50/65 bg-amber-50/70 bg-amber-50/75 bg-amber-50/80 bg-amber-50/85 bg-amber-50/90 bg-amber-50/95 bg-amber-50/100
          bg-green-50/40 bg-green-50/45 bg-green-50/50 bg-green-50/55 bg-green-50/60 bg-green-50/65 bg-green-50/70 bg-green-50/75 bg-green-50/80 bg-green-50/85 bg-green-50/90 bg-green-50/95 bg-green-50/100
          bg-purple-50/40 bg-purple-50/45 bg-purple-50/50 bg-purple-50/55 bg-purple-50/60 bg-purple-50/65 bg-purple-50/70 bg-purple-50/75 bg-purple-50/80 bg-purple-50/85 bg-purple-50/90 bg-purple-50/95 bg-purple-50/100
          bg-blue-50/40 bg-blue-50/45 bg-blue-50/50 bg-blue-50/55 bg-blue-50/60 bg-blue-50/65 bg-blue-50/70 bg-blue-50/75 bg-blue-50/80 bg-blue-50/85 bg-blue-50/90 bg-blue-50/95 bg-blue-50/100
          bg-rose-50/40 bg-rose-50/45 bg-rose-50/50 bg-rose-50/55 bg-rose-50/60 bg-rose-50/65 bg-rose-50/70 bg-rose-50/75 bg-rose-50/80 bg-rose-50/85 bg-rose-50/90 bg-rose-50/95 bg-rose-50/100
          bg-emerald-50/40 bg-emerald-50/45 bg-emerald-50/50 bg-emerald-50/55 bg-emerald-50/60 bg-emerald-50/65 bg-emerald-50/70 bg-emerald-50/75 bg-emerald-50/80 bg-emerald-50/85 bg-emerald-50/90 bg-emerald-50/95 bg-emerald-50/100
          bg-slate-100/40 bg-slate-100/45 bg-slate-100/50 bg-slate-100/55 bg-slate-100/60 bg-slate-100/65 bg-slate-100/70 bg-slate-100/75 bg-slate-100/80 bg-slate-100/85 bg-slate-100/90 bg-slate-100/95 bg-slate-100/100
          bg-gray-900/40 bg-gray-900/45 bg-gray-900/50 bg-gray-900/55 bg-gray-900/60 bg-gray-900/65 bg-gray-900/70 bg-gray-900/75 bg-gray-900/80 bg-gray-900/85 bg-gray-900/90 bg-gray-900/95 bg-gray-900/100
          bg-[#0f0b1f]/40 bg-[#0f0b1f]/45 bg-[#0f0b1f]/50 bg-[#0f0b1f]/55 bg-[#0f0b1f]/60 bg-[#0f0b1f]/65 bg-[#0f0b1f]/70 bg-[#0f0b1f]/75 bg-[#0f0b1f]/80 bg-[#0f0b1f]/85 bg-[#0f0b1f]/90 bg-[#0f0b1f]/95 bg-[#0f0b1f]/100
        "></span>
      </div>

      {/* Template Manager Sheet */}
      {templateManagerOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${templateManagerAnimOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeTemplateManagerAnimated();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Template Manager"
            className={`w-full max-w-md bg-gray-900/70 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-300 ${
              templateManagerAnimOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
              <h3 className={`text-sm font-semibold tracking-wide flex items-center ${backgroundAnalysis.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Template Manager
              </h3>
              <button 
                onClick={closeTemplateManagerAnimated}
                className="text-gray-300 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Templates List */}
              <div>
                <h4 className="text-sm font-semibold uppercase text-gray-300 mt-2 mb-1">Saved Templates ({templates.length})</h4>
                {templates.length > 10 && (
                  <div className="mb-2 text-xs text-gray-400">
                    Showing first 10 templates
                  </div>
                )}
                <div className="mb-8"></div>
                {templates.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>No templates saved yet</p>
                    <p className="text-xs mt-1">Create your first template by clicking "Save as New Template"</p>
                  </div>
                ) : (
                  <div className="max-h-[50rem] overflow-y-auto space-y-3">
                    {templates.slice(0, 10).map((template) => (
                      <div key={template.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-white truncate">{template.name}</h5>
                          <button
                            onClick={() => {
                              if (confirm(`Delete template "${template.name}"?`)) {
                                deleteTemplate(template.id);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-400 hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-600 rounded transition-colors"
                            title="Delete Template"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mb-3">
                          {template.templateData.products.length} products • {template.templateData.floatingAssets.length} assets • {template.currentSeason} theme
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              loadTemplate(template.id);
                              closeTemplateManagerAnimated();
                            }}
                            className="flex-1 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm rounded transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => {
                              // TODO: Implement go live functionality
                              alert('Go Live feature coming soon!');
                            }}
                            className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm rounded transition-colors flex items-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Go Live
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

// Lightweight color controls for button class updates (supports per-card or apply-to-all)
const ButtonColorControls: React.FC<{
  products: any[];
  productId: number;
  themeAccent: string;
  updateProduct: (id: number, updates: any) => void;
  setPromoButton?: React.Dispatch<React.SetStateAction<{ text: string; buttonClass: string; ringClass: string; ringHoverClass: string; icon: string }>>;
}> = ({ products, productId, themeAccent, updateProduct, setPromoButton }) => {
  const presets = [
    { class: 'bg-indigo-600 hover:bg-indigo-700 text-white ring-indigo-500', ring: 'ring-indigo-500' },
    { class: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white ring-fuchsia-500', ring: 'ring-fuchsia-500' },
    { class: 'bg-cyan-600 hover:bg-cyan-700 text-gray-900 ring-cyan-500', ring: 'ring-cyan-500' },
    { class: 'bg-emerald-600 hover:bg-emerald-700 text-white ring-emerald-500', ring: 'ring-emerald-500' },
    { class: 'bg-rose-600 hover:bg-rose-700 text-white ring-rose-500', ring: 'ring-rose-500' },
    { class: 'bg-amber-500 hover:bg-amber-600 text-gray-900 ring-amber-500', ring: 'ring-amber-500' },
    { class: 'bg-purple-600 hover:bg-purple-700 text-white ring-purple-500', ring: 'ring-purple-500' },
    { class: 'bg-slate-800 hover:bg-slate-700 text-white ring-slate-500', ring: 'ring-slate-500' },
    { class: 'bg-orange-600 hover:bg-orange-700 text-white ring-orange-500', ring: 'ring-orange-500' },
  ];
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">Button Style</label>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          key="theme-accent"
          onClick={() => updateProduct(productId, { buttonClass: themeAccent })}
          className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 ring-offset-2 ring-white/30 ${themeAccent}`}
        >
          Theme Accent
        </button>
        {presets.map((preset, idx) => (
          <button
            key={`${preset.class}-${idx}`}
            onClick={() => updateProduct(productId, { buttonClass: preset.class })}
            className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 ring-offset-2 ring-white/30 ${preset.class}`}
          >
            Preset
          </button>
        ))}
      </div>
      <div className="flex items-center justify-end">
        <button
          className="px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-xs"
          onClick={() => {
            const current = products.find(p => p.id === productId)?.buttonClass || themeAccent;
            products.forEach(p => {
              updateProduct(p.id, { buttonClass: current });
            });
            if (setPromoButton) setPromoButton(prev => ({ ...prev, buttonClass: current }));
          }}
        >
          Apply to All
        </button>
      </div>
    </div>
  );
};
