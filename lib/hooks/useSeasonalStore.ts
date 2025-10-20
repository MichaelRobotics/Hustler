import { useState, useCallback, useEffect } from 'react';
import { 
  Product, 
  FloatingAsset, 
  Theme, 
  FixedTextStyles, 
  LogoAsset, 
  EditorState, 
  LoadingState,
  StoreTemplate 
} from '@/lib/components/store/SeasonalStore/types';
import { initialThemes, initialProducts, halloweenProducts, defaultLogo } from '@/lib/components/store/SeasonalStore/services/constants';

export const useSeasonalStore = () => {
  // Core State
  const [allThemes, setAllThemes] = useState<Record<string, Theme>>(initialThemes);
  const [currentSeason, setCurrentSeason] = useState<string>('Fall');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [floatingAssets, setFloatingAssets] = useState<FloatingAsset[]>([]);
  const [availableAssets, setAvailableAssets] = useState<FloatingAsset[]>([]);
  
  // UI State
  const [fixedTextStyles, setFixedTextStyles] = useState<FixedTextStyles>({
    mainHeader: { 
      content: 'THE SEASONAL VAULT', 
      color: '#FFFFFF', 
      styleClass: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg' 
    },
    headerMessage: { 
      content: 'THE SEASONAL VAULT', 
      color: '#FFFFFF', 
      styleClass: 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg' 
    },
    subHeader: { 
      content: initialThemes['Fall'].aiMessage, 
      color: '#FFFFFF', 
      styleClass: 'text-lg sm:text-xl font-normal' 
    },
    promoMessage: { 
      content: 'Our Merchant has Gift for you!', 
      color: '#FFFFFF', 
      styleClass: 'text-2xl sm:text-3xl font-semibold drop-shadow-md' 
    },
  });
  
  const [logoAsset, setLogoAsset] = useState<LogoAsset>(defaultLogo);
  const [generatedBackground, setGeneratedBackground] = useState<string | null>(null);
  const [uploadedBackground, setUploadedBackground] = useState<string | null>(null);
  
  // Editor State
  const [editorState, setEditorState] = useState<EditorState>({
    isEditorView: false,
    isSheetOpen: false,
    isAdminSheetOpen: false,
    selectedAssetId: null,
  });
  
  // Loading State
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isTextLoading: false,
    isImageLoading: false,
  });
  
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Template State
  const [templates, setTemplates] = useState<StoreTemplate[]>([]);

  // Get current theme
  const theme = allThemes[currentSeason];

  // Function to get theme-appropriate text colors
  const getThemeTextColors = (themeName: string) => {
    const theme = allThemes[themeName];
    if (!theme) return { header: '#FFFFFF', subHeader: '#FFFFFF', promo: '#FFFFFF' };

    // Extract colors from theme properties
    const welcomeColor = theme.welcomeColor.replace('text-', '').replace('-', '');
    const textColor = theme.text.replace('text-', '').replace('-', '');
    
    // Debug logging
    console.log(`🎨 Theme: ${themeName}`, {
      welcomeColor: theme.welcomeColor,
      textColor: theme.text,
      extractedWelcome: welcomeColor,
      extractedText: textColor
    });
    
    // Map Tailwind color names to hex values (avoiding black/dark colors)
    const colorMap: Record<string, string> = {
      // Blue colors
      'blue200': '#DBEAFE',
      'blue300': '#93C5FD',
      'blue400': '#60A5FA',
      'blue500': '#3B82F6',
      // Yellow colors
      'yellow100': '#FEF3C7',
      'yellow200': '#FDE68A',
      'yellow300': '#FCD34D',
      'yellow400': '#FBBF24',
      // Orange colors
      'orange100': '#FFEDD5',
      'orange200': '#FED7AA',
      'orange300': '#FDBA74',
      'orange400': '#FB923C',
      // Red colors
      'red200': '#FECACA',
      'red300': '#FCA5A5',
      'red400': '#F87171',
      // Pink colors
      'pink100': '#FCE7F3',
      'pink200': '#FBCFE8',
      'pink300': '#F9A8D4',
      // Cyan colors
      'cyan300': '#67E8F9',
      'cyan400': '#22D3EE',
      'cyan500': '#06B6D4',
      // Purple colors
      'purple400': '#C084FC',
      'purple500': '#A855F7',
      // Amber colors - use lighter versions
      'amber100': '#FEF3C7',
      'amber200': '#FDE68A',
      'amber300': '#FCD34D',
      'amber400': '#FBBF24',
      'amber500': '#F59E0B',
      // Green colors - use lighter versions
      'green100': '#DCFCE7',
      'green200': '#BBF7D0',
      'green300': '#86EFAC',
      'green400': '#4ADE80',
      'green500': '#22C55E',
      // Gray colors - use lighter versions
      'gray100': '#F3F4F6',
      'gray200': '#E5E7EB',
      'gray300': '#D1D5DB',
      'gray400': '#9CA3AF',
      'gray500': '#6B7280',
    };

    const result = {
      header: colorMap[welcomeColor] || '#FFFFFF',
      subHeader: colorMap[textColor] || '#FFFFFF', 
      promo: colorMap[welcomeColor] || '#FFFFFF'
    };

    console.log(`🎨 Color result for ${themeName}:`, result);
    return result;
  };

  // Switch products based on theme
  useEffect(() => {
    if (currentSeason === 'Spooky Night') {
      setProducts(halloweenProducts);
    } else {
      setProducts(initialProducts);
    }
  }, [currentSeason]);

  // Update text colors when theme changes
  useEffect(() => {
    const colors = getThemeTextColors(currentSeason);
    setFixedTextStyles(prev => ({
      ...prev,
      headerMessage: { ...prev.headerMessage, color: colors.header },
      subHeader: { ...prev.subHeader, color: colors.subHeader },
      promoMessage: { ...prev.promoMessage, color: colors.promo }
    }));
  }, [currentSeason]);

  // Update subHeader content when theme changes (only if still using a default theme message)
  useEffect(() => {
    setFixedTextStyles(prev => {
      const isDefaultSubHeader = Object.values(allThemes).some(theme => 
        theme.aiMessage === prev.subHeader.content
      );
      if (isDefaultSubHeader) {
        return {
          ...prev,
          subHeader: {
            ...prev.subHeader,
            content: allThemes[currentSeason].aiMessage,
          },
        };
      }
      return prev;
    });
  }, [currentSeason, allThemes]);

  // Product Management
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

  const updateProduct = useCallback((id: number, updates: Partial<Product>) => {
    setProducts(prev => prev.map(product => 
      product.id === id ? { ...product, ...updates } : product
    ));
  }, []);

  const deleteProduct = useCallback((id: number) => {
    setProducts(prev => prev.filter(product => product.id !== id));
  }, []);

  // Asset Management
  const addFloatingAsset = useCallback((asset: FloatingAsset) => {
    console.log('🎯 addFloatingAsset called with:', asset);
    setFloatingAssets(prev => {
      const newAssets = [...prev, asset];
      console.log('🎯 Updated floatingAssets:', newAssets);
      return newAssets;
    });
  }, []);

  const updateFloatingAsset = useCallback((id: string, updates: Partial<FloatingAsset>) => {
    console.log('🎯 updateFloatingAsset called:', { id, updates });
    setFloatingAssets(prev => {
      const updated = prev.map(asset => 
        asset.id === id ? { ...asset, ...updates } : asset
      );
      console.log('🎯 Updated floatingAssets after update:', updated);
      return updated;
    });
  }, []);

  const deleteFloatingAsset = useCallback((id: string) => {
    setFloatingAssets(prev => prev.filter(asset => asset.id !== id));
  }, []);

  // Theme Management
  const addCustomTheme = useCallback((theme: Theme) => {
    setAllThemes(prev => ({ ...prev, [theme.name]: theme }));
  }, []);

  // Editor State Management
  const toggleEditorView = useCallback(() => {
    setEditorState(prev => ({ ...prev, isEditorView: !prev.isEditorView }));
  }, []);

  const toggleSheet = useCallback(() => {
    setEditorState(prev => ({ ...prev, isSheetOpen: !prev.isSheetOpen }));
  }, []);

  const toggleAdminSheet = useCallback(() => {
    setEditorState(prev => ({ ...prev, isAdminSheetOpen: !prev.isAdminSheetOpen }));
  }, []);

  const setSelectedAsset = useCallback((assetId: string | null) => {
    setEditorState(prev => ({ ...prev, selectedAssetId: assetId }));
  }, []);

  // Loading State Management
  const setTextLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({ ...prev, isTextLoading: loading }));
  }, []);

  const setImageLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({ ...prev, isImageLoading: loading }));
  }, []);

  // Background Management
  const setBackground = useCallback((type: 'generated' | 'uploaded', url: string | null) => {
    if (type === 'generated') {
      setGeneratedBackground(url);
    } else {
      setUploadedBackground(url);
    }
  }, []);

  // Error Management
  const setError = useCallback((error: string | null) => {
    setApiError(error);
  }, []);

  // Template Management
  const saveTemplate = useCallback(async (templateData: Omit<StoreTemplate, 'id' | 'createdAt'>) => {
    try {
      const newTemplate: StoreTemplate = {
        ...templateData,
        id: `template_${Date.now()}`,
        createdAt: new Date()
      };
      
      setTemplates(prev => [...prev, newTemplate]);
      
      // Compress and save to localStorage with size management
      const savedTemplates = JSON.parse(localStorage.getItem('seasonalStoreTemplates') || '[]');
      
      // Add new template
      savedTemplates.push(newTemplate);
      
      // Clean up old templates if we have too many (keep last 10)
      if (savedTemplates.length > 10) {
        savedTemplates.sort((a: StoreTemplate, b: StoreTemplate) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        savedTemplates.splice(10); // Keep only the 10 most recent
      }
      
      // Try to save with compression
      try {
        const compressedData = JSON.stringify(savedTemplates);
        localStorage.setItem('seasonalStoreTemplates', compressedData);
        console.log('💾 Template saved:', newTemplate.name);
      } catch (storageError) {
        // If still too large, try to save without the largest images
        console.warn('Storage quota exceeded, trying to save with compressed images...');
        
        const compressedTemplates = savedTemplates.map((template: StoreTemplate) => ({
          ...template,
          // Compress large base64 images by reducing quality
          generatedBackground: template.generatedBackground ? 
            template.generatedBackground.length > 100000 ? 
              'COMPRESSED_IMAGE' : template.generatedBackground : null,
          uploadedBackground: template.uploadedBackground ? 
            template.uploadedBackground.length > 100000 ? 
              'COMPRESSED_IMAGE' : template.uploadedBackground : null,
          // Compress product images
          products: template.products.map(product => ({
            ...product,
            image: product.image.length > 50000 ? 'COMPRESSED_IMAGE' : product.image
          })),
          // Compress floating asset images
          floatingAssets: template.floatingAssets.map(asset => ({
            ...asset,
            src: asset.src && asset.src.length > 50000 ? 'COMPRESSED_IMAGE' : asset.src
          }))
        }));
        
        localStorage.setItem('seasonalStoreTemplates', JSON.stringify(compressedTemplates));
        console.log('💾 Template saved with compression:', newTemplate.name);
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }, []);

  const loadTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Load template data into current state
    setProducts(template.products);
    setFloatingAssets(template.floatingAssets);
    setCurrentSeason(template.currentSeason);
    setFixedTextStyles(template.fixedTextStyles);
    setLogoAsset(template.logoAsset);
    setGeneratedBackground(template.generatedBackground);
    setUploadedBackground(template.uploadedBackground);
    
    console.log('📂 Template loaded:', template.name);
  }, [templates]);

  const deleteTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    
    // Update localStorage
    const savedTemplates = JSON.parse(localStorage.getItem('seasonalStoreTemplates') || '[]');
    const updatedTemplates = savedTemplates.filter((t: StoreTemplate) => t.id !== templateId);
    localStorage.setItem('seasonalStoreTemplates', JSON.stringify(updatedTemplates));
    
    console.log('🗑️ Template deleted:', templateId);
  }, []);

  // Clear old templates to free up space
  const clearOldTemplates = useCallback(() => {
    const savedTemplates = JSON.parse(localStorage.getItem('seasonalStoreTemplates') || '[]');
    
    // Keep only the 5 most recent templates
    const sortedTemplates = savedTemplates.sort((a: StoreTemplate, b: StoreTemplate) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const recentTemplates = sortedTemplates.slice(0, 5);
    localStorage.setItem('seasonalStoreTemplates', JSON.stringify(recentTemplates));
    setTemplates(recentTemplates);
    
    console.log('🧹 Cleared old templates, kept 5 most recent');
  }, []);

  // Check storage usage
  const getStorageUsage = useCallback(() => {
    try {
      const data = localStorage.getItem('seasonalStoreTemplates') || '[]';
      const sizeInBytes = new Blob([data]).size;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
      console.log(`📊 Storage usage: ${sizeInMB} MB`);
      return { sizeInBytes, sizeInMB };
    } catch (error) {
      console.error('Failed to check storage usage:', error);
      return { sizeInBytes: 0, sizeInMB: '0' };
    }
  }, []);

  // Load templates from localStorage on mount
  useEffect(() => {
    try {
      const savedTemplates = JSON.parse(localStorage.getItem('seasonalStoreTemplates') || '[]');
      setTemplates(savedTemplates);
      console.log('📂 Loaded templates from localStorage:', savedTemplates.length);
    } catch (error) {
      console.error('Failed to load templates from localStorage:', error);
    }
  }, []);

  // Update header message when theme changes (only if it's still the default message)
  useEffect(() => {
    setFixedTextStyles(prev => {
      // Check if the current message is still the default theme message
      const isDefaultMessage = Object.values(allThemes).some(theme => 
        theme.aiMessage === prev.headerMessage.content
      );
      
      if (isDefaultMessage) {
        return {
          ...prev,
          headerMessage: {
            ...prev.headerMessage,
            content: allThemes[currentSeason].aiMessage
          }
        };
      }
      return prev;
    });
  }, [currentSeason, allThemes]);

  return {
    // State
    allThemes,
    currentSeason,
    theme,
    products,
    floatingAssets,
    availableAssets,
    fixedTextStyles,
    logoAsset,
    generatedBackground,
    uploadedBackground,
    editorState,
    loadingState,
    apiError,
    templates,
    
    // Actions
    setCurrentSeason,
    setProducts,
    setAvailableAssets,
    setFixedTextStyles,
    setLogoAsset,
    setBackground,
    setError,
    
    // Product Management
    addProduct,
    updateProduct,
    deleteProduct,
    
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
    
    // Template Management
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    clearOldTemplates,
    getStorageUsage,
  };
};

