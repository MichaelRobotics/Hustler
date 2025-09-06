'use client';

import { useState, useEffect, useCallback } from 'react';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';
import { deduplicatedFetch } from '../utils/requestDeduplication';
import { useOptimisticUpdates } from '../utils/optimisticUpdates';

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
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use regular fetch since authentication is handled server-side

  // Fetch funnels from API
  const fetchFunnels = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await deduplicatedFetch('/api/funnels');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch funnels: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFunnels(data.data.funnels || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch funnels';
      setError(errorMessage);
      console.error('Error fetching funnels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load funnels on component mount
  useEffect(() => {
    fetchFunnels();
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending operations or subscriptions
      setError(null);
      setIsLoading(false);
    };
  }, []);

  const handleAddFunnel = async () => {
    if (newFunnelName.trim()) {
      try {
        setError(null);
        const response = await deduplicatedFetch('/api/funnels', {
          method: 'POST',
          body: JSON.stringify({ name: newFunnelName.trim() })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create funnel');
        }

        const data = await response.json();
        const newFunnel = data.data;
        
        setFunnels([...funnels, newFunnel]);
        setNewFunnelName('');
        setIsAddDialogOpen(false);
        
        setSelectedFunnel(newFunnel);
        return newFunnel; // Return for navigation
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create funnel';
        setError(errorMessage);
        console.error('Error creating funnel:', err);
      }
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

  const handleConfirmDelete = async () => {
    if (funnelToDelete) {
      try {
        setError(null);
        const response = await deduplicatedFetch(`/api/funnels/${funnelToDelete.id}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete funnel');
        }

        setFunnels(funnels.filter(f => f.id !== funnelToDelete.id));
        setFunnelToDelete(null);
        setIsDeleteDialogOpen(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete funnel';
        setError(errorMessage);
        console.error('Error deleting funnel:', err);
      }
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

  const handleSaveFunnelName = async (funnelId: string, newName: string) => {
    try {
      setError(null);
      const response = await deduplicatedFetch(`/api/funnels/${funnelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update funnel');
      }

      const data = await response.json();
      const updatedFunnel = data.data;
      
      setFunnels(funnels.map(f => 
        f.id === funnelId ? updatedFunnel : f
      ));
      setEditingFunnelId(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update funnel';
      setError(errorMessage);
      console.error('Error updating funnel:', err);
    }
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

  // Handle generation completion (when database save is successful)
  const handleGenerationComplete = useCallback(async (funnelId: string) => {
    try {
      // Update generation status to completed
      updateFunnelGenerationStatus(funnelId, 'completed');
      console.log(`Generation completed and saved to database for funnel ${funnelId}`);
      
      // Deduct credit after successful database save
      // This ensures credits are only consumed when generation is fully complete
      const { consumeCredit } = await import('../actions/credit-actions');
      const creditDeducted = await consumeCredit();
      
      if (creditDeducted) {
        console.log(`Credit deducted for completed generation of funnel ${funnelId}`);
      } else {
        console.warn(`Failed to deduct credit for funnel ${funnelId}`);
      }
    } catch (error) {
      console.error('Error in generation completion handler:', error);
      // Still mark as completed since the funnel was saved successfully
      updateFunnelGenerationStatus(funnelId, 'completed');
    }
  }, []);

  // Handle generation error (when database save fails)
  const handleGenerationError = useCallback((funnelId: string, error: Error) => {
    updateFunnelGenerationStatus(funnelId, 'failed', error.message);
    console.error(`Generation failed to save to database for funnel ${funnelId}:`, error);
  }, []);

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

    // Update this funnel's generation status (atomic update to prevent race conditions)
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
      const response = await deduplicatedFetch('/api/generate-funnel', {
        method: 'POST',
        body: JSON.stringify({ resources: resourcesForAI }),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response format from API');
      }

      if (!response.ok) {
        // Handle insufficient credits error specifically
        if (result.error === 'INSUFFICIENT_CREDITS') {
          throw new Error('Insufficient credits to generate funnel. Please purchase more credits.');
        }
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
      // Keep generation status as 'generating' until database save completes
      // This will be updated to 'completed' when onGenerationComplete is called
      
      // Flow will be saved to database when visualization state is saved
      // This ensures both flow and visualization are saved together
      
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

  // Remove resource from funnel
  const removeResourceFromFunnel = async (funnelId: string, resourceId: string) => {
    try {
      const response = await deduplicatedFetch(`/api/funnels/${funnelId}/resources/${resourceId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove resource from funnel: ${response.statusText}`);
      }
      
      // Update local state to reflect the removal
      const updatedFunnels = funnels.map(f => {
        if (f.id === funnelId) {
          return {
            ...f,
            resources: f.resources?.filter(r => r.id !== resourceId) || []
          };
        }
        return f;
      });
      
      setFunnels(updatedFunnels);
      
      // Update selected funnel if it's the one being modified
      if (selectedFunnel && selectedFunnel.id === funnelId) {
        const updatedSelectedFunnel = {
          ...selectedFunnel,
          resources: selectedFunnel.resources?.filter(r => r.id !== resourceId) || []
        };
        setSelectedFunnel(updatedSelectedFunnel);
      }
      
    } catch (err) {
      console.error('Error removing resource from funnel:', err);
      throw err;
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
    isLoading,
    error,
    
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
    removeResourceFromFunnel,
    fetchFunnels, // Add fetch function for manual refresh
    handleGenerationComplete, // New: callback for generation completion
    handleGenerationError, // New: callback for generation errors
  };
}

