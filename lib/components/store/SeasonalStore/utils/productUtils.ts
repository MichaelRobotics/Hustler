import type { Product, LegacyTheme } from '../types';
import { truncateDescription } from './index';
import { getTextColorsFromCardClass } from './colors';

// Re-export for backward compatibility
export { getTextColorsFromCardClass };

/**
 * Apply theme styles to products that don't have their own card styles
 * This is the SINGLE source of truth for applying theme styles to products
 * 
 * @param products - Array of products to process
 * @param theme - The theme to apply styles from
 * @param options - Options for style application
 * @returns Products with theme styles applied where needed
 */
export const applyThemeStylesToProducts = (
  products: Product[],
  theme: LegacyTheme,
  options: {
    /** If true, only apply styles to products without existing styles */
    preserveExisting?: boolean;
    /** If true, force apply all theme styles regardless of existing */
    forceApply?: boolean;
  } = {}
): Product[] => {
  const { preserveExisting = true, forceApply = false } = options;

  if (!products || products.length === 0) return products;
  if (!theme) return products;

  const textColors = getTextColorsFromCardClass(theme.card, theme.text);

  return products.map((product) => {
    // If preserving existing and product has all card styles, skip
    if (
      preserveExisting &&
      !forceApply &&
      product.cardClass &&
      product.titleClass &&
      product.descClass
    ) {
      return product;
    }

    // Apply theme styles (only to missing properties if preserveExisting)
    if (forceApply) {
      return {
        ...product,
        cardClass: theme.card,
        titleClass: textColors.titleClass,
        descClass: textColors.descClass,
        buttonClass: theme.accent,
      };
    }

    return {
      ...product,
      cardClass: product.cardClass || theme.card,
      titleClass: product.titleClass || textColors.titleClass,
      descClass: product.descClass || textColors.descClass,
      buttonClass: product.buttonClass || theme.accent,
    };
  });
};

/**
 * Filter template products against Market Stall resources
 * Returns only products that exist in the current Market Stall
 * 
 * This is the SINGLE source of truth for product filtering
 */
export const filterProductsAgainstMarketStall = async (
  templateProducts: Product[],
  marketStallResources: any[],
  theme?: LegacyTheme
): Promise<Product[]> => {
  if (!templateProducts || templateProducts.length === 0) {
    return [];
  }

  if (!marketStallResources || marketStallResources.length === 0) {
    console.log('🎨 [filterProductsAgainstMarketStall] No Market Stall resources - returning empty');
    return [];
  }

  console.log(
    `🎨 [filterProductsAgainstMarketStall] Filtering ${templateProducts.length} products against ${marketStallResources.length} resources`
  );

  // Create a map of Market Stall resources for quick lookup
  // Key: resource ID or whopProductId
  const marketStallResourceMap = new Map<string, any>();
  const marketStallResourceByWhopId = new Map<string, any>();
  
  for (const resource of marketStallResources) {
    marketStallResourceMap.set(resource.id, resource);
    if (resource.whopProductId) {
      marketStallResourceByWhopId.set(resource.whopProductId, resource);
    }
  }

  // Build filtered products in TEMPLATE ORDER (preserve template product order)
  const filteredProducts: Product[] = [];
  const skippedProducts: string[] = [];
  const matchedResourceIds = new Set<string>();

  // Iterate through template products in their original order
  for (const templateProduct of templateProducts) {
    let matchedResource: any | null = null;

    // Strategy 1: Match by resource ID (if product.id starts with "resource-")
    if (typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-')) {
      const resourceId = templateProduct.id.replace('resource-', '');
      matchedResource = marketStallResourceMap.get(resourceId);
    }

    // Strategy 2: Match by whopProductId (for synced Whop products)
    if (!matchedResource && templateProduct.whopProductId) {
      matchedResource = marketStallResourceByWhopId.get(templateProduct.whopProductId);
    }

    // Strategy 3: Match by exact name (fallback)
    if (!matchedResource && templateProduct.name) {
      const normalizedTemplateName = templateProduct.name.toLowerCase().trim();
      matchedResource = marketStallResources.find((resource: any) => {
        if (!resource.name) return false;
        return resource.name.toLowerCase().trim() === normalizedTemplateName;
      }) || null;
    }

    // If we found a matching Market Stall resource, merge them
    if (matchedResource) {
      matchedResourceIds.add(matchedResource.id);
      
      const mergedProduct: Product = {
        // Use Market Stall resource ID format
        id: `resource-${matchedResource.id}`,
        // Prefer template data, fallback to Market Stall
        name: templateProduct.name || matchedResource.name,
        description:
          templateProduct.description ||
          truncateDescription(matchedResource.description || ''),
        price:
          templateProduct.price !== undefined && templateProduct.price !== null
            ? templateProduct.price
            : parseFloat(matchedResource.price || '0'),
        buttonLink: templateProduct.buttonLink || matchedResource.link || '',
        whopProductId: matchedResource.whopProductId,

        // Preserve template product styling
        cardClass: templateProduct.cardClass,
        buttonClass: templateProduct.buttonClass,
        buttonText: templateProduct.buttonText || 'VIEW DETAILS',
        buttonAnimColor: templateProduct.buttonAnimColor,
        titleClass: templateProduct.titleClass,
        descClass: templateProduct.descClass,
        badge: templateProduct.badge ?? null,
        promoDiscountType: templateProduct.promoDiscountType,
        promoDiscountAmount: templateProduct.promoDiscountAmount,
        promoLimitQuantity: templateProduct.promoLimitQuantity,
        promoQuantityLeft: templateProduct.promoQuantityLeft,
        promoShowFireIcon: templateProduct.promoShowFireIcon,
        salesCount: templateProduct.salesCount,
        showSalesCount: templateProduct.showSalesCount,
        starRating: templateProduct.starRating,
        reviewCount: templateProduct.reviewCount,
        showRatingInfo: templateProduct.showRatingInfo,

        // Use template image if available, otherwise Market Stall image, fallback to default placeholder
        image:
          templateProduct.image ||
          templateProduct.imageAttachmentUrl ||
          matchedResource.image ||
          'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
        imageAttachmentId: templateProduct.imageAttachmentId || null,
        imageAttachmentUrl:
          templateProduct.imageAttachmentUrl ||
          templateProduct.image ||
          matchedResource.image ||
          'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',

        // Keep template container asset if available
        containerAsset: templateProduct.containerAsset,

        // Include type, storageUrl, and productImages from Market Stall resource
        // Prefer template product type if it exists, otherwise use resource type
        // If resource has storageUrl but no type, infer FILE type
        type: templateProduct.type || matchedResource.type || (matchedResource.storageUrl ? 'FILE' : 'LINK'),
        storageUrl: templateProduct.storageUrl || matchedResource.storageUrl,
        productImages: templateProduct.productImages || (Array.isArray(matchedResource.productImages) ? matchedResource.productImages : undefined),
      };

      filteredProducts.push(mergedProduct);
    } else {
      // Template product doesn't exist in Market Stall
      skippedProducts.push(templateProduct.name || 'Unknown');
    }
  }

  console.log(
    `🎨 [filterProductsAgainstMarketStall] Result: ${filteredProducts.length} matched, ${skippedProducts.length} skipped`
  );

  // Apply theme styles if theme is provided
  if (theme && filteredProducts.length > 0) {
    return applyThemeStylesToProducts(filteredProducts, theme, {
      preserveExisting: true,
    });
  }

  return filteredProducts;
};

/**
 * Convert Market Stall resources to products with theme styling
 */
export const convertResourcesToProducts = (
  resources: any[],
  theme: LegacyTheme,
  options: {
    excludeIds?: Set<string>;
    category?: string;
  } = {}
): Product[] => {
  const { excludeIds = new Set(), category = 'PAID' } = options;

  const filteredResources = resources.filter(
    (resource) =>
      resource.category === category &&
      resource.name &&
      resource.price &&
      !excludeIds.has(resource.id)
  );

  // Sort by displayOrder to preserve Market Stall order
  // Resources with displayOrder come first, sorted by displayOrder ASC
  // Resources without displayOrder come after, maintaining their original order
  const sortedResources = [...filteredResources].sort((a, b) => {
    if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
      return a.displayOrder - b.displayOrder;
    }
    if (a.displayOrder !== undefined) return -1;
    if (b.displayOrder !== undefined) return 1;
    return 0; // Maintain original order for resources without displayOrder
  });

  const textColors = getTextColorsFromCardClass(theme.card, theme.text);

  return sortedResources.map((resource) => ({
    id: `resource-${resource.id}`,
    name: resource.name,
    description: truncateDescription(resource.description || ''),
    price: parseFloat(resource.price) || 0,
    image:
      resource.image ||
      'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
    imageAttachmentUrl: resource.image || 'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp',
    buttonText: 'VIEW DETAILS',
    buttonLink: resource.link || '',
    whopProductId: resource.whopProductId,
    type: resource.type, // Include type (LINK or FILE)
    storageUrl: resource.storageUrl, // Include storageUrl for FILE type
    productImages: Array.isArray(resource.productImages) ? resource.productImages : undefined, // Include productImages array
    cardClass: theme.card,
    titleClass: textColors.titleClass,
    descClass: textColors.descClass,
    buttonClass: theme.accent,
  }));
};

/**
 * Sanitize product content - normalize HTML and strip problematic tags
 */
export const sanitizeProductContent = (html?: string | null): string | undefined => {
  if (!html) return html || undefined;
  
  // Strip inline color tags that might cause issues
  let sanitized = html;
  
  // Remove inline style color attributes
  sanitized = sanitized.replace(/style="[^"]*color:[^"]*"/gi, '');
  
  // Normalize whitespace
  sanitized = sanitized.trim();
  
  return sanitized || undefined;
};

/**
 * Sanitize an array of products
 */
export const sanitizeProducts = (products: Product[]): Product[] => {
  return products.map((product) => ({
    ...product,
    name: sanitizeProductContent(product.name) || product.name,
    description: sanitizeProductContent(product.description) || product.description,
  }));
};

/**
 * Normalize products for snapshot comparison
 * Ensures consistent structure for comparing saved vs current state
 */
export const normalizeProductsForSnapshot = (products: Product[]): any[] => {
  return products.map((product) => {
    // Normalize badge - treat null, undefined, and empty object as equivalent
    let normalizedBadge = product.badge;
    if (
      normalizedBadge === null ||
      normalizedBadge === undefined ||
      (typeof normalizedBadge === 'object' &&
        Object.keys(normalizedBadge).length === 0)
    ) {
      normalizedBadge = null;
    }

    return {
      ...product,
      badge: normalizedBadge,
      // Normalize other potentially inconsistent fields
      description: product.description || '',
      buttonText: product.buttonText || 'VIEW DETAILS',
      buttonLink: product.buttonLink || '',
    };
  });
};











