"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import React, { useEffect, useState } from "react";
import { CheckCircle, DollarSign, Gift, Upload, Trash2 } from "lucide-react";
import { useResourceLibrary } from "../../hooks/useResourceLibrary";
import { useAutoNavigation } from "../../hooks/useAutoNavigation";
import type { ResourceLibraryProps } from "../../types/resource";
import UnifiedNavigation from "../common/UnifiedNavigation";
import { LibraryEmptyState } from "./LibraryEmptyState";
import { ResourceLibraryHeader } from "./ResourceLibraryHeader";
import { LibraryResourceDeleteModal } from "./modals/LibraryResourceDeleteModal";
import { validateFunnelProducts } from "../../helpers/funnel-product-validation";
import { FunnelGenerationSection } from "./FunnelGenerationSection";
import { InsufficientProductsValidation } from "./InsufficientProductsValidation";
import { ResourceCreateForm } from "./forms/ResourceCreateForm";
import { ResourceEditForm } from "./forms/ResourceEditForm";
import { ResourceGrid } from "./ResourceGrid";

// Helper function to check if there's at least 1 free resource
const hasAtLeastOneFreeResource = (funnel: any) => {
	if (!funnel?.resources) return false;
	return funnel.resources.some((resource: any) => resource.category === "FREE_VALUE");
};

const ResourceLibrary: React.FC<ResourceLibraryProps> = ({
	funnel,
	allResources,
	allFunnels = [],
	setAllResources,
	onBack,
	onAddToFunnel,
	onRemoveFromFunnel,
	onEdit,
	onGoToPreview,
	onGlobalGeneration,
	isGenerating,
	isAnyFunnelGenerating,
	onGoToFunnelProducts,
	onOpenOfflineConfirmation,
	onDeploy,
	context,
	onModalStateChange,
	user,
	// Generation props for funnel context
	isGeneratingFunnel,
	onGlobalGenerationFunnel,
	// Auto-navigation callback
	onNavigate,
	// Deployment state
	isDeploying = false,
	hasAnyLiveFunnel = false,
}) => {
	// Auto-navigation to funnel builder when generation completes (only in funnel context)
	useAutoNavigation({
		funnel: funnel || { id: "", name: "", flow: null },
		isGenerating: isGeneratingFunnel || (() => false),
		onNavigate: onNavigate || (() => {}),
		enabled: context === "funnel" && !!funnel, // Only enable auto-navigation in funnel context
	});

	// Check product validation for navigation visibility
	const productValidation = funnel
		? validateFunnelProducts(funnel)
		: { isValid: false, hasPaidProducts: false, hasFreeProducts: false, hasMinimumResources: false, missingTypes: [] };

	// Convert isGenerating to boolean for display logic
	const currentlyGenerating =
		typeof isGenerating === "function"
			? funnel
				? isGenerating(funnel.id)
				: false
			: isGenerating;
	
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
		deleteResource,
		setError,
	} = useResourceLibrary(allResources, allFunnels, setAllResources, user);

	// Highlighting state for insufficient products validation
  const [highlightedCards, setHighlightedCards] = useState<string[]>([]);
	
	// State for "Create Digital Assets" scenario
  const [showCreateAssets, setShowCreateAssets] = useState(false);
	
	// Check if there's only 1 funnel (for highlighting form fields)
	const isSingleFunnel = allFunnels.length === 1;

  // State for inline product creation and editing
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  
  // State for newly created/edited resource animation
  const [newlyCreatedResourceId, setNewlyCreatedResourceId] = useState<string | null>(null);
  const [showCreateSuccessPopup, setShowCreateSuccessPopup] = useState(false);
  const [newlyCreatedResource, setNewlyCreatedResource] = useState<any>(null);
  const [newlyEditedResourceId, setNewlyEditedResourceId] = useState<string | null>(null);
  const [showEditSuccessPopup, setShowEditSuccessPopup] = useState(false);
  const [newlyEditedResource, setNewlyEditedResource] = useState<any>(null);
  
  // State for delete success notification
  const [showDeleteSuccessPopup, setShowDeleteSuccessPopup] = useState(false);
  const [deletedResource, setDeletedResource] = useState<any>(null);
  
  // State for tracking if any resource is being edited
  const [isEditingResource, setIsEditingResource] = useState(false);

  // Notify parent when modal states change
  useEffect(() => {
    const isModalOpen =
      isAddingResource || deleteConfirmation.show || isCreatingNewProduct || isEditingResource || isEditingProduct;
    onModalStateChange?.(isModalOpen);
  }, [
    isAddingResource,
    deleteConfirmation.show,
    isCreatingNewProduct,
    isEditingResource,
    isEditingProduct,
    onModalStateChange,
  ]);

  const isResourceInFunnel = (resourceId: string) => {
    return funnel?.resources?.some((r) => r.id === resourceId) || false;
  };


  // Filter resources based on funnel generation status
  const getDisplayResources = () => {
    // If funnel is generated (has valid flow), show only assigned resources
    if (context === "funnel" && funnel && hasValidFlow(funnel)) {
      return filteredResources.filter(resource => isResourceInFunnel(resource.id));
    }
    // Otherwise, show all filtered resources
    return filteredResources;
  };

  const displayResources = getDisplayResources();

	// Handle highlighting cards from insufficient products validation
	const handleHighlightCards = (cardIds: string[]) => {
		setHighlightedCards(cardIds);
	};

	// Handle create assets state change
	const handleCreateAssetsStateChange = (showCreateAssets: boolean) => {
		setShowCreateAssets(showCreateAssets);
	};

	// Clear highlighting when criteria are met
	React.useEffect(() => {
		if (funnel) {
			const resources = funnel.resources || [];
			const totalCount = resources.length;
			const freeCount = resources.filter(r => r.category === "FREE_VALUE").length;
			
			// Clear highlighting if criteria are met (3+ total, 1+ free)
			if (totalCount >= 3 && freeCount >= 1) {
				setHighlightedCards([]);
			}
		}
	}, [funnel]);

	// Wrapper for onAddToFunnel that also clears highlighting for the added card
	const handleAddToFunnelWithHighlighting = (resource: any) => {
		// Remove this card from highlighted cards
		setHighlightedCards(prev => prev.filter(id => id !== resource.id));
		
		// Call the original onAddToFunnel
		if (onAddToFunnel) {
			onAddToFunnel(resource);
		}
	};

	// Handle inline product creation
	const handleCreateNewProductInline = () => {
		setIsCreatingNewProduct(true);
		setNewResource({
			name: "",
			link: "",
			type: "MY_PRODUCTS",
			category: "FREE_VALUE",
			description: "",
			promoCode: "",
		});
	};

	// Handle saving new product
  const handleSaveNewProduct = async (resource: any) => {
    const createdResource = await createResource(resource);
			
			// Trigger green animation for newly created resource
			if (createdResource?.id) {
				setNewlyCreatedResourceId(createdResource.id);
				setNewlyCreatedResource(createdResource);
				setShowCreateSuccessPopup(true);
				
				// Scroll to newly created resource on mobile
				setTimeout(() => {
					const resourceElement = document.querySelector(`[data-resource-id="${createdResource.id}"]`);
					if (resourceElement) {
						resourceElement.scrollIntoView({ 
							behavior: 'smooth', 
							block: 'center',
							inline: 'nearest'
						});
					}
				}, 100);
				
				// Reset animation states after 3 seconds
				setTimeout(() => {
					setNewlyCreatedResourceId(null);
					setNewlyCreatedResource(null);
					setShowCreateSuccessPopup(false);
				}, 3000);
			}
			
			setIsCreatingNewProduct(false);
	};

	// Handle canceling new product creation
	const handleCancelNewProduct = () => {
			setIsCreatingNewProduct(false);
	};

	// Handle starting product edit
	const handleStartEditProduct = (resource: any) => {
		setIsEditingProduct(true);
		setEditingResource(resource);
	};

	// Handle saving edited product
  const handleSaveEditedProduct = async (resource: any) => {
    const updatedResource = await updateResource(resource.id, resource);
			
			// Trigger green animation for edited resource
			if (updatedResource?.id) {
				setNewlyEditedResourceId(updatedResource.id);
				setNewlyEditedResource(updatedResource);
				setShowEditSuccessPopup(true);
				
				// Scroll to edited resource on mobile
				setTimeout(() => {
					const resourceElement = document.querySelector(`[data-resource-id="${updatedResource.id}"]`);
					if (resourceElement) {
						resourceElement.scrollIntoView({ 
							behavior: 'smooth', 
							block: 'center',
							inline: 'nearest'
						});
					}
				}, 100);
				
				// Reset animation states after 3 seconds
				setTimeout(() => {
					setNewlyEditedResourceId(null);
					setNewlyEditedResource(null);
					setShowEditSuccessPopup(false);
				}, 3000);
			}
			
			setIsEditingProduct(false);
			setEditingResource(null);
	};

	// Handle canceling product edit
	const handleCancelEditProduct = () => {
			setIsEditingProduct(false);
		setEditingResource(null);
	};

	// Handle editing state changes
	const handleEditingChange = (isEditing: boolean) => {
		if (isEditing) {
			// Immediately hide sidebar when starting to edit
			setIsEditingResource(true);
		} else {
			// Add delay before showing sidebar when canceling edit (matches mobile keyboard close animation)
			setTimeout(() => {
				setIsEditingResource(false);
			}, 250); // 250ms delay to match mobile keyboard close animation
		}
	};

  // Wrapper for updateResource that triggers green animation
  const handleUpdateResourceWithAnimation = async (resourceId: string, updatedResource: Partial<any>) => {
    try {
      const result = await updateResource(resourceId, updatedResource);
      
      // Trigger green animation for edited resource
      if (result?.id) {
        setNewlyEditedResourceId(result.id);
        setNewlyEditedResource(result);
        setShowEditSuccessPopup(true);
        
        // Scroll to edited resource on mobile
        setTimeout(() => {
          const resourceElement = document.querySelector(`[data-resource-id="${result.id}"]`);
          if (resourceElement) {
            resourceElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }
        }, 100);
        
        // Reset animation states after 3 seconds
        setTimeout(() => {
          setNewlyEditedResourceId(null);
          setNewlyEditedResource(null);
          setShowEditSuccessPopup(false);
        }, 3000);
      }
      
      return result;
    } catch (error) {
      console.error("Failed to update resource:", error);
      throw error;
    }
  };

  // Wrapper for confirmDelete that shows delete success notification
  const handleDeleteWithNotification = async () => {
    // Get the resource being deleted before it's removed
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
						onOpenOfflineConfirmation={onOpenOfflineConfirmation}
						onDeploy={onDeploy}
						filteredResourcesCount={filteredResources.length}
						funnel={funnel}
						allResourcesCount={allResources.length}
						isDeploying={isDeploying}
						hasAnyLiveFunnel={hasAnyLiveFunnel}
						showCreateAssets={showCreateAssets}
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
									onClick={fetchResources}
									className="ml-auto text-sm text-destructive hover:underline"
								>
									Retry
								</button>
							</div>
							<p className="text-sm text-muted-foreground mt-1">{error}</p>
						</div>
					)}

					{/* Generation Sections - Only show in funnel context */}
					{context === "funnel" && funnel && (
						<>
							{/* Generate Section or Validation Message */}
							{hasAtLeastOneFreeResource(funnel) && (funnel.resources?.length || 0) >= 3 ? (
								<div className="mb-8">
									<FunnelGenerationSection
										funnel={funnel}
										user={user ?? null}
										currentResources={funnel.resources || []}
										isGenerating={isGeneratingFunnel || (() => false)}
										isAnyFunnelGenerating={isAnyFunnelGenerating || (() => false)}
										onGlobalGeneration={onGlobalGenerationFunnel || (async () => {})}
										totalFunnels={allFunnels.length}
										onDeploy={onDeploy}
									/>
								</div>
              ) : (
								<div className="mb-8">
									<InsufficientProductsValidation 
										funnel={funnel} 
										allResources={allResources}
										onHighlightCards={handleHighlightCards}
										onCreateAssetsStateChange={handleCreateAssetsStateChange}
									/>
								</div>
              )}
						</>
					)}

          {/* Create Product Form */}
							{isCreatingNewProduct && (
            <ResourceCreateForm
              onSave={handleSaveNewProduct}
              onCancel={handleCancelNewProduct}
              allResources={allResources}
              isSingleFunnel={isSingleFunnel}
              error={error}
              setError={setError}
            />
							)}

							{/* Edit Product Form */}
							{isEditingProduct && editingResource && (
            <ResourceEditForm
              resource={editingResource}
              onSave={handleSaveEditedProduct}
              onCancel={handleCancelEditProduct}
              allResources={allResources}
              error={error}
              setError={setError}
            />
          )}

          {/* Resources Grid */}
          {!error && (
            <div className="mt-8">
              <ResourceGrid
              resources={displayResources}
															funnel={funnel}
															context={context}
															allResources={allResources}
															isResourceInFunnel={isResourceInFunnel}
															isResourceAssignedToAnyFunnel={isResourceAssignedToAnyFunnel}
															onAddToFunnel={handleAddToFunnelWithHighlighting}
              onRemoveFromFunnel={onRemoveFromFunnel || (() => {})}
															onEdit={handleStartEditProduct}
              onDelete={handleDeleteResource}
															onUpdate={handleUpdateResourceWithAnimation}
              removingResourceId={removingResourceId || undefined}
															onEditingChange={handleEditingChange}
															hideAssignmentOptions={context === "funnel" && funnel && (hasValidFlow(funnel) || currentlyGenerating)}
              newlyCreatedResourceId={newlyCreatedResourceId || undefined}
              newlyEditedResourceId={newlyEditedResourceId || undefined}
              highlightedCards={highlightedCards}
              editingResourceId={editingResource?.id || null}
            />
            </div>
          )}

					{/* Empty State */}
					{!error && filteredResources.length === 0 && (
						<LibraryEmptyState selectedCategory={selectedCategory} />
					)}
				</div>
			</div>

      {/* Unified Navigation */}
			{context === "funnel" &&
				!currentlyGenerating &&
				funnel &&
				hasValidFlow(funnel) &&
				((funnel.resources?.length || 0) > 0 || hasValidFlow(funnel)) &&
				(funnel.resources?.length || 0) >= 3 &&
				productValidation.hasFreeProducts && (
					<UnifiedNavigation
						onPreview={() => {
							if (funnel && onGoToPreview) {
								onGoToPreview(funnel);
							}
						}}
						user={user}
						onFunnelProducts={onGoToFunnelProducts}
						onEdit={() => {
							if (funnel && onEdit) {
								onEdit();
							}
						}}
						onGeneration={async () => {
							if (funnel && onGlobalGenerationFunnel) {
								await onGlobalGenerationFunnel(funnel.id);
							} else if (funnel) {
								onGoToFunnelProducts();
								await onGlobalGeneration();
							}
						}}
						isGenerated={funnel ? hasValidFlow(funnel) : false}
						isGenerating={currentlyGenerating}
						isAnyFunnelGenerating={isAnyFunnelGenerating}
						isDeployed={funnel?.isDeployed}
						funnel={funnel}
						showOnPage="aibuilder"
						isSingleMerchant={allFunnels.length === 1}
					/>
				)}

      {/* Success Notification Popups */}
			{showCreateSuccessPopup && newlyCreatedResource && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300">
					<div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-green-600 backdrop-blur-sm">
						<CheckCircle size={18} className="animate-bounce text-green-100" />
						<div className="flex flex-col">
							<div className="flex items-center gap-2">
								{newlyCreatedResource.category === "PAID" ? (
									<DollarSign size={14} className="text-green-100" strokeWidth={2.5} />
								) : (
									<Gift size={14} className="text-green-100" strokeWidth={2.5} />
								)}
								<span className="font-semibold">
									{newlyCreatedResource.category === "PAID" ? "Paid" : "Gift"} Digital Asset Created!
								</span>
							</div>
							<span className="text-xs text-green-100">{newlyCreatedResource.name}</span>
						</div>
						<div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
					</div>
				</div>
			)}

			{showEditSuccessPopup && newlyEditedResource && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300">
					<div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-green-600 backdrop-blur-sm">
						<CheckCircle size={18} className="animate-bounce text-green-100" />
						<div className="flex flex-col">
							<div className="flex items-center gap-2">
								{newlyEditedResource.category === "PAID" ? (
									<DollarSign size={14} className="text-green-100" strokeWidth={2.5} />
								) : (
									<Gift size={14} className="text-green-100" strokeWidth={2.5} />
								)}
								<span className="font-semibold">
									{newlyEditedResource.category === "PAID" ? "Paid" : "Gift"} Digital Asset Updated!
								</span>
							</div>
							<span className="text-xs text-green-100">{newlyEditedResource.name}</span>
						</div>
						<div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
					</div>
				</div>
			)}

			{/* Delete Success Notification Popup */}
			{showDeleteSuccessPopup && deletedResource && (
        <div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300">
					<div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white text-sm font-medium rounded-lg shadow-2xl border border-green-600 backdrop-blur-sm">
						<Trash2 size={18} className="animate-bounce text-green-100" />
						<div className="flex flex-col">
							<div className="flex items-center gap-2">
								<span className="font-semibold">
									{deletedResource.category === "PAID" ? "Paid" : "Gift"} Digital Asset Deleted!
								</span>
							</div>
							<span className="text-xs text-green-100">{deletedResource.name}</span>
						</div>
						<div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ResourceLibrary;
