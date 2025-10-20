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
      className={`p-6 rounded-3xl transition-all duration-300 ${cardClass} flex flex-col relative`}
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
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
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
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
            title="Delete Product"
          >
            <TrashIcon className="w-3 h-3" />
          </button>

          {/* Single Combined AI Refine Button */}
          <button
            onClick={() => onRefineProduct(product)}
            disabled={loadingState.isTextLoading || loadingState.isImageLoading}
            className={`p-2 rounded-full group transition-all duration-300 transform hover:scale-105 ${
              (loadingState.isTextLoading || loadingState.isImageLoading) 
                ? 'bg-gray-500 text-gray-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="AI Refine All"
          >
            <div className="flex items-center justify-center">
              <ZapIcon className="w-3 h-3" />
              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs w-0 group-hover:w-auto overflow-hidden">
                AI Refine All
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Product Image Container (Drop Zone) */}
      <div 
        className="relative w-48 h-48 mb-4 mx-auto product-container-drop-zone"
        onDragOver={(e) => isEditorView && e.preventDefault()}
        onDrop={(e) => onDropAsset(e, product.id)}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full rounded-2xl object-cover ring-4 ring-transparent hover:ring-8 transition-all duration-500 ring-offset-4 ring-offset-current"
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
            <label htmlFor={`upload-${product.id}`} className="cursor-pointer p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-colors">
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
          className={`text-2xl font-bold mb-2 ${titleClass}`}
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
          className={`text-sm mb-4 ${descClass} flex-grow`}
          style={{ minHeight: '4.5rem', cursor: isEditorView ? 'text' : 'default' }}
          contentEditable={isEditorView}
          suppressContentEditableWarning={true}
          onBlur={handleDescriptionChange}
          data-inline-product-desc={product.id}
          onClick={() => { if (isEditorView && onOpenEditor && !inlineDescActive) onOpenEditor(product.id, 'description'); }}
        >
          {product.description}
        </p>
        
        {/* Editable Price */}
        <div className="text-3xl font-extrabold mb-4 mt-auto">
          {isEditorView ? (
            <input 
              type="number"
              step="0.01"
              value={product.price}
              onChange={handlePriceChange}
              className={`w-24 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-indigo-500 text-3xl font-extrabold ${priceTextColor}`}
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
            className="w-full max-w-xs mx-auto py-3 px-4 rounded-full bg-gray-900 text-white placeholder-gray-400 border border-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-center font-bold uppercase tracking-wider"
          />
        ) : (
          <button 
            className={`w-full max-w-xs py-3 px-6 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] ${buttonBaseClass} shadow-xl ring-2 ring-offset-2 ring-offset-white mx-auto`}
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

