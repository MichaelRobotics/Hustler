
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  Product, 
  FloatingAsset, 
  Theme, 
  LegacyTheme,
  FixedTextStyles, 
  LogoAsset, 
  EditorState, 
  LoadingState,
  StoreTemplate,
  DiscountSettings,
} from '@/lib/components/store/SeasonalStore/types';
import { 
  initialThemes, 
  defaultLogo,
  getThemeDefaultText,
  getThemeTextColor as getThemeTextColorFromConstants
} from '@/lib/components/store/SeasonalStore/actions/constants';
import { 
  getThemes, 
  createTheme, 
  updateTheme, 
  deleteTheme 
} from '@/lib/actions/themes-actions';
import { 
  getTemplates, 
  getTemplate, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate as deleteTemplateAction, 
  setLiveTemplate as setLiveTemplateAction, 
  getLiveTemplate, 
  getLastEditedTemplate 
} from '@/lib/actions/templates-actions';
import { getOriginTemplate } from '@/lib/actions/origin-template-actions';
import type { Resource } from '@/lib/types/resource';
import { normalizeHtmlContent, stripInlineColorTags } from '@/lib/components/store/SeasonalStore/utils/html';
import {
  getTextColorsFromCardClass,
  applyThemeStylesToProducts,
  filterProductsAgainstMarketStall,
  sanitizeProducts as sanitizeProductsUtil,
} from '@/lib/components/store/SeasonalStore/utils/productUtils';
import { apiPost } from '@/lib/utils/api-client';
import { checkDiscountStatus, removeProductPromoData, convertDiscountDataToSettings, type DiscountData } from '../utils/discountHelpers';

const sanitizeProductContent = (html?: string | null): string | undefined => {
  if (!html) return html || undefined;
  return stripInlineColorTags(normalizeHtmlContent(html));
};

export const useSeasonalStoreDatabase = (experienceId: string) => {
  // Constants for limits
  const MAX_CUSTOM_THEMES = 10;
  const MAX_CUSTOM_TEMPLATES = 10;
  
  
  // Core State
  const [allThemes, setAllThemes] = useState<Record<string, LegacyTheme>>(initialThemes);
  const [currentSeason, setCurrentSeason] = useState<string>('Black Friday');
  
  // Store Navigation State (persists across view switches)
  const [lastActiveTheme, setLastActiveTheme] = useState<string>('Black Friday');
  
  // Market Stall State (single state for all themes)
  const [fixedTextStyles, setFixedTextStyles] = useState<FixedTextStyles>({
    mainHeader: { content: '', color: '', styleClass: '' },
    headerMessage: { content: '', color: '', styleClass: '' },
    subHeader: { content: '', color: '', styleClass: '' },
    promoMessage: { content: '', color: '', styleClass: '' }
  });
  const [logoAsset, setLogoAsset] = useState<LogoAsset | null>(defaultLogo);
  const [generatedBackground, setGeneratedBackground] = useState<string | null>(null);
  const [uploadedBackground, setUploadedBackground] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [floatingAssets, setFloatingAssets] = useState<FloatingAsset[]>([]);
  const [availableAssets, setAvailableAssets] = useState<FloatingAsset[]>([]);
  
  // Database State
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [liveTemplate, setLiveTemplate] = useState<StoreTemplate | null>(null);
  const [lastEditedTemplate, setLastEditedTemplate] = useState<StoreTemplate | null>(null);
  const [currentlyLoadedTemplateId, setCurrentlyLoadedTemplateId] = useState<string | null>(null);
  const [originTemplate, setOriginTemplate] = useState<any | null>(null);
  
  // Template Cache - stores ALL templates with preloaded backgrounds for instant switching
  // Persisted to localStorage so it's shared across component instances (SeasonalStore <-> StorePreview)
  const getTemplateCacheKey = useCallback(() => {
    return `templateCache_${experienceId}`;
  }, [experienceId]);
  
  const getBackgroundsPreloadedKey = useCallback(() => {
    return `templateBackgroundsPreloaded_${experienceId}`;
  }, [experienceId]);
  
  // Cache version - increment to invalidate old caches
  const CACHE_VERSION = 2;
  
  // Initialize cached templates from localStorage (simple version check only)
  const [cachedTemplates, setCachedTemplates] = useState<Map<string, StoreTemplate>>(() => {
    try {
      const key = `templateCache_${experienceId}`;
      const versionKey = `templateCacheVersion_${experienceId}`;
      
      // Check cache version - if outdated, clear and start fresh
      const cachedVersion = localStorage.getItem(versionKey);
      if (cachedVersion !== String(CACHE_VERSION)) {
        console.log(`🗑️ Cache outdated (v${cachedVersion} → v${CACHE_VERSION}), clearing`);
        localStorage.removeItem(key);
        localStorage.setItem(versionKey, String(CACHE_VERSION));
        return new Map();
      }
      
      const cached = localStorage.getItem(key);
      if (cached) {
        const templatesArray = JSON.parse(cached) as StoreTemplate[];
        const templateMap = new Map<string, StoreTemplate>();
        
        templatesArray.forEach(template => {
          templateMap.set(template.id, {
            ...template,
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt),
          } as StoreTemplate);
        });
        
        console.log(`💾 Loaded ${templateMap.size} templates from cache`);
        return templateMap;
      }
    } catch (error) {
      console.error('Cache load error:', error);
    }
    return new Map();
  });
  
  const [templateBackgroundsPreloaded, setTemplateBackgroundsPreloaded] = useState(() => {
    try {
      const key = `templateBackgroundsPreloaded_${experienceId}`;
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  });
  
  // Load cached templates from localStorage on mount
  const loadCachedTemplates = useCallback((): Map<string, StoreTemplate> => {
    try {
      const key = getTemplateCacheKey();
      const cached = localStorage.getItem(key);
      if (cached) {
        const templatesArray = JSON.parse(cached) as StoreTemplate[];
        const templateMap = new Map<string, StoreTemplate>();
        templatesArray.forEach(template => {
          // Convert date strings back to Date objects
          const templateWithDates = {
            ...template,
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt),
          };
          templateMap.set(template.id, templateWithDates as StoreTemplate);
        });
        console.log(`💾 Loaded ${templateMap.size} cached templates from localStorage`);
        return templateMap;
      }
    } catch (error) {
      console.error('Error loading cached templates from localStorage:', error);
    }
    return new Map();
  }, [getTemplateCacheKey]);
  
  // Save cached templates to localStorage whenever cache is updated
  const saveCachedTemplatesToLocalStorage = useCallback((templates: Map<string, StoreTemplate>) => {
    try {
      const key = getTemplateCacheKey();
      const versionKey = `templateCacheVersion_${experienceId}`;
      const templatesArray = Array.from(templates.values());
      localStorage.setItem(key, JSON.stringify(templatesArray));
      localStorage.setItem(versionKey, String(CACHE_VERSION)); // Ensure version is saved
      console.log(`💾 Saved ${templates.size} templates to localStorage cache (v${CACHE_VERSION})`);
    } catch (error) {
      console.error('Error saving cached templates to localStorage:', error);
    }
  }, [getTemplateCacheKey, experienceId]);
  
  // Wrapper for setCachedTemplates that also saves to localStorage
  // Accepts either a Map or a function that takes the previous Map and returns a new Map
  const updateCachedTemplates = useCallback((templatesOrUpdater: Map<string, StoreTemplate> | ((prev: Map<string, StoreTemplate>) => Map<string, StoreTemplate>)) => {
    if (typeof templatesOrUpdater === 'function') {
      // If it's a function, use the updater pattern
      setCachedTemplates(prev => {
        const newTemplates = templatesOrUpdater(prev);
        saveCachedTemplatesToLocalStorage(newTemplates);
        return newTemplates;
      });
    } else {
      // If it's a Map, use it directly
      setCachedTemplates(templatesOrUpdater);
      saveCachedTemplatesToLocalStorage(templatesOrUpdater);
    }
  }, [saveCachedTemplatesToLocalStorage]);
  
  // Wrapper for setTemplateBackgroundsPreloaded that also saves to localStorage
  const updateTemplateBackgroundsPreloaded = useCallback((value: boolean) => {
    setTemplateBackgroundsPreloaded(value);
    try {
      const key = getBackgroundsPreloadedKey();
      localStorage.setItem(key, value.toString());
    } catch (error) {
      console.error('Error saving backgrounds preloaded flag to localStorage:', error);
    }
  }, [getBackgroundsPreloadedKey]);
  
  // Template theme state - when a template is loaded, use its themeSnapshot
  const [currentTemplateTheme, setCurrentTemplateTheme] = useState<LegacyTheme | null>(null);
  
  // Track if a template has been manually loaded to prevent live template override
  const [hasManuallyLoadedTemplate, setHasManuallyLoadedTemplate] = useState(false);
  
  // Track when initial data loading is complete (DB fetch done)
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Track when template loading operation is in progress
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  
  // Track template ID that was requested to load (for verifying load completed)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  
  // Track last logged templateId to prevent duplicate logs
  const lastLoggedTemplateIdRef = useRef<string | null>(null);
  
  // DERIVED STATE: Store content is ready when:
  // 1. Initial load is complete
  // 2. Not currently loading a template
  // 3. Text content is actually present in state (not empty initial values)
  // 4. If a template was pending, it must match currentlyLoadedTemplateId
  const isStoreContentReady = useMemo(() => {
    // Must have completed initial load
    if (!isInitialLoadComplete) return false;
    
    // Must not be in the middle of loading
    if (isLoadingTemplate) return false;
    
    // Must have actual text content (not just empty initial values)
    const hasTextContent = !!(
      fixedTextStyles.mainHeader?.content ||
      fixedTextStyles.headerMessage?.content ||
      fixedTextStyles.subHeader?.content
    );
    
    // If we're waiting for a specific template, verify it's loaded
    if (pendingTemplateId && pendingTemplateId !== currentlyLoadedTemplateId) {
      return false;
    }
    
    // Log readiness state for debugging - only when templateId changes
    if (hasTextContent && currentlyLoadedTemplateId !== lastLoggedTemplateIdRef.current) {
      console.log('✅ Store content ready:', {
        mainHeader: fixedTextStyles.mainHeader?.content?.substring(0, 30),
        templateId: currentlyLoadedTemplateId,
      });
      lastLoggedTemplateIdRef.current = currentlyLoadedTemplateId;
    }
    
    return hasTextContent;
  }, [isInitialLoadComplete, isLoadingTemplate, fixedTextStyles, pendingTemplateId, currentlyLoadedTemplateId]);
  
  // Store ResourceLibrary product IDs from loaded templates
  const [templateResourceLibraryProductIds, setTemplateResourceLibraryProductIds] = useState<string[]>([]);
  
  // Track if we've loaded from localStorage cache (use ref to avoid re-renders)
  const hasLoadedFromCacheRef = useRef(false);
  
  // Helper functions for localStorage caching
  const getLastLoadedTemplateKey = useCallback(() => {
    return `lastLoadedTemplate_${experienceId}`;
  }, [experienceId]);
  
  const saveLastLoadedTemplateToCache = useCallback((template: StoreTemplate) => {
    try {
      const key = getLastLoadedTemplateKey();
      localStorage.setItem(key, JSON.stringify(template));
      console.log('💾 Saved last loaded template to localStorage:', template.name, template.id);
    } catch (error) {
      console.error('Error saving template to localStorage:', error);
    }
  }, [getLastLoadedTemplateKey]);
  
  const loadLastLoadedTemplateFromCache = useCallback((): StoreTemplate | null => {
    try {
      const key = getLastLoadedTemplateKey();
      const cached = localStorage.getItem(key);
      if (cached) {
        const template = JSON.parse(cached) as StoreTemplate;
        console.log('💾 Cached last template:', template.name);
        return template;
      }
      return null;
    } catch (error) {
      console.error('Error loading template from localStorage:', error);
      return null;
    }
  }, [getLastLoadedTemplateKey]);
  
  const clearLastLoadedTemplateFromCache = useCallback(() => {
    try {
      const key = getLastLoadedTemplateKey();
      localStorage.removeItem(key);
      console.log('🗑️ Cleared last loaded template from localStorage');
    } catch (error) {
      console.error('Error clearing template from localStorage:', error);
    }
  }, [getLastLoadedTemplateKey]);
  
  // Clear ALL template caches (useful when data format changes or cache is stale)
  const clearAllTemplateCache = useCallback(() => {
    try {
      const cacheKey = getTemplateCacheKey();
      const lastLoadedKey = getLastLoadedTemplateKey();
      const preloadedKey = getBackgroundsPreloadedKey();
      const versionKey = `templateCacheVersion_${experienceId}`;
      
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(lastLoadedKey);
      localStorage.removeItem(preloadedKey);
      localStorage.removeItem(versionKey);
      
      setCachedTemplates(new Map());
      setTemplateBackgroundsPreloaded(false);
      
      console.log('🗑️ Cleared ALL template caches from localStorage');
    } catch (error) {
      console.error('Error clearing template caches:', error);
    }
  }, [getTemplateCacheKey, getLastLoadedTemplateKey, getBackgroundsPreloadedKey, experienceId]);
  
  // Helper function to convert Tailwind color classes to hex values (uses constants)
  const getThemeTextColor = (welcomeColor: string | undefined): string => {
    return getThemeTextColorFromConstants(welcomeColor);
  };

  // Helper function to check if we can add a custom theme
  const canAddCustomTheme = useCallback(() => {
    const defaultThemeNames = ['Winter Frost', 'Summer Sun', 'Autumn Harvest', 'Holiday Cheer', 'Spring Renewal', 'Cyber Sale', 'Spooky Night', 'Black Friday'];
    const customThemes = Object.values(allThemes).filter(theme => 
      !defaultThemeNames.includes(theme.name)
    );
    return customThemes.length < MAX_CUSTOM_THEMES;
  }, [allThemes]);
  
  // Helper function to check if we can add a template
  const canAddTemplate = useCallback(() => {
    return templates.length < MAX_CUSTOM_TEMPLATES;
  }, [templates]);

  // Default text styles with theme-appropriate colors
  const themeDefaults = getThemeDefaultText(currentSeason, allThemes[currentSeason]?.aiMessage || allThemes['Black Friday']?.aiMessage);
  const defaultTextStyles = {
    mainHeader: { 
      content: themeDefaults.mainHeader, 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg' 
    },
    headerMessage: { 
      content: themeDefaults.headerMessage, 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg' 
    },
    subHeader: { 
      content: themeDefaults.subHeader, 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-lg sm:text-xl font-normal' 
    },
    promoMessage: { 
      content: themeDefaults.promoMessage, 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md' 
    }
  };

  // Track whether a template has been loaded - if so, use template data directly, not defaults
  // This ensures template text is displayed, not theme defaults
  // Only use theme defaults for truly undefined/null fields (not empty strings which might be intentional)
  const mergedFixedTextStyles = {
    mainHeader: {
      // Use nullish coalescing (??) to only fallback for undefined/null, not empty string
      content: fixedTextStyles.mainHeader?.content ?? defaultTextStyles.mainHeader.content,
      color: fixedTextStyles.mainHeader?.color ?? defaultTextStyles.mainHeader.color,
      styleClass: fixedTextStyles.mainHeader?.styleClass ?? defaultTextStyles.mainHeader.styleClass,
    },
    headerMessage: {
      content: fixedTextStyles.headerMessage?.content ?? defaultTextStyles.headerMessage.content,
      color: fixedTextStyles.headerMessage?.color ?? defaultTextStyles.headerMessage.color,
      styleClass: fixedTextStyles.headerMessage?.styleClass ?? defaultTextStyles.headerMessage.styleClass,
    },
    subHeader: {
      content: fixedTextStyles.subHeader?.content ?? defaultTextStyles.subHeader.content,
      color: fixedTextStyles.subHeader?.color ?? defaultTextStyles.subHeader.color,
      styleClass: fixedTextStyles.subHeader?.styleClass ?? defaultTextStyles.subHeader.styleClass,
    },
    promoMessage: {
      content: fixedTextStyles.promoMessage?.content ?? defaultTextStyles.promoMessage.content,
      color: fixedTextStyles.promoMessage?.color ?? defaultTextStyles.promoMessage.color,
      styleClass: fixedTextStyles.promoMessage?.styleClass ?? defaultTextStyles.promoMessage.styleClass,
    },
  };
  
  // WHOP attachment support (single state for all themes)
  const [backgroundAttachmentId, setBackgroundAttachmentId] = useState<string | null>(null);
  const [backgroundAttachmentUrl, setBackgroundAttachmentUrl] = useState<string | null>(null);
  const [logoAttachmentId, setLogoAttachmentId] = useState<string | null>(null);
  const [logoAttachmentUrl, setLogoAttachmentUrl] = useState<string | null>(null);
  
  // Promo button state
  const [promoButton, setPromoButton] = useState<{
    text: string;
    buttonClass: string;
    ringClass: string;
    ringHoverClass: string;
    icon: string;
  }>({
    text: 'Claim Now',
    buttonClass: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200',
    ringClass: 'ring-2 ring-purple-400',
    ringHoverClass: 'hover:ring-purple-500',
    icon: '🎁'
  });

  const createDefaultDiscountSettings = useCallback((): DiscountSettings => ({
    enabled: false,
    globalDiscount: false,
    globalDiscountType: 'percentage',
    globalDiscountAmount: 20,
    percentage: 20,
    startDate: '',
    endDate: '',
    discountText: '',
    promoCode: '',
    durationType: undefined,
    durationMonths: undefined,
    quantityPerProduct: undefined,
    prePromoMessages: [],
    activePromoMessages: [],
  }), []);

  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(createDefaultDiscountSettings());
  
  // Products and floating assets are now single state (no theme-specific separation)
  
  // Wrapper for setCurrentSeason that clears template theme when switching to global themes
  const handleSetCurrentSeason = useCallback((season: string) => {
    setCurrentSeason(season);
    // Clear template theme when switching to a global theme
    setCurrentTemplateTheme(null);
    // Reset manual template flag when switching themes
    setHasManuallyLoadedTemplate(false);
    
    // Initialize text styles for custom themes if they don't exist
    const theme = allThemes[season];
    if (theme && (season.startsWith('db_') || season.startsWith('custom_'))) {
      // Initialize text styles if they don't exist (single state for all themes)
      setFixedTextStyles(prev => {
        if (prev.mainHeader?.content) {
          return prev; // Already initialized
        }
        
        // Use saved metadata from theme if available
        const savedMainHeader = (theme as any).mainHeader || theme.name.toUpperCase();
        const savedSubHeader = theme.aiMessage || '';
        const themeDefaults = getThemeDefaultText(theme.name, savedSubHeader);
        const textColor = getThemeTextColor(theme.welcomeColor);
        
        return {
            mainHeader: {
              content: savedMainHeader, // Use saved mainHeader from database
              color: textColor,
              styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg'
            },
            headerMessage: {
              content: savedMainHeader, // Use same as mainHeader for headerMessage
              color: textColor,
              styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
            },
            subHeader: {
              content: savedSubHeader || themeDefaults.subHeader, // Use saved subheader from database
              color: textColor,
              styleClass: 'text-lg sm:text-xl font-normal'
            },
            promoMessage: {
              content: themeDefaults.promoMessage,
              color: textColor,
              styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md'
          }
        };
      });
      
      // Products are now single state - no need to check per-theme
        // Products will be added by autoAddMarketStallProductsToAllThemes
    }
  }, [allThemes, getThemeTextColor, setFixedTextStyles]);
  
  // Current theme - use template theme if loaded, otherwise use global themes
  const theme = currentTemplateTheme || allThemes[currentSeason] || initialThemes[currentSeason];
  
  // Loading and error states
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isTextLoading: false,
    isImageLoading: false,
    isUploadingImage: false,
    isGeneratingImage: false
  });
  
  const [apiError, setApiError] = useState<string | null>(null);
  
  
  
  
  // Helper function to convert database Theme to LegacyTheme
  const convertThemeToLegacy = (dbTheme: Theme): LegacyTheme => {
    return {
      name: dbTheme.name,
      themePrompt: dbTheme.themePrompt,
      accent: dbTheme.accentColor || 'bg-indigo-500 hover:bg-indigo-600 text-white ring-indigo-400',
      card: dbTheme.card || 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30',
      text: dbTheme.text || 'text-gray-800',
      welcomeColor: dbTheme.welcomeColor || 'text-yellow-300',
      background: dbTheme.background || 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
      backgroundImage: null,
      aiMessage: dbTheme.aiMessage || 'Discover exclusive seasonal products',
      emojiTip: dbTheme.emojiTip || '🎁'
    };
  };
  
  // Helper function to convert template theme to LegacyTheme
  const convertTemplateThemeToLegacy = (templateTheme: any): LegacyTheme => {
    // Normalize "Default Theme" to "Black Friday"
    const themeName = templateTheme.name === 'Default Theme' ? 'Black Friday' : templateTheme.name;
    
    const legacyTheme: LegacyTheme = {
      name: themeName,
      themePrompt: templateTheme.themePrompt,
      accent: templateTheme.accentColor || templateTheme.accent || 'bg-indigo-500 hover:bg-indigo-600 text-white ring-indigo-400',
      card: templateTheme.card || 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30',
      text: templateTheme.text || 'text-gray-800',
      welcomeColor: templateTheme.welcomeColor || 'text-yellow-300',
      background: templateTheme.placeholderImage 
        ? `bg-cover bg-center` 
        : (templateTheme.background || 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'),
      backgroundImage: templateTheme.placeholderImage || templateTheme.backgroundImage || null,
      aiMessage: templateTheme.subHeader || templateTheme.aiMessage || 'Discover exclusive seasonal products',
      emojiTip: templateTheme.emojiTip || '🎁'
    };
    
    // Preserve custom theme metadata if available
    if (templateTheme.placeholderImage) {
      (legacyTheme as any).placeholderImage = templateTheme.placeholderImage;
    }
    if (templateTheme.mainHeader) {
      (legacyTheme as any).mainHeader = templateTheme.mainHeader;
    }
    
    return legacyTheme;
  };

  const sanitizeProducts = useCallback((productsToSanitize: Product[]): Product[] => {
    return productsToSanitize.map(product => ({
      ...product,
      name: sanitizeProductContent(product.name) ?? product.name,
      description: sanitizeProductContent(product.description) ?? product.description,
    }));
  }, []);
  
  // Load origin template from database
  const loadOriginTemplate = useCallback(async () => {
    try {
      if (!experienceId) return;
      const originTemplateData = await getOriginTemplate(experienceId);
      setOriginTemplate(originTemplateData);
      if (originTemplateData) {
        console.log('✅ Origin template loaded:', originTemplateData.id);
        
        // Add origin template theme to allThemes if it exists
        if (originTemplateData.defaultThemeData) {
          const originData = originTemplateData.defaultThemeData as any;
          const originTheme: LegacyTheme = {
            name: originData.name || 'Company Theme',
            themePrompt: originData.themePrompt || originTemplateData.themePrompt || '',
            accent: originData.accent || 'bg-indigo-500',
            card: originData.card || 'bg-white/95 backdrop-blur-sm shadow-xl',
            text: originData.text || 'text-gray-800',
            welcomeColor: originData.welcomeColor || 'text-yellow-300',
            background: originData.background || '',
            placeholderImage: originData.placeholderImage || originData.background || null,
            mainHeader: originData.mainHeader || null,
            aiMessage: originData.aiMessage || originData.subHeader || '',
            emojiTip: originData.emojiTip || '🎁',
          };
          
          // Add to allThemes with 'Company' key
          setAllThemes(prev => ({
            ...prev,
            'Company': originTheme,
          }));
          
          console.log('🎨 [loadOriginTemplate] Added origin template theme to allThemes:', originTheme.name);
        }
      }
    } catch (error) {
      console.error('Error loading origin template:', error);
      // Don't set error for authentication issues
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        // Keep origin template as null
      } else {
        console.warn('Failed to load origin template:', (error as Error).message);
      }
    }
  }, [experienceId, setAllThemes]);

  // Load themes from database
  const loadThemes = useCallback(async () => {
    try {
      const themesList = await getThemes(experienceId);
      setThemes(themesList);
      
      // Convert to legacy theme map and merge with initial themes
      const themesMap: Record<string, LegacyTheme> = { ...initialThemes }; // Start with initial themes
      const newThemeTextStyles: Record<string, FixedTextStyles> = {};
      
      themesList.forEach(theme => {
        // Use unique key for database themes to avoid overriding default themes
        const dbThemeKey = `db_${theme.id}`;
        const legacyTheme = convertThemeToLegacy(theme);
        // Add saved metadata to the theme object
        (legacyTheme as any).placeholderImage = theme.placeholderImage || null;
        (legacyTheme as any).mainHeader = theme.mainHeader || null;
        themesMap[dbThemeKey] = legacyTheme;
        
        // Special handling for company themes: also map to 'Company' key for easy access
        if (theme.season === 'Company') {
          themesMap['Company'] = legacyTheme;
          console.log('🎨 [loadThemes] Mapped company theme to "Company" key:', theme.name);
        }
        
        // Initialize text styles with saved values from database
        if (theme.mainHeader || theme.subHeader) {
          const savedMainHeader = theme.mainHeader || theme.name.toUpperCase();
          const savedSubHeader = theme.subHeader || legacyTheme.aiMessage;
          const themeDefaults = getThemeDefaultText(theme.name, savedSubHeader);
          const textColor = getThemeTextColor(legacyTheme.welcomeColor);
          
          // Use 'Company' key for company themes, otherwise use dbThemeKey
          const textStylesKey = theme.season === 'Company' ? 'Company' : dbThemeKey;
          newThemeTextStyles[textStylesKey] = {
            mainHeader: {
              content: savedMainHeader, // Use saved mainHeader from database
              color: textColor,
              styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg'
            },
            headerMessage: {
              content: savedMainHeader, // Use same as mainHeader for headerMessage
              color: textColor,
              styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
            },
            subHeader: {
              content: savedSubHeader || themeDefaults.subHeader, // Use saved subheader from database
              color: textColor,
              styleClass: 'text-lg sm:text-xl font-normal'
            },
            promoMessage: {
              content: themeDefaults.promoMessage,
              color: textColor,
              styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md'
            }
          };
        }
      });
      
      setAllThemes(themesMap);
      // Initialize text styles for themes loaded from database (single state for all themes)
      if (Object.keys(newThemeTextStyles).length > 0) {
        // Use first theme's text styles (single state for all themes)
        const firstThemeKey = Object.keys(newThemeTextStyles)[0];
        if (firstThemeKey && newThemeTextStyles[firstThemeKey]) {
          setFixedTextStyles(newThemeTextStyles[firstThemeKey]);
        }
      }
    } catch (error) {
      console.error('Error loading themes:', error);
      // Don't set error for authentication issues
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        setApiError(null); // Clear any previous errors
        // Keep the initial themes (already set in state initialization)
      } else {
        setApiError(`Failed to load themes: ${(error as Error).message}`);
        // Even for other errors, fall back to initial themes
        setAllThemes(initialThemes);
      }
    }
  }, [experienceId]);
  
  // Helper function to preload background image (declared early for use in cacheAllTemplatesAndPreloadBackgrounds)
  const preloadBackgroundImage = useCallback(async (url: string): Promise<void> => {
    if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      return;
    }
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continue even if preload fails
        img.src = url;
      });
    } catch {
      // Continue even if preload fails
    }
  }, []);
  
  // Cache all templates and preload backgrounds for instant switching
  const cacheAllTemplatesAndPreloadBackgrounds = useCallback(async (templatesList: StoreTemplate[]) => {
    if (templateBackgroundsPreloaded || templatesList.length === 0) {
      return;
    }
    
    // Cache templates for instant switching
    const newCache = new Map<string, StoreTemplate>();
    templatesList.forEach(template => newCache.set(template.id, template));
    updateCachedTemplates(newCache);
    console.log(`✅ Cached ${newCache.size} templates`);
    
    // Preload all template backgrounds in parallel (non-blocking)
    const backgroundPreloadPromises = templatesList.map(async (template) => {
      // Get background URL for this template
      const backgroundUrl = template.templateData.backgroundAttachmentUrl || 
                           template.templateData.themeUploadedBackgrounds?.[template.currentSeason] || 
                           template.templateData.themeGeneratedBackgrounds?.[template.currentSeason] ||
                           template.templateData.uploadedBackground ||
                           template.templateData.generatedBackground;
      
      if (backgroundUrl) {
        await preloadBackgroundImage(backgroundUrl);
        console.log(`✅ Preloaded background for template: ${template.name}`);
      }
      
      return template;
    });
    
    // Wait for all backgrounds to preload
    await Promise.all(backgroundPreloadPromises);
    
    updateTemplateBackgroundsPreloaded(true);
    console.log(`✅ All ${templatesList.length} template backgrounds preloaded!`);
  }, [preloadBackgroundImage, templateBackgroundsPreloaded, updateCachedTemplates, updateTemplateBackgroundsPreloaded]);
  
  // Load templates from database
  const loadTemplates = useCallback(async () => {
    try {
      const templatesList = await getTemplates(experienceId);
      
      // Fetch discount data from database and apply to all templates
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
        console.warn('⚠️ [loadTemplates] Error fetching discount from database:', error);
      }
      
      // Apply discount settings to all templates if discount data exists
      let finalTemplates = templatesList;
      if (databaseDiscountData) {
        const discountStatus = checkDiscountStatus(databaseDiscountData);
        const isActiveOrApproaching = discountStatus === 'active' || discountStatus === 'approaching';
        
        if (isActiveOrApproaching) {
          const updatedDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
          
          // Update all templates with discount settings from database
          finalTemplates = templatesList.map(template => {
            // Only update if template doesn't have discountSettings or if it has a different discount ID
            if (!template.templateData.discountSettings || 
                template.templateData.discountSettings.seasonalDiscountId !== databaseDiscountData?.seasonalDiscountId) {
              return {
                ...template,
                templateData: {
                  ...template.templateData,
                  discountSettings: updatedDiscountSettings,
                },
              };
            }
            // Template already has correct discount settings
            return template;
          });
        }
      }
      
      setTemplates(finalTemplates);
      
      // Update cache with updated templates
      if (finalTemplates !== templatesList) {
        updateCachedTemplates(prev => {
          const newCache = new Map(prev);
          finalTemplates.forEach(template => {
            newCache.set(template.id, template as StoreTemplate);
          });
          return newCache;
        });
      }
      
      // Also cache templates when they're loaded (if not already cached)
      if (finalTemplates.length > 0 && !templateBackgroundsPreloaded) {
        // Cache and preload in background (non-blocking)
        cacheAllTemplatesAndPreloadBackgrounds(finalTemplates).catch(err => {
          console.error('Error caching templates in loadTemplates:', err);
        });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        console.log('Authentication required for database operations');
        setApiError(null);
      } else {
        setApiError(`Failed to load templates: ${(error as Error).message}`);
      }
    }
  }, [experienceId, templateBackgroundsPreloaded, cacheAllTemplatesAndPreloadBackgrounds, apiPost, checkDiscountStatus, convertDiscountDataToSettings, updateCachedTemplates]);
  
  // CRITICAL: Filter template products to ONLY include ones that exist in Market Stall
  // Applies template product design (buttons, colors, images, etc.) to matching Market Stall products
  // Filter template products against Market Stall (not theme-related, just data integrity)
  const filterTemplateProductsAgainstMarketStall = useCallback(async (
    templateProducts: Product[]
  ): Promise<Product[]> => {
    try {
      // Fetch Market Stall resources to check against (use high limit to get all resources)
      const response = await fetch(`/api/resources?experienceId=${experienceId}&limit=100`);
      if (!response.ok) {
        console.error('📦 [Filter] Failed to fetch Market Stall resources');
        return [];
      }
      
      const data = await response.json();
      const marketStallResources = data.data?.resources || [];
      
      const filteredProducts: Product[] = [];
      
      for (const templateProduct of templateProducts) {
        let matchedResource: Resource | null = null;
        
        // Strategy 1: Match by whopProductId (for synced Whop products)
        if (templateProduct.whopProductId) {
          matchedResource = marketStallResources.find((resource: Resource) => 
            resource.whopProductId === templateProduct.whopProductId
          );
        }
        
        // Strategy 2: Match by resource ID (if product.id starts with "resource-")
        if (!matchedResource && typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-')) {
          const resourceId = templateProduct.id.replace('resource-', '');
          matchedResource = marketStallResources.find((resource: Resource) => 
            resource.id === resourceId
          );
          
          // Debug: Log if resource ID match failed
          if (!matchedResource) {
            console.log(`📦 [Filter] Resource ID match failed for "${templateProduct.name}":`, {
              templateResourceId: resourceId,
              availableResourceIds: marketStallResources.map((r: Resource) => r.id),
            });
          }
        }
        
        // Strategy 3: Match by exact name (fallback when resource ID changed)
        if (!matchedResource && templateProduct.name) {
          const normalizedTemplateName = templateProduct.name.toLowerCase().trim();
          matchedResource = marketStallResources.find((resource: Resource) => {
            if (!resource.name) return false;
            return resource.name.toLowerCase().trim() === normalizedTemplateName;
          });
        }
        
        // Only match products that exist in Market Stall
        if (matchedResource) {
          const mergedProduct: Product = {
            id: `resource-${matchedResource.id}`,
            name: templateProduct.name || matchedResource.name,
            description: templateProduct.description || matchedResource.description || '',
            price: parseFloat(matchedResource.price || '0'), // Always use MarketStall price
            buttonLink: templateProduct.buttonLink || matchedResource.link || '',
            whopProductId: matchedResource.whopProductId,
            cardClass: templateProduct.cardClass,
            buttonClass: templateProduct.buttonClass,
            buttonText: templateProduct.buttonText || 'VIEW DETAILS',
            buttonAnimColor: templateProduct.buttonAnimColor,
            titleClass: templateProduct.titleClass,
            descClass: templateProduct.descClass,
            image: templateProduct.image || templateProduct.imageAttachmentUrl || matchedResource.image || '',
            imageAttachmentId: templateProduct.imageAttachmentId || null,
            imageAttachmentUrl: templateProduct.imageAttachmentUrl || templateProduct.image || matchedResource.image || null,
            containerAsset: templateProduct.containerAsset,

            // Preserve promo-related fields from template
            promoDiscountType: templateProduct.promoDiscountType,
            promoDiscountAmount: templateProduct.promoDiscountAmount,
            promoLimitQuantity: templateProduct.promoLimitQuantity,
            promoQuantityLeft: templateProduct.promoQuantityLeft,
            promoShowFireIcon: templateProduct.promoShowFireIcon,
            promoCodeId: templateProduct.promoCodeId,
            promoCode: templateProduct.promoCode,
            promoScope: templateProduct.promoScope,
            promoDurationType: templateProduct.promoDurationType,
            promoDurationMonths: templateProduct.promoDurationMonths,
            
            // Preserve other fields from template
            badge: templateProduct.badge ?? null,
            salesCount: templateProduct.salesCount,
            showSalesCount: templateProduct.showSalesCount,
            starRating: templateProduct.starRating,
            reviewCount: templateProduct.reviewCount,
            showRatingInfo: templateProduct.showRatingInfo,
            checkoutConfigurationId: templateProduct.checkoutConfigurationId,

            // Include type, storageUrl, and productImages from Market Stall resource
            // Prefer template product type if it exists, otherwise use resource type
            // If resource has storageUrl but no type, infer FILE type
            type: templateProduct.type || matchedResource.type || (matchedResource.storageUrl ? 'FILE' : 'LINK'),
            storageUrl: templateProduct.storageUrl || matchedResource.storageUrl,
            productImages: templateProduct.productImages || (Array.isArray(matchedResource.productImages) ? matchedResource.productImages : undefined),
          };
          filteredProducts.push(mergedProduct);
        }
      }
      
      console.log(`📦 Filtered products: ${filteredProducts.length}/${templateProducts.length} matched Market Stall`);
      
      return filteredProducts;
    } catch (error) {
      console.error('🎨 [Template Filter] Error filtering template products:', error);
      // Return empty array on error - don't load products if we can't verify they exist in Market Stall
      return [];
    }
  }, [experienceId]);
  
  // Auto-add ONLY Market Stall (ResourceLibrary) products to all themes
  // IMPORTANT: This function ONLY uses Market Stall (global ResourceLibrary) products
  const autoAddMarketStallProductsToAllThemes = useCallback(async () => {
    try {
      // Get ONLY Market Stall resources from the global ResourceLibrary API
      // This fetches from /api/resources which returns Market Stall (global context) products only
      const response = await fetch(`/api/resources?experienceId=${experienceId}`);
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      const marketStallResources = data.data?.resources || [];
      
      // Filter for PAID Market Stall products only
      const paidMarketStallResources = marketStallResources.filter((resource: Resource) => 
        resource.category === 'PAID'
      );
      
      if (paidMarketStallResources.length === 0) {
        return;
      }
      
      // Get all available seasons/themes (including custom themes)
      const defaultSeasons = Object.keys(initialThemes);
      const customThemeKeys = Object.keys(allThemes).filter(key => 
        key.startsWith('custom_') || key.startsWith('db_')
      );
      const allThemeKeys = [...defaultSeasons, ...customThemeKeys];
      
      // Market Stall placeholder image
      const marketStallPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
      
      // Convert PAID Market Stall resources to products with Market Stall placeholders
      // IMPORTANT: Only Market Stall products are being added
      const marketStallProducts = paidMarketStallResources.map((resource: Resource) => ({
        id: `resource-${resource.id}`,
        name: resource.name,
        description: resource.description || '',
        price: parseFloat(resource.price || '0'), // Convert string to number
        image: resource.image || marketStallPlaceholder, // Use Market Stall placeholder if no image
        link: resource.link || '',
        category: resource.category || 'PAID',
        type: resource.type || 'LINK',
        // Add Market Stall placeholders
        placeholder: true,
        marketStallProduct: true
      }));
      
      // Add products to single state (for all themes)
      setProducts(prev => {
        const existingResourceIds = prev
            .filter(p => typeof p.id === 'string' && p.id.startsWith('resource-'))
            .map(p => p.id);
          
        // Only add products that aren't already in the state
          const newProducts = marketStallProducts.filter((product: Product) => 
            !existingResourceIds.includes(product.id)
          );
          
          if (newProducts.length > 0) {
          return [...prev, ...newProducts];
        }
        
        return prev;
      });
      
    } catch (error) {
      console.error('🛒 Error auto-adding Market Stall products:', error);
    }
  }, [experienceId, allThemes]);
  
  // Helper function to map theme name to season key
  const getSeasonKeyFromThemeName = (themeName: string): string => {
    const themeNameToSeason: Record<string, string> = {
      'Winter Frost': 'Winter',
      'Summer Sun': 'Summer',
      'Spooky Night': 'Fall',
      'Autumn Harvest': 'Autumn',
      'Holiday Cheer': 'Holiday Cheer',
      'Spring Renewal': 'Spring Renewal',
      'Cyber Sale': 'Cyber Sale',
      'Black Friday': 'Black Friday',
    };
    return themeNameToSeason[themeName] || 'Black Friday';
  };

  // Helper function to apply template data to state (used for both cached and DB-loaded templates)
  const applyTemplateDataToState = useCallback(async (template: StoreTemplate, skipProductFiltering = false, isCached = false) => {
    // PRIORITY: Use template.templateData.currentTheme if it exists (don't normalize it)
    // Only normalize when falling back to themeSnapshot
    let templateTheme: LegacyTheme;
    let seasonToUse: string;
    
    if (template.templateData.currentTheme) {
      templateTheme = template.templateData.currentTheme;
      seasonToUse = getSeasonKeyFromThemeName(templateTheme.name);
    } else {
      templateTheme = convertTemplateThemeToLegacy(template.themeSnapshot);
      seasonToUse = template.currentSeason && template.currentSeason !== 'Fall'
        ? template.currentSeason
        : getSeasonKeyFromThemeName(templateTheme.name);
    }
    
    setCurrentSeason(seasonToUse);
    setCurrentTemplateTheme(templateTheme);
    
    // Mark that a template has been loaded
    setHasManuallyLoadedTemplate(true);
    
    // Load text styles from template - TEMPLATE DATA TAKES PRIORITY
    // Try multiple sources in order of preference:
    // 1. fixedTextStyles (new flat format)
    // 2. themeTextStyles for current season (legacy format)
    // 3. themeTextStyles for any season (legacy fallback)
    // 4. Theme defaults (only if template has NO text styles at all)
    let savedTextStyles = template.templateData.fixedTextStyles;
    
    if (!savedTextStyles?.headerMessage?.content && !savedTextStyles?.mainHeader?.content) {
      // Try legacy format with current season
      savedTextStyles = template.templateData.themeTextStyles?.[seasonToUse];
    }
    
    if (!savedTextStyles?.headerMessage?.content && !savedTextStyles?.mainHeader?.content) {
      // Try legacy format with any available season
      const themeTextStyles = template.templateData.themeTextStyles;
      if (themeTextStyles) {
        const firstSeason = Object.keys(themeTextStyles)[0];
        if (firstSeason) {
          savedTextStyles = themeTextStyles[firstSeason];
        }
      }
    }
    
    console.log('📝 [applyTemplateDataToState] Loading text styles:', {
      templateName: template.name,
      hasFixedTextStyles: !!template.templateData.fixedTextStyles,
      hasThemeTextStyles: !!template.templateData.themeTextStyles,
      savedHeaderContent: savedTextStyles?.headerMessage?.content?.substring(0, 30),
      savedMainHeaderContent: savedTextStyles?.mainHeader?.content?.substring(0, 30),
    });
    
    // Use saved text styles if they have content, otherwise use theme defaults
    if (savedTextStyles?.headerMessage?.content || savedTextStyles?.mainHeader?.content || savedTextStyles?.subHeader?.content) {
      setFixedTextStyles(savedTextStyles);
    } else {
      // Template has no saved text - use theme defaults
      console.warn('⚠️ [applyTemplateDataToState] No text styles found in template, using theme defaults');
      const themeDefaults = getThemeDefaultText(templateTheme.name, templateTheme.aiMessage);
      const textColor = getThemeTextColor(templateTheme.welcomeColor);
      setFixedTextStyles({
        mainHeader: {
          content: themeDefaults.mainHeader,
          color: textColor,
          styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg'
        },
        headerMessage: {
          content: themeDefaults.headerMessage,
          color: textColor,
          styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
        },
        subHeader: {
          content: themeDefaults.subHeader,
          color: textColor,
          styleClass: 'text-lg sm:text-xl font-normal'
        },
        promoMessage: {
          content: themeDefaults.promoMessage,
          color: textColor,
          styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md'
        }
      });
    }
    
    // Load logo (handle both old theme-specific and new single state)
    if (template.templateData.themeLogos && template.templateData.themeLogos[seasonToUse]) {
      setLogoAsset(template.templateData.themeLogos[seasonToUse]);
    } else if (template.templateData.logoAsset) {
      setLogoAsset(template.templateData.logoAsset);
    }
    
    // CRITICAL: Preload background image BEFORE setting state to prevent gaps
    // Skip preloading if template is cached (backgrounds already preloaded)
    const backgroundUrl = template.templateData.backgroundAttachmentUrl || 
                         template.templateData.themeUploadedBackgrounds?.[seasonToUse] || 
                         template.templateData.themeGeneratedBackgrounds?.[seasonToUse] ||
                         template.templateData.uploadedBackground ||
                         template.templateData.generatedBackground;
    
    if (backgroundUrl) {
      if (!isCached) {
        await preloadBackgroundImage(backgroundUrl);
      }
      
      // Then set the state (image is already loaded, no gap!)
      const isGenerated = !!(template.templateData.themeGeneratedBackgrounds?.[seasonToUse] || template.templateData.generatedBackground);
      if (isGenerated) {
        setGeneratedBackground(backgroundUrl);
      } else {
        setUploadedBackground(backgroundUrl);
      }
    } else {
      // Set backgrounds (might be null/empty, but that's fine)
      setGeneratedBackground(null);
      setUploadedBackground(null);
    }
    
    // Set WHOP attachment fields if available (single state for all themes)
    if (template.templateData.backgroundAttachmentId) {
      setBackgroundAttachmentId(template.templateData.backgroundAttachmentId);
    }
    if (template.templateData.backgroundAttachmentUrl) {
      setBackgroundAttachmentUrl(template.templateData.backgroundAttachmentUrl);
    }
    if (template.templateData.logoAttachmentId) {
      setLogoAttachmentId(template.templateData.logoAttachmentId);
    }
    if (template.templateData.logoAttachmentUrl) {
      setLogoAttachmentUrl(template.templateData.logoAttachmentUrl);
    }
    
    // Handle template products (handle both old theme-specific and new single state)
    // BATCHED: All product processing happens here in one setProducts call to prevent UI flicker
    let templateProducts: Product[] = [];
    if (template.templateData.products && Array.isArray(template.templateData.products)) {
      // New format: single products array
      templateProducts = template.templateData.products;
    } else if (template.templateData.themeProducts && template.templateData.themeProducts[seasonToUse]) {
      // Old format: theme-specific products
      templateProducts = template.templateData.themeProducts[seasonToUse];
    } else if (template.templateData.themeProducts && typeof template.templateData.themeProducts === 'object') {
      // Fallback: get products from any season (use first available)
      const firstSeason = Object.keys(template.templateData.themeProducts)[0];
      if (firstSeason) {
        templateProducts = template.templateData.themeProducts[firstSeason];
      }
    }
    
    // Load and validate discount settings based on database state BEFORE setting products
    // This ensures products are cleaned before being loaded into state
    // First, fetch current discount from database
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
      console.warn('⚠️ Error fetching discount from database:', error);
    }

    const discountStatus = checkDiscountStatus(databaseDiscountData);
    const isActiveOrApproaching = discountStatus === 'active' || discountStatus === 'approaching';
    
    // Clean templateProducts based on discount status BEFORE setting to state
    let shouldCleanAllTemplates = false;
    let newDiscountSettings: DiscountSettings | null = null;
    
    // Case 1: Template HAS discountSettings
    if (template.templateData.discountSettings) {
      const templateDiscountSettings = template.templateData.discountSettings;
      const templateSeasonalDiscountId = templateDiscountSettings.seasonalDiscountId;
      const databaseSeasonalDiscountId = databaseDiscountData?.seasonalDiscountId;

      // If promo is NON-EXISTENT or EXPIRED - clean products BEFORE setting to state
      if (discountStatus === 'non-existent' || discountStatus === 'expired') {
        console.log('🧹 Removing discount settings and product promo data - discount is non-existent or expired');
        templateProducts = templateProducts.map(product => removeProductPromoData(product));
        shouldCleanAllTemplates = true;
        newDiscountSettings = createDefaultDiscountSettings();
      }
      // If promo is ACTIVE/APPROACHING but different seasonal_discount_id - clean products
      else if (isActiveOrApproaching && databaseSeasonalDiscountId && templateSeasonalDiscountId !== databaseSeasonalDiscountId) {
        console.log('🔄 Updating discount settings - different active discount found');
        templateProducts = templateProducts.map(product => removeProductPromoData(product));
        shouldCleanAllTemplates = true;
        newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
      }
      // If promo is ACTIVE/APPROACHING and matches - use database discount to ensure globalDiscount is correct
      else if (isActiveOrApproaching && templateSeasonalDiscountId === databaseSeasonalDiscountId) {
        console.log('✅ Discount settings match active discount - using database discount to ensure globalDiscount is correct');
        newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
      }
      // If template has discount but no seasonalDiscountId and database has active discount
      else if (!templateSeasonalDiscountId && isActiveOrApproaching && databaseSeasonalDiscountId) {
        console.log('🔄 Updating template discount - template has discount but no ID, database has active discount');
        newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
      }
      // Template has discount but database doesn't have active/approaching discount
      else {
        console.log('⚠️ Template has discount but database discount is not active/approaching');
        // Still use database discount data if available to ensure globalDiscount is correct
        if (databaseDiscountData) {
          newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
        } else {
          newDiscountSettings = templateDiscountSettings;
        }
      }
    }
    // Case 2: Template DOESN'T have discountSettings
    else {
      // If discount is ACTIVE/APPROACHING
      if (isActiveOrApproaching && databaseDiscountData) {
        console.log('✅ Applying active discount from database to template');
        newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
      }
      // If discount is NOT active/approaching
      else {
        newDiscountSettings = createDefaultDiscountSettings();
      }
    }
    
    // Process products in a single batch to prevent multiple renders
    if (Array.isArray(templateProducts) && templateProducts.length > 0) {
      if (typeof templateProducts[0] === 'string') {
        // Legacy format: ResourceLibrary product IDs
        setProducts([]);
        setTemplateResourceLibraryProductIds(templateProducts as unknown as string[]);
      } else {
        // New format: Complete frontend product state
        let processedProducts: Product[];
        
        if (skipProductFiltering) {
          // When loading directly from template, ensure type field is set
          // Infer type from storageUrl if type is missing
          processedProducts = sanitizeProducts(templateProducts.map(product => ({
            ...product,
            type: product.type || (product.storageUrl ? 'FILE' : 'LINK'),
          })));
        } else {
          const filteredProducts = await filterTemplateProductsAgainstMarketStall(templateProducts);
          processedProducts = sanitizeProducts(filteredProducts);
        }
        
        // Apply theme styles and set products in one operation
        const finalProducts = applyThemeStylesToProducts(processedProducts, templateTheme, {
          preserveExisting: true,
        });
        
        setProducts(finalProducts);
        setTemplateResourceLibraryProductIds([]);
      }
    } else {
      setProducts([]);
      setTemplateResourceLibraryProductIds([]);
    }
    
    // Clean ALL templates if needed (expired/non-existent or different discount ID)
    // Note: We need to access templates from the closure, but since this is inside loadTemplate,
    // we'll use a functional update pattern to get the latest templates
    if (shouldCleanAllTemplates && newDiscountSettings) {
      try {
        // Get all templates from state using functional update
        let allTemplates: StoreTemplate[] = [];
        setTemplates(prev => {
          allTemplates = prev;
          return prev;
        });
        
        // Prepare cleaned templates - remove ProductCard promo data from all products
        const cleanedTemplates = allTemplates.map(t => {
          const templateProducts = (t.templateData?.products || []);
          const cleanedTemplateProducts = templateProducts.map((product: Product) => removeProductPromoData(product));
          
          // Check if template has products with promo data
          const hasProductsWithPromo = templateProducts.some((p: Product) => 
            p.promoCode || p.promoCodeId || p.promoDiscountType || p.promoDiscountAmount
          );
          
          if (hasProductsWithPromo) {
            return {
              ...t,
              templateData: {
                ...t.templateData,
                products: cleanedTemplateProducts,
                discountSettings: discountStatus === 'non-existent' || discountStatus === 'expired' 
                  ? undefined 
                  : (t.templateData.discountSettings?.seasonalDiscountId === databaseDiscountData?.seasonalDiscountId 
                      ? newDiscountSettings 
                      : t.templateData.discountSettings),
              },
            };
          }
          return t; // No changes needed
        });
        
        // Filter to only templates that actually have changes
        const templatesWithChanges = cleanedTemplates.filter(t => {
          const originalTemplate = allTemplates.find(orig => orig.id === t.id);
          if (originalTemplate) {
            const originalProducts = originalTemplate.templateData?.products || [];
            return originalProducts.some((p: Product) => 
              p.promoCode || p.promoCodeId || p.promoDiscountType || p.promoDiscountAmount
            );
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
                } as StoreTemplate);
              } else {
                newCache.set(template.id, template as StoreTemplate);
              }
            });
            return newCache;
          });
          
          // Save all affected templates to database
          console.log(`💾 Saving ${templatesWithChanges.length} cleaned templates to database after ProductCard promo data cleanup`);
          const savePromises = templatesWithChanges.map(t => 
            updateTemplate(experienceId, t.id, {
              templateData: t.templateData,
            }).catch(error => {
              console.warn(`⚠️ Failed to save template ${t.id} to database:`, error);
              return null;
            })
          );
          
          await Promise.all(savePromises);
          console.log('✅ All templates saved to database after ProductCard promo data cleanup');
        }
      } catch (error) {
        console.error('⚠️ Error cleaning all templates:', error);
      }
    }
    
    // Set discount settings
    if (newDiscountSettings) {
      setDiscountSettings(newDiscountSettings);
    }
    
    // Load floating assets (handle both old theme-specific and new single state)
    if (template.templateData.floatingAssets && Array.isArray(template.templateData.floatingAssets)) {
      // New format: single floating assets array
      setFloatingAssets(template.templateData.floatingAssets);
    } else if (template.templateData.themeFloatingAssets && template.templateData.themeFloatingAssets[seasonToUse]) {
      // Old format: theme-specific floating assets
      setFloatingAssets(template.templateData.themeFloatingAssets[seasonToUse]);
    } else {
      setFloatingAssets([]);
    }
    
    // IMPORTANT: If this is a custom theme (not in initial themes), add it to allThemes
    // so it can be selected from the dropdown after template is loaded
    const isDefaultTheme = Object.values(initialThemes).some(
      (defaultTheme: LegacyTheme) => defaultTheme.name === templateTheme.name
    );
    
    if (!isDefaultTheme) {
      const templateThemeKey = `template_${template.id}_${templateTheme.name}`;
      setAllThemes(prev => ({
        ...prev,
        [templateThemeKey]: templateTheme
      }));
    }
    
    // NOTE: Theme styles are now applied in the batched product processing above
    // No additional setProducts call needed here
    
    // Load promo button styling if available
    if (template.templateData.promoButton) {
      setPromoButton(template.templateData.promoButton);
    }
    
    // Note: Discount validation and ProductCard promo data cleaning now happens BEFORE setting products to state
    // (see lines 1137-1184 above) to ensure products are cleaned before being loaded
    
    // Track which template is currently loaded/being edited
    setCurrentlyLoadedTemplateId(template.id);
  }, [preloadBackgroundImage, filterTemplateProductsAgainstMarketStall, convertTemplateThemeToLegacy, setCurrentSeason, setFixedTextStyles, setLogoAsset, setGeneratedBackground, setUploadedBackground, setBackgroundAttachmentId, setBackgroundAttachmentUrl, setLogoAttachmentId, setLogoAttachmentUrl, setProducts, setTemplateResourceLibraryProductIds, setFloatingAssets, setCurrentTemplateTheme, setPromoButton, sanitizeProducts, createDefaultDiscountSettings]);
  
  // Application load logic: newest template -> default theme fallback + auto-add Market Stall products
  const loadApplicationData = useCallback(async () => {
    try {
      // IMPORTANT: Load themes FIRST before anything else so custom themes are available
      // This ensures custom themes are in allThemes before we try to auto-add products to them
      console.log('🎨 Loading themes from database...');
      await loadThemes();
      // Use a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 50));
      console.log('✅ Themes loaded, allThemes now contains:', Object.keys(allThemes).filter(k => k.startsWith('db_') || k.startsWith('custom_')).length, 'custom themes');
      
      // Step 1: Load live template metadata for UI (but do not auto-load it into editor)
      const live = await getLiveTemplate(experienceId);
      setLiveTemplate(live);

      // Step 2: Load origin template (needed for auto-creation)
      await loadOriginTemplate();
      
      // Step 3: Load all templates ("shops") and pick the most recently updated
      const allTemplates = await getTemplates(experienceId);
      
      // Step 3a: Fetch discount data from database and apply to all templates
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
        console.warn('⚠️ [loadApplicationData] Error fetching discount from database:', error);
      }
      
      // Apply discount settings to all templates if discount data exists
      if (databaseDiscountData) {
        const discountStatus = checkDiscountStatus(databaseDiscountData);
        const isActiveOrApproaching = discountStatus === 'active' || discountStatus === 'approaching';
        
        if (isActiveOrApproaching) {
          const updatedDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
          
          // Update all templates with discount settings from database
          const updatedTemplates = allTemplates.map(template => {
            // Only update if template doesn't have discountSettings or if it has a different discount ID
            if (!template.templateData.discountSettings || 
                template.templateData.discountSettings.seasonalDiscountId !== databaseDiscountData?.seasonalDiscountId) {
              return {
                ...template,
                templateData: {
                  ...template.templateData,
                  discountSettings: updatedDiscountSettings,
                },
              };
            }
            // Template already has correct discount settings
            return template;
          });
          
          setTemplates(updatedTemplates);
          
          // Update cache with updated templates
          updateCachedTemplates(prev => {
            const newCache = new Map(prev);
            updatedTemplates.forEach(template => {
              newCache.set(template.id, template as StoreTemplate);
            });
            return newCache;
          });
        } else {
          // Discount is not active/approaching, set templates as-is
          setTemplates(allTemplates);
        }
      } else {
        // No discount data, set templates as-is
        setTemplates(allTemplates);
      }

      const shopTemplates = allTemplates.filter(template => !template.isLive);
      
      // Step 3a: Auto-create template from origin template if no templates exist
      // Fetch origin template directly to ensure we have the latest data
      let currentOriginTemplate = originTemplate;
      if (!currentOriginTemplate) {
        try {
          currentOriginTemplate = await getOriginTemplate(experienceId);
          if (currentOriginTemplate) {
            setOriginTemplate(currentOriginTemplate);
          }
        } catch (error) {
          console.warn('⚠️ [loadApplicationData] Failed to fetch origin template:', error);
        }
      }
      
      if (shopTemplates.length === 0 && currentOriginTemplate) {
        console.log('📦 [loadApplicationData] No templates found, creating initial template from origin template...');
        try {
          const originData = currentOriginTemplate.defaultThemeData;
          const newTemplateName = 'Shop 1';
          
          // Extract theme data directly from default_theme_data
          const companyThemeName = originData.name || 'Company Theme';
          const companyThemeCard = originData.card || 'bg-white/95 backdrop-blur-sm shadow-xl';
          const companyThemeText = originData.text || 'text-gray-800';
          const companyThemeWelcomeColor = originData.welcomeColor || 'text-yellow-300';
          const companyThemeAccent = originData.accent || 'bg-indigo-500';
          const companyThemeRing = originData.ringColor || companyThemeAccent;
          const companyThemePrompt = originData.themePrompt || currentOriginTemplate.themePrompt || '';
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
              
              console.log(`📦 [loadApplicationData] Fetched ${marketStallProducts.length} Market Stall products for initial template`);
            }
          } catch (error) {
            console.warn('⚠️ [loadApplicationData] Failed to fetch Market Stall products:', error);
          }
          
          const originProducts = originData.products || [];
          const allProducts = [...marketStallProducts, ...originProducts];
          const originFloatingAssets = originData.floatingAssets || [];
          
          // Use text styles from origin template (already have correct colors)
          const originTextStyles: FixedTextStyles = originData.fixedTextStyles || {
            mainHeader: { 
              content: companyThemeMainHeader || 'Edit Headline', 
              color: getThemeTextColor(companyThemeWelcomeColor), 
              styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg' 
            },
            headerMessage: { 
              content: companyThemeMainHeader || 'Edit Headline',
              color: getThemeTextColor(companyThemeWelcomeColor), 
              styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg' 
            },
            subHeader: { 
              content: companyThemeAiMessage || 'Add a short supporting subheader', 
              color: getThemeTextColor(companyThemeWelcomeColor), 
              styleClass: 'text-lg sm:text-xl font-normal' 
            },
            promoMessage: { 
              content: '', 
              color: getThemeTextColor(companyThemeWelcomeColor), 
              styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md' 
            }
          };
          const originLogo = originData.logo || logoAsset;
          const originBackground = originData.background;
          const originPromoButton = originData.promoButton || promoButton;
          
          const newTemplate = await createTemplate(experienceId, {
            name: newTemplateName,
            experienceId: experienceId || '',
            userId: '', // Will be set by API
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
              discountSettings: {
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
              },
              
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
          
          console.log('✅ [loadApplicationData] Created initial template from origin template:', newTemplate.name);
          
          // Set the currently loaded template ID so save will update instead of create
          setCurrentlyLoadedTemplateId(newTemplate.id);
          
          // Reload templates to include the newly created one
          const updatedTemplates = await getTemplates(experienceId);
          setTemplates(updatedTemplates);
          
          // Update shopTemplates with the new template
          const updatedShopTemplates = updatedTemplates.filter(template => !template.isLive);
          shopTemplates.push(...updatedShopTemplates);
          
          // Use the newly created template as the latest template
          const newLatestTemplate = updatedShopTemplates.find(t => t.id === newTemplate.id) || updatedShopTemplates[0];
          if (newLatestTemplate) {
            // Replace shopTemplates array with the new template
            shopTemplates.length = 0;
            shopTemplates.push(newLatestTemplate);
          }
        } catch (error) {
          console.error('⚠️ [loadApplicationData] Failed to create template from origin template:', error);
          // Continue with normal flow even if creation fails
        }
      }
      
      const latestTemplate = shopTemplates.length > 0
        ? [...shopTemplates].sort((a, b) => {
            const timeB = new Date((b.updatedAt || b.createdAt || new Date(0))).getTime();
            const timeA = new Date((a.updatedAt || a.createdAt || new Date(0))).getTime();
            return timeB - timeA;
          })[0]
        : null;

      // Step 4: Load the most recent template
      if (latestTemplate) {
        // Mark which template we're loading (for isStoreContentReady verification)
        setPendingTemplateId(latestTemplate.id);
        setIsLoadingTemplate(true);
        
        // Load from DB data (cache is for switching between templates later)
        await applyTemplateDataToState(latestTemplate);
        saveLastLoadedTemplateToCache(latestTemplate);
        
        console.log('📂 Loaded template:', latestTemplate.name);
        
        // Signal that template loading operation is complete
        // isStoreContentReady will become true when fixedTextStyles has content
        setIsLoadingTemplate(false);
      } else {
        // No templates and no origin template - wait for origin template to be created
        // Don't set up default theme - only auto-create from origin template
        console.log('📦 [loadApplicationData] No templates found and no origin template available. Waiting for origin template creation...');
        setProducts([]);
        setCurrentSeason('Company');
      }
      
      // Step 5: Ensure Market Stall products are available
      await autoAddMarketStallProductsToAllThemes();
      
      // Step 6: After initial template is loaded, cache ALL templates and preload all backgrounds
      // This ensures instant switching between templates without DB fetches
      if (allTemplates && allTemplates.length > 0) {
        // Cache all templates and preload backgrounds in the background (non-blocking)
        cacheAllTemplatesAndPreloadBackgrounds(allTemplates).catch(err => {
          console.error('Error caching templates:', err);
        });
      }
      
      // Mark initial load as complete
      setIsInitialLoadComplete(true);
      
    } catch (error) {
      console.error('Error loading application data:', error);
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        console.log('Authentication required for database operations');
        setApiError(null);
      } else {
        setApiError(`Failed to load application data: ${(error as Error).message}`);
      }
      // On error, don't set default text - wait for origin template creation
      console.log('⚠️ [loadApplicationData] Error loading application data, waiting for origin template creation...');
      setProducts([]);
      setCurrentSeason('Company');
      // Mark initial load as complete even on error
      setIsInitialLoadComplete(true);
    }
  }, [experienceId, autoAddMarketStallProductsToAllThemes, filterTemplateProductsAgainstMarketStall, preloadBackgroundImage, loadLastLoadedTemplateFromCache, applyTemplateDataToState, saveLastLoadedTemplateToCache, cacheAllTemplatesAndPreloadBackgrounds, clearLastLoadedTemplateFromCache, allThemes, getThemeTextColor]);
  
  // Load last edited template
  const loadLastEditedTemplate = useCallback(async () => {
    try {
      const lastEdited = await getLastEditedTemplate(experienceId);
      setLastEditedTemplate(lastEdited);
    } catch (error) {
      console.error('Error loading last edited template:', error);
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        console.log('Authentication required for database operations');
        setApiError(null);
      } else {
        setApiError(`Failed to load last edited template: ${(error as Error).message}`);
      }
    }
  }, [experienceId]);
  
  // Initialize data on mount
  useEffect(() => {
    if (experienceId) {
      // Reset cache ref when experienceId changes
      hasLoadedFromCacheRef.current = false;
      
      // Load themes first, then load application data (which will also load themes but they'll be cached)
      // loadThemes is called inside loadApplicationData now, so we don't need to call it separately
      loadTemplates();
      loadApplicationData(); // New unified load function (includes loadThemes)
      loadLastEditedTemplate();
    }
    // Only depend on experienceId to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceId]);
  
  // Theme management functions
  const createThemeHandler = useCallback(async (themeData: Omit<Theme, "id" | "experienceId" | "createdAt" | "updatedAt">) => {
    try {
      const newTheme = await createTheme(experienceId, themeData);
      setThemes(prev => [...prev, newTheme]);
      setAllThemes(prev => ({ ...prev, [`db_${newTheme.id}`]: convertThemeToLegacy(newTheme) }));
      return newTheme;
    } catch (error) {
      console.error('Error creating theme:', error);
      setApiError(`Failed to create theme: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId]);
  
  const updateThemeHandler = useCallback(async (themeId: string, updates: Partial<Pick<Theme, "name" | "themePrompt" | "accentColor" | "ringColor">>) => {
    try {
      // Prevent company theme updates (company theme should not be modified)
      const themeToUpdate = themes.find(t => t.id === themeId);
      if (themeToUpdate && themeToUpdate.season === 'Company') {
        console.log('🔒 [updateThemeHandler] Company theme detected - skipping update (company theme is protected)');
        throw new Error('Company theme cannot be updated');
      }
      
      const updatedTheme = await updateTheme(experienceId, themeId, updates);
      setThemes(prev => prev.map(t => t.id === themeId ? updatedTheme : t));
      setAllThemes(prev => ({ ...prev, [`db_${updatedTheme.id}`]: convertThemeToLegacy(updatedTheme) }));
      return updatedTheme;
    } catch (error) {
      console.error('Error updating theme:', error);
      setApiError(`Failed to update theme: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId, themes]);
  
  // Template management functions
  const saveTemplate = useCallback(async (templateData: Omit<StoreTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Check if we can add a template
      if (!canAddTemplate()) {
        const error = `Cannot save template: Maximum of ${MAX_CUSTOM_TEMPLATES} templates allowed`;
        console.warn('⚠️', error);
        // Don't set apiError for template limit - it will be handled by notification
        // setApiError(error);
        throw new Error(error);
      }
      
      console.log("🔍 saveTemplate - experienceId:", experienceId);
      console.log("🔍 saveTemplate - templateData:", templateData);
      const newTemplate = await createTemplate(experienceId, templateData);
      setTemplates(prev => [...prev, newTemplate]);
      // Update cache
      updateCachedTemplates(prev => {
        const newCache = new Map(prev);
        newCache.set(newTemplate.id, newTemplate);
        return newCache;
      });
      return newTemplate;
    } catch (error) {
      console.error('Error saving template:', error);
      const errorMessage = (error as Error).message;
      // Don't set apiError for template limit errors - handled by notification
      if (!errorMessage.includes('Maximum of') || !errorMessage.includes('templates allowed')) {
        setApiError(`Failed to save template: ${errorMessage}`);
      }
      throw error;
    }
  }, [experienceId, canAddTemplate, updateCachedTemplates]);
  
  const updateTemplateWrapper = useCallback(async (templateId: string, updates: Partial<Pick<StoreTemplate, 'name' | 'templateData'>>) => {
    try {
      console.log("🔍 updateTemplate - experienceId:", experienceId, "templateId:", templateId);
      console.log("🔍 updateTemplate - updates:", updates);
      const updatedTemplate = await updateTemplate(experienceId, templateId, updates);
      setTemplates(prev => prev.map(t => t.id === templateId ? updatedTemplate : t));
      
      // Update liveTemplate if this is the live template
      setLiveTemplate(prev => {
        if (prev && prev.id === templateId) {
          return updatedTemplate;
        }
        return prev;
      });
      
      // Update cache
      updateCachedTemplates(prev => {
        const newCache = new Map(prev);
        newCache.set(templateId, updatedTemplate);
        return newCache;
      });
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      setApiError(`Failed to update template: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId, updateCachedTemplates]);
  
  const loadTemplate = useCallback(async (templateId: string) => {
    try {
      // Mark which template we're loading (for isStoreContentReady verification)
      setPendingTemplateId(templateId);
      setIsLoadingTemplate(true);
      
      // Determine if this is initial load (no template currently loaded) vs template switch
      const isInitialLoad = currentlyLoadedTemplateId === null;
      
      let template: StoreTemplate | undefined;
      let isCached = false; // Track if template was loaded from cache
      
      if (isInitialLoad) {
        // On initial app/store load: Always load from database (fresh data)
        console.log(`📂 Initial load - fetching template ${templateId} from DB...`);
        template = await getTemplate(experienceId, templateId);
        isCached = false; // Initial load is always from DB
        
        // Add to cache for future template switches
        updateCachedTemplates((() => {
          const newCache = new Map(cachedTemplates);
          newCache.set(templateId, template!);
          return newCache;
        })());
      } else {
        // When switching between templates: Load from cache for performance
        template = cachedTemplates.get(templateId);
        
        if (!template) {
          // Template not in cache, fetch from DB
          console.log(`📂 Template ${templateId} not in cache, fetching from DB...`);
          template = await getTemplate(experienceId, templateId);
          isCached = false; // Not in cache, loaded from DB
          
          // Add to cache for next time (also saves to localStorage)
          updateCachedTemplates((() => {
            const newCache = new Map(cachedTemplates);
            newCache.set(templateId, template!);
            return newCache;
          })());
        } else {
          console.log(`✅ Template ${templateId} found in cache, using cached version (instant load!)`);
          isCached = true; // Template was loaded from cache
        }
      }
      
      // PRIORITY: Use template.templateData.currentTheme if it exists (don't normalize it)
      // Only normalize when falling back to themeSnapshot
      let templateTheme: LegacyTheme;
      let seasonToUse: string;
      
      if (template.templateData.currentTheme) {
        // Use the theme from templateData (this is what the template is actually using)
        templateTheme = template.templateData.currentTheme;
        // Derive season from the theme name
        seasonToUse = getSeasonKeyFromThemeName(templateTheme.name);
        console.log('🎨 [loadTemplate] Using template.templateData.currentTheme:', templateTheme.name, '→ season:', seasonToUse);
      } else {
        // Fall back to themeSnapshot (normalize "Default Theme" here)
        templateTheme = convertTemplateThemeToLegacy(template.themeSnapshot);
        // Derive season from the theme name, or use template.currentSeason if valid
        seasonToUse = template.currentSeason && template.currentSeason !== 'Fall'
          ? template.currentSeason
          : getSeasonKeyFromThemeName(templateTheme.name);
        console.log('🎨 [loadTemplate] Using template.themeSnapshot (fallback):', templateTheme.name, '→ season:', seasonToUse);
      }
      
      setCurrentSeason(seasonToUse);
      setCurrentTemplateTheme(templateTheme);
      
      // Mark that a template has been manually loaded
      setHasManuallyLoadedTemplate(true);
      
      // Load text styles from template - TEMPLATE DATA TAKES PRIORITY
      // Try multiple sources in order of preference
      let savedTextStyles = template.templateData.fixedTextStyles;
      
      if (!savedTextStyles?.headerMessage?.content && !savedTextStyles?.mainHeader?.content) {
        savedTextStyles = template.templateData.themeTextStyles?.[seasonToUse];
      }
      
      if (!savedTextStyles?.headerMessage?.content && !savedTextStyles?.mainHeader?.content) {
        const themeTextStyles = template.templateData.themeTextStyles;
        if (themeTextStyles) {
          const firstSeason = Object.keys(themeTextStyles)[0];
          if (firstSeason) {
            savedTextStyles = themeTextStyles[firstSeason];
          }
        }
      }
      
      // SIMPLIFIED: Log exactly what text will be loaded
      console.log('📝 [loadTemplate] Text from template:', {
        templateName: template.name,
        mainHeader: savedTextStyles?.mainHeader?.content || '(empty - will use defaults)',
        headerMessage: savedTextStyles?.headerMessage?.content?.substring(0, 50) || '(empty)',
        subHeader: savedTextStyles?.subHeader?.content?.substring(0, 50) || '(empty)',
      });
      
      if (savedTextStyles?.headerMessage?.content || savedTextStyles?.mainHeader?.content || savedTextStyles?.subHeader?.content) {
        setFixedTextStyles(savedTextStyles);
      } else {
        console.warn('⚠️ [loadTemplate] No text styles found in template, using theme defaults');
        const themeDefaults = getThemeDefaultText(templateTheme.name, templateTheme.aiMessage);
        const textColor = getThemeTextColor(templateTheme.welcomeColor);
        setFixedTextStyles({
          mainHeader: {
            content: themeDefaults.mainHeader,
            color: textColor,
            styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg'
          },
          headerMessage: {
            content: themeDefaults.headerMessage,
            color: textColor,
            styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
          },
          subHeader: {
            content: themeDefaults.subHeader,
            color: textColor,
            styleClass: 'text-lg sm:text-xl font-normal'
          },
          promoMessage: {
            content: themeDefaults.promoMessage,
            color: textColor,
            styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md'
          }
        });
      }
      
      if (template.templateData.logoAsset) {
        setLogoAsset(template.templateData.logoAsset);
      } else if (template.templateData.themeLogos?.[seasonToUse]) {
        setLogoAsset(template.templateData.themeLogos[seasonToUse]);
      }
      
      // CRITICAL: Preload background image BEFORE setting state to prevent gaps
      // Skip preloading if template is cached (backgrounds already preloaded during initial cache)
      const backgroundUrl = template.templateData.backgroundAttachmentUrl || 
                           template.templateData.themeUploadedBackgrounds?.[seasonToUse] || 
                           template.templateData.themeGeneratedBackgrounds?.[seasonToUse] ||
                           template.templateData.uploadedBackground ||
                           template.templateData.generatedBackground;
      
      if (backgroundUrl) {
        if (!isCached) {
          // Only preload if not cached (cached templates already have preloaded backgrounds)
          console.log('🖼️ Preloading template background image:', backgroundUrl);
          await preloadBackgroundImage(backgroundUrl);
        } else {
          console.log('✅ Using preloaded background from cache (instant transition!)');
        }
        
        // Then set the state (image is already loaded, no gap!)
        const isGenerated = !!(template.templateData.themeGeneratedBackgrounds?.[seasonToUse] || template.templateData.generatedBackground);
        if (isGenerated) {
          setGeneratedBackground(backgroundUrl);
        } else {
          setUploadedBackground(backgroundUrl);
        }
      } else {
        // Set backgrounds (might be null/empty, but that's fine)
        setGeneratedBackground(null);
        setUploadedBackground(null);
      }
      
      // Handle template products (handle both old theme-specific and new single state)
      // BATCHED: All product processing happens here in one setProducts call
      let templateProducts: Product[] = [];
      if (template.templateData.products && Array.isArray(template.templateData.products)) {
        // New format: single products array
        templateProducts = template.templateData.products;
      } else if (template.templateData.themeProducts && template.templateData.themeProducts[seasonToUse]) {
        // Old format: theme-specific products
        templateProducts = template.templateData.themeProducts[seasonToUse];
      } else if (template.templateData.themeProducts && typeof template.templateData.themeProducts === 'object') {
        // Fallback: get products from any season (use first available)
        const firstSeason = Object.keys(template.templateData.themeProducts)[0];
        if (firstSeason) {
          templateProducts = template.templateData.themeProducts[firstSeason];
        }
      }
      
      // CRITICAL: Update template product order to match Market Stall order BEFORE loading
      // This ensures the template always has the correct order, eliminating need for reordering on display
      if (Array.isArray(templateProducts) && templateProducts.length > 0 && typeof templateProducts[0] !== 'string') {
        try {
          // Fetch Market Stall resources to get current order
          const response = await fetch(`/api/resources?experienceId=${experienceId}&limit=100`);
          if (response.ok) {
            const data = await response.json();
            const marketStallResources = data.data?.resources || [];
            const paidMarketStallResources = marketStallResources
              .filter((r: any) => r.category === 'PAID')
              .sort((a: any, b: any) => {
                if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
                  return a.displayOrder - b.displayOrder;
                }
                if (a.displayOrder !== undefined) return -1;
                if (b.displayOrder !== undefined) return 1;
                return 0;
              });
            
            if (paidMarketStallResources.length > 0) {
              // Create a map of resource ID to resource
              const resourceMap = new Map(paidMarketStallResources.map((r: any) => [r.id, r]));
              
              // Get Market Stall order (resource IDs in displayOrder)
              const marketStallOrder = paidMarketStallResources.map((r: any): string => r.id);
              
              // Reorder template products to match Market Stall order
              const reorderedTemplateProducts = marketStallOrder
                .map((resourceId: string) => {
                  const resource = resourceMap.get(resourceId) as any;
                  // Find product that matches this resource ID
                  const product = templateProducts.find(
                    (p: Product) =>
                      (typeof p.id === 'string' && p.id === `resource-${resourceId}`) ||
                      (p.whopProductId && resource && resource.whopProductId === p.whopProductId)
                  );
                  return product;
                })
                .filter((p: Product | undefined): p is Product => p !== undefined);
              
              // Add any products that weren't in the Market Stall order
              const remainingProducts = templateProducts.filter(
                (p: Product) => !reorderedTemplateProducts.includes(p)
              );
              const finalReorderedProducts = [...reorderedTemplateProducts, ...remainingProducts];
              
              // Check if order actually changed
              const orderChanged = JSON.stringify(finalReorderedProducts.map((p: Product) => p.id)) !== 
                                  JSON.stringify(templateProducts.map((p: Product) => p.id));
              
              if (orderChanged) {
                console.log('🔄 Updating template product order to match Market Stall order:', {
                  templateId,
                  templateName: template.name,
                  originalCount: templateProducts.length,
                  reorderedCount: finalReorderedProducts.length
                });
                
                // Update template in database with reordered products
                const updatedTemplateData = {
                  ...template.templateData,
                  products: finalReorderedProducts
                };
                
                await updateTemplateWrapper(templateId, {
                  templateData: updatedTemplateData
                });
                
                // Update cached template
                updateCachedTemplates(prev => {
                  const newCache = new Map(prev);
                  const updatedCachedTemplate = {
                    ...template,
                    templateData: updatedTemplateData
                  };
                  newCache.set(templateId, updatedCachedTemplate);
                  return newCache;
                });
                
                // Use reordered products for loading
                templateProducts = finalReorderedProducts;
                console.log('✅ Template product order updated to match Market Stall order');
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to update template product order, proceeding with original order:', error);
          // Continue with original order if update fails
        }
      }
      
      // Check if seasonal discount is active - if not, clean promo data from products
      if (Array.isArray(templateProducts) && templateProducts.length > 0 && typeof templateProducts[0] !== 'string') {
        try {
          // Call API endpoint to check for active seasonal discount
          const response = await apiPost(
            '/api/seasonal-discount/get',
            { experienceId },
            experienceId
          );
          
          let hasActiveSeasonalDiscount = false;
          if (response.ok) {
            const data = await response.json();
            // discountData will be null if no active discount or expired
            hasActiveSeasonalDiscount = data.discountData !== null;
          }
          
          if (!hasActiveSeasonalDiscount) {
            // No active seasonal discount - clean promo data from all products
            console.log('🧹 No active seasonal discount found - cleaning promo data from template products');
            
            let hasPromoData = false;
            const cleanedProducts = templateProducts.map((product: Product) => {
              // Check if product has any promo data
              const hasPromo = product.promoCode || 
                               product.promoCodeId || 
                               product.promoDiscountType || 
                               product.promoDiscountAmount !== undefined ||
                               product.promoLimitQuantity !== undefined ||
                               product.promoQuantityLeft !== undefined ||
                               product.promoShowFireIcon ||
                               product.promoScope ||
                               product.promoDurationType ||
                               product.promoDurationMonths !== undefined;
              
              if (hasPromo) {
                hasPromoData = true;
                // Remove all promo-related fields
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
              return product;
            });
            
            if (hasPromoData) {
              console.log('🧹 Cleaned promo data from products, updating template in database');
              
              // Update template in database with cleaned products
              const updatedTemplateData = {
                ...template.templateData,
                products: cleanedProducts
              };
              
              await updateTemplateWrapper(templateId, {
                templateData: updatedTemplateData
              });
              
              // Update cached template
              updateCachedTemplates(prev => {
                const newCache = new Map(prev);
                const updatedCachedTemplate = {
                  ...template,
                  templateData: updatedTemplateData
                };
                newCache.set(templateId, updatedCachedTemplate);
                return newCache;
              });
              
              // Use cleaned products for loading
              templateProducts = cleanedProducts;
              console.log('✅ Template promo data cleaned and updated in database');
            }
          } else {
            console.log('✅ Active seasonal discount found - keeping promo data in template');
          }
        } catch (error) {
          console.warn('⚠️ Failed to check seasonal discount status, proceeding with original products:', error);
          // Continue with original products if check fails
        }
      }
        
      // Use internal setProducts (template order is now already correct, no reordering needed)
      const setProductsFn = setProducts;
      
      if (Array.isArray(templateProducts) && templateProducts.length > 0) {
        if (typeof templateProducts[0] === 'string') {
          // Legacy format: ResourceLibrary product IDs
          setProductsFn([]);
          setTemplateResourceLibraryProductIds(templateProducts as unknown as string[]);
        } else {
          // New format: Complete frontend product state
          // Filter against Market Stall (always filter for loadTemplate)
          const filteredProducts = await filterTemplateProductsAgainstMarketStall(templateProducts);
          // BATCHED: Apply theme styles in the same operation
          const processedProducts = applyThemeStylesToProducts(
            sanitizeProducts(filteredProducts),
            templateTheme,
            { preserveExisting: true }
          );
          setProductsFn(processedProducts);
          setTemplateResourceLibraryProductIds([]);
        }
      } else {
        setProductsFn([]);
        setTemplateResourceLibraryProductIds([]);
      }
      
      // Load floating assets (handle both old theme-specific and new single state)
      if (template.templateData.floatingAssets && Array.isArray(template.templateData.floatingAssets)) {
        // New format: single floating assets array
        setFloatingAssets(template.templateData.floatingAssets);
      } else if (template.templateData.themeFloatingAssets && template.templateData.themeFloatingAssets[seasonToUse]) {
        // Old format: theme-specific floating assets
        setFloatingAssets(template.templateData.themeFloatingAssets[seasonToUse]);
      } else {
        setFloatingAssets([]);
      }
      
      // IMPORTANT: If this is a custom theme (not in initial themes), add it to allThemes
      // so it can be selected from the dropdown after template is loaded
      const isDefaultTheme = Object.values(initialThemes).some(
        (defaultTheme: LegacyTheme) => defaultTheme.name === templateTheme.name
      );
      
      if (!isDefaultTheme) {
        // This is a custom theme - add it to allThemes with a template-specific key
        const templateThemeKey = `template_${template.id}_${templateTheme.name}`;
        console.log('🎨 Adding custom theme from template to allThemes:', templateThemeKey, templateTheme.name);
        setAllThemes(prev => ({
          ...prev,
          [templateThemeKey]: templateTheme
        }));
      }
      
      // Load promo button styling if available
      if (template.templateData.promoButton) {
        console.log('🎨 Loading promo button styling from template:', template.templateData.promoButton.text);
        setPromoButton(template.templateData.promoButton);
      }

      // Load discount settings if available
      if (template.templateData.discountSettings) {
        setDiscountSettings(template.templateData.discountSettings);
      } else {
        setDiscountSettings(createDefaultDiscountSettings());
      }
      
      // Set WHOP attachment fields if available (theme-specific)
      if (template.templateData.backgroundAttachmentId) {
        setBackgroundAttachmentId(template.templateData.backgroundAttachmentId);
      }
      if (template.templateData.backgroundAttachmentUrl) {
        setBackgroundAttachmentUrl(template.templateData.backgroundAttachmentUrl);
      }
      if (template.templateData.logoAttachmentId) {
        setLogoAttachmentId(template.templateData.logoAttachmentId);
      }
      if (template.templateData.logoAttachmentUrl) {
        setLogoAttachmentUrl(template.templateData.logoAttachmentUrl);
      }
      
      console.log('📂 Template loaded:', template.name, `(${template.templateData.products?.length || 0} products)`);
      
      // Track which template is currently loaded/being edited
      setCurrentlyLoadedTemplateId(template.id);
      
      // Save to cache for instant load next time
      saveLastLoadedTemplateToCache(template);
      
      // Signal that template loading is complete (for snapshot coordination)
      setIsLoadingTemplate(false);
      
      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      setApiError(`Failed to load template: ${(error as Error).message}`);
      // Signal that template loading is complete even on error
      setIsLoadingTemplate(false);
      throw error;
    }
  }, [experienceId, filterTemplateProductsAgainstMarketStall, preloadBackgroundImage, saveLastLoadedTemplateToCache, cachedTemplates, sanitizeProducts, templates, setTemplates, updateCachedTemplates, updateTemplate, checkDiscountStatus, removeProductPromoData, convertDiscountDataToSettings, createDefaultDiscountSettings, apiPost, setDiscountSettings]);
  
  const setLiveTemplateHandler = useCallback(async (templateId: string) => {
    try {
      await setLiveTemplateAction(experienceId, templateId);
      // Find the template and set it as live
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setLiveTemplate(template);
      }
    } catch (error) {
      console.error('Error setting live template:', error);
      setApiError(`Failed to set live template: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId, templates]);
  
  // Product management functions
  const addProduct = useCallback(() => {
    const newId = Date.now();
    const newProduct: Product = {
      id: newId,
      name: 'New Product Draft',
      description: 'Describe your product here.',
      price: 0.00,
      image: `https://placehold.co/200x200/4f46e5/ffffff?text=New+Product`,
      containerAsset: undefined,
    };
    setProducts(prev => [...prev, newProduct]);
  }, []);

  const updateProduct = useCallback((id: number | string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(product =>
        product.id === id ? { ...product, ...updates } : product
    ));
  }, []);

  const deleteProduct = useCallback((id: number | string) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  }, []);
  
  // Background management with preloading to prevent gaps
  const setBackground = useCallback(async (type: 'generated' | 'uploaded', url: string | null) => {
    if (!url) {
      // If URL is null, immediately clear the background
      if (type === 'generated') {
        setGeneratedBackground(null);
      } else {
        setUploadedBackground(null);
      }
      setBackgroundAttachmentUrl(null);
      return;
    }

    // Preload the new image to ensure it's ready before switching
    if (url.startsWith('https://') || url.startsWith('http://')) {
      try {
        console.log('🖼️ Preloading new background image:', url);
        
        // Create a new Image object to preload
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Handle CORS if needed
        
        // Wait for the image to load
        await new Promise((resolve, reject) => {
          img.onload = () => {
            console.log('✅ Background image preloaded successfully');
            resolve(true);
          };
          img.onerror = (error) => {
            console.warn('⚠️ Failed to preload background image, but continuing:', error);
            resolve(true); // Continue even if preload fails
          };
          img.src = url;
        });
        
        console.log('🔄 Switching to preloaded background image');
      } catch (error) {
        console.warn('⚠️ Background preload failed, but continuing:', error);
      }
    }

    // Now update the background state
    if (type === 'generated') {
      setGeneratedBackground(url);
    } else {
      setUploadedBackground(url);
    }
    
    // If this is a WHOP URL, also set the attachment fields
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      // This is likely a WHOP URL, set it as the attachment URL
      setBackgroundAttachmentUrl(url);
    }
  }, []);
  
  // Logo management (already using setLogoAsset from state)
  
  // Text styles management (already using setFixedTextStyles from state)
  
  // Error management
  const setError = useCallback((error: string | null) => {
    setApiError(error);
  }, []);
  
  // WHOP attachment setters are already declared in state (lines 282-285)
  
  // Editor state management
  const [editorState, setEditorState] = useState<EditorState>({
    isEditorView: true, // Default to Edit View when opening store
    isSheetOpen: false,
    isAdminSheetOpen: false, // Assets panel closed by default
    selectedAssetId: null
  });
  
  // Floating asset management (single state for all themes)
  const addFloatingAsset = useCallback((asset: FloatingAsset) => {
    setFloatingAssets(prev => [...prev, asset]);
  }, []);
  
  const updateFloatingAsset = useCallback((id: string, updates: Partial<FloatingAsset>) => {
    setFloatingAssets(prev => prev.map(asset => 
        asset.id === id ? { ...asset, ...updates } : asset
    ));
  }, []);
  
  const deleteFloatingAsset = useCallback((id: string) => {
    setFloatingAssets(prev => prev.filter(asset => asset.id !== id));
  }, []);
  
  // Add Market Stall products to a specific custom theme
  const addMarketStallProductsToCustomTheme = useCallback(async (customThemeKey: string) => {
    try {
      // Get all resources from the Market Stall (Resource Library)
      const response = await fetch(`/api/resources?experienceId=${experienceId}`);
      if (!response.ok) {
        console.log('🛒 No Market Stall products found for custom theme');
        return;
      }
      
      const data = await response.json();
      const allResources = data.data?.resources || [];
      
      // Filter for PAID products only
      const paidResources = allResources.filter((resource: Resource) => 
        resource.category === 'PAID'
      );
      
      if (paidResources.length === 0) {
        console.log('🛒 No PAID products in Market Stall for custom theme');
        return;
      }
      
      // Market Stall placeholder image
      const marketStallPlaceholder = 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
      
      // Convert PAID resources to products with Market Stall placeholders
      const marketStallProducts = paidResources.map((resource: Resource) => ({
        id: `resource-${resource.id}`,
        name: resource.name,
        description: resource.description || '',
        price: parseFloat(resource.price || '0'), // Convert string to number
        image: resource.image || marketStallPlaceholder, // Use Market Stall placeholder if no image
        link: resource.link || '',
        category: resource.category || 'PAID',
        type: resource.type || 'LINK',
        // Add Market Stall placeholders
        placeholder: true,
        marketStallProduct: true
      }));
      
      // Add products to the custom theme
        // Add products to single state (for all themes)
        setProducts(prev => {
          const existingResourceIds = prev
          .filter(p => typeof p.id === 'string' && p.id.startsWith('resource-'))
          .map(p => p.id);
        
          // Only add products that aren't already in the state
        const newProducts = marketStallProducts.filter((product: Product) => 
          !existingResourceIds.includes(product.id)
        );
        
        if (newProducts.length > 0) {
            console.log(`🛒 Added ${newProducts.length} PAID Market Stall products to market stall`);
            return [...prev, ...newProducts];
        }
        
          return prev;
      });
      
    } catch (error) {
      console.error('🛒 Error adding Market Stall products to custom theme:', error);
    }
  }, [experienceId]);
  
  // Theme management
  const addCustomTheme = useCallback(async (theme: LegacyTheme) => {
    try {
      // Check if we can add a custom theme
      if (!canAddCustomTheme()) {
        const error = `Cannot add custom theme: Maximum of ${MAX_CUSTOM_THEMES} custom themes allowed`;
        console.warn('⚠️', error);
        setApiError(error);
        throw new Error(error);
      }
      
      console.log('🎨 Creating custom theme in database:', theme.name);
      
      // Convert LegacyTheme to database Theme format
      const themeData = {
        name: theme.name,
        season: currentSeason, // Use current season
        themePrompt: theme.themePrompt || '',
        accentColor: theme.accent || 'bg-indigo-500',
        ringColor: theme.accent || 'bg-indigo-500',
        placeholderImage: (theme as any).placeholderImage || null, // Save refined placeholder image
        mainHeader: (theme as any).mainHeader || null, // Save AI-generated main header
        subHeader: theme.aiMessage || null // Save AI-generated subheader (aiMessage)
      };
      
      // Save to database
      const newTheme = await createTheme(experienceId, themeData);
      console.log('✅ Custom theme saved to database:', newTheme.id);
      
      // Update local state
      setThemes(prev => [...prev, newTheme]);
      
      // Create a unique key for custom themes using the database theme ID
      const customThemeKey = `db_${newTheme.id}`;
      
      // Add saved metadata from database to the theme object
      const themeWithMetadata = {
        ...theme,
        placeholderImage: newTheme.placeholderImage || (theme as any).placeholderImage || null,
        mainHeader: newTheme.mainHeader || (theme as any).mainHeader || null,
      };
      
      setAllThemes(prev => ({ ...prev, [customThemeKey]: themeWithMetadata }));
      
      // Initialize default text styles for the new custom theme with proper colors
      // Use saved mainHeader from database if available, otherwise use generated or defaults
      const savedMainHeader = newTheme.mainHeader || (theme as any).mainHeader || theme.name.toUpperCase();
      const savedSubHeader = newTheme.subHeader || theme.aiMessage;
      const themeDefaults = getThemeDefaultText(theme.name, savedSubHeader);
      const textColor = getThemeTextColor(theme.welcomeColor);
      // Initialize text styles (single state for all themes)
      setFixedTextStyles({
          mainHeader: {
            content: savedMainHeader, // Use saved mainHeader from database
            color: textColor,
            styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg'
          },
          headerMessage: {
            content: savedMainHeader, // Use same as mainHeader for headerMessage
            color: textColor,
            styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
          },
          subHeader: {
            content: savedSubHeader || themeDefaults.subHeader, // Use saved subheader from database
            color: textColor,
            styleClass: 'text-lg sm:text-xl font-normal'
          },
          promoMessage: {
            content: themeDefaults.promoMessage,
            color: textColor,
            styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md'
          }
      });
      
      // Add Market Stall products to the new custom theme
      console.log('🛒 Adding Market Stall products to new custom theme:', customThemeKey);
      await addMarketStallProductsToCustomTheme(customThemeKey);
      
      return newTheme;
    } catch (error) {
      console.error('❌ Failed to save custom theme to database:', error);
      setApiError(`Failed to save custom theme: ${(error as Error).message}`);
      
      // Still update local state even if database save fails (only if it's not a limit error)
      if (!(error as Error).message.includes('Maximum of')) {
        // Create a unique key for custom themes to avoid conflicts with default themes
        const customThemeKey = `custom_${theme.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
        setAllThemes(prev => ({ ...prev, [customThemeKey]: theme }));
        
        // Initialize default text styles for the new custom theme with proper colors (fallback)
        // Use generated mainHeader from API if available, otherwise use theme defaults
        const generatedMainHeader = (theme as any).mainHeader || theme.name.toUpperCase();
        const themeDefaults = getThemeDefaultText(theme.name, theme.aiMessage);
        const textColor = getThemeTextColor(theme.welcomeColor);
        // Initialize text styles (single state for all themes)
        setFixedTextStyles({
            mainHeader: {
              content: generatedMainHeader, // Use AI-generated mainHeader
              color: textColor,
              styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg'
            },
            headerMessage: {
              content: generatedMainHeader, // Use same as mainHeader for headerMessage
              color: textColor,
              styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
            },
            subHeader: {
              content: theme.aiMessage || themeDefaults.subHeader, // Use AI-generated subheader
              color: textColor,
              styleClass: 'text-lg sm:text-xl font-normal'
            },
            promoMessage: {
              content: themeDefaults.promoMessage,
              color: textColor,
              styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md'
            }
        });
        
        // Still add Market Stall products even if database save fails
        console.log('🛒 Adding Market Stall products to custom theme (fallback):', customThemeKey);
        await addMarketStallProductsToCustomTheme(customThemeKey);
      }
      throw error;
    }
  }, [experienceId, currentSeason, createTheme, setApiError, canAddCustomTheme, addMarketStallProductsToCustomTheme, getThemeTextColor, setFixedTextStyles, setAllThemes]);
  
  // Editor controls
  const toggleEditorView = useCallback(() => {
    setEditorState(prev => ({ ...prev, isEditorView: !prev.isEditorView }));
  }, []);
  
  const toggleSheet = useCallback(() => {
    setEditorState(prev => ({ ...prev, isSheetOpen: !prev.isSheetOpen }));
  }, []);
  
  const toggleAdminSheet = useCallback(() => {
    setEditorState(prev => ({ ...prev, isAdminSheetOpen: !prev.isAdminSheetOpen }));
  }, []);
  
  const setSelectedAsset = useCallback((id: string | null) => {
    setEditorState(prev => ({ ...prev, selectedAssetId: id }));
  }, []);
  
  // Loading state management
  const setTextLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({ ...prev, isTextLoading: loading }));
  }, []);
  
  const setImageLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({ ...prev, isImageLoading: loading }));
  }, []);
  
  const setUploadingImage = useCallback((loading: boolean) => {
    setLoadingState(prev => ({ ...prev, isUploadingImage: loading }));
  }, []);
  
  const setGeneratingImage = useCallback((loading: boolean) => {
    setLoadingState(prev => ({ ...prev, isGeneratingImage: loading }));
  }, []);
  
  // Template management
  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteTemplateAction(experienceId, templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      // Clear cache if the deleted template was cached
      const cachedTemplate = loadLastLoadedTemplateFromCache();
      if (cachedTemplate && cachedTemplate.id === templateId) {
        clearLastLoadedTemplateFromCache();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setApiError(`Failed to delete template: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId, loadLastLoadedTemplateFromCache, clearLastLoadedTemplateFromCache, sanitizeProducts]);

  // Store Navigation State Management
  const saveLastActiveTheme = useCallback((theme: string) => {
    setLastActiveTheme(theme);
    console.log(`💾 Saved last active theme: ${theme}`);
  }, []);
  
  
  return {
    // Core state
    allThemes,
    setAllThemes,
    currentSeason,
    setCurrentSeason: handleSetCurrentSeason,
    availableAssets,
    setAvailableAssets,
    
    // Market Stall State (single state for all themes)
    fixedTextStyles: mergedFixedTextStyles,
    setFixedTextStyles,
    logoAsset,
    setLogoAsset,
    generatedBackground,
    uploadedBackground,
    setBackground,
    backgroundAttachmentId,
    backgroundAttachmentUrl,
    setBackgroundAttachmentId,
    setBackgroundAttachmentUrl,
    logoAttachmentId,
    logoAttachmentUrl,
    setLogoAttachmentId,
    setLogoAttachmentUrl,
    discountSettings,
    setDiscountSettings,
    products,
    setProducts,
    floatingAssets,
    setFloatingAssets,
    theme,
    
    // Database state
    templates,
    themes,
    liveTemplate,
    lastEditedTemplate,
    currentlyLoadedTemplateId,
    
    // Loading and error states
    loadingState,
    setLoadingState,
    apiError,
    setError,
    
    // Theme management
    createTheme: createThemeHandler,
    updateTheme: updateThemeHandler,
    
    // Template management
    saveTemplate,
    loadTemplate,
    setLiveTemplate: setLiveTemplateHandler,
    
    // Product management
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Editor state
    editorState,
    
    // Floating asset management
    addFloatingAsset,
    updateFloatingAsset,
    deleteFloatingAsset,
    
    // Theme management
    addCustomTheme,
    
    // Editor controls
    toggleEditorView,
    toggleSheet,
    toggleAdminSheet,
    setSelectedAsset,
    
    // Loading state management
    setTextLoading,
    setImageLoading,
    setUploadingImage,
    setGeneratingImage,
    
    // Promo button management
    promoButton,
    setPromoButton,
    
    // Template management
    updateTemplate: updateTemplateWrapper,
    deleteTemplate,
    setTemplates,
    updateCachedTemplates,
    
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
    isStoreContentReady, // Derived state - true when text content is actually loaded
    isLoadingTemplate,
    hasTemplatesInCache: cachedTemplates.size > 0 || templates.length > 0,
    
    // Store Navigation State Management
    lastActiveTheme,
    saveLastActiveTheme,
    
    // Theme loading
    loadThemes,
    
    // Origin template
    originTemplate,
    loadOriginTemplate,
  };
};
