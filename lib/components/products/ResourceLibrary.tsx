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
    removingResourceId,
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

  // State for inline product creation
  const [isCreatingNewProduct, setIsCreatingNewProduct] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const isResourceInFunnel = (resourceId: string) => {
    return funnel?.resources?.some(r => r.id === resourceId) || false;
  };

  // Handle inline product creation
  const handleCreateNewProductInline = () => {
    setIsCreatingNewProduct(true);
    setNewResource({
      name: '',
      link: '',
      type: 'AFFILIATE',
      category: 'FREE_VALUE',
      description: '',
      promoCode: ''
    });
  };

  // Handle saving new product
  const handleSaveNewProduct = async () => {
    if (!newResource.name?.trim() || !newResource.link?.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await createResource(newResource as any);
      setIsCreatingNewProduct(false);
      setNewResource({
        name: '',
        link: '',
        type: 'AFFILIATE',
        category: 'FREE_VALUE',
        description: '',
        promoCode: ''
      });
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle canceling new product creation
  const handleCancelNewProduct = () => {
    setIsCreatingNewProduct(false);
    setNewResource({
      name: '',
      link: '',
      type: 'AFFILIATE',
      category: 'FREE_VALUE',
      description: '',
      promoCode: ''
    });
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
            onAddProduct={handleCreateNewProductInline}
            filteredResourcesCount={filteredResources.length}
          />

          {/* Resources Counter Section */}
          <div className="mt-8">
            {/* Content goes here - heading removed as requested */}
          </div>

          {/* Add/Edit Resource Modal - Removed for inline creation */}

          {/* Delete Resource Modal */}
          <LibraryResourceDeleteModal
            confirmation={deleteConfirmation}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />

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
          {!error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* New Product Creation Card */}
              {isCreatingNewProduct && (
                <div className="group bg-gradient-to-br from-violet-50/80 via-violet-100/60 to-violet-200/40 dark:from-violet-900/80 dark:via-violet-800/60 dark:to-indigo-900/30 p-4 rounded-xl border-2 border-violet-500/60 dark:border-violet-400/70 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-violet-400 rounded-full animate-pulse" />
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
                        {newResource.type === 'AFFILIATE' ? 'Affiliate' : 'My Product'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        newResource.category === 'PAID' 
                          ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300' 
                          : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                      }`}>
                        {newResource.category === 'PAID' ? 'Paid' : 'Free Value'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSaveNewProduct}
                        disabled={isSaving || !newResource.name?.trim() || !newResource.link?.trim()}
                        className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : '+ Add'}
                      </button>
                      <button
                        onClick={handleCancelNewProduct}
                        disabled={isSaving}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Type and Category Selectors */}
                    <div className="flex gap-2">
                      <select
                        value={newResource.type || 'AFFILIATE'}
                        onChange={(e) => setNewResource({...newResource, type: e.target.value as 'AFFILIATE' | 'MY_PRODUCTS'})}
                        disabled={isSaving}
                        className="flex-1 px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="AFFILIATE">Affiliate</option>
                        <option value="MY_PRODUCTS">My Product</option>
                      </select>
                      <select
                        value={newResource.category || 'FREE_VALUE'}
                        onChange={(e) => setNewResource({...newResource, category: e.target.value as 'PAID' | 'FREE_VALUE'})}
                        disabled={isSaving}
                        className="flex-1 px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="FREE_VALUE">Free Value</option>
                        <option value="PAID">Paid</option>
                      </select>
                    </div>

                    {/* Name Field */}
                    <input
                      type="text"
                      value={newResource.name || ''}
                      onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                      placeholder="Product name..."
                      disabled={isSaving}
                      className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      autoFocus
                    />

                    {/* URL Field */}
                    <input
                      type="url"
                      value={newResource.link || ''}
                      onChange={(e) => setNewResource({...newResource, link: e.target.value})}
                      placeholder="Product URL..."
                      disabled={isSaving}
                      className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    {/* Promo Code Field */}
                    <input
                      type="text"
                      value={newResource.promoCode || ''}
                      onChange={(e) => setNewResource({...newResource, promoCode: e.target.value})}
                      placeholder="Promo code (optional)..."
                      disabled={isSaving}
                      className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

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
                  onUpdate={updateResource}
                  isRemoving={removingResourceId === resource.id}
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!error && filteredResources.length === 0 && (
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
          onGeneration={async () => {
            if (funnel) {
              // Switch to ResourcePage first to show generation progress
              onGoToFunnelProducts();
              // Start generation
              await onGlobalGeneration();
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
