'use client';

import React from 'react';
import { ArrowLeft, Settings, Package, Copy, Check } from 'lucide-react';
import { Button, Heading, Text } from 'frosted-ui';

interface TopNavbarProps {
  onBack?: () => void;
  editorState: {
    isEditorView: boolean;
  };
  showGenerateBgInNavbar: boolean;
  isChatOpen: boolean;
  isGeneratingBackground: boolean;
  loadingState: {
    isImageLoading: boolean;
  };
  promoButton: {
    text: string;
    buttonClass: string;
    ringClass: string;
    ringHoverClass: string;
    icon: string;
  };
  currentSeason: string;
  allThemes: Record<string, any>;
  legacyTheme: any;
  previewLiveTemplate?: any; // Template data with themeSnapshot
  hideEditorButtons?: boolean;
  isStorePreview?: boolean; // New prop to indicate StorePreview context
  highlightSaveButton?: boolean; // New prop to highlight save button after generation
  hasUnsavedChanges?: boolean; // Track if there are unsaved changes
  isTemplateManagerOpen?: boolean; // Track if Market Manager modal is open
  discountSettings?: {
    enabled: boolean;
    discountText: string;
    promoCode?: string;
    startDate: string;
    endDate: string;
    prePromoMessages?: Array<{ 
      message: string; 
      offsetHours: number;
      sendAsEmail?: boolean;
      emailSubject?: string;
      emailContent?: string;
      isEmailHtml?: boolean;
    }>;
    activePromoMessages?: Array<{ 
      message: string; 
      offsetHours: number;
      sendAsEmail?: boolean;
      emailSubject?: string;
      emailContent?: string;
      isEmailHtml?: boolean;
    }>;
  };
  
  // Handlers
  toggleEditorView: () => void;
  handleGenerateBgClick: () => void;
  handleBgImageUpload: (file: File) => void;
  handleSaveTemplate: () => void;
  onResetChanges?: () => void;
  toggleAdminSheet: () => void;
  openTemplateManager: () => void;
  handleAddProduct: () => void;
  setIsChatOpen: (open: boolean) => void;
  setCurrentSeason: (season: string) => void;
  getHoverRingClass: (ringClass: string) => string;
  getGlowBgClass: (ringClass: string) => string;
  getGlowBgStrongClass: (ringClass: string) => string;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onBack,
  editorState,
  showGenerateBgInNavbar,
  isChatOpen,
  isGeneratingBackground,
  loadingState,
  promoButton,
  currentSeason,
  allThemes,
  legacyTheme,
  previewLiveTemplate,
  hideEditorButtons = false,
  isStorePreview = false,
  highlightSaveButton = false,
  hasUnsavedChanges = false,
  isTemplateManagerOpen = false,
  discountSettings,
  toggleEditorView,
  handleGenerateBgClick,
  handleBgImageUpload,
  handleSaveTemplate,
  onResetChanges,
  toggleAdminSheet,
  openTemplateManager,
  handleAddProduct,
  setIsChatOpen,
  setCurrentSeason,
  getHoverRingClass,
  getGlowBgClass,
  getGlowBgStrongClass,
}) => {
  // Get accent color - same logic as ProductCard: product.buttonClass || theme.accent
  // ProductCard uses: buttonBaseClass = product.buttonClass || theme.accent
  // We check: promoButton.buttonClass (from template) || first product.buttonClass || themeSnapshot.accentColor || legacyTheme.accent
  const getAccentColor = () => {
    // 1. Check promoButton.buttonClass (comes from template when loaded, same as products)
    if (promoButton?.buttonClass) {
      return promoButton.buttonClass;
    }
    
    // 2. If template is loaded, use themeSnapshot accentColor
    if (previewLiveTemplate?.themeSnapshot?.accentColor) {
      return previewLiveTemplate.themeSnapshot.accentColor;
    }
    
    // 3. Fallback to legacyTheme.accent (database theme)
    return legacyTheme?.accent;
  };

  const accentColor = getAccentColor();

  // Check if Theme Accent is selected (buttonClass equals legacyTheme.accent)
  const isThemeAccentSelected = promoButton?.buttonClass === legacyTheme?.accent;

  // Extract color from accent for border
  // Example: "bg-emerald-600 hover:bg-emerald-700 text-white" -> "border-emerald-600"
  const getAccentBorderColor = () => {
    if (!accentColor) {
      // Fallback to indigo-500 accent color
      console.log('⚠️ TopNavbar: No accent color found, using fallback');
      return 'border-indigo-500';
    }
    
    // Extract bg-color pattern (e.g., bg-emerald-600, bg-indigo-500)
    // The accent string can be like: "bg-indigo-500 hover:bg-indigo-600 text-white ring-indigo-400"
    const bgMatch = accentColor.match(/bg-([a-z]+-\d+)/);
    if (bgMatch && bgMatch[1]) {
      const color = bgMatch[1];
      return `border-${color}`;
    }
    
    // Fallback to indigo-500 accent color if pattern doesn't match
    console.log('⚠️ TopNavbar: Could not extract color from accent, using fallback');
    return 'border-indigo-500';
  };

  const accentBorderColor = getAccentBorderColor();

  // Extract color info for gradient when Theme Accent is selected
  const getGradientBorderInfo = () => {
    if (!isThemeAccentSelected || !legacyTheme?.accent) {
      return null;
    }
    
    // Extract bg-color pattern (e.g., bg-indigo-500, bg-emerald-600)
    const bgMatch = legacyTheme.accent.match(/bg-([a-z]+)-(\d+)/);
    if (bgMatch && bgMatch[1] && bgMatch[2]) {
      const colorName = bgMatch[1];
      const shade = parseInt(bgMatch[2], 10);
      // Use lighter shade for gradient (subtract 100 or use 400)
      const lighterShade = Math.max(300, shade - 100);
      const mainShade = shade;
      
      // Tailwind color to RGB mapping for common colors
      const colorMap: Record<string, Record<number, string>> = {
        indigo: { 300: 'rgb(165, 180, 252)', 400: 'rgb(129, 140, 248)', 500: 'rgb(99, 102, 241)', 600: 'rgb(79, 70, 229)' },
        violet: { 300: 'rgb(196, 181, 253)', 400: 'rgb(167, 139, 250)', 500: 'rgb(139, 92, 246)', 600: 'rgb(124, 58, 237)' },
        purple: { 300: 'rgb(196, 181, 253)', 400: 'rgb(167, 139, 250)', 500: 'rgb(168, 85, 247)', 600: 'rgb(147, 51, 234)' },
        blue: { 300: 'rgb(147, 197, 253)', 400: 'rgb(96, 165, 250)', 500: 'rgb(59, 130, 246)', 600: 'rgb(37, 99, 235)' },
        emerald: { 300: 'rgb(110, 231, 183)', 400: 'rgb(52, 211, 153)', 500: 'rgb(16, 185, 129)', 600: 'rgb(5, 150, 105)' },
        green: { 300: 'rgb(134, 239, 172)', 400: 'rgb(74, 222, 128)', 500: 'rgb(34, 197, 94)', 600: 'rgb(22, 163, 74)' },
        red: { 300: 'rgb(252, 165, 165)', 400: 'rgb(248, 113, 113)', 500: 'rgb(239, 68, 68)', 600: 'rgb(220, 38, 38)' },
        orange: { 300: 'rgb(253, 186, 116)', 400: 'rgb(251, 146, 60)', 500: 'rgb(249, 115, 22)', 600: 'rgb(234, 88, 12)' },
        amber: { 300: 'rgb(252, 211, 77)', 400: 'rgb(251, 191, 36)', 500: 'rgb(245, 158, 11)', 600: 'rgb(217, 119, 6)' },
        yellow: { 300: 'rgb(253, 224, 71)', 400: 'rgb(250, 204, 21)', 500: 'rgb(234, 179, 8)', 600: 'rgb(202, 138, 4)' },
        pink: { 300: 'rgb(249, 168, 212)', 400: 'rgb(244, 114, 182)', 500: 'rgb(236, 72, 153)', 600: 'rgb(219, 39, 119)' },
        rose: { 300: 'rgb(253, 164, 175)', 400: 'rgb(251, 113, 133)', 500: 'rgb(244, 63, 94)', 600: 'rgb(225, 29, 72)' },
        cyan: { 300: 'rgb(103, 232, 249)', 400: 'rgb(34, 211, 238)', 500: 'rgb(6, 182, 212)', 600: 'rgb(8, 145, 178)' },
        teal: { 300: 'rgb(94, 234, 212)', 400: 'rgb(45, 212, 191)', 500: 'rgb(20, 184, 166)', 600: 'rgb(13, 148, 136)' },
        slate: { 300: 'rgb(203, 213, 225)', 400: 'rgb(148, 163, 184)', 500: 'rgb(100, 116, 139)', 600: 'rgb(71, 85, 105)' },
        gray: { 300: 'rgb(209, 213, 219)', 400: 'rgb(156, 163, 175)', 500: 'rgb(107, 114, 128)', 600: 'rgb(75, 85, 99)' },
      };
      
      const lighterColor = colorMap[colorName]?.[lighterShade] || colorMap[colorName]?.[400] || 'rgb(129, 140, 248)';
      const mainColor = colorMap[colorName]?.[mainShade] || colorMap[colorName]?.[500] || 'rgb(99, 102, 241)';
      const glowColor = colorMap[colorName]?.[mainShade] || colorMap[colorName]?.[500] || 'rgb(99, 102, 241)';
      
      return {
        gradient: `linear-gradient(to right, transparent, ${lighterColor}, ${mainColor}, transparent)`,
        glow: `linear-gradient(to right, transparent, ${colorMap[colorName]?.[300] || lighterColor}, ${colorMap[colorName]?.[400] || mainColor}, transparent)`,
        shadowColor: glowColor,
      };
    }
    
    // Fallback to indigo gradient
    return {
      gradient: 'linear-gradient(to right, transparent, rgb(129, 140, 248), rgb(99, 102, 241), transparent)',
      glow: 'linear-gradient(to right, transparent, rgb(165, 180, 252), rgb(129, 140, 248), transparent)',
      shadowColor: 'rgb(99, 102, 241)',
    };
  };

  const gradientBorderInfo = getGradientBorderInfo();

  // Real-time timer state
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [promoCopied, setPromoCopied] = React.useState(false);
  const [showPromoNotification, setShowPromoNotification] = React.useState(false);
  const [isNotificationAnimating, setIsNotificationAnimating] = React.useState(false);

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle promo notification animation and auto-close
  React.useEffect(() => {
    if (showPromoNotification) {
      setIsNotificationAnimating(true);
      const timer = setTimeout(() => {
        setIsNotificationAnimating(false);
        setTimeout(() => {
          setShowPromoNotification(false);
        }, 300);
      }, 1200); // Show for 1.2 seconds, then fade out
      return () => clearTimeout(timer);
    }
  }, [showPromoNotification]);

  const getTimeParts = (diff: number) => {
    if (diff <= 0) return null;
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  };

  // Check if promo is currently active
  const isPromoActive = React.useMemo(() => {
    if (!discountSettings?.startDate || !discountSettings?.endDate) {
      return false;
    }
    const now = currentTime;
    const start = new Date(discountSettings.startDate);
    const end = new Date(discountSettings.endDate);
    return now >= start && now <= end;
  }, [discountSettings?.startDate, discountSettings?.endDate, currentTime]);

  // Calculate time until start (when discount is set but not active)
  const timeUntilStart = React.useMemo(() => {
    if (!discountSettings?.startDate || isPromoActive) return null;
    const now = currentTime;
    const start = new Date(discountSettings.startDate);
    const diff = start.getTime() - now.getTime();
    
    return getTimeParts(diff);
  }, [discountSettings?.startDate, isPromoActive, currentTime]);

  // Calculate time remaining until end (when discount is active)
  const timeRemaining = React.useMemo(() => {
    if (!isPromoActive || !discountSettings?.endDate) return null;
    const now = currentTime;
    const end = new Date(discountSettings.endDate);
    const diff = end.getTime() - now.getTime();
    
    return getTimeParts(diff);
  }, [isPromoActive, discountSettings?.endDate, currentTime]);

  const promoCode = discountSettings?.promoCode?.trim() || '';
  const countdownInfo = timeRemaining || timeUntilStart;
  
  // Debug: Log promo code status
  React.useEffect(() => {
    console.log('🔍 Promo code debug:', {
      hasDiscountSettings: !!discountSettings,
      promoCodeRaw: discountSettings?.promoCode,
      promoCodeTrimmed: promoCode,
      hasPromoCode: !!promoCode,
      discountSettings: discountSettings
    });
  }, [discountSettings, promoCode]);
  
  const countdownLabel = timeRemaining ? 'Ends in:' : timeUntilStart ? 'Starts in:' : '';
  const formatTimeUnit = (value: number) => value.toString().padStart(2, '0');
  const showPromoTimerCard = Boolean(countdownInfo && discountSettings?.startDate && discountSettings?.endDate);

  const handlePromoCardCopy = React.useCallback(() => {
    console.log('🔵 handlePromoCardCopy called', { promoCode, hasPromoCode: !!promoCode });
    if (!promoCode) {
      console.log('⚠️ No promo code, returning early');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(promoCode).then(() => {
        console.log('✅ Promo code copied to clipboard:', promoCode);
        setPromoCopied(true);
        setIsNotificationAnimating(true);
        setShowPromoNotification(true);
        setTimeout(() => setPromoCopied(false), 1500);
      }).catch((err) => {
        console.error('❌ Failed to copy promo code:', err);
        setPromoCopied(false);
      });
    } else {
      console.log('⚠️ Clipboard API not available');
    }
  }, [promoCode]);

  const handlePromoCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!promoCode) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePromoCardCopy();
    }
  };

  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes saveHighlight {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.4);
            transform: scale(1.05);
          }
        }
        @keyframes savePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes tooltipPulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .save-highlight {
          animation: saveHighlight 2s ease-in-out infinite;
        }
        .save-pulse {
          animation: savePulse 1.5s ease-in-out infinite;
        }
        .tooltip-pulse {
          animation: tooltipPulse 2s ease-in-out infinite;
        }
        .pulse-animation {
          animation: pulse 2s ease-in-out infinite;
        }
        .shine-animation::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shine 3s ease-in-out infinite;
          border-radius: inherit;
        }
        @keyframes dash {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: 282.6; }
        }
        @keyframes minuteSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes hourSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-dash {
          animation: dash 6s linear infinite;
        }
        .animate-minute-hand {
          transform-origin: 50% 50%;
          animation: minuteSweep 4s linear infinite;
        }
        .animate-hour-hand {
          transform-origin: 50% 50%;
          animation: hourSweep 8s linear infinite;
        }
        .timer-chip {
          min-width: 38px;
          text-align: center;
          border-radius: 12px;
          background: rgba(255,255,255,0.8);
          padding: 4px 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .dark .timer-chip {
          background: rgba(15,23,42,0.8);
          color: #f8fafc;
        }
        .promo-clock-hover {
          transition: all 0.3s ease-in-out;
        }
        .promo-clock-hover:hover {
          transform: scale(1.15);
          box-shadow: 0 0 20px rgba(225, 29, 72, 0.4), 0 0 40px rgba(225, 29, 72, 0.2);
        }
        .promo-clock-hover:hover img {
          filter: brightness(1.1);
        }
        .promo-card-hover {
          transition: all 0.3s ease-in-out;
        }
        .promo-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px rgba(225, 29, 72, 0.3), 0 0 20px rgba(225, 29, 72, 0.2);
        }
        @keyframes slideInBounce {
          0% { transform: translate(-50%, -100%); opacity: 0; }
          60% { transform: translate(-50%, 10px); opacity: 1; }
          80% { transform: translate(-50%, -5px); }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideOutBounce {
          0% { transform: translate(-50%, 0); opacity: 1; }
          20% { transform: translate(-50%, -10px); opacity: 0.8; }
          100% { transform: translate(-50%, -100%); opacity: 0; }
        }
        .promo-notification-slide-in { animation: slideInBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards; }
        .promo-notification-slide-out { animation: slideOutBounce 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards; }
        .promo-notification-container { opacity: 0; transform: translate(-50%, -100%); }
      `}</style>            <div className="sticky top-4 z-30 flex-shrink-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6" data-prevent-bg-toggle="true">
        <div className={`min-h-[80px] py-3 px-4 sm:px-6 lg:px-8 shadow-lg rounded-lg relative overflow-hidden flex flex-col justify-center ${
          editorState.isEditorView 
            ? 'bg-white dark:bg-gray-900' 
            : 'bg-transparent'
        }`}>
          {/* Accent border line at bottom - matches ProductCard button color - Only in Editor View */}
          {editorState.isEditorView && (
            <>
              {isThemeAccentSelected && gradientBorderInfo ? (
                <>
                  {/* Main gradient line */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1.5 shadow-lg" 
                    style={{ 
                      background: gradientBorderInfo.gradient,
                      boxShadow: `0 0 10px ${gradientBorderInfo.shadowColor}40`
                    }}
                  ></div>
                  {/* Subtle glow effect */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60 blur-sm" 
                    style={{ background: gradientBorderInfo.glow }}
                  ></div>
                  {/* Animated shimmer effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
                </>
              ) : (
            <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${accentBorderColor.replace('border-', 'bg-')}`}></div>
              )}
            </>
          )}
        {/* Title Section - Only in Editor View */}
        {!hideEditorButtons && editorState.isEditorView && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button
                  size="2"
                  variant="ghost"
                  color="gray"
                  onClick={onBack}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </Button>
              )}
              <div className="hidden sm:block">
                <Heading
                  size="6"
                  weight="bold"
                  className="text-black dark:text-white"
                >
                  Seasonal Market
                </Heading>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Market Manager Button (when there are no unsaved changes and Market Manager is not open) */}
              {!hasUnsavedChanges && !isTemplateManagerOpen && (
                <Button
                  size="3"
                  color="violet"
                  variant="surface"
                  onClick={openTemplateManager}
                  className="px-3 sm:px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
                  title="Market Manager"
                >
                  <Settings
                    size={20}
                    strokeWidth={2.5}
                    className="group-hover:rotate-90 transition-transform duration-300"
                  />
                  <span className="ml-1 hidden sm:inline">Market Manager</span>
                </Button>
              )}
              {/* Save and Reset Buttons (when there are unsaved changes) */}
              {hasUnsavedChanges && (
                <>
                  {/* Reset Button */}
                  {onResetChanges && (
                    <Button
                      size="3"
                      color="gray"
                      variant="soft"
                      onClick={onResetChanges}
                      className="px-4 py-3 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105 transition-all duration-300 group"
                      title="Reset Changes"
                    >
                      <svg 
                        className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform duration-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </Button>
                  )}
                  {/* Save Button */}
                  <Button
                    size="3"
                    color="violet"
                    onClick={handleSaveTemplate}
                    className={`px-3 sm:px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group ${
                      highlightSaveButton ? 'save-highlight save-pulse shadow-violet-500/50 hover:shadow-violet-500/60' : ''
                    }`}
                    title="Save Changes"
                  >
                    <svg 
                      className="w-5 h-5 sm:mr-2 group-hover:scale-110 transition-transform duration-300" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span className="hidden sm:inline">Save</span>
                  </Button>
                </>
              )}
              {/* Products Button */}
              <Button
                size="3"
                color="violet"
                onClick={handleAddProduct}
                className="px-3 sm:px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
                title="Select Products"
              >
                <Package
                  size={20}
                  strokeWidth={2.5}
                  className="group-hover:scale-110 transition-transform duration-300"
                />
                <span className="ml-1 hidden sm:inline">Products</span>
              </Button>
            </div>
          </div>
        )}
            
        {/* Hide Chat Button when chat is open (outside editor view or when no unsaved changes) */}
        {isChatOpen && (!hasUnsavedChanges || hideEditorButtons || !editorState.isEditorView) && (
          <div className="flex justify-center items-center">
            <div className="relative">
              <button 
                onClick={() => setIsChatOpen(false)}
                className={`group relative z-10 flex items-center justify-center px-3 sm:px-6 py-3 text-sm rounded-full font-bold uppercase tracking-widest transition-all duration-500 transform hover:scale-[1.03] ring-4 ring-offset-4 ring-offset-white ${promoButton.ringClass} ${getHoverRingClass(promoButton.ringHoverClass)} ${promoButton.buttonClass} shadow-2xl`}
                title="Hide Chat"
              >
                {/* Chat Icon with 3 dots for Hide Chat */}
                <div className="w-5 h-5 text-white relative z-10 sm:mr-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {/* 3 Dots inside the circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex space-x-0.5">
                      <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                      <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                      <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold hidden sm:inline">HIDE CHAT</span>
              </button>
              {/* Below-button glow (positioned vertically lower than the button) */}
              <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-3 w-full max-w-[110%] h-6 opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-500 ${getGlowBgClass(promoButton.ringHoverClass)}`}></span>
              <span className={`pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 w-full max-w-[90%] h-4 opacity-0 group-hover:opacity-90 blur-lg transition-opacity duration-500 ${getGlowBgStrongClass(promoButton.ringHoverClass)}`}></span>
            </div>
          </div>
        )}
        
        {/* Preview Mode: Back button and Discount Text */}
        {isStorePreview && !editorState.isEditorView && !isChatOpen && (
          <div className="flex items-center justify-between w-full">
            {onBack && (
              <Button
                size="3"
                color="violet"
                onClick={onBack || (() => window.history.back())}
                className="px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 relative overflow-hidden"
                aria-label="Back"
                title="Back"
              >
                <ArrowLeft size={20} strokeWidth={2.5} />
                {/* Accent border line at bottom - matches TopNavbar border style, within button */}
                {isThemeAccentSelected && gradientBorderInfo ? (
                  <>
                    {/* Main gradient line */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1.5 shadow-lg" 
                      style={{ 
                        background: gradientBorderInfo.gradient,
                        boxShadow: `0 0 10px ${gradientBorderInfo.shadowColor}40`
                      }}
                    ></div>
                    {/* Subtle glow effect */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-0.5 opacity-60 blur-sm" 
                      style={{ background: gradientBorderInfo.glow }}
                    ></div>
                  </>
                ) : (
                <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${accentBorderColor.replace('border-', 'bg-')}`}></div>
                )}
              </Button>
            )}
            
            {/* Discount Text, Promo Code and Timers in Middle */}
            <div className="flex-1 flex items-center justify-center">
              {showPromoTimerCard && countdownInfo && (
                <div
                  className={`promo-card promo-card-hover group relative w-full sm:w-auto sm:max-w-3xl px-4 py-3 sm:px-6 rounded-2xl border border-rose-200/60 dark:border-rose-500/30 shadow-xl overflow-hidden ${promoCode ? 'cursor-pointer' : 'cursor-default'}`}
                  role={promoCode ? 'button' : undefined}
                  tabIndex={promoCode ? 0 : undefined}
                  onClick={(e) => {
                    console.log('🔵 Parent div clicked', { promoCode, hasPromoCode: !!promoCode, target: e.target });
                    if (promoCode) {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePromoCardCopy();
                    }
                  }}
                  onKeyDown={promoCode ? handlePromoCardKeyDown : undefined}
                  aria-label={promoCode ? `Copy promo code ${promoCode}` : undefined}
                >
                  <div className="absolute inset-0 rounded-2xl bg-[var(--subtitleBgColorStatic,#FEEBEB)] dark:bg-rose-900/60 opacity-95 pointer-events-none"></div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-50/90 via-white to-amber-50/80 dark:from-rose-900/50 dark:via-slate-900/80 dark:to-amber-900/40 pointer-events-none"></div>
                  <div className={`relative z-10 flex flex-wrap items-center gap-4 text-left ${promoCode ? 'justify-between w-full' : 'justify-start'}`}>
                    <div className={`flex items-center gap-4 flex-wrap ${promoCode ? 'flex-1 min-w-0' : ''}`}>
                      {discountSettings?.discountText && (
                        <span 
                          className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                          dangerouslySetInnerHTML={{ __html: discountSettings.discountText }}
                        />
                      )}
                      <div className="promo-clock-hover relative w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 shadow-inner flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer">
                        <img
                          src="https://ae01.alicdn.com/kf/S1fa2ebed8eb04c4597523704c386ff5ag/48x48.gif"
                          alt="Promo clock animation"
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 rounded-full border border-white/60 dark:border-white/20 pointer-events-none"></span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                        {countdownLabel && (
                          <span className="text-sm sm:text-base uppercase tracking-wider text-rose-600 dark:text-rose-200 whitespace-nowrap">
                            {countdownLabel}
                          </span>
                        )}
                        <div className="flex items-center text-lg sm:text-2xl font-bold tracking-widest gap-2">
                          <span className="timer-chip">{formatTimeUnit(countdownInfo.hours)}</span>
                          <span className="font-medium">:</span>
                          <span className="timer-chip">{formatTimeUnit(countdownInfo.minutes)}</span>
                          <span className="font-medium">:</span>
                          <span className="timer-chip">{formatTimeUnit(countdownInfo.seconds)}</span>
                        </div>
                      </div>
                    </div>

                    {promoCode && (
                      <div className="flex items-center">
                        {promoCopied ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    
    {/* Promo Code Copy Notification */}
    {showPromoNotification && (
      <div className={`fixed top-0 left-1/2 z-[1000] promo-notification-container ${isNotificationAnimating ? 'promo-notification-slide-in' : 'promo-notification-slide-out'}`}>
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 rounded-b-xl shadow-2xl border-b-2 border-rose-400 p-3 min-w-[280px] max-w-[350px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white">
                Promo Code Copied!
              </h3>
            </div>
          </div>

          {/* Message */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className="text-white text-xs font-medium">
              {promoCode}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};