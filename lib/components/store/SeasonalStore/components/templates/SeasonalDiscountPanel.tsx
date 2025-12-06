'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Button, Heading, Text, Card, Separator } from 'frosted-ui';
import { Clock, Plus, Trash2, Edit, Bold, Italic, Palette } from 'lucide-react';
import type { DiscountSettings } from '../../types';
import { EMOJI_DATABASE } from '../../actions/constants';

interface SeasonalDiscountPanelProps {
  discountSettings: DiscountSettings;
  onSettingsChange: (settings: DiscountSettings) => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onOpenMessageEditor: (type: 'prePromo' | 'activePromo', index: number) => void;
  isPromoActive: boolean;
  timeRemaining: { hours: number; minutes: number } | null;
  timeUntilStart: { hours: number; minutes: number; seconds: number } | null;
  showPanel: boolean;
  onTogglePanel: () => void;
}

export const SeasonalDiscountPanel: React.FC<SeasonalDiscountPanelProps> = ({
  discountSettings,
  onSettingsChange,
  onSave,
  onDelete,
  onOpenMessageEditor,
  isPromoActive,
  timeRemaining,
  timeUntilStart,
  showPanel,
  onTogglePanel,
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

  const hasDiscount = discountSettings.startDate && discountSettings.endDate;

  const addPrePromoMessage = () => {
    if (discountSettings.prePromoMessages.length < 3) {
      onSettingsChange({
        ...discountSettings,
        prePromoMessages: [...discountSettings.prePromoMessages, { 
          message: '', 
          offsetHours: 24,
          sendAsEmail: false,
          emailSubject: undefined,
          emailContent: undefined,
          isEmailHtml: false
        }]
      });
    }
  };

  const removePrePromoMessage = (index: number) => {
    onSettingsChange({
      ...discountSettings,
      prePromoMessages: discountSettings.prePromoMessages.filter((_, i) => i !== index)
    });
  };

  const addActivePromoMessage = () => {
    if (discountSettings.activePromoMessages.length < 3) {
      onSettingsChange({
        ...discountSettings,
        activePromoMessages: [...discountSettings.activePromoMessages, { 
          message: '', 
          offsetHours: 0,
          sendAsEmail: false,
          emailSubject: undefined,
          emailContent: undefined,
          isEmailHtml: false
        }]
      });
    }
  };

  const removeActivePromoMessage = (index: number) => {
    onSettingsChange({
      ...discountSettings,
      activePromoMessages: discountSettings.activePromoMessages.filter((_, i) => i !== index)
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 text-sm font-medium uppercase tracking-wider">
          Seasonal Discount
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
      {discountSettings.startDate && discountSettings.endDate && String(discountSettings.startDate).trim() !== '' && String(discountSettings.endDate).trim() !== '' && (
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
                            document.execCommand('bold', false);
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
                            document.execCommand('italic', false);
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
                                      document.execCommand('foreColor', false, color.value);
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
                                    document.execCommand('foreColor', false, color);
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
                    className="w-full min-h-[42px] max-h-[200px] px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white overflow-y-auto focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
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
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">
                  Promo Code
                </Text>
                <input
                  type="text"
                  value={discountSettings.promoCode || ''}
                  onChange={(e) => onSettingsChange({ ...discountSettings, promoCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  maxLength={20}
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 uppercase"
                />
              </div>
              
              {/* Global Discount Toggle */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={discountSettings.globalDiscount}
                    onChange={(e) => onSettingsChange({ ...discountSettings, globalDiscount: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
                  />
                  <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300">
                    Global Discount
                  </Text>
                </label>
                {discountSettings.globalDiscount && (
                  <div className="flex items-center gap-3 pl-7">
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="globalDiscountType"
                          checked={(discountSettings.globalDiscountType || 'percentage') === 'percentage'}
                          onChange={() => onSettingsChange({ 
                            ...discountSettings, 
                            globalDiscountType: 'percentage',
                            percentage: discountSettings.percentage || 20
                          })}
                          className="w-3 h-3 text-violet-600 focus:ring-violet-500"
                        />
                        <Text size="2" className="text-gray-600 dark:text-gray-400">Percentage</Text>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="globalDiscountType"
                          checked={(discountSettings.globalDiscountType || 'percentage') === 'fixed'}
                          onChange={() => onSettingsChange({ 
                            ...discountSettings, 
                            globalDiscountType: 'fixed',
                            globalDiscountAmount: discountSettings.globalDiscountAmount || 20
                          })}
                          className="w-3 h-3 text-violet-600 focus:ring-violet-500"
                        />
                        <Text size="2" className="text-gray-600 dark:text-gray-400">Fixed</Text>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? 100 : undefined}
                        step={(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? '1' : '0.01'}
                        value={(discountSettings.globalDiscountType || 'percentage') === 'percentage' 
                          ? discountSettings.percentage 
                          : (discountSettings.globalDiscountAmount || 0)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          if ((discountSettings.globalDiscountType || 'percentage') === 'percentage') {
                            onSettingsChange({ ...discountSettings, percentage: value });
                          } else {
                            onSettingsChange({ ...discountSettings, globalDiscountAmount: value });
                          }
                        }}
                        className="w-20 px-4 py-2 pr-8 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 pointer-events-none">
                        {(discountSettings.globalDiscountType || 'percentage') === 'percentage' ? '%' : '$'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
      
              <Separator size="1" color="gray" />

              {/* Discount Duration */}
              <div>
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                  Discount Duration
                </Text>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Text size="2" weight="medium" className="text-gray-600 dark:text-gray-400 mb-2 block">
                      Start
                    </Text>
                    <input
                      type="datetime-local"
                      value={discountSettings.startDate}
                      onChange={(e) => onSettingsChange({ ...discountSettings, startDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <Text size="2" weight="medium" className="text-gray-600 dark:text-gray-400 mb-2 block">
                      End
                    </Text>
                    <input
                      type="datetime-local"
                      value={discountSettings.endDate}
                      onChange={(e) => onSettingsChange({ ...discountSettings, endDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              <Separator size="1" color="gray" />

              {/* Pre-Discount Messages */}
              <div>
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                  Pre-Discount Notifications
                </Text>
                <div className="space-y-2">
                  {discountSettings.prePromoMessages.map((msg, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Button
                        size="3"
                        color="violet"
                        variant="surface"
                        onClick={() => onOpenMessageEditor('prePromo', idx)}
                        className="flex-1 !px-4 !py-2.5 text-left border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Text size="2" weight="semi-bold" className="text-gray-900 dark:text-white">
                              Message {idx + 1} • {msg.offsetHours}h before
                              {msg.sendAsEmail && <span className="ml-2 text-xs text-violet-600 dark:text-violet-400">+ Email</span>}
                            </Text>
                          </div>
                          <Text size="1" className="text-gray-600 dark:text-gray-400 truncate block mt-0.5">
                            {msg.message || 'Not set'}
                          </Text>
                        </div>
                      </Button>
                      <Button
                        size="2"
                        variant="soft"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePrePromoMessage(idx);
                        }}
                        className="!px-3 !py-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {discountSettings.prePromoMessages.length < 3 && (
                    <Button
                      size="3"
                      color="violet"
                      variant="surface"
                      onClick={addPrePromoMessage}
                      className="w-full !px-4 !py-2.5 border border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <Text size="2">Add Message</Text>
                    </Button>
                  )}
                </div>
              </div>

              <Separator size="1" color="gray" />

              {/* Active Discount Messages */}
              <div>
                <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                  Active Discount Notifications
                </Text>
                <div className="space-y-2">
                  {discountSettings.activePromoMessages.map((msg, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Button
                        size="3"
                        color="violet"
                        variant="surface"
                        onClick={() => onOpenMessageEditor('activePromo', idx)}
                        className="flex-1 !px-4 !py-2.5 text-left border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Text size="2" weight="semi-bold" className="text-gray-900 dark:text-white">
                              Message {idx + 1} • {msg.offsetHours}h after
                              {msg.sendAsEmail && <span className="ml-2 text-xs text-violet-600 dark:text-violet-400">+ Email</span>}
                            </Text>
                          </div>
                          <Text size="1" className="text-gray-600 dark:text-gray-400 truncate block mt-0.5">
                            {msg.message || 'Not set'}
                          </Text>
                        </div>
                      </Button>
                      <Button
                        size="2"
                        variant="soft"
                        color="red"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeActivePromoMessage(idx);
                        }}
                        className="!px-3 !py-2 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {discountSettings.activePromoMessages.length < 3 && (
                    <Button
                      size="3"
                      color="violet"
                      variant="surface"
                      onClick={addActivePromoMessage}
                      className="w-full !px-4 !py-2.5 border border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      <Text size="2">Add Message</Text>
                    </Button>
                  )}
                </div>
              </div>

              {/* Save/Create and Delete Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="3"
                  color="violet"
                  variant="solid"
                  onClick={onSave}
                  className="flex-1 !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50"
                >
                  <div className="flex items-center gap-2">
                    {hasDiscount && <Edit className="w-4 h-4" />}
                    {hasDiscount ? 'Save' : 'Create Discount'}
                  </div>
                </Button>
                {showPanel && hasDiscount && (
                  <Button
                    size="3"
                    color="red"
                    variant="solid"
                    onClick={onDelete}
                    className="flex-1 !px-6 !py-3 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 dark:shadow-red-500/30 dark:hover:shadow-red-500/50"
                  >
                    Delete
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




