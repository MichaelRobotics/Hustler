import { useCallback } from 'react';
import type { LegacyTheme } from '../types';

interface UseProductHandlersProps {
  setProducts: (products: any[] | ((prev: any[]) => any[])) => void;
  legacyTheme: LegacyTheme;
  handleDeleteResourceLibraryProduct: (productId: string) => void;
}

export function useProductHandlers({
  setProducts,
  legacyTheme,
  handleDeleteResourceLibraryProduct,
}: UseProductHandlersProps) {
  const addProduct = useCallback(() => {
    const newProduct = {
      id: Date.now(),
      name: 'New Product',
      description: 'Product description',
      price: 0,
      image: '',
      buttonText: 'VIEW DETAILS',
      buttonLink: '',
      cardClass: legacyTheme.card,
      titleClass: legacyTheme.text,
      descClass: legacyTheme.text,
      buttonClass: legacyTheme.accent,
    };
    
    setProducts((prev: any[]) => [newProduct, ...prev]);
  }, [legacyTheme, setProducts]);

  const updateProduct = useCallback((id: number | string, updates: any) => {
    setProducts((prev: any[]) =>
      prev.map((p: any) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, [setProducts]);

  const deleteProduct = useCallback((productId: number | string) => {
    if (typeof productId === 'string' && productId.startsWith('resource-')) {
      handleDeleteResourceLibraryProduct(productId);
    } else {
      setProducts((prev: any[]) => prev.filter((product: any) => product.id !== productId));
    }
  }, [handleDeleteResourceLibraryProduct, setProducts]);

  const handleAddToTemplate = useCallback(async (resource: any) => {
    // Use resource image directly (already synced from Whop SDK in sync process)
    const productImage = resource.image || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';
    
    const newProduct = {
      id: `resource-${resource.id}`,
      name: resource.name,
      description: resource.description || '',
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
    
    setProducts((prev: any[]) => [newProduct, ...prev]);
  }, [legacyTheme, setProducts]);

  const handleRemoveFromTemplate = useCallback((resource: any) => {
    const productId = `resource-${resource.id}`;
    setProducts((prev: any[]) => prev.filter((p: any) => p.id !== productId));
  }, [setProducts]);

  const isResourceInTemplate = useCallback((resourceId: string) => {
    // This will be called with products from the component
    return false; // Placeholder - will be overridden
  }, []);

  return {
    addProduct,
    updateProduct,
    deleteProduct,
    handleAddToTemplate,
    handleRemoveFromTemplate,
  };
}

