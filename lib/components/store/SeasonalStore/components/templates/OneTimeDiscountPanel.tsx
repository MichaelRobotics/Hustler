'use client';

import React from 'react';
import { Button, Heading, Text, Card, Separator } from 'frosted-ui';
import { Plus, Trash2 } from 'lucide-react';

interface OneTimeDiscount {
  productId: string;
  promoCode: string;
  targetProductId: string;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  messages: Array<{ 
    message: string; 
    offsetHours: number;
    sendAsEmail?: boolean;
    emailSubject?: string;
    emailContent?: string;
    fromEmail?: string;
    isEmailHtml?: boolean;
  }>;
}

interface Product {
  id: string;
  name: string;
  [key: string]: any;
}

interface OneTimeDiscountPanelProps {
  products: Product[];
  discounts: OneTimeDiscount[];
  onDiscountsChange: (discounts: OneTimeDiscount[]) => void;
  selectedProductId: string | null;
  onSelectProduct: (id: string | null) => void;
  onOpenMessageEditor: (index: number) => void;
  showPanel: boolean;
  onTogglePanel: () => void;
  onSave: () => void;
  discountsSnapshot: OneTimeDiscount[] | null;
  onSetSnapshot: (snapshot: OneTimeDiscount[] | null) => void;
}

export const OneTimeDiscountPanel: React.FC<OneTimeDiscountPanelProps> = ({
  products,
  discounts,
  onDiscountsChange,
  selectedProductId,
  onSelectProduct,
  onOpenMessageEditor,
  showPanel,
  onTogglePanel,
  onSave,
  discountsSnapshot,
  onSetSnapshot,
}) => {
  const currentDiscount = selectedProductId 
    ? discounts.find(d => d.productId === selectedProductId) 
    : null;
  const selectedProduct = selectedProductId
    ? products.find(p => p.id === selectedProductId)
    : null;

  const handleSelectProduct = (productId: string) => {
    const existing = discounts.find(d => d.productId === productId);
    onSetSnapshot(JSON.parse(JSON.stringify(discounts)));
    onSelectProduct(productId);
    if (!existing) {
      onDiscountsChange([...discounts, {
        productId,
        promoCode: '',
        targetProductId: '',
        discountType: 'percentage',
        discountAmount: 20,
        messages: []
      }]);
    }
  };

  const updateCurrentDiscount = (updates: Partial<OneTimeDiscount>) => {
    if (!selectedProductId) return;
    onDiscountsChange(discounts.map(d => 
      d.productId === selectedProductId ? { ...d, ...updates } : d
    ));
  };

  const addMessage = () => {
    if (!currentDiscount || currentDiscount.messages.length >= 3) return;
    updateCurrentDiscount({
      messages: [...currentDiscount.messages, { 
        message: '', 
        offsetHours: 0,
        sendAsEmail: false,
        emailSubject: undefined,
        emailContent: undefined,
        isEmailHtml: false
      }]
    });
  };

  const removeMessage = (index: number) => {
    if (!currentDiscount) return;
    updateCurrentDiscount({
      messages: currentDiscount.messages.filter((_, i) => i !== index)
    });
  };

  const handleReturn = () => {
    if (discountsSnapshot !== null) {
      onDiscountsChange(discountsSnapshot);
    }
    onSetSnapshot(null);
    onSelectProduct(null);
  };

  const handleSaveAndClose = () => {
    onSave();
    onSetSnapshot(null);
    onSelectProduct(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <Heading size="3" weight="medium" className="text-gray-700 dark:text-gray-300 text-sm font-medium uppercase tracking-wider">
          One-Time Discount
        </Heading>
        <Button
          size="2"
          variant="soft"
          color="gray"
          onClick={onTogglePanel}
          className="!px-4 !py-2 text-xs"
        >
          {showPanel ? 'Hide' : 'Show'}
        </Button>
      </div>

      {showPanel && (
        <Card className="p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-visible min-w-0">
          <div className="fui-reset">
            <div className="space-y-5 min-w-0">
              {/* Add New Product or Edit Selected */}
              {!selectedProductId ? (
                <div>
                  <select
                    value=""
                    onChange={(e) => {
                      const productId = e.target.value;
                      if (productId) {
                        handleSelectProduct(productId);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  >
                    <option value="">Select product with upsell...</option>
                    {products.map((product) => {
                      const hasDiscount = discounts.some(d => d.productId === product.id);
                      if (hasDiscount) return null;
                      return (
                        <option key={product.id} value={product.id}>
                          {product.name || `Product ${product.id}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : currentDiscount ? (
                <>
                  {/* Product name */}
                  <Text size="3" weight="bold" className="text-gray-900 dark:text-white mb-4">
                    {selectedProduct?.name || `Product ${selectedProductId}`}
                  </Text>

                  {/* Promo Code */}
                  <div>
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">
                      Promo Code
                    </Text>
                    <input
                      type="text"
                      value={currentDiscount.promoCode}
                      onChange={(e) => updateCurrentDiscount({ promoCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., SAVE20"
                      maxLength={20}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 uppercase"
                    />
                  </div>

                  <Separator size="1" color="gray" />

                  {/* Target Product */}
                  <div>
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-2">
                      Target Product (to apply discount to)
                    </Text>
                    <select
                      value={currentDiscount.targetProductId}
                      onChange={(e) => updateCurrentDiscount({ targetProductId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                    >
                      <option value="">Select a product...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name || `Product ${product.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Separator size="1" color="gray" />

                  {/* Discount Type and Amount */}
                  <div>
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                      Discount Amount
                    </Text>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`oneTimeDiscountType-${selectedProductId}`}
                            checked={currentDiscount.discountType === 'percentage'}
                            onChange={() => updateCurrentDiscount({ discountType: 'percentage' })}
                            className="w-3 h-3 text-violet-600 focus:ring-violet-500"
                          />
                          <Text size="2" className="text-gray-600 dark:text-gray-400">Percentage</Text>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={`oneTimeDiscountType-${selectedProductId}`}
                            checked={currentDiscount.discountType === 'fixed'}
                            onChange={() => updateCurrentDiscount({ discountType: 'fixed' })}
                            className="w-3 h-3 text-violet-600 focus:ring-violet-500"
                          />
                          <Text size="2" className="text-gray-600 dark:text-gray-400">Fixed</Text>
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={currentDiscount.discountType === 'percentage' ? 100 : undefined}
                          step={currentDiscount.discountType === 'percentage' ? '1' : '0.01'}
                          value={currentDiscount.discountAmount}
                          onChange={(e) => updateCurrentDiscount({ discountAmount: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-4 py-2 pr-8 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 dark:text-gray-400 pointer-events-none">
                          {currentDiscount.discountType === 'percentage' ? '%' : '$'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator size="1" color="gray" />

                  {/* Messages */}
                  <div>
                    <Text size="3" weight="medium" className="text-gray-700 dark:text-gray-300 mb-3">
                      Post-Purchase Messages
                    </Text>
                    <div className="space-y-2">
                      {currentDiscount.messages.map((msg, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Button
                            size="3"
                            color="violet"
                            variant="surface"
                            onClick={() => onOpenMessageEditor(idx)}
                            className="flex-1 !px-4 !py-2.5 text-left border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Text size="2" weight="semi-bold" className="text-gray-900 dark:text-white">
                                  Message {idx + 1} • {msg.offsetHours}h after
                                  {msg.sendAsEmail && <span className="ml-2 text-xs text-violet-600 dark:text-violet-400">+ Email</span>}
                                </Text>
                              </div>
                              <Text size="1" className="text-gray-600 dark:text-gray-400 truncate block mt-0.5">
                                {msg.message || 'Not set'}
                              </Text>
                            </div>
                          </Button>
                          <Button
                            size="2"
                            variant="soft"
                            color="red"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMessage(idx);
                            }}
                            className="!px-3 !py-2 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {currentDiscount.messages.length < 3 && (
                        <Button
                          size="3"
                          color="violet"
                          variant="surface"
                          onClick={addMessage}
                          className="w-full !px-4 !py-2.5 border border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          <Text size="2">Add Message</Text>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Save/Return Buttons */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="3"
                      color="gray"
                      variant="soft"
                      onClick={handleReturn}
                      className="flex-1 !px-6 !py-3"
                    >
                      Return
                    </Button>
                    <Button
                      size="3"
                      color="violet"
                      variant="solid"
                      onClick={handleSaveAndClose}
                      className="flex-1 !px-6 !py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50"
                    >
                      Save
                    </Button>
                  </div>
                </>
              ) : null}

              {/* Existing Discounts List */}
              {!selectedProductId && discounts.length > 0 && (
                <div className="space-y-2 mt-4">
                  <Text size="2" weight="medium" className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Existing Discounts
                  </Text>
                  {discounts.map((discount) => {
                    const product = products.find(p => p.id === discount.productId);
                    return (
                      <div key={discount.productId} className="flex items-center gap-2">
                        <Button
                          size="3"
                          color="violet"
                          variant="surface"
                          onClick={() => handleSelectProduct(discount.productId)}
                          className="flex-1 !px-4 !py-2.5 text-left border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/20"
                        >
                          <div className="flex-1 min-w-0">
                            <Text size="2" weight="semi-bold" className="text-gray-900 dark:text-white">
                              {product?.name || `Product ${discount.productId}`}
                            </Text>
                            <Text size="1" className="text-gray-600 dark:text-gray-400 block mt-0.5">
                              {discount.promoCode || 'No promo code'} • {discount.discountAmount}{discount.discountType === 'percentage' ? '%' : '$'} off
                            </Text>
                          </div>
                        </Button>
                        <Button
                          size="2"
                          variant="soft"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this discount?')) {
                              onDiscountsChange(discounts.filter(d => d.productId !== discount.productId));
                            }
                          }}
                          className="!px-3 !py-2 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};




