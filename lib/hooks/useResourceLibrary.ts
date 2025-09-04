import { useState, useCallback, useMemo } from 'react';
import { Resource, ResourceFormData, DeleteConfirmation, Funnel } from '../types/resource';

export const useResourceLibrary = (
  allResources: Resource[],
  allFunnels: Funnel[],
  setAllResources: (resources: Resource[]) => void
) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [newResource, setNewResource] = useState<Partial<ResourceFormData>>({
    name: '',
    link: '',
    type: 'AFFILIATE',
    category: 'FREE_VALUE',
    description: '',
    promoCode: ''
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    show: false,
    resourceId: null,
    resourceName: ''
  });

  const categoryOptions = useMemo(() => ['all', 'PAID', 'FREE_VALUE'], []);

  // Helper function to check if a name is available
  const isNameAvailable = useCallback((name: string, currentId?: string): boolean => {
    if (!name.trim()) return true;
    return !allResources.some(resource => 
      resource.id !== currentId && 
      resource.name.toLowerCase() === name.toLowerCase()
    );
  }, [allResources]);

  // Check if a resource is assigned to any funnel
  const isResourceAssignedToAnyFunnel = useCallback((resourceId: string): boolean => {
    return allFunnels.some(funnel => 
      funnel.resources && funnel.resources.some(resource => resource.id === resourceId)
    );
  }, [allFunnels]);

  const filteredResources = useMemo(() => 
    selectedCategory === 'all' 
      ? allResources 
      : allResources.filter(resource => resource.category === selectedCategory),
    [selectedCategory, allResources]
  );

  const handleAddResource = useCallback(() => {
    if (newResource.name && newResource.link) {
      const resourceName = newResource.name;
      const isDuplicateName = allResources.some(resource => 
        resource.id !== newResource.id &&
        resource.name.toLowerCase() === resourceName.toLowerCase()
      );
      
      if (isDuplicateName) {
        return;
      }
      
      if (newResource.id) {
        // Editing existing resource
        const updatedResources = allResources.map(r => 
          r.id === newResource.id ? { ...r, ...newResource } : r
        );
        setAllResources(updatedResources);
      } else {
        // Adding new resource
        const resource: Resource = {
          id: Date.now().toString(),
          name: newResource.name,
          link: newResource.link,
          type: newResource.type as 'AFFILIATE' | 'MY_PRODUCTS',
          category: newResource.category as 'PAID' | 'FREE_VALUE',
          description: newResource.description,
          promoCode: newResource.promoCode
        };
        
        const updatedResources = [...allResources, resource];
        setAllResources(updatedResources);
      }
      
      // Reset form
      setNewResource({ name: '', link: '', type: 'AFFILIATE', category: 'FREE_VALUE', description: '', promoCode: '' });
      setIsAddingResource(false);
    }
  }, [newResource, allResources, setAllResources]);

  const handleDeleteResource = useCallback((resourceId: string, resourceName: string) => {
    setDeleteConfirmation({
      show: true,
      resourceId,
      resourceName
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirmation.resourceId) {
      const updatedResources = allResources.filter(r => r.id !== deleteConfirmation.resourceId);
      setAllResources(updatedResources);
      setDeleteConfirmation({ show: false, resourceId: null, resourceName: '' });
    }
  }, [deleteConfirmation.resourceId, allResources, setAllResources]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmation({ show: false, resourceId: null, resourceName: '' });
  }, []);

  const resetForm = useCallback(() => {
    setNewResource({ name: '', link: '', type: 'AFFILIATE', category: 'FREE_VALUE', description: '', promoCode: '' });
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setIsAddingResource(true);
  }, [resetForm]);

  const openEditModal = useCallback((resource: Resource) => {
    setNewResource({
      id: resource.id,
      name: resource.name,
      link: resource.link,
      type: resource.type,
      category: resource.category,
      description: resource.description,
      promoCode: resource.promoCode
    });
    setIsAddingResource(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsAddingResource(false);
    resetForm();
  }, [resetForm]);

  return {
    // State
    selectedCategory,
    isAddingResource,
    newResource,
    deleteConfirmation,
    categoryOptions,
    filteredResources,
    
    // Actions
    setSelectedCategory,
    setNewResource,
    handleAddResource,
    handleDeleteResource,
    confirmDelete,
    cancelDelete,
    openAddModal,
    openEditModal,
    closeModal,
    
    // Utilities
    isNameAvailable,
    isResourceAssignedToAnyFunnel
  };
};
