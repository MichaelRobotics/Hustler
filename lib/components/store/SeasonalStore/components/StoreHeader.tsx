'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Palette, Type } from 'lucide-react';
import { getThemeTextColor as getThemeTextColorFromConstants } from '../actions/constants';
import { normalizeHtmlContent } from '../utils/html';
const getNormalizedContent = (node?: HTMLElement | null, fallback = ''): string => {
  const raw = node?.innerHTML || node?.textContent || fallback || '';
  return normalizeHtmlContent(raw);
};


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

interface StoreHeaderProps {
  editorState: {
    isEditorView: boolean;
  };
  fixedTextStyles: {
    headerMessage?: {
      content: string;
      color: string;
      styleClass: string;
    };
    subHeader?: {
      content: string;
      color: string;
      styleClass: string;
    };
  };
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  legacyTheme: any;
  
  // Handlers
  setFixedTextStyles: (fn: (prev: any) => any) => void;
  applyThemeColorsToText: (textStyle: any, type: string) => string;
  getThemeColors: any;
  getThemeQuickColors?: (theme: any) => string[];
  backgroundUrl?: string | null;
  setEditingText: (text: any) => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  editorState,
  fixedTextStyles,
  backgroundAnalysis,
  legacyTheme,
  setFixedTextStyles,
  applyThemeColorsToText,
  getThemeColors,
  getThemeQuickColors,
  backgroundUrl,
  setEditingText,
}) => {
  const { headerMessage, subHeader } = fixedTextStyles || {};
  const sharedTextContainerStyle: React.CSSProperties = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '48rem',
    marginLeft: 'auto',
    marginRight: 'auto',
  };
  
  // State for formatting toolbars
  const [headerMessageRef, setHeaderMessageRef] = React.useState<HTMLDivElement | null>(null);
  const [subHeaderRef, setSubHeaderRef] = React.useState<HTMLDivElement | null>(null);
  const [showHeaderToolbar, setShowHeaderToolbar] = React.useState(false);
  const [showSubHeaderToolbar, setShowSubHeaderToolbar] = React.useState(false);
  const [showHeaderColorPicker, setShowHeaderColorPicker] = React.useState(false);
  const [showSubHeaderColorPicker, setShowSubHeaderColorPicker] = React.useState(false);
  const [selectedHeaderColor, setSelectedHeaderColor] = React.useState(headerMessage?.color || '#FFFFFF');
  const [selectedSubHeaderColor, setSelectedSubHeaderColor] = React.useState(subHeader?.color || '#FFFFFF');
  
  // Update selected colors when fixedTextStyles change
  React.useEffect(() => {
    if (headerMessage?.color) {
      setSelectedHeaderColor(headerMessage.color);
    }
  }, [headerMessage?.color]);
  
  React.useEffect(() => {
    if (subHeader?.color) {
      setSelectedSubHeaderColor(subHeader.color);
    }
  }, [subHeader?.color]);

  // Track previous colors to detect theme changes
  const prevHeaderColorRef = React.useRef<string | undefined>(headerMessage?.color);
  const prevSubHeaderColorRef = React.useRef<string | undefined>(subHeader?.color);
  // Track previous fixedTextStyles object reference to detect full resets
  const prevFixedTextStylesRef = React.useRef(fixedTextStyles);

  // Reset color refs when fixedTextStyles object reference changes (e.g., after reset)
  // This ensures colors are reapplied even if the color value is the same
  React.useEffect(() => {
    // If the fixedTextStyles object reference changed, it might be a reset
    // Reset the color refs to force reapplication
    if (prevFixedTextStylesRef.current !== fixedTextStyles) {
      prevFixedTextStylesRef.current = fixedTextStyles;
      // Reset refs to force color reapplication on next render
      prevHeaderColorRef.current = undefined;
      prevSubHeaderColorRef.current = undefined;
    }
  }, [fixedTextStyles]);

  // Apply theme color changes to contentEditable elements (same as button styles override)
  React.useEffect(() => {
    // Only apply if color changed and element exists
    // Also apply if ref is undefined (was reset) to force reapplication
    const isReset = prevHeaderColorRef.current === undefined;
    if (headerMessageRef && headerMessage?.color && (prevHeaderColorRef.current !== headerMessage.color || isReset)) {
      // Check if content is already synced (to avoid overwriting template content during load)
      const currentContent = getNormalizedContent(headerMessageRef);
      const expectedContent = normalizeHtmlContent(headerMessage.content || '');
      
      // If content doesn't match and it's not a reset, wait for content sync to complete first
      // On reset, always apply color even if content doesn't match (to force color update)
      if (!isReset && currentContent && expectedContent && currentContent !== expectedContent && currentContent.trim() !== '') {
        // Content is not synced yet, skip color application for now
        // The content sync effect will handle it, and color will be applied on next render
        prevHeaderColorRef.current = headerMessage.color;
        return;
      }
      
      // Apply color to all text in the contentEditable element using execCommand (same as toolbar)
      const selection = window.getSelection();
      const savedRanges: Range[] = [];
      
      // Save current selection if any
      if (selection && selection.rangeCount > 0) {
        for (let i = 0; i < selection.rangeCount; i++) {
          savedRanges.push(selection.getRangeAt(i).cloneRange());
        }
      }
      
      // Select all content in the element
      const range = document.createRange();
      range.selectNodeContents(headerMessageRef);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Apply the color using execCommand (same as toolbar does)
      document.execCommand('foreColor', false, headerMessage.color);
      
      // Restore selection if there was one
      selection?.removeAllRanges();
      if (savedRanges.length > 0) {
        savedRanges.forEach(r => selection?.addRange(r));
      }
      
      // Update the content in fixedTextStyles to reflect the new color in HTML
      // But preserve the original content from fixedTextStyles if it exists
      const updatedContent = getNormalizedContent(headerMessageRef);
      setFixedTextStyles(prev => ({
        ...prev,
        headerMessage: {
          ...(prev.headerMessage || {}),
          content: updatedContent || normalizeHtmlContent(prev.headerMessage?.content || ''),
          color: headerMessage.color,
        }
      }));
      
      // Update ref
      prevHeaderColorRef.current = headerMessage.color;
    }
  }, [headerMessage?.color ?? null, headerMessage?.content ?? null, headerMessageRef, setFixedTextStyles]);

  React.useEffect(() => {
    // Only apply if color changed and element exists
    // Also apply if ref is undefined (was reset) to force reapplication
    const isReset = prevSubHeaderColorRef.current === undefined;
    if (subHeaderRef && subHeader?.color && (prevSubHeaderColorRef.current !== subHeader.color || isReset)) {
      // Check if content is already synced (to avoid overwriting template content during load)
      const currentContent = getNormalizedContent(subHeaderRef);
      const expectedContent = normalizeHtmlContent(subHeader.content || '');
      
      // If content doesn't match and it's not a reset, wait for content sync to complete first
      // On reset, always apply color even if content doesn't match (to force color update)
      if (!isReset && currentContent && expectedContent && currentContent !== expectedContent && currentContent.trim() !== '') {
        // Content is not synced yet, skip color application for now
        // The content sync effect will handle it, and color will be applied on next render
        prevSubHeaderColorRef.current = subHeader.color;
        return;
      }
      
      // Apply color to all text in the contentEditable element using execCommand (same as toolbar)
      const selection = window.getSelection();
      const savedRanges: Range[] = [];
      
      // Save current selection if any
      if (selection && selection.rangeCount > 0) {
        for (let i = 0; i < selection.rangeCount; i++) {
          savedRanges.push(selection.getRangeAt(i).cloneRange());
        }
      }
      
      // Select all content in the element
      const range = document.createRange();
      range.selectNodeContents(subHeaderRef);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Apply the color using execCommand (same as toolbar does)
      document.execCommand('foreColor', false, subHeader.color);
      
      // Restore selection if there was one
      selection?.removeAllRanges();
      if (savedRanges.length > 0) {
        savedRanges.forEach(r => selection?.addRange(r));
      }
      
      // Update the content in fixedTextStyles to reflect the new color in HTML
      // But preserve the original content from fixedTextStyles if it exists
      const updatedContent = getNormalizedContent(subHeaderRef);
      setFixedTextStyles(prev => ({
        ...prev,
        subHeader: {
          ...(prev.subHeader || {}),
          content: updatedContent || normalizeHtmlContent(prev.subHeader?.content || ''),
          color: subHeader.color,
        }
      }));
      
      // Update ref
      prevSubHeaderColorRef.current = subHeader.color;
    }
  }, [subHeader?.color ?? null, subHeader?.content ?? null, subHeaderRef, setFixedTextStyles]);
  const [showHeaderFontSize, setShowHeaderFontSize] = React.useState(false);
  const [showSubHeaderFontSize, setShowSubHeaderFontSize] = React.useState(false);
  
  const headerToolbarRef = React.useRef<HTMLDivElement | null>(null);
  const subHeaderToolbarRef = React.useRef<HTMLDivElement | null>(null);
  
  // Font size options
  const fontSizeOptions = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
  
  // Quick colors - get from theme or use defaults
  const [quickColors, setQuickColors] = React.useState<string[]>(['#FFFFFF', '#000000', '#F3F4F6', '#1F2937']);
  
  React.useEffect(() => {
    const loadQuickColors = async () => {
      // Get theme's default text color using welcomeColor (same logic as SeasonalStore.tsx)
      const themeTextColorHex = legacyTheme?.welcomeColor ? getThemeTextColorFromConstants(legacyTheme.welcomeColor) : null;
      
      // If we have a background URL, extract colors from it (includes matching and contrasting colors)
      if (backgroundUrl) {
        try {
          const { extractColorsFromImage } = await import('../utils/backgroundAnalyzer');
          const extractedColors = await extractColorsFromImage(backgroundUrl, 12);
          if (extractedColors && extractedColors.length > 0) {
            // Add theme text color at the beginning if it exists and isn't already included
            const colors = [...extractedColors];
            if (themeTextColorHex && !colors.includes(themeTextColorHex)) {
              colors.unshift(themeTextColorHex); // Add at the beginning
            }
            setQuickColors(colors.slice(0, 12));
            return;
          }
        } catch (error) {
          console.warn('Failed to extract colors from background, using theme colors:', error);
        }
      }
      
      // Fallback to theme colors
      if (getThemeQuickColors && legacyTheme) {
        try {
          const themeColors = getThemeQuickColors(legacyTheme);
          // Add theme text color at the beginning if it exists and isn't already included
          const colors = [...themeColors];
          if (themeTextColorHex && !colors.includes(themeTextColorHex)) {
            colors.unshift(themeTextColorHex);
          }
          setQuickColors(colors.slice(0, 12));
        } catch {
          const fallback = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937'];
          if (themeTextColorHex && !fallback.includes(themeTextColorHex)) {
            fallback.unshift(themeTextColorHex);
          }
          setQuickColors(fallback);
        }
      } else {
        const fallback = ['#FFFFFF', '#000000', '#F3F4F6', '#1F2937'];
        if (themeTextColorHex && !fallback.includes(themeTextColorHex)) {
          fallback.unshift(themeTextColorHex);
        }
        setQuickColors(fallback);
      }
    };
    
    loadQuickColors();
  }, [backgroundUrl, legacyTheme, getThemeQuickColors]);
  
  // Helper to extract font size from styleClass
  const getFontSizeFromStyleClass = (styleClass: string): number => {
    if (!styleClass) return 18;
    const match = styleClass.match(/text-(\d+)xl|text-(xs|sm|base|lg|xl)/);
    if (match) {
      if (match[1]) {
        const xlCount = parseInt(match[1]);
        const sizeMap: Record<number, number> = { 1: 12, 2: 24, 3: 28, 4: 36, 5: 48, 6: 56, 7: 64, 8: 72 };
        return sizeMap[xlCount] || 18;
      }
      const sizeMap: Record<string, number> = { xs: 12, sm: 14, base: 16, lg: 18, xl: 20 };
      return sizeMap[match[2]] || 18;
    }
    return 18;
  };
  
  // Helper to update font size in styleClass
  const updateFontSizeInStyleClass = (styleClass: string, newSize: number): string => {
    const classes = styleClass.split(' ').filter(Boolean);
    const withoutSize = classes.filter(cls => !cls.startsWith('text-') && !cls.includes(':text-'));
    const sizeMap: Record<number, string> = {
      12: 'text-xs', 14: 'text-sm', 16: 'text-base', 18: 'text-lg', 20: 'text-xl',
      24: 'text-2xl', 28: 'text-2xl sm:text-3xl', 32: 'text-3xl sm:text-4xl',
      36: 'text-4xl sm:text-5xl', 40: 'text-4xl sm:text-5xl', 48: 'text-5xl sm:text-6xl',
      56: 'text-6xl sm:text-7xl', 64: 'text-7xl sm:text-8xl', 72: 'text-8xl sm:text-9xl',
    };
    const newSizeClass = sizeMap[newSize] || 'text-lg';
    return [...newSizeClass.split(' '), ...withoutSize].join(' ').trim();
  };

  // Sync contentEditable with fixedTextStyles
  React.useEffect(() => {
    if (headerMessageRef && headerMessage) {
      // Check if content contains HTML tags
      const hasHTML = /<[^>]+>/.test(headerMessage.content);
      if (hasHTML) {
        const desiredContent = normalizeHtmlContent(headerMessage.content || '');
        if (getNormalizedContent(headerMessageRef) !== desiredContent) {
          headerMessageRef.innerHTML = desiredContent;
        }
      } else {
        if (headerMessageRef.textContent !== headerMessage.content) {
          headerMessageRef.textContent = headerMessage.content;
        }
      }
    }
  }, [headerMessageRef, headerMessage?.content]);
  
  React.useEffect(() => {
    if (subHeaderRef && subHeader) {
      // Check if content contains HTML tags
      const hasHTML = /<[^>]+>/.test(subHeader.content);
      if (hasHTML) {
        const desiredContent = normalizeHtmlContent(subHeader.content || '');
        if (getNormalizedContent(subHeaderRef) !== desiredContent) {
          subHeaderRef.innerHTML = desiredContent;
        }
      } else {
        if (subHeaderRef.textContent !== subHeader.content) {
          subHeaderRef.textContent = subHeader.content;
        }
      }
    }
  }, [subHeaderRef, subHeader?.content]);
  
  // Formatting toolbar component
  const FormattingToolbar: React.FC<{
    show: boolean;
    elementRef: HTMLDivElement | null;
    toolbarRef: React.RefObject<HTMLDivElement | null>;
    showColorPicker: boolean;
    setShowColorPicker: (show: boolean) => void;
    showFontSize: boolean;
    setShowFontSize: (show: boolean) => void;
    selectedColor: string;
    setSelectedColor: (color: string) => void;
    currentStyleClass: string;
    quickColors: string[];
    fontSizeOptions: number[];
    getFontSizeFromStyleClass: (styleClass: string) => number;
    onBold: () => void;
    onItalic: () => void;
    onColorChange: (color: string) => void;
    onFontSizeChange: (size: number) => void;
  }> = ({ 
    show, 
    elementRef, 
    toolbarRef, 
    showColorPicker, 
    setShowColorPicker, 
    showFontSize, 
    setShowFontSize,
    selectedColor,
    setSelectedColor,
    currentStyleClass,
    quickColors,
    fontSizeOptions,
    getFontSizeFromStyleClass,
    onBold,
    onItalic,
    onColorChange,
    onFontSizeChange,
  }) => {
    if (!show || !elementRef || typeof window === 'undefined') return null;
    
    // Store saved selection for font size changes (using offsets for reliability)
    const savedSelectionRef = React.useRef<{ start: number; end: number } | null>(null);
    
    // Helper to save selection as text offsets
    const saveSelection = () => {
      if (!elementRef) return;
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (elementRef.contains(range.commonAncestorContainer)) {
          // Calculate text offsets for the selection
          const preCaretRange = document.createRange();
          preCaretRange.selectNodeContents(elementRef);
          preCaretRange.setEnd(range.startContainer, range.startOffset);
          const start = preCaretRange.toString().length;
          const end = start + range.toString().length;
          savedSelectionRef.current = { start, end };
        }
      } else {
        // Save cursor position
        const textLength = elementRef.textContent?.length || 0;
        savedSelectionRef.current = { start: textLength, end: textLength };
      }
    };
    
    // Helper to restore selection from text offsets
    const restoreSelection = () => {
      if (!elementRef || !savedSelectionRef.current) return;
      const { start, end } = savedSelectionRef.current;
      const selection = window.getSelection();
      
      try {
        // Find the text node and offset
        let currentOffset = 0;
        const walker = document.createTreeWalker(
          elementRef,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let targetTextNode: Text | null = null;
        let startOffset = 0;
        let endOffset = 0;
        let node: Text | null;
        
        while (node = walker.nextNode() as Text | null) {
          const nodeLength = node.textContent?.length || 0;
          if (currentOffset + nodeLength >= start) {
            targetTextNode = node;
            startOffset = Math.max(0, start - currentOffset);
            endOffset = Math.min(end - currentOffset, nodeLength);
            break;
          }
          currentOffset += nodeLength;
        }
        
        if (targetTextNode) {
          const range = document.createRange();
          range.setStart(targetTextNode, startOffset);
          range.setEnd(targetTextNode, endOffset);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } else {
          // Fallback: use simple offset calculation
          const range = document.createRange();
          if (elementRef.firstChild && elementRef.firstChild.nodeType === Node.TEXT_NODE) {
            const textNode = elementRef.firstChild as Text;
            range.setStart(textNode, Math.min(start, textNode.length));
            range.setEnd(textNode, Math.min(end, textNode.length));
          } else {
            range.setStart(elementRef, 0);
            range.setEnd(elementRef, 0);
          }
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } catch (err) {
        // Fallback: set cursor at end
        const range = document.createRange();
        if (elementRef.firstChild && elementRef.firstChild.nodeType === Node.TEXT_NODE) {
          const textNode = elementRef.firstChild as Text;
          range.setStart(textNode, textNode.length);
          range.setEnd(textNode, textNode.length);
        } else {
          range.setStart(elementRef, 0);
          range.setEnd(elementRef, 0);
        }
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    };
    
    // Get selection position for toolbar placement
    const getToolbarPosition = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Check if selection is within our element
        if (elementRef.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          return {
            top: rect.top - 50,
            left: rect.left + (rect.width / 2),
          };
        }
      }
      // Fallback to element position
      const rect = elementRef.getBoundingClientRect();
      return {
        top: rect.top - 50,
        left: rect.left + (rect.width / 2),
      };
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
    
    return createPortal(
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
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="relative">
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
                        const color = colorMatch[1].trim();
                        if (color.startsWith('rgb')) {
                          const rgb = color.match(/\d+/g);
                          if (rgb && rgb.length >= 3) {
                            const hex = '#' + rgb.slice(0, 3).map(x => {
                              const hex = parseInt(x).toString(16);
                              return hex.length === 1 ? '0' + hex : hex;
                            }).join('');
                            setSelectedColor(hex);
                            break;
                          }
                        } else if (color.startsWith('#')) {
                          setSelectedColor(color);
                          break;
                        }
                      }
                    }
                    element = element.parentElement;
                  }
                }
              }
              setShowColorPicker(!showColorPicker);
              setShowFontSize(false);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColorPicker && createPortal(
            <div
              className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2"
              style={{
                pointerEvents: 'auto',
                zIndex: 1000000,
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translateX(-50%)',
              }}
            >
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
                      setShowColorPicker(false);
                      }
                    }}
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>,
            document.body
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Save selection before opening dropdown
              saveSelection();
              setShowFontSize(!showFontSize);
              setShowColorPicker(false);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Font Size"
          >
            <Type className="w-4 h-4" />
          </button>
          {showFontSize && createPortal(
            <div
              className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 max-h-64 overflow-y-auto"
              style={{
                pointerEvents: 'auto',
                zIndex: 1000000,
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translateX(-50%)',
                minWidth: '120px',
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {fontSizeOptions.map((size) => {
                const currentSize = getFontSizeFromStyleClass(currentStyleClass);
                const isSelected = currentSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Restore focus to element
                      if (elementRef) {
                        elementRef.focus();
                        // Restore saved selection
                        restoreSelection();
                      }
                      onFontSizeChange(size);
                      setShowFontSize(false);
                    }}
                    className={`w-full px-3 py-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      isSelected ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 font-semibold' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {size}px
                  </button>
                );
              })}
            </div>,
            document.body
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div 
      className="text-center mb-2 relative w-full"
    >
      {/* Header Message */}
      {editorState.isEditorView ? (
        <div className="relative">
          <FormattingToolbar
            show={showHeaderToolbar}
            elementRef={headerMessageRef}
            toolbarRef={headerToolbarRef}
            showColorPicker={showHeaderColorPicker}
            setShowColorPicker={setShowHeaderColorPicker}
            showFontSize={showHeaderFontSize}
            setShowFontSize={setShowHeaderFontSize}
            selectedColor={selectedHeaderColor}
            setSelectedColor={setSelectedHeaderColor}
            currentStyleClass={headerMessage?.styleClass || ''}
            quickColors={quickColors}
            fontSizeOptions={fontSizeOptions}
            getFontSizeFromStyleClass={getFontSizeFromStyleClass}
            onBold={() => {
              if (headerMessageRef) {
                // Save the current selection before focusing
                const savedSelection = window.getSelection();
                let savedRange: Range | null = null;
                if (savedSelection && savedSelection.rangeCount > 0) {
                  savedRange = savedSelection.getRangeAt(0).cloneRange();
                }
                
                headerMessageRef.focus();
                
                // Restore selection if we had one
                if (savedRange) {
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(savedRange);
                }
                
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  if (!range.collapsed) {
                    document.execCommand('bold', false);
                  } else {
                    // If collapsed, select the word at cursor
                    selection.modify('extend', 'backward', 'word');
                    selection.modify('extend', 'forward', 'word');
                    if (!selection.isCollapsed) {
                      document.execCommand('bold', false);
                    }
                  }
                } else {
                  // If no selection, select all and apply bold
                  const range = document.createRange();
                  range.selectNodeContents(headerMessageRef);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  document.execCommand('bold', false);
                  selection?.removeAllRanges();
                }
                
                // Refocus to maintain selection
                headerMessageRef.focus();
                
                // Save innerHTML to preserve formatting
                const content = getNormalizedContent(headerMessageRef);
                setFixedTextStyles(prev => ({
                  ...prev,
                  headerMessage: {
                    ...(prev.headerMessage || {}),
                    content,
                  }
                }));
              }
            }}
            onItalic={() => {
              if (headerMessageRef) {
                // Save the current selection before focusing
                const savedSelection = window.getSelection();
                let savedRange: Range | null = null;
                if (savedSelection && savedSelection.rangeCount > 0) {
                  savedRange = savedSelection.getRangeAt(0).cloneRange();
                }
                
                headerMessageRef.focus();
                
                // Restore selection if we had one
                if (savedRange) {
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(savedRange);
                }
                
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  if (!range.collapsed) {
                    document.execCommand('italic', false);
                  } else {
                    // If collapsed, select the word at cursor
                    selection.modify('extend', 'backward', 'word');
                    selection.modify('extend', 'forward', 'word');
                    if (!selection.isCollapsed) {
                      document.execCommand('italic', false);
                    }
                  }
                } else {
                  // If no selection, select all and apply italic
                  const range = document.createRange();
                  range.selectNodeContents(headerMessageRef);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  document.execCommand('italic', false);
                  selection?.removeAllRanges();
                }
                
                // Refocus to maintain selection
                headerMessageRef.focus();
                
                // Save innerHTML to preserve formatting
                const content = getNormalizedContent(headerMessageRef);
                setFixedTextStyles(prev => ({
                  ...prev,
                  headerMessage: {
                    ...(prev.headerMessage || {}),
                    content,
                  }
                }));
              }
            }}
            onColorChange={(color) => {
              if (headerMessageRef) {
                headerMessageRef.focus();
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  document.execCommand('foreColor', false, color);
                } else {
                  // If no selection, select all and apply color
                  const range = document.createRange();
                  range.selectNodeContents(headerMessageRef);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  document.execCommand('foreColor', false, color);
                  selection?.removeAllRanges();
                }
                // Save innerHTML to preserve formatting
                const content = getNormalizedContent(headerMessageRef);
                setFixedTextStyles(prev => ({
                  ...prev,
                  headerMessage: {
                    ...(prev.headerMessage || {}),
                    content,
                    color,
                  }
                }));
              }
            }}
            onFontSizeChange={(size) => {
              const newStyleClass = updateFontSizeInStyleClass(headerMessage?.styleClass || '', size);
              if (headerMessageRef) {
                // Update the className to apply the new font size
                const classes = headerMessageRef.className.split(' ').filter(Boolean);
                const withoutSize = classes.filter(cls => !cls.startsWith('text-') && !cls.includes(':text-'));
                const sizeMap: Record<number, string> = {
                  12: 'text-xs', 14: 'text-sm', 16: 'text-base', 18: 'text-lg', 20: 'text-xl',
                  24: 'text-2xl', 28: 'text-2xl sm:text-3xl', 32: 'text-3xl sm:text-4xl',
                  36: 'text-4xl sm:text-5xl', 40: 'text-4xl sm:text-5xl', 48: 'text-5xl sm:text-6xl',
                  56: 'text-6xl sm:text-7xl', 64: 'text-7xl sm:text-8xl', 72: 'text-8xl sm:text-9xl',
                };
                const newSizeClass = sizeMap[size] || 'text-lg';
                headerMessageRef.className = [...newSizeClass.split(' '), ...withoutSize].join(' ').trim();
              }
              setFixedTextStyles(prev => ({
                ...prev,
                headerMessage: {
                  ...prev.headerMessage,
                  styleClass: newStyleClass,
                }
              }));
            }}
          />
          <div
            ref={setHeaderMessageRef}
            contentEditable
            className={`${headerMessage?.styleClass || applyThemeColorsToText(headerMessage, 'header')} cursor-text hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1 outline-none`}
            style={{
              ...sharedTextContainerStyle,
              color: headerMessage?.color || '#FFFFFF',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            }}
            data-prevent-bg-toggle="true"
            onClick={(e) => {
              e.stopPropagation();
              // Hide subHeader toolbar when clicking on headerMessage
              setShowSubHeaderToolbar(false);
              setShowSubHeaderColorPicker(false);
              setShowSubHeaderFontSize(false);
              setShowHeaderToolbar(true);
            }}
            onSelect={() => {
              // Hide subHeader toolbar when selecting in headerMessage
              setShowSubHeaderToolbar(false);
              setShowSubHeaderColorPicker(false);
              setShowSubHeaderFontSize(false);
              setShowHeaderToolbar(true);
            }}
            onBlur={(e) => {
              // Check if the blur is caused by clicking on toolbar or dropdown
              const relatedTarget = e.relatedTarget as Node;
              const toolbarElement = headerToolbarRef.current;
              const isClickingToolbar = toolbarElement && (
                toolbarElement.contains(relatedTarget) ||
                relatedTarget === toolbarElement
              );
              
              // Save innerHTML to preserve formatting
              const content = getNormalizedContent(headerMessageRef || undefined);
              setFixedTextStyles(prev => ({
                ...prev,
                headerMessage: {
                  ...prev.headerMessage,
                  content,
                }
              }));
              
              // Only hide toolbar if not clicking on it
              if (!isClickingToolbar) {
                setTimeout(() => {
                  // Double-check that we're still not focused on toolbar
                  const activeElement = document.activeElement;
                  if (!toolbarElement?.contains(activeElement)) {
                    setShowHeaderToolbar(false);
                    setShowHeaderColorPicker(false);
                    setShowHeaderFontSize(false);
                  }
                }, 200);
              }
            }}
            onInput={() => {
              // Save innerHTML to preserve formatting
              const content = getNormalizedContent(headerMessageRef || undefined);
              setFixedTextStyles(prev => ({
                ...prev,
                headerMessage: {
                  ...prev.headerMessage,
                  content,
                }
              }));
            }}
          />
        </div>
      ) : (
        <p 
          className={`${headerMessage?.styleClass || applyThemeColorsToText(headerMessage, 'header')}`}
          style={{ 
            ...sharedTextContainerStyle,
            color: headerMessage?.color, 
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          }}
          data-prevent-bg-toggle="true"
          dangerouslySetInnerHTML={{ __html: headerMessage?.content || '' }}
        />
      )}
      
      {/* Sub Header */}
      {editorState.isEditorView ? (
        <div className="relative">
          <FormattingToolbar
            show={showSubHeaderToolbar}
            elementRef={subHeaderRef}
            toolbarRef={subHeaderToolbarRef}
            showColorPicker={showSubHeaderColorPicker}
            setShowColorPicker={setShowSubHeaderColorPicker}
            showFontSize={showSubHeaderFontSize}
            setShowFontSize={setShowSubHeaderFontSize}
            selectedColor={selectedSubHeaderColor}
            setSelectedColor={setSelectedSubHeaderColor}
            currentStyleClass={subHeader?.styleClass || ''}
            quickColors={quickColors}
            fontSizeOptions={fontSizeOptions}
            getFontSizeFromStyleClass={getFontSizeFromStyleClass}
            onBold={() => {
              if (subHeaderRef) {
                // Save the current selection before focusing
                const savedSelection = window.getSelection();
                let savedRange: Range | null = null;
                if (savedSelection && savedSelection.rangeCount > 0) {
                  savedRange = savedSelection.getRangeAt(0).cloneRange();
                }
                
                subHeaderRef.focus();
                
                // Restore selection if we had one
                if (savedRange) {
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(savedRange);
                }
                
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  if (!range.collapsed) {
                    document.execCommand('bold', false);
                  } else {
                    // If collapsed, select the word at cursor
                    selection.modify('extend', 'backward', 'word');
                    selection.modify('extend', 'forward', 'word');
                    if (!selection.isCollapsed) {
                      document.execCommand('bold', false);
                    }
                  }
                } else {
                  // If no selection, select all and apply bold
                  const range = document.createRange();
                  range.selectNodeContents(subHeaderRef);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  document.execCommand('bold', false);
                  selection?.removeAllRanges();
                }
                
                // Refocus to maintain selection
                subHeaderRef.focus();
                
                // Save innerHTML to preserve formatting
                const content = getNormalizedContent(subHeaderRef);
                setFixedTextStyles(prev => ({
                  ...prev,
                  subHeader: {
                    ...(prev.subHeader || {}),
                    content,
                  }
                }));
              }
            }}
            onItalic={() => {
              if (subHeaderRef) {
                // Save the current selection before focusing
                const savedSelection = window.getSelection();
                let savedRange: Range | null = null;
                if (savedSelection && savedSelection.rangeCount > 0) {
                  savedRange = savedSelection.getRangeAt(0).cloneRange();
                }
                
                subHeaderRef.focus();
                
                // Restore selection if we had one
                if (savedRange) {
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(savedRange);
                }
                
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  if (!range.collapsed) {
                    document.execCommand('italic', false);
                  } else {
                    // If collapsed, select the word at cursor
                    selection.modify('extend', 'backward', 'word');
                    selection.modify('extend', 'forward', 'word');
                    if (!selection.isCollapsed) {
                      document.execCommand('italic', false);
                    }
                  }
                } else {
                  // If no selection, select all and apply italic
                  const range = document.createRange();
                  range.selectNodeContents(subHeaderRef);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  document.execCommand('italic', false);
                  selection?.removeAllRanges();
                }
                
                // Refocus to maintain selection
                subHeaderRef.focus();
                
                // Save innerHTML to preserve formatting
                const content = getNormalizedContent(subHeaderRef);
                setFixedTextStyles(prev => ({
                  ...prev,
                  subHeader: {
                    ...(prev.subHeader || {}),
                    content,
                  }
                }));
              }
            }}
            onColorChange={(color) => {
              if (subHeaderRef) {
                subHeaderRef.focus();
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  document.execCommand('foreColor', false, color);
                } else {
                  // If no selection, select all and apply color
                  const range = document.createRange();
                  range.selectNodeContents(subHeaderRef);
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  document.execCommand('foreColor', false, color);
                  selection?.removeAllRanges();
                }
                // Save innerHTML to preserve formatting
                const content = getNormalizedContent(subHeaderRef);
                setFixedTextStyles(prev => ({
                  ...prev,
                  subHeader: {
                    ...(prev.subHeader || {}),
                    content,
                    color,
                  }
                }));
              }
            }}
            onFontSizeChange={(size) => {
              const newStyleClass = updateFontSizeInStyleClass(subHeader?.styleClass || '', size);
              if (subHeaderRef) {
                // Update the className to apply the new font size
                const classes = subHeaderRef.className.split(' ').filter(Boolean);
                const withoutSize = classes.filter(cls => !cls.startsWith('text-') && !cls.includes(':text-'));
                const sizeMap: Record<number, string> = {
                  12: 'text-xs', 14: 'text-sm', 16: 'text-base', 18: 'text-lg', 20: 'text-xl',
                  24: 'text-2xl', 28: 'text-2xl sm:text-3xl', 32: 'text-3xl sm:text-4xl',
                  36: 'text-4xl sm:text-5xl', 40: 'text-4xl sm:text-5xl', 48: 'text-5xl sm:text-6xl',
                  56: 'text-6xl sm:text-7xl', 64: 'text-7xl sm:text-8xl', 72: 'text-8xl sm:text-9xl',
                };
                const newSizeClass = sizeMap[size] || 'text-lg';
                subHeaderRef.className = [...newSizeClass.split(' '), ...withoutSize].join(' ').trim();
              }
              setFixedTextStyles(prev => ({
                ...prev,
                subHeader: {
                  ...prev.subHeader,
                  styleClass: newStyleClass,
                }
              }));
            }}
          />
          <div
            ref={setSubHeaderRef}
            contentEditable
            className={`${subHeader?.styleClass || applyThemeColorsToText(subHeader, 'subheader')} cursor-text hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1 outline-none`}
            style={{
              ...sharedTextContainerStyle,
              color: subHeader?.color || '#FFFFFF',
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            }}
            data-prevent-bg-toggle="true"
            onClick={(e) => {
              e.stopPropagation();
              // Hide headerMessage toolbar when clicking on subHeader
              setShowHeaderToolbar(false);
              setShowHeaderColorPicker(false);
              setShowHeaderFontSize(false);
              setShowSubHeaderToolbar(true);
            }}
            onSelect={() => {
              // Hide headerMessage toolbar when selecting in subHeader
              setShowHeaderToolbar(false);
              setShowHeaderColorPicker(false);
              setShowHeaderFontSize(false);
              setShowSubHeaderToolbar(true);
            }}
            onBlur={(e) => {
              // Check if the blur is caused by clicking on toolbar or dropdown
              const relatedTarget = e.relatedTarget as Node;
              const toolbarElement = subHeaderToolbarRef.current;
              const isClickingToolbar = toolbarElement && (
                toolbarElement.contains(relatedTarget) ||
                relatedTarget === toolbarElement
              );
              
              // Save innerHTML to preserve formatting
              const content = getNormalizedContent(subHeaderRef || undefined);
              setFixedTextStyles(prev => ({
                ...prev,
                subHeader: {
                  ...prev.subHeader,
                  content,
                }
              }));
              
              // Only hide toolbar if not clicking on it
              if (!isClickingToolbar) {
                setTimeout(() => {
                  // Double-check that we're still not focused on toolbar
                  const activeElement = document.activeElement;
                  if (!toolbarElement?.contains(activeElement)) {
                    setShowSubHeaderToolbar(false);
                    setShowSubHeaderColorPicker(false);
                    setShowSubHeaderFontSize(false);
                  }
                }, 200);
              }
            }}
            onInput={() => {
              // Save innerHTML to preserve formatting
              const content = getNormalizedContent(subHeaderRef || undefined);
              setFixedTextStyles(prev => ({
                ...prev,
                subHeader: {
                  ...prev.subHeader,
                  content,
                }
              }));
            }}
          />
        </div>
      ) : (
        <p 
          className={`${subHeader?.styleClass || applyThemeColorsToText(subHeader, 'subheader')}`}
          style={{ 
            ...sharedTextContainerStyle,
            color: subHeader?.color, 
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          }}
          data-prevent-bg-toggle="true"
          dangerouslySetInnerHTML={{ __html: subHeader?.content || '' }}
        />
      )}
    </div>
  );
};

