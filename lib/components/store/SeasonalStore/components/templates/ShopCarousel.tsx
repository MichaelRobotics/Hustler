'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Heading, Text, Card } from 'frosted-ui';
import { ChevronLeft, ChevronRight, Eye, Trash2, Plus } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  templateData: {
    products: any[];
    floatingAssets: any[];
    discountSettings?: any;
  };
  currentSeason: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ShopCarouselProps {
  templates: Template[];
  liveTemplateId?: string;
  highlightedTemplateId?: string;
  currentlyLoadedTemplateId?: string | null;
  originTemplate?: any | null;
  onDeleteTemplate: (id: string) => void;
  onSetLive: (id: string) => void;
  onPreview?: (templateId: string, options?: { restorePrevious?: boolean }) => void;
  onRenameTemplate?: (templateId: string, updates: { name?: string }) => Promise<any>;
  onMakePublic?: (templateId: string) => void;
  onCreateNewShop?: () => void;
  onClose: () => void;
}

export const ShopCarousel: React.FC<ShopCarouselProps> = ({
  templates,
  liveTemplateId,
  highlightedTemplateId,
  currentlyLoadedTemplateId,
  originTemplate,
  onDeleteTemplate,
  onSetLive,
  onPreview,
  onRenameTemplate,
  onMakePublic,
  onCreateNewShop,
  onClose,
}) => {
  const [currentShopIndex, setCurrentShopIndex] = useState(0);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editingShopName, setEditingShopName] = useState<string>('');
  const shopNameInputRef = useRef<HTMLInputElement | null>(null);

  // Filter out live template and sort by update time
  const sortedTemplates = templates
    .filter(t => t.id !== liveTemplateId)
    .sort((a, b) => {
      const timeB = new Date((b.updatedAt || b.createdAt || new Date(0))).getTime();
      const timeA = new Date((a.updatedAt || a.createdAt || new Date(0))).getTime();
      return timeB - timeA;
    });

  // Focus input when editing
  useEffect(() => {
    if (editingShopId && shopNameInputRef.current) {
      shopNameInputRef.current.focus();
      shopNameInputRef.current.select();
    }
  }, [editingShopId]);

  const handleSaveShopName = async (templateId: string) => {
    if (onRenameTemplate && editingShopName.trim()) {
      await onRenameTemplate(templateId, { name: editingShopName.trim() });
    }
    setEditingShopId(null);
    setEditingShopName('');
  };

  if (sortedTemplates.length === 0) {
    return null;
  }

  const currentTemplate = sortedTemplates[currentShopIndex];

  const isCurrentlySelected = currentlyLoadedTemplateId === currentTemplate?.id;

  return (
    <div>
      <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mt-6 !mb-6 text-sm font-medium uppercase tracking-wider">
        Shops ({sortedTemplates.length})
      </Heading>
      
      {/* Navigation Arrows Above Template Card */}
      <div className="flex items-center gap-3 mb-3">
        <Button
          size="2"
          variant="ghost"
          color="gray"
          onClick={() => {
            setCurrentShopIndex(prev => 
              prev > 0 ? prev - 1 : sortedTemplates.length - 1
            );
          }}
          disabled={sortedTemplates.length === 0}
          className="!px-3 !py-3 min-w-[44px] min-h-[44px] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          title="Previous shop"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        {/* Selection Info - Flex container that centers when label is hidden */}
        <div className="flex-1 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Text size="2" className="text-gray-600 dark:text-gray-400">
            {currentShopIndex + 1} of {sortedTemplates.length}
          </Text>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 transition-all duration-300 whitespace-nowrap ${
            isCurrentlySelected 
              ? 'opacity-100 max-w-[200px] overflow-hidden text-ellipsis' 
              : 'opacity-0 max-w-0 overflow-hidden pointer-events-none'
          }`}>
            Currently Selected
          </span>
        </div>
        
        <Button
          size="2"
          variant="ghost"
          color="gray"
          onClick={() => {
            setCurrentShopIndex(prev => 
              prev < sortedTemplates.length - 1 ? prev + 1 : 0
            );
          }}
          disabled={sortedTemplates.length === 0}
          className="!px-3 !py-3 min-w-[44px] min-h-[44px] flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          title="Next shop"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Template Card */}
      <div className="mb-4">
          {currentTemplate && (
            <Card className="p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
              <div className="fui-reset">
              {/* Shop Name with Edit and Delete */}
                <div className="flex items-center gap-2 mb-4 min-w-0">
                  {editingShopId === currentTemplate.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        ref={shopNameInputRef}
                        type="text"
                        value={editingShopName}
                        onChange={(e) => setEditingShopName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveShopName(currentTemplate.id);
                          } else if (e.key === 'Escape') {
                            setEditingShopId(null);
                            setEditingShopName('');
                          }
                        }}
                        onBlur={() => handleSaveShopName(currentTemplate.id)}
                        className="flex-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 min-w-0"
                      />
                    </div>
                  ) : (
                    <>
                    {onRenameTemplate ? (
                      <Heading 
                        size="4" 
                        weight="semi-bold" 
                        className="text-foreground truncate flex-1 cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        onClick={() => {
                          setEditingShopId(currentTemplate.id);
                          setEditingShopName(currentTemplate.name);
                        }}
                        title="Click to rename"
                      >
                        {currentTemplate.name}
                      </Heading>
                    ) : (
                      <Heading size="4" weight="semi-bold" className="text-foreground truncate flex-1">
                        {currentTemplate.name}
                      </Heading>
                    )}
                        <Button
                          size="1"
                          variant="ghost"
                      color="red"
                          onClick={() => {
                        if (confirm('Are you sure you want to delete this shop?')) {
                          onDeleteTemplate(currentTemplate.id);
                          if (currentShopIndex >= sortedTemplates.length - 1) {
                            setCurrentShopIndex(Math.max(0, sortedTemplates.length - 2));
                          }
                        }
                          }}
                          className="!px-1.5 !py-1.5 flex-shrink-0"
                      title="Delete shop"
                        >
                      <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </>
                  )}
                </div>

                {/* Shop Info */}
                <div className="flex items-center gap-2 mb-4">
                  <Text size="2" className="text-gray-500 dark:text-gray-400">
                    {currentTemplate.templateData?.products?.length || 0} products
                  </Text>
                </div>

              {/* Action Buttons - Preview and Go Live Side by Side */}
                  <div className="flex items-center gap-2">
                    {onPreview && (
                      <Button
                        size="3"
                        color="violet"
                        variant="surface"
                        onClick={() => {
                          onPreview(currentTemplate.id, { restorePrevious: true });
                          onClose();
                        }}
                        className="flex-1 !px-4 !py-2.5 shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                      >
                        <Eye size={16} strokeWidth={2.5} />
                        <span>Preview</span>
                      </Button>
                    )}
                  <Button
                    size="3"
                    color="green"
                    variant="solid"
                    onClick={() => {
                      onSetLive(currentTemplate.id);
                      if (onMakePublic) {
                        onMakePublic(currentTemplate.id);
                      }
                      onClose();
                    }}
                  className={`flex-1 !px-6 !py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 flex items-center justify-center ${
                      currentTemplate.id === highlightedTemplateId ? 'make-public-pulse' : ''
                    }`}
                  >
                    <span>Go Live</span>
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
        
      {/* Create new Shop button - only show if origin template exists */}
      {originTemplate && onCreateNewShop && (
        <div>
        <Button
            size="3"
            color="violet"
            variant="solid"
          onClick={() => {
              onCreateNewShop();
          }}
            className="w-full !px-4 !py-2.5 shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
        >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create new Shop</span>
        </Button>
      </div>
      )}
    </div>
  );
};




