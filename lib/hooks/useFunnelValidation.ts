'use client';

import React from 'react';

interface Funnel {
  id: string;
  name: string;
  flow?: any;
  isDeployed?: boolean;
  wasEverDeployed?: boolean;
  resources?: Resource[];
}

interface Resource {
  id: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS' | 'CONTENT' | 'TOOL';
  name: string;
  link: string;
  promoCode?: string;
  category?: string;
}

export const useFunnelValidation = () => {
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = React.useState<string | null>(null);

  // Get offer blocks for selection - Same simple logic as Go Live validation
  const getOfferBlocks = React.useCallback((currentFunnel: Funnel) => {
    if (!currentFunnel.flow) return [];
    
    // Simple: Just get all blocks with resourceName (same as validation modal)
    return Object.values(currentFunnel.flow.blocks)
      .filter((block: any) => block.resourceName && typeof block.resourceName === 'string')
      .map((block: any) => ({
        id: block.id,
        name: block.resourceName
      }));
  }, []);

  return {
    apiError,
    setApiError,
    editingBlockId,
    setEditingBlockId,
    getOfferBlocks
  };
};

