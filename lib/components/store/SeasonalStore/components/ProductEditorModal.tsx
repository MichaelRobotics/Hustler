'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ButtonColorControls } from './ButtonColorControls';
import EmojiBank from '../EmojiBank';

interface Product {
  id: number | string;
  name: string;
  description: string;
  price: number;
  image: string;
  containerAsset?: {
    src: string;
    alt: string;
    id: string;
    scale: number;
    rotation: number;
  };
  cardClass?: string;
  buttonText?: string;
  buttonClass?: string;
  buttonAnimColor?: string;
  titleClass?: string;
  descClass?: string;
  buttonLink?: string;
  // WHOP attachment support for product images
  imageAttachmentId?: string | null;
  imageAttachmentUrl?: string | null;
  // Badge support
  badge?: 'new' | '5star' | 'bestseller' | null;
}

interface ProductEditorModalProps {
  isOpen: boolean;
  productEditor: {
    isOpen: boolean;
    productId: number | string | null;
    target: string;
  };
  products: Product[];
  promoButton: {
    text: string;
    icon: string;
    buttonClass: string;
    ringClass: string;
    ringHoverClass: string;
  };
  legacyTheme: {
    accent: string;
    card: string;
    text: string;
  };
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  inlineEditTarget?: 'productName' | 'productDesc' | null;
  inlineProductId?: number | null;
  
  // Handlers
  onClose: () => void;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
  setPromoButton: (fn: (prev: any) => any) => void;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  isOpen,
  productEditor,
  products,
  promoButton,
  legacyTheme,
  backgroundAnalysis,
  inlineEditTarget,
  inlineProductId,
  onClose,
  updateProduct,
  setPromoButton,
}) => {
  // Refs for inline editing focus
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Local state for transparency slider
  const [transparencyValue, setTransparencyValue] = useState(90);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  
  // Memoize current product to avoid repeated finds
  const currentProduct = useMemo(() => 
    productEditor.productId !== null 
      ? products.find(p => p.id === productEditor.productId)
      : null,
    [products, productEditor.productId]
  );
  
  // Local state for inputs to prevent lag
  const [localName, setLocalName] = useState(currentProduct?.name || '');
  const [localDescription, setLocalDescription] = useState(currentProduct?.description || '');
  
  // Track initial values when modal opens to detect changes
  const initialNameRef = useRef<string>('');
  const initialDescRef = useRef<string>('');
  
  // Sync local state when modal opens or product changes
  useEffect(() => {
    if (isOpen && currentProduct) {
      const name = currentProduct.name || '';
      const desc = currentProduct.description || '';
      setLocalName(name);
      setLocalDescription(desc);
      // Store initial values for comparison
      initialNameRef.current = name;
      initialDescRef.current = desc;
    }
  }, [isOpen, currentProduct?.id]);
  
  // Simple local state updates - no immediate product updates
  const updateName = useCallback((value: string) => {
    setLocalName(value);
  }, []);
  
  const updateDescription = useCallback((value: string) => {
    setLocalDescription(value);
  }, []);
  
  // Save changes when modal closes
  useEffect(() => {
    if (!isOpen && productEditor.productId !== null) {
      // Check if there are any changes to save (compare with initial values)
      const hasNameChange = localName !== initialNameRef.current;
      const hasDescChange = localDescription !== initialDescRef.current;
      
      if (hasNameChange || hasDescChange) {
        const updates: Partial<Product> = {};
        if (hasNameChange) updates.name = localName;
        if (hasDescChange) updates.description = localDescription;
        
        // Batch update all changes at once
        updateProduct(productEditor.productId, updates);
      }
    }
  }, [isOpen, productEditor.productId, localName, localDescription, updateProduct]);
  
  // Update transparency value when product changes
  useEffect(() => {
    if (productEditor.productId !== null && !isUserInteracting && currentProduct) {
      const current = currentProduct.cardClass || legacyTheme.card;
      console.log('🎨 Updating transparency from product:', current);
      
      // Enhanced regex patterns to catch more transparency formats
      const patterns = [
        // Standard Tailwind format: bg-white/90, bg-gray-900/95
        /bg-[^\s/]+(?:\[[^\]]+\])?\/(\d{1,3})/,
        // Alternative format: bg-white/90 backdrop-blur
        /bg-[^\s]+(?:\[[^\]]+\])?\/(\d{1,3})/,
        // Fallback: any /XX pattern
        /\/(\d{1,3})/
      ];
      
      let transparencyFound = false;
      for (const pattern of patterns) {
        const match = current.match(pattern);
        if (match && match[1]) {
          const val = parseInt(match[1], 10);
          // Ensure the value is within valid range and round to nearest 5%
          const roundedVal = Math.round(val / 5) * 5;
          const clampedVal = Math.max(0, Math.min(100, roundedVal));
          console.log('🎨 Found transparency:', val, 'rounded to:', clampedVal);
          setTransparencyValue(clampedVal);
          transparencyFound = true;
          break;
        }
      }
      
      if (!transparencyFound) {
        console.log('🎨 No transparency found, defaulting to 90');
        setTransparencyValue(90);
      }
    }
  }, [productEditor.productId, currentProduct, legacyTheme.card, isUserInteracting]);

  // Watch for changes in the specific product's cardClass
  const currentCardClass = currentProduct?.cardClass || legacyTheme.card;
  
  useEffect(() => {
    if (productEditor.productId !== null && currentCardClass && !isUserInteracting) {
      console.log('🎨 Product cardClass changed:', currentCardClass);
      // Improved regex to match transparency values more reliably
      const transparencyMatch = currentCardClass.match(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/(\d{1,3}))?/);
      console.log('🎨 Transparency match result:', transparencyMatch);
      if (transparencyMatch && transparencyMatch[1]) {
        const val = parseInt(transparencyMatch[1], 10);
        console.log('🎨 Updating transparency from cardClass change:', val);
        setTransparencyValue(val);
      } else {
        // Try alternative regex patterns
        const altMatch1 = currentCardClass.match(/bg-[^\s]+(?:\[[^\]]+\])?\/(\d{1,3})/);
        const altMatch2 = currentCardClass.match(/\/(\d{1,3})/);
        console.log('🎨 Alternative matches:', { altMatch1, altMatch2 });
        
        if (altMatch1 && altMatch1[1]) {
          const val = parseInt(altMatch1[1], 10);
          console.log('🎨 Using alt match 1:', val);
          setTransparencyValue(val);
        } else if (altMatch2 && altMatch2[1]) {
          const val = parseInt(altMatch2[1], 10);
          console.log('🎨 Using alt match 2:', val);
          setTransparencyValue(val);
        } else {
          console.log('🎨 No transparency found in cardClass, keeping current value');
        }
      }
    }
  }, [currentCardClass, productEditor.productId, isUserInteracting]);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit Product"
      className={`fixed inset-y-0 right-0 w-full md:w-80 bg-gray-900 text-white shadow-2xl transform transition-transform duration-500 z-[60] p-0 border-l border-gray-700/50 overflow-hidden flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      onClick={(e) => {
        // Close on background click (when clicking on the modal itself, not its children)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900">
        <h3 className={`text-sm font-semibold tracking-wide flex items-center ${backgroundAnalysis.recommendedTextColor === 'white' ? 'text-white' : 'text-black'}`}>
          {productEditor.target === 'button' ? (
            productEditor.productId === null ? (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v14l11-7z" />
                </svg>
                Edit Claim Button
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                Edit Button
              </>
            )
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Product
            </>
          )}
        </h3>
        <button 
          onClick={onClose} 
          className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" 
          aria-label="Close"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {productEditor.productId !== null && (
          <div className="space-y-4">
            {productEditor.target !== 'button' && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={localName}
                    onChange={(e) => updateName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder-black"
                    style={{ fontSize: '16px' }}
                    onFocus={(e) => {
                      // Prevent iOS zoom on focus
                      e.target.style.fontSize = '16px';
                    }}
                  />
                </div>
                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                  <textarea
                    ref={descInputRef}
                    value={localDescription}
                    onChange={(e) => updateDescription(e.target.value)}
                    placeholder="Enter description"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 h-24 placeholder-black"
                    style={{ fontSize: '16px' }}
                    onFocus={(e) => {
                      // Prevent iOS zoom on focus
                      e.target.style.fontSize = '16px';
                    }}
                  />
                </div>
                
                {/* Badge Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Badge</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateProduct(productEditor.productId!, { badge: null })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        !products.find(p => p.id === productEditor.productId)?.badge
                          ? 'bg-gray-700 text-white ring-2 ring-indigo-400'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => updateProduct(productEditor.productId!, { badge: 'new' })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        products.find(p => p.id === productEditor.productId)?.badge === 'new'
                          ? 'bg-green-600 text-white ring-2 ring-green-400'
                          : 'bg-green-800/50 text-green-300 hover:bg-green-800/70'
                      }`}
                    >
                      New
                    </button>
                    <button
                      onClick={() => updateProduct(productEditor.productId!, { badge: '5star' })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        products.find(p => p.id === productEditor.productId)?.badge === '5star'
                          ? 'bg-yellow-500 text-gray-900 ring-2 ring-yellow-400'
                          : 'bg-yellow-800/50 text-yellow-300 hover:bg-yellow-800/70'
                      }`}
                    >
                      5 ⭐
                    </button>
                    <button
                      onClick={() => updateProduct(productEditor.productId!, { badge: 'bestseller' })}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        products.find(p => p.id === productEditor.productId)?.badge === 'bestseller'
                          ? 'bg-orange-600 text-white ring-2 ring-orange-400'
                          : 'bg-orange-800/50 text-orange-300 hover:bg-orange-800/70'
                      }`}
                    >
                      BestSeller
                    </button>
                  </div>
                </div>
              </>
            )}
            
            {/* Button-only section (distinct modal experience) */}
            {productEditor.target === 'button' && (
              <>
                {/* Button Text (per-product) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Button Text (This card only)</label>
                  <input
                    type="text"
                    value={products.find(p => p.id === productEditor.productId)?.buttonText || ''}
                    onChange={(e) => updateProduct(productEditor.productId!, { buttonText: e.target.value })}
                    placeholder="Enter button text"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder-black"
                  />
                </div>
                
              </>
            )}
            
            {/* Button Style for individual products */}
            {productEditor.target === 'button' && productEditor.productId !== null && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Button Style</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[legacyTheme.accent,
                    'bg-indigo-600 hover:bg-indigo-700 text-white',
                    'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
                    'bg-cyan-600 hover:bg-cyan-700 text-gray-900',
                    'bg-emerald-600 hover:bg-emerald-700 text-white',
                    'bg-rose-600 hover:bg-rose-700 text-white',
                    'bg-amber-500 hover:bg-amber-600 text-gray-900',
                    'bg-purple-600 hover:bg-purple-700 text-white',
                    'bg-slate-800 hover:bg-slate-700 text-white',
                    'bg-orange-600 hover:bg-orange-700 text-white'
                  ].map((cls, idx) => {
                    const isSelected = currentProduct?.buttonClass === cls;
                    return (
                      <button
                        key={`${cls}-${idx}`}
                        onClick={() => updateProduct(productEditor.productId!, { buttonClass: cls })}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 transition-all duration-200 ${
                          isSelected 
                            ? 'ring-white ring-offset-2 ring-offset-gray-900 scale-105 shadow-lg' 
                            : 'ring-1 ring-gray-700 hover:ring-gray-500'
                        } ${cls}`}
                      >
                        {idx === 0 ? 'Theme Accent' : 'Preset'}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      const current = products.find(p => p.id === productEditor.productId!)?.buttonClass || legacyTheme.accent;
                      products.forEach(p => {
                        updateProduct(p.id, { buttonClass: current });
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-xs"
                  >
                    Apply to All Buttons
                  </button>
                </div>
              </div>
            )}
            
            {/* Card Style Presets (apply per-card or all) */}
            {productEditor.target !== 'button' && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Card Style</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    // Light glassy white
                    { card: 'bg-white/95 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-indigo-500/30', title: 'text-gray-900', desc: 'text-gray-700' },
                    // Cyber dark
                    { card: 'bg-gray-900/90 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-cyan-400/50 border border-cyan-400', title: 'text-white', desc: 'text-cyan-200' },
                    // Autumn amber
                    { card: 'bg-amber-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-orange-500/30', title: 'text-amber-900', desc: 'text-amber-700' },
                    // Spring green
                    { card: 'bg-green-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-pink-400/30', title: 'text-green-900', desc: 'text-green-700' },
                    // Lavender
                    { card: 'bg-purple-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-purple-500/30', title: 'text-purple-900', desc: 'text-purple-700' },
                    // Sky
                    { card: 'bg-blue-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-blue-500/30', title: 'text-blue-900', desc: 'text-blue-700' },
                    // Rose
                    { card: 'bg-rose-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-rose-500/30', title: 'text-rose-900', desc: 'text-rose-700' },
                    // Emerald glass
                    { card: 'bg-emerald-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-emerald-500/30', title: 'text-emerald-900', desc: 'text-emerald-700' },
                    // Slate neutral
                    { card: 'bg-slate-100/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-slate-400/30', title: 'text-slate-900', desc: 'text-slate-700' },
                    // Night purple border
                    { card: 'bg-[#0f0b1f]/90 backdrop-blur-md shadow-2xl hover:shadow-3xl shadow-purple-400/40 border border-purple-400/40', title: 'text-purple-100', desc: 'text-purple-300' }
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => updateProduct(productEditor.productId!, { cardClass: preset.card, titleClass: preset.title, descClass: preset.desc })}
                      className={`p-3 rounded-xl text-left ${preset.card}`}
                    >
                      <div className={`text-sm font-bold ${preset.title}`}>Product Title</div>
                      <div className={`text-xs ${preset.desc}`}>Short description goes here...</div>
                    </button>
                  ))}
                </div>
                {/* Card Transparency */}
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Card Transparency</label>
                  
                  {/* Slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-8">0%</span>
                    <input
                      key={`transparency-${productEditor.productId}`}
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={transparencyValue}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        // Ensure the value is properly rounded to 5% increments
                        const roundedVal = Math.round(val / 5) * 5;
                        const clampedVal = Math.max(0, Math.min(100, roundedVal));
                        
                        console.log('🎨 Transparency slider change:', { 
                          raw: val, 
                          rounded: roundedVal, 
                          clamped: clampedVal 
                        });
                        
                        setIsUserInteracting(true);
                        setTransparencyValue(clampedVal);
                        
                        const current = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                        console.log('🎨 Current card class:', current);
                        
                        // Extract the base background class without transparency
                        const baseMatch = current.match(/bg-[^\s/]+(?:\[[^\]]+\])?/);
                        if (baseMatch) {
                          const baseClass = baseMatch[0];
                          // Get the rest of the classes (backdrop-blur, shadow, etc.)
                          const restOfClasses = current.replace(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/\d{1,3})?/, '').trim();
                          const newCardClass = `${baseClass}/${clampedVal}${restOfClasses ? ' ' + restOfClasses : ''}`;
                          console.log('🎨 New card class:', newCardClass);
                          updateProduct(productEditor.productId!, { cardClass: newCardClass });
                        } else {
                          console.log('🎨 No base class found, using fallback');
                          // Fallback: create a new class with transparency
                          const newCardClass = `bg-white/${clampedVal} backdrop-blur-sm shadow-xl`;
                          updateProduct(productEditor.productId!, { cardClass: newCardClass });
                        }
                      }}
                      onMouseUp={() => {
                        // Reset interaction state after a short delay
                        setTimeout(() => setIsUserInteracting(false), 100);
                      }}
                      onTouchEnd={() => {
                        // Reset interaction state after a short delay
                        setTimeout(() => setIsUserInteracting(false), 100);
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-400 w-8 text-right">100%</span>
                    <span className="text-sm font-semibold text-white w-12 text-right">{transparencyValue}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => {
                      const currentCard = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                      const currentTitle = products.find(p => p.id === productEditor.productId!)?.titleClass || legacyTheme.text;
                      const currentDesc = products.find(p => p.id === productEditor.productId!)?.descClass || legacyTheme.text;
                      products.forEach(p => {
                        updateProduct(p.id, { cardClass: currentCard, titleClass: currentTitle, descClass: currentDesc });
                      });
                    }}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-xs"
                  >
                    Apply to All Cards
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Button-only section for Claim button (no productId) */}
        {productEditor.productId === null && productEditor.target === 'button' && (
          <div className="space-y-4">
            {/* Claim Button Text */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Button Text</label>
              <input
                type="text"
                value={promoButton.text}
                onChange={(e) => setPromoButton(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Enter claim button text"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>
            
            {/* Claim Button Icon */}
            <EmojiBank 
              selectedEmoji={promoButton.icon}
              onSelectEmoji={(emoji) => setPromoButton(prev => ({ ...prev, icon: emoji }))}
            />
            
            {/* Claim Button Class via presets */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Button Style</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {[legacyTheme.accent,
                  'bg-indigo-600 hover:bg-indigo-700 text-white',
                  'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
                  'bg-cyan-600 hover:bg-cyan-700 text-gray-900',
                  'bg-emerald-600 hover:bg-emerald-700 text-white',
                  'bg-rose-600 hover:bg-rose-700 text-white',
                  'bg-amber-500 hover:bg-amber-600 text-gray-900',
                  'bg-purple-600 hover:bg-purple-700 text-white',
                  'bg-slate-800 hover:bg-slate-700 text-white',
                  'bg-orange-600 hover:bg-orange-700 text-white'
                ].map((cls, idx) => {
                  const isSelected = promoButton.buttonClass === cls;
                  return (
                    <button
                      key={`${cls}-${idx}`}
                      onClick={() => setPromoButton(prev => ({ ...prev, buttonClass: cls }))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 transition-all duration-200 ${
                        isSelected 
                          ? 'ring-white ring-offset-2 ring-offset-gray-900 scale-105 shadow-lg' 
                          : 'ring-1 ring-gray-700 hover:ring-gray-500'
                      } ${cls}`}
                    >
                      {idx === 0 ? 'Theme Accent' : 'Preset'}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    const current = promoButton.buttonClass || legacyTheme.accent;
                    products.forEach(p => {
                      updateProduct(p.id, { buttonClass: current });
                    });
                    setPromoButton(prev => ({ ...prev, buttonClass: current }));
                  }}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-xs"
                >
                  Apply to All Buttons
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};













