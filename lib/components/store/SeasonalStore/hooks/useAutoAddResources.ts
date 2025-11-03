import { useEffect, useState } from 'react';
import { truncateDescription } from '../utils';

interface AutoAddResourcesHookProps {
  allResources: any[]; // IMPORTANT: MUST contain ONLY Market Stall (global ResourceLibrary) products
  hasLoadedResourceLibrary: boolean;
  currentSeason: string;
  themeProducts: Record<string, any[]>;
  deletedResourceLibraryProducts: Record<string, Set<string>>;
  legacyTheme: any;
  setThemeProducts: (fn: (prev: Record<string, any[]>) => Record<string, any[]>) => void;
  handleProductImageUpload: (productId: number | string, file: File) => Promise<void>;
  templateResourceLibraryProductIds?: string[]; // Market Stall ResourceLibrary product IDs from loaded template
  setIsStoreContentReady?: (ready: boolean) => void; // Callback to notify when store content is ready
  isTemplateLoaded?: boolean; // Check if any template is loaded internally
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
  isTemplateLoaded = false,
}: AutoAddResourcesHookProps) => {
  const [hasAutoAddedResources, setHasAutoAddedResources] = useState(false);
  const [isAutoAddComplete, setIsAutoAddComplete] = useState(false);

  // Handle template loading - add ONLY Market Stall (ResourceLibrary) products that exist in the library
  useEffect(() => {
    if (templateResourceLibraryProductIds.length > 0 && allResources.length > 0) {
      console.log(`[useAutoAddResources] Loading legacy template with Market Stall ResourceLibrary product IDs:`, templateResourceLibraryProductIds);
      
      // Find which Market Stall ResourceLibrary products from the template still exist in the library
      // IMPORTANT: Only use Market Stall (global ResourceLibrary) products, not funnel-specific
      // allResources prop contains ONLY Market Stall (global ResourceLibrary) products
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
          description: truncateDescription(resource.description || ''),
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

  // Auto-add ONLY Market Stall (ResourceLibrary) products to theme on initial load
  useEffect(() => {
    // Run this when:
    // 1. Market Stall resources are available
    // 2. We haven't already auto-added resources for this session
    // IMPORTANT: allResources prop contains ONLY Market Stall (global ResourceLibrary) products
    if (!hasLoadedResourceLibrary && !hasAutoAddedResources && allResources.length > 0) {
      console.log(`[useAutoAddResources] Auto-adding Market Stall products to theme on initial load`);
      
      // Get all PAID Market Stall resources that aren't already in the theme
      // allResources comes from Market Stall (global ResourceLibrary context)
      const paidMarketStallResources = allResources.filter(resource => 
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
      
      // Find Market Stall resources that aren't in the theme yet
      const marketStallResourcesToAdd = paidMarketStallResources.filter(resource => 
        !existingResourceIds.has(resource.id)
      );
      
      if (marketStallResourcesToAdd.length > 0) {
        console.log(`[useAutoAddResources] Adding ${marketStallResourcesToAdd.length} Market Stall products to theme:`, marketStallResourcesToAdd.map(r => r.name));
        
        // Debug: Log resource link data
        marketStallResourcesToAdd.forEach(resource => {
          console.log(`[useAutoAddResources] 🔍 Resource "${resource.name}" link data:`, {
            hasLink: !!resource.link,
            link: resource.link,
            linkType: typeof resource.link,
            linkLength: resource.link?.length || 0,
            resourceId: resource.id,
            fullResource: resource
          });
        });
        
        // Convert Market Stall resources to products and add to theme
        const newProducts = marketStallResourcesToAdd.map(resource => {
          const buttonLink = resource.link || '';
          console.log(`[useAutoAddResources] 🔍 Creating product from resource "${resource.name}":`, {
            resourceId: resource.id,
            resourceLink: resource.link,
            assignedButtonLink: buttonLink,
            hasButtonLink: !!buttonLink
          });
          
          return {
            id: `resource-${resource.id}`,
            name: resource.name,
            description: truncateDescription(resource.description || ''),
            price: parseFloat(resource.price) || 0,
            image: resource.image || 'https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
            buttonText: 'VIEW DETAILS',
            buttonLink: buttonLink,
            whopProductId: resource.whopProductId, // Track Whop product ID for synced products
            cardClass: legacyTheme.card,
            titleClass: legacyTheme.text,
            descClass: legacyTheme.text,
            buttonClass: legacyTheme.accent,
          };
        });
        
        // Debug: Log created products
        console.log(`[useAutoAddResources] 🔍 Created products with buttonLink:`, newProducts.map(p => ({
          id: p.id,
          name: p.name,
          hasButtonLink: !!p.buttonLink,
          buttonLink: p.buttonLink
        })));
        
        // Add all new products to theme
        setThemeProducts(prev => ({
          ...prev,
          [currentSeason]: [...(prev[currentSeason] || []), ...newProducts]
        }));
        
        console.log(`[useAutoAddResources] Successfully added ${newProducts.length} Market Stall products to theme`);
      } else {
        console.log(`[useAutoAddResources] All available Market Stall products are already in theme`);
      }
      
      setHasAutoAddedResources(true);
      setIsAutoAddComplete(true);
      
      // Notify that store content is ready
      if (setIsStoreContentReady) {
        setIsStoreContentReady(true);
        console.log(`[useAutoAddResources] Store content ready - Market Stall auto-add complete`);
      }
      
      console.log(`[useAutoAddResources] Market Stall auto-add process complete`);
    } else if (isTemplateLoaded) {
      console.log(`[useAutoAddResources] Template loaded internally - skipping auto-add`);
      // Mark as complete even when template is loaded to prevent future auto-adds
      setIsAutoAddComplete(true);
      if (setIsStoreContentReady) {
        setIsStoreContentReady(true);
      }
    }
  }, [isTemplateLoaded, allResources, hasLoadedResourceLibrary, hasAutoAddedResources, currentSeason, themeProducts, deletedResourceLibraryProducts, legacyTheme, setThemeProducts, handleProductImageUpload, setIsStoreContentReady]);

  return {
    hasAutoAddedResources,
    isAutoAddComplete,
  };
};
