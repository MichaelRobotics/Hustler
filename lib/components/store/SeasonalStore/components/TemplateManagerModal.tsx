'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LiveTemplateCard } from './templates/LiveTemplateCard';
import { ShopCarousel } from './templates/ShopCarousel';
import { SeasonalDiscountPanel } from './templates/SeasonalDiscountPanel';
import { OneTimeDiscountPanel } from './templates/OneTimeDiscountPanel';
import { MessageEditorModal, type DiscountMessage } from './templates/MessageEditorModal';
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
  
  // Handlers
  onClose: () => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  setLiveTemplate: (id: string) => void;
  onMakePublic?: (templateId: string) => void;
  onPreview?: (templateId: string) => void;
  onRenameTemplate?: (templateId: string, updates: { name?: string }) => Promise<any>;
  onSaveDiscountSettings?: (templateId: string, settings: DiscountSettings) => Promise<void>;
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
  onCreateNewShop,
  discountSettings,
  products = [],
  maxTemplates = 10,
}) => {
  const [showSeasonalDiscountPanel, setShowSeasonalDiscountPanel] = useState(false);
  const [showOneTimeDiscountPanel, setShowOneTimeDiscountPanel] = useState(false);
  const [messageEditorState, setMessageEditorState] = useState<{
    isOpen: boolean;
    type?: 'prePromo' | 'activePromo' | 'oneTime';
    index?: number;
  }>({ isOpen: false });
  const [currentMessage, setCurrentMessage] = useState<DiscountMessage | undefined>(undefined);
  const [oneTimeDiscounts, setOneTimeDiscounts] = useState<any[]>(
    liveTemplate?.templateData?.oneTimeDiscounts || []
  );
  const [oneTimeDiscountsSnapshot, setOneTimeDiscountsSnapshot] = useState<any[] | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Refs for scrolling
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const seasonalDiscountPanelRef = useRef<HTMLDivElement>(null);
  const oneTimeDiscountPanelRef = useRef<HTMLDivElement>(null);

  // Get discount settings for the live template
  const templateDiscountSettings = liveTemplate?.templateData?.discountSettings || discountSettings;

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

  // Scroll to one-time discount panel when it's shown
  useEffect(() => {
    if (showOneTimeDiscountPanel && oneTimeDiscountPanelRef.current && contentScrollRef.current) {
      // Delay to ensure the panel is fully rendered and expanded
      const timeoutId = setTimeout(() => {
        const panelElement = oneTimeDiscountPanelRef.current;
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
  }, [showOneTimeDiscountPanel]);

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
            {liveTemplate && templateDiscountSettings && (
              <>
                <div className="mt-4 space-y-3">
                  <div ref={seasonalDiscountPanelRef}>
                    <SeasonalDiscountPanel
                    discountSettings={templateDiscountSettings}
                    onSettingsChange={(settings) => {
                      // Update local state - will be saved when user clicks save
                      if (onSaveDiscountSettings) {
                        onSaveDiscountSettings(liveTemplate.id, settings);
                      }
                    }}
                    onSave={async () => {
                      if (onSaveDiscountSettings && templateDiscountSettings) {
                        await onSaveDiscountSettings(liveTemplate.id, templateDiscountSettings);
                      }
                    }}
                    onDelete={async () => {
                      // Delete discount settings
                      if (onSaveDiscountSettings) {
                        const emptySettings: DiscountSettings = {
                          enabled: false,
                          globalDiscount: false,
                          globalDiscountType: 'percentage',
                          globalDiscountAmount: 0,
                          percentage: 0,
                          startDate: '',
                          endDate: '',
                          discountText: '',
                          promoCode: '',
                          prePromoMessages: [],
                          activePromoMessages: [],
                        };
                        await onSaveDiscountSettings(liveTemplate.id, emptySettings);
                      }
                    }}
                    onOpenMessageEditor={(type, index) => {
                      setMessageEditorState({ isOpen: true, type, index });
                    }}
                    isPromoActive={false} // TODO: Calculate from dates
                    timeRemaining={null} // TODO: Calculate from dates
                    timeUntilStart={null} // TODO: Calculate from dates
                    showPanel={showSeasonalDiscountPanel}
                    onTogglePanel={() => setShowSeasonalDiscountPanel(!showSeasonalDiscountPanel)}
                  />
                  </div>

                  <div ref={oneTimeDiscountPanelRef}>
                    <OneTimeDiscountPanel
                    products={products}
                    discounts={oneTimeDiscounts}
                    onDiscountsChange={setOneTimeDiscounts}
                    selectedProductId={selectedProductId}
                    onSelectProduct={setSelectedProductId}
                    onOpenMessageEditor={(index) => {
                      // Get the one-time discount message
                      const discount = oneTimeDiscounts[index];
                      const message = discount?.messages?.[0] as DiscountMessage | undefined;
                      setCurrentMessage(message);
                      setMessageEditorState({ isOpen: true, type: 'oneTime', index });
                    }}
                    showPanel={showOneTimeDiscountPanel}
                    onTogglePanel={() => setShowOneTimeDiscountPanel(!showOneTimeDiscountPanel)}
                    onSave={() => {
                      // Save one-time discounts to template
                      if (onSaveDiscountSettings && liveTemplate) {
                        // TODO: Save one-time discounts to template data
                        console.log('Saving one-time discounts:', oneTimeDiscounts);
                      }
                    }}
                    discountsSnapshot={oneTimeDiscountsSnapshot}
                    onSetSnapshot={setOneTimeDiscountsSnapshot}
                  />
                  </div>
                </div>

                {/* Message Editor Modal */}
                <MessageEditorModal
                  isOpen={messageEditorState.isOpen}
                  onClose={() => {
                    setMessageEditorState({ isOpen: false });
                    setCurrentMessage(undefined);
                  }}
                  title={
                    messageEditorState.type === 'oneTime'
                      ? 'One-Time Discount Message'
                      : messageEditorState.type === 'prePromo'
                      ? 'Pre-Promo Message'
                      : 'Active Promo Message'
                  }
                  timingLabel={
                    messageEditorState.type === 'oneTime'
                      ? 'when discount is applied'
                      : messageEditorState.type === 'prePromo'
                      ? 'before discount starts'
                      : 'after discount starts'
                  }
                  message={currentMessage}
                  onMessageChange={(updates: Partial<DiscountMessage>) => {
                    const updatedMessage = { ...currentMessage, ...updates } as DiscountMessage;
                    setCurrentMessage(updatedMessage);
                    
                    // Save to appropriate discount settings
                    if (messageEditorState.type === 'oneTime' && messageEditorState.index !== undefined) {
                      const updatedDiscounts = [...oneTimeDiscounts];
                      if (!updatedDiscounts[messageEditorState.index].messages) {
                        updatedDiscounts[messageEditorState.index].messages = [];
                      }
                      if (updatedDiscounts[messageEditorState.index].messages.length === 0) {
                        updatedDiscounts[messageEditorState.index].messages.push(updatedMessage);
                      } else {
                        updatedDiscounts[messageEditorState.index].messages[0] = updatedMessage;
                      }
                      setOneTimeDiscounts(updatedDiscounts);
                    } else if (messageEditorState.type === 'prePromo' && messageEditorState.index !== undefined && onSaveDiscountSettings) {
                      const updatedSettings = {
                        ...templateDiscountSettings,
                        prePromoMessages: [...(templateDiscountSettings.prePromoMessages || [])],
                      };
                      updatedSettings.prePromoMessages[messageEditorState.index] = updatedMessage;
                      onSaveDiscountSettings(liveTemplate.id, updatedSettings);
                    } else if (messageEditorState.type === 'activePromo' && messageEditorState.index !== undefined && onSaveDiscountSettings) {
                      const updatedSettings = {
                        ...templateDiscountSettings,
                        activePromoMessages: [...(templateDiscountSettings.activePromoMessages || [])],
                      };
                      updatedSettings.activePromoMessages[messageEditorState.index] = updatedMessage;
                      onSaveDiscountSettings(liveTemplate.id, updatedSettings);
                    }
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
