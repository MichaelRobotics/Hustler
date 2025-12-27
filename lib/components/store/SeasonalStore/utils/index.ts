import { LegacyTheme } from '../types';

// Re-export color utilities
export {
  TAILWIND_COLOR_MAP,
  tailwindTextColorToHex,
  tailwindBgColorToHex,
  getTextColorsFromCardClass,
  isDarkColor,
  getContrastingTextColor,
} from './colors';

/**
 * Convert database Theme to LegacyTheme for UI components
 */
export const convertThemeToLegacy = (dbTheme: any): LegacyTheme => {
  // Handle undefined/null theme - use Black Friday as fallback (default season)
  if (!dbTheme) {
    // Only log in development to avoid console noise
    if (process.env.NODE_ENV === 'development') {
      console.debug('convertThemeToLegacy: dbTheme is undefined/null, returning Black Friday theme as fallback');
    }
    return {
      name: 'Black Friday',
      themePrompt: 'A bold, high-energy sale theme with dark backgrounds and vibrant accents.',
      accent: 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 ring-yellow-400',
      card: 'bg-gray-900/95 backdrop-blur-md shadow-2xl hover:shadow-2xl shadow-yellow-500/30 border border-yellow-500/30',
      text: 'text-white',
      welcomeColor: 'text-yellow-300',
      background: 'bg-gradient-to-br from-gray-900 to-black',
      backgroundImage: null,
      aiMessage: 'Discover exclusive deals and limited-time offers',
      emojiTip: "🔥💥⚡"
    };
  }

  // Normalize "Default Theme" to "Black Friday"
  const themeName = dbTheme.name === 'Default Theme' ? 'Black Friday' : (dbTheme.name || 'Unnamed Theme');

  return {
    name: themeName,
    themePrompt: dbTheme.themePrompt || 'A beautiful theme',
    accent: dbTheme.accentColor || 'bg-indigo-500 hover:bg-indigo-600 text-white ring-indigo-400',
    card: dbTheme.card || 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30',
    text: dbTheme.text || 'text-gray-800',
    welcomeColor: dbTheme.welcomeColor || 'text-yellow-300',
    background: dbTheme.placeholderImage 
      ? `bg-cover bg-center` 
      : `bg-[url('https://placehold.co/1920x1080/000000/ffffff?text=${encodeURIComponent(dbTheme.name || 'Theme')}')] bg-cover bg-center`,
    backgroundImage: dbTheme.placeholderImage || null,
    placeholderImage: dbTheme.placeholderImage || null, // Restore saved placeholder image
    aiMessage: dbTheme.subHeader || `Welcome to our ${dbTheme.name || 'collection'}!`, // Restore saved subheader
    emojiTip: "✨"
  };
};

/**
 * Format price with dollar sign and ensure cents are shown
 */
export const formatPrice = (price: number | string): string => {
  const rawPrice = typeof price === 'string' ? parseFloat(price) : price;
  const formattedPrice = Math.round(rawPrice * 100) / 100; // Ensure 2 decimal places
  return `$${formattedPrice.toFixed(2)}`;
};

/**
 * Generate a unique asset ID
 */
export const generateAssetId = (): string => {
  return crypto.randomUUID();
};

/**
 * Extract color from CSS class
 */
export const extractColorFromClass = (className: string, prefix: string): string | null => {
  const match = className.match(new RegExp(`${prefix}-(\\w+)`));
  return match ? match[1] : null;
};

/**
 * Truncate description to approximately 2 lines (roughly 120 characters)
 * Attempts to break at sentence boundaries when possible
 */
export const truncateDescription = (description: string, maxLength: number = 120): string => {
  if (!description || description.length <= maxLength) {
    return description;
  }
  
  // Try to truncate at the last sentence boundary before maxLength
  const truncated = description.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  
  // If we found a sentence end within the last 30 chars, use it
  if (lastSentenceEnd > maxLength - 30 && lastSentenceEnd > 0) {
    return description.substring(0, lastSentenceEnd + 1);
  }
  
  // Otherwise, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength - 20 && lastSpace > 0) {
    return description.substring(0, lastSpace) + '...';
  }
  
  // Fallback: hard truncate with ellipsis
  return truncated + '...';
};

/**
 * Extract text color from CSS class
 */
export const extractTextColor = (className: string): string => {
  const match = className.match(/text-(\w+)/);
  return match ? match[1] : 'gray-800';
};

/**
 * Extract ring color from CSS class
 */
export const extractRingColor = (className: string): string => {
  const match = className.match(/ring-(\w+)/);
  return match ? match[1] : 'blue-500';
};

/**
 * Get theme colors for text styling
 */
export const getThemeColors = (theme: LegacyTheme) => {
  const primaryColor = extractColorFromClass(theme.accent, 'bg') || 'blue-600';
  const textColor = extractTextColor(theme.text) || 'gray-800';
  const welcomeColor = extractTextColor(theme.welcomeColor) || 'blue-200';
  const ringColor = extractRingColor(theme.accent) || 'blue-500';

  return {
    primary: primaryColor,
    text: textColor,
    welcome: welcomeColor,
    ring: ringColor,
    // CSS classes for dynamic styling
    primaryClass: `text-${primaryColor}`,
    textClass: `text-${textColor}`,
    welcomeClass: `text-${welcomeColor}`,
    ringClass: `ring-${ringColor}`,
    borderClass: `border-${ringColor}`,
  };
};

/**
 * Get quick colors with contrast to current theme
 */
export const getThemeQuickColors = (theme: LegacyTheme): string[] => {
  const parseText = (cls: string) => cls.replace('text-', '').trim();
  const parseBgFamily = (cls: string) => {
    const m = cls.match(/bg-([a-z]+)-\d+/);
    return m?.[1] ?? undefined;
  };
  const parseRingFamily = (cls: string) => {
    const m = cls.match(/ring-([a-z]+)-\d+/);
    return m?.[1] ?? undefined;
  };
  
  // Get theme's main color families
  const accentFamily = parseBgFamily(theme.accent || '') || 'blue';
  const ringFamily = parseRingFamily(theme.accent || '') || 'blue';
  const welcome = parseText(theme.welcomeColor);
  const body = parseText(theme.text);
  
  // Define contrast colors - opposite/complementary to theme
  const contrastMap: Record<string, string[]> = {
    'blue': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
    'yellow': ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6'], // cool blues
    'orange': ['#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'], // cool purples
    'red': ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981'], // cool greens
    'pink': ['#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981'], // cool greens
    'purple': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
    'green': ['#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444'], // warm reds
    'cyan': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
    'emerald': ['#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444'], // warm reds
    'amber': ['#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1'], // cool purples
    'slate': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
    'gray': ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'], // warm yellows
  };
  
  // Get contrast colors for the theme's main families
  const contrastColors = [
    ...(contrastMap[accentFamily] || []),
    ...(contrastMap[ringFamily] || []),
    '#FFFFFF', '#F3F4F6', '#E5E7EB', // neutrals for readability
  ];
  
  // Remove duplicates and ensure we have at least 9 colors
  const uniq = Array.from(new Set(contrastColors.filter(Boolean)));
  const fallback = ['#FFFFFF', '#F3F4F6', '#E5E7EB', '#FEF3C7', '#FDE68A', '#DBEAFE', '#BFDBFE', '#D1FAE5', '#A7F3D0'];
  while (uniq.length < 9) {
    const next = fallback.shift();
    if (!next) break;
    if (!uniq.includes(next)) uniq.push(next);
  }
  
  return uniq.slice(0, 12); // provide up to 12 chips but at least 9
};

/**
 * Map ring class to a safe hover:ring-* class included at build time
 */
export const getHoverRingClass = (ringCls: string): string => {
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
    case 'ring-purple-400':
      return 'hover:ring-purple-400';
    case 'ring-rose-400':
      return 'hover:ring-rose-400';
    case 'ring-blue-400':
      return 'hover:ring-blue-400';
    case 'ring-slate-400':
      return 'hover:ring-slate-400';
    case 'ring-orange-400':
      return 'hover:ring-orange-400';
    default:
      return 'hover:ring-indigo-400';
  }
};

/**
 * Map ring color to an under-glow background for hover
 */
export const getGlowBgClass = (ringCls: string): string => {
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
    case 'ring-purple-400':
      return 'bg-purple-400/40';
    case 'ring-rose-400':
      return 'bg-rose-400/40';
    case 'ring-blue-400':
      return 'bg-blue-400/40';
    case 'ring-slate-400':
      return 'bg-slate-400/40';
    case 'ring-orange-400':
      return 'bg-orange-400/40';
    default:
      return 'bg-indigo-400/40';
  }
};

/**
 * Stronger glow color mapping for deeper halo
 */
export const getGlowBgStrongClass = (ringCls: string): string => {
  switch (ringCls) {
    case 'ring-indigo-400':
      return 'bg-indigo-400/70';
    case 'ring-cyan-400':
      return 'bg-cyan-400/70';
    case 'ring-fuchsia-400':
      return 'bg-fuchsia-400/70';
    case 'ring-emerald-400':
      return 'bg-emerald-400/70';
    case 'ring-amber-400':
      return 'bg-amber-400/70';
    case 'ring-purple-400':
      return 'bg-purple-400/70';
    case 'ring-rose-400':
      return 'bg-rose-400/70';
    case 'ring-blue-400':
      return 'bg-blue-400/70';
    case 'ring-slate-400':
      return 'bg-slate-400/70';
    case 'ring-orange-400':
      return 'bg-orange-400/70';
    default:
      return 'bg-indigo-400/70';
  }
};









