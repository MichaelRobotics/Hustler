import { useEffect, useState, useCallback } from 'react';
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
    
    setResourceLibraryProducts(productsWithAnimColor);
    setHasLoadedResourceLibrary(true);
  }, [experienceId, allResources, deletedResourceLibraryProducts, legacyTheme]);

  // Restore buttonLinks from allResources if missing
  useEffect(() => {
    const resourceLibraryProducts = products.filter(product => 
      typeof product.id === 'string' && product.id.startsWith('resource-')
    );
    
    if (resourceLibraryProducts.length > 0) {
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
      
      const hasUpdates = productsWithLinks.some((p: any, idx: number) => 
        p.buttonLink && !resourceLibraryProducts[idx]?.buttonLink
      );
      
      if (hasUpdates) {
        setProducts((prev: any[]) => prev.map((product: any) => {
          const restoredProduct = productsWithLinks.find((p: any) => p.id === product.id);
          if (restoredProduct && restoredProduct.buttonLink && !product.buttonLink) {
            return restoredProduct;
          }
          return product;
        }));
      }
      
      setResourceLibraryProducts(productsWithLinks);
    }
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


