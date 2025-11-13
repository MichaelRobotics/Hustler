'use client';

import React, { useEffect } from 'react';
import { XIcon } from './Icons';

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
  updateProduct?: (id: number | string, updates: any) => void;
  products?: Array<{ id: number | string; name: string; description: string }>;
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
  updateProduct,
  products = [],
}) => {
  // Prevent body scroll and viewport movement on mobile when modal is open
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll to prevent background movement
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalHeight = document.body.style.height;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      
      // Get current scroll position
      const scrollY = window.scrollY;
      
      // Lock body to prevent scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = `-${scrollY}px`;
      
      return () => {
        // Restore body styles
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        document.body.style.top = originalTop;
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Debug: Log the current values when modal opens
  console.log('[TextEditorModal] Current values:', {
    targetId: editingText.targetId,
    currentStyle: fixedTextStyles[editingText.targetId],
    allFixedTextStyles: fixedTextStyles
  });

  // Check if editing a product text
  const isProductText = editingText.targetId.startsWith('productName-') || editingText.targetId.startsWith('productDesc-');
  const productId = isProductText ? editingText.targetId.split('-')[1] : null;
  const isProductName = isProductText && editingText.targetId.startsWith('productName-');
  const isProductDesc = isProductText && editingText.targetId.startsWith('productDesc-');
  
  // Get product if editing product text
  const currentProduct = productId ? products.find(p => String(p.id) === String(productId)) : null;
  
  // Ensure we have proper fallback values for the current target
  const currentTextStyle = isProductText && currentProduct
    ? {
        content: isProductName ? currentProduct.name : currentProduct.description,
        color: '#FFFFFF', // Product text uses theme colors, not custom colors
        styleClass: 'text-lg font-normal' // Product text uses theme classes, not custom classes
      }
    : fixedTextStyles[editingText.targetId] || {
        content: '',
        color: '#FFFFFF',
        styleClass: 'text-lg font-normal'
      };

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
              value={currentTextStyle.content}
              onChange={(e) => {
                if (isProductText && updateProduct && productId) {
                  // Update product directly
                  if (isProductName) {
                    updateProduct(productId, { name: e.target.value });
                  } else if (isProductDesc) {
                    updateProduct(productId, { description: e.target.value });
                  }
                } else {
                  // Update fixed text styles (for headers, etc.)
                  setFixedTextStyles(prev => ({
                    ...prev,
                    [editingText.targetId]: { 
                      ...prev[editingText.targetId],
                      content: e.target.value,
                      color: prev[editingText.targetId]?.color || currentTextStyle.color,
                      styleClass: prev[editingText.targetId]?.styleClass || currentTextStyle.styleClass
                    }
                  }));
                }
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 min-h-[96px]"
              style={{ fontSize: '16px' }}
              onFocus={(e) => {
                // Prevent iOS zoom on focus
                e.target.style.fontSize = '16px';
              }}
            />
          </div>

          {/* Color - Only show for non-product text */}
          {!isProductText && (
            <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={currentTextStyle.color}
                onChange={(e) => {
                  console.log('[TextEditorModal] Color changed:', e.target.value);
                  setFixedTextStyles(prev => ({
                    ...prev,
                    [editingText.targetId]: { 
                      ...prev[editingText.targetId],
                      color: e.target.value,
                      content: prev[editingText.targetId]?.content || currentTextStyle.content,
                      styleClass: prev[editingText.targetId]?.styleClass || currentTextStyle.styleClass
                    }
                  }));
                }}
                className="w-10 h-8 rounded border-none cursor-pointer"
              />
              <input
                type="text"
                value={currentTextStyle.color}
                onChange={(e) => setFixedTextStyles(prev => ({
                  ...prev,
                  [editingText.targetId]: { 
                    ...prev[editingText.targetId],
                    color: e.target.value,
                    content: prev[editingText.targetId]?.content || currentTextStyle.content,
                    styleClass: prev[editingText.targetId]?.styleClass || currentTextStyle.styleClass
                  }
                }))}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
          </div>
          )}

          {/* Typography - Only show for non-product text */}
          {!isProductText && (
          <>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Typography</label>
            <select
              value={currentTextStyle.styleClass}
              onChange={(e) => {
                console.log('[TextEditorModal] Typography changed:', e.target.value);
                setFixedTextStyles(prev => ({
                  ...prev,
                  [editingText.targetId]: { 
                    ...prev[editingText.targetId],
                    styleClass: e.target.value,
                    content: prev[editingText.targetId]?.content || currentTextStyle.content,
                    color: prev[editingText.targetId]?.color || currentTextStyle.color
                  }
                }));
              }}
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
                    const currentStyle = fixedTextStyles[editingText.targetId]?.styleClass || '';
                    const isBold = currentStyle.includes('font-bold') || currentStyle.includes('font-extrabold') || currentStyle.includes('font-black');
                    const newStyleClass = isBold 
                      ? currentStyle.replace(/font-\w+/g, 'font-normal')
                      : currentStyle.replace(/font-\w+/g, 'font-bold');
                    setFixedTextStyles(prev => ({
                      ...prev,
                      [editingText.targetId]: { 
                        ...prev[editingText.targetId],
                        styleClass: newStyleClass,
                        content: prev[editingText.targetId]?.content || '',
                        color: prev[editingText.targetId]?.color || '#FFFFFF'
                      }
                    }));
                  }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    fixedTextStyles[editingText.targetId]?.styleClass?.includes('font-bold') || 
                    fixedTextStyles[editingText.targetId]?.styleClass?.includes('font-extrabold') || 
                    fixedTextStyles[editingText.targetId]?.styleClass?.includes('font-black')
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
                    const currentStyle = fixedTextStyles[editingText.targetId]?.styleClass || '';
                    const isItalic = currentStyle.includes('italic');
                    const newStyleClass = isItalic 
                      ? currentStyle.replace(' italic', '').replace('italic', '')
                      : currentStyle + ' italic';
                    setFixedTextStyles(prev => ({
                      ...prev,
                      [editingText.targetId]: { 
                        ...prev[editingText.targetId],
                        styleClass: newStyleClass,
                        content: prev[editingText.targetId]?.content || '',
                        color: prev[editingText.targetId]?.color || '#FFFFFF'
                      }
                    }));
                  }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    fixedTextStyles[editingText.targetId]?.styleClass?.includes('italic')
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
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Quick Colors</label>
            <div className="flex flex-wrap gap-2">
              {getThemeQuickColors(legacyTheme).map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  onClick={() => setFixedTextStyles(prev => ({
                    ...prev,
                    [editingText.targetId]: { 
                      ...prev[editingText.targetId],
                      color: color,
                      content: prev[editingText.targetId]?.content || currentTextStyle.content,
                      styleClass: prev[editingText.targetId]?.styleClass || currentTextStyle.styleClass
                    }
                  }))}
                  className="w-8 h-8 rounded-full border-2 border-gray-600 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          </>
          )}

        </div>
      </div>
    </div>
  );
};







