'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { XIcon } from './Icons';

// Memoized Quick Colors component to prevent re-renders on every keystroke
const QuickColorsSection = memo(({ legacyTheme, getThemeQuickColors, updateColor }: {
  legacyTheme: any;
  getThemeQuickColors: (theme: any) => string[];
  updateColor: (color: string) => void;
}) => {
  const quickColors = useMemo(() => getThemeQuickColors(legacyTheme), [legacyTheme, getThemeQuickColors]);
  
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">Quick Colors</label>
      <div className="flex flex-wrap gap-2">
        {quickColors.map((color, index) => (
          <button
            key={`${color}-${index}`}
            onClick={() => updateColor(color)}
            className="w-8 h-8 rounded-full border-2 border-gray-600 hover:border-gray-400 transition-colors"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
});

QuickColorsSection.displayName = 'QuickColorsSection';

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
  onClose,
  setFixedTextStyles,
  getThemeQuickColors,
}) => {
  // Note: We don't lock body scroll for TextEditorModal since it's a slide-over modal
  // that doesn't cover the entire screen. Body scroll lock would cause the background
  // to resize due to backgroundAttachment: 'fixed' on the background image.

  // Use local state for input to prevent lag on every keystroke
  // Only recalculate when targetId changes or when modal opens
  const currentTextStyle = useMemo(() => {
    const style = fixedTextStyles[editingText.targetId];
    return style || {
      content: '',
      color: '#FFFFFF',
      styleClass: 'text-lg font-normal'
    };
  }, [editingText.targetId, isOpen ? fixedTextStyles[editingText.targetId] : null]);

  const [localContent, setLocalContent] = useState(currentTextStyle.content);
  const [localColor, setLocalColor] = useState(currentTextStyle.color);
  const [localStyleClass, setLocalStyleClass] = useState(currentTextStyle.styleClass);

  // Track initial values when modal opens to detect changes
  const initialContentRef = useRef<string>('');
  const initialColorRef = useRef<string>('');
  const initialStyleClassRef = useRef<string>('');

  // Sync local state when modal opens or target changes
  useEffect(() => {
    if (isOpen) {
      const content = currentTextStyle.content;
      const color = currentTextStyle.color;
      const styleClass = currentTextStyle.styleClass;
      
      setLocalContent(content);
      setLocalColor(color);
      setLocalStyleClass(styleClass);
      
      // Store initial values for comparison
      initialContentRef.current = content;
      initialColorRef.current = color;
      initialStyleClassRef.current = styleClass;
    }
  }, [isOpen, editingText.targetId, currentTextStyle.content, currentTextStyle.color, currentTextStyle.styleClass]);

  // Save changes when modal closes - use refs to avoid dependency on local state
  const localContentRef = useRef(localContent);
  const localColorRef = useRef(localColor);
  const localStyleClassRef = useRef(localStyleClass);
  
  // Update refs on every change (this doesn't cause re-renders)
  useEffect(() => {
    localContentRef.current = localContent;
    localColorRef.current = localColor;
    localStyleClassRef.current = localStyleClass;
  }, [localContent, localColor, localStyleClass]);

  // Save changes when modal closes - only depends on isOpen, not local state
  useEffect(() => {
    if (!isOpen && editingText.targetId) {
      // Check if there are any changes to save (compare with initial values)
      const hasContentChange = localContentRef.current !== initialContentRef.current;
      const hasColorChange = localColorRef.current !== initialColorRef.current;
      const hasStyleClassChange = localStyleClassRef.current !== initialStyleClassRef.current;
      
      if (hasContentChange || hasColorChange || hasStyleClassChange) {
        setFixedTextStyles(prev => ({
          ...prev,
          [editingText.targetId]: { 
            ...prev[editingText.targetId],
            content: localContentRef.current,
            color: localColorRef.current,
            styleClass: localStyleClassRef.current
          }
        }));
      }
    }
  }, [isOpen, editingText.targetId, setFixedTextStyles]);

  // Simple local state updates - no immediate fixedTextStyles updates
  const updateContent = useCallback((value: string) => {
    setLocalContent(value);
  }, []);

  const updateColor = useCallback((value: string) => {
    setLocalColor(value);
  }, []);

  const updateStyleClass = useCallback((value: string) => {
    setLocalStyleClass(value);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit Text"
      className={`fixed inset-y-0 right-0 w-full md:w-80 bg-gray-900 text-white shadow-2xl transform transition-transform duration-500 z-[60] p-0 border-l border-gray-700/50 overflow-hidden flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      onClick={(e) => {
        // Close on background click (when clicking on the modal itself, not its children)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900">
        <h3 className={`text-sm font-semibold tracking-wide ${backgroundAnalysis.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>Edit Text</h3>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white transition-colors"
          aria-label="Close"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Content</label>
            <textarea
              rows={4}
              value={localContent}
              onChange={(e) => updateContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 min-h-[96px]"
              style={{ fontSize: '16px' }}
              onFocus={(e) => {
                // Prevent iOS zoom on focus
                e.target.style.fontSize = '16px';
              }}
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={localColor}
                onChange={(e) => updateColor(e.target.value)}
                className="w-10 h-8 rounded border-none cursor-pointer"
              />
              <input
                type="text"
                value={localColor}
                onChange={(e) => updateColor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Typography */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Typography</label>
            <select
              value={localStyleClass}
              onChange={(e) => updateStyleClass(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
            >
              <option value="text-8xl sm:text-9xl font-extrabold tracking-tight drop-shadow-lg">Display Extra Large</option>
              <option value="text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg">Display Large</option>
              <option value="text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg">Display Medium</option>
              <option value="text-4xl sm:text-5xl font-semibold tracking-tight drop-shadow-lg">Display Small</option>
              <option value="text-3xl sm:text-4xl font-bold drop-shadow-md">Heading Large</option>
              <option value="text-2xl sm:text-3xl font-semibold drop-shadow-md">Heading Medium</option>
              <option value="text-xl sm:text-2xl font-medium drop-shadow-sm">Heading Small</option>
              <option value="text-lg sm:text-xl font-normal">Body Large</option>
              <option value="text-lg font-semibold">Body Semibold</option>
              <option value="text-base sm:text-lg font-normal">Body Medium</option>
              <option value="text-sm sm:text-base font-normal">Body Small</option>
            </select>
          </div>

          {/* Bold and Italic Controls */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Text Style</label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-300">Bold:</label>
                <button
                  onClick={() => {
                    const isBold = localStyleClass.includes('font-bold') || localStyleClass.includes('font-extrabold') || localStyleClass.includes('font-black');
                    const newStyleClass = isBold 
                      ? localStyleClass.replace(/font-\w+/g, 'font-normal')
                      : localStyleClass.replace(/font-\w+/g, 'font-bold');
                    updateStyleClass(newStyleClass);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    localStyleClass.includes('font-bold') || 
                    localStyleClass.includes('font-extrabold') || 
                    localStyleClass.includes('font-black')
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  B
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-300">Italic:</label>
                <button
                  onClick={() => {
                    const isItalic = localStyleClass.includes('italic');
                    const newStyleClass = isItalic 
                      ? localStyleClass.replace(' italic', '').replace('italic', '')
                      : localStyleClass + ' italic';
                    updateStyleClass(newStyleClass);
                  }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    localStyleClass.includes('italic')
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  I
                </button>
              </div>
            </div>
          </div>

          {/* Quick Colors (Theme-matched) */}
          <QuickColorsSection 
            legacyTheme={legacyTheme}
            getThemeQuickColors={getThemeQuickColors}
            updateColor={updateColor}
          />

        </div>
      </div>
    </div>
  );
};







