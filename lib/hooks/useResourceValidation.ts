import { useMemo } from 'react';

interface Resource {
  id: string;
  name: string;
  type: 'LINK' | 'FILE';
  category: 'PAID' | 'FREE_VALUE';
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
    // For resources with whopProductId, skip $5 minimum (price comes from Whop plans)
    if (resource.category === 'PAID') {
      if (!resource.price?.trim()) {
        errors.push('Price is required for paid products');
      } else {
        const price = parseFloat(resource.price);
        const minPrice = resource.whopProductId ? 0 : 5;
        if (price < minPrice || price > 50000) {
          errors.push(resource.whopProductId 
            ? 'Price must be between $0 and $50,000'
            : 'Price must be between $5 and $50,000');
        }
      }
    }

    // Link validation for LINK type
    if (resource.type === 'LINK' && !resource.link?.trim()) {
      errors.push('Product link is required for LINK type');
    }

    // Storage URL validation for FILE type
    if (resource.type === 'FILE' && !resource.whopProductId && !resource.storageUrl?.trim()) {
      errors.push('File upload is required for FILE type');
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


