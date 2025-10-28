import { useEffect, useState } from 'react';

interface AutoAddResourcesHookProps {
  allResources: any[];
  hasLoadedResourceLibrary: boolean;
  currentSeason: string;
  themeProducts: Record<string, any[]>;
  deletedResourceLibraryProducts: Record<string, Set<string>>;
  legacyTheme: any;
  setThemeProducts: (fn: (prev: Record<string, any[]>) => Record<string, any[]>) => void;
  handleProductImageUpload: (productId: number | string, file: File) => Promise<void>;
  templateResourceLibraryProductIds?: string[]; // ResourceLibrary product IDs from loaded template
  setIsStoreContentReady?: (ready: boolean) => void; // Callback to notify when store content is ready
}

export const useAutoAddResources = ({
  allResources,
  hasLoadedResourceLibrary,
  currentSeason,
  themeProducts,
  deletedResourceLibraryProducts,
  legacyTheme,
  setThemeProducts,
  handleProductImageUpload,
  templateResourceLibraryProductIds = [],
  setIsStoreContentReady,
}: AutoAddResourcesHookProps) => {
  const [hasAutoAddedResources, setHasAutoAddedResources] = useState(false);
  const [isAutoAddComplete, setIsAutoAddComplete] = useState(false);

  // Handle template loading - add only ResourceLibrary products that exist in the library
  useEffect(() => {
    if (templateResourceLibraryProductIds.length > 0 && allResources.length > 0) {
      console.log(`[useAutoAddResources] Loading legacy template with ResourceLibrary product IDs:`, templateResourceLibraryProductIds);
      
      // Find which ResourceLibrary products from the template still exist in the library
      const existingResources = allResources.filter(resource => 
        templateResourceLibraryProductIds.includes(resource.id) &&
        resource.category === "PAID" && 
        resource.name && 
        resource.price
      );
      
      console.log(`[useAutoAddResources] Found ${existingResources.length} existing resources out of ${templateResourceLibraryProductIds.length} template products`);
      
      if (existingResources.length > 0) {
        // Convert existing resources to products and add to theme
        const templateProducts = existingResources.map(resource => ({
          id: `resource-${resource.id}`,
          name: resource.name,
          description: resource.description || '',
          price: parseFloat(resource.price) || 0,
          image: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
          buttonText: 'VIEW DETAILS',
          buttonLink: resource.link || '',
          whopProductId: resource.whopProductId, // Track Whop product ID for synced products
          cardClass: legacyTheme.card,
          titleClass: legacyTheme.text,
          descClass: legacyTheme.text,
          buttonClass: legacyTheme.accent,
        }));
        
        // Add template products to theme
        setThemeProducts(prev => ({
          ...prev,
          [currentSeason]: templateProducts
        }));
        
        console.log(`[useAutoAddResources] Successfully loaded ${templateProducts.length} legacy template products`);
      } else {
        console.log(`[useAutoAddResources] No template products found in ResourceLibrary`);
      }
    }
  }, [templateResourceLibraryProductIds, allResources, currentSeason, legacyTheme, setThemeProducts]);

  // Auto-add all available resources to theme on initial load
  useEffect(() => {
    // Only run this once when SeasonalStore loads initially
    if (!hasLoadedResourceLibrary && !hasAutoAddedResources && allResources.length > 0) {
      console.log(`[useAutoAddResources] Auto-adding all available resources to theme on initial load`);
      
      // Get all paid resources that aren't already in the theme
      const paidResources = allResources.filter(resource => 
        resource.category === "PAID" && 
        resource.name && 
        resource.price &&
        !(deletedResourceLibraryProducts[currentSeason]?.has(resource.id))
      );
      
      // Check which resources are already in the theme
      const currentThemeProducts = themeProducts[currentSeason] || [];
      const existingResourceIds = new Set(
        currentThemeProducts
          .filter(p => typeof p.id === 'string' && p.id.startsWith('resource-'))
          .map(p => String(p.id).replace('resource-', ''))
      );
      
      // Find resources that aren't in the theme yet
      const resourcesToAdd = paidResources.filter(resource => 
        !existingResourceIds.has(resource.id)
      );
      
      if (resourcesToAdd.length > 0) {
        console.log(`[useAutoAddResources] Adding ${resourcesToAdd.length} resources to theme:`, resourcesToAdd.map(r => r.name));
        
        // Convert resources to products and add to theme
        const newProducts = resourcesToAdd.map(resource => ({
          id: `resource-${resource.id}`,
          name: resource.name,
          description: resource.description || '',
          price: parseFloat(resource.price) || 0,
          image: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
          buttonText: 'VIEW DETAILS',
          buttonLink: resource.link || '',
          whopProductId: resource.whopProductId, // Track Whop product ID for synced products
          cardClass: legacyTheme.card,
          titleClass: legacyTheme.text,
          descClass: legacyTheme.text,
          buttonClass: legacyTheme.accent,
        }));
        
        // Add all new products to theme
        setThemeProducts(prev => ({
          ...prev,
          [currentSeason]: [...(prev[currentSeason] || []), ...newProducts]
        }));
        
        console.log(`[useAutoAddResources] Successfully added ${newProducts.length} resources to theme`);
      } else {
        console.log(`[useAutoAddResources] All available resources are already in theme`);
      }
      
      setHasAutoAddedResources(true);
      setIsAutoAddComplete(true);
      
      // Notify that store content is ready
      if (setIsStoreContentReady) {
        setIsStoreContentReady(true);
        console.log(`[useAutoAddResources] Store content ready - auto-add complete`);
      }
      
      console.log(`[useAutoAddResources] Auto-add process complete`);
    }
  }, [allResources, hasLoadedResourceLibrary, hasAutoAddedResources, currentSeason, themeProducts, deletedResourceLibraryProducts, legacyTheme, setThemeProducts, handleProductImageUpload, setIsStoreContentReady]);

  return {
    hasAutoAddedResources,
    isAutoAddComplete,
  };
};
