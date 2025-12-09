import { useEffect, useState } from 'react';
import { truncateDescription } from '../utils';

interface AutoAddResourcesHookProps {
  allResources: any[]; // Market Stall (global ResourceLibrary) products
  hasLoadedResourceLibrary: boolean;
  products: any[];
  deletedResourceLibraryProducts: Set<string>; // Template-based deletion tracking (not theme-based)
  legacyTheme: any; // Only used for applying visual styles
  setProducts: (products: any[] | ((prev: any[]) => any[])) => void;
  handleProductImageUpload: (productId: number | string, file: File) => Promise<void>;
  templateResourceLibraryProductIds?: string[]; // Market Stall ResourceLibrary product IDs from loaded template
  isTemplateLoaded?: boolean; // Check if any template is loaded internally (from usePreviewLiveTemplate)
  isLoadingTemplate?: boolean; // Check if a template is currently being loaded (from useSeasonalStoreDatabase)
  hasAnyTemplates?: boolean; // Whether any templates exist in the database (if true, skip auto-add)
  setIsStoreContentReady?: (ready: boolean) => void; // Optional callback to notify when store content is ready
}

export const useAutoAddResources = ({
  allResources,
  hasLoadedResourceLibrary,
  products,
  deletedResourceLibraryProducts,
  legacyTheme,
  setProducts,
  handleProductImageUpload,
  templateResourceLibraryProductIds = [],
  isTemplateLoaded = false,
  isLoadingTemplate = false,
  hasAnyTemplates = false,
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
        // Images are already synced from Whop SDK in the sync process
        const templateProducts = existingResources.map((resource) => {
          const productImage = resource.image || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
          
          return {
          id: `resource-${resource.id}`,
          name: resource.name,
          description: truncateDescription(resource.description || ''),
          price: parseFloat(resource.price) || 0,
            image: productImage,
            imageAttachmentUrl: productImage,
          buttonText: 'VIEW DETAILS',
          buttonLink: resource.link || '',
          whopProductId: resource.whopProductId, // Track Whop product ID for synced products
          type: resource.type, // Include type (LINK or FILE)
          storageUrl: resource.storageUrl, // Include storageUrl for FILE type
          productImages: Array.isArray(resource.productImages) ? resource.productImages : undefined, // Include productImages array
          cardClass: legacyTheme.card,
          titleClass: legacyTheme.text,
          descClass: legacyTheme.text,
          buttonClass: legacyTheme.accent,
          };
        });
        
        // Add template products to theme
        setProducts(() => templateProducts);
        
        console.log(`[useAutoAddResources] Successfully loaded ${templateProducts.length} legacy template products`);
      } else {
        console.log(`[useAutoAddResources] No template products found in ResourceLibrary`);
      }
    }
  }, [templateResourceLibraryProductIds, allResources, legacyTheme, setProducts]);

  // Auto-add ONLY Market Stall (ResourceLibrary) products to theme on initial load
  // IMPORTANT: This should ONLY run on fresh app install (no templates exist)
  useEffect(() => {
    // Skip auto-add while a template is being loaded from the database
    if (isLoadingTemplate) {
      return;
    }
    
    // CRITICAL: Skip auto-add if ANY templates exist in the database
    // Auto-add is ONLY for fresh app installs with no templates
    if (hasAnyTemplates) {
      // Mark as complete to prevent future auto-adds
      if (!hasAutoAddedResources) {
        setHasAutoAddedResources(true);
        setIsAutoAddComplete(true);
      }
      return;
    }
    
    // Also skip if a template is loaded via preview
    if (isTemplateLoaded) {
      setHasAutoAddedResources(true);
      setIsAutoAddComplete(true);
      return;
    }
    
    // Run this ONLY when:
    // 1. NO templates exist (fresh install)
    // 2. Market Stall resources are available
    // 3. We haven't already auto-added resources for this session
    if (!hasLoadedResourceLibrary && !hasAutoAddedResources && allResources.length > 0) {
      
      // Get all PAID Market Stall resources that aren't already in the template
      // allResources comes from Market Stall (global ResourceLibrary context)
      const paidMarketStallResources = allResources.filter(resource => 
        resource.category === "PAID" && 
        resource.name && 
        resource.price &&
        !deletedResourceLibraryProducts.has(resource.id)
      );
      
      // Check which resources are already in the template
      const existingResourceIds = new Set(
        products
          .filter(p => typeof p.id === 'string' && p.id.startsWith('resource-'))
          .map(p => String(p.id).replace('resource-', ''))
      );
      
      // Find Market Stall resources that aren't in the template yet
      const marketStallResourcesToAdd = paidMarketStallResources.filter(resource => 
        !existingResourceIds.has(resource.id)
      );
      
      if (marketStallResourcesToAdd.length > 0) {
        // Convert Market Stall resources to products and add to template (with current theme styles)
        // Images are already synced from Whop SDK in the sync process
        const newProducts = marketStallResourcesToAdd.map((resource) => {
          const productImage = resource.image || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
          
          return {
          id: `resource-${resource.id}`,
          name: resource.name,
          description: truncateDescription(resource.description || ''),
          price: parseFloat(resource.price) || 0,
            image: productImage,
            imageAttachmentUrl: productImage,
          buttonText: 'VIEW DETAILS',
          buttonLink: resource.link || '',
          whopProductId: resource.whopProductId,
          type: resource.type, // Include type (LINK or FILE)
          storageUrl: resource.storageUrl, // Include storageUrl for FILE type
          productImages: Array.isArray(resource.productImages) ? resource.productImages : undefined, // Include productImages array
          cardClass: legacyTheme.card,
          titleClass: legacyTheme.text,
          descClass: legacyTheme.text,
          buttonClass: legacyTheme.accent,
          };
        });
        
        setProducts(prev => [...prev, ...newProducts]);
        console.log(`[useAutoAddResources] Added ${newProducts.length} Market Stall products (fresh install)`);
      }
      
      setHasAutoAddedResources(true);
      setIsAutoAddComplete(true);
    }
  }, [isTemplateLoaded, isLoadingTemplate, hasAnyTemplates, allResources, hasLoadedResourceLibrary, hasAutoAddedResources, products, deletedResourceLibraryProducts, legacyTheme, setProducts, handleProductImageUpload]);

  return {
    hasAutoAddedResources,
    isAutoAddComplete,
  };
};
