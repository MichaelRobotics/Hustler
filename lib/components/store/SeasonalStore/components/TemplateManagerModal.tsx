'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { LiveTemplateCard } from './templates/LiveTemplateCard';
import { ShopCarousel } from './templates/ShopCarousel';
import { SeasonalDiscountPanel } from './templates/SeasonalDiscountPanel';
import { apiPost } from '@/lib/utils/api-client';
import type { DiscountSettings } from '../types';

interface Template {
  id: string;
  name: string;
  templateData: {
    products: any[];
    floatingAssets: any[];
    discountSettings?: DiscountSettings;
    oneTimeDiscounts?: any[];
  };
  currentSeason: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TemplateManagerModalProps {
  isOpen: boolean;
  isAnimating: boolean;
  templates: Template[];
  liveTemplate: Template | null;
  highlightedTemplateId?: string;
  originTemplate?: any | null;
  backgroundAnalysis: {
    recommendedTextColor: string;
  };
  maxTemplates?: number;
  discountSettings?: DiscountSettings;
  products?: any[];
  subscription?: "Basic" | "Pro" | "Vip" | null;
  experienceId?: string; // Experience ID for delete operations
  
  // Handlers
  onClose: () => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  setLiveTemplate: (id: string) => void;
  onMakePublic?: (templateId: string) => void;
  onPreview?: (templateId: string) => void;
  onRenameTemplate?: (templateId: string, updates: { name?: string }) => Promise<any>;
  onSaveDiscountSettings?: (templateId: string, settings: DiscountSettings) => Promise<void>;
  updateTemplate?: (templateId: string, updates: { templateData?: any }) => Promise<any>;
  setDiscountSettings?: (settings: DiscountSettings) => void;
  onCreateNewShop?: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  isAnimating,
  templates,
  liveTemplate,
  highlightedTemplateId,
  originTemplate,
  backgroundAnalysis,
  onClose,
  loadTemplate,
  deleteTemplate,
  setLiveTemplate,
  onMakePublic,
  onPreview,
  onRenameTemplate,
  onSaveDiscountSettings,
  updateTemplate,
  setDiscountSettings,
  onCreateNewShop,
  discountSettings,
  products = [],
  maxTemplates = 10,
  subscription,
  experienceId,
}) => {
  const [showSeasonalDiscountPanel, setShowSeasonalDiscountPanel] = useState(false);

  // Refs for scrolling
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const seasonalDiscountPanelRef = useRef<HTMLDivElement>(null);

  // Create default discount settings
  const createDefaultDiscountSettings = (): DiscountSettings => ({
    enabled: false,
    globalDiscount: false,
    globalDiscountType: 'percentage',
    globalDiscountAmount: 20,
    percentage: 20,
    startDate: '',
    endDate: '',
    discountText: '',
    promoCode: '',
    durationType: undefined,
    durationMonths: undefined,
    quantityPerProduct: undefined,
    prePromoMessages: [],
    activePromoMessages: [],
  });

  // Get initial discount settings for the live template
  const initialDiscountSettings = liveTemplate?.templateData?.discountSettings || discountSettings || createDefaultDiscountSettings();

  // Local state for discount settings (only saved when user clicks Save/Create Discount)
  const [localDiscountSettings, setLocalDiscountSettings] = useState<DiscountSettings>(initialDiscountSettings);

  // Sync local state when template changes, modal opens, or discountSettings prop updates
  useEffect(() => {
    // Prioritize discountSettings prop (fresh from parent) over liveTemplate (might be stale)
    // If discountSettings has seasonalDiscountId, use it; otherwise fall back to liveTemplate
    const newSettings = discountSettings?.seasonalDiscountId 
      ? discountSettings 
      : (liveTemplate?.templateData?.discountSettings || discountSettings || createDefaultDiscountSettings());
    
    setLocalDiscountSettings(newSettings);
    // Update discountWasSaved based on whether seasonalDiscountId exists
    setDiscountWasSaved(Boolean(newSettings.seasonalDiscountId));
  }, [liveTemplate?.templateData?.discountSettings, discountSettings, liveTemplate?.id]);

  // Get discount settings for display (use local state)
  const templateDiscountSettings = localDiscountSettings;

  // Track if discount was saved in this session (to update button text after first save)
  const [discountWasSaved, setDiscountWasSaved] = useState(
    Boolean(liveTemplate?.templateData?.discountSettings?.seasonalDiscountId)
  );

  // Check if discount already exists in the saved template OR was saved in this session
  // Prioritize discountSettings prop (fresh from parent) over liveTemplate (might be stale)
  const hasExistingDiscount = Boolean(
    discountSettings?.seasonalDiscountId ||
    localDiscountSettings.seasonalDiscountId || 
    liveTemplate?.templateData?.discountSettings?.seasonalDiscountId
  );

  // Real-time timer state for discount status tracking
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to format time differences
  const getTimeParts = useCallback((diff: number) => {
    if (diff <= 0) return null;
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  }, []);

  // Calculate if promo is currently active (real-time)
  const isPromoActive = useMemo(() => {
    if (!templateDiscountSettings.startDate || !templateDiscountSettings.endDate) {
      return false;
    }
    const now = currentTime;
    const start = new Date(templateDiscountSettings.startDate);
    const end = new Date(templateDiscountSettings.endDate);
    return now >= start && now <= end;
  }, [templateDiscountSettings.startDate, templateDiscountSettings.endDate, currentTime]);

  // Calculate if discount has expired (real-time)
  const isExpired = useMemo(() => {
    if (!templateDiscountSettings.endDate) {
      return false;
    }
    const now = currentTime;
    const end = new Date(templateDiscountSettings.endDate);
    return now > end;
  }, [templateDiscountSettings.endDate, currentTime]);

  // Calculate time until start (when discount is set but not active)
  const timeUntilStart = useMemo(() => {
    if (!templateDiscountSettings.startDate || isPromoActive) return null;
    const now = currentTime;
    const start = new Date(templateDiscountSettings.startDate);
    const diff = start.getTime() - now.getTime();
    return getTimeParts(diff);
  }, [templateDiscountSettings.startDate, isPromoActive, currentTime, getTimeParts]);

  // Calculate time remaining until end (when discount is active)
  const timeRemaining = useMemo(() => {
    if (!isPromoActive || !templateDiscountSettings.endDate) return null;
    const now = currentTime;
    const end = new Date(templateDiscountSettings.endDate);
    const diff = end.getTime() - now.getTime();
    return getTimeParts(diff);
  }, [isPromoActive, templateDiscountSettings.endDate, currentTime, getTimeParts]);

  // Scroll to seasonal discount panel when it's shown
  useEffect(() => {
    if (showSeasonalDiscountPanel && seasonalDiscountPanelRef.current && contentScrollRef.current) {
      // Delay to ensure the panel is fully rendered and expanded
      const timeoutId = setTimeout(() => {
        const panelElement = seasonalDiscountPanelRef.current;
        const scrollContainer = contentScrollRef.current;
        if (panelElement && scrollContainer) {
          // Get the position of the panel relative to the scroll container
          const containerRect = scrollContainer.getBoundingClientRect();
          const panelRect = panelElement.getBoundingClientRect();
          
          // Calculate scroll position: panel top relative to container top
          const scrollTop = scrollContainer.scrollTop;
          const panelTopRelativeToContainer = panelRect.top - containerRect.top + scrollTop;
          
          // Scroll to show the panel with some padding from the top
          scrollContainer.scrollTo({
            top: panelTopRelativeToContainer - 20, // 20px padding from top
            behavior: 'smooth',
          });
        }
      }, 150); // Delay to ensure panel is fully expanded

      return () => clearTimeout(timeoutId);
    }
  }, [showSeasonalDiscountPanel]);
  
  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        @keyframes makePublicPulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.3);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: 0 0 0 12px rgba(34, 197, 94, 0), 0 0 40px rgba(34, 197, 94, 0.5);
          }
        }
        .make-public-pulse {
          animation: makePublicPulse 3s ease-in-out infinite;
        }
      `}</style>
      <div
      className={`fixed inset-0 z-50 flex items-stretch justify-end transition-opacity duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shop Manager"
          className={`w-full max-w-md h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-2xl transform transition-transform duration-300 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <h3 className="text-lg font-semibold tracking-wide flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Shop Manager
          </h3>
          <button
            onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {/* Content */}
          <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950 min-h-0">
            {/* Live Template Section */}
            {liveTemplate && (
              <LiveTemplateCard
                template={liveTemplate}
                onPreview={onPreview ? (id) => {
                  onPreview(id);
                  onClose();
                } : undefined}
                onClose={onClose}
              />
            )}

            {/* Templates Carousel */}
            <ShopCarousel
              templates={templates}
              liveTemplateId={liveTemplate?.id}
              highlightedTemplateId={highlightedTemplateId}
              originTemplate={originTemplate}
              onDeleteTemplate={deleteTemplate}
              onSetLive={(id) => {
                setLiveTemplate(id);
                if (onMakePublic) {
                  onMakePublic(id);
                }
                onClose();
              }}
              onPreview={onPreview ? (id) => {
                onPreview(id);
                onClose();
              } : undefined}
              onRenameTemplate={onRenameTemplate}
              onMakePublic={onMakePublic}
              onCreateNewShop={onCreateNewShop}
              onClose={onClose}
            />

            {/* Discount Management Panels - Only show if live template exists */}
            {liveTemplate && (
              <>
                <div className="mt-4 space-y-3">
                  <div ref={seasonalDiscountPanelRef}>
                    <SeasonalDiscountPanel
                    discountSettings={templateDiscountSettings}
                    onSettingsChange={(settings) => {
                      // Only update local state - don't save to database yet
                      setLocalDiscountSettings(settings);
                    }}
                    onSave={async () => {
                      // Save to database only when user clicks Save/Create Discount
                      if (onSaveDiscountSettings && localDiscountSettings) {
                        // Check if this is a create operation (no seasonalDiscountId)
                        const wasCreate = !localDiscountSettings.seasonalDiscountId;
                        
                        try {
                          await onSaveDiscountSettings(liveTemplate.id, localDiscountSettings);
                          
                          // After save, the save handler updates the template with seasonalDiscountId and calls setDiscountSettings
                          // Sync local state from the updated discountSettings prop (which gets updated by setDiscountSettings in the save handler)
                          // Use a small delay to ensure parent state has updated
                          setTimeout(() => {
                            // Prioritize discountSettings prop (fresh from setDiscountSettings) over liveTemplate
                            const updatedSettings = discountSettings?.seasonalDiscountId
                              ? discountSettings
                              : (liveTemplate?.templateData?.discountSettings || localDiscountSettings);
                            
                            setLocalDiscountSettings(updatedSettings);
                            setDiscountWasSaved(Boolean(updatedSettings.seasonalDiscountId));
                          }, 100);
                        } catch (error) {
                          // Handle promo code exists error
                          if (error instanceof Error && error.message === 'PROMO_CODE_EXISTS') {
                            alert('A promo code with this name already exists. Please choose a different code for the promo.');
                            return; // Abort - don't save discount
                          }
                          // Re-throw other errors
                          throw error;
                        }
                      }
                    }}
                    onDelete={async () => {
                      if (!experienceId) {
                        console.error('Experience ID is required to delete discount');
                        return;
                      }

                      try {
                        // Call API endpoint to delete promos (promo code will be fetched from experience by the server)
                        const response = await apiPost(
                          '/api/seasonal-discount/delete',
                          { experienceId },
                          experienceId
                        );

                        if (!response.ok) {
                          throw new Error('Failed to delete seasonal discount promos');
                        }

                        // Clear discount settings from template directly (don't call onSaveDiscountSettings to avoid regenerating discount)
                        if (updateTemplate && liveTemplate) {
                          await updateTemplate(liveTemplate.id, {
                            templateData: {
                              ...liveTemplate.templateData,
                              discountSettings: undefined,
                            },
                          });
                        }

                        // Reset local state to default and update flags
                        const emptySettings: DiscountSettings = createDefaultDiscountSettings();
                        setLocalDiscountSettings(emptySettings);
                        setDiscountWasSaved(false);
                        // Update parent component's discountSettings state
                        if (setDiscountSettings) {
                          setDiscountSettings(emptySettings);
                        }
                      } catch (error) {
                        console.error('Error deleting seasonal discount:', error);
                        // Continue with clearing local state even if API call fails
                        const emptySettings: DiscountSettings = createDefaultDiscountSettings();
                        setLocalDiscountSettings(emptySettings);
                        setDiscountWasSaved(false);
                        // Update parent component's discountSettings state
                        if (setDiscountSettings) {
                          setDiscountSettings(emptySettings);
                        }
                        // Try to clear template even on error
                        if (updateTemplate && liveTemplate) {
                          try {
                            await updateTemplate(liveTemplate.id, {
                              templateData: {
                                ...liveTemplate.templateData,
                                discountSettings: undefined,
                              },
                            });
                          } catch (updateError) {
                            console.error('Error clearing template discount settings:', updateError);
                          }
                        }
                      }
                    }}
                    isPromoActive={isPromoActive}
                    timeRemaining={timeRemaining}
                    timeUntilStart={timeUntilStart}
                    isExpired={isExpired}
                    showPanel={showSeasonalDiscountPanel}
                    onTogglePanel={() => setShowSeasonalDiscountPanel(!showSeasonalDiscountPanel)}
                    subscription={subscription}
                    hasExistingDiscount={hasExistingDiscount}
                  />
                  </div>
          </div>
              </>
            )}
        </div>
      </div>
      </div>
    </>
  );
};
