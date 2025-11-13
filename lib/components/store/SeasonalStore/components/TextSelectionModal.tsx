import React, { useState, useCallback, useEffect } from 'react';
import { XIcon, SettingsIcon, TypeIcon, PaletteIcon } from './Icons';

interface TextSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedText: {
    id: string;
    content: string;
    color: string;
    styleClass: string;
  } | null;
  onUpdateText: (id: string, updates: { content?: string; color?: string; styleClass?: string }) => void;
  position?: { x: number; y: number };
}

export const TextSelectionModal: React.FC<TextSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedText,
  onUpdateText,
  position = { x: 0, y: 0 }
}) => {
  const [localContent, setLocalContent] = useState('');
  const [localColor, setLocalColor] = useState('#FFFFFF');
  const [localStyleClass, setLocalStyleClass] = useState('text-xl font-normal');

  // Typography options matching the initial design
  const typographyOptions = [
    { 
      label: 'Display (Large)', 
      class: 'text-6xl sm:text-7xl font-extrabold tracking-tight drop-shadow-lg',
      description: 'Main header style - CLICK, MAIN HEADER TEXT'
    },
    { 
      label: 'Header (H1)', 
      class: 'text-5xl font-bold',
      description: 'Large header'
    },
    { 
      label: 'Subtitle (H2)', 
      class: 'text-4xl font-semibold',
      description: 'Medium header'
    },
    { 
      label: 'Promo (H3)', 
      class: 'text-3xl font-medium',
      description: 'Promotional text'
    },
    { 
      label: 'Body (P)', 
      class: 'text-xl font-normal',
      description: 'Regular text'
    },
    { 
      label: 'Small Body', 
      class: 'text-lg font-light',
      description: 'Smaller text'
    },
    { 
      label: 'Caption', 
      class: 'text-sm font-normal',
      description: 'Caption text'
    }
  ];

  // Font weight options
  const fontWeightOptions = [
    { label: 'Light', class: 'font-light' },
    { label: 'Normal', class: 'font-normal' },
    { label: 'Medium', class: 'font-medium' },
    { label: 'Semibold', class: 'font-semibold' },
    { label: 'Bold', class: 'font-bold' },
    { label: 'Extrabold', class: 'font-extrabold' }
  ];

  // Color presets
  const colorPresets = [
    { name: 'White', value: '#FFFFFF' },
    { name: 'Black', value: '#000000' },
    { name: 'Gold', value: '#FDBA74' },
    { name: 'Cream', value: '#FFEDD5' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Yellow', value: '#F59E0B' },
    { name: 'Cyan', value: '#06B6D4' }
  ];

  // Update local state when selectedText changes
  useEffect(() => {
    if (selectedText) {
      setLocalContent(selectedText.content);
      setLocalColor(selectedText.color);
      setLocalStyleClass(selectedText.styleClass);
    }
  }, [selectedText]);

  const handleSave = useCallback(() => {
    if (selectedText) {
      onUpdateText(selectedText.id, {
        content: localContent,
        color: localColor,
        styleClass: localStyleClass
      });
    }
    onClose();
  }, [selectedText, localContent, localColor, localStyleClass, onUpdateText, onClose]);

  const handleColorChange = useCallback((color: string) => {
    setLocalColor(color);
  }, []);

  const handleStyleChange = useCallback((styleClass: string) => {
    setLocalStyleClass(styleClass);
  }, []);

  const handleContentChange = useCallback((content: string) => {
    setLocalContent(content);
  }, []);

  // Apply current weight to existing style
  const getCurrentWeight = () => {
    const weightMatch = localStyleClass.match(/font-(light|normal|medium|semibold|bold|extrabold)/);
    return weightMatch ? weightMatch[1] : 'normal';
  };

  const updateWeight = (weight: string) => {
    const newStyleClass = localStyleClass.replace(/font-(light|normal|medium|semibold|bold|extrabold)/, `font-${weight}`);
    setLocalStyleClass(newStyleClass);
  };

  // Prevent body scroll and viewport movement on mobile when modal is open
  useEffect(() => {
    if (isOpen && selectedText) {
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
  }, [isOpen, selectedText]);

  if (!isOpen || !selectedText) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div 
        className="bg-gray-800/80 border border-cyan-400 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Text Editor</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Content Editor */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Text Content
            </label>
            <textarea
              value={localContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none"
              rows={3}
              placeholder="Enter your text here..."
              style={{ fontSize: '16px' }}
              onFocus={(e) => {
                // Prevent iOS zoom on focus
                e.target.style.fontSize = '16px';
              }}
            />
          </div>

          {/* Typography Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <TypeIcon className="w-4 h-4 mr-2 text-cyan-400" />
              <h4 className="text-md font-semibold text-white">Typography</h4>
            </div>

            {/* Style Presets */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Style Preset
              </label>
              <select
                value={localStyleClass}
                onChange={(e) => handleStyleChange(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                {typographyOptions.map((option) => (
                  <option key={option.class} value={option.class}>
                    {option.label} - {option.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Weight */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Font Weight
              </label>
              <div className="grid grid-cols-3 gap-2">
                {fontWeightOptions.map((weight) => (
                  <button
                    key={weight.class}
                    onClick={() => updateWeight(weight.label.toLowerCase())}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      getCurrentWeight() === weight.label.toLowerCase()
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {weight.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bold and Italic Toggles */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Text Style
              </label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-400">Bold:</label>
                  <button
                    onClick={() => {
                      const isBold = localStyleClass.includes('font-bold') || localStyleClass.includes('font-extrabold') || localStyleClass.includes('font-black');
                      const newStyleClass = isBold 
                        ? localStyleClass.replace(/font-\w+/g, 'font-normal')
                        : localStyleClass.replace(/font-\w+/g, 'font-bold');
                      setLocalStyleClass(newStyleClass);
                    }}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      localStyleClass.includes('font-bold') || 
                      localStyleClass.includes('font-extrabold') || 
                      localStyleClass.includes('font-black')
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    B
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-400">Italic:</label>
                  <button
                    onClick={() => {
                      const isItalic = localStyleClass.includes('italic');
                      const newStyleClass = isItalic 
                        ? localStyleClass.replace(' italic', '').replace('italic', '')
                        : localStyleClass + ' italic';
                      setLocalStyleClass(newStyleClass);
                    }}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      localStyleClass.includes('italic')
                        ? 'bg-cyan-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    I
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Color Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <PaletteIcon className="w-4 h-4 mr-2 text-cyan-400" />
              <h4 className="text-md font-semibold text-white">Colors</h4>
            </div>

            {/* Color Picker */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Color Picker
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={localColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono text-sm"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Quick Colors
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleColorChange(preset.value)}
                      className="w-8 h-8 rounded-lg border-2 border-gray-600 hover:border-cyan-400 transition-colors"
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Preview
            </label>
            <div className="p-4 rounded-lg bg-gray-800 border border-gray-600">
              <div
                className={`${localStyleClass}`}
                style={{ color: localColor }}
              >
                {localContent || 'Preview text...'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
