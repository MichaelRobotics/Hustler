import { useEffect, useRef } from 'react';
import { applyThemeStylesToProducts } from '../utils/productUtils';
import { getThemePlaceholderUrl } from '../utils/getThemePlaceholder';
import { getThemeTextColor } from '../actions/constants';
import type { LegacyTheme } from '../types';

interface UseThemeApplicationProps {
  currentSeason: string;
  isTemplateLoaded: boolean;
  products: any[];
  legacyTheme: LegacyTheme;
  fixedTextStyles: any;
  backgroundAttachmentUrl: string | null;
  originTemplate: any | null;
  applyThemeColorsToText: (text: any, type: 'header' | 'subheader' | 'promo') => string;
  setProducts: (products: any[] | ((prev: any[]) => any[])) => void;
  setFixedTextStyles: (styles: any | ((prev: any) => any)) => void;
  setPromoButton: (button: any | ((prev: any) => any)) => void;
  setBackground: (type: 'generated' | 'uploaded', url: string | null) => void;
}

export function useThemeApplication({
  currentSeason,
  isTemplateLoaded,
  products,
  legacyTheme,
  fixedTextStyles,
  backgroundAttachmentUrl,
  originTemplate,
  applyThemeColorsToText,
  setProducts,
  setFixedTextStyles,
  setPromoButton,
  setBackground,
}: UseThemeApplicationProps) {
  const prevSeasonRef = useRef(currentSeason);

  useEffect(() => {
    // Only apply styles if template is loaded and theme actually changed
    if (!isTemplateLoaded || prevSeasonRef.current === currentSeason) {
      prevSeasonRef.current = currentSeason;
      return;
    }

    console.log(`🎨 Theme changed from ${prevSeasonRef.current} to ${currentSeason}, applying styles...`);

    // Apply theme styles to all products in current template
    if (products.length > 0) {
      const styledProducts = applyThemeStylesToProducts(products, legacyTheme, {
        preserveExisting: false,
        forceApply: true,
      });
      setProducts(styledProducts);
      console.log(`🎨 Applied theme styles to ${styledProducts.length} products`);
    }

    // Get theme text color
    const textColor = getThemeTextColor(legacyTheme.welcomeColor || 'text-yellow-300');

    // Apply theme colors and styles to headerMessage (this is what's displayed in StoreHeader)
    // Pass text style without color so applyThemeColorsToText applies theme color class
    const headerMessageStyleWithoutColor = {
      styleClass: fixedTextStyles.headerMessage?.styleClass || fixedTextStyles.mainHeader?.styleClass || '',
      color: undefined, // Don't pass color so theme color class gets applied
    };
    const styledHeaderMessageClass = applyThemeColorsToText(headerMessageStyleWithoutColor, 'header');
    setFixedTextStyles((prev: any) => ({
      ...prev,
      headerMessage: {
        ...prev.headerMessage, // Preserve existing content
        color: textColor, // Update color to theme color
        styleClass: styledHeaderMessageClass, // Update style class with theme colors
      },
      // Also update mainHeader for consistency
      mainHeader: {
        ...prev.mainHeader, // Preserve existing content
        color: textColor, // Update color to theme color
        styleClass: styledHeaderMessageClass, // Update style class with theme colors
      },
    }));
    console.log('🎨 Applied theme colors and styles to headerMessage:', styledHeaderMessageClass);

    // Apply theme colors and styles to sub header (preserve content)
    // Pass text style without color so applyThemeColorsToText applies theme color class
    const subHeaderStyleWithoutColor = {
      styleClass: fixedTextStyles.subHeader?.styleClass || '',
      color: undefined, // Don't pass color so theme color class gets applied
    };
    const styledSubHeaderClass = applyThemeColorsToText(subHeaderStyleWithoutColor, 'subheader');
    setFixedTextStyles((prev: any) => ({
      ...prev,
      subHeader: {
        ...prev.subHeader, // Preserve existing content
        color: textColor, // Update color to theme color
        styleClass: styledSubHeaderClass, // Update style class with theme colors
      },
    }));
    console.log('🎨 Applied theme colors and styles to sub header:', styledSubHeaderClass);

    // Update claim button to match new theme accent
    setPromoButton((prev: any) => ({
      ...prev,
      buttonClass: legacyTheme.accent,
      ringClass: '',
      ringHoverClass: '',
    }));

    // Update background image to match new theme
    // When switching themes, preserve banner background if it's the company theme with a banner
    // Otherwise, use theme's placeholder image
    let backgroundUrl: string | null = null;
    
    if (currentSeason === 'Company' && originTemplate?.companyBannerImageUrl) {
      // Preserve banner background for company theme
      backgroundUrl = originTemplate.companyBannerImageUrl;
      console.log('🎨 Preserving banner background for company theme:', backgroundUrl);
    } else {
      // Use theme placeholder for all other themes
      const themePlaceholderUrl = (legacyTheme as any)?.placeholderImage || getThemePlaceholderUrl(currentSeason);
      backgroundUrl = themePlaceholderUrl;
      console.log('🎨 Applied theme background image (switching theme):', themePlaceholderUrl);
    }
    
    setBackground('generated', backgroundUrl);

    prevSeasonRef.current = currentSeason;
  }, [
    currentSeason,
    isTemplateLoaded,
    products,
    legacyTheme,
    fixedTextStyles,
    backgroundAttachmentUrl,
    originTemplate,
    applyThemeColorsToText,
    setProducts,
    setFixedTextStyles,
    setPromoButton,
    setBackground,
  ]);
}

