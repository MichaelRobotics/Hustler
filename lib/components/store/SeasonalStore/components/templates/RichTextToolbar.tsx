'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Palette, Type, Image } from 'lucide-react';

interface QuickColor {
  name: string;
  value: string;
}

const defaultQuickColors: QuickColor[] = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Gray', value: '#6B7280' },
];

interface RichTextToolbarProps {
  isOpen: boolean;
  targetRef: HTMLDivElement | null;
  onBold: () => void;
  onItalic: () => void;
  onColorSelect: (color: string) => void;
  showColorPicker: boolean;
  onToggleColorPicker: () => void;
  selectedColor: string;
  onSelectedColorChange: (color: string) => void;
  showTurnIntoMenu?: boolean;
  onToggleTurnIntoMenu?: (position: { top: number; left: number }) => void;
  showImageButton?: boolean;
  onImageClick?: () => void;
  position?: 'above' | 'below';
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  isOpen,
  targetRef,
  onBold,
  onItalic,
  onColorSelect,
  showColorPicker,
  onToggleColorPicker,
  selectedColor,
  onSelectedColorChange,
  showTurnIntoMenu = false,
  onToggleTurnIntoMenu,
  showImageButton = false,
  onImageClick,
  position = 'above',
}) => {
  if (!isOpen || !targetRef || typeof window === 'undefined') return null;

  const rect = targetRef.getBoundingClientRect();
  const toolbarStyle: React.CSSProperties = {
    pointerEvents: 'auto',
    zIndex: 999999,
    ...(position === 'above'
      ? {
          bottom: `${window.innerHeight - rect.top + 8}px`,
          right: `${window.innerWidth - rect.right}px`,
        }
      : {
          top: `${rect.bottom + 8}px`,
          left: `${rect.left}px`,
        }),
  };

  const colorPickerStyle: React.CSSProperties = {
    pointerEvents: 'auto',
    zIndex: 999999,
    ...(position === 'above'
      ? {
          bottom: `${window.innerHeight - rect.top + 60}px`,
          right: `${window.innerWidth - rect.right}px`,
        }
      : {
          top: `${rect.bottom + 60}px`,
          left: `${rect.left}px`,
        }),
  };

  return createPortal(
    <>
      {/* Main Toolbar */}
      <div 
        className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-2"
        style={toolbarStyle}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Turn Into Button */}
        {onToggleTurnIntoMenu && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const buttonRect = e.currentTarget.getBoundingClientRect();
              onToggleTurnIntoMenu({
                top: buttonRect.bottom + 4,
                left: buttonRect.left,
              });
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Turn into"
          >
            <Type className="w-4 h-4" />
          </button>
        )}

        {/* Bold Button */}
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

        {/* Italic Button */}
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

        {/* Color Button */}
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
              onToggleColorPicker();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Text Color"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>

        {/* Image Button */}
        {showImageButton && onImageClick && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onImageClick();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Insert Image"
          >
            <Image className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Color Picker Dropdown */}
      {showColorPicker && (
        <div 
          className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2"
          style={colorPickerStyle}
        >
          <div className="grid grid-cols-6 gap-1 mb-2">
            {defaultQuickColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onColorSelect(color.value);
                }}
                className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => {
                const color = e.target.value;
                onSelectedColorChange(color);
                onColorSelect(color);
              }}
              className="w-full h-8 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>,
    document.body
  );
};




