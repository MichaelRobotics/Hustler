"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import UserChat from './UserChat';
import type { FunnelFlow } from '../../types/funnel';
import type { ConversationWithMessages } from '../../types/user';

interface TemplateRendererProps {
  liveTemplate: any;
  onProductClick: () => void;
  onPromoClick: () => void;
  isMobile: boolean;
  isFunnelActive?: boolean;
  funnelFlow?: any;
  experienceId?: string;
  userName?: string;
  whopUserId?: string;
  onMessageSent?: (message: string, conversationId?: string) => void;
  conversationId?: string;
  conversation?: ConversationWithMessages;
  stageInfo?: {
    currentStage: string;
    isDMFunnelActive: boolean;
    isTransitionStage: boolean;
    isExperienceQualificationStage: boolean;
  };
  userType?: "admin" | "customer";
}

/**
 * TemplateRenderer Component
 * 
 * Renders live template content in CustomerView
 * Handles all template elements: background, logo, headers, products, promo button
 */
export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  liveTemplate,
  onProductClick,
  onPromoClick,
  isMobile,
  isFunnelActive = false,
  funnelFlow,
  experienceId,
  userName,
  whopUserId,
  onMessageSent,
  conversationId,
  conversation,
  stageInfo,
  userType = "customer"
}) => {
  // Chat state management
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Mobile detection
  const [isMobileDetected, setIsMobileDetected] = useState(false);
  
  // Product navigation state (like SeasonalStore)
  const [isSliding, setIsSliding] = useState(false);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoSwitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDetected(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  
  // Handle chat opening
  const handleChatOpen = () => {
    setIsChatOpen(true);
  };
  
  // Handle chat closing
  const handleChatClose = () => {
    setIsChatOpen(false);
  };
  if (!liveTemplate || !liveTemplate.templateData) {
    return null;
  }

  const { templateData, currentSeason } = liveTemplate;

  // Debug logging
  console.log('[TemplateRenderer] Live template data:', {
    currentSeason,
    templateData: templateData,
    themeTextStyles: templateData.themeTextStyles,
    themeProducts: templateData.themeProducts,
    products: templateData.products,
    fixedTextStyles: templateData.fixedTextStyles,
    promoButton: templateData.promoButton
  });

  // Get background image - check both theme-specific and legacy
  const backgroundImage = templateData.themeGeneratedBackgrounds?.[currentSeason] 
    || templateData.themeUploadedBackgrounds?.[currentSeason]
    || templateData.generatedBackground
    || templateData.uploadedBackground
    || null;

  // Get logo - check both theme-specific and legacy
  const logoAsset = templateData.themeLogos?.[currentSeason] || templateData.logoAsset;
  
  console.log('[TemplateRenderer] Logo asset:', {
    logoAsset,
    hasSrc: !!logoAsset?.src,
    shape: logoAsset?.shape,
    themeLogos: templateData.themeLogos,
    legacyLogo: templateData.logoAsset
  });

  // Get text styles - check both theme-specific and legacy
  const textStyles = templateData.themeTextStyles?.[currentSeason] || templateData.fixedTextStyles || {};

  // Get products - check both theme-specific and legacy
  const products = templateData.themeProducts?.[currentSeason] || templateData.products || [];

  // Get promo button
  const promoButton = templateData.promoButton;

  // Product navigation functions (like SeasonalStore)
  const startAutoSwitch = useCallback(() => {
    if (autoSwitchIntervalRef.current) {
      clearInterval(autoSwitchIntervalRef.current);
    }
    
    if (products.length <= 2) return; // Don't auto-switch if 2 or fewer products
    
    // Shorter timeout for mobile (5 seconds) vs desktop (10 seconds)
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const switchTimeout = isMobile ? 5000 : 10000;
    
    autoSwitchIntervalRef.current = setInterval(() => {
      if (!isSliding) {
        setIsSliding(true);
        setSwipeDirection('left'); // Auto-switch slides left
        setTimeout(() => {
          setCurrentProductIndex(prevIndex => {
            const maxIndex = products.length - 2;
            return prevIndex >= maxIndex ? 0 : prevIndex + 1;
          });
          setSwipeDirection('right'); // Slide in from right
          setTimeout(() => {
            setSwipeDirection(null);
            setIsSliding(false);
          }, 150);
        }, 100);
      }
    }, switchTimeout);
  }, [products.length, isSliding, setIsSliding]);

  const navigateToPrevious = useCallback(() => {
    if (currentProductIndex > 0 && !isSliding) {
      setIsSliding(true);
      setSwipeDirection('right');
      setTimeout(() => {
        setCurrentProductIndex(prev => Math.max(0, prev - 1));
        setSwipeDirection('left'); // Slide in from left
        setTimeout(() => {
          setSwipeDirection(null);
          setIsSliding(false);
        }, 150);
      }, 100);
      startAutoSwitch();
    }
  }, [currentProductIndex, startAutoSwitch, isSliding, setIsSliding]);

  const navigateToNext = useCallback(() => {
    if (currentProductIndex < products.length - 2 && !isSliding) {
      setIsSliding(true);
      setSwipeDirection('left');
      setTimeout(() => {
        setCurrentProductIndex(prev => Math.min(products.length - 2, prev + 1));
        setSwipeDirection('right'); // Slide in from right
        setTimeout(() => {
          setSwipeDirection(null);
          setIsSliding(false);
        }, 150);
      }, 100);
      startAutoSwitch();
    }
  }, [currentProductIndex, products.length, startAutoSwitch, isSliding, setIsSliding]);

  // Touch swipe handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentProductIndex < products.length - 2) {
      navigateToNext();
    }
    if (isRightSwipe && currentProductIndex > 0) {
      navigateToPrevious();
    }
    
    // Reset touch values
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, currentProductIndex, products.length, navigateToNext, navigateToPrevious]);

  // Auto-switch products every 10 seconds
  useEffect(() => {
    startAutoSwitch();
    return () => {
      if (autoSwitchIntervalRef.current) {
        clearInterval(autoSwitchIntervalRef.current);
      }
    };
  }, [startAutoSwitch]);

  // Reset index when products change
  useEffect(() => {
    if (currentProductIndex >= products.length - 1) {
      setCurrentProductIndex(0);
    }
  }, [products.length, currentProductIndex]);

  console.log('[TemplateRenderer] Processed data:', {
    backgroundImage,
    logoAsset,
    textStyles,
    products: products.length,
    promoButton
  });

  return (
    <div className="w-full h-full relative">
      {/* Template Background - Full page coverage */}
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat fixed inset-0"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined
        }}
      />
      
      {/* TopNavbar - matches SeasonalStore */}
      <div className="sticky top-0 z-30 flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg min-h-[4rem]">
        <div className="px-3 py-2 h-full flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              {/* Empty space for balance */}
            </div>

            {/* Center: Hide Chat Button - Only show when chat is open */}
            {isChatOpen && (
              <div className="flex-1 flex justify-center">
                <button
                  onClick={handleChatClose}
                  className="group relative z-10 flex items-center justify-center py-3 px-6 text-lg rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ring-white/30 hover:ring-slate-400 bg-rose-600 hover:bg-rose-700 text-white shadow-2xl"
                >
                  <span className="mr-3 text-xl animate-pulse">💬</span>
                  Hide Chat
                </button>
              </div>
            )}

            <div className="flex items-center gap-4">
              {/* Empty space for balance */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Template Content Container */}
      <div className="relative z-30 flex flex-col items-center pt-1 pb-8 px-3 sm:px-6 max-w-7xl mx-auto transition-all duration-500 overflow-y-auto overflow-x-hidden h-full w-full">
        {/* Template Content */}
        <div className="relative z-10 w-full">
        {/* Logo */}
        {(logoAsset?.src || logoAsset) && (
          <div className="w-full max-w-5xl mx-auto mb-4 pt-2">
            <div className={`w-24 h-24 mx-auto overflow-hidden ${(logoAsset?.shape || 'square') === 'round' ? 'rounded-full' : 'rounded-3xl'}`}>
              <div 
                className={`w-full h-full ${(logoAsset?.shape || 'square') === 'round' ? 'rounded-full' : 'rounded-3xl'}`}
                style={{
                  backgroundImage: `url(${logoAsset?.src || logoAsset})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            </div>
          </div>
        )}
        
        {/* Header Message - matches StoreHeader exactly */}
        {textStyles.headerMessage && textStyles.headerMessage.content && (
          <div className="text-center mb-2 relative w-full">
            <p 
              className={`${textStyles.headerMessage.styleClass || 'text-5xl sm:text-6xl font-bold tracking-tight drop-shadow-lg'} mb-2`}
              style={{ 
                color: textStyles.headerMessage.color || 'rgb(255, 237, 213)',
                textShadow: 'rgba(0, 0, 0, 0.3) 1px 1px 2px'
              }}
            >
              {textStyles.headerMessage.content}
            </p>
          </div>
        )}
        
        {/* Sub Header - matches StoreHeader exactly */}
        {textStyles.subHeader && textStyles.subHeader.content && (
          <div className="text-center mb-2 relative w-full">
            <p 
              className={`${textStyles.subHeader.styleClass || 'text-lg sm:text-xl font-normal'} mb-2`}
              style={{ 
                color: textStyles.subHeader.color || 'rgb(255, 237, 213)',
                textShadow: 'rgba(0, 0, 0, 0.3) 1px 1px 2px'
              }}
            >
              {textStyles.subHeader.content}
            </p>
          </div>
        )}
        
          {/* Products Grid - matches SeasonalStore exactly */}
          {products.length > 0 && (
            <div className="w-full max-w-5xl my-4 mx-auto">
              <div className="flex items-center gap-4">
                {/* Left Arrow - Only show on desktop when there are more than 2 products */}
                {products.length > 2 && (
                  <button
                    onClick={navigateToPrevious}
                    disabled={currentProductIndex === 0}
                    className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
                    title="Previous products"
                  >
                    <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                
                {/* Product Grid - Show 1 product on mobile, 2 on desktop with slide-out and slide-in animation */}
                <div 
                  className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto overflow-hidden w-full"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {products.slice(currentProductIndex, currentProductIndex + 2).map((product: any, index: number) => (
                    <div 
                      key={`${product.id}-${currentProductIndex}`}
                      className={`transition-all duration-150 ease-in-out transform animate-in zoom-in-95 fade-in ${index === 1 ? 'hidden md:block' : ''}`}
                      style={{ 
                        animationDelay: `${index * 50}ms`,
                        animationDuration: '150ms',
                        transform: swipeDirection === 'left' 
                          ? 'translateX(100%)' 
                          : swipeDirection === 'right'
                          ? 'translateX(-100%)'
                          : 'translateX(0%)',
                        opacity: swipeDirection === 'left' || swipeDirection === 'right' ? 0 : 1,
                        transitionDelay: swipeDirection ? `${index * 40}ms` : '0ms'
                      }}
                    >
                    <ProductCard
                      product={product}
                      onProductClick={handleChatOpen}
                      onButtonClick={handleChatOpen}
                    />
                    </div>
                  ))}
                </div>
                
                {/* Right Arrow - Only show on desktop when there are more than 2 products */}
                {products.length > 2 && (
                  <button
                    onClick={navigateToNext}
                    disabled={currentProductIndex >= products.length - 2}
                    className="hidden md:flex p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 hover:scale-110 active:scale-95"
                    title="Next products"
                  >
                    <svg className="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Navigation Dots - Only show on mobile when there are multiple products */}
              {products.length > 1 && (
                <div className="flex justify-center mt-4 space-x-2 md:hidden">
                  {Array.from({ length: Math.max(1, products.length - 1) }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (index !== currentProductIndex) {
                          if (index > currentProductIndex) {
                            navigateToNext();
                          } else {
                            navigateToPrevious();
                          }
                        }
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentProductIndex
                          ? 'bg-white scale-125'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        
        {/* PromoButton Component - Only show when funnel is active - matches SeasonalStore exactly */}
        {isFunnelActive && (
          <div className="w-full max-w-3xl my-1 text-center mx-auto">
            {/* Promo Message */}
            {textStyles.promoMessage && textStyles.promoMessage.content && (
              <p
                className={`${textStyles.promoMessage.styleClass || 'text-2xl sm:text-3xl font-semibold drop-shadow-md'} mb-8 drop-shadow-md`}
                style={{ 
                  color: textStyles.promoMessage.color || 'rgb(255, 237, 213)', 
                  textShadow: 'rgba(0, 0, 0, 0.3) 1px 1px 2px'
                }}
              >
                {textStyles.promoMessage.content}
              </p>
            )}
            
            {/* Claim Button */}
            {promoButton && (
              <div className="relative w-full mt-8">
                <button
                  onClick={handleChatOpen}
                  className={`group relative z-10 flex items-center justify-center w-full py-4 text-xl rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ${promoButton.ringClass || 'ring-white/30 hover:ring-slate-400'} ${promoButton.buttonClass || 'bg-rose-600 hover:bg-rose-700 text-white'} shadow-2xl`}
                >
                  {promoButton.icon && (
                    <span className="mr-3 text-2xl animate-pulse">
                      {promoButton.icon}
                    </span>
                  )}
                  {promoButton.text || 'Claim Now'}
                </button>
                {/* Below-button glow (positioned vertically lower than the button) */}
                <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-6 w-full max-w-[110%] h-10 opacity-0 group-hover:opacity-60 blur-2xl transition-opacity duration-500 ${promoButton.ringHoverClass || 'bg-slate-400/40'}`}></span>
                <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-4 w-full max-w-[90%] h-8 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-500 ${promoButton.ringHoverClass || 'bg-slate-400/60'}`}></span>
              </div>
            )}
          </div>
        )}
        
        {/* Bottom padding to ensure content is never at the bottom */}
        <div className="h-20"></div>
        </div>
      </div>
      
      {/* Chat Resizing System - matches SeasonalStore exactly */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-white/40 dark:bg-black/40 backdrop-blur-md text-gray-900 dark:text-gray-100 shadow-2xl border-t border-b-0 border-white/20 dark:border-gray-700/20 transition-all duration-300 ease-in-out transform ${
        isChatOpen 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      }`}>
        <div className={`w-full flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          isChatOpen 
            ? isMobileDetected ? 'max-h-[100vh] opacity-100' : 'max-h-[50vh] opacity-100'
            : 'max-h-0 opacity-0'
        }`} style={{ 
          height: isChatOpen ? (isMobileDetected ? '100vh' : '50vh') : '0vh', 
          maxHeight: isChatOpen ? (isMobileDetected ? '100vh' : '50vh') : '0vh' 
        }}>
          {/* Beautiful Golden Separator Line */}
          <div className="absolute top-0 left-0 right-0 z-20">
            {/* Main golden line */}
            <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 via-amber-500 to-transparent shadow-lg shadow-yellow-500/30"></div>
            {/* Subtle glow effect */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-300 via-amber-400 to-transparent opacity-60 blur-sm"></div>
            {/* Animated shimmer effect */}
            <div className="h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
          </div>
          <div className="flex-1 overflow-hidden relative border-t border-yellow-500/20" style={{ height: '100%', maxHeight: '100%' }}>
            {funnelFlow && isFunnelActive ? (
              <UserChat
                funnelFlow={funnelFlow}
                conversationId={conversationId}
                conversation={conversation}
                experienceId={experienceId}
                onMessageSent={onMessageSent}
                userType={userType}
                stageInfo={stageInfo}
                onBack={handleChatClose}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-sm">
                <div className="text-center max-w-md mx-auto p-6">
                  <div className="w-16 h-16 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Live Funnel</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    There's no active funnel to chat with right now.
                  </p>
                  
                  <button
                    onClick={handleChatClose}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ProductCard Component
 * 
 * Renders individual product cards with animations and interactions
 */
interface ProductCardProps {
  product: any;
  onProductClick: () => void;
  onButtonClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onProductClick,
  onButtonClick,
}) => {
  // Use product styling classes like SeasonalStore
  const cardClass = product.cardClass || 'bg-amber-50/90 backdrop-blur-sm shadow-xl hover:shadow-2xl shadow-orange-500/30';
  const titleClass = product.titleClass || 'text-amber-900';
  const descClass = product.descClass || 'text-amber-900';
  const buttonBaseClass = product.buttonClass || 'bg-emerald-600 hover:bg-emerald-700 text-white';
  const buttonText = product.buttonText || 'View Details';

  return (
    <div className="relative max-w-xs mx-auto">
      {/* Blurred background for visual feedback - matches SeasonalStore exactly */}
      <div 
        className="absolute inset-0 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg"
        style={{ 
          zIndex: -1,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
          backdropFilter: 'blur(8px)'
        }}
      />
      
      {/* Main product card - matches SeasonalStore exactly */}
      <div 
        className={`rounded-2xl transition-all duration-300 ${cardClass} flex flex-col relative max-w-xs mx-auto overflow-hidden`}
        onClick={onProductClick}
      >
        {/* Image Section - Top Half - matches SeasonalStore exactly */}
        <div className="relative h-56 w-full">
          {/* Background Image - fills top half */}
          <div 
            className="absolute inset-0 rounded-t-2xl overflow-hidden"
            style={{
              backgroundImage: product.imageAttachmentUrl 
              ? `url(${product.imageAttachmentUrl})` 
              : product.image
                ? `url(${product.image})`
                : `url(https://placehold.co/400x400/c2410c/ffffff?text=${encodeURIComponent((product.name || 'Product').toUpperCase())})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: 'drop-shadow(rgba(232, 160, 2, 0.5) 0px 10px 10px)'
            }}
          />
        </div>
        
        {/* Drop Zone for Assets - covers entire card */}
        <div className="absolute inset-0 product-container-drop-zone" />
        
        {/* Text Content Section - Bottom Half - matches SeasonalStore exactly */}
        <div className="px-3 py-2 flex flex-col flex-grow text-center relative z-30">
          {/* Product Name */}
          <h2 
            className={`text-lg font-bold mb-0.5 ${titleClass}`}
            data-inline-product-name={product.id}
            style={{ cursor: 'default' }}
          >
            {product.name || 'Product Name'}
          </h2>
          
          {/* Product Description */}
          <p 
            className={`text-xs mb-1 ${descClass} flex-grow`}
            data-inline-product-desc={product.id}
            style={{ minHeight: '1.5rem', cursor: 'default' }}
          >
            {product.description || 'Product description'}
          </p>
          
          {/* Product Price */}
          <div className="text-xl font-extrabold mb-1 mt-auto">
            <span className={titleClass}>{`$${product.price?.toFixed(2) || '0.00'}`}</span>
          </div>
          
          {/* Product Button - matches SeasonalStore exactly */}
          <button 
            className={`w-full max-w-48 py-1.5 px-3 rounded-full font-bold uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] ${buttonBaseClass} shadow-xl ring-2 ring-offset-2 ring-offset-white mx-auto`}
            onClick={(e) => {
              e.stopPropagation();
              if (product.buttonLink) {
                // Handle button link navigation like SeasonalStore
                if (product.buttonLink.startsWith('http')) {
                  window.open(product.buttonLink, '_blank');
                } else {
                  window.location.href = product.buttonLink;
                }
              } else {
                // Default behavior: open chat
                onButtonClick();
              }
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};