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

  // Quick text colors matching background palette with good contrast
  const getThemeQuickColors = useCallback((t: LegacyTheme): string[] => {
    // Tailwind color to hex mapping for common colors
    const colorMap: Record<string, Record<number, string>> = {
      indigo: {
        50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC', 400: '#818CF8',
        500: '#6366F1', 600: '#4F46E5', 700: '#4338CA', 800: '#3730A3', 900: '#312E81'
      },
      blue: {
        50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA',
        500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A'
      },
      purple: {
        50: '#FAF5FF', 100: '#F3E8FF', 200: '#E9D5FF', 300: '#D8B4FE', 400: '#C084FC',
        500: '#A855F7', 600: '#9333EA', 700: '#7E22CE', 800: '#6B21A8', 900: '#581C87'
      },
      pink: {
        50: '#FDF2F8', 100: '#FCE7F3', 200: '#FBCFE8', 300: '#F9A8D4', 400: '#F472B6',
        500: '#EC4899', 600: '#DB2777', 700: '#BE185D', 800: '#9F1239', 900: '#831843'
      },
      red: {
        50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171',
        500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D'
      },
      orange: {
        50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C',
        500: '#F97316', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12'
      },
      yellow: {
        50: '#FEFCE8', 100: '#FEF9C3', 200: '#FEF08A', 300: '#FDE047', 400: '#FACC15',
        500: '#EAB308', 600: '#CA8A04', 700: '#A16207', 800: '#854D0E', 900: '#713F12'
      },
      amber: {
        50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24',
        500: '#F59E0B', 600: '#D97706', 700: '#B45309', 800: '#92400E', 900: '#78350F'
      },
      green: {
        50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80',
        500: '#22C55E', 600: '#16A34A', 700: '#15803D', 800: '#166534', 900: '#14532D'
      },
      emerald: {
        50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399',
        500: '#10B981', 600: '#059669', 700: '#047857', 800: '#065F46', 900: '#064E3B'
      },
      cyan: {
        50: '#ECFEFF', 100: '#CFFAFE', 200: '#A5F3FC', 300: '#67E8F9', 400: '#22D3EE',
        500: '#06B6D4', 600: '#0891B2', 700: '#0E7490', 800: '#155E75', 900: '#164E63'
      },
      teal: {
        50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4', 400: '#2DD4BF',
        500: '#14B8A6', 600: '#0D9488', 700: '#0F766E', 800: '#115E59', 900: '#134E4A'
      },
      slate: {
        50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
        500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A'
      },
      gray: {
        50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF',
        500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: '#111827'
      },
      rose: {
        50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF', 400: '#FB7185',
        500: '#F43F5E', 600: '#E11D48', 700: '#BE123C', 800: '#9F1239', 900: '#881337'
      },
      violet: {
        50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA',
        500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95'
      },
      fuchsia: {
        50: '#FDF4FF', 100: '#FAE8FF', 200: '#F5D0FE', 300: '#F0ABFC', 400: '#E879F9',
        500: '#D946EF', 600: '#C026D3', 700: '#A21CAF', 800: '#86198F', 900: '#701A75'
      }
    };

    // Parse background gradient to extract colors
    const parseGradientColor = (bg: string, prefix: 'from' | 'to') => {
      const regex = new RegExp(`${prefix}-([a-z]+)-(\\d+)`);
      const match = bg.match(regex);
      if (match) {
        const colorName = match[1];
        const shade = parseInt(match[2], 10);
        return { colorName, shade };
      }
      return null;
    };

    // Extract colors from background gradient
    const fromColor = parseGradientColor(t.background || '', 'from');
    const toColor = parseGradientColor(t.background || '', 'to');

    const colors: string[] = [];

    // Add colors from background gradient (lighter and darker variants for contrast)
    if (fromColor && colorMap[fromColor.colorName]) {
      const shades = colorMap[fromColor.colorName];
      const baseShade = fromColor.shade;
      
      // Determine lighter and darker shades based on base shade
      let lighterShade = Math.max(50, baseShade - 300);
      if (lighterShade % 50 !== 0) lighterShade = Math.floor(lighterShade / 50) * 50;
      lighterShade = Math.max(50, lighterShade);
      
      let darkerShade = Math.min(900, baseShade + 300);
      if (darkerShade % 50 !== 0) darkerShade = Math.ceil(darkerShade / 50) * 50;
      darkerShade = Math.min(900, darkerShade);
      
      // Get closest available shades
      const availableShades = Object.keys(shades).map(Number).sort((a, b) => a - b);
      const getClosestShade = (target: number) => {
        return availableShades.reduce((prev, curr) => 
          Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
        );
      };
      
      // Add lighter variant, base color, and darker variant
      colors.push(
        shades[getClosestShade(lighterShade)] || shades[100] || shades[50],
        shades[baseShade] || shades[500],
        shades[getClosestShade(darkerShade)] || shades[700] || shades[900]
      );
    }

    if (toColor && colorMap[toColor.colorName] && toColor.colorName !== fromColor?.colorName) {
      const shades = colorMap[toColor.colorName];
      const baseShade = toColor.shade;
      
      // Determine lighter shade
      let lighterShade = Math.max(50, baseShade - 300);
      if (lighterShade % 50 !== 0) lighterShade = Math.floor(lighterShade / 50) * 50;
      lighterShade = Math.max(50, lighterShade);
      
      const availableShades = Object.keys(shades).map(Number).sort((a, b) => a - b);
      const getClosestShade = (target: number) => {
        return availableShades.reduce((prev, curr) => 
          Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
        );
      };
      
      colors.push(
        shades[getClosestShade(lighterShade)] || shades[100] || shades[50],
        shades[baseShade] || shades[500]
      );
    }

    // Always include high contrast colors (white and black)
    colors.push('#FFFFFF', '#000000');

    // Add neutral grays for additional contrast options
    colors.push('#F3F4F6', '#1F2937'); // light gray and dark gray

    // Remove duplicates and limit to 8 colors
    const uniqueColors = Array.from(new Set(colors)).slice(0, 8);

    // If we don't have 8 colors, fill with complementary colors
    if (uniqueColors.length < 8) {
      const fallbackColors = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937', '#6366F1', '#EC4899', '#10B981', '#F59E0B'];
      for (const fallback of fallbackColors) {
        if (!uniqueColors.includes(fallback) && uniqueColors.length < 8) {
          uniqueColors.push(fallback);
        }
      }
    }

    return uniqueColors.slice(0, 8);
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



