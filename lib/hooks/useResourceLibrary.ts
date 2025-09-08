import { useState, useCallback, useMemo, useEffect } from 'react';
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
  const [removingResourceId, setRemovingResourceId] = useState<string | null>(null);
  
  // Backend connection states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch resources from API
  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/resources');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        setAllResources(data.data.resources || []);
      }
    } catch (err) {
      setError('Failed to fetch resources');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  }, [setAllResources, allResources]);

  // Create resource via API
  const createResource = useCallback(async (resourceData: ResourceFormData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        setAllResources([...allResources, data.data]);
        return data.data;
      }
    } catch (err) {
      setError('Failed to create resource');
      console.error('Error creating resource:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setAllResources, allResources]);

  // Update resource via API
  const updateResource = useCallback(async (id: string, updates: Partial<ResourceFormData>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        setAllResources(allResources.map(r => r.id === id ? data.data : r));
        return data.data;
      }
    } catch (err) {
      setError('Failed to update resource');
      console.error('Error updating resource:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setAllResources, allResources]);

  // Delete resource via API
  const deleteResource = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setAllResources(allResources.filter(r => r.id !== id));
    } catch (err) {
      setError('Failed to delete resource');
      console.error('Error deleting resource:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setAllResources, allResources]);

  const handleAddResource = useCallback(async () => {
    if (newResource.name && newResource.link) {
      const resourceName = newResource.name;
      
      // Check for duplicate names using current state
      const isDuplicateName = allResources.some(resource => 
        resource.id !== newResource.id &&
        resource.name.toLowerCase() === resourceName.toLowerCase()
      );
      
      if (isDuplicateName) {
        setError('Resource name already exists');
        return;
      }
      
      try {
        if (newResource.id) {
          // Editing existing resource
          await updateResource(newResource.id, newResource);
        } else {
          // Adding new resource
          await createResource(newResource as ResourceFormData);
        }
        
        // Reset form
        setNewResource({ name: '', link: '', type: 'AFFILIATE', category: 'FREE_VALUE', description: '', promoCode: '' });
        setIsAddingResource(false);
      } catch (err) {
        // Error is already set in the API functions
        console.error('Error in handleAddResource:', err);
      }
    }
  }, [newResource, allResources, createResource, updateResource]);

  const handleDeleteResource = useCallback((resourceId: string, resourceName: string) => {
    setDeleteConfirmation({
      show: true,
      resourceId,
      resourceName
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteConfirmation.resourceId) {
      // Close dialog instantly
      setDeleteConfirmation({ show: false, resourceId: null, resourceName: '' });
      
      // Set removing state
      setRemovingResourceId(deleteConfirmation.resourceId);
      
      try {
        await deleteResource(deleteConfirmation.resourceId);
      } catch (err) {
        // Error is already set in the deleteResource function
        console.error('Error in confirmDelete:', err);
      } finally {
        // Clear removing state
        setRemovingResourceId(null);
      }
    }
  }, [deleteConfirmation.resourceId, deleteResource]);

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
    removingResourceId,
    categoryOptions,
    filteredResources,
    loading,
    error,
    
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
    
    // Backend API functions
    fetchResources,
    createResource,
    updateResource,
    deleteResource,
    
    // Utilities
    isNameAvailable,
    isResourceAssignedToAnyFunnel
  };
};
