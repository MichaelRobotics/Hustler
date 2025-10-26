'use client';

import React from 'react';

interface ButtonColorControlsProps {
  products: any[];
  productId: number;
  themeAccent: string;
  updateProduct: (id: number, updates: any) => void;
  setPromoButton?: React.Dispatch<React.SetStateAction<{ text: string; buttonClass: string; ringClass: string; ringHoverClass: string; icon: string }>>;
}

export const ButtonColorControls: React.FC<ButtonColorControlsProps> = ({ 
  products, 
  productId, 
  themeAccent, 
  updateProduct, 
  setPromoButton 
}) => {
  const presets = [
    { class: 'bg-indigo-600 hover:bg-indigo-700 text-white ring-indigo-500', ring: 'ring-indigo-500' },
    { class: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white ring-fuchsia-500', ring: 'ring-fuchsia-500' },
    { class: 'bg-cyan-600 hover:bg-cyan-700 text-gray-900 ring-cyan-500', ring: 'ring-cyan-500' },
    { class: 'bg-emerald-600 hover:bg-emerald-700 text-white ring-emerald-500', ring: 'ring-emerald-500' },
    { class: 'bg-rose-600 hover:bg-rose-700 text-white ring-rose-500', ring: 'ring-rose-500' },
    { class: 'bg-amber-500 hover:bg-amber-600 text-gray-900 ring-amber-500', ring: 'ring-amber-500' },
    { class: 'bg-purple-600 hover:bg-purple-700 text-white ring-purple-500', ring: 'ring-purple-500' },
    { class: 'bg-slate-800 hover:bg-slate-700 text-white ring-slate-500', ring: 'ring-slate-500' },
    { class: 'bg-orange-600 hover:bg-orange-700 text-white ring-orange-500', ring: 'ring-orange-500' },
  ];

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">Button Style</label>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          key="theme-accent"
          onClick={() => updateProduct(productId, { buttonClass: themeAccent })}
          className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 ring-offset-2 ring-white/30 ${themeAccent}`}
        >
          Theme Accent
        </button>
        {presets.map((preset, idx) => (
          <button
            key={`${preset.class}-${idx}`}
            onClick={() => updateProduct(productId, { buttonClass: preset.class })}
            className={`px-3 py-1 rounded-full text-xs font-semibold ring-2 ring-offset-2 ring-white/30 ${preset.class}`}
          >
            Preset
          </button>
        ))}
      </div>
      <div className="flex items-center justify-end">
        <button
          className="px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-gray-200 text-xs"
          onClick={() => {
            const current = products.find(p => p.id === productId)?.buttonClass || themeAccent;
            products.forEach(p => {
              updateProduct(p.id, { buttonClass: current });
            });
            if (setPromoButton) setPromoButton(prev => ({ ...prev, buttonClass: current }));
          }}
        >
          Apply to All
        </button>
      </div>
    </div>
  );
};

