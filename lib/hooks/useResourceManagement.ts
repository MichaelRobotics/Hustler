'use client';

import { useState } from 'react';
import { Resource } from '@/lib/types/resource';

interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean;
  resources?: Resource[];
  sends?: number;
  flow?: any;
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  lastGeneratedAt?: number;
}

export function useResourceManagement() {
  const [libraryContext, setLibraryContext] = useState<'global' | 'funnel'>('global');
  const [selectedFunnelForLibrary, setSelectedFunnelForLibrary] = useState<Funnel | null>(null);
  const [allResources, setAllResources] = useState<Resource[]>([]);

  const handleOpenResourceLibrary = (selectedFunnel: Funnel | null) => {
    setLibraryContext('funnel');
    setSelectedFunnelForLibrary(selectedFunnel);
    return 'resourceLibrary';
  };

  const handleAddToFunnel = (resource: Resource, selectedFunnel: Funnel, funnels: Funnel[], setFunnels: (funnels: Funnel[]) => void, setSelectedFunnel: (funnel: Funnel | null) => void) => {
    if (selectedFunnel) {
      const updatedFunnel = {
        ...selectedFunnel,
        resources: [...(selectedFunnel.resources || []), resource]
      };
      setSelectedFunnel(updatedFunnel);
      setFunnels(funnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f));
    }
  };

  const handleBackToDashboard = () => {
    return 'dashboard';
  };

  return {
    // State
    libraryContext,
    selectedFunnelForLibrary,
    allResources,
    
    // Setters
    setLibraryContext,
    setSelectedFunnelForLibrary,
    setAllResources,
    
    // Actions
    handleOpenResourceLibrary,
    handleAddToFunnel,
    handleBackToDashboard,
  };
}
