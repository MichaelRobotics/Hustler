import { useCallback } from 'react';
import { StoreTemplate, DiscountSettings } from '../types';
import { getThemePlaceholderUrl } from '../utils/getThemePlaceholder';

interface UseTemplateSaveProps {
  saveTemplate: (templateData: Omit<StoreTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<StoreTemplate>;
  updateTemplate?: (templateId: string, updates: Partial<Pick<StoreTemplate, 'name' | 'templateData'>>) => Promise<StoreTemplate>;
  createTheme: (themeData: any) => Promise<any>;
  products: any[];
  floatingAssets: any[];
  currentSeason: string;
  theme: any;
  legacyTheme: any;
  fixedTextStyles: any;
  logoAsset: any;
  generatedBackground: string | null;
  uploadedBackground: string | null;
  backgroundAttachmentId: string | null;
  backgroundAttachmentUrl: string | null;
  logoAttachmentId: string | null;
  logoAttachmentUrl: string | null;
  promoButton: any;
  discountSettings?: DiscountSettings;
  setError: (error: string | null) => void;
  experienceId: string;
  allResources?: any[]; // Add allResources to check ResourceLibrary
  canAddTemplate?: () => boolean; // Function to check if we can add a template
  currentTemplateId?: string | null; // ID of currently loaded template to update
  // Callbacks for UI updates
  onSavingStarted?: (templateName: string) => void;
  onTemplateSaved?: (templateName: string, templateId: string) => void;
  onOpenTemplateManager?: () => void;
  onTemplateLimitReached?: () => void; // New callback for template limit
  updateSnapshot?: () => void; // Update snapshot after save
}

export const useTemplateSave = ({
  saveTemplate,
  updateTemplate,
  createTheme,
  products,
  floatingAssets,
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
  promoButton,
  discountSettings,
  setError,
  experienceId,
  allResources = [],
  canAddTemplate,
  currentTemplateId,
  onSavingStarted,
  onTemplateSaved,
  onOpenTemplateManager,
  onTemplateLimitReached,
  updateSnapshot,
}: UseTemplateSaveProps) => {
  // Helper function to build template data (shared between save and create) - defined first
  // SIMPLIFIED: Uses flat structure only - theme-specific nested structures removed to reduce redundancy
  const buildTemplateData = useCallback((templateName: string) => {
    const frontendProducts = products.filter(product => typeof product.id === 'string' && product.id.startsWith('resource-'));
    
    // Shared background URL resolution
    const resolvedBackgroundUrl = backgroundAttachmentUrl 
      || (theme as any).placeholderImage 
      || (legacyTheme as any).placeholderImage 
      || getThemePlaceholderUrl(currentSeason);
    
    // Shared logo asset resolution
    const resolvedLogoAsset = logoAttachmentUrl ? {
      src: logoAttachmentUrl,
      shape: logoAsset?.shape || 'square',
      alt: logoAsset?.alt || 'Logo'
    } : logoAsset;
    
    // Shared text styles
    const resolvedTextStyles = {
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
    };
    
    // Shared floating assets mapping
    const resolvedFloatingAssets = floatingAssets.map(asset => ({
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
    }));
    
    return {
      name: templateName,
      experienceId: '',
      userId: '',
      themeId: null,
      themeSnapshot: {
        id: `theme_${Date.now()}`,
        experienceId: 'default-experience',
        name: theme.name,
        season: currentSeason,
        themePrompt: theme.themePrompt,
        accentColor: theme.accent,
        placeholderImage: resolvedBackgroundUrl,
        mainHeader: (theme as any).mainHeader || (legacyTheme as any).mainHeader || null,
        subHeader: theme.aiMessage || (legacyTheme as any).subHeader || null,
        ringColor: theme.accent,
        card: theme.card,
        text: theme.text,
        welcomeColor: theme.welcomeColor,
        background: resolvedBackgroundUrl,
        aiMessage: theme.aiMessage,
        emojiTip: theme.emojiTip,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      currentSeason,
      templateData: {
        // PRIMARY DATA: Flat structure (used by loaders)
        products: frontendProducts,
        floatingAssets: resolvedFloatingAssets,
        fixedTextStyles: resolvedTextStyles,
        logoAsset: resolvedLogoAsset,
        generatedBackground: resolvedBackgroundUrl,
        uploadedBackground: resolvedBackgroundUrl,
        backgroundAttachmentId,
        backgroundAttachmentUrl: resolvedBackgroundUrl,
        logoAttachmentId,
        logoAttachmentUrl,
        currentTheme: {
          name: theme.name,
          themePrompt: theme.themePrompt,
          accent: theme.accent,
          card: theme.card,
          text: theme.text,
          welcomeColor: theme.welcomeColor,
          background: theme.background,
          backgroundImage: theme.backgroundImage,
          placeholderImage: resolvedBackgroundUrl,
          aiMessage: theme.aiMessage,
          mainHeader: (theme as any).mainHeader || (legacyTheme as any).mainHeader || null,
          emojiTip: theme.emojiTip
        },
        promoButton: {
          text: promoButton.text,
          buttonClass: promoButton.buttonClass,
          ringClass: promoButton.ringClass,
          ringHoverClass: promoButton.ringHoverClass,
          icon: promoButton.icon
        },
        discountSettings: discountSettings ? { ...discountSettings } : undefined,
        
        // LEGACY COMPATIBILITY: Theme-specific nested structures (for backward compatibility with old templates)
        // These reference the same data as the flat structure above
        themeTextStyles: { [currentSeason]: resolvedTextStyles },
        themeLogos: { [currentSeason]: resolvedLogoAsset },
        themeGeneratedBackgrounds: { [currentSeason]: resolvedBackgroundUrl },
        themeUploadedBackgrounds: { [currentSeason]: resolvedBackgroundUrl },
        themeProducts: { [currentSeason]: frontendProducts },
        themeFloatingAssets: { [currentSeason]: resolvedFloatingAssets },
      },
      isLive: false,
      isLastEdited: false,
    };
  }, [products, floatingAssets, currentSeason, theme, legacyTheme, fixedTextStyles, logoAsset, generatedBackground, uploadedBackground, backgroundAttachmentId, backgroundAttachmentUrl, logoAttachmentId, logoAttachmentUrl, promoButton, discountSettings]);

  // Generate a unique template name with theme + timestamp + milliseconds
  // Milliseconds ensure uniqueness even if multiple saves happen in the same minute
  const generateTemplateName = useCallback(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    // Add milliseconds to ensure uniqueness
    const milliseconds = now.getMilliseconds();
    return `${theme.name || 'Theme'} ${dateStr}.${milliseconds}`;
  }, [theme.name]);

  // Core save logic - handles both update and create
  const saveOrUpdateTemplate = useCallback(async (options: {
    forceCreate?: boolean;  // If true, always create new (for "Create Shop")
  } = {}): Promise<StoreTemplate | null> => {
    const { forceCreate = false } = options;
    const isUpdating = !forceCreate && currentTemplateId && updateTemplate;
    
    // Check template limit for new templates
    if (!isUpdating && canAddTemplate && !canAddTemplate()) {
      onTemplateLimitReached?.();
      return null;
    }
    
    // Generate name for new templates
    const templateName = isUpdating ? undefined : generateTemplateName();
    
    // Notify UI that save started
    onSavingStarted?.(templateName || 'Template');
    
    // Build template data
    const templateData = buildTemplateData(templateName || generateTemplateName());
    templateData.themeId = null; // Templates use themeSnapshot, not database themes
    
    console.log(`💾 ${isUpdating ? 'Updating' : 'Creating'} template:`, templateData.name, 
      `(${templateData.templateData.products?.length || 0} products)`);
    
    let savedTemplate: StoreTemplate;
    
    if (isUpdating && currentTemplateId && updateTemplate) {
      console.log('💾 [useTemplateSave] Updating template:', {
        currentTemplateId,
        hasTemplateData: !!templateData.templateData,
        productsCount: templateData.templateData.products?.length || 0,
      });
      savedTemplate = await updateTemplate(currentTemplateId, {
        templateData: templateData.templateData,
      });
    } else {
      console.log('💾 [useTemplateSave] Creating new template (isUpdating:', isUpdating, 'currentTemplateId:', currentTemplateId, 'hasUpdateTemplate:', !!updateTemplate);
      savedTemplate = await saveTemplate(templateData);
    }
    
    // Notify UI that save completed
    onTemplateSaved?.(savedTemplate.name, savedTemplate.id);
    
    // Update snapshot after successful save
    if (updateSnapshot) {
      setTimeout(() => {
        updateSnapshot();
        console.log('📸 Snapshot updated after template save');
      }, 100);
    }
    
    // Open template manager after brief delay
    if (onOpenTemplateManager) {
      setTimeout(onOpenTemplateManager, 1000);
    }
    
    return savedTemplate;
  }, [
    currentTemplateId,
    updateTemplate,
    canAddTemplate,
    generateTemplateName,
    buildTemplateData,
    saveTemplate,
    onSavingStarted,
    onTemplateSaved,
    onOpenTemplateManager,
    onTemplateLimitReached,
    updateSnapshot,
  ]);

  // Save template (updates existing if loaded, creates new otherwise)
  const handleSaveTemplate = useCallback(async () => {
    try {
      await saveOrUpdateTemplate();
    } catch (error: any) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Maximum of') && errorMessage.includes('templates allowed')) {
        onTemplateLimitReached?.();
      } else if (errorMessage.includes('already exists') || errorMessage.includes('DUPLICATE_NAME')) {
        // Handle duplicate name error - template name already exists
        setError(`Template name already exists. Please try saving again - a new unique name will be generated.`);
      } else {
        setError(`Failed to save template: ${errorMessage}`);
      }
    }
  }, [saveOrUpdateTemplate, onTemplateLimitReached, setError]);

  // Create new shop (always creates new, ignores currentTemplateId)
  const handleCreateShop = useCallback(async () => {
    try {
      await saveOrUpdateTemplate({ forceCreate: true });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Maximum of') && errorMessage.includes('templates allowed')) {
        onTemplateLimitReached?.();
      } else {
        setError(`Failed to create shop: ${errorMessage}`);
      }
    }
  }, [saveOrUpdateTemplate, onTemplateLimitReached, setError]);

  return {
    handleSaveTemplate,
    handleSaveTemplateForNavbar: handleSaveTemplate,
    handleCreateShop,
  };
};

