'use client';

import React from 'react';
import { XIcon, TrashIcon } from './Icons';

interface TextEditorModalProps {
  isOpen: boolean;
  isAnimating: boolean;
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
  isAnimating,
  editingText,
  fixedTextStyles,
  backgroundAnalysis,
  legacyTheme,
  onClose,
  setFixedTextStyles,
  getThemeQuickColors,
}) => {
  if (!isOpen) return null;

  // Debug: Log the current values when modal opens
  console.log('[TextEditorModal] Current values:', {
    targetId: editingText.targetId,
    currentStyle: fixedTextStyles[editingText.targetId],
    allFixedTextStyles: fixedTextStyles
  });

  // Ensure we have proper fallback values for the current target
  const currentTextStyle = fixedTextStyles[editingText.targetId] || {
    content: '',
    color: '#FFFFFF',
    styleClass: 'text-lg font-normal'
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        // Remove overlay blocking when modal is open for the same text element
        pointerEvents: editingText.targetId === 'headerMessage' || editingText.targetId === 'subHeader' || editingText.targetId === 'promoMessage' ? 'none' : 'auto'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Text"
        className={`fixed inset-y-0 right-0 w-80 bg-gray-900/70 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-500 z-[60] p-0 border-l border-gray-700/50 overflow-hidden ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
          <h3 className={`text-sm font-semibold tracking-wide ${backgroundAnalysis.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>Edit Text</h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 overflow-y-auto h-full pb-28">
          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Content</label>
            <textarea
              rows={4}
              value={currentTextStyle.content}
              onChange={(e) => setFixedTextStyles(prev => ({
                ...prev,
                [editingText.targetId]: { 
                  ...prev[editingText.targetId],
                  content: e.target.value,
                  color: prev[editingText.targetId]?.color || currentTextStyle.color,
                  styleClass: prev[editingText.targetId]?.styleClass || currentTextStyle.styleClass
                }
              }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 min-h-[96px]"
            />
          </div>

          {/* Delete Button */}
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => {
                setFixedTextStyles(prev => ({
                  ...prev,
                  [editingText.targetId]: { 
                    content: '',
                    color: prev[editingText.targetId]?.color || currentTextStyle.color,
                    styleClass: prev[editingText.targetId]?.styleClass || currentTextStyle.styleClass
                  }
                }));
                onClose();
              }}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Remove Text
            </button>
          </div>

          {/* Color */}
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

          {/* Typography */}
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

          {/* Actions */}
          <div className="h-24" />
        </div>

        <div className="sticky bottom-0 z-10 px-4 py-3 border-t border-gray-800/50 bg-transparent backdrop-blur-sm flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};







