import { useEffect, useState, useCallback, useRef } from 'react';
import { convertResourcesToProducts } from '../utils/productUtils';
import { getButtonAnimColor } from '../utils/buttonAnimColor';
import type { LegacyTheme } from '../types';

interface UseResourceLibraryProductsProps {
  experienceId?: string;
  allResources: any[];
  deletedResourceLibraryProducts: Set<string>;
  legacyTheme: LegacyTheme;
  products: any[];
  setProducts: (products: any[] | ((prev: any[]) => any[])) => void;
}

export function useResourceLibraryProducts({
  experienceId,
  allResources,
  deletedResourceLibraryProducts,
  legacyTheme,
  products,
  setProducts,
}: UseResourceLibraryProductsProps) {
  const [resourceLibraryProducts, setResourceLibraryProducts] = useState<any[]>([]);
  const [hasLoadedResourceLibrary, setHasLoadedResourceLibrary] = useState(false);
  const lastProcessedProductsRef = useRef<string>('');
  
  // Convert Set to sorted array for stable dependency comparison
  const deletedResourceLibraryProductsArray = Array.from(deletedResourceLibraryProducts).sort().join(',');

  // Load ResourceLibrary products on mount and when theme changes
  useEffect(() => {
    if (!experienceId || allResources.length === 0 || !legacyTheme) return;
    
    const convertedProducts = convertResourcesToProducts(allResources, legacyTheme, {
      excludeIds: deletedResourceLibraryProducts,
      category: 'PAID'
    });
    
    const productsWithAnimColor = convertedProducts.map(product => ({
      ...product,
      buttonAnimColor: getButtonAnimColor(legacyTheme.accent),
    }));
    
    // Only update if the products actually changed
    setResourceLibraryProducts((prev) => {
      const prevSignature = JSON.stringify(prev.map(p => p.id).sort());
      const newSignature = JSON.stringify(productsWithAnimColor.map(p => p.id).sort());
      
      if (prevSignature !== newSignature) {
        return productsWithAnimColor;
      }
      return prev;
    });
    
    setHasLoadedResourceLibrary(true);
  }, [experienceId, allResources, deletedResourceLibraryProductsArray, legacyTheme, deletedResourceLibraryProducts]);

  // Restore buttonLinks from allResources if missing
  useEffect(() => {
    const resourceLibraryProducts = products.filter(product => 
      typeof product.id === 'string' && product.id.startsWith('resource-')
    );
    
    if (resourceLibraryProducts.length === 0) {
      return;
    }
    
    // Create a signature of current products to detect if we've already processed this state
    const currentSignature = JSON.stringify(
      resourceLibraryProducts.map(p => ({ id: p.id, buttonLink: p.buttonLink }))
    );
    
    // Skip if we've already processed this exact state
    if (lastProcessedProductsRef.current === currentSignature) {
      return;
    }
    
    // Check if any products need buttonLink restoration
    const needsRestoration = resourceLibraryProducts.some(product => 
      !product.buttonLink && typeof product.id === 'string' && product.id.startsWith('resource-')
    );
    
    if (!needsRestoration) {
      lastProcessedProductsRef.current = currentSignature;
      return;
    }
    
    const productsWithLinks = resourceLibraryProducts.map(product => {
      if (!product.buttonLink && typeof product.id === 'string' && product.id.startsWith('resource-')) {
        const resourceId = product.id.replace('resource-', '');
        const matchingResource = allResources.find(r => r.id === resourceId);
        
        if (matchingResource?.link) {
          return {
            ...product,
            buttonLink: matchingResource.link
          };
        }
      }
      return product;
    });
    
    // Only update if there are actual changes
    const hasUpdates = productsWithLinks.some((p: any) => 
      p.buttonLink && !resourceLibraryProducts.find((rp: any) => rp.id === p.id)?.buttonLink
    );
    
    if (hasUpdates) {
      setProducts((prev: any[]) => {
        // Create a map for quick lookup
        const linkMap = new Map(productsWithLinks.map((p: any) => [p.id, p.buttonLink]));
        
        // Only update products that actually need updates
        let hasChanges = false;
        const updated = prev.map((product: any) => {
          const newLink = linkMap.get(product.id);
          if (newLink && !product.buttonLink) {
            hasChanges = true;
            return { ...product, buttonLink: newLink };
          }
          return product;
        });
        
        // Only return new array if there are actual changes
        if (hasChanges) {
          // Update the ref signature after successful update
          const updatedSignature = JSON.stringify(
            updated.filter(p => typeof p.id === 'string' && p.id.startsWith('resource-'))
              .map(p => ({ id: p.id, buttonLink: p.buttonLink }))
          );
          lastProcessedProductsRef.current = updatedSignature;
          return updated;
        }
        return prev;
      });
    } else {
      // Mark as processed even if no updates needed
      lastProcessedProductsRef.current = currentSignature;
    }
    
    // Update resourceLibraryProducts state only if there are changes
    // Use functional update to avoid dependency on resourceLibraryProducts state
    setResourceLibraryProducts((prev: any[]) => {
      const resourceLibraryHasUpdates = productsWithLinks.some((p: any) => 
        p.buttonLink && !prev.find((rp: any) => rp.id === p.id)?.buttonLink
      );
      
      if (resourceLibraryHasUpdates) {
        return productsWithLinks;
      }
      return prev;
    });
  }, [products, allResources, setProducts]);

  const handleDeleteResourceLibraryProduct = useCallback((productId: string) => {
    const resourceId = productId.replace('resource-', '');
    setProducts((prev: any[]) => prev.filter((product: any) => product.id !== productId));
    return resourceId;
  }, [setProducts]);

  return {
    resourceLibraryProducts,
    hasLoadedResourceLibrary,
    handleDeleteResourceLibraryProduct,
  };
}


