'use client';

import React from 'react';

export interface OneTimeDiscountMessage {
  message: string;
  offsetHours: number;
  sendAsEmail?: boolean;
  emailSubject?: string;
  emailContent?: string;
  fromEmail?: string;
  isEmailHtml?: boolean;
}

export interface OneTimeDiscount {
  productId: string;
  promoCode: string;
  targetProductId: string;
  discountType: 'percentage' | 'fixed';
  discountAmount: number;
  messages: OneTimeDiscountMessage[];
}

export function useOneTimeDiscountState() {
  // Panel visibility
  const [showOneTimeDiscount, setShowOneTimeDiscount] = React.useState(false);
  
  // Selected product for editing
  const [selectedOneTimeProductId, setSelectedOneTimeProductId] = React.useState<string | null>(null);
  
  // Snapshot for reverting changes
  const [oneTimeDiscountsSnapshot, setOneTimeDiscountsSnapshot] = React.useState<OneTimeDiscount[] | null>(null);
  
  // Discounts data
  const [oneTimeDiscounts, setOneTimeDiscounts] = React.useState<OneTimeDiscount[]>([]);
  
  // Message modal state
  const [oneTimeMessageModalOpen, setOneTimeMessageModalOpen] = React.useState(false);
  const [oneTimeMessageModalIndex, setOneTimeMessageModalIndex] = React.useState(0);
  const [oneTimeMessageModalView, setOneTimeMessageModalView] = React.useState<'message' | 'email'>('message');
  const [oneTimeEmailStep, setOneTimeEmailStep] = React.useState<1 | 2 | 3>(1);
  
  // Toolbar state
  const [showOneTimeEmailToolbar, setShowOneTimeEmailToolbar] = React.useState(false);
  const [showOneTimeTurnIntoMenu, setShowOneTimeTurnIntoMenu] = React.useState(false);
  const [oneTimeTurnIntoMenuPosition, setOneTimeTurnIntoMenuPosition] = React.useState({ top: 0, left: 0 });
  const [oneTimeEmailTextareaRef, setOneTimeEmailTextareaRef] = React.useState<HTMLTextAreaElement | null>(null);
  const [oneTimeEmailContentEditableRef, setOneTimeEmailContentEditableRef] = React.useState<HTMLDivElement | null>(null);
  
  // Image/Link modals
  const [showOneTimeImageModal, setShowOneTimeImageModal] = React.useState(false);
  const [showOneTimeLinkModal, setShowOneTimeLinkModal] = React.useState(false);
  const [oneTimeLinkUrl, setOneTimeLinkUrl] = React.useState('');

  // Select a product to edit
  const selectProduct = React.useCallback((productId: string) => {
    // Check if product already has discount settings
    const existing = oneTimeDiscounts.find(d => d.productId === productId);
    // Save snapshot before editing
    setOneTimeDiscountsSnapshot(JSON.parse(JSON.stringify(oneTimeDiscounts)));
    setSelectedOneTimeProductId(productId);
    if (!existing) {
      // Add new discount for this product
      setOneTimeDiscounts(prev => [...prev, {
        productId,
        promoCode: '',
        targetProductId: '',
        discountType: 'percentage',
        discountAmount: 20,
        messages: []
      }]);
    }
  }, [oneTimeDiscounts]);

  // Get current discount being edited
  const currentDiscount = React.useMemo(() => {
    if (!selectedOneTimeProductId) return null;
    return oneTimeDiscounts.find(d => d.productId === selectedOneTimeProductId) || null;
  }, [selectedOneTimeProductId, oneTimeDiscounts]);

  // Update current discount
  const updateCurrentDiscount = React.useCallback((updates: Partial<OneTimeDiscount>) => {
    if (!selectedOneTimeProductId) return;
    setOneTimeDiscounts(prev => prev.map(d => 
      d.productId === selectedOneTimeProductId ? { ...d, ...updates } : d
    ));
  }, [selectedOneTimeProductId]);

  // Add message to current discount
  const addMessage = React.useCallback(() => {
    if (!selectedOneTimeProductId || !currentDiscount) return;
    if (currentDiscount.messages.length >= 3) return;
    
    setOneTimeDiscounts(prev => prev.map(d => 
      d.productId === selectedOneTimeProductId
        ? { 
            ...d, 
            messages: [...d.messages, { 
              message: '', 
              offsetHours: 0,
              sendAsEmail: false,
              emailSubject: undefined,
              emailContent: undefined,
              isEmailHtml: false
            }]
          }
        : d
    ));
  }, [selectedOneTimeProductId, currentDiscount]);

  // Remove message from current discount
  const removeMessage = React.useCallback((index: number) => {
    if (!selectedOneTimeProductId) return;
    setOneTimeDiscounts(prev => prev.map(d => 
      d.productId === selectedOneTimeProductId
        ? { ...d, messages: d.messages.filter((_, i) => i !== index) }
        : d
    ));
  }, [selectedOneTimeProductId]);

  // Update message in current discount
  const updateMessage = React.useCallback((index: number, updates: Partial<OneTimeDiscountMessage>) => {
    if (!selectedOneTimeProductId) return;
    setOneTimeDiscounts(prev => prev.map(d => 
      d.productId === selectedOneTimeProductId
        ? { 
            ...d, 
            messages: d.messages.map((m, i) => i === index ? { ...m, ...updates } : m) 
          }
        : d
    ));
  }, [selectedOneTimeProductId]);

  // Open message editor
  const openMessageEditor = React.useCallback((index: number) => {
    setOneTimeMessageModalIndex(index);
    setOneTimeMessageModalView('message');
    setOneTimeEmailStep(1);
    setOneTimeMessageModalOpen(true);
  }, []);

  // Save changes and clear selection
  const saveAndClose = React.useCallback(() => {
    console.log('✅ One-Time Discount saved:', oneTimeDiscounts);
    // TODO: Add API call to save one-time discount
    setOneTimeDiscountsSnapshot(null);
    setSelectedOneTimeProductId(null);
  }, [oneTimeDiscounts]);

  // Revert changes and clear selection
  const cancelAndRevert = React.useCallback(() => {
    if (oneTimeDiscountsSnapshot !== null) {
      setOneTimeDiscounts(oneTimeDiscountsSnapshot);
    }
    setOneTimeDiscountsSnapshot(null);
    setSelectedOneTimeProductId(null);
  }, [oneTimeDiscountsSnapshot]);

  // Delete discount for a product
  const deleteDiscount = React.useCallback((productId: string) => {
    setOneTimeDiscounts(prev => prev.filter(d => d.productId !== productId));
    if (selectedOneTimeProductId === productId) {
      setSelectedOneTimeProductId(null);
      setOneTimeDiscountsSnapshot(null);
    }
  }, [selectedOneTimeProductId]);

  // Check if this is an existing discount (not a new one)
  const isExistingDiscount = React.useMemo(() => {
    return oneTimeDiscountsSnapshot !== null && 
           oneTimeDiscountsSnapshot.some(d => d.productId === selectedOneTimeProductId);
  }, [oneTimeDiscountsSnapshot, selectedOneTimeProductId]);

  return {
    // Panel visibility
    showOneTimeDiscount,
    setShowOneTimeDiscount,
    
    // Selection
    selectedOneTimeProductId,
    setSelectedOneTimeProductId,
    selectProduct,
    
    // Discounts data
    oneTimeDiscounts,
    setOneTimeDiscounts,
    currentDiscount,
    updateCurrentDiscount,
    
    // Snapshot
    oneTimeDiscountsSnapshot,
    setOneTimeDiscountsSnapshot,
    isExistingDiscount,
    
    // Message management
    addMessage,
    removeMessage,
    updateMessage,
    
    // Message modal
    oneTimeMessageModalOpen,
    setOneTimeMessageModalOpen,
    oneTimeMessageModalIndex,
    setOneTimeMessageModalIndex,
    oneTimeMessageModalView,
    setOneTimeMessageModalView,
    oneTimeEmailStep,
    setOneTimeEmailStep,
    openMessageEditor,
    
    // Toolbar state
    showOneTimeEmailToolbar,
    setShowOneTimeEmailToolbar,
    showOneTimeTurnIntoMenu,
    setShowOneTimeTurnIntoMenu,
    oneTimeTurnIntoMenuPosition,
    setOneTimeTurnIntoMenuPosition,
    oneTimeEmailTextareaRef,
    setOneTimeEmailTextareaRef,
    oneTimeEmailContentEditableRef,
    setOneTimeEmailContentEditableRef,
    
    // Image/Link modals
    showOneTimeImageModal,
    setShowOneTimeImageModal,
    showOneTimeLinkModal,
    setShowOneTimeLinkModal,
    oneTimeLinkUrl,
    setOneTimeLinkUrl,
    
    // Actions
    saveAndClose,
    cancelAndRevert,
    deleteDiscount,
  };
}

export type UseOneTimeDiscountStateReturn = ReturnType<typeof useOneTimeDiscountState>;




