'use client';

import React from 'react';
import type { DiscountSettings } from '../types';

export interface DiscountMessage {
  message: string;
  offsetHours: number;
  sendAsEmail?: boolean;
  emailSubject?: string;
  emailContent?: string;
  fromEmail?: string;
  isEmailHtml?: boolean;
}

interface UseDiscountEditorStateProps {
  discountSettingsProp?: DiscountSettings;
  liveTemplate: {
    templateData?: {
      discountSettings?: DiscountSettings;
    };
  } | null;
  onSaveDiscountSettings?: (discountSettings: DiscountSettings) => Promise<void>;
}

export function useDiscountEditorState({
  discountSettingsProp,
  liveTemplate,
  onSaveDiscountSettings,
}: UseDiscountEditorStateProps) {
  // Panel visibility
  const [showDiscountSetup, setShowDiscountSetup] = React.useState(false);
  
  // Message modal state
  const [messageModalOpen, setMessageModalOpen] = React.useState(false);
  const [messageModalType, setMessageModalType] = React.useState<'prePromo' | 'activePromo' | null>(null);
  const [messageModalIndex, setMessageModalIndex] = React.useState(0);
  const [messageModalView, setMessageModalView] = React.useState<'message' | 'email'>('message');
  const [emailStep, setEmailStep] = React.useState<1 | 2 | 3>(1);
  
  // Drag/drop state
  const [isDragOverHtml, setIsDragOverHtml] = React.useState(false);
  
  // Toolbar state
  const [showEmailToolbar, setShowEmailToolbar] = React.useState(false);
  const [showTurnIntoMenu, setShowTurnIntoMenu] = React.useState(false);
  const [turnIntoMenuPosition, setTurnIntoMenuPosition] = React.useState({ top: 0, left: 0 });
  const [emailTextareaRef, setEmailTextareaRef] = React.useState<HTMLTextAreaElement | null>(null);
  const [emailContentEditableRef, setEmailContentEditableRef] = React.useState<HTMLDivElement | null>(null);
  
  // Image/Link modals
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [showLinkModal, setShowLinkModal] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  
  // Discount text editor state
  const [discountTextEditableRef, setDiscountTextEditableRef] = React.useState<HTMLDivElement | null>(null);
  const [showDiscountTextToolbar, setShowDiscountTextToolbar] = React.useState(false);
  const [showDiscountTextEmojiPicker, setShowDiscountTextEmojiPicker] = React.useState(false);
  const [showDiscountTextColorPicker, setShowDiscountTextColorPicker] = React.useState(false);
  const [selectedDiscountTextColor, setSelectedDiscountTextColor] = React.useState('#000000');
  const discountTextToolbarRef = React.useRef<HTMLDivElement | null>(null);
  
  // Track if we're updating from state to prevent infinite loops
  const isUpdatingFromStateRef = React.useRef(false);

  // Create empty discount settings
  const createEmptyDiscountSettings = React.useCallback((): DiscountSettings => ({
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
  }), []);

  // Initialize discount settings from props or live template if available
  const initialDiscountSettings = React.useMemo(() => {
    if (discountSettingsProp) {
      return discountSettingsProp;
    }
    if (liveTemplate?.templateData?.discountSettings) {
      return liveTemplate.templateData.discountSettings as DiscountSettings;
    }
    return createEmptyDiscountSettings();
  }, [discountSettingsProp, liveTemplate, createEmptyDiscountSettings]);
  
  // Discount settings state
  const [discountSettings, setDiscountSettings] = React.useState<DiscountSettings>(initialDiscountSettings);

  // Update discount settings when parent prop or live template changes
  React.useEffect(() => {
    if (discountSettingsProp) {
      setDiscountSettings(discountSettingsProp);
    } else if (liveTemplate?.templateData?.discountSettings) {
      setDiscountSettings(liveTemplate.templateData.discountSettings as DiscountSettings);
    } else {
      setDiscountSettings(createEmptyDiscountSettings());
    }
  }, [discountSettingsProp, liveTemplate, createEmptyDiscountSettings]);

  // Real-time timer state
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update current time every second
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if promo is currently active (start time in past, end time in future)
  const isPromoActive = React.useMemo(() => {
    if (!discountSettings.startDate || !discountSettings.endDate) {
      return false;
    }
    const now = currentTime;
    const start = new Date(discountSettings.startDate);
    const end = new Date(discountSettings.endDate);
    return now >= start && now <= end;
  }, [discountSettings.startDate, discountSettings.endDate, currentTime]);

  // Calculate time until start (when discount is set but not active)
  const timeUntilStart = React.useMemo(() => {
    if (!discountSettings.startDate || isPromoActive) return null;
    const now = currentTime;
    const start = new Date(discountSettings.startDate);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  }, [discountSettings.startDate, isPromoActive, currentTime]);

  // Calculate time remaining until end (when discount is active)
  const timeRemaining = React.useMemo(() => {
    if (!isPromoActive || !discountSettings.endDate) return null;
    const now = currentTime;
    const end = new Date(discountSettings.endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes };
  }, [isPromoActive, discountSettings.endDate, currentTime]);

  // Helper functions for managing messages
  const addPrePromoMessage = React.useCallback(() => {
    if (discountSettings.prePromoMessages.length < 3) {
      setDiscountSettings(prev => ({
        ...prev,
        prePromoMessages: [...prev.prePromoMessages, { 
          message: '', 
          offsetHours: 24,
          sendAsEmail: false,
          emailSubject: undefined,
          emailContent: undefined,
          isEmailHtml: false
        }]
      }));
    }
  }, [discountSettings.prePromoMessages.length]);

  const removePrePromoMessage = React.useCallback((index: number) => {
    setDiscountSettings(prev => ({
      ...prev,
      prePromoMessages: prev.prePromoMessages.filter((_, i) => i !== index)
    }));
  }, []);

  const addActivePromoMessage = React.useCallback(() => {
    if (discountSettings.activePromoMessages.length < 3) {
      setDiscountSettings(prev => ({
        ...prev,
        activePromoMessages: [...prev.activePromoMessages, { 
          message: '', 
          offsetHours: 0,
          sendAsEmail: false,
          emailSubject: undefined,
          emailContent: undefined,
          isEmailHtml: false
        }]
      }));
    }
  }, [discountSettings.activePromoMessages.length]);

  const removeActivePromoMessage = React.useCallback((index: number) => {
    setDiscountSettings(prev => ({
      ...prev,
      activePromoMessages: prev.activePromoMessages.filter((_, i) => i !== index)
    }));
  }, []);

  // Drag & drop handlers for HTML file upload
  const handleHtmlDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverHtml(true);
  }, []);

  const handleHtmlDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverHtml(false);
  }, []);

  const handleHtmlDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverHtml(false);

    const files = Array.from(e.dataTransfer.files);
    const htmlFile = files.find(file => file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm'));
    
    if (htmlFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (messageModalType === 'prePromo') {
          setDiscountSettings(prev => {
            const newMessages = [...prev.prePromoMessages];
            newMessages[messageModalIndex] = {
              ...newMessages[messageModalIndex],
              emailContent: content,
              isEmailHtml: true
            };
            return { ...prev, prePromoMessages: newMessages };
          });
        } else {
          setDiscountSettings(prev => {
            const newMessages = [...prev.activePromoMessages];
            newMessages[messageModalIndex] = {
              ...newMessages[messageModalIndex],
              emailContent: content,
              isEmailHtml: true
            };
            return { ...prev, activePromoMessages: newMessages };
          });
        }
      };
      reader.readAsText(htmlFile);
    }
  }, [messageModalType, messageModalIndex]);

  const handleHtmlFileSelect = React.useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (messageModalType === 'prePromo') {
        setDiscountSettings(prev => {
          const newMessages = [...prev.prePromoMessages];
          newMessages[messageModalIndex] = {
            ...newMessages[messageModalIndex],
            emailContent: content,
            isEmailHtml: true
          };
          return { ...prev, prePromoMessages: newMessages };
        });
      } else {
        setDiscountSettings(prev => {
          const newMessages = [...prev.activePromoMessages];
          newMessages[messageModalIndex] = {
            ...newMessages[messageModalIndex],
            emailContent: content,
            isEmailHtml: true
          };
          return { ...prev, activePromoMessages: newMessages };
        });
      }
    };
    reader.readAsText(file);
  }, [messageModalType, messageModalIndex]);

  // Reset drag state when modal closes
  React.useEffect(() => {
    if (!messageModalOpen) {
      setIsDragOverHtml(false);
      setShowEmailToolbar(false);
      setShowTurnIntoMenu(false);
    }
  }, [messageModalOpen]);

  // Open message editor
  const openMessageEditor = React.useCallback((type: 'prePromo' | 'activePromo', index: number) => {
    setMessageModalType(type);
    setMessageModalIndex(index);
    setMessageModalView('message');
    setEmailStep(1);
    setMessageModalOpen(true);
  }, []);

  // Save discount settings
  const saveDiscountSettings = React.useCallback(async () => {
    if (onSaveDiscountSettings) {
      try {
        await onSaveDiscountSettings(discountSettings);
        console.log('✅ Discount saved successfully');
      } catch (error) {
        console.error('❌ Failed to save discount:', error);
      }
    } else {
      console.warn('⚠️ onSaveDiscountSettings handler not provided');
    }
  }, [discountSettings, onSaveDiscountSettings]);

  // Delete discount settings
  const deleteDiscountSettings = React.useCallback(async () => {
    const emptySettings = createEmptyDiscountSettings();
    setDiscountSettings(emptySettings);
    if (onSaveDiscountSettings) {
      try {
        await onSaveDiscountSettings(emptySettings);
        console.log('✅ Discount deleted successfully');
      } catch (error) {
        console.error('❌ Failed to delete discount:', error);
      }
    }
  }, [createEmptyDiscountSettings, onSaveDiscountSettings]);

  // Create new discount
  const createDiscount = React.useCallback(() => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    setDiscountSettings(prev => ({
      ...prev,
      enabled: true,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      discountText: prev.discountText || 'Special Discount!',
      promoCode: prev.promoCode || '',
      percentage: prev.percentage || 20
    }));
  }, []);

  return {
    // Panel visibility
    showDiscountSetup,
    setShowDiscountSetup,
    
    // Discount settings
    discountSettings,
    setDiscountSettings,
    createEmptyDiscountSettings,
    
    // Timer values
    isPromoActive,
    timeUntilStart,
    timeRemaining,
    
    // Message modal
    messageModalOpen,
    setMessageModalOpen,
    messageModalType,
    setMessageModalType,
    messageModalIndex,
    setMessageModalIndex,
    messageModalView,
    setMessageModalView,
    emailStep,
    setEmailStep,
    openMessageEditor,
    
    // Drag/drop
    isDragOverHtml,
    handleHtmlDragOver,
    handleHtmlDragLeave,
    handleHtmlDrop,
    handleHtmlFileSelect,
    
    // Toolbar state
    showEmailToolbar,
    setShowEmailToolbar,
    showTurnIntoMenu,
    setShowTurnIntoMenu,
    turnIntoMenuPosition,
    setTurnIntoMenuPosition,
    emailTextareaRef,
    setEmailTextareaRef,
    emailContentEditableRef,
    setEmailContentEditableRef,
    
    // Image/Link modals
    showImageModal,
    setShowImageModal,
    showLinkModal,
    setShowLinkModal,
    linkUrl,
    setLinkUrl,
    
    // Discount text editor
    discountTextEditableRef,
    setDiscountTextEditableRef,
    showDiscountTextToolbar,
    setShowDiscountTextToolbar,
    showDiscountTextEmojiPicker,
    setShowDiscountTextEmojiPicker,
    showDiscountTextColorPicker,
    setShowDiscountTextColorPicker,
    selectedDiscountTextColor,
    setSelectedDiscountTextColor,
    discountTextToolbarRef,
    isUpdatingFromStateRef,
    
    // Message helpers
    addPrePromoMessage,
    removePrePromoMessage,
    addActivePromoMessage,
    removeActivePromoMessage,
    
    // Save/Delete
    saveDiscountSettings,
    deleteDiscountSettings,
    createDiscount,
  };
}

export type UseDiscountEditorStateReturn = ReturnType<typeof useDiscountEditorState>;




