import { useEffect, useState } from 'react';

interface PreviewLiveTemplateHookProps {
  previewLiveTemplate?: any;
  onTemplateLoaded?: () => void;
  setBackground: (type: 'generated' | 'uploaded', data: any) => Promise<void>;
  setLogoAsset: (asset: any) => void;
  setFixedTextStyles: (styles: any) => void;
  setThemeProducts: (products: any) => void;
  setPromoButton: (button: any) => void;
}

export const usePreviewLiveTemplate = ({
  previewLiveTemplate,
  onTemplateLoaded,
  setBackground,
  setLogoAsset,
  setFixedTextStyles,
  setThemeProducts,
  setPromoButton,
}: PreviewLiveTemplateHookProps) => {
  const [isTemplateLoaded, setIsTemplateLoaded] = useState(false);

  // Handle previewLiveTemplate - override database data when provided
  useEffect(() => {
    const applyTemplateData = async () => {
      if (previewLiveTemplate && previewLiveTemplate.templateData) {
        console.log('[usePreviewLiveTemplate] Using previewLiveTemplate:', previewLiveTemplate);
        
        // Apply template data to the component state
        const templateData = previewLiveTemplate.templateData;
        
        // Set background if available (now async)
        if (templateData.generatedBackground) {
          await setBackground('generated', templateData.generatedBackground);
        }
        if (templateData.uploadedBackground) {
          await setBackground('uploaded', templateData.uploadedBackground);
        }
        
        // Set logo if available
        if (templateData.logoAsset) {
          setLogoAsset(templateData.logoAsset);
        }
        
        // Set text styles if available
        if (templateData.fixedTextStyles) {
          setFixedTextStyles(templateData.fixedTextStyles);
        }
        
        // Set products if available
        if (templateData.products && templateData.products.length > 0) {
          setThemeProducts(templateData.products);
        }
        
        // Set promo button if available
        if (templateData.promoButton) {
          setPromoButton(templateData.promoButton);
        }
      }
    };
    
    applyTemplateData();
  }, [previewLiveTemplate, setBackground, setLogoAsset, setFixedTextStyles, setThemeProducts, setPromoButton]);

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

