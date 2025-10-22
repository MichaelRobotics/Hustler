import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { FloatingAsset as FloatingAssetType } from '../types';
import { emojiToSvgDataURL } from '../services/aiService';

interface FloatingAssetProps {
  asset: FloatingAssetType;
  isAdminSheetOpen: boolean;
  selectedAssetId: string | null;
  onUpdateAsset: (id: string, updates: Partial<FloatingAssetType>) => void;
  onSelectAsset: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  appRef: React.RefObject<HTMLElement | null>;
  isEditorView: boolean;
}

export const FloatingAsset = memo<FloatingAssetProps>(({ 
  asset, 
  isAdminSheetOpen, 
  selectedAssetId, 
  onUpdateAsset, 
  onSelectAsset, 
  onDeleteAsset,
  appRef,
  isEditorView
}) => {
  const assetRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState<'position' | 'scale' | 'rotate' | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const dragOffsetRef = useRef({ 
    x: 0, 
    y: 0, 
    center: { x: 0, y: 0 },
    initialRotation: 0, 
    initialScale: 1.0,
    initialWidth: 150
  });

  const isSelected = selectedAssetId === asset.id;
  const isEditable = isEditorView && !asset.isLogo; // Only editable in editor view and when not a logo
  const isTextAsset = asset.type === 'text';
  const isPromoCode = asset.isPromoCode;

  // Promo Code Sticker Styling
  const promoCodeBgStyle = isPromoCode ? {
    backgroundImage: `url(${emojiToSvgDataURL('🎫')})`,
    backgroundSize: '150% 150%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    padding: '10px 20px',
    backgroundColor: '#FF0077',
    textShadow: '2px 2px 3px rgba(0,0,0,0.8)',
    textAlign: 'center' as const,
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)',
  } : {};

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: 'position' | 'scale' | 'rotate') => {
    if (!isEditable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    onSelectAsset(asset.id);
    setEditMode(mode);
    setHasDragged(false);

    const containerRect = appRef.current?.getBoundingClientRect();
    const assetRect = assetRef.current?.getBoundingClientRect();
    
    if (!containerRect || !assetRect) return;
    
    const currentX = (parseFloat(asset.x) / 100) * containerRect.width;
    const currentY = parseFloat(asset.y);
    
    dragOffsetRef.current = {
      x: e.clientX - currentX,
      y: e.clientY - currentY,
      center: {
        x: assetRect.left + assetRect.width / 2,
        y: assetRect.top + assetRect.height / 2,
      },
      initialRotation: parseFloat(asset.rotation),
      initialScale: asset.scale,
      initialWidth: isTextAsset ? 300 : 150,
    };
  }, [isEditable, asset, onSelectAsset, appRef, isTextAsset]);

  // Mouse Move/Up logic
  useEffect(() => {
    if (!editMode) return;
    const containerRect = appRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!assetRef.current) return;
      
      if (editMode === 'position') {
        setHasDragged(true);
        
        let newX = e.clientX - dragOffsetRef.current.x;
        let newY = e.clientY - dragOffsetRef.current.y;

        // Constrain to container bounds
        newX = Math.max(0, Math.min(newX, containerRect.width));
        newY = Math.max(0, newY);

        // Convert to percentage for x (since we use translate(-50%, -50%))
        const newXPercent = (newX / containerRect.width) * 100;

        console.log('🎯 Updating asset position:', {
          id: asset.id,
          x: `${newXPercent.toFixed(2)}%`,
          y: `${newY.toFixed(0)}px`,
          newX,
          newY,
          containerWidth: containerRect.width
        });
        
        onUpdateAsset(asset.id, {
          x: `${newXPercent.toFixed(2)}%`,
          y: `${newY.toFixed(0)}px`,
        });
      } else if (editMode === 'scale') {
        const distanceX = e.clientX - dragOffsetRef.current.center.x;
        const distanceY = e.clientY - dragOffsetRef.current.center.y;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        const newScale = Math.max(0.5, Math.min(3.0, distance / (dragOffsetRef.current.initialWidth * 0.75)));
        
        onUpdateAsset(asset.id, { scale: parseFloat(newScale.toFixed(2)) });
      } else if (editMode === 'rotate') {
        const deltaX = e.clientX - dragOffsetRef.current.center.x;
        const deltaY = e.clientY - dragOffsetRef.current.center.y;
        const angleRad = Math.atan2(deltaY, deltaX);
        const angleDeg = (angleRad * 180 / Math.PI) + 90;
        const normalizedAngle = (angleDeg + 360) % 360;

        onUpdateAsset(asset.id, { rotation: normalizedAngle.toFixed(0) });
      }
    };
    
    const handleMouseUp = () => {
      setEditMode(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editMode, asset.id, onUpdateAsset, appRef, isTextAsset]);

  return (
    <div
      ref={assetRef}
      key={asset.id}
      className={`absolute transition-transform duration-500 ease-out`}
      style={{
        zIndex: isEditable ? 50 : asset.z,
        left: asset.x,
        top: asset.y,
        transform: `translate(-50%, -50%) rotate(${asset.rotation}deg) scale(${asset.scale})`,
        outline: isEditable && isSelected ? '3px solid #06B6D4' : (isEditable ? '1px dashed rgba(255, 255, 255, 0.5)' : 'none'),
        cursor: isEditable ? 'grab' : 'default',
      }}
      onMouseDown={(e) => handleMouseDown(e, 'position')}
      onClick={(e) => { 
        e.stopPropagation(); 
        if (hasDragged) {
          // Don't delete if we just dragged
          return;
        }
        // Always select the asset on click, don't auto-delete
        onSelectAsset(asset.id);
      }}
    >
      {asset.type === 'image' ? (
        <img
          src={asset.src}
          alt={asset.alt}
          className="w-full h-auto pointer-events-none block"
          style={{ 
            width: `${asset.isLogo ? 150 : 100}px`, 
            opacity: 1.0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none'
          }}
          onError={(e) => { 
            e.currentTarget.onerror = null; 
            e.currentTarget.src = "https://placehold.co/100x100/ff0000/ffffff?text=IMG+ERR"; 
          }}
        />
      ) : asset.type === 'text' ? (
        <div 
          className={`p-2 pointer-events-none ${asset.styleClass} ${isPromoCode ? 'flex items-center justify-center' : ''}`}
          style={{ 
            color: asset.color,
            textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
            ...(isPromoCode ? promoCodeBgStyle : {}),
            width: isPromoCode ? '200px' : 'auto',
            height: isPromoCode ? '100px' : 'auto',
          }}
        >
          <span style={{ pointerEvents: 'none' }}>{asset.content}</span>
        </div>
      ) : asset.type === 'promo-ticket' ? (
        <div className="p-2 pointer-events-none">
          <p className="text-sm text-white bg-red-500 px-2 py-1 rounded">
            {asset.content || 'Promo Ticket'}
          </p>
        </div>
      ) : (
        <div className="p-2 pointer-events-none">
          <p className="text-xl text-white">UNKNOWN ASSET</p>
        </div>
      )}
      
      {/* Resize Handle (Bottom Right) */}
      {isEditable && isSelected && (
        <div 
          className="absolute bottom-[-10px] right-[-10px] w-5 h-5 bg-cyan-500 rounded-full border-2 border-white shadow-xl cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
          onMouseDown={(e) => handleMouseDown(e, 'scale')}
          onDoubleClick={(e) => { 
            e.stopPropagation(); 
            onUpdateAsset(asset.id, { scale: 1.0 }); 
          }}
        />
      )}
      
      {/* Rotate Handle (Top Center) */}
      {isEditable && isSelected && (
        <>
          <div className="absolute top-[-35px] left-1/2 w-[2px] h-[25px] bg-cyan-500 transform -translate-x-1/2 pointer-events-none"/>
          <div 
            className="absolute top-[-45px] left-1/2 w-5 h-5 bg-cyan-500 rounded-full border-2 border-white shadow-xl cursor-grab pointer-events-auto transform -translate-x-1/2 hover:scale-125 transition-transform"
            onMouseDown={(e) => handleMouseDown(e, 'rotate')}
            onDoubleClick={(e) => { 
              e.stopPropagation(); 
              onUpdateAsset(asset.id, { rotation: '0' }); 
            }}
          />
        </>
      )}
    </div>
  );
});

FloatingAsset.displayName = 'FloatingAsset';
