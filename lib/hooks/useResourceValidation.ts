import { useMemo } from 'react';

interface Resource {
  id: string;
  name: string;
  category: 'PAID' | 'FREE_VALUE';
  type: 'AFFILIATE' | 'MY_PRODUCTS';
  price?: string;
  link?: string;
  storageUrl?: string;
  whopProductId?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ValidationActions {
  validateResource: (resource: Partial<Resource>, allResources: Resource[], editingId?: string) => ValidationResult;
  isNameAvailable: (name: string, allResources: Resource[], editingId?: string) => boolean;
}

export const useResourceValidation = (): ValidationActions => {
  const isNameAvailable = (name: string, allResources: Resource[], editingId?: string): boolean => {
    if (!name?.trim()) return false;
    
    return !allResources.some((resource) => {
      if (editingId && resource.id === editingId) return false; // Skip current resource when editing
      const normalizedInputName = name.trim().replace(/\s+/g, ' ').toLowerCase();
      const normalizedExistingName = resource.name.trim().replace(/\s+/g, ' ').toLowerCase();
      return normalizedExistingName === normalizedInputName;
    });
  };

  const validateResource = (
    resource: Partial<Resource>, 
    allResources: Resource[], 
    editingId?: string
  ): ValidationResult => {
    const errors: string[] = [];

    // Name validation
    if (!resource.name?.trim()) {
      errors.push('Name is required');
    } else if (!isNameAvailable(resource.name, allResources, editingId)) {
      errors.push('Product name already exists. Please choose a different name.');
    }

    // Price validation for paid products
    if (resource.category === 'PAID') {
      if (!resource.price?.trim()) {
        errors.push('Price is required for paid products');
      } else {
        const price = parseFloat(resource.price);
        if (price < 5 || price > 50000) {
          errors.push('Price must be between $5 and $50,000');
        }
      }
    }

    // Link validation for affiliate products
    if (resource.type === 'AFFILIATE' && !resource.link?.trim()) {
      errors.push('Affiliate URL is required');
    }

    // Storage URL validation for owned products that are NOT Whop products
    if (resource.type === 'MY_PRODUCTS' && !resource.whopProductId && !resource.storageUrl?.trim()) {
      errors.push('Digital asset is required for owned products');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  return {
    validateResource,
    isNameAvailable,
  };
};


