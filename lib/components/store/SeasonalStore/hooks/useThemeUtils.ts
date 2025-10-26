import { useCallback, useMemo } from 'react';
import { LegacyTheme } from '../types';

export const useThemeUtils = (legacyTheme: LegacyTheme) => {
  // Extract theme colors for text styling
  const getThemeColors = useMemo(() => {
    const extractColorFromClass = (className: string, prefix: string) => {
      const match = className.match(new RegExp(`${prefix}-(\\w+)`));
      return match ? match[1] : null;
    };

    const extractTextColor = (className: string) => {
      const match = className.match(/text-(\w+)/);
      return match ? match[1] : 'gray-800';
    };

    const extractRingColor = (className: string) => {
      const match = className.match(/ring-(\w+)/);
      return match ? match[1] : 'indigo-400';
    };

    const extractBgColor = (className: string) => {
      const match = className.match(/bg-(\w+)-(\d+)/);
      return match ? match[1] : null;
    };

    const primaryColor = extractColorFromClass(legacyTheme.accent, 'bg-') || 'indigo';
    const textColor = extractTextColor(legacyTheme.text) || 'gray-800';
    const ringColor = extractRingColor(legacyTheme.accent) || 'indigo-400';
    const welcomeColor = extractTextColor(legacyTheme.welcomeColor) || 'yellow-300';

    return {
      primaryClass: `text-${primaryColor}-600`,
      textClass: `text-${textColor}`,
      ringClass: `ring-${ringColor}`,
      welcomeClass: `text-${welcomeColor}`,
      borderClass: primaryColor,
    };
  }, [legacyTheme]);

  // Get initial style class for text elements
  const getInitialStyleClass = useCallback((type: 'header' | 'subheader' | 'promo') => {
    switch (type) {
      case 'header':
        return 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg';
      case 'subheader':
        return 'text-lg sm:text-xl font-normal';
      case 'promo':
        return 'text-lg font-semibold';
      default:
        return 'text-lg font-normal';
    }
  }, []);

  // Apply theme colors to text styles
  const applyThemeColorsToText = useCallback((textStyle: any, type: 'header' | 'subheader' | 'promo') => {
    const baseStyle = textStyle?.styleClass || getInitialStyleClass(type);
    let themeColorClass = '';
    
    switch (type) {
      case 'header':
        themeColorClass = getThemeColors.primaryClass;
        break;
      case 'subheader':
        themeColorClass = getThemeColors.textClass;
        break;
      case 'promo':
        themeColorClass = getThemeColors.welcomeClass;
        break;
    }
    
    // If no custom color is set, apply theme color
    if (!textStyle?.color) {
      return `${baseStyle} ${themeColorClass}`;
    }
    
    return baseStyle;
  }, [getThemeColors, getInitialStyleClass]);

  // Map ring class to a safe hover:ring-* class included at build time
  const getHoverRingClass = useCallback((ringCls: string) => {
    switch (ringCls) {
      case 'ring-indigo-400':
        return 'hover:ring-indigo-400';
      case 'ring-cyan-400':
        return 'hover:ring-cyan-400';
      case 'ring-fuchsia-400':
        return 'hover:ring-fuchsia-400';
      case 'ring-emerald-400':
        return 'hover:ring-emerald-400';
      case 'ring-amber-400':
        return 'hover:ring-amber-400';
      case 'ring-rose-400':
        return 'hover:ring-rose-400';
      case 'ring-purple-400':
        return 'hover:ring-purple-400';
      case 'ring-slate-400':
        return 'hover:ring-slate-400';
      case 'ring-orange-400':
        return 'hover:ring-orange-400';
      default:
        return 'hover:ring-indigo-400';
    }
  }, []);

  // Map ring color to an under-glow background for hover
  const getGlowBgClass = useCallback((ringCls: string) => {
    switch (ringCls) {
      case 'ring-indigo-400':
        return 'bg-indigo-400/40';
      case 'ring-cyan-400':
        return 'bg-cyan-400/40';
      case 'ring-fuchsia-400':
        return 'bg-fuchsia-400/40';
      case 'ring-emerald-400':
        return 'bg-emerald-400/40';
      case 'ring-amber-400':
        return 'bg-amber-400/40';
      case 'ring-rose-400':
        return 'bg-rose-400/40';
      case 'ring-purple-400':
        return 'bg-purple-400/40';
      case 'ring-slate-400':
        return 'bg-slate-400/40';
      case 'ring-orange-400':
        return 'bg-orange-400/40';
      default:
        return 'bg-indigo-400/40';
    }
  }, []);

  // Map ring color to a stronger glow background for hover
  const getGlowBgStrongClass = useCallback((ringCls: string) => {
    switch (ringCls) {
      case 'ring-indigo-400':
        return 'bg-indigo-400/60';
      case 'ring-cyan-400':
        return 'bg-cyan-400/60';
      case 'ring-fuchsia-400':
        return 'bg-fuchsia-400/60';
      case 'ring-emerald-400':
        return 'bg-emerald-400/60';
      case 'ring-amber-400':
        return 'bg-amber-400/60';
      case 'ring-rose-400':
        return 'bg-rose-400/60';
      case 'ring-purple-400':
        return 'bg-purple-400/60';
      case 'ring-slate-400':
        return 'bg-slate-400/60';
      case 'ring-orange-400':
        return 'bg-orange-400/60';
      default:
        return 'bg-indigo-400/60';
    }
  }, []);

  // Quick text colors with contrast to current theme
  const getThemeQuickColors = useCallback((t: LegacyTheme): string[] => {
    const parseText = (cls: string) => cls.replace('text-', '').trim();
    const parseBgFamily = (cls: string) => {
      const m = cls.match(/bg-([a-z]+)-\d+/);
      return m?.[1] ?? undefined;
    };
    const parseRingFamily = (cls: string) => {
      const m = cls.match(/ring-([a-z]+)-\d+/);
      return m?.[1] ?? undefined;
    };
    
    const bgFamily = parseBgFamily(t.accent);
    const ringFamily = parseRingFamily(t.accent);
    const textColor = parseText(t.text);
    
    // Generate contrasting colors
    const colors = [
      `text-${textColor}`,
      `text-white`,
      `text-gray-800`,
      `text-gray-600`,
      `text-gray-400`,
      `text-black`,
    ];
    
    // Add theme family colors if available
    if (bgFamily) {
      colors.push(`text-${bgFamily}-600`, `text-${bgFamily}-700`, `text-${bgFamily}-800`);
    }
    if (ringFamily && ringFamily !== bgFamily) {
      colors.push(`text-${ringFamily}-600`, `text-${ringFamily}-700`, `text-${ringFamily}-800`);
    }
    
    // Remove duplicates and return unique colors
    return [...new Set(colors)];
  }, []);

  return {
    getThemeColors,
    getInitialStyleClass,
    applyThemeColorsToText,
    getHoverRingClass,
    getGlowBgClass,
    getGlowBgStrongClass,
    getThemeQuickColors,
  };
};



