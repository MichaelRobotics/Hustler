import { useEffect, useState, useCallback } from 'react';
import { truncateDescription } from '../utils';

interface PreviewLiveTemplateHookProps {
  previewLiveTemplate?: any;
  onTemplateLoaded?: () => void;
  setBackground: (type: 'generated' | 'uploaded', data: any) => Promise<void>;
  setLogoAsset: (asset: any) => void;
  setFixedTextStyles: (styles: any) => void;
  setThemeProducts: (products: any) => void;
  setPromoButton: (button: any) => void;
  allResources?: any[]; // Market Stall resources for filtering
  experienceId?: string; // For fetching Market Stall resources if allResources not provided
}

export const usePreviewLiveTemplate = ({
  previewLiveTemplate,
  onTemplateLoaded,
  setBackground,
  setLogoAsset,
  setFixedTextStyles,
  setThemeProducts,
  setPromoButton,
  allResources = [],
  experienceId,
}: PreviewLiveTemplateHookProps) => {
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);

  // CRITICAL: Filter template products to ONLY include ones that exist in Market Stall
  // Applies template product design (buttons, colors, images, etc.) to matching Market Stall products
  const filterTemplateProducts = useCallback(async (templateProducts: any[]): Promise<any[]> => {
    try {
      // Get Market Stall resources - use provided allResources or fetch from API
      let marketStallResources = allResources;
      
      if (marketStallResources.length === 0 && experienceId) {
        const response = await fetch(`/api/resources?experienceId=${experienceId}`);
        if (response.ok) {
          const data = await response.json();
          marketStallResources = data.data?.resources || [];
        }
      }
      
      if (marketStallResources.length === 0) {
        console.log('🎨 [PreviewLiveTemplate] No Market Stall resources found - skipping product filtering');
        return [];
      }
      
      console.log(`🎨 [PreviewLiveTemplate] Filtering ${templateProducts.length} template products against ${marketStallResources.length} Market Stall resources`);
      
      const filteredProducts: any[] = [];
      const skippedProducts: string[] = [];
      
      for (const templateProduct of templateProducts) {
        let matchedResource: any = null;
        
        // DEBUG: Log template product details
        console.log(`🎨 [PreviewLiveTemplate] Checking template product:`, {
          id: templateProduct.id,
          name: templateProduct.name,
          whopProductId: templateProduct.whopProductId,
          idType: typeof templateProduct.id,
          idStartsWithResource: typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-')
        });
        
        // Strategy 1: Match by whopProductId (for synced Whop products)
        if (templateProduct.whopProductId) {
          matchedResource = marketStallResources.find((resource: any) => 
            resource.whopProductId === templateProduct.whopProductId
          );
          
          if (matchedResource) {
            console.log(`✅ [PreviewLiveTemplate] Matched "${templateProduct.name}" by whopProductId: ${templateProduct.whopProductId}`);
          } else {
            console.log(`⚠️ [PreviewLiveTemplate] No match by whopProductId "${templateProduct.whopProductId}" for "${templateProduct.name}"`);
          }
        }
        
        // Strategy 2: Match by resource ID (if product.id starts with "resource-")
        if (!matchedResource && typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-')) {
          const resourceId = templateProduct.id.replace('resource-', '');
          console.log(`🎨 [PreviewLiveTemplate] Trying to match by resource ID: "${resourceId}"`);
          
          // DEBUG: Log available resource IDs
          console.log(`🎨 [PreviewLiveTemplate] Available Market Stall resource IDs:`, marketStallResources.map((r: any) => r.id));
          
          matchedResource = marketStallResources.find((resource: any) => 
            resource.id === resourceId
          );
          
          if (matchedResource) {
            console.log(`✅ [PreviewLiveTemplate] Matched "${templateProduct.name}" by resource ID: ${resourceId}`);
          } else {
            console.log(`⚠️ [PreviewLiveTemplate] No match by resource ID "${resourceId}" for "${templateProduct.name}"`);
          }
        }
        
        // Strategy 3: Match by exact name (fallback when resource ID changed but product still exists in Market Stall)
        // Only match if:
        // 1. Resource ID and whopProductId matching failed
        // 2. Exact name match (case-insensitive, trimmed)
        // 3. This handles cases where products were recreated with new IDs but same name
        if (!matchedResource && templateProduct.name) {
          const normalizedTemplateName = templateProduct.name.toLowerCase().trim();
          
          // Find exact name match
          matchedResource = marketStallResources.find((resource: any) => {
            if (!resource.name) return false;
            const normalizedResourceName = resource.name.toLowerCase().trim();
            return normalizedResourceName === normalizedTemplateName;
          });
          
          if (matchedResource) {
            const oldResourceId = typeof templateProduct.id === 'string' && templateProduct.id.startsWith('resource-') 
              ? templateProduct.id.replace('resource-', '') 
              : 'N/A';
            console.log(`✅ [PreviewLiveTemplate] Matched "${templateProduct.name}" by exact name (resource ID changed: ${oldResourceId} → ${matchedResource.id})`);
          } else {
            console.log(`⚠️ [PreviewLiveTemplate] No exact name match for "${templateProduct.name}"`);
          }
        }
        
        // Only match products that exist in Market Stall by exact ID, whopProductId, or exact name
        if (matchedResource) {
          // Product exists in Market Stall - keep it with template design applied
          const mergedProduct = {
            // Use template data first, fallback to Market Stall resource data
            id: `resource-${matchedResource.id}`,
            name: templateProduct.name || matchedResource.name, // Prefer template name, fallback to Market Stall
            description: templateProduct.description || truncateDescription(matchedResource.description || ''), // Prefer template description, fallback to Market Stall (truncated)
            price: templateProduct.price !== undefined && templateProduct.price !== null ? templateProduct.price : parseFloat(matchedResource.price || '0'), // Prefer template price, fallback to Market Stall
            buttonLink: templateProduct.buttonLink || matchedResource.link || '', // Prefer template link, fallback to Market Stall
            whopProductId: matchedResource.whopProductId, // Keep Market Stall whopProductId for syncing
            
            // Apply template product design/styling
            cardClass: templateProduct.cardClass, // Template design
            buttonClass: templateProduct.buttonClass, // Template button styling
            buttonText: templateProduct.buttonText || 'VIEW DETAILS', // Template button text
            buttonAnimColor: templateProduct.buttonAnimColor, // Template button animation
            titleClass: templateProduct.titleClass, // Template title styling
            descClass: templateProduct.descClass, // Template description styling
            
            // Use template image if available, otherwise Market Stall image
            image: templateProduct.image || templateProduct.imageAttachmentUrl || matchedResource.image || '',
            imageAttachmentId: templateProduct.imageAttachmentId || null,
            imageAttachmentUrl: templateProduct.imageAttachmentUrl || templateProduct.image || matchedResource.image || null,
            
            // Keep template container asset if available
            containerAsset: templateProduct.containerAsset,
          };
          
          filteredProducts.push(mergedProduct);
          console.log(`✅ [PreviewLiveTemplate] Keeping "${templateProduct.name}" with template design applied`);
        } else {
          skippedProducts.push(templateProduct.name || 'Unknown');
          console.log(`❌ [PreviewLiveTemplate] Skipping "${templateProduct.name}" - not found in Market Stall`);
        }
      }
      
      console.log(`🎨 [PreviewLiveTemplate] Result: ${filteredProducts.length} products matched, ${skippedProducts.length} products skipped`);
      if (skippedProducts.length > 0) {
        console.log(`🎨 [PreviewLiveTemplate] Skipped products: ${skippedProducts.join(', ')}`);
      }
      
      return filteredProducts;
    } catch (error) {
      console.error('🎨 [PreviewLiveTemplate] Error filtering template products:', error);
      return [];
    }
  }, [allResources, experienceId]);

  // Handle previewLiveTemplate - override database data when provided
  useEffect(() => {
    const applyTemplateData = async () => {
      if (previewLiveTemplate && previewLiveTemplate.templateData) {
        console.log('[usePreviewLiveTemplate] Using previewLiveTemplate:', previewLiveTemplate);
        
        // Apply template data to the component state
        const templateData = previewLiveTemplate.templateData;
        
        // Set background if available (now async)
        // Check all possible background sources in priority order:
        // 1. Theme-specific backgrounds (for custom themes)
        // 2. WHOP attachment URL
        // 3. Legacy backgrounds
        // 4. Custom theme placeholderImage (from currentTheme or themeSnapshot)
        const currentSeason = previewLiveTemplate.currentSeason || 'Fall';
        const backgroundUrl = templateData.themeGeneratedBackgrounds?.[currentSeason]
          || templateData.themeUploadedBackgrounds?.[currentSeason]
          || templateData.backgroundAttachmentUrl
          || templateData.generatedBackground
          || templateData.uploadedBackground
          || templateData.currentTheme?.placeholderImage
          || previewLiveTemplate.themeSnapshot?.placeholderImage
          || null;
        
        if (backgroundUrl) {
          // Determine if it's generated or uploaded based on source
          const isGenerated = !!(templateData.themeGeneratedBackgrounds?.[currentSeason] || templateData.generatedBackground);
          await setBackground(isGenerated ? 'generated' : 'uploaded', backgroundUrl);
        }
        
        // Set logo if available
        if (templateData.logoAsset) {
          setLogoAsset(templateData.logoAsset);
        }
        
        // Set text styles if available
        if (templateData.fixedTextStyles) {
          setFixedTextStyles(templateData.fixedTextStyles);
        }
        
        // CRITICAL: Filter products - only keep ones that exist in Market Stall
        // Apply template design to matching Market Stall products
        if (templateData.products && templateData.products.length > 0) {
          const filteredProducts = await filterTemplateProducts(templateData.products);
          setThemeProducts((prev: Record<string, any[]>) => ({
            ...prev,
            [previewLiveTemplate.currentSeason || 'Fall']: filteredProducts
          }));
        } else if (templateData.themeProducts) {
          // Handle themeProducts format (for current season)
          const currentSeason = previewLiveTemplate.currentSeason || 'Fall';
          const seasonProducts = templateData.themeProducts[currentSeason] || [];
          if (seasonProducts.length > 0) {
            const filteredProducts = await filterTemplateProducts(seasonProducts);
            setThemeProducts((prev: Record<string, any[]>) => ({
              ...prev,
              [currentSeason]: filteredProducts
            }));
          } else {
            setThemeProducts((prev: Record<string, any[]>) => ({
              ...prev,
              [currentSeason]: []
            }));
          }
        }
        
        // Set promo button if available
        if (templateData.promoButton) {
          setPromoButton(templateData.promoButton);
        }
      }
    };
    
    applyTemplateData();
  }, [previewLiveTemplate, setBackground, setLogoAsset, setFixedTextStyles, setThemeProducts, setPromoButton, filterTemplateProducts]);

  // Update template loaded state when template data is applied
  useEffect(() => {
    if (previewLiveTemplate && previewLiveTemplate.templateData) {
      // Template data is being applied, mark as loaded after delay
      setTimeout(() => {
        setIsTemplateLoaded(true);
        if (onTemplateLoaded) {
          console.log('[usePreviewLiveTemplate] Template is now fully loaded on frontend');
          onTemplateLoaded();
        }
      }, 1000); // 1 second delay to ensure all components are rendered
    } else if (!previewLiveTemplate) {
      // No preview template, mark as loaded immediately
      setIsTemplateLoaded(true);
    }
  }, [previewLiveTemplate, onTemplateLoaded]);

  return {
    isTemplateLoaded,
  };
};

