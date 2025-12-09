'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, Heading, Text, Card, Separator } from 'frosted-ui';
import { Type, X, ChevronDown } from 'lucide-react';
import { getThemeTextColor as getThemeTextColorFromConstants } from '../actions/constants';
import { normalizeHtmlContent, decodeHtmlEntitiesForTextarea } from '../utils/html';

// Helper to convert Tailwind text color class to hex
const tailwindTextColorToHex = (textClass: string): string | null => {
  if (!textClass) return null;
  
  // Extract color name and shade from classes like "text-gray-800" or "text-blue-600"
  const match = textClass.match(/text-(\w+)-(\d+)/);
  if (!match) return null;
  
  const colorName = match[1];
  const shade = parseInt(match[2], 10);
  
  // Tailwind color to hex mapping
  const colorMap: Record<string, Record<number, string>> = {
    gray: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: '#111827' },
    blue: { 50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A' },
    indigo: { 50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA', 800: '#3730A3', 900: '#312E81' },
    purple: { 50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95' },
    pink: { 50: '#FDF2F8', 100: '#FCE7F3', 200: '#FBCFE8', 300: '#F9A8D4', 400: '#F472B6', 500: '#EC4899', 600: '#DB2777', 700: '#BE185D', 800: '#9F1239', 900: '#831843' },
    red: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D' },
    orange: { 50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C', 500: '#F97316', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12' },
    yellow: { 50: '#FEFCE8', 100: '#FEF9C3', 200: '#FEF08A', 300: '#FDE047', 400: '#FACC15', 500: '#EAB308', 600: '#CA8A04', 700: '#A16207', 800: '#854D0E', 900: '#713F12' },
    green: { 50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D', 800: '#166534', 900: '#14532D' },
    cyan: { 50: '#ECFEFF', 100: '#CFFAFE', 200: '#A5F3FC', 300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490', 800: '#155E75', 900: '#164E63' },
    amber: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706', 700: '#B45309', 800: '#92400E', 900: '#78350F' },
  };
  
  if (colorMap[colorName] && colorMap[colorName][shade]) {
    return colorMap[colorName][shade];
  }
  
  return null;
};

// Memoized Quick Colors component - extracts colors from background or uses theme colors
const QuickColorsSection = memo(({ legacyTheme, getThemeQuickColors, updateColor, backgroundUrl }: {
  legacyTheme: any;
  getThemeQuickColors: (theme: any) => string[];
  updateColor: (color: string) => void;
  backgroundUrl?: string | null;
}) => {
  const [quickColors, setQuickColors] = useState<string[]>(['#FFFFFF', '#000000', '#F3F4F6', '#1F2937']);
  
  useEffect(() => {
    const loadColors = async () => {
      // Get theme's default text color using welcomeColor (same logic as SeasonalStore.tsx)
      const themeTextColorHex = legacyTheme?.welcomeColor ? getThemeTextColorFromConstants(legacyTheme.welcomeColor) : null;
      
      // If we have a background URL, extract colors from it
      if (backgroundUrl) {
        try {
          const { extractColorsFromImage } = await import('../utils/backgroundAnalyzer');
          const extractedColors = await extractColorsFromImage(backgroundUrl, 7); // Get 7, we'll add theme color
          if (extractedColors && extractedColors.length > 0) {
            // Add theme text color at the beginning if it exists and isn't already included
            const colors = [...extractedColors];
            if (themeTextColorHex && !colors.includes(themeTextColorHex)) {
              colors.unshift(themeTextColorHex); // Add at the beginning
            }
            setQuickColors(colors.slice(0, 8));
            return;
          }
        } catch (error) {
          console.warn('Failed to extract colors from background, using theme colors:', error);
        }
      }
      
      // Fallback to theme colors
      try {
        const themeColors = getThemeQuickColors(legacyTheme);
        // Add theme text color at the beginning if it exists and isn't already included
        const colors = [...themeColors];
        if (themeTextColorHex && !colors.includes(themeTextColorHex)) {
          colors.unshift(themeTextColorHex); // Add at the beginning
        }
        setQuickColors(colors.slice(0, 8));
      } catch {
        const fallback = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937'];
        if (themeTextColorHex && !fallback.includes(themeTextColorHex)) {
          fallback.unshift(themeTextColorHex);
        }
        setQuickColors(fallback);
      }
    };
    
    loadColors();
  }, [backgroundUrl, legacyTheme?.name, legacyTheme?.accent, legacyTheme?.welcomeColor, getThemeQuickColors]);
  
  return (
    <div>
      <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2.5">Quick Colors</Text>
      <div className="flex flex-wrap gap-2.5">
        {quickColors.map((color, index) => (
          <button
            key={`${color}-${index}`}
            onClick={(e) => {
              e.stopPropagation();
              updateColor(color);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-violet-500 dark:hover:border-violet-400 hover:scale-110 transition-all cursor-pointer shadow-sm hover:shadow-md"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
});

QuickColorsSection.displayName = 'QuickColorsSection';

// Font size options (in pixels) - map to Tailwind classes
const fontSizeMap: Record<number, string> = {
  12: 'text-xs',
  14: 'text-sm',
  16: 'text-base',
  18: 'text-lg',
  20: 'text-xl',
  24: 'text-2xl',
  28: 'text-2xl sm:text-3xl',
  32: 'text-3xl sm:text-4xl',
  36: 'text-4xl sm:text-5xl',
  40: 'text-4xl sm:text-5xl',
  48: 'text-5xl sm:text-6xl',
  56: 'text-6xl sm:text-7xl',
  64: 'text-7xl sm:text-8xl',
  72: 'text-8xl sm:text-9xl',
};

const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];

interface TextEditorModalProps {
  isOpen: boolean;
  editingText: {
    isOpen: boolean;
    targetId: string;
  };
  fixedTextStyles: Record<string, {
    content: string;
    color: string;
    styleClass: string;
  }>;
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  legacyTheme: any;
  backgroundUrl?: string | null;
  
  // Handlers
  onClose: () => void;
  setFixedTextStyles: (fn: (prev: any) => any) => void;
  getThemeQuickColors: (theme: any) => string[];
}

export const TextEditorModal: React.FC<TextEditorModalProps> = ({
  isOpen,
  editingText,
  fixedTextStyles,
  backgroundAnalysis,
  legacyTheme,
  backgroundUrl,
  onClose,
  setFixedTextStyles,
  getThemeQuickColors,
}) => {
  // Simple local state - no expensive computations
  const [localContent, setLocalContent] = useState('');
  const [localColor, setLocalColor] = useState('#FFFFFF');
  const [localStyleClass, setLocalStyleClass] = useState('text-lg font-normal');

  // Track initial values when modal opens to detect changes
  const initialContentRef = useRef<string>('');
  const initialColorRef = useRef<string>('');
  const initialStyleClassRef = useRef<string>('');

  // Track previous isOpen state to detect when modal closes
  const prevIsOpenRef = useRef(isOpen);
  
  // Refs to capture current values for saving
  const localContentRef = useRef(localContent);
  const localColorRef = useRef(localColor);
  const localStyleClassRef = useRef(localStyleClass);

  // Update refs whenever local state changes
  useEffect(() => {
    localContentRef.current = localContent;
    localColorRef.current = localColor;
    localStyleClassRef.current = localStyleClass;
  }, [localContent, localColor, localStyleClass]);

  // Sync local state when modal opens or target changes - only when opening
  useEffect(() => {
    if (isOpen && editingText.targetId) {
      const style = fixedTextStyles[editingText.targetId] || {
        content: '',
        color: '#FFFFFF',
        styleClass: 'text-lg font-normal'
      };
      
      // Normalize to prevent double-encoding, then decode entities for textarea display
      const normalizedContent = normalizeHtmlContent(style.content || '');
      // Decode HTML entities for textarea display (e.g., &nbsp; -> space)
      const decodedContent = decodeHtmlEntitiesForTextarea(normalizedContent);
      setLocalContent(decodedContent);
      setLocalColor(style.color);
      setLocalStyleClass(style.styleClass);
      
      // Store initial values for comparison (use normalized, not decoded, for comparison)
      initialContentRef.current = normalizedContent;
      initialColorRef.current = style.color;
      initialStyleClassRef.current = style.styleClass;
    }
  }, [isOpen, editingText.targetId, fixedTextStyles]);

  // Update local color when theme changes (if modal is open)
  // This ensures the color picker shows the new theme color immediately
  useEffect(() => {
    if (isOpen && editingText.targetId) {
      const targetId = editingText.targetId;
      const style = fixedTextStyles[targetId];
      const newColor = style?.color;
      if (newColor && newColor !== localColorRef.current) {
        setLocalColor(newColor);
      }
    }
  }, [
    isOpen,
    editingText.targetId,
    fixedTextStyles.mainHeader?.color ?? null,
    fixedTextStyles.headerMessage?.color ?? null,
    fixedTextStyles.subHeader?.color ?? null,
    fixedTextStyles.promoMessage?.color ?? null,
  ]);

  // Save changes when modal closes (detect transition from open to closed)
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isNowClosed = !isOpen;
    
    // Only save when transitioning from open to closed
    if (wasOpen && isNowClosed && editingText.targetId) {
      // Use refs to get current values (captured from local state)
      // User input is plain text from textarea, normalize to prevent double-encoding
      const contentToSave = normalizeHtmlContent(localContentRef.current);
      const colorToSave = localColorRef.current;
      const styleClassToSave = localStyleClassRef.current;
      const targetIdToSave = editingText.targetId;
      
      console.log('💾 Saving text changes on close:', {
        targetId: targetIdToSave,
        content: contentToSave,
        color: colorToSave,
        styleClass: styleClassToSave,
        refs: {
          content: localContentRef.current,
          color: localColorRef.current,
          styleClass: localStyleClassRef.current
        }
      });
      
      // Always save current values when modal closes
      setFixedTextStyles(prev => {
        const updated = {
          ...prev,
          [targetIdToSave]: { 
            ...(prev[targetIdToSave] || {}),
            content: contentToSave,
            color: colorToSave,
            styleClass: styleClassToSave
          }
        };
        console.log('💾 FixedTextStyles updated:', updated[targetIdToSave]);
        return updated;
      });
    }
    
    // Update ref for next render
    prevIsOpenRef.current = isOpen;
  }, [isOpen, editingText.targetId, setFixedTextStyles]);

  // Save changes handler - called when modal closes via button
  const handleClose = useCallback(() => {
    // Save will happen in useEffect when isOpen becomes false
    onClose();
  }, [onClose]);

  // Simple local state updates - no immediate fixedTextStyles updates
  const updateContent = useCallback((value: string) => {
    setLocalContent(value);
  }, []);

  const updateColor = useCallback((value: string) => {
    setLocalColor(value);
  }, []);

  // Extract current font size number from styleClass
  const getCurrentFontSize = useCallback((styleClass: string) => {
    if (!styleClass) return 16; // default
    
    const classes = styleClass.split(' ').filter(Boolean);
    const textSizeClasses = classes.filter(cls => cls.startsWith('text-'));
    
    if (textSizeClasses.length === 0) return 16; // default
    
    // Get the base text-* class (first one, before any responsive variants)
    const baseTextClass = textSizeClasses[0];
    
    // Special cases for standard Tailwind classes
    if (baseTextClass === 'text-xs') return 12;
    if (baseTextClass === 'text-sm') return 14;
    if (baseTextClass === 'text-base') return 16;
    if (baseTextClass === 'text-lg') return 18;
    if (baseTextClass === 'text-xl') return 20;
    
    // Try to extract number from class name (e.g., text-2xl -> 2)
    const match = baseTextClass.match(/text-(\d+)xl/);
    if (match) {
      const xlCount = parseInt(match[1]);
      // Map to closest available option
      const sizeMap: Record<number, number> = { 
        1: 12, 2: 24, 3: 28, 4: 36, 5: 48, 6: 56, 7: 64, 8: 72, 9: 72 
      };
      return sizeMap[xlCount] || 16;
    }
    
    // Try to find match in fontSizeMap by checking if any text class matches
    for (const [size, tailwindClass] of Object.entries(fontSizeMap)) {
      const sizeNum = parseInt(size);
      const tailwindClasses = tailwindClass.split(' ');
      // Check if the base class matches any class in the tailwind mapping
      if (tailwindClasses.includes(baseTextClass)) {
        return sizeNum;
      }
    }
    
    return 16; // default
  }, []);

  // Get current font size number (for select matching)
  const currentFontSize = useMemo(() => {
    return getCurrentFontSize(localStyleClass);
  }, [localStyleClass, getCurrentFontSize]);

  const updateStyleClass = useCallback((value: string) => {
    setLocalStyleClass(value);
  }, []);

  // Handle typography selection - ONLY change text size, preserve everything else
  const handleTypographyChange = useCallback((selectedSizeStr: string) => {
    const selectedSize = parseInt(selectedSizeStr);
    const newTailwindClass = fontSizeMap[selectedSize] || 'text-base';
    
    console.log('📏 Changing font size:', selectedSize, 'to', newTailwindClass);
    console.log('📏 Current styleClass:', localStyleClass);
    
    if (!localStyleClass) {
      console.log('📏 No existing styleClass, setting to:', newTailwindClass);
      updateStyleClass(newTailwindClass);
      return;
    }
    
    const classes = localStyleClass.split(' ').filter(Boolean);
    
    // Remove ALL text-* classes (size) - including responsive variants like sm:text-*, md:text-*, etc.
    // Match any class that contains 'text-' anywhere (for responsive variants)
    const withoutSize = classes.filter(cls => {
      // Remove if it starts with text- or contains :text- (responsive variants)
      return !cls.startsWith('text-') && !cls.includes(':text-');
    });
    
    // Add the new size classes
    const newSizeClasses = newTailwindClass.split(' ').filter(Boolean);
    
    // Combine: new size + everything else (font-weight, italic, tracking, drop-shadow, etc.)
    const newStyleClass = [...newSizeClasses, ...withoutSize].join(' ').trim();
    
    console.log('📏 Removed classes:', classes.filter(cls => cls.startsWith('text-') || cls.includes(':text-')));
    console.log('📏 Kept classes:', withoutSize);
    console.log('📏 New styleClass:', newStyleClass);
    updateStyleClass(newStyleClass);
  }, [localStyleClass, updateStyleClass]);

  // Helper function to toggle bold - preserve typography size
  const toggleBold = useCallback((currentClass: string) => {
    const classes = currentClass.split(' ').filter(Boolean);
    
    // Check if currently bold (has font-bold, font-extrabold, or font-black)
    const isBold = currentClass.includes('font-bold') || 
                   currentClass.includes('font-extrabold') || 
                   currentClass.includes('font-black');
    
    // Remove all font-* classes
    const withoutFont = classes.filter(cls => !cls.startsWith('font-'));
    
    // Add font-weight: if bold, make it normal; if not bold, make it bold
    if (isBold) {
      withoutFont.push('font-normal');
    } else {
      withoutFont.push('font-bold');
    }
    
    return withoutFont.join(' ').trim();
  }, []);

  // Helper function to toggle italic - preserve typography size
  const toggleItalic = useCallback((currentClass: string) => {
    const hasItalic = currentClass.includes('italic');
    if (hasItalic) {
      // Remove italic
      return currentClass.replace(/\s*italic\s*/g, ' ').trim();
    } else {
      // Add italic
      return (currentClass + ' italic').trim();
    }
  }, []);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-transparent z-50" />
        <Dialog.Description className="sr-only">
          Edit text content, style, and color
        </Dialog.Description>
        <Dialog.Content 
          className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white dark:bg-gray-900 text-foreground shadow-2xl z-[70] flex flex-col transform transition-transform duration-500 ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          onEscapeKeyDown={handleClose}
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking on input fields, buttons, or inside the modal content
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.tagName === 'SELECT' ||
                           target.tagName === 'BUTTON' ||
                           target.closest('input') ||
                           target.closest('textarea') ||
                           target.closest('select') ||
                           target.closest('button') ||
                           target.closest('[data-radix-dialog-content]') ||
                           target.closest('[role="dialog"]');
            
            if (isInput) {
              e.preventDefault();
              return;
            }
            handleClose();
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title asChild>
                <Heading
                  size="5"
                  weight="bold"
                  className="flex items-center gap-3 text-gray-900 dark:text-white text-2xl font-bold tracking-tight"
                >
                  <Type className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  Edit Text
                </Heading>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button
                  size="2"
                  variant="soft"
                  color="gray"
                  onClick={handleClose}
                  className="!px-4 !py-2"
                >
                  Close
                </Button>
              </Dialog.Close>
            </div>
            <Separator size="1" color="gray" />
          </div>

          {/* Content */}
          <div 
            className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50 dark:bg-gray-950 overflow-x-visible"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="space-y-6 min-w-0">
              {/* Content Section */}
              <Card 
                className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="fui-reset px-6 py-6">
                  <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">Content</Heading>
                <div className="relative">
                  <textarea
                    rows={4}
                    value={localContent}
                    onChange={(e) => updateContent(e.target.value)}
                    placeholder="Enter text content..."
                    className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 min-h-[100px] resize-none text-sm"
                    style={{ fontSize: '16px', boxSizing: 'border-box' }}
                    onFocus={(e) => {
                      // Prevent iOS zoom on focus
                      e.target.style.fontSize = '16px';
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                </div>
                </div>
              </Card>

              {/* Style Section */}
              <Card 
                className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="fui-reset px-6 py-6">
                  <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">Style</Heading>
                <div className="space-y-4">
                  {/* Size */}
                  <div>
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2.5">Size</Text>
                    <div className="relative" style={{ zIndex: 1000 }}>
                      <select
                        value={currentFontSize}
                        onChange={(e) => handleTypographyChange(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 text-sm appearance-none cursor-pointer"
                        style={{ zIndex: 1000, boxSizing: 'border-box' }}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {fontSizeOptions.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Text Style Buttons */}
                  <div>
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2.5">Text Style</Text>
                    <div className="flex gap-3">
                      <Button
                        size="3"
                        variant="surface"
                        color="violet"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStyleClass = toggleBold(localStyleClass);
                          updateStyleClass(newStyleClass);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`!px-6 !py-3 shadow-lg shadow-violet-500/25 hover:!bg-violet-500 hover:!text-white hover:shadow-violet-500/40 hover:scale-105 active:!bg-violet-600 active:!text-white transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 dark:hover:!bg-violet-600 dark:active:!bg-violet-700 font-bold ${localStyleClass.includes('font-bold') || localStyleClass.includes('font-extrabold') || localStyleClass.includes('font-black') ? '!bg-violet-500 !text-white' : ''}`}
                      >
                        B
                      </Button>
                      <Button
                        size="3"
                        variant="surface"
                        color="violet"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStyleClass = toggleItalic(localStyleClass);
                          updateStyleClass(newStyleClass);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`!px-6 !py-3 shadow-lg shadow-violet-500/25 hover:!bg-violet-500 hover:!text-white hover:shadow-violet-500/40 hover:scale-105 active:!bg-violet-600 active:!text-white transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 dark:hover:!bg-violet-600 dark:active:!bg-violet-700 italic ${localStyleClass.includes('italic') ? '!bg-violet-500 !text-white' : ''}`}
                      >
                        I
                      </Button>
                    </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Color Section */}
              <Card 
                className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="fui-reset px-6 py-6">
                  <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">Color</Heading>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={localColor}
                      onChange={(e) => updateColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:border-violet-500 dark:hover:border-violet-400 cursor-pointer shadow-sm hover:shadow-md transition-all flex-shrink-0"
                      style={{ boxSizing: 'border-box' }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                    <input
                      type="text"
                      value={localColor}
                      onChange={(e) => updateColor(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 font-mono text-sm min-w-0"
                      style={{ boxSizing: 'border-box' }}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  </div>
                  <QuickColorsSection 
                    legacyTheme={legacyTheme}
                    getThemeQuickColors={getThemeQuickColors}
                    updateColor={updateColor}
                    backgroundUrl={backgroundUrl}
                  />
                </div>
                </div>
              </Card>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
