'use client';

import { useState } from 'react';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';
import { generateMockFunnels } from '@/lib/utils/dataSimulation';

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

// Unified interface for AI/API communication - consistent across all components
interface AIResource {
  id: string;
  name: string;
  link: string;
  type: 'AFFILIATE' | 'MY_PRODUCTS';
  price: 'PAID' | 'FREE_VALUE';
  code: string; // promoCode converted to code for consistency
}

export function useFunnelManagement() {
  const [funnels, setFunnels] = useState<Funnel[]>(generateMockFunnels());
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);

  const handleAddFunnel = () => {
    if (newFunnelName.trim()) {
      const newFunnel: Funnel = {
        id: Date.now().toString(),
        name: newFunnelName.trim(),
        isDeployed: false,
        wasEverDeployed: false,
        sends: 0,
        generationStatus: 'idle' as const,
        resources: [],
        flow: null
      };
      setFunnels([...funnels, newFunnel]);
      setNewFunnelName('');
      setIsAddDialogOpen(false);
      
      setSelectedFunnel(newFunnel);
      return newFunnel; // Return for navigation
    }
  };

  const handleDeleteFunnel = (funnelId: string | null) => {
    if (funnelId) {
      const funnel = funnels.find(f => f.id === funnelId);
      if (funnel) {
        setFunnelToDelete(funnel);
        setIsDeleteDialogOpen(true);
      }
    }
  };

  const handleConfirmDelete = () => {
    if (funnelToDelete) {
      setFunnels(funnels.filter(f => f.id !== funnelToDelete.id));
      setFunnelToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditFunnel = (funnel: Funnel) => {
    if (hasValidFlow(funnel)) {
      setSelectedFunnel(funnel);
      return 'funnelBuilder';
    } else {
      setSelectedFunnel(funnel);
      return 'resources';
    }
  };

  const handleDeployFunnel = (funnelId: string) => {
    setFunnels(funnels.map(f => 
      f.id === funnelId ? { 
        ...f, 
        isDeployed: !f.isDeployed,
        wasEverDeployed: f.wasEverDeployed || !f.isDeployed // Set to true if deploying
      } : f
    ));
  };

  const handleDuplicateFunnel = (funnel: Funnel) => {
    const duplicatedFunnel = {
      ...funnel,
      id: Date.now().toString(),
      name: `${funnel.name} (Copy)`,
      isDeployed: false,
      wasEverDeployed: false, // Reset for new copy
      sends: 0,
      generationStatus: 'idle' as const,
      generationError: undefined,
      lastGeneratedAt: undefined
    };
    setFunnels([...funnels, duplicatedFunnel]);
  };

  const handleSaveFunnelName = (funnelId: string, newName: string) => {
    setFunnels(funnels.map(f => 
      f.id === funnelId ? { ...f, name: newName } : f
    ));
    setEditingFunnelId(null);
  };

  const onFunnelClick = (funnel: Funnel) => {
    if (!hasValidFlow(funnel)) {
      setSelectedFunnel(funnel);
      return 'resources';
    } else {
      setSelectedFunnel(funnel);
      return 'analytics';
    }
  };

  const handleManageResources = (funnel: Funnel) => {
    setSelectedFunnel(funnel);
    return 'resources';
  };

  // Per-funnel generation state management
  const updateFunnelGenerationStatus = (funnelId: string, status: Funnel['generationStatus'], error?: string) => {
    updateFunnelForGeneration(funnelId, {
      generationStatus: status, 
      generationError: error,
      lastGeneratedAt: status === 'completed' ? Date.now() : undefined
    });
  };

  // Check if a specific funnel is generating (no global state dependency)
  const isFunnelGenerating = (funnelId: string) => {
    const funnel = funnels.find(f => f.id === funnelId);
    return funnel?.generationStatus === 'generating';
  };

  // Check if any funnel is currently generating
  const isAnyFunnelGenerating = () => {
    return funnels.some(f => f.generationStatus === 'generating');
  };

  // Special function for generation updates that NEVER changes selectedFunnel
  const updateFunnelForGeneration = (funnelId: string, updates: Partial<Funnel>) => {
    setFunnels(prevFunnels => 
      prevFunnels.map(f => 
        f.id === funnelId ? { ...f, ...updates } : f
      )
    );
  };

  // Improved generation function with per-funnel state
  const handleGlobalGeneration = async (funnelId: string) => {
    if (!funnelId || funnelId.trim() === '') return;

    const targetFunnel = funnels.find(f => f.id === funnelId);
    if (!targetFunnel) return;

    if (targetFunnel.generationStatus === 'generating' && !targetFunnel.flow) return;

    if (targetFunnel.generationStatus === 'generating') return;

    if (isAnyFunnelGenerating()) {
      // Show a short, Whop-native notification instead of alert
      if (typeof window !== 'undefined') {
        // Use a simple toast-like notification that's more Whop-native
        const showNotification = (message: string) => {
          // Create a temporary notification element
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs';
          notification.textContent = message;
          
          // Add close button
          const closeBtn = document.createElement('button');
          closeBtn.innerHTML = '×';
          closeBtn.className = 'ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold';
          closeBtn.onclick = () => notification.remove();
          notification.appendChild(closeBtn);
          
          document.body.appendChild(notification);
          
          // Auto-remove after 3 seconds
          setTimeout(() => {
            if (notification.parentNode) {
              notification.remove();
            }
          }, 3000);
        };
        
        showNotification('Another generation running');
      }
      return;
    }

    // Update this funnel's generation status
    updateFunnelGenerationStatus(funnelId, 'generating');
    
    try {
      const currentFunnelResources = targetFunnel.resources || [];
    
      if (currentFunnelResources.length === 0) {
        // Show a short, Whop-native notification instead of alert
        if (typeof window !== 'undefined') {
          const showNotification = (message: string) => {
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs';
            notification.textContent = message;
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.className = 'ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold';
            closeBtn.onclick = () => notification.remove();
            notification.appendChild(closeBtn);
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
              if (notification.parentNode) {
                notification.remove();
              }
            }, 3000);
          };
          
          showNotification('Add resources first');
        }
        updateFunnelGenerationStatus(funnelId, 'failed', 'No resources assigned');
        return;
      }
    
      const resourcesForAI: AIResource[] = currentFunnelResources.map(resource => ({
        id: resource.id,
        type: resource.type,
        name: resource.name,
        link: resource.link,
        code: resource.promoCode || '',
        price: resource.price || 'FREE_VALUE'
      }));

      // Call the AI generation API
      const response = await fetch('/api/generate-funnel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resources: resourcesForAI }),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response format from API');
      }

      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate funnel');
      }

      const flowData = result.data || result;
      
      // Validate the flow data structure
      if (!flowData || typeof flowData !== 'object') {
        throw new Error('Invalid flow data structure received from API');
      }
      
      if (!flowData.stages || !flowData.blocks || !flowData.startBlockId) {
        throw new Error('Flow data missing required properties (stages, blocks, or startBlockId)');
      }
      
      const updatedFunnel = { ...targetFunnel, flow: flowData };
      updateFunnelForGeneration(funnelId, updatedFunnel);
      updateFunnelGenerationStatus(funnelId, 'completed');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Show a short, Whop-native notification instead of alert
      if (typeof window !== 'undefined') {
        const showNotification = (message: string) => {
          const notification = document.createElement('div');
          notification.className = 'fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs';
          notification.textContent = message;
          
          const closeBtn = document.createElement('button');
          closeBtn.innerHTML = '×';
          closeBtn.className = 'ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold';
          closeBtn.onclick = () => notification.remove();
          notification.appendChild(closeBtn);
          
          document.body.appendChild(notification);
          
          setTimeout(() => {
            if (notification.parentNode) {
              notification.remove();
            }
          }, 3000);
        };
        
        showNotification('Generation failed');
      }
      updateFunnelGenerationStatus(funnelId, 'failed', errorMessage);
    }
  };

  const updateFunnel = (funnelId: string, updates: Partial<Funnel>) => {
    setFunnels(funnels.map(f => f.id === funnelId ? { ...f, ...updates } : f));
    if (selectedFunnel && selectedFunnel.id === funnelId) {
      setSelectedFunnel({ ...selectedFunnel, ...updates });
    }
  };

  return {
    // State
    funnels,
    selectedFunnel,
    isAddDialogOpen,
    isDeleteDialogOpen,
    newFunnelName,
    funnelToDelete,
    editingFunnelId,
    
    // Setters
    setFunnels,
    setSelectedFunnel,
    setIsAddDialogOpen,
    setIsDeleteDialogOpen,
    setNewFunnelName,
    setFunnelToDelete,
    setEditingFunnelId,
    
    // Actions
    handleAddFunnel,
    handleDeleteFunnel,
    handleConfirmDelete,
    handleEditFunnel,
    handleDeployFunnel,
    handleDuplicateFunnel,
    handleSaveFunnelName,
    onFunnelClick,
    handleManageResources,
    updateFunnelGenerationStatus,
    isFunnelGenerating,
    isAnyFunnelGenerating,
    updateFunnelForGeneration,
    handleGlobalGeneration,
    updateFunnel,
  };
}

