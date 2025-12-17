'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Button, Heading, Text, Card, Separator } from 'frosted-ui';
import { Clock, Edit, Bold, Italic, Palette, Lock, Star, Loader2 } from 'lucide-react';
import type { DiscountSettings } from '../../types';
import { EMOJI_DATABASE } from '../../actions/constants';

interface SeasonalDiscountPanelProps {
  discountSettings: DiscountSettings;
  onSettingsChange: (settings: DiscountSettings) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  isPromoActive: boolean;
  timeRemaining: { hours: number; minutes: number } | null;
  timeUntilStart: { hours: number; minutes: number; seconds: number } | null;
  isExpired?: boolean; // Whether discount has expired (real-time)
  isEndDateExpired?: boolean; // Whether end date is before current date (for button visibility)
  showPanel: boolean;
  onTogglePanel: () => void;
  subscription?: "Basic" | "Pro" | "Vip" | null;
  hasExistingDiscount?: boolean; // Whether discount already exists in saved template
  isCreating?: boolean; // Whether create/save operation is in progress
  isDeleting?: boolean; // Whether delete operation is in progress
}

export const SeasonalDiscountPanel: React.FC<SeasonalDiscountPanelProps> = ({
  discountSettings,
  onSettingsChange,
  onSave,
  onDelete,
  isPromoActive,
  timeRemaining,
  timeUntilStart,
  isExpired = false,
  isEndDateExpired = false,
  showPanel,
  onTogglePanel,
  subscription,
  hasExistingDiscount = false,
  isCreating = false,
  isDeleting = false,
}) => {
  // Discount text editor state
  const [discountTextEditableRef, setDiscountTextEditableRef] = React.useState<HTMLDivElement | null>(null);
  const [showDiscountTextToolbar, setShowDiscountTextToolbar] = React.useState(false);
  const [showDiscountTextEmojiPicker, setShowDiscountTextEmojiPicker] = React.useState(false);
  const [showDiscountTextColorPicker, setShowDiscountTextColorPicker] = React.useState(false);
  const [selectedDiscountTextColor, setSelectedDiscountTextColor] = React.useState('#000000');
  const discountTextToolbarRef = React.useRef<HTMLDivElement | null>(null);
  const isUpdatingFromStateRef = React.useRef(false);

  // Helper function to get clean content from contentEditable
  const getCleanContent = React.useCallback((element: HTMLDivElement): string => {
    if (!element) return '';
    const textContent = element.textContent || '';
    const hasFormatting = element.querySelector('b, strong, i, em, span[style], u, br') !== null;
    const innerHTML = element.innerHTML || '';
    const hasHtmlTags = /<[^>]+>/.test(innerHTML);
    if (!hasFormatting && !hasHtmlTags) {
      return textContent;
    }
    return innerHTML;
  }, []);

  // Helper function to decode double-encoded HTML entities
  const decodeHtmlEntities = React.useCallback((html: string): string => {
    if (!html) return '';
    const hasHtmlTags = /<[^>]+>/.test(html);
    if (!hasHtmlTags) {
      return html;
    }
    const doubleEncodedPattern = /&amp;(amp|lt|gt|quot|nbsp);/g;
    if (doubleEncodedPattern.test(html)) {
      let decoded = html;
      let previous = '';
      let iterations = 0;
      while (decoded !== previous && iterations < 5) {
        previous = decoded;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = decoded;
        decoded = tempDiv.innerHTML;
        iterations++;
      }
      return decoded;
    }
    return html;
  }, []);

  // Sync contentEditable with discountText
  React.useEffect(() => {
    if (discountTextEditableRef && !isUpdatingFromStateRef.current) {
      isUpdatingFromStateRef.current = true;
      if (discountSettings.discountText) {
        const isHtml = discountSettings.discountText.includes('<') && discountSettings.discountText.includes('>');
        if (isHtml) {
          const decoded = decodeHtmlEntities(discountSettings.discountText);
          if (discountTextEditableRef.innerHTML !== decoded) {
            discountTextEditableRef.innerHTML = decoded;
          }
        } else {
          if (discountTextEditableRef.textContent !== discountSettings.discountText) {
            discountTextEditableRef.textContent = discountSettings.discountText;
          }
        }
      } else {
        if (discountTextEditableRef.innerHTML !== '' || discountTextEditableRef.textContent !== '') {
          discountTextEditableRef.textContent = '';
        }
      }
      setTimeout(() => {
        isUpdatingFromStateRef.current = false;
      }, 0);
    }
  }, [discountTextEditableRef, discountSettings.discountText, decodeHtmlEntities]);

  // Only consider discount as "existing" if it was already saved to the template
  // Setting dates in local state doesn't mean the discount is created yet
  const hasDiscount = hasExistingDiscount;
  const isPremium = subscription === "Pro" || subscription === "Vip";
  
  // isExpired is now passed as prop (calculated in real-time by TemplateManagerModal)
  // When discount exists, only discountText is editable
  const isReadOnly = hasExistingDiscount;

  // Validation function for Create Discount button
  const canCreateDiscount = React.useMemo(() => {
    if (hasDiscount) return true; // Can always save existing discount
    const hasStartDate = discountSettings.startDate && discountSettings.startDate.trim() !== '';
    const hasEndDate = discountSettings.endDate && discountSettings.endDate.trim() !== '';
    const discountTextContent = discountTextEditableRef?.textContent || discountSettings.discountText || '';
    const hasDiscountText = discountTextContent.trim() !== '';
    const hasPromoCode = discountSettings.promoCode && discountSettings.promoCode.trim() !== '';
    
    // Base validation: all required fields must be present
    const baseValidation = hasStartDate && hasEndDate && hasDiscountText && hasPromoCode;
    
    // If global discount is enabled, also require quantityPerProduct and durationType
    if (discountSettings.globalDiscount) {
      const hasQuantityPerProduct = discountSettings.quantityPerProduct !== undefined && discountSettings.quantityPerProduct !== null;
      const hasDurationType = discountSettings.durationType !== undefined && discountSettings.durationType !== null;
      return baseValidation && hasQuantityPerProduct && hasDurationType;
    }
    
    return baseValidation;
  }, [hasDiscount, discountSettings.startDate, discountSettings.endDate, discountSettings.discountText, discountSettings.promoCode, discountSettings.globalDiscount, discountSettings.quantityPerProduct, discountSettings.durationType, discountTextEditableRef]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
          Seasonal Discount
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        </Heading>
        <div className="flex items-center gap-2">
          <Button
            size="2"
            variant="soft"
            color="gray"
            onClick={onTogglePanel}
            className="!px-4 !py-2 text-xs"
          >
            {showPanel ? 'Hide' : 'Show'}
          </Button>
        </div>
      </div>
      
      {/* Countdown Timer */}
      {hasExistingDiscount && discountSettings.startDate && discountSettings.endDate && String(discountSettings.startDate).trim() !== '' && String(discountSettings.endDate).trim() !== '' && (
        <div className="flex justify-center mb-5">
          {isPromoActive && timeRemaining ? (
            <Button size="2" variant="soft" color="red" className="!px-3 !py-1.5 !h-auto">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <Text size="2" weight="medium">
                  Ends in {timeRemaining.hours}h {timeRemaining.minutes}m
                </Text>
              </div>
            </Button>
          ) : timeUntilStart ? (
            <Button size="2" variant="soft" color="blue" className="!px-3 !py-1.5 !h-auto">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <Text size="2">
                  Starts in {timeUntilStart.hours}h {timeUntilStart.minutes}m {timeUntilStart.seconds}s
                </Text>
              </div>
            </Button>
          ) : isExpired ? (
            <Button size="2" variant="soft" color="red" className="!px-3 !py-1.5 !h-auto">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <Text size="2" weight="medium">Discount Expired</Text>
              </div>
            </Button>
          ) : (
            <Button size="2" variant="soft" color="gray" className="!px-3 !py-1.5 !h-auto">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <Text size="2">Discount scheduled</Text>
              </div>
            </Button>
          )}
        </div>
      )}
      
      {showPanel && (
        <Card className="p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
          <div className="fui-reset">
            <div className="space-y-5 min-w-0">
              {/* Discount Text */}
              <div className="relative">
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">
                  Discount Text
                </Text>
                <div className="relative">
                  {/* Formatting Toolbar */}
                  {showDiscountTextToolbar && discountTextEditableRef && typeof window !== 'undefined' && createPortal(
                    <div 
                      ref={discountTextToolbarRef}
                      className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-2"
                      style={{ 
                        pointerEvents: 'auto',
                        zIndex: 999999,
                        bottom: `${window.innerHeight - discountTextEditableRef.getBoundingClientRect().top + 8}px`,
                        right: `${window.innerWidth - discountTextEditableRef.getBoundingClientRect().right}px`,
                      }}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (discountTextEditableRef) {
                            discountTextEditableRef.focus();
                            // Select all text to apply formatting to entire content
                            const range = document.createRange();
                            range.selectNodeContents(discountTextEditableRef);
                            const selection = window.getSelection();
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                            document.execCommand('bold', false);
                            // Clear selection
                            selection?.removeAllRanges();
                            const cleanContent = getCleanContent(discountTextEditableRef);
                            onSettingsChange({ ...discountSettings, discountText: cleanContent });
                          }
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Bold"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (discountTextEditableRef) {
                            discountTextEditableRef.focus();
                            // Select all text to apply formatting to entire content
                            const range = document.createRange();
                            range.selectNodeContents(discountTextEditableRef);
                            const selection = window.getSelection();
                            selection?.removeAllRanges();
                            selection?.addRange(range);
                            document.execCommand('italic', false);
                            // Clear selection
                            selection?.removeAllRanges();
                            const cleanContent = getCleanContent(discountTextEditableRef);
                            onSettingsChange({ ...discountSettings, discountText: cleanContent });
                          }
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Italic"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (discountTextEditableRef) discountTextEditableRef.focus();
                            setShowDiscountTextColorPicker(!showDiscountTextColorPicker);
                            setShowDiscountTextEmojiPicker(false);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Text Color"
                        >
                          <Palette className="w-4 h-4" />
                        </button>
                        {/* Color Picker Dropdown */}
                        {showDiscountTextColorPicker && typeof window !== 'undefined' && discountTextEditableRef && createPortal(
                          <div 
                            className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2"
                            style={{ 
                              pointerEvents: 'auto',
                              zIndex: 999999,
                              bottom: `${window.innerHeight - discountTextEditableRef.getBoundingClientRect().top + 60}px`,
                              right: `${window.innerWidth - discountTextEditableRef.getBoundingClientRect().right}px`,
                            }}
                          >
                            <div className="grid grid-cols-6 gap-1 mb-2">
                              {[
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
                              ].map((color) => (
                                <button
                                  key={color.value}
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (discountTextEditableRef) {
                                      discountTextEditableRef.focus();
                                      // Select all text to apply formatting to entire content
                                      const range = document.createRange();
                                      range.selectNodeContents(discountTextEditableRef);
                                      const selection = window.getSelection();
                                      selection?.removeAllRanges();
                                      selection?.addRange(range);
                                      document.execCommand('foreColor', false, color.value);
                                      // Clear selection
                                      selection?.removeAllRanges();
                                      setSelectedDiscountTextColor(color.value);
                                      const cleanContent = getCleanContent(discountTextEditableRef);
                                      onSettingsChange({ ...discountSettings, discountText: cleanContent });
                                      setShowDiscountTextColorPicker(false);
                                    }
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
                                value={selectedDiscountTextColor}
                                onChange={(e) => {
                                  const color = e.target.value;
                                  setSelectedDiscountTextColor(color);
                                  if (discountTextEditableRef) {
                                    discountTextEditableRef.focus();
                                    // Select all text to apply formatting to entire content
                                    const range = document.createRange();
                                    range.selectNodeContents(discountTextEditableRef);
                                    const selection = window.getSelection();
                                    selection?.removeAllRanges();
                                    selection?.addRange(range);
                                    document.execCommand('foreColor', false, color);
                                    // Clear selection
                                    selection?.removeAllRanges();
                                    const cleanContent = getCleanContent(discountTextEditableRef);
                                    onSettingsChange({ ...discountSettings, discountText: cleanContent });
                                  }
                                }}
                                className="w-full h-8 cursor-pointer border border-gray-300 dark:border-gray-600 rounded"
                                title="Custom Color"
                              />
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (discountTextEditableRef) discountTextEditableRef.focus();
                            setShowDiscountTextEmojiPicker(!showDiscountTextEmojiPicker);
                            setShowDiscountTextColorPicker(false);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-lg"
                          title="Emoji"
                        >
                          😀
                        </button>
                        {/* Emoji Picker */}
                        {showDiscountTextEmojiPicker && typeof window !== 'undefined' && discountTextEditableRef && createPortal(
                          <div 
                            className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 max-h-64 overflow-y-auto"
                            style={{ 
                              pointerEvents: 'auto',
                              zIndex: 999999,
                              bottom: `${window.innerHeight - discountTextEditableRef.getBoundingClientRect().top + 60}px`,
                              right: `${window.innerWidth - discountTextEditableRef.getBoundingClientRect().right}px`,
                            }}
                          >
                            {EMOJI_DATABASE.map((item) => (
                              <button
                                key={item.emoji}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (discountTextEditableRef) {
                                    discountTextEditableRef.focus();
                                    const selection = window.getSelection();
                                    let range: Range;
                                    if (selection && selection.rangeCount > 0) {
                                      range = selection.getRangeAt(0);
                                    } else {
                                      range = document.createRange();
                                      if (discountTextEditableRef.childNodes.length > 0) {
                                        range.selectNodeContents(discountTextEditableRef);
                                        range.collapse(false);
                                      } else {
                                        range.setStart(discountTextEditableRef, 0);
                                        range.setEnd(discountTextEditableRef, 0);
                                      }
                                    }
                                    range.deleteContents();
                                    range.insertNode(document.createTextNode(item.emoji));
                                    range.collapse(false);
                                    selection?.removeAllRanges();
                                    selection?.addRange(range);
                                    const cleanContent = getCleanContent(discountTextEditableRef);
                                    onSettingsChange({ ...discountSettings, discountText: cleanContent });
                                    setShowDiscountTextEmojiPicker(false);
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
                    </div>,
                    document.body
                  )}
                  <div
                    ref={setDiscountTextEditableRef}
                    contentEditable
                    onInput={() => {
                      if (discountTextEditableRef && !isUpdatingFromStateRef.current) {
                        const currentContent = getCleanContent(discountTextEditableRef);
                        onSettingsChange({ ...discountSettings, discountText: currentContent });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        document.execCommand('insertHTML', false, '<br>');
                      }
                    }}
                    onClick={() => setShowDiscountTextToolbar(true)}
                    onSelect={() => setShowDiscountTextToolbar(true)}
                    onBlur={(e) => {
                      const relatedTarget = e.relatedTarget as Node;
                      const toolbarElement = discountTextToolbarRef.current;
                      const isClickInsideToolbar = toolbarElement && (
                        toolbarElement.contains(relatedTarget) ||
                        (relatedTarget && toolbarElement.contains(relatedTarget))
                      );
                      if (!isClickInsideToolbar) {
                        setTimeout(() => {
                          const activeElement = document.activeElement;
                          const isStillInToolbar = toolbarElement && (
                            toolbarElement.contains(activeElement) ||
                            activeElement === toolbarElement
                          );
                          if (!isStillInToolbar && document.activeElement !== discountTextEditableRef) {
                            setShowDiscountTextToolbar(false);
                            setShowDiscountTextEmojiPicker(false);
                            setShowDiscountTextColorPicker(false);
                          }
                        }, 200);
                      }
                    }}
                    data-placeholder="e.g., 20% OFF - Limited Time!"
                    className="w-full min-h-[42px] max-h-[200px] px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 overflow-y-auto"
                    style={{ outline: 'none' }}
                  />
                  {!discountSettings.discountText && (
                    <div 
                      className="absolute top-2.5 left-4 text-sm text-gray-400 dark:text-gray-500 pointer-events-none"
                      style={{ fontSize: '14px' }}
                    >
                      e.g., 20% OFF - Limited Time!
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Code */}
              <div>
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                  Promo Code
                </Text>
                <input
                  type="text"
                  value={discountSettings.promoCode || ''}
                  onChange={(e) => onSettingsChange({ ...discountSettings, promoCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  maxLength={20}
                  disabled={isReadOnly}
                  readOnly={isReadOnly}
                  className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 uppercase ${
                    isReadOnly ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Global Discount Toggle */}
              <div className="space-y-5">
                <label className={`flex items-center gap-3 ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={discountSettings.globalDiscount}
                    onChange={(e) => {
                      if (!isReadOnly) {
                        onSettingsChange({ ...discountSettings, globalDiscount: e.target.checked });
                      }
                    }}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
                  />
                  <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300">
                    Global Discount
                  </Text>
                </label>
                {discountSettings.globalDiscount && (
                  <div className="space-y-5 pl-7">
                    {/* Discount Type */}
                    <div>
                      <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                        Discount Type
                      </Text>
                      <div className="flex gap-3">
                        <Button
                          size="3"
                          variant={(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? 'solid' : 'soft'}
                          color="violet"
                          onClick={() => {
                            if (!isReadOnly) {
                              onSettingsChange({ 
                            ...discountSettings, 
                            globalDiscountType: 'percentage',
                            percentage: discountSettings.percentage || 20
                              });
                            }
                          }}
                          disabled={isReadOnly}
                          className={`!px-6 !py-3 ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          Percentage
                        </Button>
                        <Button
                          size="3"
                          variant={(discountSettings.globalDiscountType || 'percentage') === 'fixed' ? 'solid' : 'soft'}
                          color="violet"
                          onClick={() => {
                            if (!isReadOnly) {
                              onSettingsChange({ 
                            ...discountSettings, 
                            globalDiscountType: 'fixed',
                            globalDiscountAmount: discountSettings.globalDiscountAmount || 20
                              });
                            }
                          }}
                          disabled={isReadOnly}
                          className={`!px-6 !py-3 ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          Fixed Price
                        </Button>
                      </div>
                    </div>
                    {/* Discount Amount */}
                    <div>
                      <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                        {(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
                      </Text>
                      <input
                        type="number"
                        min="0"
                        max={(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? 100 : undefined}
                        step={(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? 1 : 0.01}
                        value={(discountSettings.globalDiscountType || 'percentage') === 'percentage' 
                          ? (discountSettings.percentage ?? '') 
                          : (discountSettings.globalDiscountAmount ?? '')}
                        onChange={(e) => {
                          if (!isReadOnly) {
                            const numValue = parseFloat(e.target.value);
                            const value = Number.isNaN(numValue) ? 0 : numValue;
                          if ((discountSettings.globalDiscountType || 'percentage') === 'percentage') {
                            onSettingsChange({ ...discountSettings, percentage: value });
                          } else {
                            onSettingsChange({ ...discountSettings, globalDiscountAmount: value });
                          }
                          }
                        }}
                        disabled={isReadOnly}
                        readOnly={isReadOnly}
                        placeholder={(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? 'Enter percentage (e.g., 20)' : 'Enter amount (e.g., 10.00)'}
                        className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
                          isReadOnly ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>

                    {/* Discount Duration Type */}
                    <div className="min-w-0">
                      <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                        Discount Duration Type
                      </Text>
                      <div className="flex gap-3 flex-wrap">
                        <Button
                          size="3"
                          variant={discountSettings.durationType === 'one-time' ? 'solid' : 'soft'}
                          color="violet"
                          onClick={() => !isReadOnly && onSettingsChange({ ...discountSettings, durationType: 'one-time' })}
                          disabled={isReadOnly}
                          className={`!px-6 !py-3 flex-shrink-0 ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          One-Time
                        </Button>
                        <Button
                          size="3"
                          variant={discountSettings.durationType === 'forever' ? 'solid' : 'soft'}
                          color="violet"
                          onClick={() => !isReadOnly && onSettingsChange({ ...discountSettings, durationType: 'forever' })}
                          disabled={isReadOnly}
                          className={`!px-6 !py-3 flex-shrink-0 ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          Forever
                        </Button>
                        <Button
                          size="3"
                          variant={discountSettings.durationType === 'duration_months' ? 'solid' : 'soft'}
                          color="violet"
                          onClick={() => !isReadOnly && onSettingsChange({ ...discountSettings, durationType: 'duration_months' })}
                          disabled={isReadOnly}
                          className={`!px-6 !py-3 flex-shrink-0 ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          Duration
                        </Button>
                      </div>
                    </div>

                    {/* Duration Months (only shown when durationType is 'duration_months') */}
                    {discountSettings.durationType === 'duration_months' && (
                      <div>
                        <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                          Duration (Months)
                        </Text>
                        <input
                          type="number"
                          min="1"
                          value={discountSettings.durationMonths ?? ''}
                          onChange={(e) => {
                            if (!isReadOnly) {
                              const value = parseInt(e.target.value, 10);
                              onSettingsChange({ 
                                ...discountSettings, 
                                durationMonths: Number.isNaN(value) || value <= 0 ? undefined : value 
                              });
                            }
                          }}
                          disabled={isReadOnly}
                          readOnly={isReadOnly}
                          placeholder="Enter number of months (e.g., 3)"
                          className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
                            isReadOnly ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    )}

                    {/* Quantity Per Product */}
                    <div>
                      <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                        Promo Codes Quantity by Product
                      </Text>
                      <div className="space-y-3">
                        <label className={`flex items-center gap-3 ${isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            checked={discountSettings.quantityPerProduct === -1}
                            onChange={(e) => {
                              if (!isReadOnly) {
                                onSettingsChange({ 
                                  ...discountSettings, 
                                  quantityPerProduct: e.target.checked ? -1 : undefined 
                                });
                              }
                            }}
                            disabled={isReadOnly}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
                          />
                          <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300">
                            Unlimited
                          </Text>
                        </label>
                        {discountSettings.quantityPerProduct !== -1 && (
                          <input
                            type="number"
                            min="0"
                            value={discountSettings.quantityPerProduct ?? ''}
                            onChange={(e) => {
                              if (!isReadOnly) {
                                const value = parseInt(e.target.value, 10);
                                onSettingsChange({ 
                                  ...discountSettings, 
                                  quantityPerProduct: Number.isNaN(value) || value < 0 ? undefined : value 
                                });
                              }
                            }}
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            placeholder="Enter quantity (e.g., 50)"
                            className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
                              isReadOnly ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
      
              <Separator size="1" color="gray" />

              {/* Discount Timeframe */}
              <div>
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                  Discount Timeframe
                </Text>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Text size="2" weight="medium" className="text-gray-600 dark:text-gray-400 mb-2 block">
                      Start
                    </Text>
                    <input
                      type="datetime-local"
                      value={discountSettings.startDate}
                      max={discountSettings.endDate || ''}
                      onChange={(e) => {
                        if (!isReadOnly) {
                          const newStartDate = e.target.value;
                          let newEndDate = discountSettings.endDate;
                          // If start date is after end date, adjust end date to be 1 hour after start
                          if (newStartDate && newEndDate && newStartDate > newEndDate) {
                            const startDateObj = new Date(newStartDate);
                            startDateObj.setHours(startDateObj.getHours() + 1);
                            newEndDate = startDateObj.toISOString().slice(0, 16);
                          }
                          onSettingsChange({ ...discountSettings, startDate: newStartDate, endDate: newEndDate });
                        }
                      }}
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
                        isReadOnly ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                  <div>
                    <Text size="2" weight="medium" className="text-gray-600 dark:text-gray-400 mb-2 block">
                      End
                    </Text>
                    <input
                      type="datetime-local"
                      value={discountSettings.endDate}
                      min={discountSettings.startDate || ''}
                      onChange={(e) => {
                        if (!isReadOnly) {
                          const newEndDate = e.target.value;
                          let newStartDate = discountSettings.startDate;
                          // If end date is before start date, adjust start date to be 1 hour before end
                          if (newEndDate && newStartDate && newEndDate < newStartDate) {
                            const endDateObj = new Date(newEndDate);
                            endDateObj.setHours(endDateObj.getHours() - 1);
                            newStartDate = endDateObj.toISOString().slice(0, 16);
                          }
                          onSettingsChange({ ...discountSettings, endDate: newEndDate, startDate: newStartDate });
                        }
                      }}
                      disabled={isReadOnly}
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all duration-200 shadow-sm hover:shadow-md hover:border-gray-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-300 dark:focus:border-violet-400 dark:focus:ring-violet-500/50 dark:hover:border-gray-500 ${
                        isReadOnly ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Save/Create and Delete Buttons */}
              <div className="flex items-center gap-2">
                {/* Create Discount button - visible even when expired (but locked when end date is expired) */}
                <Button
                  size="3"
                  color="violet"
                  variant="solid"
                  onClick={onSave}
                  disabled={!isPremium || !canCreateDiscount || isCreating || isDeleting || isEndDateExpired}
                  className={`flex-1 !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 ${
                    (!isPremium || !canCreateDiscount || isCreating || isDeleting || isEndDateExpired) ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {hasDiscount ? 'Saving...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                    {!isPremium && <Lock className="w-4 h-4" />}
                    {hasDiscount && isPremium && <Edit className="w-4 h-4" />}
                    {!isPremium ? (
                      <>
                        Locked
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      </>
                    ) : (
                      hasDiscount ? 'Save' : 'Create Discount'
                        )}
                      </>
                    )}
                  </div>
                </Button>
                {/* Delete button - visible when discount exists in database (even if expired), hidden when creating */}
                {showPanel && hasDiscount && (
                  <Button
                    size="3"
                    color="red"
                    variant="solid"
                    onClick={onDelete}
                    disabled={isCreating || isDeleting}
                    className={`flex-1 !px-6 !py-3 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 dark:shadow-red-500/30 dark:hover:shadow-red-500/50 ${
                      (isCreating || isDeleting) ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete'
                      )}
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};




