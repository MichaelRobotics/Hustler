'use client';

import React, { useState, useEffect } from 'react';
import { XIcon } from './Icons';
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
}

interface ProductEditorModalProps {
  isOpen: boolean;
  isAnimating: boolean;
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
  
  // Handlers
  onClose: () => void;
  updateProduct: (id: number | string, updates: Partial<Product>) => void;
  setPromoButton: (fn: (prev: any) => any) => void;
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  isOpen,
  isAnimating,
  productEditor,
  products,
  promoButton,
  legacyTheme,
  backgroundAnalysis,
  onClose,
  updateProduct,
  setPromoButton,
}) => {
  // Local state for transparency slider
  const [transparencyValue, setTransparencyValue] = useState(90);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  
  // Update transparency value when product changes
  useEffect(() => {
    if (productEditor.productId !== null && !isUserInteracting) {
      const currentProduct = products.find(p => p.id === productEditor.productId!);
      const current = currentProduct?.cardClass || legacyTheme.card;
      console.log('🎨 Updating transparency from product:', current);
      console.log('🎨 Current product:', currentProduct);
      
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
  }, [productEditor.productId, products, legacyTheme.card, isUserInteracting]);

  // Watch for changes in the specific product's cardClass
  const currentProduct = productEditor.productId !== null ? products.find(p => p.id === productEditor.productId!) : null;
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

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        // Remove overlay blocking when product editor modal is open
        pointerEvents: 'none'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Product"
        className={`fixed inset-y-0 right-0 w-80 bg-gray-900/70 backdrop-blur-md text-white shadow-2xl transform transition-transform duration-500 z-[60] p-0 border-l border-gray-700/50 overflow-hidden ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-800/50 bg-gray-900/70 backdrop-blur-sm">
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
          <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors" aria-label="Close">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        {productEditor.productId !== null && (
          <div className="space-y-4 px-4 py-4 overflow-y-auto h-full pb-28">
            {productEditor.target !== 'button' && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={products.find(p => p.id === productEditor.productId)?.name || ''}
                    onChange={(e) => updateProduct(productEditor.productId!, { name: e.target.value })}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder-black"
                  />
                </div>
                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                  <textarea
                    value={products.find(p => p.id === productEditor.productId)?.description || ''}
                    onChange={(e) => updateProduct(productEditor.productId!, { description: e.target.value })}
                    placeholder="Enter description"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 h-24 placeholder-black"
                  />
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
                
                {/* Button Link (per-product) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Button Link (Where to redirect when clicked)</label>
                  <input
                    type="url"
                    value={products.find(p => p.id === productEditor.productId)?.buttonLink || ''}
                    onChange={(e) => updateProduct(productEditor.productId!, { buttonLink: e.target.value })}
                    placeholder="https://example.com or /product-page"
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder-black"
                  />
                  <p className="text-xs text-gray-400 mt-1">Enter a full URL (https://...) or a relative path (/page)</p>
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
                    const currentProduct = products.find(p => p.id === productEditor.productId!);
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
                  
                  {/* Quick preset buttons for common transparency values */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[0, 25, 50, 75, 90, 95].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          console.log('🎨 Setting transparency preset:', preset);
                          setIsUserInteracting(true);
                          setTransparencyValue(preset);
                          
                          const current = products.find(p => p.id === productEditor.productId!)?.cardClass || legacyTheme.card;
                          const baseMatch = current.match(/bg-[^\s/]+(?:\[[^\]]+\])?/);
                          if (baseMatch) {
                            const baseClass = baseMatch[0];
                            const restOfClasses = current.replace(/bg-[^\s/]+(?:\[[^\]]+\])?(?:\/\d{1,3})?/, '').trim();
                            const newCardClass = `${baseClass}/${preset}${restOfClasses ? ' ' + restOfClasses : ''}`;
                            updateProduct(productEditor.productId!, { cardClass: newCardClass });
                          } else {
                            const newCardClass = `bg-white/${preset} backdrop-blur-sm shadow-xl`;
                            updateProduct(productEditor.productId!, { cardClass: newCardClass });
                          }
                          
                          setTimeout(() => setIsUserInteracting(false), 100);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                          transparencyValue === preset
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {preset === 0 ? 'Solid' : `${preset}%`}
                      </button>
                    ))}
                  </div>
                  
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
            <div className="h-24" />
          </div>
        )}
        
        {/* Button-only section for Claim button (no productId) */}
        {productEditor.productId === null && productEditor.target === 'button' && (
          <div className="space-y-4 px-4 py-4 overflow-y-auto h-full pb-28">
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
            
            {/* Claim Button Outer Ring Color */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Outer Ring Color</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {['ring-indigo-400', 'ring-cyan-400', 'ring-fuchsia-400', 'ring-emerald-400', 'ring-amber-400', 'ring-rose-400', 'ring-blue-400', 'ring-slate-400', 'ring-orange-400'].map(cls => {
                  const isSelected = promoButton.ringHoverClass === cls;
                  return (
                    <button
                      key={cls}
                      onClick={() => setPromoButton(prev => ({ ...prev, ringClass: 'ring-white/30', ringHoverClass: cls }))}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 ring-offset-2 transition-all duration-200 ${
                        isSelected 
                          ? 'ring-white ring-offset-gray-900 scale-105 shadow-lg' 
                          : 'ring-white/30 hover:ring-white/50'
                      } bg-gray-800 hover:bg-gray-700 ${cls.replace('ring-', 'hover:ring-')}`}
                    >
                      {cls.replace('ring-', '')}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="h-24" />
          </div>
        )}
        
        <div className="sticky bottom-0 z-10 px-4 py-3 border-t border-gray-800/50 bg-transparent backdrop-blur-sm flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:shadow-indigo-500/30 dark:hover:shadow-indigo-500/50">Done</button>
        </div>
      </div>
    </div>
  );
};













