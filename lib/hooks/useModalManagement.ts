'use client';

import React from 'react';

export const useModalManagement = () => {
  const [showOfferSelection, setShowOfferSelection] = React.useState(false);
  const [offlineConfirmation, setOfflineConfirmation] = React.useState(false);
  const [selectedOffer, setSelectedOffer] = React.useState<string | null>(null);

  // Handle offer selection modal
  const openOfferSelection = () => {
    setOfflineConfirmation(false);
    setShowOfferSelection(true);
  };

  const closeOfferSelection = () => {
    setShowOfferSelection(false);
    setOfflineConfirmation(false); // Hide offline modal when closing offer selection
  };

  // Handle offline confirmation modal
  const openOfflineConfirmation = () => {
    setOfflineConfirmation(true);
    setShowOfferSelection(false); // Hide offer selection when opening offline modal
    setSelectedOffer(null); // Clear offer selection when opening offline modal
  };

  const closeOfflineConfirmation = () => {
    setOfflineConfirmation(false);
    setShowOfferSelection(false); // Hide offer selection when closing offline modal
  };

  // Handle offer selection
  const selectOffer = (offerId: string) => {
    setSelectedOffer(offerId);
    setShowOfferSelection(false);
    setOfflineConfirmation(false); // Hide offline modal when selecting offer
  };

  // Clear all modals
  const clearAllModals = () => {
    setShowOfferSelection(false);
    setOfflineConfirmation(false);
    setSelectedOffer(null);
  };

  return {
    // State
    showOfferSelection,
    offlineConfirmation,
    selectedOffer,
    
    // Actions
    setShowOfferSelection,
    setOfflineConfirmation,
    setSelectedOffer,
    openOfferSelection,
    closeOfferSelection,
    openOfflineConfirmation,
    closeOfflineConfirmation,
    selectOffer,
    clearAllModals
  };
};

