'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Heading, Text, Card } from 'frosted-ui';
import { ChevronLeft, ChevronRight, Eye, Trash2, Edit, CheckCircle, Plus } from 'lucide-react';

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

  return (
    <div>
      <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 !mb-5 text-sm font-medium uppercase tracking-wider">
        Shops ({sortedTemplates.length})
      </Heading>
      
      {/* Create new Shop button - only show if origin template exists */}
      {originTemplate && onCreateNewShop && (
        <div className="mb-4">
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
      
      <div className="flex items-center gap-1">
        <Button
          size="1"
          variant="ghost"
          color="gray"
          onClick={() => {
            setCurrentShopIndex(prev => 
              prev > 0 ? prev - 1 : sortedTemplates.length - 1
            );
          }}
          disabled={sortedTemplates.length === 0}
          className="!px-1.5 !py-1.5 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous shop"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex-1 min-w-0">
          {currentTemplate && (
            <Card className="p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
              <div className="fui-reset">
                {/* Shop Name with Edit */}
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
                      <Heading size="4" weight="semi-bold" className="text-foreground truncate flex-1">
                        {currentTemplate.name}
                      </Heading>
                      {onRenameTemplate && (
                        <Button
                          size="1"
                          variant="ghost"
                          color="gray"
                          onClick={() => {
                            setEditingShopId(currentTemplate.id);
                            setEditingShopName(currentTemplate.name);
                          }}
                          className="!px-1.5 !py-1.5 flex-shrink-0"
                          title="Rename shop"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Shop Info */}
                <div className="flex items-center gap-2 mb-4">
                  <Text size="2" className="text-gray-500 dark:text-gray-400">
                    {currentTemplate.templateData?.products?.length || 0} products
                  </Text>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <Text size="2" className="text-gray-500 dark:text-gray-400">
                    {currentShopIndex + 1} of {sortedTemplates.length}
                  </Text>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  {/* Preview and Delete Row */}
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
                      color="red"
                      variant="soft"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this shop?')) {
                          onDeleteTemplate(currentTemplate.id);
                          if (currentShopIndex >= sortedTemplates.length - 1) {
                            setCurrentShopIndex(Math.max(0, sortedTemplates.length - 2));
                          }
                        }
                      }}
                      className="!px-3 !py-2.5 flex-shrink-0"
                      title="Delete shop"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>


                  {/* Go Live Button */}
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
                    className={`w-full !px-6 !py-3 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all duration-300 dark:shadow-green-500/30 dark:hover:shadow-green-500/50 flex items-center justify-center ${
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
        
        <Button
          size="1"
          variant="ghost"
          color="gray"
          onClick={() => {
            setCurrentShopIndex(prev => 
              prev < sortedTemplates.length - 1 ? prev + 1 : 0
            );
          }}
          disabled={sortedTemplates.length === 0}
          className="!px-1.5 !py-1.5 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next shop"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};




