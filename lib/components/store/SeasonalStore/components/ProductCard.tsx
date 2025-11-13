import React, { useCallback, useRef, useEffect } from 'react';
import { Product, LegacyTheme, LoadingState } from '../types';
import { TrashIcon, ZapIcon } from './Icons';

interface ProductCardProps {
  product: Product;
  theme: LegacyTheme;
  isEditorView: boolean;
  loadingState: LoadingState;
  onUpdateProduct: (id: number | string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: number | string) => void;
  onProductImageUpload: (productId: number | string, file: File) => void;
  onRefineProduct: (product: Product) => void;
  onRemoveSticker: (productId: number | string) => void;
  onDropAsset: (e: React.DragEvent, productId: number | string) => void;
  onOpenEditor?: (productId: number | string, target: 'name' | 'description' | 'card' | 'button') => void;
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
  
  // Parse transparency from cardClass and extract base background color
  const getCardStyle = () => {
    // Match bg-color/opacity or bg-[custom]/opacity patterns
    const transparencyMatch = cardClass.match(/bg-((?:\[[^\]]+\]|[^\s/]+)+)\/(\d{1,3})/);
    if (transparencyMatch && transparencyMatch[1] && transparencyMatch[2]) {
      const bgColor = transparencyMatch[1];
      const opacityValue = parseInt(transparencyMatch[2], 10) / 100;
      
      // Map common Tailwind colors to RGB values
      const colorMap: Record<string, string> = {
        'white': '255, 255, 255',
        'gray-50': '249, 250, 251',
        'gray-100': '243, 244, 246',
        'gray-200': '229, 231, 235',
        'gray-300': '209, 213, 219',
        'gray-400': '156, 163, 175',
        'gray-500': '107, 114, 128',
        'gray-600': '75, 85, 99',
        'gray-700': '55, 65, 81',
        'gray-800': '31, 41, 55',
        'gray-900': '17, 24, 39',
        'slate-100': '241, 245, 249',
        'slate-800': '30, 41, 59',
        'amber-50': '255, 251, 235',
        'green-50': '240, 253, 244',
        'purple-50': '250, 245, 255',
        'blue-50': '239, 246, 255',
        'rose-50': '255, 241, 242',
        'emerald-50': '236, 253, 245',
      };
      
      // Handle custom colors like bg-[#0f0b1f]
      let rgbColor = '255, 255, 255'; // default to white
      if (bgColor.startsWith('[') && bgColor.endsWith(']')) {
        // Custom color like [#0f0b1f]
        const hexColor = bgColor.slice(1, -1);
        if (hexColor.startsWith('#')) {
          const hex = hexColor.slice(1);
          if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            rgbColor = `${r}, ${g}, ${b}`;
          }
        }
      } else {
        // Standard Tailwind color
        rgbColor = colorMap[bgColor] || '255, 255, 255';
      }
      
      // Remove the background class with opacity and apply via inline style
      // This regex matches bg-color/opacity and removes it, keeping other classes
      const baseCardClass = cardClass.replace(/bg-(?:\[[^\]]+\]|[^\s/]+)\/\d{1,3}/, '').trim();
      return {
        className: baseCardClass,
        style: { 
          backgroundColor: `rgba(${rgbColor}, ${opacityValue})`,
        }
      };
    }
    return {
      className: cardClass,
      style: {}
    };
  };
  
  const cardStyle = getCardStyle();
  
  // Debug logging - only log when product actually changes
  const prevProduct = useRef(product);
  useEffect(() => {
    if (JSON.stringify(prevProduct.current) !== JSON.stringify(product)) {
      console.log('🎨 ProductCard render for product:', product.id, {
        cardClass: product.cardClass,
        titleClass: product.titleClass,
        descClass: product.descClass,
        buttonClass: product.buttonClass,
        finalCardClass: cardClass,
        finalTitleClass: titleClass,
        finalDescClass: descClass
      });
      prevProduct.current = product;
    }
  }, [product, cardClass, titleClass, descClass]);
  // Avoid inline color styles per instructions; rely on classes only

  return (
    <div className="relative max-w-xs mx-auto">
      {/* Blurred background for visual feedback */}
      <div 
        className="absolute inset-0 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg"
        style={{ 
          zIndex: -1,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          backdropFilter: 'blur(8px)'
        }}
      />
      
      {/* Main product card */}
      <div 
        className={`group rounded-2xl transition-all duration-300 ${cardStyle.className} flex flex-col relative max-w-xs mx-auto overflow-hidden`}
        style={cardStyle.style}
        onClick={(e) => {
          if (!isEditorView) return;
          const target = e.target as HTMLElement;
          // Treat product name/desc and form fields as interactive to avoid opening modal while inline editing
          const interactive = target.closest('button,input,textarea,label,[data-inline-product-name],[data-inline-product-desc]');
          if (interactive) return;
          if (onOpenEditor) onOpenEditor(product.id, 'card');
        }}
      >
      {/* Image Section - Top Half */}
      <div className="relative h-56 w-full">
        {/* Background Image - fills top half */}
        <div 
          className="absolute inset-0 rounded-t-2xl overflow-hidden"
          style={{
            backgroundImage: product.imageAttachmentUrl 
              ? `url(${product.imageAttachmentUrl})` 
              : product.image
                ? `url(${product.image})`
                : `url(https://placehold.co/400x400/c2410c/ffffff?text=${encodeURIComponent(product.name.toUpperCase())})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: `drop-shadow(0 10px 10px ${
              theme.name === 'Fall' ? 'rgba(160, 82, 45, 0.5)' : 
              theme.name === 'Winter' ? 'rgba(31, 74, 155, 0.5)' : 
              'rgba(232, 160, 2, 0.5)'
            })`
          }}
        />
        
        {/* Badge as diagonal ribbon extending beyond card borders - 45 degree angle */}
        {product.badge && (
          <div 
            className="absolute top-0 left-0 z-30 pointer-events-none"
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            {/* Ribbon that extends beyond left and right borders */}
            <div 
              className={`absolute font-bold text-[10px] shadow-lg ${
                product.badge === 'new' 
                  ? 'bg-green-500' 
                  : product.badge === '5star'
                  ? 'bg-yellow-600'
                  : product.badge === 'bestseller'
                  ? 'bg-orange-500'
                  : ''
              }`}
              style={{
                width: '150%',
                height: '28px',
                left: '-65%',
                top: '15px',
                transform: 'rotate(-45deg)',
                transformOrigin: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            />
            {/* Text container - clipped to stay within card boundaries, centered at midpoint of shard intersections */}
            <div 
              className="absolute top-0 left-0 w-full h-full"
              style={{
                overflow: 'hidden',
              }}
            >
               {/* Shard center is at 10% of card width (midpoint between entry and exit) */}
                <div 
                className={`absolute flex items-center justify-center font-bold text-[10px] ${
                  product.badge === 'new' 
                    ? 'text-white' 
                    : product.badge === '5star'
                    ? 'text-white'
                    : product.badge === 'bestseller'
                    ? 'text-white'
                    : ''
                }`}
                  style={{
                    top: '15px',
                    left: '10%',
                    transform: 'translateX(-50%) rotate(-45deg)',
                    transformOrigin: 'center center',
                    height: '28px',
                    whiteSpace: 'nowrap',
                  }}
                >
                {product.badge === 'new' ? 'New' : product.badge === '5star' ? '5 ⭐' : 'BestSeller'}
              </div>
            </div>
          </div>
        )}
        
      </div>
      {/* Theme Up Button - Top Right (Only visible in Editor View and on hover) */}
      {isEditorView && (
          <button
            onClick={() => onRefineProduct(product)}
            disabled={loadingState.isTextLoading || loadingState.isImageLoading}
          className={`absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center space-x-2 ${
              (loadingState.isTextLoading || loadingState.isImageLoading) 
                ? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed shadow-gray-500/25' 
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-green-500/25 hover:shadow-green-500/40'
            }`}
          title="Theme Up!"
          >
          <ZapIcon className="w-4 h-4" />
          <span className="font-semibold text-xs">Theme Up!</span>
          </button>
      )}

      {/* Drop Zone for Assets - covers entire card */}
      <div 
        className="absolute inset-0 product-container-drop-zone"
        onDragOver={(e) => isEditorView && e.preventDefault()}
        onDrop={(e) => onDropAsset(e, product.id)}
      />
      
      {/* Text Content Section - Bottom Half */}
      <div className="px-3 py-2 flex flex-col flex-grow text-center relative z-30">
        {/* Editable Product Name */}
        <h2 
          className={`text-lg font-bold mb-0.5 ${titleClass} ${isEditorView ? 'cursor-pointer hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1' : ''}`}
          style={{ cursor: isEditorView ? 'pointer' : 'default' }}
          data-inline-product-name={product.id}
          onClick={(e) => {
            e.stopPropagation();
            if (isEditorView && onOpenEditor) {
              // Open modal and immediately activate inline editing (like header/subheader)
              onOpenEditor(product.id, 'name');
              // The parent will handle setting inlineEditTarget
            }
          }}
        >
          {product.name}
        </h2>
        
        {/* Editable Product Description (Fixed min height for alignment, max 2 lines) */}
        <p 
          className={`text-xs mb-1 ${descClass} ${isEditorView ? 'flex-grow cursor-pointer hover:bg-white/10 transition-colors duration-200 rounded-lg px-2 py-1' : ''}`}
          style={{ 
            minHeight: '1.5rem', 
            cursor: isEditorView ? 'pointer' : 'default',
            display: '-webkit-box',
            WebkitLineClamp: inlineDescActive ? 'unset' : 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            wordBreak: 'break-word'
          }}
          data-inline-product-desc={product.id}
          onClick={(e) => {
            e.stopPropagation();
            if (isEditorView && onOpenEditor) {
              // Open modal and immediately activate inline editing (like header/subheader)
              onOpenEditor(product.id, 'description');
              // The parent will handle setting inlineEditTarget
            }
          }}
        >
          {product.description}
        </p>
        
        {/* Editable Price */}
        <div className="text-xl font-extrabold mb-1 mt-auto">
          {isEditorView ? (
            <div className="flex items-center justify-center">
              <span className={`text-xl font-extrabold ${priceTextColor} mr-1`}>$</span>
              <input 
                type="number"
                step="0.01"
                value={product.price.toFixed(2)}
                onChange={handlePriceChange}
                className={`w-20 text-center bg-transparent border-b border-gray-400 focus:outline-none focus:border-indigo-500 text-xl font-extrabold ${priceTextColor}`}
              />
            </div>
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
              console.log('🔵 [ProductCard] Button clicked:', {
                productId: product.id,
                productName: product.name,
                isEditorView,
                hasOnOpenEditor: !!onOpenEditor,
                hasButtonLink: !!product.buttonLink,
                buttonLink: product.buttonLink,
                buttonText: buttonText,
                buttonLinkType: product.buttonLink ? (product.buttonLink.startsWith('http') ? 'external' : 'relative') : 'none',
              });
              
              if (isEditorView && onOpenEditor) { 
                console.log('🔵 [ProductCard] Editor view - opening editor for button');
                e.stopPropagation(); 
                onOpenEditor(product.id, 'button'); 
              } else if (product.buttonLink) {
                console.log('🔵 [ProductCard] Redirecting to buttonLink:', product.buttonLink);
                // Redirect to the specified link
                if (product.buttonLink.startsWith('http')) {
                  console.log('🔵 [ProductCard] Opening external link in new tab:', product.buttonLink);
                  window.open(product.buttonLink, '_blank');
                } else {
                  console.log('🔵 [ProductCard] Navigating to relative path:', product.buttonLink);
                  window.location.href = product.buttonLink;
                }
              } else {
                console.warn('🔵 [ProductCard] No buttonLink found - button click does nothing. Product:', {
                  id: product.id,
                  name: product.name,
                  hasButtonLink: !!product.buttonLink,
                  fullProduct: product
                });
              }
            }}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
    </div>
  );
};

