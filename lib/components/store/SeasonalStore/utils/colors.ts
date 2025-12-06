/**
 * Consolidated color utilities for SeasonalStore
 * Single source of truth for color conversions and text color determination
 */

/**
 * Tailwind color palette mapping - hex values for each color/shade combination
 */
export const TAILWIND_COLOR_MAP: Record<string, Record<number, string>> = {
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  purple: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  pink: {
    50: '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#EC4899',
    600: '#DB2777',
    700: '#BE185D',
    800: '#9F1239',
    900: '#831843',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
    800: '#9F1239',
    900: '#881337',
  },
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  yellow: {
    50: '#FEFCE8',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#EAB308',
    600: '#CA8A04',
    700: '#A16207',
    800: '#854D0E',
    900: '#713F12',
  },
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  teal: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
  },
  cyan: {
    50: '#ECFEFF',
    100: '#CFFAFE',
    200: '#A5F3FC',
    300: '#67E8F9',
    400: '#22D3EE',
    500: '#06B6D4',
    600: '#0891B2',
    700: '#0E7490',
    800: '#155E75',
    900: '#164E63',
  },
};

/**
 * Convert a Tailwind text color class to its hex value
 * @param textClass - Tailwind class like 'text-blue-500'
 * @returns Hex color string or null if not found
 */
export const tailwindTextColorToHex = (textClass: string): string | null => {
  if (!textClass) return null;

  const match = textClass.match(/text-(\w+)-(\d+)/);
  if (!match) return null;

  const colorName = match[1];
  const shade = parseInt(match[2], 10);

  if (TAILWIND_COLOR_MAP[colorName] && TAILWIND_COLOR_MAP[colorName][shade]) {
    return TAILWIND_COLOR_MAP[colorName][shade];
  }

  return null;
};

/**
 * Convert a Tailwind background color class to its hex value
 * @param bgClass - Tailwind class like 'bg-blue-500'
 * @returns Hex color string or null if not found
 */
export const tailwindBgColorToHex = (bgClass: string): string | null => {
  if (!bgClass) return null;

  const match = bgClass.match(/bg-(\w+)-(\d+)/);
  if (!match) return null;

  const colorName = match[1];
  const shade = parseInt(match[2], 10);

  if (TAILWIND_COLOR_MAP[colorName] && TAILWIND_COLOR_MAP[colorName][shade]) {
    return TAILWIND_COLOR_MAP[colorName][shade];
  }

  return null;
};

/**
 * Determine appropriate text colors based on card background class
 * Ensures readability by selecting contrasting text colors
 * 
 * @param cardClass - Tailwind background class of the card
 * @param themeText - Default theme text class to use as fallback
 * @returns Object with titleClass and descClass for text styling
 */
export const getTextColorsFromCardClass = (
  cardClass: string,
  themeText: string
): { titleClass: string; descClass: string } => {
  // Check if card is dark
  const isDarkCard =
    cardClass.includes('bg-gray-900') ||
    cardClass.includes('bg-slate-800') ||
    cardClass.includes('bg-[#0f0b1f]') ||
    cardClass.includes('bg-gray-950');

  if (isDarkCard) {
    // For dark cards, use theme's text color (which is already appropriate for dark backgrounds)
    // e.g., text-orange-100 for Spooky Night, text-cyan-300 for Cyber Sale
    return { titleClass: themeText, descClass: themeText };
  }

  // Extract color from cardClass (e.g., bg-violet-50, bg-green-50)
  const match = cardClass.match(
    /\bbg-(violet|green|red|blue|amber|gray|slate|emerald|rose|purple|indigo|pink|yellow|orange|cyan|teal)-(\d+)/
  );
  const colorName = match ? match[1] : null;

  // If we found a color and it's a light shade (50-200), use dark text of that color
  if (colorName && match && parseInt(match[2], 10) <= 200) {
    return {
      titleClass: `text-${colorName}-900`,
      descClass: `text-${colorName}-700`,
    };
  }

  // For white/light cards or fallback, use theme text
  return {
    titleClass: themeText,
    descClass: themeText,
  };
};

/**
 * Check if a color is considered "dark" (for contrast calculations)
 * @param hexColor - Hex color string like '#1F2937'
 * @returns true if the color is dark
 */
export const isDarkColor = (hexColor: string): boolean => {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance (perceived brightness)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.5;
};

/**
 * Get a contrasting text color (black or white) for a given background
 * @param bgHexColor - Background hex color
 * @returns '#FFFFFF' for dark backgrounds, '#000000' for light backgrounds
 */
export const getContrastingTextColor = (bgHexColor: string): string => {
  return isDarkColor(bgHexColor) ? '#FFFFFF' : '#000000';
};




