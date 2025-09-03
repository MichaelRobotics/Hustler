'use client';

import { useState } from 'react';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';

interface Funnel {
  id: string;
  name: string;
  isDeployed?: boolean;
  wasEverDeployed?: boolean;
  resources?: any[];
  sends?: number;
  flow?: any;
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationError?: string;
  lastGeneratedAt?: number;
}

type View = 'dashboard' | 'analytics' | 'resources' | 'resourceLibrary' | 'funnelBuilder' | 'preview';

export function useViewNavigation() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const handleViewChange = (
    view: View, 
    selectedFunnel: Funnel | null, 
    currentView: View,
    setLibraryContext: (context: 'global' | 'funnel') => void,
    setSelectedFunnelForLibrary: (funnel: Funnel | null) => void
  ) => {
    if (view === 'resourceLibrary') {
      if (selectedFunnel && (currentView === 'resources' || currentView === 'analytics' || currentView === 'funnelBuilder')) {
        setLibraryContext('funnel');
        setSelectedFunnelForLibrary(selectedFunnel);
      } else {
        setSelectedFunnelForLibrary(null);
        setLibraryContext('global');
      }
    }
    setCurrentView(view);
  };

  const onFunnelClick = (funnel: Funnel) => {
    if (!hasValidFlow(funnel)) {
      return 'resources';
    } else {
      return 'analytics';
    }
  };

  const handleManageResources = (funnel: Funnel) => {
    return 'resources';
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    return 'dashboard';
  };

  return {
    // State
    currentView,
    
    // Setters
    setCurrentView,
    
    // Actions
    handleViewChange,
    onFunnelClick,
    handleManageResources,
    handleBackToDashboard,
  };
}

