import { useState, useCallback, useEffect } from 'react';
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
  initialProducts, 
  winterProducts,
  summerProducts,
  fallProducts,
  holidayProducts,
  springProducts,
  cyberProducts,
  halloweenProducts, 
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

export const useSeasonalStoreDatabase = (experienceId: string) => {
  // Constants for limits
  const MAX_CUSTOM_THEMES = 10;
  const MAX_CUSTOM_TEMPLATES = 10;
  
  // Helper function to get default products for a season
  const getDefaultProducts = (season: string): Product[] => {
    switch (season) {
      case 'Winter Frost': return winterProducts;
      case 'Summer Sun': return summerProducts;
      case 'Fall':
      case 'Autumn Harvest': return fallProducts;
      case 'Holiday Cheer': return holidayProducts;
      case 'Spring Renewal': return springProducts;
      case 'Cyber Sale': return cyberProducts;
      case 'Spooky Night':
      case 'Halloween Spooky': return halloweenProducts;
      default: return initialProducts;
    }
  };
  
  // Core State
  const [allThemes, setAllThemes] = useState<Record<string, LegacyTheme>>(initialThemes);
  const [currentSeason, setCurrentSeason] = useState<string>('Fall');
  
  // Theme-Specific State
  const [themeTextStyles, setThemeTextStyles] = useState<Record<string, FixedTextStyles>>({});
  const [themeLogos, setThemeLogos] = useState<Record<string, LogoAsset>>({});
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
  
  // Products for current theme - ensure we have default products for each theme
  const products = themeProducts[currentSeason] || getDefaultProducts(currentSeason);
  
  // Floating assets for current theme
  const floatingAssets = themeFloatingAssets[currentSeason] || [];
  
  // Current theme
  const theme = allThemes[currentSeason] || initialThemes[currentSeason];
  
  // Loading and error states
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isTextLoading: false,
    isImageLoading: false,
    isUploadingImage: false,
    isGeneratingImage: false
  });
  
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Initialize default products for each theme on first load
  useEffect(() => {
    const initializeThemeProducts = () => {
      const updatedThemeProducts: Record<string, Product[]> = {};
      
      // Initialize products for each theme if not already set
      Object.keys(initialThemes).forEach(themeName => {
        if (!themeProducts[themeName]) {
          updatedThemeProducts[themeName] = getDefaultProducts(themeName);
        }
      });
      
      // Only update if we have new products to add
      if (Object.keys(updatedThemeProducts).length > 0) {
        setThemeProducts(prev => ({
          ...prev,
          ...updatedThemeProducts
        }));
        console.log('🎯 Initialized default products for themes:', Object.keys(updatedThemeProducts));
      }
    };
    
    initializeThemeProducts();
  }, []); // Run only once on mount
  
  // Ensure current season has products when switching themes
  useEffect(() => {
    if (!themeProducts[currentSeason]) {
      const defaultProducts = getDefaultProducts(currentSeason);
      setThemeProducts(prev => ({
        ...prev,
        [currentSeason]: defaultProducts
      }));
      console.log('🎯 Initialized products for current season:', currentSeason);
    }
  }, [currentSeason, themeProducts]);
  
  // State persistence: Load state from sessionStorage on mount
  useEffect(() => {
    try {
      const persistedState = sessionStorage.getItem(`seasonalStore_${experienceId}`);
      if (persistedState) {
        const state = JSON.parse(persistedState);
        console.log('💾 Restoring persisted state for experience:', experienceId);
        
        // Restore theme-specific state
        if (state.currentSeason) setCurrentSeason(state.currentSeason);
        if (state.themeTextStyles) setThemeTextStyles(state.themeTextStyles);
        if (state.themeLogos) setThemeLogos(state.themeLogos);
        if (state.themeGeneratedBackgrounds) setThemeGeneratedBackgrounds(state.themeGeneratedBackgrounds);
        if (state.themeUploadedBackgrounds) setThemeUploadedBackgrounds(state.themeUploadedBackgrounds);
        if (state.themeProducts) setThemeProducts(state.themeProducts);
        if (state.themeFloatingAssets) setThemeFloatingAssets(state.themeFloatingAssets);
        if (state.allThemes) setAllThemes(state.allThemes);
        
        // Restore WHOP attachment state (theme-specific)
        if (state.themeBackgroundAttachmentIds) setThemeBackgroundAttachmentIds(state.themeBackgroundAttachmentIds);
        if (state.themeBackgroundAttachmentUrls) setThemeBackgroundAttachmentUrls(state.themeBackgroundAttachmentUrls);
        if (state.themeLogoAttachmentIds) setThemeLogoAttachmentIds(state.themeLogoAttachmentIds);
        if (state.themeLogoAttachmentUrls) setThemeLogoAttachmentUrls(state.themeLogoAttachmentUrls);
        
        // Restore promo button state
        if (state.promoButton) setPromoButton(state.promoButton);
        
        console.log('✅ State restored successfully');
      }
    } catch (error) {
      console.error('❌ Failed to restore persisted state:', error);
    }
  }, [experienceId]); // Only run on mount or when experienceId changes
  
  // State persistence: Save state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      const stateToPerist = {
        currentSeason,
        themeTextStyles,
        themeLogos,
        themeGeneratedBackgrounds,
        themeUploadedBackgrounds,
        themeProducts,
        themeFloatingAssets,
        allThemes,
        themeBackgroundAttachmentIds,
        themeBackgroundAttachmentUrls,
        themeLogoAttachmentIds,
        themeLogoAttachmentUrls,
        promoButton,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(`seasonalStore_${experienceId}`, JSON.stringify(stateToPerist));
      console.log('💾 State persisted to sessionStorage');
    } catch (error) {
      console.error('❌ Failed to persist state:', error);
    }
  }, [
    experienceId,
    currentSeason,
    themeTextStyles,
    themeLogos,
    themeGeneratedBackgrounds,
    themeUploadedBackgrounds,
    themeProducts,
    themeFloatingAssets,
    allThemes,
    themeBackgroundAttachmentIds,
    themeBackgroundAttachmentUrls,
    themeLogoAttachmentIds,
    themeLogoAttachmentUrls,
    promoButton
  ]);
  
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
        themesMap[theme.season] = convertThemeToLegacy(theme);
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
  
  // Load templates from database
  const loadTemplates = useCallback(async () => {
    try {
      const templatesList = await getTemplates(experienceId);
      setTemplates(templatesList);
    } catch (error) {
      console.error('Error loading templates:', error);
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        console.log('Authentication required for database operations');
        setApiError(null);
      } else {
        setApiError(`Failed to load templates: ${(error as Error).message}`);
      }
    }
  }, [experienceId]);
  
  // Load live template
  const loadLiveTemplate = useCallback(async () => {
    try {
      const live = await getLiveTemplate(experienceId);
      setLiveTemplate(live);
      
      if (live) {
        // Load live template data
        setCurrentSeason(live.currentSeason);
        
        // Use template's snapshot theme (complete theme data from template)
        console.log('🎨 Loading template snapshot theme for live template:', live.themeSnapshot.name);
        setAllThemes(prev => ({ ...prev, [live.currentSeason]: convertTemplateThemeToLegacy(live.themeSnapshot) }));
        
        setThemeTextStyles(live.templateData.themeTextStyles);
        setThemeLogos(live.templateData.themeLogos);
        setThemeGeneratedBackgrounds(live.templateData.themeGeneratedBackgrounds);
        setThemeUploadedBackgrounds(live.templateData.themeUploadedBackgrounds);
        setThemeProducts(live.templateData.themeProducts);
        
        // Load current theme styling if available
        if (live.templateData.currentTheme) {
          console.log('🎨 Loading current theme styling from live template:', live.templateData.currentTheme.name);
          console.log('🎨 Current theme data:', live.templateData.currentTheme);
          setAllThemes(prev => ({ ...prev, [live.currentSeason]: convertTemplateThemeToLegacy(live.templateData.currentTheme) }));
        }
        
        // Load promo button styling if available
        if (live.templateData.promoButton) {
          console.log('🎨 Loading promo button styling from live template:', live.templateData.promoButton.text);
          setPromoButton(live.templateData.promoButton);
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
      }
    } catch (error) {
      console.error('Error loading live template:', error);
      if ((error as Error).message.includes('Token missing') || (error as Error).message.includes('401')) {
        console.log('Authentication required for database operations');
        setApiError(null);
      } else {
        setApiError(`Failed to load live template: ${(error as Error).message}`);
      }
    }
  }, [experienceId]);
  
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
      loadThemes();
      loadTemplates();
      loadLiveTemplate();
      loadLastEditedTemplate();
    }
  }, [experienceId, loadThemes, loadTemplates, loadLiveTemplate, loadLastEditedTemplate]);
  
  // Theme management functions
  const createThemeHandler = useCallback(async (themeData: Omit<Theme, "id" | "experienceId" | "createdAt" | "updatedAt">) => {
    try {
      const newTheme = await createTheme(experienceId, themeData);
      setThemes(prev => [...prev, newTheme]);
      setAllThemes(prev => ({ ...prev, [newTheme.season]: convertThemeToLegacy(newTheme) }));
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
      setAllThemes(prev => ({ ...prev, [updatedTheme.season]: convertThemeToLegacy(updatedTheme) }));
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
      const template = await getTemplate(experienceId, templateId);
      
      // Load template data into current state
      setCurrentSeason(template.currentSeason);
      
      // Use template's snapshot theme (complete theme data from template)
      console.log('🎨 Loading template snapshot theme:', template.themeSnapshot.name);
      setAllThemes(prev => ({ ...prev, [template.currentSeason]: convertTemplateThemeToLegacy(template.themeSnapshot) }));
      
      setThemeTextStyles(template.templateData.themeTextStyles);
      setThemeLogos(template.templateData.themeLogos);
      setThemeGeneratedBackgrounds(template.templateData.themeGeneratedBackgrounds);
      setThemeUploadedBackgrounds(template.templateData.themeUploadedBackgrounds);
      setThemeProducts(template.templateData.themeProducts);
      
      // Load theme-specific floating assets if available, otherwise fallback to legacy format
      if (template.templateData.themeFloatingAssets) {
        setThemeFloatingAssets(template.templateData.themeFloatingAssets);
      } else {
        setThemeFloatingAssets({ [template.currentSeason]: template.templateData.floatingAssets || [] });
      }
      
      // Load current theme styling if available (only if we have space for custom themes)
      if (template.templateData.currentTheme) {
        console.log('🎨 Loading current theme styling from template:', template.templateData.currentTheme.name);
        console.log('🎨 Current theme data:', template.templateData.currentTheme);
        
        // Check if this is a custom theme and if we have space for it
        const defaultThemeNames = ['Winter Frost', 'Summer Sun', 'Autumn Harvest', 'Holiday Cheer', 'Spring Renewal', 'Cyber Monday', 'Halloween Spooky'];
        const isCustomTheme = !defaultThemeNames.includes(template.templateData.currentTheme.name);
        
        if (isCustomTheme && !canAddCustomTheme()) {
          console.warn('⚠️ Cannot load custom theme from template: Maximum custom themes reached');
          setApiError(`Cannot load custom theme "${template.templateData.currentTheme.name}": Maximum of ${MAX_CUSTOM_THEMES} custom themes allowed`);
        } else {
          setAllThemes(prev => ({ ...prev, [template.currentSeason]: convertTemplateThemeToLegacy(template.templateData.currentTheme) }));
        }
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
      
      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      setApiError(`Failed to load template: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId]);
  
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
  
  // Background management
  const setBackground = useCallback((type: 'generated' | 'uploaded', url: string | null) => {
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
      setAllThemes(prev => ({ ...prev, [theme.name]: theme }));
      
      return newTheme;
    } catch (error) {
      console.error('❌ Failed to save custom theme to database:', error);
      setApiError(`Failed to save custom theme: ${(error as Error).message}`);
      
      // Still update local state even if database save fails (only if it's not a limit error)
      if (!(error as Error).message.includes('Maximum of')) {
        setAllThemes(prev => ({ ...prev, [theme.name]: theme }));
      }
      throw error;
    }
  }, [experienceId, currentSeason, createTheme, setApiError, canAddCustomTheme]);
  
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
    } catch (error) {
      console.error('Error deleting template:', error);
      setApiError(`Failed to delete template: ${(error as Error).message}`);
      throw error;
    }
  }, [experienceId]);
  
  return {
    // Core state
    allThemes,
    setAllThemes,
    currentSeason,
    setCurrentSeason,
    floatingAssets,
    availableAssets,
    setAvailableAssets,
    
    // Theme-specific state
    themeTextStyles,
    themeLogos,
    themeGeneratedBackgrounds,
    themeUploadedBackgrounds,
    themeProducts,
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
  };
};
