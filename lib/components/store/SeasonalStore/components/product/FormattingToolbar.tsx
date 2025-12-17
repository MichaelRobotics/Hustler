'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Palette, Type, ArrowLeft } from 'lucide-react';
import type { FormattingToolbarProps } from './types';

interface ExtendedFormattingToolbarProps extends FormattingToolbarProps {
  showEmojiPicker?: boolean;
  setShowEmojiPicker?: (show: boolean) => void;
  showFontSize?: boolean;
  setShowFontSize?: (show: boolean) => void;
  fontSizeOptions?: number[];
  emojiDatabase?: Array<{ emoji: string; name: string; keywords: string[] }>;
  onEmojiSelect?: (emoji: string) => void;
  onFontSizeChange?: (size: number) => void;
  hideFontSize?: boolean;
  hideBoldItalic?: boolean;
}

const FormattingToolbarComponent: React.FC<ExtendedFormattingToolbarProps> = ({
  show,
  elementRef,
  toolbarRef,
  showColorPicker,
  setShowColorPicker,
  showEmojiPicker = false,
  setShowEmojiPicker,
  showFontSize = false,
  setShowFontSize,
  selectedColor,
  setSelectedColor,
  quickColors,
  fontSizeOptions = [],
  emojiDatabase = [],
  activeSubToolbar,
  setActiveSubToolbar,
  onBold,
  onItalic,
  onColorChange,
  onEmojiSelect,
  onFontSizeChange,
  hideFontSize = false,
  hideBoldItalic = false,
}) => {
  if (!show || !elementRef || typeof window === 'undefined') return null;
  
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);
  
  const saveSelection = () => {
    if (!elementRef) return;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (elementRef.contains(range.commonAncestorContainer)) {
        const preCaretRange = document.createRange();
        preCaretRange.selectNodeContents(elementRef);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const start = preCaretRange.toString().length;
        const end = start + range.toString().length;
        savedSelectionRef.current = { start, end };
      }
    } else {
      const textLength = elementRef.textContent?.length || 0;
      savedSelectionRef.current = { start: textLength, end: textLength };
    }
  };
  
  const restoreSelection = () => {
    if (!elementRef || !savedSelectionRef.current) return;
    const { start, end } = savedSelectionRef.current;
    const selection = window.getSelection();
    try {
      let currentOffset = 0;
      const walker = document.createTreeWalker(elementRef, NodeFilter.SHOW_TEXT, null);
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
  
  const getToolbarPosition = () => {
    if (!elementRef) return { top: 0, left: 0 };
    
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
  
  const [position, setPosition] = useState(() => ({ top: 0, left: 0 }));
  const positionRef = useRef<{ top: number; left: number } | null>(null);
  const hasSetInitialPosition = useRef(false);
  
  // Update position only when toolbar first appears
  useEffect(() => {
    if (show && elementRef && !hasSetInitialPosition.current) {
      requestAnimationFrame(() => {
        if (!elementRef) return;
        const newPosition = getToolbarPosition();
        if (newPosition.top !== 0 || newPosition.left !== 0) {
          positionRef.current = newPosition;
          setPosition(newPosition);
          hasSetInitialPosition.current = true;
        }
      });
    } else if (!show) {
      hasSetInitialPosition.current = false;
      positionRef.current = null;
      setPosition({ top: 0, left: 0 });
    }
  }, [show, elementRef]);
  
  const stablePosition = positionRef.current || (position.top !== 0 || position.left !== 0 ? position : { top: 0, left: 0 });
  
  if (!show || !elementRef || (stablePosition.top === 0 && stablePosition.left === 0 && !positionRef.current)) {
    return null;
  }

  // Handle ProductCard-style color sub-toolbar (with back button)
  if (activeSubToolbar === 'color' && setActiveSubToolbar) {
    return createPortal(
      <>
        <div
          className="fixed inset-0 bg-transparent"
          style={{
            zIndex: 999998,
            pointerEvents: 'auto',
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Close handler would be passed via onClose prop
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
            top: `${stablePosition.top}px`,
            left: `${stablePosition.left}px`,
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
              setActiveSubToolbar(null);
              setShowColorPicker(false);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
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
  
  // Main toolbar (ProductEditorModal style with more features)
  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-2"
      style={{
        pointerEvents: 'auto',
        zIndex: 999999,
        top: `${stablePosition.top}px`,
        left: `${stablePosition.left}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {!hideBoldItalic && (
        <>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (elementRef) {
                elementRef.focus();
                saveSelection();
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (elementRef) {
                elementRef.focus();
                restoreSelection();
                onBold();
              }
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
              if (elementRef) {
                elementRef.focus();
                saveSelection();
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (elementRef) {
                elementRef.focus();
                restoreSelection();
                onItalic();
              }
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
        </>
      )}
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
                      setSelectedColor(colorMatch[1].trim());
                      break;
                    }
                  }
                  element = element.parentElement;
                }
              }
            }
            if (setActiveSubToolbar) {
              setActiveSubToolbar('color');
            } else {
              setShowColorPicker(!showColorPicker);
            }
            if (setShowEmojiPicker) setShowEmojiPicker(false);
            if (setShowFontSize) setShowFontSize(false);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Text Color"
        >
          <Palette className="w-4 h-4" />
        </button>
        {showColorPicker && !setActiveSubToolbar && createPortal(
          <div
            className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2"
            style={{
              pointerEvents: 'auto',
              zIndex: 1000000,
              top: `${stablePosition.top}px`,
              left: `${stablePosition.left}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="grid grid-cols-6 gap-1 mb-2">
              {quickColors.map((color, index) => (
                <button
                  key={`${color}-${index}`}
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
                      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                        const range = document.createRange();
                        range.selectNodeContents(elementRef);
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                      }
                    }
                    setSelectedColor(color);
                    onColorChange(color);
                    setShowColorPicker(false);
                  }}
                  className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  const color = e.target.value;
                  if (elementRef) {
                    elementRef.focus();
                    const selection = window.getSelection();
                    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                      const range = document.createRange();
                      range.selectNodeContents(elementRef);
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                    }
                  }
                  setSelectedColor(color);
                  onColorChange(color);
                  setShowColorPicker(false);
                }}
                className="w-full h-8 cursor-pointer border border-gray-300 dark:border-gray-600 rounded"
                title="Custom Color"
              />
            </div>
          </div>,
          document.body
        )}
      </div>
      {setShowEmojiPicker && emojiDatabase && emojiDatabase.length > 0 && (
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
              }
              if (setShowEmojiPicker) {
                setShowEmojiPicker(!showEmojiPicker);
              }
              setShowColorPicker(false);
              if (setShowFontSize) setShowFontSize(false);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
            title="Emoji"
          >
            😀
          </button>
          {showEmojiPicker && createPortal(
            <div
              className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 max-h-64 overflow-y-auto"
              style={{
                pointerEvents: 'auto',
                zIndex: 1000000,
                top: `${stablePosition.top}px`,
                left: `${stablePosition.left}px`,
                transform: 'translateX(-50%)',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {emojiDatabase.map((item) => (
                <button
                  key={item.emoji}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (elementRef && onEmojiSelect) {
                      elementRef.focus();
                      const selection = window.getSelection();
                      let range: Range;
                      if (selection && selection.rangeCount > 0) {
                        range = selection.getRangeAt(0);
                      } else {
                        range = document.createRange();
                        if (elementRef.childNodes.length > 0) {
                          range.selectNodeContents(elementRef);
                          range.collapse(false);
                        } else {
                          range.setStart(elementRef, 0);
                          range.setEnd(elementRef, 0);
                        }
                      }
                      range.deleteContents();
                      range.insertNode(document.createTextNode(item.emoji));
                      range.collapse(false);
                      selection?.removeAllRanges();
                      selection?.addRange(range);
                      onEmojiSelect(item.emoji);
                      if (setShowEmojiPicker) setShowEmojiPicker(false);
                    }
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                  title={item.name}
                >
                  {item.emoji}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      )}
      {!hideFontSize && setShowFontSize && fontSizeOptions.length > 0 && (
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
                top: `${stablePosition.top}px`,
                left: `${stablePosition.left}px`,
                transform: 'translateX(-50%)',
                minWidth: '120px',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {fontSizeOptions.map((size) => (
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
                    if (elementRef) {
                      elementRef.focus();
                      restoreSelection();
                    }
                    if (onFontSizeChange) {
                      onFontSizeChange(size);
                    }
                    setShowFontSize(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-white"
                >
                  {size}px
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      )}
    </div>,
    document.body
  );
};

export const FormattingToolbar = React.memo(FormattingToolbarComponent) as React.FC<ExtendedFormattingToolbarProps>;



