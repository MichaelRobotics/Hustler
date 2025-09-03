import { useState, useCallback, useMemo } from 'react';
import { Resource, Funnel } from '../types/resource';

export const useResourcePage = (
  funnel: Funnel,
  onUpdateFunnel: (updatedFunnel: Funnel) => void
) => {
  // Delete confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ 
    show: boolean; 
    resourceId: string | null; 
    resourceName: string 
  }>({
    show: false,
    resourceId: null,
    resourceName: ''
  });

  // Offline confirmation state
  const [offlineConfirmation, setOfflineConfirmation] = useState(false);

  // Get current funnel resources
  const currentResources = useMemo(() => funnel.resources || [], [funnel.resources]);

  const handleDeleteResource = useCallback((resourceId: string, resourceName: string) => {
    setDeleteConfirmation({
      show: true,
      resourceId,
      resourceName
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirmation.resourceId) {
      const updatedResources = currentResources.filter(r => r.id !== deleteConfirmation.resourceId);
      const updatedFunnel = { ...funnel, resources: updatedResources };
      onUpdateFunnel(updatedFunnel);
      setDeleteConfirmation({ show: false, resourceId: null, resourceName: '' });
    }
  }, [deleteConfirmation.resourceId, currentResources, funnel, onUpdateFunnel]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmation({ show: false, resourceId: null, resourceName: '' });
  }, []);

  const openOfflineConfirmation = useCallback(() => {
    setOfflineConfirmation(true);
  }, []);

  const closeOfflineConfirmation = useCallback(() => {
    setOfflineConfirmation(false);
  }, []);

  const takeFunnelOffline = useCallback(() => {
    const updatedFunnel = { ...funnel, isDeployed: false };
    onUpdateFunnel(updatedFunnel);
    setOfflineConfirmation(false);
  }, [funnel, onUpdateFunnel]);

  return {
    // State
    deleteConfirmation,
    offlineConfirmation,
    currentResources,
    
    // Actions
    handleDeleteResource,
    confirmDelete,
    cancelDelete,
    openOfflineConfirmation,
    closeOfflineConfirmation,
    takeFunnelOffline
  };
};
