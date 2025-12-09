import React, { useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Product, LegacyTheme, LoadingState } from '../types';
import { TrashIcon, ZapIcon } from './Icons';
import { Button } from 'frosted-ui';
import { Zap, Flame, Star, Bold, Italic, Palette, ArrowLeft } from 'lucide-react';
import { normalizeHtmlContent, stripInlineColorTags } from '../utils/html';

interface ProductCardProps {
  product: Product;
  theme: LegacyTheme;
  isEditorView: boolean;
  loadingState: LoadingState;
  onUpdateProduct: (id: number | string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: number | string) => void;
  onProductImageUpload: (productId: number | string, file: File) => void;
  onRefineProduct: (product: Product) => void;
  onRemoveSticker: (productId: number | string) => void;
  onDropAsset: (e: React.DragEvent, productId: number | string) => void;
  onOpenEditor?: (productId: number | string, target: 'name' | 'description' | 'card' | 'button') => void;
  inlineButtonEditing?: boolean;
  onInlineButtonSave?: (text: string) => void;
  onInlineButtonEnd?: () => void;
  discountSettings?: {
    enabled: boolean;
    startDate: string;
    endDate: string;
  };
  getThemeQuickColors?: (theme: any) => string[];
  backgroundUrl?: string | null;
  onOpenProductPage?: (product: Product) => void; // Handler to open ProductPageModal for FILE type products
  storeName?: string; // Store name for modal
  experienceId?: string; // Experience ID for payment
}

// Helper to convert Tailwind text color class to hex
const tailwindTextColorToHex = (textClass: string): string | null => {
  if (!textClass) return null;
  const match = textClass.match(/text-(\w+)-(\d+)/);
  if (!match) return null;
  const colorName = match[1];
  const shade = parseInt(match[2], 10);
  const colorMap: Record<string, Record<number, string>> = {
    gray: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: '#111827' },
    blue: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A' },
    indigo: { 50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA', 800: '#3730A3', 900: '#312E81' },
    purple: { 50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95' },
    violet: { 50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95' },
    pink: { 50: '#FDF2F8', 100: '#FCE7F3', 200: '#FBCFE8', 300: '#F9A8D4', 400: '#F472B6', 500: '#EC4899', 600: '#DB2777', 700: '#BE185D', 800: '#9F1239', 900: '#831843' },
    red: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D' },
    orange: { 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12' },
    yellow: { 50: '#FEFCE8', 100: '#FEF9C3', 200: '#FEF08A', 300: '#FDE047', 400: '#FACC15', 500: '#EAB308', 600: '#CA8A04', 700: '#A16207', 800: '#854D0E', 900: '#713F12' },
    green: { 50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D', 800: '#166534', 900: '#14532D' },
    cyan: { 50: '#ECFEFF', 100: '#CFFAFE', 200: '#A5F3FC', 300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490', 800: '#155E75', 900: '#164E63' },
    amber: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309', 800: '#92400E', 900: '#78350F' },
    slate: { 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A' },
    emerald: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857', 800: '#065F46', 900: '#064E3B' },
    rose: { 50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF', 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48', 700: '#BE123C', 800: '#9F1239', 900: '#881337' },
    teal: { 50: '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E', 800: '#115E59', 900: '#134E4A' },
  };
  if (colorMap[colorName] && colorMap[colorName][shade]) {
    return colorMap[colorName][shade];
  }
  return null;
};

// Helper to truncate HTML content to approximately 2 lines (120 characters)
const truncateHTMLToTwoLines = (html: string, maxLength: number = 120): string => {
  if (!html) return html;
  
  // Strip HTML tags to get plain text length
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const plainText = tempDiv.textContent || tempDiv.innerText || '';
  
  if (plainText.length <= maxLength) {
    return html;
  }
  
  // If content is too long, truncate at word boundary
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastPeriod = truncated.lastIndexOf('.');
  const lastExclamation = truncated.lastIndexOf('!');
  const lastQuestion = truncated.lastIndexOf('?');
  
  // Prefer sentence boundary, then word boundary
  const sentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
  const truncateAt = sentenceEnd > maxLength - 30 && sentenceEnd > 0 
    ? sentenceEnd + 1 
    : (lastSpace > maxLength - 20 && lastSpace > 0 ? lastSpace : maxLength);
  
  const truncatedText = plainText.substring(0, truncateAt).trim();
  
  // If original had HTML, preserve the first opening tag structure
  if (html.includes('<')) {
    // Find first opening tag
    const firstTagMatch = html.match(/^<[^>]+>/);
    const firstTag = firstTagMatch ? firstTagMatch[0] : '';
    
    // Find corresponding closing tag pattern
    if (firstTag) {
      const tagName = firstTag.match(/<(\w+)/)?.[1];
      const closingTag = tagName ? `</${tagName}>` : '';
      return `${firstTag}${truncatedText}...${closingTag}`;
    }
  }
  
  return truncatedText + '...';
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  theme,
  isEditorView,
  loadingState,
  onUpdateProduct,
  onDeleteProduct,
  onProductImageUpload,
  onRefineProduct,
  onRemoveSticker,
  onDropAsset,
  onOpenEditor,
  inlineButtonEditing,
  onInlineButtonSave,
  onInlineButtonEnd,
  discountSettings,
  getThemeQuickColors,
  backgroundUrl,
  onOpenProductPage,
  storeName,
  experienceId,
}) => {
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onProductImageUpload(product.id, file);
    }
  }, [product.id, onProductImageUpload]);

  // State for formatting toolbars (name)
  const [nameRef, setNameRef] = React.useState<HTMLDivElement | null>(null);
  const [showNameToolbar, setShowNameToolbar] = React.useState(false);
  const [showNameColorPicker, setShowNameColorPicker] = React.useState(false);
  const [selectedNameColor, setSelectedNameColor] = React.useState('#000000');
  const [activeNameSubToolbar, setActiveNameSubToolbar] = React.useState<'color' | null>(null);
  const nameToolbarRef = React.useRef<HTMLDivElement | null>(null);

  // State for formatting toolbars (description)
  const [descRef, setDescRef] = React.useState<HTMLDivElement | null>(null);
  const [showDescToolbar, setShowDescToolbar] = React.useState(false);
  const [showDescColorPicker, setShowDescColorPicker] = React.useState(false);
  const [selectedDescColor, setSelectedDescColor] = React.useState('#000000');
  const [activeDescSubToolbar, setActiveDescSubToolbar] = React.useState<'color' | null>(null);
  const descToolbarRef = React.useRef<HTMLDivElement | null>(null);

  // Helper to extract color theme from cardClass and generate quick colors
  const getCardStyleQuickColors = (cardClass: string, titleClass: string = '', descClass: string = ''): string[] => {
    // Extract color name from cardClass (e.g., "violet", "green", "red", "blue", "amber", "gray")
    // Handles both bg-violet-50 and bg-violet-50/95 patterns, and dark:bg-violet-900/20
    // Try to match the first bg- class (light mode first, then dark mode)
    const lightMatch = cardClass.match(/\bbg-(violet|green|red|blue|amber|gray|slate|emerald|rose|purple|indigo|pink|yellow|orange|cyan|teal)-(\d+)(?:\/(\d+))?\b/);
    const darkMatch = !lightMatch ? cardClass.match(/\bdark:bg-(violet|green|red|blue|amber|gray|slate|emerald|rose|purple|indigo|pink|yellow|orange|cyan|teal)-(\d+)(?:\/(\d+))?\b/) : null;
    const colorName = lightMatch ? lightMatch[1] : (darkMatch ? darkMatch[1] : null);
    
    // Color palettes for each theme (all unique colors)
    const colorPalettes: Record<string, string[]> = {
      violet: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF', '#FAF5FF', '#FFFFFF', '#000000', '#1F2937', '#4B5563'],
      green: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#ECFDF5', '#F0FDF4', '#FFFFFF', '#000000', '#1F2937', '#4B5563'],
      red: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2', '#FEF2F2', '#FFF1F2', '#FFFFFF', '#000000', '#1F2937', '#4B5563'],
      blue: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', '#F0F9FF', '#FFFFFF', '#000000', '#1F2937', '#4B5563'],
      amber: ['#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A', '#FEF3C7', '#FFFBEB', '#FFFFFF', '#000000', '#1F2937', '#4B5563', '#6B7280'],
      gray: ['#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB', '#FFFFFF', '#000000', '#1F2937', '#111827'],
      slate: ['#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F1F5F9', '#F8FAFC', '#FFFFFF', '#000000', '#1F2937', '#0F172A'],
      emerald: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5', '#ECFDF5', '#F0FDF4', '#FFFFFF', '#000000', '#1F2937', '#4B5563'],
      rose: ['#E11D48', '#F43F5E', '#FB7185', '#FDA4AF', '#FECDD3', '#FFE4E6', '#FFF1F2', '#FFFFFF', '#000000', '#1F2937', '#4B5563', '#6B7280'],
      purple: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE', '#F5F3FF', '#FAF5FF', '#FFFFFF', '#000000', '#1F2937', '#4B5563'],
      indigo: ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#E0E7FF', '#EEF2FF', '#F5F7FF', '#FFFFFF', '#000000', '#1F2937', '#4B5563'],
      pink: ['#DB2777', '#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#FCE7F3', '#FDF2F8', '#FFFFFF', '#000000', '#1F2937', '#4B5563', '#6B7280'],
      yellow: ['#CA8A04', '#EAB308', '#FACC15', '#FDE047', '#FEF08A', '#FEF9C3', '#FEFCE8', '#FFFFFF', '#000000', '#1F2937', '#4B5563', '#6B7280'],
      orange: ['#EA580C', '#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#FFEDD5', '#FFF7ED', '#FFFFFF', '#000000', '#1F2937', '#4B5563', '#6B7280'],
      cyan: ['#0891B2', '#06B6D4', '#22D3EE', '#67E8F9', '#A5F3FC', '#CFFAFE', '#ECFEFF', '#FFFFFF', '#000000', '#1F2937', '#4B5563', '#6B7280'],
      teal: ['#0D9488', '#14B8A6', '#5EEAD4', '#99F6E4', '#CCFBF1', '#F0FDFA', '#FFFFFF', '#000000', '#1F2937', '#4B5563', '#6B7280', '#9CA3AF'],
    };
    
    if (colorName && colorPalettes[colorName]) {
      // Return unique colors only
      return Array.from(new Set(colorPalettes[colorName]));
    }
    
    // Extract colors from titleClass and descClass as fallback
    const titleLightMatch = titleClass.match(/\btext-(violet|green|red|blue|amber|gray|slate|emerald|rose|purple|indigo|pink|yellow|orange|cyan|teal)-(\d+)\b/);
    const titleDarkMatch = !titleLightMatch ? titleClass.match(/\bdark:text-(violet|green|red|blue|amber|gray|slate|emerald|rose|purple|indigo|pink|yellow|orange|cyan|teal)-(\d+)\b/) : null;
    const titleColorName = titleLightMatch ? titleLightMatch[1] : (titleDarkMatch ? titleDarkMatch[1] : null);
    
    if (titleColorName && colorPalettes[titleColorName]) {
      return colorPalettes[titleColorName];
    }
    
    // Default fallback
    return ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937', '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6'];
  };

  // Quick colors - prioritize card style colors over background image
  const [quickColors, setQuickColors] = React.useState<string[]>(['#FFFFFF', '#000000', '#F3F4F6', '#1F2937']);
  
  React.useEffect(() => {
    const loadQuickColors = async () => {
      const themeTextColorHex = theme?.text ? tailwindTextColorToHex(theme.text) : null;
      
      // Priority 1: Use card style colors if cardClass is set
      if (product.cardClass) {
        const cardStyleColors = getCardStyleQuickColors(product.cardClass, product.titleClass || '', product.descClass || '');
        const colors = themeTextColorHex && !cardStyleColors.includes(themeTextColorHex)
          ? [themeTextColorHex, ...cardStyleColors]
          : [...cardStyleColors];
        // Ensure uniqueness and limit to 12
        setQuickColors(Array.from(new Set(colors)).slice(0, 12));
        return;
      }
      
      // Priority 2: If we have a background URL, extract colors from it (includes matching and contrasting colors)
      if (backgroundUrl) {
        try {
          const { extractColorsFromImage } = await import('../utils/backgroundAnalyzer');
          const extractedColors = await extractColorsFromImage(backgroundUrl, 12);
          if (extractedColors && extractedColors.length > 0) {
            const colors = themeTextColorHex && !extractedColors.includes(themeTextColorHex)
              ? [themeTextColorHex, ...extractedColors]
              : [...extractedColors];
            // Ensure uniqueness and limit to 12
            setQuickColors(Array.from(new Set(colors)).slice(0, 12));
            return;
          }
        } catch (error) {
          console.warn('Failed to extract colors from background, using theme colors:', error);
        }
      }
      
      // Priority 3: Fallback to theme colors
      if (getThemeQuickColors && theme) {
        try {
          const themeColors = getThemeQuickColors(theme);
          const colors = themeTextColorHex && !themeColors.includes(themeTextColorHex)
            ? [themeTextColorHex, ...themeColors]
            : [...themeColors];
          // Ensure uniqueness and limit to 12
          setQuickColors(Array.from(new Set(colors)).slice(0, 12));
        } catch {
          const fallback = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937'];
          const colors = themeTextColorHex && !fallback.includes(themeTextColorHex)
            ? [themeTextColorHex, ...fallback]
            : [...fallback];
          // Ensure uniqueness
          setQuickColors(Array.from(new Set(colors)));
        }
      } else {
        const fallback = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937'];
        const colors = themeTextColorHex && !fallback.includes(themeTextColorHex)
          ? [themeTextColorHex, ...fallback]
          : [...fallback];
        // Ensure uniqueness
        setQuickColors(Array.from(new Set(colors)));
      }
    };
    loadQuickColors();
  }, [product.cardClass, product.titleClass, product.descClass, backgroundUrl, theme, getThemeQuickColors]);

  const nameHasHtmlFormatting = product.name && /<[^>]+>/.test(product.name);
  const descHasHtmlFormatting = product.description && /<[^>]+>/.test(product.description);

  // Sync contentEditable with product name/description
  // IMPORTANT: Always use innerHTML to properly handle HTML entities like &nbsp;
  // Using textContent would treat entities as literal text and cause double-encoding
  React.useEffect(() => {
    if (nameRef && product.name) {
      const normalizedName = normalizeHtmlContent(product.name);
      if (nameRef.innerHTML !== normalizedName) {
        nameRef.innerHTML = normalizedName;
      }
    }
  }, [nameRef, product.name]);

  React.useEffect(() => {
    if (descRef && product.description) {
      // Truncate description to 2 lines when loading
      const truncatedDescription = truncateHTMLToTwoLines(product.description);
      const normalizedDesc = normalizeHtmlContent(truncatedDescription);
      if (descRef.innerHTML !== normalizedDesc) {
        descRef.innerHTML = normalizedDesc;
      }
    }
  }, [descRef, product.description]);

  // Track previous inline colors to avoid redundant DOM writes
  const prevTitleColorRef = React.useRef<string | undefined>(undefined);
  const prevDescColorRef = React.useRef<string | undefined>(undefined);

  // Track previous titleClass and descClass to detect card style changes
  const prevTitleClassRef = React.useRef<string | undefined>(product.titleClass);
  const prevDescClassRef = React.useRef<string | undefined>(product.descClass);

  // Strip inline color styles when card style changes (titleClass/descClass changes)
  React.useEffect(() => {
    // Only process if refs are available and values actually changed
    if (!nameRef && !descRef) return;
    
    const titleClassChanged = product.titleClass !== prevTitleClassRef.current;
    const descClassChanged = product.descClass !== prevDescClassRef.current;
    
    // If card style changed, strip inline colors from HTML content
    if (titleClassChanged && nameRef) {
      const currentContent = nameRef.innerHTML || nameRef.textContent || '';
      if (currentContent) {
        const cleanedContent = stripInlineColorTags(currentContent);
        // Only update if content actually changed
        if (cleanedContent !== currentContent) {
          nameRef.innerHTML = cleanedContent;
          // Update product state with cleaned content
          onUpdateProduct(product.id, { name: cleanedContent });
        }
      }
    }
    
    if (descClassChanged && descRef) {
      const currentContent = descRef.innerHTML || descRef.textContent || '';
      if (currentContent) {
        const cleanedContent = stripInlineColorTags(currentContent);
        // Only update if content actually changed
        if (cleanedContent !== currentContent) {
          descRef.innerHTML = cleanedContent;
          // Update product state with cleaned content
          onUpdateProduct(product.id, { description: cleanedContent });
        }
      }
    }
    
    // Update refs for next comparison
    prevTitleClassRef.current = product.titleClass;
    prevDescClassRef.current = product.descClass;
  }, [
    product.titleClass,
    product.descClass,
    nameRef,
    descRef,
    product.id,
    onUpdateProduct,
  ]);

  // Apply card style color changes to product name and description (simplified)
  React.useEffect(() => {
    // Wait for refs and content to be ready (use timeout to ensure DOM is ready for first cards)
    const timeoutId = setTimeout(() => {
      if (!nameRef && !descRef) return;
      
      // Check if card is dark
      const cardClass = product.cardClass || theme.card;
      const isDarkCard = cardClass.includes('bg-gray-900') || cardClass.includes('bg-slate-800') || cardClass.includes('bg-[#0f0b1f]') || theme.name === 'Cyber Sale' || theme.name === 'Spooky Night';
      
      // Get colors from Card Styles
      let titleColorHex = titleClass ? tailwindTextColorToHex(titleClass) : null;
      let descColorHex = descClass ? tailwindTextColorToHex(descClass) : null;
      
      // For dark cards, only use white if color is missing or truly dark
      // Preserve theme colors (like orange-100, cyan-300) which are already light and appropriate for dark backgrounds
      if (isDarkCard) {
        const isDarkColor = (hex: string): boolean => {
          if (!hex) return true;
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return (r * 299 + g * 587 + b * 114) / 1000 < 128;
        };
        // Only override if color is missing or dark - preserve light theme colors (100-300 shades)
        // These are already appropriate for dark backgrounds
        if (!titleColorHex || (isDarkColor(titleColorHex) && !titleClass?.match(/-\d00$/))) {
          titleColorHex = '#FFFFFF';
        }
        if (!descColorHex || (isDarkColor(descColorHex) && !descClass?.match(/-\d00$/))) {
          descColorHex = '#FFFFFF';
        }
      }
      
      // Skip if no valid colors
      if (!titleColorHex && !descColorHex) {
        prevTitleColorRef.current = undefined;
        prevDescColorRef.current = undefined;
        return;
      }
      
      // Apply to name
      if (nameRef) {
        if (titleColorHex && titleColorHex !== prevTitleColorRef.current) {
          nameRef.style.color = titleColorHex;
          prevTitleColorRef.current = titleColorHex;
        } else if (!titleColorHex && prevTitleColorRef.current) {
          nameRef.style.color = '';
          prevTitleColorRef.current = undefined;
        }
      }
      
      // Apply to description
      if (descRef) {
        if (descColorHex && descColorHex !== prevDescColorRef.current) {
          descRef.style.color = descColorHex;
          prevDescColorRef.current = descColorHex;
        } else if (!descColorHex && prevDescColorRef.current) {
          descRef.style.color = '';
          prevDescColorRef.current = undefined;
        }
      }
    }, 0); // Use setTimeout to ensure DOM is ready
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    product.titleClass,
    product.descClass,
    product.cardClass,
    theme.text,
    theme.card,
    nameRef,
    descRef,
    product.id,
  ]);

  // Calculate discounted price
  const discountedPrice = React.useMemo(() => {
    const discountAmount = Number(product.promoDiscountAmount ?? 0);
    const shouldShowDiscount =
      discountAmount > 0 &&
      product.promoDiscountType;

    if (!shouldShowDiscount) {
      return null;
    }
    
    if (product.promoDiscountType === 'percentage') {
      return product.price * (1 - discountAmount / 100);
    } else {
      return Math.max(0, product.price - discountAmount);
    }
  }, [product.promoDiscountType, product.promoDiscountAmount, product.price]);

  // Calculate discount display
  const discountDisplay = React.useMemo(() => {
    const discountAmount = Number(product.promoDiscountAmount ?? 0);
    if (discountAmount <= 0) {
      return null;
    }
    
    if (product.promoDiscountType === 'percentage') {
      return `-${discountAmount}%`;
    } else {
      return `-$${discountAmount.toFixed(2)}`;
    }
  }, [product.promoDiscountType, product.promoDiscountAmount]);

  const salesCountValue = typeof product.salesCount === 'number' ? Math.max(0, product.salesCount) : null;
  const ratingValue = typeof product.starRating === 'number' ? Math.min(5, Math.max(0, product.starRating)) : null;
  const reviewCountValue = typeof product.reviewCount === 'number' ? Math.max(0, product.reviewCount) : null;
  const shouldShowSalesInfo = Boolean(product.showSalesCount && salesCountValue !== null);
  const shouldShowRatingInfo = Boolean(product.showRatingInfo && ratingValue !== null);

  // Logic: prefer per-card text classes, then theme
  const titleClass = product.titleClass || theme.text;
  const descClass = product.descClass || theme.text;
  const isDarkCard = (product.cardClass || theme.card).includes('bg-gray-900') || (product.cardClass || theme.card).includes('bg-slate-800') || (product.cardClass || theme.card).includes('bg-[#0f0b1f]') || theme.name === 'Cyber Sale' || theme.name === 'Spooky Night';
  const priceTextColor = titleClass?.startsWith('text-') ? titleClass : (isDarkCard ? 'text-white' : theme.text);
  
  // Check if HTML content has formatting (tags or inline styles)

  const cardClass = product.cardClass || theme.card;
  const buttonText = product.buttonText || 'VIEW DETAILS';
  const buttonBaseClass = product.buttonClass || theme.accent;
  
  // Parse transparency from cardClass and extract base background color
  const getCardStyle = () => {
    // Match bg-color/opacity or bg-[custom]/opacity patterns
    const transparencyMatch = cardClass.match(/bg-((?:\[[^\]]+\]|[^\s/]+)+)\/(\d{1,3})/);
    if (transparencyMatch && transparencyMatch[1] && transparencyMatch[2]) {
      const bgColor = transparencyMatch[1];
      const opacityValue = parseInt(transparencyMatch[2], 10) / 100;
      
      // Map common Tailwind colors to RGB values
      const colorMap: Record<string, string> = {
        'white': '255, 255, 255',
        'gray-50': '249, 250, 251',
        'gray-100': '243, 244, 246',
        'gray-200': '229, 231, 235',
        'gray-300': '209, 213, 219',
        'gray-400': '156, 163, 175',
        'gray-500': '107, 114, 128',
        'gray-600': '75, 85, 99',
        'gray-700': '55, 65, 81',
        'gray-800': '31, 41, 55',
        'gray-900': '17, 24, 39',
        'slate-100': '241, 245, 249',
        'slate-800': '30, 41, 59',
        'amber-50': '255, 251, 235',
        'green-50': '240, 253, 244',
        'purple-50': '250, 245, 255',
        'blue-50': '239, 246, 255',
        'rose-50': '255, 241, 242',
        'emerald-50': '236, 253, 245',
      };
      
      // Handle custom colors like bg-[#0f0b1f]
      let rgbColor = '255, 255, 255'; // default to white
      if (bgColor.startsWith('[') && bgColor.endsWith(']')) {
        // Custom color like [#0f0b1f]
        const hexColor = bgColor.slice(1, -1);
        if (hexColor.startsWith('#')) {
          const hex = hexColor.slice(1);
          if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            rgbColor = `${r}, ${g}, ${b}`;
          }
        }
      } else {
        // Standard Tailwind color
        rgbColor = colorMap[bgColor] || '255, 255, 255';
      }
      
      // Remove the background class with opacity and apply via inline style
      // This regex matches bg-color/opacity and removes it, keeping other classes
      const baseCardClass = cardClass.replace(/bg-(?:\[[^\]]+\]|[^\s/]+)\/\d{1,3}/, '').trim();
      return {
        className: baseCardClass,
        style: { 
          backgroundColor: `rgba(${rgbColor}, ${opacityValue})`,
        }
      };
    }
    return {
      className: cardClass,
      style: {}
    };
  };
  
  const cardStyle = getCardStyle();
  
  // Debug logging - only log when product actually changes
  const prevProduct = useRef(product);
  useEffect(() => {
    if (JSON.stringify(prevProduct.current) !== JSON.stringify(product)) {
      console.log('🎨 ProductCard render for product:', product.id, {
        cardClass: product.cardClass,
        titleClass: product.titleClass,
        descClass: product.descClass,
        buttonClass: product.buttonClass,
        finalCardClass: cardClass,
        finalTitleClass: titleClass,
        finalDescClass: descClass
      });
      prevProduct.current = product;
    }
  }, [product, cardClass, titleClass, descClass]);
  // Avoid inline color styles per instructions; rely on classes only

  // FormattingToolbar component (simplified version for ProductCard)
  const FormattingToolbar: React.FC<{
    show: boolean;
    elementRef: HTMLDivElement | null;
    toolbarRef: React.RefObject<HTMLDivElement | null>;
    showColorPicker: boolean;
    setShowColorPicker: (show: boolean) => void;
    selectedColor: string;
    setSelectedColor: (color: string) => void;
    quickColors: string[];
    activeSubToolbar: 'color' | null;
    setActiveSubToolbar: React.Dispatch<React.SetStateAction<'color' | null>>;
    onBold: () => void;
    onItalic: () => void;
    onColorChange: (color: string) => void;
    onClose: () => void;
  }> = ({ 
    show, 
    elementRef, 
    toolbarRef, 
    showColorPicker, 
    setShowColorPicker, 
    selectedColor,
    setSelectedColor,
    quickColors,
    activeSubToolbar,
    setActiveSubToolbar,
    onBold,
    onItalic,
    onColorChange,
    onClose,
  }) => {
    if (!show || !elementRef || typeof window === 'undefined') return null;
    
    const getToolbarPosition = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (elementRef.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          return { top: rect.top - 50, left: rect.left + (rect.width / 2) };
        }
      }
      const rect = elementRef.getBoundingClientRect();
      return { top: rect.top - 50, left: rect.left + (rect.width / 2) };
    };
    
    const [position, setPosition] = React.useState(getToolbarPosition);
    const hasSetInitialPosition = React.useRef(false);
    
    // Update position only when toolbar first appears
    React.useEffect(() => {
      if (show && !hasSetInitialPosition.current) {
        setPosition(getToolbarPosition());
        hasSetInitialPosition.current = true;
      } else if (!show) {
        // Reset flag when toolbar is hidden
        hasSetInitialPosition.current = false;
      }
    }, [show, elementRef]);
    
    // Show sub-toolbar only for color picker
    if (activeSubToolbar === 'color') {
      return createPortal(
        <>
          {/* Transparent overlay to intercept clicks outside toolbar */}
          <div
            className="fixed inset-0 bg-transparent"
            style={{
              zIndex: 999998,
              pointerEvents: 'auto',
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Blur the contentEditable element to exit edit mode
              if (elementRef) {
                elementRef.blur();
              }
              onClose();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          <div
            ref={toolbarRef}
            className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-2"
            style={{
              pointerEvents: 'auto',
              zIndex: 999999,
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translateX(-50%)',
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
          {/* Back button */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveSubToolbar(null);
              setShowColorPicker(false);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          {/* Color picker grid */}
          <div className="grid grid-cols-6 gap-1">
            {quickColors.map((color) => (
              <button
                key={color}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (elementRef) {
                    elementRef.focus();
                    // If no selection, select all first
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                      const range = document.createRange();
                      range.selectNodeContents(elementRef);
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                    }
                    setSelectedColor(color);
                    onColorChange(color);
                    setActiveSubToolbar(null);
                    onClose();
                  }
                }}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          </div>
        </>,
        document.body
      );
    }
    
    // Main toolbar
    return createPortal(
      <>
        {/* Transparent overlay to intercept clicks outside toolbar */}
        <div
          className="fixed inset-0 bg-transparent"
          style={{
            zIndex: 999998,
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
        <div
          ref={toolbarRef}
          className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-2"
          style={{
            pointerEvents: 'auto',
            zIndex: 999999,
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBold();
            onClose();
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onItalic();
            onClose();
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (elementRef) {
              elementRef.focus();
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                let element: Element | null = null;
                if (range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
                  element = range.commonAncestorContainer.parentElement;
                } else {
                  element = range.commonAncestorContainer as Element;
                }
                while (element && element !== elementRef) {
                  const style = element.getAttribute('style');
                  if (style) {
                    const colorMatch = style.match(/color:\s*([^;]+)/i);
                    if (colorMatch) {
                      setSelectedColor(colorMatch[1].trim());
                      break;
                    }
                  }
                  element = element.parentElement;
                }
              }
            }
            setActiveSubToolbar('color');
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Text Color"
        >
          <Palette className="w-4 h-4" />
        </button>
        </div>
      </>,
      document.body
    );
  };

  return (
    <div className="relative max-w-xs mx-auto" data-prevent-bg-toggle="true">
      {/* Blurred background for visual feedback */}
      <div 
        className="absolute inset-0 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg"
        style={{ 
          zIndex: -1,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          backdropFilter: 'blur(8px)'
        }}
      />
      
      {/* Main product card */}
      <div 
        className={`group rounded-2xl transition-all duration-300 ${cardStyle.className} flex flex-col relative max-w-xs mx-auto overflow-hidden`}
        style={cardStyle.style}
        onClick={(e) => {
          if (!isEditorView) return;
          const target = e.target as HTMLElement;
          // Treat product name/desc and form fields as interactive to avoid opening modal while inline editing
          const interactive = target.closest('button,input,textarea,label,[data-inline-product-name],[data-inline-product-desc]');
          if (interactive) return;
          if (onOpenEditor) onOpenEditor(product.id, 'card');
        }}
      >
      {/* Image Section - Top Half */}
      <div className="relative h-56 w-full">
        {/* Background Image - fills top half */}
        <div 
          className="absolute inset-0 rounded-t-2xl overflow-hidden"
          style={{
            backgroundImage: product.imageAttachmentUrl 
              ? `url(${product.imageAttachmentUrl})` 
              : product.image
                ? `url(${product.image})`
                : `url(https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: `drop-shadow(0 10px 10px ${
              theme.name === 'Fall' ? 'rgba(160, 82, 45, 0.5)' : 
              theme.name === 'Winter' ? 'rgba(31, 74, 155, 0.5)' : 
              'rgba(232, 160, 2, 0.5)'
            })`
          }}
        />
        
        {/* Fire Icon + "X left" text - Top Right Corner */}
        {(() => {
          const showFire =
            product.promoShowFireIcon &&
            product.promoQuantityLeft !== undefined &&
            product.promoQuantityLeft > 0;

          if (!showFire) return null;

          return (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg">
            <Flame className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-bold">
              {product.promoQuantityLeft} left
            </span>
          </div>
          );
        })()}

        {/* Badge as diagonal ribbon extending beyond card borders - 45 degree angle */}
        {product.badge && (
          <div 
            className="absolute top-0 left-0 z-30 pointer-events-none"
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            {/* Ribbon that extends beyond left and right borders */}
            <div 
              className={`absolute font-bold text-[10px] shadow-lg ${
                product.badge === 'new' 
                  ? 'bg-green-500' 
                  : product.badge === '5star'
                  ? 'bg-yellow-600'
                  : product.badge === 'bestseller'
                  ? 'bg-orange-500'
                  : ''
              }`}
              style={{
                width: '150%',
                height: '28px',
                left: '-65%',
                top: '15px',
                transform: 'rotate(-45deg)',
                transformOrigin: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            />
            {/* Text container - clipped to stay within card boundaries, centered at midpoint of shard intersections */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                overflow: 'hidden',
              }}
            >
               {/* Shard center is at 10% of card width (midpoint between entry and exit) */}
                <div 
                className={`absolute flex items-center justify-center font-bold text-[10px] ${
                  product.badge === 'new' 
                    ? 'text-white' 
                    : product.badge === '5star'
                    ? 'text-white'
                    : product.badge === 'bestseller'
                    ? 'text-white'
                    : ''
                }`}
                  style={{
                    top: '15px',
                    left: '10%',
                    transform: 'translateX(-50%) rotate(-45deg)',
                    transformOrigin: 'center center',
                    height: '28px',
                    whiteSpace: 'nowrap',
                  }}
                >
                {product.badge === 'new' ? 'New' : product.badge === '5star' ? '5 ⭐' : 'BestSeller'}
              </div>
            </div>
          </div>
        )}
        
        {shouldShowRatingInfo && ratingValue !== null && (
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 rounded-full bg-black/70 text-white text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm shadow-lg">
            <Star className="w-4 h-4 text-amber-300 fill-current" fill="currentColor" />
            <span>{ratingValue.toFixed(1)}</span>
            <span className="text-white/80">
              ({(reviewCountValue ?? 0).toLocaleString()} reviews)
            </span>
          </div>
        )}

        {shouldShowSalesInfo && salesCountValue !== null && (
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-full bg-white/90 text-gray-900 text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm shadow-lg">
            <span>{salesCountValue.toLocaleString()} sold</span>
          </div>
        )}
      </div>
      {/* Theme Up Button - Top Right (Only visible in Editor View and on hover) */}
      {isEditorView && (
          <Button
            size="3"
            color="green"
            onClick={() => onRefineProduct(product)}
            disabled={loadingState.isTextLoading || loadingState.isImageLoading}
            className={`absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-6 py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 group ${
              (loadingState.isTextLoading || loadingState.isImageLoading) 
                ? 'cursor-not-allowed' 
                : ''
            }`}
            title="Theme Up!"
          >
            <Zap
              size={20}
              strokeWidth={2.5}
              className="group-hover:scale-110 transition-transform duration-300"
            />
            <span className="ml-1">Theme Up!</span>
          </Button>
      )}

      {/* Drop Zone for Assets - covers entire card */}
      <div 
        className="absolute inset-0 product-container-drop-zone"
        onDragOver={(e) => isEditorView && e.preventDefault()}
        onDrop={(e) => onDropAsset(e, product.id)}
      />
      
      {/* Text Content Section - Bottom Half */}
      <div className="px-3 py-2 flex flex-col flex-grow text-center relative z-30">
        {/* Editable Product Name */}
        {isEditorView ? (
          <div className="relative">
            <FormattingToolbar
              show={showNameToolbar}
              elementRef={nameRef}
              toolbarRef={nameToolbarRef}
              showColorPicker={showNameColorPicker}
              setShowColorPicker={setShowNameColorPicker}
              selectedColor={selectedNameColor}
              setSelectedColor={setSelectedNameColor}
              quickColors={quickColors}
              activeSubToolbar={activeNameSubToolbar}
              setActiveSubToolbar={setActiveNameSubToolbar}
              onClose={() => {
                setShowNameToolbar(false);
                setShowNameColorPicker(false);
                setActiveNameSubToolbar(null);
              }}
              onBold={() => {
                if (nameRef) {
                  nameRef.focus();
                  // Select all text in the field
                  const range = document.createRange();
                  range.selectNodeContents(nameRef);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                  selection?.addRange(range);
                  // Apply bold to all selected text
                      document.execCommand('bold', false);
                  selection?.removeAllRanges();
                  const content = nameRef.innerHTML || nameRef.textContent || '';
                  onUpdateProduct(product.id, { name: content });
                }
              }}
              onItalic={() => {
                if (nameRef) {
                  nameRef.focus();
                  // Select all text in the field
                  const range = document.createRange();
                  range.selectNodeContents(nameRef);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                  selection?.addRange(range);
                  // Apply italic to all selected text
                      document.execCommand('italic', false);
                  selection?.removeAllRanges();
                  const content = nameRef.innerHTML || nameRef.textContent || '';
                  onUpdateProduct(product.id, { name: content });
                }
              }}
              onColorChange={(color) => {
                if (nameRef) {
                  nameRef.focus();
                  // Always select all text in the field
                    const range = document.createRange();
                    range.selectNodeContents(nameRef);
                  const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                  // Apply color to all selected text
                    document.execCommand('foreColor', false, color);
                    selection?.removeAllRanges();
                  const content = nameRef.innerHTML || nameRef.textContent || '';
                  onUpdateProduct(product.id, { name: content });
                }
              }}
            />
            <div
              ref={setNameRef}
              contentEditable
              className={`text-lg font-bold mb-0.5 ${titleClass} cursor-text hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1 outline-none`}
              onClick={(e) => {
                e.stopPropagation();
                // Hide description toolbar when clicking on name
                setShowDescToolbar(false);
                setShowDescColorPicker(false);
                setActiveDescSubToolbar(null);
                setShowNameToolbar(true);
              }}
              onSelect={() => {
                // Hide description toolbar when selecting in name
                setShowDescToolbar(false);
                setShowDescColorPicker(false);
                setActiveDescSubToolbar(null);
                setShowNameToolbar(true);
              }}
              onBlur={(e) => {
                const relatedTarget = e.relatedTarget as Node;
                const toolbarElement = nameToolbarRef.current;
                const isClickingToolbar = toolbarElement && (
                  toolbarElement.contains(relatedTarget) || relatedTarget === toolbarElement
                );
                const content = nameRef?.innerHTML || nameRef?.textContent || '';
                onUpdateProduct(product.id, { name: content });
                if (!isClickingToolbar) {
                  setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (!toolbarElement?.contains(activeElement)) {
                      setShowNameToolbar(false);
                      setShowNameColorPicker(false);
                      setActiveNameSubToolbar(null);
                    }
                  }, 200);
                }
              }}
              onInput={() => {
                const rawContent = nameRef?.innerHTML || nameRef?.textContent || '';
                const content = normalizeHtmlContent(rawContent);
                onUpdateProduct(product.id, { name: content });
              }}
            />
          </div>
        ) : (
          <h2 
            className={`text-lg font-bold mb-0.5 ${nameHasHtmlFormatting ? '' : titleClass}`}
            dangerouslySetInnerHTML={{ __html: product.name || '' }}
          />
        )}
        
        {/* Editable Product Description */}
        {isEditorView ? (
          <div className="relative">
            <FormattingToolbar
              show={showDescToolbar}
              elementRef={descRef}
              toolbarRef={descToolbarRef}
              showColorPicker={showDescColorPicker}
              setShowColorPicker={setShowDescColorPicker}
              selectedColor={selectedDescColor}
              setSelectedColor={setSelectedDescColor}
              quickColors={quickColors}
              activeSubToolbar={activeDescSubToolbar}
              setActiveSubToolbar={setActiveDescSubToolbar}
              onClose={() => {
                setShowDescToolbar(false);
                setShowDescColorPicker(false);
                setActiveDescSubToolbar(null);
              }}
              onBold={() => {
                if (descRef) {
                  descRef.focus();
                  // Select all text in the field
                  const range = document.createRange();
                  range.selectNodeContents(descRef);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                  selection?.addRange(range);
                  // Apply bold to all selected text
                      document.execCommand('bold', false);
                  selection?.removeAllRanges();
                  const content = descRef.innerHTML || descRef.textContent || '';
                  onUpdateProduct(product.id, { description: content });
                }
              }}
              onItalic={() => {
                if (descRef) {
                  descRef.focus();
                  // Select all text in the field
                  const range = document.createRange();
                  range.selectNodeContents(descRef);
                    const selection = window.getSelection();
                    selection?.removeAllRanges();
                  selection?.addRange(range);
                  // Apply italic to all selected text
                      document.execCommand('italic', false);
                  selection?.removeAllRanges();
                  const content = descRef.innerHTML || descRef.textContent || '';
                  onUpdateProduct(product.id, { description: content });
                }
              }}
              onColorChange={(color) => {
                if (descRef) {
                  descRef.focus();
                  // Always select all text in the field
                    const range = document.createRange();
                    range.selectNodeContents(descRef);
                  const selection = window.getSelection();
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                  // Apply color to all selected text
                    document.execCommand('foreColor', false, color);
                    selection?.removeAllRanges();
                  const content = descRef.innerHTML || descRef.textContent || '';
                  onUpdateProduct(product.id, { description: content });
                }
              }}
            />
            <div
              ref={setDescRef}
              contentEditable
              className={`text-xs mb-1 ${descClass} flex-grow cursor-text hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1 outline-none`}
              style={{
                minHeight: '1.5rem',
                maxHeight: '3rem',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-word',
                lineHeight: '1.5rem',
                whiteSpace: 'normal',
              }}
              onClick={(e) => {
                e.stopPropagation();
                // Hide name toolbar when clicking on description
                setShowNameToolbar(false);
                setShowNameColorPicker(false);
                setActiveNameSubToolbar(null);
                setShowDescToolbar(true);
              }}
              onSelect={() => {
                // Hide name toolbar when selecting in description
                setShowNameToolbar(false);
                setShowNameColorPicker(false);
                setActiveNameSubToolbar(null);
                setShowDescToolbar(true);
              }}
              onBlur={(e) => {
                const relatedTarget = e.relatedTarget as Node;
                const toolbarElement = descToolbarRef.current;
                const isClickingToolbar = toolbarElement && (
                  toolbarElement.contains(relatedTarget) || relatedTarget === toolbarElement
                );
                let content = descRef?.innerHTML || descRef?.textContent || '';
                // Truncate to 2 lines if content is too long
                content = truncateHTMLToTwoLines(content);
                // Update the element's content to match truncated version
                if (descRef && descRef.innerHTML !== content) {
                  descRef.innerHTML = content;
                }
                onUpdateProduct(product.id, { description: content });
                if (!isClickingToolbar) {
                  setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (!toolbarElement?.contains(activeElement)) {
                      setShowDescToolbar(false);
                      setShowDescColorPicker(false);
                      setActiveDescSubToolbar(null);
                    }
                  }, 200);
                }
              }}
              onInput={() => {
                const rawContent = descRef?.innerHTML || descRef?.textContent || '';
                const content = normalizeHtmlContent(rawContent);
                onUpdateProduct(product.id, { description: content });
              }}
            />
          </div>
        ) : (
          <p 
            className={`text-xs mb-1 ${descHasHtmlFormatting ? '' : descClass}`}
            dangerouslySetInnerHTML={{ __html: product.description || '' }}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              maxHeight: '3rem',
              lineHeight: '1.5rem',
            }}
          />
        )}
        
        {/* Editable Price */}
        <div className="text-xl font-extrabold mt-auto">
          <div className="flex items-center justify-center gap-3">
            {discountedPrice !== null ? (
              <>
                <span className={`text-2xl font-extrabold ${priceTextColor}`}>
                  ${discountedPrice.toFixed(2)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-500 line-through">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                    {discountDisplay}
                  </span>
                </span>
              </>
            ) : (
              <span className={`text-2xl font-extrabold ${priceTextColor}`}>
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Button / Inline Button Text Editor */}
        {isEditorView && inlineButtonEditing ? (
          <input
            type="text"
            defaultValue={buttonText}
            onChange={(e) => onInlineButtonSave && onInlineButtonSave(e.target.value)}
            onBlur={() => onInlineButtonEnd && onInlineButtonEnd()}
            className="w-full max-w-48 mx-auto py-2 px-3 rounded-full bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-center font-bold uppercase tracking-wider"
          />
        ) : (
          <button 
            className={`w-full max-w-48 py-1.5 px-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] ${buttonBaseClass} shadow-xl ring-2 ring-offset-2 ring-offset-white mx-auto`}
            onClick={(e) => { 
              console.log('🔵 [ProductCard] Button clicked:', {
                productId: product.id,
                productName: product.name,
                isEditorView,
                hasOnOpenEditor: !!onOpenEditor,
                hasButtonLink: !!product.buttonLink,
                buttonLink: product.buttonLink,
                buttonText: buttonText,
                productType: product.type,
                hasStorageUrl: !!product.storageUrl,
                buttonLinkType: product.buttonLink ? (product.buttonLink.startsWith('http') ? 'external' : 'relative') : 'none',
              });
              
              if (isEditorView && onOpenEditor) { 
                console.log('🔵 [ProductCard] Editor view - opening editor for button');
                e.stopPropagation(); 
                onOpenEditor(product.id, 'button'); 
              } else if (product.type === "FILE" && onOpenProductPage) {
                // For FILE type products, open ProductPageModal
                console.log('🔵 [ProductCard] Opening ProductPageModal for FILE type product');
                e.stopPropagation();
                onOpenProductPage(product);
              } else if (product.buttonLink) {
                console.log('🔵 [ProductCard] Redirecting to buttonLink:', product.buttonLink);
                // Redirect to the specified link
                if (product.buttonLink.startsWith('http')) {
                  console.log('🔵 [ProductCard] Opening external link in new tab:', product.buttonLink);
                  window.open(product.buttonLink, '_blank');
                } else {
                  console.log('🔵 [ProductCard] Navigating to relative path:', product.buttonLink);
                  window.location.href = product.buttonLink;
                }
              } else {
                console.warn('🔵 [ProductCard] No buttonLink found - button click does nothing. Product:', {
                  id: product.id,
                  name: product.name,
                  hasButtonLink: !!product.buttonLink,
                  productType: product.type,
                  fullProduct: product
                });
              }
            }}
            dangerouslySetInnerHTML={{ __html: buttonText || 'VIEW DETAILS' }}
          >
          </button>
        )}
      </div>
    </div>
    </div>
  );
};

