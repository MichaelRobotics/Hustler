import React, { useCallback } from 'react';
import { Product, Theme, LoadingState } from '../types';
import { TrashIcon, UploadIcon, ZapIcon } from './Icons';

interface ProductCardProps {
  product: Product;
  theme: Theme;
  isEditorView: boolean;
  loadingState: LoadingState;
  onUpdateProduct: (id: number, updates: Partial<Product>) => void;
  onDeleteProduct: (id: number) => void;
  onProductImageUpload: (productId: number, file: File) => void;
  onRefineProduct: (product: Product) => void;
  onRemoveSticker: (productId: number) => void;
  onDropAsset: (e: React.DragEvent, productId: number) => void;
  onOpenEditor?: (productId: number, target: 'name' | 'description' | 'card' | 'button') => void;
  inlineButtonEditing?: boolean;
  onInlineButtonSave?: (text: string) => void;
  onInlineButtonEnd?: () => void;
  inlineNameActive?: boolean;
  inlineDescActive?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  theme,
  isEditorView,
  loadingState,
  onUpdateProduct,
  onDeleteProduct,
  onProductImageUpload,
  onRefineProduct,
  onRemoveSticker,
  onDropAsset,
  onOpenEditor,
  inlineButtonEditing,
  onInlineButtonSave,
  onInlineButtonEnd,
  inlineNameActive,
  inlineDescActive,
}) => {
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onProductImageUpload(product.id, file);
    }
  }, [product.id, onProductImageUpload]);

  const handleNameChange = useCallback((e: React.FocusEvent<HTMLHeadingElement>) => {
    onUpdateProduct(product.id, { name: e.currentTarget.textContent || ' ' });
  }, [product.id, onUpdateProduct]);

  const handleDescriptionChange = useCallback((e: React.FocusEvent<HTMLParagraphElement>) => {
    onUpdateProduct(product.id, { description: e.currentTarget.textContent || ' ' });
  }, [product.id, onUpdateProduct]);

  const handlePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateProduct(product.id, { price: parseFloat(e.target.value) });
  }, [product.id, onUpdateProduct]);

  // Logic: prefer per-card text classes, then theme
  const titleClass = product.titleClass || theme.text;
  const descClass = product.descClass || theme.text;
  const isDarkCard = (product.cardClass || theme.card).includes('bg-gray-900') || (product.cardClass || theme.card).includes('bg-slate-800') || (product.cardClass || theme.card).includes('bg-[#0f0b1f]') || theme.name === 'Cyber Sale' || theme.name === 'Spooky Night';
  const priceTextColor = titleClass?.startsWith('text-') ? titleClass : (isDarkCard ? 'text-white' : theme.text);

  const cardClass = product.cardClass || theme.card;
  const buttonText = product.buttonText || 'VIEW DETAILS';
  const buttonBaseClass = product.buttonClass || theme.accent;
  // Avoid inline color styles per instructions; rely on classes only

  return (
    <div 
      className={`px-3 py-4 rounded-2xl transition-all duration-300 ${cardClass} flex flex-col relative max-w-xs mx-auto`}
      onClick={(e) => {
        if (!isEditorView) return;
        const target = e.target as HTMLElement;
        // Treat product name/desc and form fields as interactive to avoid opening modal while inline editing
        const interactive = target.closest('button,input,textarea,label,[data-inline-product-name],[data-inline-product-desc]');
        if (interactive) return;
        if (onOpenEditor) onOpenEditor(product.id, 'card');
      }}
    >
      {/* AI/Upload/Delete Controls (Only visible in Editor View) */}
      {isEditorView && (
        <div className="absolute top-2 right-2 flex space-x-1 z-10">
          {/* Sticker/Overlay Controls */}
          {product.containerAsset && (
            <button
              onClick={() => onRemoveSticker(product.id)}
              title="Remove Sticker"
              className="text-xs font-semibold px-2 py-1 rounded-full flex items-center transition-all duration-300 bg-gray-500 hover:bg-red-600 text-white"
            >
              <TrashIcon className="w-3 h-3"/>
            </button>
          )}

          {/* Delete Product Button */}
          <button
            onClick={() => onDeleteProduct(product.id)}
            className="p-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 transition-all duration-300 relative group"
            title="Delete Product"
          >
            <TrashIcon className="w-3 h-3" />
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              Delete Product
            </div>
          </button>

          {/* Single Combined AI Refine Button */}
          <button
            onClick={() => onRefineProduct(product)}
            disabled={loadingState.isTextLoading || loadingState.isImageLoading}
            className={`p-2 rounded-xl group transition-all duration-300 transform hover:scale-105 relative shadow-lg ${
              (loadingState.isTextLoading || loadingState.isImageLoading) 
                ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed shadow-gray-500/25' 
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
            }`}
            title="AI Refine All"
          >
            <div className="flex items-center justify-center">
              <ZapIcon className="w-3 h-3" />
            </div>
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              AI Refine All
            </div>
          </button>
        </div>
      )}

      {/* Product Image Container (Drop Zone) */}
      <div 
        className="relative w-40 h-40 mb-2 mx-auto product-container-drop-zone"
        onDragOver={(e) => isEditorView && e.preventDefault()}
        onDrop={(e) => onDropAsset(e, product.id)}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full rounded-xl object-cover ring-2 ring-transparent hover:ring-4 transition-all duration-500 ring-offset-2 ring-offset-current"
          style={{ 
            filter: `drop-shadow(0 10px 10px ${
              theme.name === 'Fall' ? 'rgba(160, 82, 45, 0.5)' : 
              theme.name === 'Winter' ? 'rgba(31, 74, 155, 0.5)' : 
              'rgba(232, 160, 2, 0.5)'
            })` 
          }}
          onError={(e) => { 
            e.currentTarget.onerror = null; 
            e.currentTarget.src = "https://placehold.co/200x200/ff0000/ffffff?text=IMG+ERROR"; 
          }}
        />
        
        {/* Sticker/Container Asset Overlay */}
        {product.containerAsset && (
          <img
            src={product.containerAsset.src}
            alt={product.containerAsset.alt}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ 
              transform: `scale(${product.containerAsset.scale || 1.0}) rotate(${product.containerAsset.rotation || 0}deg)`,
            }}
          />
        )}

        {isEditorView && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-2xl z-20">
            <label htmlFor={`upload-${product.id}`} className="cursor-pointer p-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full shadow-lg transition-colors">
              <UploadIcon className="w-5 h-5" />
              <input 
                type="file" 
                id={`upload-${product.id}`} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={loadingState.isImageLoading}
              />
            </label>
          </div>
        )}
      </div>
      
      {/* Inner content wrapper to push button to the bottom */}
      <div className="flex flex-col flex-grow text-center">
        {/* Editable Product Name */}
        <h2 
          className={`text-lg font-bold mb-1 ${titleClass}`}
          contentEditable={isEditorView}
          suppressContentEditableWarning={true}
          onBlur={handleNameChange}
          style={{ cursor: isEditorView ? 'text' : 'default' }}
          data-inline-product-name={product.id}
          onClick={() => { if (isEditorView && onOpenEditor && !inlineNameActive) onOpenEditor(product.id, 'name'); }}
        >
          {product.name}
        </h2>
        
        {/* Editable Product Description (Fixed min height for alignment) */}
        <p 
          className={`text-xs mb-2 ${descClass} flex-grow`}
          style={{ minHeight: '1.5rem', cursor: isEditorView ? 'text' : 'default' }}
          contentEditable={isEditorView}
          suppressContentEditableWarning={true}
          onBlur={handleDescriptionChange}
          data-inline-product-desc={product.id}
          onClick={() => { if (isEditorView && onOpenEditor && !inlineDescActive) onOpenEditor(product.id, 'description'); }}
        >
          {product.description}
        </p>
        
        {/* Editable Price */}
        <div className="text-xl font-extrabold mb-2 mt-auto">
          {isEditorView ? (
            <input 
              type="number"
              step="0.01"
              value={product.price}
              onChange={handlePriceChange}
              className={`w-16 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-indigo-500 text-xl font-extrabold ${priceTextColor}`}
            />
          ) : (
            <span className={priceTextColor}>{`$${product.price.toFixed(2)}`}</span>
          )}
        </div>
        
        {/* Button / Inline Button Text Editor */}
        {isEditorView && inlineButtonEditing ? (
          <input
            type="text"
            defaultValue={buttonText}
            onChange={(e) => onInlineButtonSave && onInlineButtonSave(e.target.value)}
            onBlur={() => onInlineButtonEnd && onInlineButtonEnd()}
            className="w-full max-w-48 mx-auto py-2 px-3 rounded-full bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-center font-bold uppercase tracking-wider"
          />
        ) : (
          <button 
            className={`w-full max-w-48 py-1.5 px-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] ${buttonBaseClass} shadow-xl ring-2 ring-offset-2 ring-offset-white mx-auto`}
            onClick={(e) => { 
              if (isEditorView && onOpenEditor) { 
                e.stopPropagation(); 
                onOpenEditor(product.id, 'button'); 
              } else if (product.buttonLink) {
                // Redirect to the specified link
                if (product.buttonLink.startsWith('http')) {
                  window.open(product.buttonLink, '_blank');
                } else {
                  window.location.href = product.buttonLink;
                }
              }
            }}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
};

