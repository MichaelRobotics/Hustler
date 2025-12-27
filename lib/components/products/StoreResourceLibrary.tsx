"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, DollarSign, Gift, Upload, Trash2 } from 'lucide-react';
import { StoreResourceGrid } from './StoreResourceGrid';
import { ResourceLibraryHeader } from './ResourceLibraryHeader';
import { LibraryEmptyState } from './LibraryEmptyState';
import { LibraryResourceDeleteModal } from './modals/LibraryResourceDeleteModal';
import { ResourceCreateForm } from './forms/ResourceCreateForm';
import { ResourceEditForm } from './forms/ResourceEditForm';
import { Resource } from '@/lib/types/resource';
import { AuthenticatedUser } from '@/lib/types/user';
import { apiPut, apiPost, apiDelete } from '@/lib/utils/api-client';
import { useResourceLibrary } from '@/lib/hooks/useResourceLibrary';

interface StoreResourceLibraryProps {
  // Theme context
  themeContext: {
    themeId: string;
    season: string;
    themeName: string;
  };
  frontendState: any;
  allResources: Resource[];
  setAllResources: (resources: Resource[]) => void;
  onBack: () => void;
  user: AuthenticatedUser | null; // Restore user prop like global ResourceLibrary
  // Theme management
  onAddToTheme: (resource: Resource) => void;
  onRemoveFromTheme: (resource: Resource) => void;
  isResourceInTheme: (resourceId: string) => boolean;
  autoOpenCreateModal?: boolean;
}

export const StoreResourceLibrary: React.FC<StoreResourceLibraryProps> = ({
  themeContext,
  frontendState,
  allResources,
  setAllResources,
  onBack,
  user,
  onAddToTheme,
  onRemoveFromTheme,
  isResourceInTheme,
  autoOpenCreateModal = false,
}) => {
  // Use the same resource management hook as global ResourceLibrary
  const {
    createResource,
    updateResource,
    deleteResource,
    setError: setResourceError,
  } = useResourceLibrary(allResources, [], setAllResources, user);
  
  // State management (matching ResourceLibrary)
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [removingResourceId, setRemovingResourceId] = useState<string | null>(null);
  const [highlightedCards, setHighlightedCards] = useState<string[]>([]);
  const [newlyCreatedResourceId, setNewlyCreatedResourceId] = useState<string | null>(null);
  const [newlyEditedResourceId, setNewlyEditedResourceId] = useState<string | null>(null);
  const [showCreateSuccessPopup, setShowCreateSuccessPopup] = useState(false);
  const [showEditSuccessPopup, setShowEditSuccessPopup] = useState(false);
  const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);
  const [newlyCreatedResource, setNewlyCreatedResource] = useState<Resource | null>(null);
  const [newlyEditedResource, setNewlyEditedResource] = useState<Resource | null>(null);
  const [deletedResource, setDeletedResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    resourceId: null as string | null,
    resourceName: '',
  });

  // Filter for PAID resources only (Market Stall only shows paid products)
  // Sort by displayOrder (resources with displayOrder first, then by updatedAt)
  const paidResources = allResources
    .filter(resource => resource.category === "PAID")
    .sort((a, b) => {
      // Resources with displayOrder come first
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      if (a.displayOrder !== undefined) return -1;
      if (b.displayOrder !== undefined) return 1;
      // Both undefined, maintain original order
      return 0;
    });

  // Auto-open create modal if requested
  useEffect(() => {
    if (autoOpenCreateModal) {
      // Add a small delay to ensure component is fully mounted
      setTimeout(() => {
        setIsCreatingNewProduct(true);
      }, 100);
    }
  }, [autoOpenCreateModal]);


  // Handle creating new resource
  const handleCreateNewProductInline = useCallback(() => {
    // Close edit modal first if open
    setIsEditingProduct(false);
    setEditingResource(null);
    // Open create modal
    setIsCreatingNewProduct(true);
  }, []);

  const handleSaveNewProduct = useCallback(async (formData: any) => {
    try {
      console.log('🔍 StoreResourceLibrary: Using createResource hook');
      
      // Use the same createResource function as global ResourceLibrary
      const newResource = await createResource(formData);
      console.log('✅ StoreResourceLibrary: createResource returned:', newResource);
      
      // Close form
      setIsCreatingNewProduct(false);
      
      // Show success notification
      setNewlyCreatedResource(newResource);
      setNewlyCreatedResourceId(newResource.id);
      setShowCreateSuccessPopup(true);
      
      // Reset notification after 3 seconds
      setTimeout(() => {
        setShowCreateSuccessPopup(false);
        setNewlyCreatedResource(null);
        setNewlyCreatedResourceId(null);
      }, 3000);
      
      console.log('✅ Resource created:', newResource.name);
    } catch (error) {
      console.error('❌ Error creating resource:', error);
      setError(error instanceof Error ? error.message : 'Failed to create resource');
    }
  }, [createResource]);

  const handleCancelNewProduct = useCallback(() => {
    setIsCreatingNewProduct(false);
    setError(null);
  }, []);

  // Handle reordering resources (only called on actual drop)
  const handleReorder = useCallback(async (reorderedResources: Resource[]) => {
    if (!user?.experienceId) {
      console.error('❌ Cannot reorder: Experience ID is required');
      setError('Experience ID is required. Please refresh the page.');
      return;
    }

    try {
      setError(null);
      
      // Prepare update payload with new displayOrder values
      const updates = reorderedResources.map((resource, index) => ({
        id: resource.id,
        displayOrder: index + 1, // Start from 1
      }));

      // Call API to update order using apiPost utility which handles auth
      const response = await apiPost('/api/resources/reorder', {
        resources: updates,
      }, user.experienceId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to save resource order');
      }

      // Update local state with new order
      const updatedResources = allResources.map((resource) => {
        const update = updates.find((u) => u.id === resource.id);
        if (update) {
          return { ...resource, displayOrder: update.displayOrder };
        }
        return resource;
      });

      setAllResources(updatedResources);
      
      console.log('✅ Resource order updated successfully');
    } catch (error) {
      console.error('❌ Error reordering resources:', error);
      setError(error instanceof Error ? error.message : 'Failed to save resource order');
      // Optionally revert the UI state here if needed
    }
  }, [allResources, setAllResources, user?.experienceId]);

  // Handle editing resource
  const handleStartEditProduct = useCallback((resource: Resource) => {
    // Close create modal first if open
    setIsCreatingNewProduct(false);
    // Open edit modal
    setEditingResource(resource);
    setIsEditingProduct(true);
  }, []);

  const handleSaveEditedProduct = useCallback(async (formData: any) => {
    console.log('🚀 StoreResourceLibrary: handleSaveEditedProduct called with:', formData);
    
    if (!editingResource) {
      console.log('❌ StoreResourceLibrary: Missing editingResource');
      console.log('❌ editingResource:', editingResource);
      return;
    }

    try {
      console.log('🔍 StoreResourceLibrary: Using updateResource hook for:', editingResource.id);
      
      // Use the same updateResource function as global ResourceLibrary
      const updatedResource = await updateResource(editingResource.id, formData);
      console.log('✅ StoreResourceLibrary: updateResource returned:', updatedResource);
      
      // Close editing
      setEditingResource(null);
      setIsEditingProduct(false);
      
      // Show success notification
      setNewlyEditedResource(updatedResource);
      setNewlyEditedResourceId(updatedResource.id);
      setShowEditSuccessPopup(true);
      
      // Reset notification after 3 seconds
      setTimeout(() => {
        setShowEditSuccessPopup(false);
        setNewlyEditedResource(null);
        setNewlyEditedResourceId(null);
      }, 3000);
      
      console.log('✅ Resource updated:', updatedResource.name);
    } catch (error) {
      console.error('❌ Error updating resource:', error);
      setError(error instanceof Error ? error.message : 'Failed to update resource');
    }
  }, [editingResource, updateResource]);

  const handleCancelEditProduct = useCallback(() => {
    setEditingResource(null);
    setIsEditingProduct(false);
    setError(null);
  }, []);

  // Handle deleting resource
  const handleDeleteResource = useCallback((resourceId: string, resourceName: string) => {
    setDeleteConfirmation({
      show: true,
      resourceId,
      resourceName,
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmation.resourceId) return;

    setRemovingResourceId(deleteConfirmation.resourceId);
    try {
      console.log('🔍 StoreResourceLibrary: Using deleteResource hook for:', deleteConfirmation.resourceId);
      
      // Use the same deleteResource function as global ResourceLibrary
      await deleteResource(deleteConfirmation.resourceId);
      console.log('✅ StoreResourceLibrary: deleteResource completed');
      
      console.log('✅ Resource deleted:', deleteConfirmation.resourceName);
    } catch (error) {
      console.error('❌ Error deleting resource:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete resource');
    } finally {
      setRemovingResourceId(null);
    }
  }, [deleteConfirmation, deleteResource]);

  const handleDeleteWithNotification = useCallback(async () => {
    const resourceToDelete = allResources.find(r => r.id === deleteConfirmation.resourceId);
    
    // Call the original confirmDelete
    await confirmDelete();
    
    // Show delete success notification
    if (resourceToDelete) {
      setDeletedResource(resourceToDelete);
      setShowDeleteSuccessPopup(true);
      
      // Reset notification after 3 seconds
      setTimeout(() => {
        setShowDeleteSuccessPopup(false);
        setDeletedResource(null);
      }, 3000);
    }
    
    // Close confirmation modal
    setDeleteConfirmation({
      show: false,
      resourceId: null,
      resourceName: '',
    });
  }, [confirmDelete, deleteConfirmation, allResources]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmation({
      show: false,
      resourceId: null,
      resourceName: '',
    });
  }, []);


  // Handle highlighting cards
  const handleHighlightCards = useCallback((cardIds: string[]) => {
    setHighlightedCards(cardIds);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

      <div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <ResourceLibraryHeader
            context="store"
            onBack={onBack}
            onAddProduct={handleCreateNewProductInline}
            filteredResourcesCount={paidResources.length}
            allResourcesCount={allResources.length}
            subscription={user?.subscription ?? "Basic"}
            experienceId={user?.experienceId}
            user={user}
          />

          {/* Delete Resource Modal */}
          <LibraryResourceDeleteModal
            confirmation={deleteConfirmation}
            onConfirm={handleDeleteWithNotification}
            onCancel={cancelDelete}
          />

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-destructive font-medium">
                  Error loading resources
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-sm text-destructive hover:underline"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          )}

          {/* Create Product Form */}
          {isCreatingNewProduct && (
            <div data-create-form className="mt-8">
              <ResourceCreateForm
                onSave={handleSaveNewProduct}
                onCancel={handleCancelNewProduct}
                allResources={allResources}
                error={error}
                setError={setError}
                defaultCategory="PAID"
                experienceId={user?.experienceId}
              />
            </div>
          )}

          {/* Edit Product Form */}
          {isEditingProduct && editingResource && (
            <div className="mt-8">
              <ResourceEditForm
                resource={editingResource}
                onSave={handleSaveEditedProduct}
                onCancel={handleCancelEditProduct}
                allResources={allResources}
                error={error}
                setError={setError}
                experienceId={user?.experienceId}
              />
            </div>
          )}

          {/* Resources Grid */}
          {!error && (
            <div className="mt-8">
              <StoreResourceGrid
              resources={paidResources}
              allResources={allResources}
              onEdit={handleStartEditProduct}
              onDelete={handleDeleteResource}
              onUpdate={handleSaveEditedProduct}
              removingResourceId={removingResourceId || undefined}
              highlightedCards={highlightedCards}
              themeContext={themeContext}
              onAddToTheme={onAddToTheme}
              onRemoveFromTheme={onRemoveFromTheme}
              isResourceInTheme={isResourceInTheme}
              editingResourceId={editingResource?.id || null}
              onReorder={handleReorder}
            />
            </div>
          )}

          {/* Empty State */}
          {!error && paidResources.length === 0 && (
            <LibraryEmptyState selectedCategory="PAID" />
          )}
        </div>
      </div>

      {/* Success Notification Popups */}
      {showCreateSuccessPopup && newlyCreatedResource && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-green-600 backdrop-blur-sm">
            <CheckCircle size={18} className="animate-bounce text-green-100" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-green-100" strokeWidth={2.5} />
                <span className="font-semibold">
                  Paid Digital Asset Created!
                </span>
              </div>
              <span className="text-green-100 text-xs">
                {newlyCreatedResource.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {showEditSuccessPopup && newlyEditedResource && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-blue-600 backdrop-blur-sm">
            <CheckCircle size={18} className="animate-bounce text-blue-100" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-blue-100" strokeWidth={2.5} />
                <span className="font-semibold">
                  Paid Digital Asset Updated!
                </span>
              </div>
              <span className="text-blue-100 text-xs">
                {newlyEditedResource.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {showDeleteSuccessPopup && deletedResource && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-red-600 backdrop-blur-sm">
            <Trash2 size={18} className="animate-bounce text-red-100" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-red-100" strokeWidth={2.5} />
                <span className="font-semibold">
                  Paid Digital Asset Deleted!
                </span>
              </div>
              <span className="text-red-100 text-xs">
                {deletedResource.name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};