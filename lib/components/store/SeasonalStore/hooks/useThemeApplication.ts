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
  uploadedBackground: string | null;
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
  uploadedBackground,
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

    // Helper function to strip theme color classes from styleClass
    // This ensures we don't carry over old theme colors when applying new theme
    const stripThemeColorClasses = (styleClass: string): string => {
      if (!styleClass) return '';
      // Remove all text-* color classes (e.g., text-blue-600, text-indigo-500, etc.)
      // Keep only base styling classes (font size, weight, tracking, etc.)
      // Pattern: text-{color}-{shade} or text-{color} (but not text-center, text-left, etc.)
      return styleClass
        .split(' ')
        .filter(cls => {
          // Remove text color classes (text-{color}-{number} or text-{color} where color is a color name)
          // But keep utility classes like text-center, text-left, text-uppercase, etc.
          if (cls.startsWith('text-')) {
            // Check if it's a color class (has a color name followed by optional number)
            const colorNames = ['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 
                              'green', 'emerald', 'teal', 'cyan', 'sky', 'violet', 'fuchsia', 
                              'rose', 'amber', 'lime', 'slate', 'gray', 'zinc', 'neutral', 'stone',
                              'white', 'black', 'transparent'];
            const parts = cls.split('-');
            if (parts.length >= 2 && colorNames.includes(parts[1])) {
              return false; // This is a color class, remove it
            }
          }
          return true; // Keep all other classes
        })
        .join(' ')
        .trim();
    };

    // Apply theme colors and styles to headerMessage (this is what's displayed in StoreHeader)
    // Strip old theme color classes first to ensure clean base style
    const headerBaseStyleClass = stripThemeColorClasses(
      fixedTextStyles.headerMessage?.styleClass || 
      fixedTextStyles.mainHeader?.styleClass || 
      'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'
    );
    const headerMessageStyleWithoutColor = {
      styleClass: headerBaseStyleClass,
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
    // Strip old theme color classes first to ensure clean base style
    const subHeaderBaseStyleClass = stripThemeColorClasses(
      fixedTextStyles.subHeader?.styleClass || 
      'text-lg sm:text-xl font-normal'
    );
    const subHeaderStyleWithoutColor = {
      styleClass: subHeaderBaseStyleClass,
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
    // When switching themes, preserve background if:
    // 1. Banner image is present (companyBannerImageUrl), OR
    // 2. There is an uploaded background image (uploadedBackground or backgroundAttachmentUrl)
    // Otherwise, use theme's placeholder image
    let backgroundUrl: string | null = null;
    
    const hasBannerImage = originTemplate?.companyBannerImageUrl;
    const hasUploadedBackground = uploadedBackground || backgroundAttachmentUrl;
    
    if (hasBannerImage || hasUploadedBackground) {
      // Preserve existing background (banner or uploaded)
      if (hasBannerImage) {
        backgroundUrl = originTemplate.companyBannerImageUrl;
        console.log('🎨 Preserving banner background when switching theme:', backgroundUrl);
      } else if (hasUploadedBackground) {
        backgroundUrl = uploadedBackground || backgroundAttachmentUrl;
        console.log('🎨 Preserving uploaded background when switching theme:', backgroundUrl);
      }
      // Don't call setBackground - preserve the current background
      console.log('🎨 Skipping background change - preserving existing background');
    } else {
      // Use theme placeholder for all other themes (no banner or uploaded background)
      const themePlaceholderUrl = (legacyTheme as any)?.placeholderImage || getThemePlaceholderUrl(currentSeason);
      backgroundUrl = themePlaceholderUrl;
      console.log('🎨 Applied theme background image (switching theme):', themePlaceholderUrl);
      setBackground('generated', backgroundUrl);
    }

    prevSeasonRef.current = currentSeason;
  }, [
    currentSeason,
    isTemplateLoaded,
    products,
    legacyTheme,
    fixedTextStyles,
    backgroundAttachmentUrl,
    uploadedBackground,
    originTemplate,
    applyThemeColorsToText,
    setProducts,
    setFixedTextStyles,
    setPromoButton,
    setBackground,
  ]);
}

