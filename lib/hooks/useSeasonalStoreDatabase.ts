
import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Product, 
  FloatingAsset, 
  Theme, 
  LegacyTheme,
  FixedTextStyles, 
  LogoAsset, 
  EditorState, 
  LoadingState,
  StoreTemplate 
} from '@/lib/components/store/SeasonalStore/types';
import { 
  initialThemes, 
  defaultLogo 
} from '@/lib/components/store/SeasonalStore/services/constants';
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
import type { Resource } from '@/lib/types/resource';

export const useSeasonalStoreDatabase = (experienceId: string) => {
  // Constants for limits
  const MAX_CUSTOM_THEMES = 10;
  const MAX_CUSTOM_TEMPLATES = 10;
  
  
  // Core State
  const [allThemes, setAllThemes] = useState<Record<string, LegacyTheme>>(initialThemes);
  const [currentSeason, setCurrentSeason] = useState<string>('Fall');
  
  // Store Navigation State (persists across view switches)
  const [lastActiveTheme, setLastActiveTheme] = useState<string>('Fall');
  const [lastActiveTemplate, setLastActiveTemplate] = useState<StoreTemplate | null>(null);
  
  // Theme-Specific State
  const [themeTextStyles, setThemeTextStyles] = useState<Record<string, FixedTextStyles>>({});
  const [themeLogos, setThemeLogos] = useState<Record<string, LogoAsset | null>>({});
  const [themeGeneratedBackgrounds, setThemeGeneratedBackgrounds] = useState<Record<string, string | null>>({});
  const [themeUploadedBackgrounds, setThemeUploadedBackgrounds] = useState<Record<string, string | null>>({});
  const [themeProducts, setThemeProducts] = useState<Record<string, Product[]>>({});
  const [themeFloatingAssets, setThemeFloatingAssets] = useState<Record<string, FloatingAsset[]>>({});
  const [availableAssets, setAvailableAssets] = useState<FloatingAsset[]>([]);
  
  // Database State
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [liveTemplate, setLiveTemplate] = useState<StoreTemplate | null>(null);
  const [lastEditedTemplate, setLastEditedTemplate] = useState<StoreTemplate | null>(null);
  
  // Template Cache - stores ALL templates with preloaded backgrounds for instant switching
  // Persisted to localStorage so it's shared across component instances (SeasonalStore <-> StorePreview)
  const getTemplateCacheKey = useCallback(() => {
    return `templateCache_${experienceId}`;
  }, [experienceId]);
  
  const getBackgroundsPreloadedKey = useCallback(() => {
    return `templateBackgroundsPreloaded_${experienceId}`;
  }, [experienceId]);
  
  // Initialize cached templates from localStorage on mount
  const [cachedTemplates, setCachedTemplates] = useState<Map<string, StoreTemplate>>(() => {
    try {
      const key = `templateCache_${experienceId}`;
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
      const templatesArray = Array.from(templates.values());
      localStorage.setItem(key, JSON.stringify(templatesArray));
      console.log(`💾 Saved ${templates.size} templates to localStorage cache`);
    } catch (error) {
      console.error('Error saving cached templates to localStorage:', error);
    }
  }, [getTemplateCacheKey]);
  
  // Wrapper for setCachedTemplates that also saves to localStorage
  const updateCachedTemplates = useCallback((templates: Map<string, StoreTemplate>) => {
    setCachedTemplates(templates);
    saveCachedTemplatesToLocalStorage(templates);
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
  
  // Track when initial data loading is complete
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Track when store content is ready (template or auto-add complete)
  const [isStoreContentReady, setIsStoreContentReady] = useState(false);
  
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
        console.log('💾 Loaded last loaded template from localStorage:', template.name, template.id);
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
  
  // Helper function to convert Tailwind color classes to hex values
  const getThemeTextColor = (welcomeColor: string | undefined): string => {
    if (!welcomeColor) return '#FFFFFF';
    
    // Map Tailwind color classes to hex values
    const colorMap: Record<string, string> = {
      'text-blue-200': '#BFDBFE',      // Winter
      'text-yellow-100': '#FEF3C7',    // Summer  
      'text-orange-100': '#FFEDD5',    // Fall
      'text-red-200': '#FECACA',        // Holiday
      'text-pink-100': '#FCE7F3',      // Spring
      'text-purple-400': '#C084FC',    // Cyber
      'text-orange-200': '#FED7AA',     // Spooky
      'text-cyan-300': '#67E8F9',      // Cyber Sale
      'text-green-200': '#BBF7D0',     // Spring
    };
    
    return colorMap[welcomeColor] || '#FFFFFF';
  };
  
  // Helper function to check if we can add a custom theme
  const canAddCustomTheme = useCallback(() => {
    const defaultThemeNames = ['Winter Frost', 'Summer Sun', 'Autumn Harvest', 'Holiday Cheer', 'Spring Renewal', 'Cyber Monday', 'Halloween Spooky'];
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
  const defaultTextStyles = {
    mainHeader: { 
      content: 'THE SEASONAL VAULT', 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg' 
    },
    headerMessage: { 
      content: 'THE SEASONAL VAULT', 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg' 
    },
    subHeader: { 
      content: allThemes[currentSeason]?.aiMessage || allThemes['Fall']?.aiMessage || 'Discover exclusive seasonal products', 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-lg sm:text-xl font-normal' 
    },
    promoMessage: { 
      content: '', 
      color: getThemeTextColor(allThemes[currentSeason]?.welcomeColor), 
      styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md' 
    }
  };

  // Merge theme-specific styles with defaults to ensure all fields are present
  const fixedTextStyles = {
    ...defaultTextStyles,
    ...themeTextStyles[currentSeason]
  };
  
  const logoAsset = themeLogos[currentSeason] || defaultLogo;
  const generatedBackground = themeGeneratedBackgrounds[currentSeason] || null;
  const uploadedBackground = themeUploadedBackgrounds[currentSeason] || null;
  
  // WHOP attachment support (theme-specific)
  const [themeBackgroundAttachmentIds, setThemeBackgroundAttachmentIds] = useState<Record<string, string | null>>({});
  const [themeBackgroundAttachmentUrls, setThemeBackgroundAttachmentUrls] = useState<Record<string, string | null>>({});
  const [themeLogoAttachmentIds, setThemeLogoAttachmentIds] = useState<Record<string, string | null>>({});
  const [themeLogoAttachmentUrls, setThemeLogoAttachmentUrls] = useState<Record<string, string | null>>({});
  
  // Current theme's attachment URLs (computed from theme-specific state)
  const backgroundAttachmentId = themeBackgroundAttachmentIds[currentSeason] || null;
  const backgroundAttachmentUrl = themeBackgroundAttachmentUrls[currentSeason] || null;
  const logoAttachmentId = themeLogoAttachmentIds[currentSeason] || null;
  const logoAttachmentUrl = themeLogoAttachmentUrls[currentSeason] || null;
  
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
  
  // Products for current theme - only use products loaded from database
  const products = themeProducts[currentSeason] || [];
  
  // Floating assets for current theme
  const floatingAssets = themeFloatingAssets[currentSeason] || [];
  
  // Wrapper for setCurrentSeason that clears template theme when switching to global themes
  const handleSetCurrentSeason = useCallback((season: string) => {
    setCurrentSeason(season);
    // Clear template theme when switching to a global theme
    setCurrentTemplateTheme(null);
    // Reset manual template flag when switching themes
    setHasManuallyLoadedTemplate(false);
  }, []);
  
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
    return {
      name: templateTheme.name,
      themePrompt: templateTheme.themePrompt,
      accent: templateTheme.accentColor || templateTheme.accent || 'bg-indigo-500 hover:bg-indigo-600 text-white ring-indigo-400',
      card: templateTheme.card || 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30',
      text: templateTheme.text || 'text-gray-800',
      welcomeColor: templateTheme.welcomeColor || 'text-yellow-300',
      background: templateTheme.background || 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
      backgroundImage: templateTheme.backgroundImage || null,
      aiMessage: templateTheme.aiMessage || 'Discover exclusive seasonal products',
      emojiTip: templateTheme.emojiTip || '🎁'
    };
  };
  
  // Load themes from database
  const loadThemes = useCallback(async () => {
    try {
      const themesList = await getThemes(experienceId);
      setThemes(themesList);
      
      // Convert to legacy theme map and merge with initial themes
      const themesMap: Record<string, LegacyTheme> = { ...initialThemes }; // Start with initial themes
      themesList.forEach(theme => {
        // Use unique key for database themes to avoid overriding default themes
        const dbThemeKey = `db_${theme.id}`;
        themesMap[dbThemeKey] = convertThemeToLegacy(theme);
      });
      setAllThemes(themesMap);
    } catch (error) {
      console.error('Error loading themes:', error);
      // Don't set error for authentication issues, just log them
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        console.log('Authentication required for database operations - using initial themes');
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
      console.log('🖼️ Preloading background image:', url);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          console.log('✅ Background image preloaded successfully');
          resolve();
        };
        img.onerror = () => {
          console.warn('⚠️ Failed to preload background image, but continuing');
          resolve(); // Continue even if preload fails
        };
        img.src = url;
      });
    } catch (error) {
      console.warn('⚠️ Background preload failed, but continuing:', error);
    }
  }, []);
  
  // Function to cache all templates and preload all backgrounds for instant switching
  // NOTE: Declared here before loadTemplates to avoid hoisting issues
  const cacheAllTemplatesAndPreloadBackgrounds = useCallback(async (templatesList: StoreTemplate[]) => {
    if (templateBackgroundsPreloaded || templatesList.length === 0) {
      console.log('🔄 Templates already cached and backgrounds preloaded, skipping...');
      return;
    }
    
    console.log(`🔄 Caching ${templatesList.length} templates and preloading all backgrounds...`);
    
    // Create a new Map for cached templates
    const newCache = new Map<string, StoreTemplate>();
    
    // Cache all templates
    templatesList.forEach(template => {
      newCache.set(template.id, template);
    });
    
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
      setTemplates(templatesList);
      
      // Also cache templates when they're loaded (if not already cached)
      if (templatesList.length > 0 && !templateBackgroundsPreloaded) {
        // Cache and preload in background (non-blocking)
        cacheAllTemplatesAndPreloadBackgrounds(templatesList).catch(err => {
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
  }, [experienceId, templateBackgroundsPreloaded, cacheAllTemplatesAndPreloadBackgrounds]);
  
  // CRITICAL: Filter template products to ONLY include ones that exist in Market Stall
  // Applies template product design (buttons, colors, images, etc.) to matching Market Stall products
  const filterTemplateProductsAgainstMarketStall = useCallback(async (
    templateProducts: Product[],
    currentSeason: string
  ): Promise<Product[]> => {
    try {
      // Fetch Market Stall resources to check against
      const response = await fetch(`/api/resources?experienceId=${experienceId}`);
      if (!response.ok) {
        console.log('🎨 [Template Filter] No Market Stall resources found - skipping template product filtering');
        return [];
      }
      
      const data = await response.json();
      const marketStallResources = data.data?.resources || [];
      
      // COMPREHENSIVE DEBUG: Show all Market Stall resources
      console.log(`🎨 [Template Filter] ===== MARKET STALL RESOURCES ANALYSIS =====`);
      console.log(`🎨 [Template Filter] Total Market Stall resources: ${marketStallResources.length}`);
      const marketStallDetail = marketStallResources.map((r: Resource) => ({
        id: r.id,
        name: r.name,
        whopProductId: r.whopProductId || '(none)',
        category: r.category,
        type: r.type
      }));
      console.log(`🎨 [Template Filter] Market Stall resources detail:`, marketStallDetail);
      console.log(`🎨 [Template Filter] Market Stall resource IDs only:`, marketStallResources.map((r: Resource) => r.id));
      console.log(`🎨 [Template Filter] Market Stall whopProductIds:`, marketStallResources.map((r: Resource) => r.whopProductId || '(none)'));
      console.log(`🎨 [Template Filter] Market Stall names and IDs mapping:`, marketStallDetail.map((r: typeof marketStallDetail[0]) => `${r.name} → ID: ${r.id}, WhopID: ${r.whopProductId}`));
      
      // COMPREHENSIVE DEBUG: Show all template products
      console.log(`🎨 [Template Filter] ===== TEMPLATE PRODUCTS ANALYSIS =====`);
      console.log(`🎨 [Template Filter] Total template products: ${templateProducts.length}`);
      const templateProductsDetail = templateProducts.map((tp: Product) => ({
        id: tp.id,
        name: tp.name,
        whopProductId: tp.whopProductId || '(none)',
        idType: typeof tp.id,
        idStartsWithResource: typeof tp.id === 'string' && tp.id.startsWith('resource-'),
        extractedResourceId: typeof tp.id === 'string' && tp.id.startsWith('resource-') ? tp.id.replace('resource-', '') : '(not a resource ID)'
      }));
      console.log(`🎨 [Template Filter] Template products detail:`, templateProductsDetail);
      console.log(`🎨 [Template Filter] Template product IDs only:`, templateProducts.map((tp: Product) => tp.id));
      console.log(`🎨 [Template Filter] Template extracted resource IDs:`, templateProducts.map((tp: Product) => 
        typeof tp.id === 'string' && tp.id.startsWith('resource-') ? tp.id.replace('resource-', '') : null
      ).filter(id => id !== null));
      console.log(`🎨 [Template Filter] Template whopProductIds:`, templateProducts.map((tp: Product) => tp.whopProductId || '(none)'));
      console.log(`🎨 [Template Filter] Template names and IDs mapping:`, templateProductsDetail.map(tp => `${tp.name} → ID: ${tp.id}, Extracted Resource ID: ${tp.extractedResourceId}, WhopID: ${tp.whopProductId}`));
      
      console.log(`🎨 [Template Filter] Checking ${templateProducts.length} template products against ${marketStallResources.length} Market Stall resources`);
      
      const filteredProducts: Product[] = [];
      const skippedProducts: string[] = [];
      
      for (const templateProduct of templateProducts) {
        let matchedResource: Resource | null = null;
        
        // DEBUG: Log template product details
        console.log(`🎨 [Template Filter] Checking template product:`, {
          id: templateProduct.id,
          name: templateProduct.name,
          whopProductId: templateProduct.whopProductId,
          idType: typeof templateProduct.id,
          idStartsWithResource: typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-')
        });
        
        // Strategy 1: Match by whopProductId (for synced Whop products)
        if (templateProduct.whopProductId) {
          matchedResource = marketStallResources.find((resource: Resource) => 
            resource.whopProductId === templateProduct.whopProductId
          );
          
          if (matchedResource) {
            console.log(`✅ [Template Filter] Matched "${templateProduct.name}" by whopProductId: ${templateProduct.whopProductId}`);
          } else {
            console.log(`⚠️ [Template Filter] No match by whopProductId "${templateProduct.whopProductId}" for "${templateProduct.name}"`);
          }
        }
        
        // Strategy 2: Match by resource ID (if product.id starts with "resource-")
        if (!matchedResource && typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-')) {
          const resourceId = templateProduct.id.replace('resource-', '');
          console.log(`🎨 [Template Filter] Trying to match by resource ID: "${resourceId}"`);
          
          // DEBUG: Log available resource IDs
          console.log(`🎨 [Template Filter] Available Market Stall resource IDs:`, marketStallResources.map((r: Resource) => r.id));
          
          matchedResource = marketStallResources.find((resource: Resource) => 
            resource.id === resourceId
          );
          
          if (matchedResource) {
            console.log(`✅ [Template Filter] Matched "${templateProduct.name}" by resource ID: ${resourceId}`);
          } else {
            console.log(`⚠️ [Template Filter] No match by resource ID "${resourceId}" for "${templateProduct.name}"`);
          }
        }
        
        // Strategy 3: Match by exact name (fallback when resource ID changed but product still exists in Market Stall)
        // Only match if:
        // 1. Resource ID and whopProductId matching failed
        // 2. Exact name match (case-insensitive, trimmed)
        // 3. This handles cases where products were recreated with new IDs but same name
        if (!matchedResource && templateProduct.name) {
          const normalizedTemplateName = templateProduct.name.toLowerCase().trim();
          
          // Find exact name match
          matchedResource = marketStallResources.find((resource: Resource) => {
            if (!resource.name) return false;
            const normalizedResourceName = resource.name.toLowerCase().trim();
            return normalizedResourceName === normalizedTemplateName;
          });
          
          if (matchedResource) {
            console.log(`✅ [Template Filter] Matched "${templateProduct.name}" by exact name (resource ID changed: ${typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-') ? templateProduct.id.replace('resource-', '') : 'N/A'} → ${matchedResource.id})`);
          } else {
            console.log(`⚠️ [Template Filter] No exact name match for "${templateProduct.name}"`);
          }
        }
        
        // Only match products that exist in Market Stall by exact ID, whopProductId, or exact name
        if (matchedResource) {
          // Product exists in Market Stall - keep it with template design applied
          const mergedProduct: Product = {
            // Use template data first, fallback to Market Stall resource data
            id: `resource-${matchedResource.id}`,
            name: templateProduct.name || matchedResource.name, // Prefer template name, fallback to Market Stall
            description: templateProduct.description || matchedResource.description || '', // Prefer template description, fallback to Market Stall
            price: templateProduct.price !== undefined && templateProduct.price !== null ? templateProduct.price : parseFloat(matchedResource.price || '0'), // Prefer template price, fallback to Market Stall
            buttonLink: templateProduct.buttonLink || matchedResource.link || '', // Prefer template link, fallback to Market Stall
            whopProductId: matchedResource.whopProductId, // Keep Market Stall whopProductId for syncing
            
            // Apply template product design/styling
            cardClass: templateProduct.cardClass, // Template design
            buttonClass: templateProduct.buttonClass, // Template button styling
            buttonText: templateProduct.buttonText || 'VIEW DETAILS', // Template button text
            buttonAnimColor: templateProduct.buttonAnimColor, // Template button animation
            titleClass: templateProduct.titleClass, // Template title styling
            descClass: templateProduct.descClass, // Template description styling
            
            // Use template image if available, otherwise Market Stall image
            image: templateProduct.image || templateProduct.imageAttachmentUrl || matchedResource.image || '',
            imageAttachmentId: templateProduct.imageAttachmentId || null,
            imageAttachmentUrl: templateProduct.imageAttachmentUrl || templateProduct.image || matchedResource.image || null,
            
            // Keep template container asset if available
            containerAsset: templateProduct.containerAsset,
          };
          
          filteredProducts.push(mergedProduct);
          console.log(`✅ [Template Filter] Keeping "${templateProduct.name}" with template design applied`);
        } else {
          // Product doesn't exist in Market Stall - skip it
          skippedProducts.push(templateProduct.name || 'Unknown');
          console.log(`❌ [Template Filter] Skipping "${templateProduct.name}" - not found in Market Stall`);
        }
      }
      
      // FINAL SUMMARY: Show match results
      console.log(`🎨 [Template Filter] ===== MATCH RESULTS SUMMARY =====`);
      console.log(`🎨 [Template Filter] Total matches: ${filteredProducts.length} / ${templateProducts.length}`);
      console.log(`🎨 [Template Filter] Total skipped: ${skippedProducts.length} / ${templateProducts.length}`);
      
      // Show matched products
      if (filteredProducts.length > 0) {
        console.log(`🎨 [Template Filter] ✅ MATCHED PRODUCTS:`, filteredProducts.map(p => {
          const pResourceId = typeof p.id === 'string' && p.id.startsWith('resource-') ? p.id.replace('resource-', '') : null;
          return {
            originalName: templateProducts.find(tp => {
              const tpResourceId = typeof tp.id === 'string' && tp.id.startsWith('resource-') ? tp.id.replace('resource-', '') : null;
              return tpResourceId === pResourceId || tp.whopProductId === p.whopProductId;
            })?.name || 'Unknown',
            marketStallName: p.name,
            resourceId: pResourceId || '(not a resource ID)',
            whopProductId: p.whopProductId || '(none)'
          };
        }));
      }
      
      // Show skipped products with reason
      if (skippedProducts.length > 0) {
        console.log(`🎨 [Template Filter] ❌ SKIPPED PRODUCTS:`, skippedProducts.map(productName => {
          const templateProduct = templateProducts.find(tp => tp.name === productName);
          if (!templateProduct) return { name: productName, reason: 'Product not found in template array' };
          
          const templateResourceId = typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-') 
            ? templateProduct.id.replace('resource-', '') 
            : null;
          
          const marketStallHasId = templateResourceId ? marketStallResources.some((r: Resource) => r.id === templateResourceId) : false;
          const marketStallHasWhopId = templateProduct.whopProductId 
            ? marketStallResources.some((r: Resource) => r.whopProductId === templateProduct.whopProductId) 
            : false;
          
          let reason = 'Not found in Market Stall';
          if (templateResourceId && !marketStallHasId) {
            reason = `Resource ID "${templateResourceId}" not found in Market Stall`;
          } else if (templateProduct.whopProductId && !marketStallHasWhopId) {
            reason = `WhopProductId "${templateProduct.whopProductId}" not found in Market Stall`;
          } else if (!templateResourceId && !templateProduct.whopProductId) {
            reason = 'No resource ID or whopProductId in template product';
          }
          
          return {
            name: productName,
            templateId: templateProduct.id,
            templateResourceId: templateResourceId || '(none)',
            templateWhopProductId: templateProduct.whopProductId || '(none)',
            reason: reason
          };
        }));
      }
      
      // ID COMPARISON TABLE
      console.log(`🎨 [Template Filter] ===== ID COMPARISON TABLE =====`);
      const templateResourceIds = templateProducts
        .map(tp => typeof tp.id === 'string' && tp.id.startsWith('resource-') ? tp.id.replace('resource-', '') : null)
        .filter((id): id is string => id !== null);
      const marketStallIds = marketStallResources.map((r: Resource) => r.id);
      
      console.log(`🎨 [Template Filter] Template Resource IDs (${templateResourceIds.length}):`, templateResourceIds);
      console.log(`🎨 [Template Filter] Market Stall Resource IDs (${marketStallIds.length}):`, marketStallIds);
      
      const missingInMarketStall = templateResourceIds.filter((id: string) => !marketStallIds.includes(id));
      const missingInTemplate = marketStallIds.filter((id: string) => !templateResourceIds.includes(id));
      
      if (missingInMarketStall.length > 0) {
        console.log(`🎨 [Template Filter] ⚠️ Template Resource IDs NOT in Market Stall:`, missingInMarketStall);
      }
      if (missingInTemplate.length > 0) {
        console.log(`🎨 [Template Filter] ℹ️ Market Stall Resource IDs NOT in Template:`, missingInTemplate);
      }
      
      // WhopProductId comparison
      const templateWhopIds = templateProducts.map(tp => tp.whopProductId).filter((id: string | undefined): id is string => !!id);
      const marketStallWhopIds = marketStallResources.map((r: Resource) => r.whopProductId).filter((id: string | undefined): id is string => !!id);
      
      console.log(`🎨 [Template Filter] Template whopProductIds (${templateWhopIds.length}):`, templateWhopIds);
      console.log(`🎨 [Template Filter] Market Stall whopProductIds (${marketStallWhopIds.length}):`, marketStallWhopIds);
      
      const missingWhopInMarketStall = templateWhopIds.filter((id: string) => !marketStallWhopIds.includes(id));
      const missingWhopInTemplate = marketStallWhopIds.filter((id: string) => !templateWhopIds.includes(id));
      
      if (missingWhopInMarketStall.length > 0) {
        console.log(`🎨 [Template Filter] ⚠️ Template whopProductIds NOT in Market Stall:`, missingWhopInMarketStall);
      }
      if (missingWhopInTemplate.length > 0) {
        console.log(`🎨 [Template Filter] ℹ️ Market Stall whopProductIds NOT in Template:`, missingWhopInTemplate);
      }
      
      console.log(`🎨 [Template Filter] ===== END ANALYSIS =====`);
      
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
        console.log('🛒 No Market Stall products found or error fetching Market Stall resources');
        return;
      }
      
      const data = await response.json();
      // IMPORTANT: These are Market Stall (global ResourceLibrary) products only
      const marketStallResources = data.data?.resources || [];
      
      // Filter for PAID Market Stall products only
      const paidMarketStallResources = marketStallResources.filter((resource: Resource) => 
        resource.category === 'PAID'
      );
      
      if (paidMarketStallResources.length === 0) {
        console.log('🛒 No PAID products in Market Stall to add');
        return;
      }
      
      console.log(`🛒 Found ${paidMarketStallResources.length} PAID Market Stall products`);
      
      // Get all available seasons/themes (including custom themes)
      const defaultSeasons = Object.keys(initialThemes);
      const customThemeKeys = Object.keys(allThemes).filter(key => key.startsWith('custom_'));
      const allThemeKeys = [...defaultSeasons, ...customThemeKeys];
      
      console.log(`🛒 Found ${defaultSeasons.length} default themes and ${customThemeKeys.length} custom themes`);
      
      // Market Stall placeholder image
      const marketStallPlaceholder = 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
      
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
        type: resource.type || 'MY_PRODUCTS',
        // Add Market Stall placeholders
        placeholder: true,
        marketStallProduct: true
      }));
      
      // Add products to all themes (default + custom)
      setThemeProducts(prev => {
        const updated = { ...prev };
        let hasChanges = false;
        
        allThemeKeys.forEach(themeKey => {
          const existingProducts = updated[themeKey] || [];
          const existingResourceIds = existingProducts
            .filter(p => typeof p.id === 'string' && p.id.startsWith('resource-'))
            .map(p => p.id);
          
          // Only add products that aren't already in this theme
          const newProducts = marketStallProducts.filter((product: Product) => 
            !existingResourceIds.includes(product.id)
          );
          
          if (newProducts.length > 0) {
            updated[themeKey] = [...existingProducts, ...newProducts];
            const themeType = themeKey.startsWith('custom_') ? 'custom theme' : 'theme';
            console.log(`🛒 Added ${newProducts.length} PAID Market Stall products to ${themeType}: ${themeKey}`);
            hasChanges = true;
          }
        });
        
        // Only return updated state if there were actual changes to prevent infinite loops
        return hasChanges ? updated : prev;
      });
      
      console.log('🛒 Successfully added all PAID Market Stall (ResourceLibrary) products to all themes');
      
    } catch (error) {
      console.error('🛒 Error auto-adding Market Stall products:', error);
    }
  }, [experienceId]);
  
  // Helper function to apply template data to state (used for both cached and DB-loaded templates)
  const applyTemplateDataToState = useCallback(async (template: StoreTemplate, skipProductFiltering = false, isCached = false) => {
    setCurrentSeason(template.currentSeason);
    setThemeTextStyles(template.templateData.themeTextStyles);
    setThemeLogos(template.templateData.themeLogos);
    
    // CRITICAL: Preload background image BEFORE setting state to prevent gaps
    // Skip preloading if template is cached (backgrounds already preloaded)
    const backgroundUrl = template.templateData.backgroundAttachmentUrl || 
                         template.templateData.themeUploadedBackgrounds?.[template.currentSeason] || 
                         template.templateData.themeGeneratedBackgrounds?.[template.currentSeason] ||
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
      const isGenerated = !!(template.templateData.themeGeneratedBackgrounds?.[template.currentSeason] || template.templateData.generatedBackground);
      if (isGenerated) {
        setThemeGeneratedBackgrounds(template.templateData.themeGeneratedBackgrounds || {});
      } else {
        setThemeUploadedBackgrounds(template.templateData.themeUploadedBackgrounds || {});
      }
    } else {
      // Set backgrounds (might be null/empty, but that's fine)
      setThemeGeneratedBackgrounds(template.templateData.themeGeneratedBackgrounds || {});
      setThemeUploadedBackgrounds(template.templateData.themeUploadedBackgrounds || {});
    }
    
    // Set WHOP attachment fields if available (theme-specific)
    if (template.templateData.backgroundAttachmentId) {
      setThemeBackgroundAttachmentIds(prev => ({
        ...prev,
        [template.currentSeason]: template.templateData.backgroundAttachmentId || null
      }));
    }
    if (template.templateData.backgroundAttachmentUrl) {
      setThemeBackgroundAttachmentUrls(prev => ({
        ...prev,
        [template.currentSeason]: template.templateData.backgroundAttachmentUrl || null
      }));
    }
    if (template.templateData.logoAttachmentId) {
      setThemeLogoAttachmentIds(prev => ({
        ...prev,
        [template.currentSeason]: template.templateData.logoAttachmentId || null
      }));
    }
    if (template.templateData.logoAttachmentUrl) {
      setThemeLogoAttachmentUrls(prev => ({
        ...prev,
        [template.currentSeason]: template.templateData.logoAttachmentUrl || null
      }));
    }
    
    // Handle template products
    if (skipProductFiltering) {
      // For cached templates, use products directly (they've already been filtered when saved)
      if (template.templateData.themeProducts && template.templateData.themeProducts[template.currentSeason]) {
        const templateProducts = template.templateData.themeProducts[template.currentSeason];
        if (Array.isArray(templateProducts) && templateProducts.length > 0) {
          if (typeof templateProducts[0] === 'string') {
            // Legacy format: ResourceLibrary product IDs
            setThemeProducts(prev => ({ ...prev, [template.currentSeason]: [] }));
            setTemplateResourceLibraryProductIds(templateProducts as unknown as string[]);
          } else {
            // New format: Complete frontend product state
            setThemeProducts(prev => ({ ...prev, [template.currentSeason]: templateProducts }));
            setTemplateResourceLibraryProductIds([]);
          }
        } else {
          setThemeProducts(prev => ({ ...prev, [template.currentSeason]: [] }));
          setTemplateResourceLibraryProductIds([]);
        }
      } else {
        setThemeProducts(prev => ({ ...prev, ...(template.templateData.themeProducts || {}) }));
        setTemplateResourceLibraryProductIds([]);
      }
    } else {
      // For DB-loaded templates, filter against Market Stall
      if (template.templateData.themeProducts && template.templateData.themeProducts[template.currentSeason]) {
        const templateProducts = template.templateData.themeProducts[template.currentSeason];
        if (Array.isArray(templateProducts) && templateProducts.length > 0) {
          if (typeof templateProducts[0] === 'string') {
            // Legacy format: ResourceLibrary product IDs
            setThemeProducts(prev => ({ ...prev, [template.currentSeason]: [] }));
            setTemplateResourceLibraryProductIds(templateProducts as unknown as string[]);
          } else {
            // New format: Filter against Market Stall
            const filteredProducts = await filterTemplateProductsAgainstMarketStall(templateProducts, template.currentSeason);
            setThemeProducts(prev => ({ ...prev, [template.currentSeason]: filteredProducts }));
            setTemplateResourceLibraryProductIds([]);
          }
        } else {
          setThemeProducts(prev => ({ ...prev, [template.currentSeason]: [] }));
          setTemplateResourceLibraryProductIds([]);
        }
      } else {
        const allSeasonProducts: Record<string, Product[]> = {};
        if (template.templateData.themeProducts && typeof template.templateData.themeProducts === 'object') {
          for (const [season, products] of Object.entries(template.templateData.themeProducts)) {
            if (Array.isArray(products)) {
              allSeasonProducts[season] = await filterTemplateProductsAgainstMarketStall(products, season);
            }
          }
        }
        setThemeProducts(prev => ({ ...prev, ...allSeasonProducts }));
        setTemplateResourceLibraryProductIds([]);
      }
    }
    
    // Load theme-specific floating assets
    if (template.templateData.themeFloatingAssets) {
      setThemeFloatingAssets(template.templateData.themeFloatingAssets);
    } else {
      setThemeFloatingAssets({ [template.currentSeason]: template.templateData.floatingAssets || [] });
    }
    
    // Set the template's theme for rendering
    if (template.templateData.currentTheme) {
      setCurrentTemplateTheme(template.templateData.currentTheme);
    } else {
      setCurrentTemplateTheme(convertTemplateThemeToLegacy(template.themeSnapshot));
    }
    
    // Load promo button styling if available
    if (template.templateData.promoButton) {
      setPromoButton(template.templateData.promoButton);
    }
  }, [preloadBackgroundImage, filterTemplateProductsAgainstMarketStall, convertTemplateThemeToLegacy, setCurrentSeason, setThemeTextStyles, setThemeLogos, setThemeGeneratedBackgrounds, setThemeUploadedBackgrounds, setThemeBackgroundAttachmentIds, setThemeBackgroundAttachmentUrls, setThemeLogoAttachmentIds, setThemeLogoAttachmentUrls, setThemeProducts, setTemplateResourceLibraryProductIds, setThemeFloatingAssets, setCurrentTemplateTheme, setPromoButton]);
  
  // Application load logic: live template -> first template -> default spooky theme + auto-add Market Stall products
  const loadApplicationData = useCallback(async () => {
    try {
      // Step 0: Try to load from localStorage cache FIRST for instant display (only once)
      if (!hasLoadedFromCacheRef.current) {
        const cachedTemplate = loadLastLoadedTemplateFromCache();
        if (cachedTemplate) {
          console.log('💾 Loading cached template immediately:', cachedTemplate.name, cachedTemplate.id);
          hasLoadedFromCacheRef.current = true; // Mark as loaded to prevent re-loading
          await applyTemplateDataToState(cachedTemplate, true, true); // Skip product filtering, mark as cached
          setIsStoreContentReady(true);
          console.log('💾 Cached template loaded - store content ready');
        }
      }
      
      // Track if any template was loaded
      let templateWasLoaded = false;
      
      // Step 1: Try to load live template from DB
      const live = await getLiveTemplate(experienceId);
      setLiveTemplate(live);
      
      if (live) {
        templateWasLoaded = true;
        // Load live template data
        setCurrentSeason(live.currentSeason);
        console.log('🎨 Loading live template with snapshot theme:', live.themeSnapshot.name);
        
        setThemeTextStyles(live.templateData.themeTextStyles);
        setThemeLogos(live.templateData.themeLogos);
        
        // CRITICAL: Preload background image BEFORE setting state to prevent gaps
        const backgroundUrl = live.templateData.backgroundAttachmentUrl || 
                             live.templateData.themeUploadedBackgrounds?.[live.currentSeason] || 
                             live.templateData.themeGeneratedBackgrounds?.[live.currentSeason] ||
                             live.templateData.uploadedBackground ||
                             live.templateData.generatedBackground;
        
        if (backgroundUrl) {
          console.log('🖼️ Preloading live template background image:', backgroundUrl);
          // Preload the image first
          await preloadBackgroundImage(backgroundUrl);
          
          // Then set the state (image is already loaded, no gap!)
          const isGenerated = !!(live.templateData.themeGeneratedBackgrounds?.[live.currentSeason] || live.templateData.generatedBackground);
          if (isGenerated) {
            setThemeGeneratedBackgrounds({ [live.currentSeason]: backgroundUrl });
          } else {
            setThemeUploadedBackgrounds({ [live.currentSeason]: backgroundUrl });
          }
        } else {
          // Clear backgrounds if no URL
          setThemeGeneratedBackgrounds({ [live.currentSeason]: null });
          setThemeUploadedBackgrounds({ [live.currentSeason]: null });
        }
        
        // Set WHOP attachment fields if available (theme-specific)
        if (live.templateData.backgroundAttachmentId) {
          setThemeBackgroundAttachmentIds(prev => ({
            ...prev,
            [live.currentSeason]: live.templateData.backgroundAttachmentId || null
          }));
        }
        if (live.templateData.backgroundAttachmentUrl) {
          setThemeBackgroundAttachmentUrls(prev => ({
            ...prev,
            [live.currentSeason]: live.templateData.backgroundAttachmentUrl || null
          }));
        }
        if (live.templateData.logoAttachmentId) {
          setThemeLogoAttachmentIds(prev => ({
            ...prev,
            [live.currentSeason]: live.templateData.logoAttachmentId || null
          }));
        }
        if (live.templateData.logoAttachmentUrl) {
          setThemeLogoAttachmentUrls(prev => ({
            ...prev,
            [live.currentSeason]: live.templateData.logoAttachmentUrl || null
          }));
        }
        
        // CRITICAL: Filter template products - only keep ones that exist in Market Stall
        // Apply template design to matching Market Stall products
        const liveTemplateProducts = live.templateData.themeProducts[live.currentSeason] || [];
        const filteredProducts = await filterTemplateProductsAgainstMarketStall(liveTemplateProducts, live.currentSeason);
        
        setThemeProducts(prev => ({
          ...prev,
          [live.currentSeason]: filteredProducts
        }));
        
        // Load promo button styling if available
        if (live.templateData.promoButton) {
          console.log('🎨 Loading promo button styling from live template:', live.templateData.promoButton.text);
          setPromoButton(live.templateData.promoButton);
        }
        
        // Save to cache for instant load next time
        saveLastLoadedTemplateToCache(live);
        
        // Mark content ready AFTER background is preloaded
        setIsStoreContentReady(true);
        console.log('🎨 Live template loaded - store content ready (background preloaded)');
      } else {
        // Step 2: No live template - try to load first template from list
        const allTemplates = await getTemplates(experienceId);
        setTemplates(allTemplates);
        
        if (allTemplates && allTemplates.length > 0) {
          templateWasLoaded = true;
          // Load the first template from the list
          const firstTemplate = allTemplates[0];
          console.log('🎨 No live template found - loading first template:', firstTemplate.name);
          
          setCurrentSeason(firstTemplate.currentSeason);
          setThemeTextStyles(firstTemplate.templateData.themeTextStyles);
          setThemeLogos(firstTemplate.templateData.themeLogos);
          
          // CRITICAL: Preload background image BEFORE setting state to prevent gaps
          const backgroundUrl = firstTemplate.templateData.themeUploadedBackgrounds?.[firstTemplate.currentSeason] || 
                               firstTemplate.templateData.themeGeneratedBackgrounds?.[firstTemplate.currentSeason] ||
                               firstTemplate.templateData.uploadedBackground ||
                               firstTemplate.templateData.generatedBackground;
          
          if (backgroundUrl) {
            console.log('🖼️ Preloading first template background image:', backgroundUrl);
            // Preload the image first
            await preloadBackgroundImage(backgroundUrl);
            
            // Then set the state (image is already loaded, no gap!)
            const isGenerated = !!(firstTemplate.templateData.themeGeneratedBackgrounds?.[firstTemplate.currentSeason] || firstTemplate.templateData.generatedBackground);
            if (isGenerated) {
              setThemeGeneratedBackgrounds({ [firstTemplate.currentSeason]: backgroundUrl });
            } else {
              setThemeUploadedBackgrounds({ [firstTemplate.currentSeason]: backgroundUrl });
            }
          } else {
            // Clear backgrounds if no URL
            setThemeGeneratedBackgrounds({ [firstTemplate.currentSeason]: null });
            setThemeUploadedBackgrounds({ [firstTemplate.currentSeason]: null });
          }
          
          // CRITICAL: Filter template products - only keep ones that exist in Market Stall
          // Apply template design to matching Market Stall products
          const firstTemplateProducts = firstTemplate.templateData.themeProducts[firstTemplate.currentSeason] || [];
          const filteredProducts = await filterTemplateProductsAgainstMarketStall(firstTemplateProducts, firstTemplate.currentSeason);
          
          setThemeProducts({
            [firstTemplate.currentSeason]: filteredProducts
          });
          
          // Load promo button styling if available
          if (firstTemplate.templateData.promoButton) {
            setPromoButton(firstTemplate.templateData.promoButton);
          }
          
          // Save to cache for instant load next time
          saveLastLoadedTemplateToCache(firstTemplate);
          
          // Mark content ready AFTER background is preloaded
          setIsStoreContentReady(true);
          console.log('🎨 First template loaded - store content ready (background preloaded)');
        } else {
          // Step 3: No templates at all - show default "Spooky Night" theme
          console.log('🎨 No templates found - showing default Spooky Night theme');
          setCurrentSeason('Fall'); // Use Fall as the season (which contains Spooky Night theme)
          
          // Initialize Fall theme with empty products (Market Stall products will be added later)
          setThemeProducts(prev => ({ ...prev, 'Fall': [] }));
          
          setIsStoreContentReady(true);
          console.log('🎨 Default Spooky Night theme loaded - store content ready');
        }
      }
      
      // Step 4: Always ensure Market Stall products are available in all themes
      // This ensures Market Stall products are available even when templates are loaded
      console.log('🛒 Ensuring Market Stall products are available in all themes...');
      await autoAddMarketStallProductsToAllThemes();
      
      // Step 5: After initial template is loaded, cache ALL templates and preload all backgrounds
      // This ensures instant switching between templates without DB fetches
      const allTemplates = await getTemplates(experienceId);
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
      // Still mark as complete even on error to prevent infinite loading
      setIsInitialLoadComplete(true);
      setIsStoreContentReady(true);
    }
  }, [experienceId, autoAddMarketStallProductsToAllThemes, filterTemplateProductsAgainstMarketStall, preloadBackgroundImage, loadLastLoadedTemplateFromCache, applyTemplateDataToState, saveLastLoadedTemplateToCache, cacheAllTemplatesAndPreloadBackgrounds]);
  
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
      
      loadThemes();
      loadTemplates();
      loadApplicationData(); // New unified load function
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
      const updatedTheme = await updateTheme(experienceId, themeId, updates);
      setThemes(prev => prev.map(t => t.id === themeId ? updatedTheme : t));
      setAllThemes(prev => ({ ...prev, [`db_${updatedTheme.id}`]: convertThemeToLegacy(updatedTheme) }));
      return updatedTheme;
    } catch (error) {
      console.error('Error updating theme:', error);
      setApiError(`Failed to update theme: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId]);
  
  // Template management functions
  const saveTemplate = useCallback(async (templateData: Omit<StoreTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Check if we can add a template
      if (!canAddTemplate()) {
        const error = `Cannot save template: Maximum of ${MAX_CUSTOM_TEMPLATES} templates allowed`;
        console.warn('⚠️', error);
        setApiError(error);
        throw new Error(error);
      }
      
      console.log("🔍 saveTemplate - experienceId:", experienceId);
      console.log("🔍 saveTemplate - templateData:", templateData);
      const newTemplate = await createTemplate(experienceId, templateData);
      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (error) {
      console.error('Error saving template:', error);
      setApiError(`Failed to save template: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId, canAddTemplate]);
  
  const loadTemplate = useCallback(async (templateId: string) => {
    try {
      // First, check if template is in cache (instant load, no DB fetch)
      let template = cachedTemplates.get(templateId);
      const isCached = !!template;
      
      if (!template) {
        // Template not in cache, fetch from DB
        console.log(`📂 Template ${templateId} not in cache, fetching from DB...`);
        template = await getTemplate(experienceId, templateId);
        
        // Add to cache for next time (also saves to localStorage)
        updateCachedTemplates((() => {
          const newCache = new Map(cachedTemplates);
          newCache.set(templateId, template!);
          return newCache;
        })());
      } else {
        console.log(`✅ Template ${templateId} found in cache, using cached version (instant load!)`);
      }
      
      // Load template data into current state
      setCurrentSeason(template.currentSeason);
      
      // Mark that a template has been manually loaded
      setHasManuallyLoadedTemplate(true);
      
      // Template uses its own themeSnapshot - no need to modify allThemes
      console.log('📂 ===== TEMPLATE LOAD STRUCTURE =====');
      console.log('📂 Template ID:', template.id);
      console.log('📂 Template Name:', template.name);
      console.log('📂 Experience ID:', template.experienceId);
      console.log('📂 User ID:', template.userId);
      console.log('📂 Theme ID:', template.themeId);
      console.log('📂 Current Season:', template.currentSeason);
      console.log('📂 Is Live:', template.isLive);
      console.log('📂 Is Last Edited:', template.isLastEdited);
      console.log('📂 Created At:', template.createdAt);
      console.log('📂 Updated At:', template.updatedAt);
      
      console.log('📂 ===== THEME SNAPSHOT =====');
      console.log('📂 Theme Snapshot:', JSON.stringify(template.themeSnapshot, null, 2));
      
      console.log('📂 ===== TEMPLATE DATA STRUCTURE =====');
      console.log('📂 Theme Text Styles:', JSON.stringify(template.templateData.themeTextStyles, null, 2));
      console.log('📂 Theme Logos:', JSON.stringify(template.templateData.themeLogos, null, 2));
      console.log('📂 Theme Generated Backgrounds:', JSON.stringify(template.templateData.themeGeneratedBackgrounds, null, 2));
      console.log('📂 Theme Uploaded Backgrounds:', JSON.stringify(template.templateData.themeUploadedBackgrounds, null, 2));
      console.log('📂 Theme Products:', JSON.stringify(template.templateData.themeProducts, null, 2));
      console.log('📂 Theme Floating Assets:', JSON.stringify(template.templateData.themeFloatingAssets, null, 2));
      
      console.log('📂 ===== LEGACY COMPATIBILITY =====');
      console.log('📂 Products (Legacy):', JSON.stringify(template.templateData.products, null, 2));
      console.log('📂 Floating Assets (Legacy):', JSON.stringify(template.templateData.floatingAssets, null, 2));
      console.log('📂 Fixed Text Styles (Legacy):', JSON.stringify(template.templateData.fixedTextStyles, null, 2));
      console.log('📂 Logo Asset (Legacy):', JSON.stringify(template.templateData.logoAsset, null, 2));
      console.log('📂 Generated Background (Legacy):', template.templateData.generatedBackground);
      console.log('📂 Uploaded Background (Legacy):', template.templateData.uploadedBackground);
      
      console.log('📂 ===== WHOP ATTACHMENTS =====');
      console.log('📂 Background Attachment ID:', template.templateData.backgroundAttachmentId);
      console.log('📂 Background Attachment URL:', template.templateData.backgroundAttachmentUrl);
      console.log('📂 Logo Attachment ID:', template.templateData.logoAttachmentId);
      console.log('📂 Logo Attachment URL:', template.templateData.logoAttachmentUrl);
      
      console.log('📂 ===== CURRENT THEME =====');
      console.log('📂 Current Theme:', JSON.stringify(template.templateData.currentTheme, null, 2));
      
      console.log('📂 ===== PROMO BUTTON =====');
      console.log('📂 Promo Button:', JSON.stringify(template.templateData.promoButton, null, 2));
      
      console.log('📂 ===== PRODUCT DETAILS =====');
      if (template.templateData.products && template.templateData.products.length > 0) {
        template.templateData.products.forEach((product, index) => {
          console.log(`📂 Product ${index + 1}:`, {
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            image: product.image,
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
          });
        });
      }
      
      console.log('📂 ===== LOADING INTO STATE =====');
      console.log('📂 Loading template with snapshot theme:', template.themeSnapshot.name);
      
      setThemeTextStyles(template.templateData.themeTextStyles);
      setThemeLogos(template.templateData.themeLogos);
      
      // CRITICAL: Preload background image BEFORE setting state to prevent gaps
      // Skip preloading if template is cached (backgrounds already preloaded during initial cache)
      const backgroundUrl = template.templateData.backgroundAttachmentUrl || 
                           template.templateData.themeUploadedBackgrounds?.[template.currentSeason] || 
                           template.templateData.themeGeneratedBackgrounds?.[template.currentSeason] ||
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
        const isGenerated = !!(template.templateData.themeGeneratedBackgrounds?.[template.currentSeason] || template.templateData.generatedBackground);
        if (isGenerated) {
          setThemeGeneratedBackgrounds(template.templateData.themeGeneratedBackgrounds);
        } else {
          setThemeUploadedBackgrounds(template.templateData.themeUploadedBackgrounds);
        }
      } else {
        // Set backgrounds (might be null/empty, but that's fine)
        setThemeGeneratedBackgrounds(template.templateData.themeGeneratedBackgrounds);
        setThemeUploadedBackgrounds(template.templateData.themeUploadedBackgrounds);
      }
      
      // Handle template products - check format and load accordingly
      if (template.templateData.themeProducts && template.templateData.themeProducts[template.currentSeason]) {
        const templateProducts = template.templateData.themeProducts[template.currentSeason];
        
        if (Array.isArray(templateProducts) && templateProducts.length > 0) {
          if (typeof templateProducts[0] === 'string') {
            // Legacy format: ResourceLibrary product IDs (old system)
            console.log('📂 Loading template with ResourceLibrary product IDs (legacy):', templateProducts);
            
            setThemeProducts(prev => ({
              ...prev,
              [template.currentSeason]: []
            }));
            
            // Store the ResourceLibrary product IDs for the component to use
            setTemplateResourceLibraryProductIds(templateProducts as unknown as string[]);
          } else {
            // New format: Complete frontend product state
            console.log('📂 Loading template with complete frontend product state:', templateProducts.length, 'products');
            
            // CRITICAL: Filter template products - only keep ones that exist in Market Stall
            // Apply template design to matching Market Stall products
            const filteredProducts = await filterTemplateProductsAgainstMarketStall(templateProducts, template.currentSeason);
            
            setThemeProducts(prev => ({
              ...prev,
              [template.currentSeason]: filteredProducts
            }));
            
            // Clear template ResourceLibrary product IDs for new format
            setTemplateResourceLibraryProductIds([]);
          }
        } else {
          // Empty products array
          setThemeProducts(prev => ({
            ...prev,
            [template.currentSeason]: []
          }));
          setTemplateResourceLibraryProductIds([]);
        }
      } else {
        // Handle case where themeProducts is at root level (all seasons)
        if (template.templateData.themeProducts && typeof template.templateData.themeProducts === 'object') {
          // Filter products for each season
          const filteredThemeProducts: Record<string, Product[]> = {};
          for (const [season, products] of Object.entries(template.templateData.themeProducts)) {
            if (Array.isArray(products)) {
              filteredThemeProducts[season] = await filterTemplateProductsAgainstMarketStall(products, season);
            }
          }
          setThemeProducts(prev => ({ ...prev, ...filteredThemeProducts }));
        } else {
          setThemeProducts(prev => ({ ...prev, ...(template.templateData.themeProducts || {}) }));
        }
        setTemplateResourceLibraryProductIds([]);
      }
      
      // Load theme-specific floating assets if available, otherwise fallback to legacy format
      if (template.templateData.themeFloatingAssets) {
        setThemeFloatingAssets(template.templateData.themeFloatingAssets);
      } else {
        setThemeFloatingAssets({ [template.currentSeason]: template.templateData.floatingAssets || [] });
      }
      
      // Set the template's theme for rendering
      if (template.templateData.currentTheme) {
        console.log('🎨 Setting template theme for rendering:', template.templateData.currentTheme.name);
        setCurrentTemplateTheme(template.templateData.currentTheme);
      } else {
        // Use themeSnapshot if currentTheme is not available
        console.log('🎨 Using themeSnapshot for rendering:', template.themeSnapshot.name);
        setCurrentTemplateTheme(convertTemplateThemeToLegacy(template.themeSnapshot));
      }
      
      // Load promo button styling if available
      if (template.templateData.promoButton) {
        console.log('🎨 Loading promo button styling from template:', template.templateData.promoButton.text);
        setPromoButton(template.templateData.promoButton);
      }
      
      // Set WHOP attachment fields if available (theme-specific)
      if (template.templateData.backgroundAttachmentId) {
        setThemeBackgroundAttachmentIds(prev => ({
          ...prev,
          [template.currentSeason]: template.templateData.backgroundAttachmentId || null
        }));
      }
      if (template.templateData.backgroundAttachmentUrl) {
        setThemeBackgroundAttachmentUrls(prev => ({
          ...prev,
          [template.currentSeason]: template.templateData.backgroundAttachmentUrl || null
        }));
      }
      if (template.templateData.logoAttachmentId) {
        setThemeLogoAttachmentIds(prev => ({
          ...prev,
          [template.currentSeason]: template.templateData.logoAttachmentId || null
        }));
      }
      if (template.templateData.logoAttachmentUrl) {
        setThemeLogoAttachmentUrls(prev => ({
          ...prev,
          [template.currentSeason]: template.templateData.logoAttachmentUrl || null
        }));
      }
      
      console.log('📂 ===== LOAD COMPLETE =====');
      console.log('📂 Template loaded successfully:', template.name);
      console.log('📂 Current Season set to:', template.currentSeason);
      console.log('📂 Theme Products loaded:', Object.keys(template.templateData.themeProducts || {}));
      console.log('📂 Theme Text Styles loaded:', Object.keys(template.templateData.themeTextStyles || {}));
      console.log('📂 Theme Logos loaded:', Object.keys(template.templateData.themeLogos || {}));
      console.log('📂 Theme Backgrounds loaded:', Object.keys(template.templateData.themeGeneratedBackgrounds || {}));
      console.log('📂 Theme Floating Assets loaded:', Object.keys(template.templateData.themeFloatingAssets || {}));
      
      // Show detailed product information for current season
      const currentSeasonProducts = template.templateData.themeProducts?.[template.currentSeason] || [];
      console.log('📂 Products for current season:', currentSeasonProducts.length);
      if (currentSeasonProducts.length > 0) {
        const resourceLibraryCount = currentSeasonProducts.filter(p => typeof p.id === 'string' && p.id.startsWith('resource-')).length;
        const frontendCount = currentSeasonProducts.length - resourceLibraryCount;
        console.log('📂 Product breakdown:', {
          total: currentSeasonProducts.length,
          resourceLibrary: resourceLibraryCount,
          frontend: frontendCount
        });
      }
      
      console.log('📂 ===== END TEMPLATE LOAD STRUCTURE =====');
      
      // Save to cache for instant load next time
      saveLastLoadedTemplateToCache(template);
      
      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      setApiError(`Failed to load template: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId, filterTemplateProductsAgainstMarketStall, preloadBackgroundImage, saveLastLoadedTemplateToCache, cachedTemplates]);
  
  const setLiveTemplateHandler = useCallback(async (templateId: string) => {
    try {
      if (templateId === "default") {
        // Handle default case - clear all live templates
        await setLiveTemplateAction(experienceId, "default");
        setLiveTemplate(null);
      } else {
        await setLiveTemplateAction(experienceId, templateId);
        // Find the template and set it as live
        const template = templates.find(t => t.id === templateId);
        if (template) {
          setLiveTemplate(template);
        }
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
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: [...(prev[currentSeason] || []), newProduct]
    }));
  }, [currentSeason]);

  const updateProduct = useCallback((id: number, updates: Partial<Product>) => {
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: (prev[currentSeason] || []).map(product =>
        product.id === id ? { ...product, ...updates } : product
      )
    }));
  }, [currentSeason]);

  const deleteProduct = useCallback((id: number) => {
    setThemeProducts(prev => ({
      ...prev,
      [currentSeason]: (prev[currentSeason] || []).filter(product => product.id !== id)
    }));
  }, [currentSeason]);
  
  // Background management with preloading to prevent gaps
  const setBackground = useCallback(async (type: 'generated' | 'uploaded', url: string | null) => {
    if (!url) {
      // If URL is null, immediately clear the background
      if (type === 'generated') {
        setThemeGeneratedBackgrounds(prev => ({
          ...prev,
          [currentSeason]: null
        }));
      } else {
        setThemeUploadedBackgrounds(prev => ({
          ...prev,
          [currentSeason]: null
        }));
      }
      setThemeBackgroundAttachmentUrls(prev => ({
        ...prev,
        [currentSeason]: null
      }));
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
      setThemeGeneratedBackgrounds(prev => ({
        ...prev,
        [currentSeason]: url
      }));
    } else {
      setThemeUploadedBackgrounds(prev => ({
        ...prev,
        [currentSeason]: url
      }));
    }
    
    // If this is a WHOP URL, also set the attachment fields
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      // This is likely a WHOP URL, set it as the attachment URL
      setThemeBackgroundAttachmentUrls(prev => ({
        ...prev,
        [currentSeason]: url
      }));
    }
  }, [currentSeason]);
  
  // Logo management
  const setLogoAsset = useCallback((logo: LogoAsset) => {
    setThemeLogos(prev => ({
      ...prev,
      [currentSeason]: logo
    }));
  }, [currentSeason]);
  
  // Text styles management
  const setFixedTextStyles = useCallback((styles: FixedTextStyles | ((prev: FixedTextStyles) => FixedTextStyles)) => {
    setThemeTextStyles(prev => ({
      ...prev,
      [currentSeason]: typeof styles === 'function' ? styles(prev[currentSeason] || {} as FixedTextStyles) : styles
    }));
  }, [currentSeason]);
  
  // Error management
  const setError = useCallback((error: string | null) => {
    setApiError(error);
  }, []);
  
  // WHOP attachment management (theme-specific)
  const setBackgroundAttachmentId = useCallback((id: string | null) => {
    setThemeBackgroundAttachmentIds(prev => ({
      ...prev,
      [currentSeason]: id
    }));
  }, [currentSeason]);
  
  const setBackgroundAttachmentUrl = useCallback((url: string | null) => {
    setThemeBackgroundAttachmentUrls(prev => ({
      ...prev,
      [currentSeason]: url
    }));
  }, [currentSeason]);
  
  const setLogoAttachmentId = useCallback((id: string | null) => {
    setThemeLogoAttachmentIds(prev => ({
      ...prev,
      [currentSeason]: id
    }));
  }, [currentSeason]);
  
  const setLogoAttachmentUrl = useCallback((url: string | null) => {
    setThemeLogoAttachmentUrls(prev => ({
      ...prev,
      [currentSeason]: url
    }));
  }, [currentSeason]);
  
  // Editor state management
  const [editorState, setEditorState] = useState<EditorState>({
    isEditorView: false,
    isSheetOpen: false,
    isAdminSheetOpen: false,
    selectedAssetId: null
  });
  
  // Floating asset management (theme-specific)
  const addFloatingAsset = useCallback((asset: FloatingAsset) => {
    setThemeFloatingAssets(prev => ({
      ...prev,
      [currentSeason]: [...(prev[currentSeason] || []), asset]
    }));
  }, [currentSeason]);
  
  const updateFloatingAsset = useCallback((id: string, updates: Partial<FloatingAsset>) => {
    setThemeFloatingAssets(prev => ({
      ...prev,
      [currentSeason]: (prev[currentSeason] || []).map(asset => 
        asset.id === id ? { ...asset, ...updates } : asset
      )
    }));
  }, [currentSeason]);
  
  const deleteFloatingAsset = useCallback((id: string) => {
    setThemeFloatingAssets(prev => ({
      ...prev,
      [currentSeason]: (prev[currentSeason] || []).filter(asset => asset.id !== id)
    }));
  }, [currentSeason]);
  
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
      const marketStallPlaceholder = 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
      
      // Convert PAID resources to products with Market Stall placeholders
      const marketStallProducts = paidResources.map((resource: Resource) => ({
        id: `resource-${resource.id}`,
        name: resource.name,
        description: resource.description || '',
        price: parseFloat(resource.price || '0'), // Convert string to number
        image: resource.image || marketStallPlaceholder, // Use Market Stall placeholder if no image
        link: resource.link || '',
        category: resource.category || 'PAID',
        type: resource.type || 'MY_PRODUCTS',
        // Add Market Stall placeholders
        placeholder: true,
        marketStallProduct: true
      }));
      
      // Add products to the custom theme
      setThemeProducts(prev => {
        const updated = { ...prev };
        const existingProducts = updated[customThemeKey] || [];
        const existingResourceIds = existingProducts
          .filter(p => typeof p.id === 'string' && p.id.startsWith('resource-'))
          .map(p => p.id);
        
        // Only add products that aren't already in this custom theme
        const newProducts = marketStallProducts.filter((product: Product) => 
          !existingResourceIds.includes(product.id)
        );
        
        if (newProducts.length > 0) {
          updated[customThemeKey] = [...existingProducts, ...newProducts];
          console.log(`🛒 Added ${newProducts.length} PAID Market Stall products to custom theme: ${customThemeKey}`);
        }
        
        return updated;
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
        ringColor: theme.accent || 'bg-indigo-500'
      };
      
      // Save to database
      const newTheme = await createTheme(experienceId, themeData);
      console.log('✅ Custom theme saved to database:', newTheme.id);
      
      // Update local state
      setThemes(prev => [...prev, newTheme]);
      
      // Create a unique key for custom themes to avoid conflicts with default themes
      const customThemeKey = `custom_${theme.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
      setAllThemes(prev => ({ ...prev, [customThemeKey]: theme }));
      
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
        
        // Still add Market Stall products even if database save fails
        console.log('🛒 Adding Market Stall products to custom theme (fallback):', customThemeKey);
        await addMarketStallProductsToCustomTheme(customThemeKey);
      }
      throw error;
    }
  }, [experienceId, currentSeason, createTheme, setApiError, canAddCustomTheme, addMarketStallProductsToCustomTheme]);
  
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
  }, [experienceId, loadLastLoadedTemplateFromCache, clearLastLoadedTemplateFromCache]);

  // Store Navigation State Management
  const saveLastActiveTheme = useCallback((theme: string) => {
    setLastActiveTheme(theme);
    console.log(`💾 Saved last active theme: ${theme}`);
  }, []);
  
  const saveLastActiveTemplate = useCallback((template: StoreTemplate | null) => {
    setLastActiveTemplate(template);
    console.log(`💾 Saved last active template: ${template?.name || 'none'}`);
  }, []);
  
  const restoreLastActiveState = useCallback(() => {
    if (lastActiveTemplate) {
      console.log(`🔄 Restoring last active template: ${lastActiveTemplate.name}`);
      setCurrentSeason(lastActiveTemplate.currentSeason);
      setThemeTextStyles(lastActiveTemplate.templateData.themeTextStyles);
      setThemeLogos(lastActiveTemplate.templateData.themeLogos);
      setThemeGeneratedBackgrounds(lastActiveTemplate.templateData.themeGeneratedBackgrounds);
      setThemeUploadedBackgrounds(lastActiveTemplate.templateData.themeUploadedBackgrounds);
      setThemeProducts(prev => ({ ...prev, ...lastActiveTemplate.templateData.themeProducts }));
      if (lastActiveTemplate.templateData.promoButton) {
        setPromoButton(lastActiveTemplate.templateData.promoButton);
      }
      if (lastActiveTemplate.templateData.backgroundAttachmentId) {
        setThemeBackgroundAttachmentIds(prev => ({ ...prev, [lastActiveTemplate.currentSeason]: lastActiveTemplate.templateData.backgroundAttachmentId || null }));
      }
      if (lastActiveTemplate.templateData.backgroundAttachmentUrl) {
        setThemeBackgroundAttachmentUrls(prev => ({ ...prev, [lastActiveTemplate.currentSeason]: lastActiveTemplate.templateData.backgroundAttachmentUrl || null }));
      }
      if (lastActiveTemplate.templateData.logoAttachmentId) {
        setThemeLogoAttachmentIds(prev => ({ ...prev, [lastActiveTemplate.currentSeason]: lastActiveTemplate.templateData.logoAttachmentId || null }));
      }
      if (lastActiveTemplate.templateData.logoAttachmentUrl) {
        setThemeLogoAttachmentUrls(prev => ({ ...prev, [lastActiveTemplate.currentSeason]: lastActiveTemplate.templateData.logoAttachmentUrl || null }));
      }
    } else if (lastActiveTheme) {
      console.log(`🔄 Restoring last active theme: ${lastActiveTheme}`);
      setCurrentSeason(lastActiveTheme);
    }
  }, [lastActiveTemplate, lastActiveTheme]);
  
  return {
    // Core state
    allThemes,
    setAllThemes,
    currentSeason,
    setCurrentSeason: handleSetCurrentSeason,
    floatingAssets,
    availableAssets,
    setAvailableAssets,
    
    // Theme-specific state
    themeTextStyles,
    themeLogos,
    themeGeneratedBackgrounds,
    themeUploadedBackgrounds,
    themeProducts,
    setThemeProducts,
    themeFloatingAssets,
    
    // Current theme's computed state
    fixedTextStyles,
    logoAsset,
    generatedBackground,
    uploadedBackground,
    backgroundAttachmentId,
    backgroundAttachmentUrl,
    logoAttachmentId,
    logoAttachmentUrl,
    products,
    theme,
    
    // Database state
    templates,
    themes,
    liveTemplate,
    lastEditedTemplate,
    
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
    
    // Background management
    setBackground,
    
    // Logo management
    setLogoAsset,
    
    // Text styles management
    setFixedTextStyles,
    
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
    
    // WHOP attachment management
    setBackgroundAttachmentId,
    setBackgroundAttachmentUrl,
    setLogoAttachmentId,
    setLogoAttachmentUrl,
    
    // Promo button management
    promoButton,
    setPromoButton,
    
    // Template management
    deleteTemplate,
    
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
  };
};
