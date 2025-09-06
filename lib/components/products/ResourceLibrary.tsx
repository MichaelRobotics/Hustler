'use client';

import React from 'react';
import { useResourceLibrary } from '../../hooks/useResourceLibrary';
import { ResourceLibraryProps } from '../../types/resource';
import { ResourceLibraryHeader } from './ResourceLibraryHeader';
import { LibraryResourceModal } from './modals/LibraryResourceModal';
import { LibraryResourceDeleteModal } from './modals/LibraryResourceDeleteModal';
import { ResourceCard } from './ResourceCard';
import { LibraryEmptyState } from './LibraryEmptyState';
import UnifiedNavigation from '../common/UnifiedNavigation';
import { hasValidFlow } from '@/lib/helpers/funnel-validation';

const ResourceLibrary: React.FC<ResourceLibraryProps> = ({
  funnel,
  allResources,
  allFunnels = [],
  setAllResources,
  onBack,
  onAddToFunnel,
  onEdit,
  onGoToPreview,
  onGlobalGeneration,
  isGenerating,
  isAnyFunnelGenerating,
  onGoToFunnelProducts,
  context
}) => {
  const {
    selectedCategory,
    isAddingResource,
    newResource,
    deleteConfirmation,
    filteredResources,
    loading,
    error,
    setSelectedCategory,
    setNewResource,
    handleAddResource,
    handleDeleteResource,
    confirmDelete,
    cancelDelete,
    openAddModal,
    openEditModal,
    closeModal,
    isNameAvailable,
    isResourceAssignedToAnyFunnel,
    fetchResources,
    createResource,
    updateResource,
    deleteResource
  } = useResourceLibrary(allResources, allFunnels, setAllResources);

  const isResourceInFunnel = (resourceId: string) => {
    return funnel?.resources?.some(r => r.id === resourceId) || false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />
      
      <div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <ResourceLibraryHeader
            context={context}
            onBack={onBack}
            onAddProduct={openAddModal}
            filteredResourcesCount={filteredResources.length}
          />

          {/* Resources Counter Section */}
          <div className="mt-8">
            {/* Content goes here - heading removed as requested */}
          </div>

          {/* Add/Edit Resource Modal */}
          <LibraryResourceModal
            isOpen={isAddingResource}
            resource={newResource}
            onClose={closeModal}
            onSubmit={handleAddResource}
            onChange={setNewResource}
            isNameAvailable={isNameAvailable}
            context={context}
          />

          {/* Delete Resource Modal */}
          <LibraryResourceDeleteModal
            confirmation={deleteConfirmation}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading resources...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-destructive font-medium">Error loading resources</div>
                <button
                  onClick={fetchResources}
                  className="ml-auto text-sm text-destructive hover:underline"
                >
                  Retry
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          )}

          {/* Resources Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map(resource => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  funnel={funnel}
                  context={context}
                  isResourceInFunnel={isResourceInFunnel}
                  isResourceAssignedToAnyFunnel={isResourceAssignedToAnyFunnel}
                  onAddToFunnel={onAddToFunnel}
                  onEdit={openEditModal}
                  onDelete={handleDeleteResource}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredResources.length === 0 && (
            <LibraryEmptyState selectedCategory={selectedCategory} />
          )}
        </div>
      </div>

      {/* Unified Navigation - Only show in funnel context, with preview functionality, and hide when generating or when no resources and no funnel generated */}
      {context === 'funnel' && !isGenerating && funnel && ((funnel.resources?.length || 0) > 0 || hasValidFlow(funnel)) && (
        <UnifiedNavigation
          onPreview={() => {
            if (funnel && onGoToPreview) {
              onGoToPreview(funnel);
            }
          }}
          onFunnelProducts={onGoToFunnelProducts}
          onEdit={() => {
            if (funnel && onEdit) {
              onEdit();
            }
          }}
          onGeneration={() => {
            if (funnel) {
              onGlobalGeneration();
            }
          }}
          isGenerated={funnel ? hasValidFlow(funnel) : false}
          isGenerating={isGenerating}
          isAnyFunnelGenerating={isAnyFunnelGenerating}
          isDeployed={funnel?.isDeployed}
          showOnPage="resources"
        />
      )}
    </div>
  );
};

export default ResourceLibrary;
