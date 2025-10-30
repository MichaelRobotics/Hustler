"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import React, { useEffect } from "react";
import { CheckCircle, DollarSign, Gift, Upload } from "lucide-react";
import { useResourceLibrary } from "../../hooks/useResourceLibrary";
import { useAutoNavigation } from "../../hooks/useAutoNavigation";
import type { ResourceLibraryProps } from "../../types/resource";
import UnifiedNavigation from "../common/UnifiedNavigation";
import { LibraryEmptyState } from "./LibraryEmptyState";
import { ResourceCard } from "./ResourceCard";
import { ResourceLibraryHeader } from "./ResourceLibraryHeader";
import { LibraryResourceDeleteModal } from "./modals/LibraryResourceDeleteModal";
import { LibraryResourceModal } from "./modals/LibraryResourceModal";
import { validateFunnelProducts } from "../../helpers/funnel-product-validation";
import { FunnelGenerationSection } from "./FunnelGenerationSection";
import { InsufficientProductsValidation } from "./InsufficientProductsValidation";

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
	const [highlightedCards, setHighlightedCards] = React.useState<string[]>([]);
	
	// State for "Create Digital Assets" scenario
	const [showCreateAssets, setShowCreateAssets] = React.useState(false);
	
	// Check if there's only 1 funnel (for highlighting form fields)
	const isSingleFunnel = allFunnels.length === 1;

	// Handle highlighting cards from insufficient products validation
	const handleHighlightCards = (cardIds: string[]) => {
		setHighlightedCards(cardIds);
		// Don't auto-clear - let it persist until criteria are met or cards are added
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

	// State for inline product creation
	const [isCreatingNewProduct, setIsCreatingNewProduct] = React.useState(false);
	const [isSaving, setIsSaving] = React.useState(false);
	
	// State for inline product editing
	const [isEditingProduct, setIsEditingProduct] = React.useState(false);
	const [editingResource, setEditingResource] = React.useState<any>(null);
	const [isSavingEdit, setIsSavingEdit] = React.useState(false);
	
	// State for newly created resource animation
	const [newlyCreatedResourceId, setNewlyCreatedResourceId] = React.useState<string | null>(null);
	const [showCreateSuccessPopup, setShowCreateSuccessPopup] = React.useState(false);
	const [newlyCreatedResource, setNewlyCreatedResource] = React.useState<any>(null);
	
	// State for edited resource animation
	const [newlyEditedResourceId, setNewlyEditedResourceId] = React.useState<string | null>(null);
	const [showEditSuccessPopup, setShowEditSuccessPopup] = React.useState(false);
	const [newlyEditedResource, setNewlyEditedResource] = React.useState<any>(null);
	
	// State for tracking if any resource is being edited
	const [isEditingResource, setIsEditingResource] = React.useState(false);
	
	// State for upload functionality
	const [isUploadingImage, setIsUploadingImage] = React.useState(false);
	const [isDragOverImage, setIsDragOverImage] = React.useState(false);
	const [isUploadingAsset, setIsUploadingAsset] = React.useState(false);
	const [isDragOverAsset, setIsDragOverAsset] = React.useState(false);
	
	// State for AI image generation
	const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
	const [isRefiningImage, setIsRefiningImage] = React.useState(false);

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
		
		// Scroll to the create form after a short delay to ensure it's rendered
		setTimeout(() => {
			const createForm = document.querySelector('[data-create-form]');
			if (createForm) {
				createForm.scrollIntoView({ 
					behavior: 'smooth', 
					block: 'center' 
				});
			}
		}, 100);
	};

	// Handle saving new product
	const handleSaveNewProduct = async () => {
		// Validate required fields
		if (!newResource.name?.trim()) {
			return;
		}
		
		// Image is optional for all products
		// if (!newResource.image?.trim()) {
		// 	return;
		// }
		
		// Price is required only for paid products
		if (newResource.category === "PAID" && !newResource.price?.trim()) {
			return;
		}
		
		// Validate price range for paid products
		if (newResource.category === "PAID" && newResource.price) {
			const price = parseFloat(newResource.price);
			if (price < 5 || price > 50000) {
				return;
			}
		}
		
		// For Affiliate products, link is required
		// For Owned products, either link or storageUrl is required
		if (newResource.type === "AFFILIATE" && !newResource.link?.trim()) {
			return;
		}
		
		if (newResource.type === "MY_PRODUCTS" && !newResource.link?.trim() && !newResource.storageUrl?.trim()) {
			return;
		}
		
		// Digital asset (storageUrl) is now required for MY_PRODUCTS
		if (newResource.type === "MY_PRODUCTS" && !newResource.storageUrl?.trim()) {
			return;
		}

		// Check if name is available
		if (!isNameAvailable(newResource.name)) {
			setError("Product name already exists. Please choose a different name.");
			return;
		}

		setIsSaving(true);
		try {
			const createdResource = await createResource(newResource as any);
			
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
			setNewResource({
				name: "",
				link: "",
				type: "AFFILIATE",
				category: "FREE_VALUE",
				description: "",
				promoCode: "",
			});
		} catch (error) {
			console.error("Failed to create product:", error);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle canceling new product creation
	const handleCancelNewProduct = () => {
		// Add delay before showing sidebar when canceling (matches mobile keyboard close animation)
		setTimeout(() => {
			setIsCreatingNewProduct(false);
		}, 250); // 250ms delay to match mobile keyboard close animation
		setNewResource({
			name: "",
			link: "",
			type: "AFFILIATE",
			category: "FREE_VALUE",
			description: "",
			promoCode: "",
		});
	};

	// Handle starting product edit
	const handleStartEditProduct = (resource: any) => {
		setIsEditingProduct(true);
		setEditingResource(resource);
		
		// Scroll to the edit form after a short delay to ensure it's rendered
		setTimeout(() => {
			const editForm = document.querySelector('[data-edit-form]');
			if (editForm) {
				editForm.scrollIntoView({ 
					behavior: 'smooth', 
					block: 'center' 
				});
			}
		}, 100);
	};

	// Handle saving edited product
	const handleSaveEditedProduct = async () => {
		// Validate required fields
		if (!editingResource.name?.trim()) {
			return;
		}
		
		// Image is optional for all products
		// if (!editingResource.image?.trim()) {
		// 	return;
		// }
		
		// Price is required only for paid products
		if (editingResource.category === "PAID" && !editingResource.price?.trim()) {
			return;
		}
		
		// Validate price range for paid products
		if (editingResource.category === "PAID" && editingResource.price) {
			const price = parseFloat(editingResource.price);
			if (price < 5 || price > 50000) {
				return;
			}
		}
		
		// For Affiliate products, link is required
		if (editingResource.type === "AFFILIATE" && !editingResource.link?.trim()) {
			return;
		}
		
		// For Owned products that are NOT actual Whop products, digital asset (storageUrl) is required
		if (editingResource.type === "MY_PRODUCTS" && !editingResource.whopProductId && !editingResource.storageUrl?.trim()) {
			return;
		}

		// Check if name is available (excluding current resource)
		const isNameValid = !allResources.some(
			(r) => {
				if (r.id === editingResource.id) return false; // Skip current resource
				const normalizedInputName = editingResource.name?.trim().replace(/\s+/g, ' ').toLowerCase();
				const normalizedExistingName = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
				return normalizedExistingName === normalizedInputName;
			}
		);

		if (!isNameValid) {
			setError("Product name already exists. Please choose a different name.");
			return;
		}

		setIsSavingEdit(true);
		try {
			const updatedResource = await updateResource(editingResource.id, editingResource);
			
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
		} catch (error) {
			console.error("Failed to update product:", error);
		} finally {
			setIsSavingEdit(false);
		}
	};

	// Handle canceling product edit
	const handleCancelEditProduct = () => {
		// Add delay before showing sidebar when canceling (matches mobile keyboard close animation)
		setTimeout(() => {
			setIsEditingProduct(false);
		}, 250); // 250ms delay to match mobile keyboard close animation
		setEditingResource(null);
	};

	// Handle image upload
	const handleImageUpload = async (file: File) => {
		setIsUploadingImage(true);
		try {
			const formData = new FormData();
			formData.append('file', file);
			
			const response = await fetch('/api/upload-image', {
				method: 'POST',
				body: formData,
			});
			
			if (response.ok) {
				const result = await response.json();
				setNewResource(prev => ({ ...prev, image: result.url }));
			}
		} catch (error) {
			console.error('Image upload failed:', error);
		} finally {
			setIsUploadingImage(false);
		}
	};

	// Handle image upload for edit form
	const handleEditImageUpload = async (file: File) => {
		setIsUploadingImage(true);
		try {
			const formData = new FormData();
			formData.append('file', file);
			
			const response = await fetch('/api/upload-image', {
				method: 'POST',
				body: formData,
			});
			
			if (response.ok) {
				const result = await response.json();
				setEditingResource((prev: any) => ({ ...prev, image: result.url }));
			}
		} catch (error) {
			console.error('Image upload failed:', error);
		} finally {
			setIsUploadingImage(false);
		}
	};

	// Handle digital asset upload
	const handleAssetUpload = async (file: File) => {
		setIsUploadingAsset(true);
		try {
			const formData = new FormData();
			formData.append('file', file);
			
			const response = await fetch('/api/upload-image', {
				method: 'POST',
				body: formData,
			});
			
			if (response.ok) {
				const result = await response.json();
				setNewResource(prev => ({ ...prev, storageUrl: result.url }));
			}
		} catch (error) {
			console.error('Asset upload failed:', error);
		} finally {
			setIsUploadingAsset(false);
		}
	};

	// Handle digital asset upload for edit form
	const handleEditAssetUpload = async (file: File) => {
		setIsUploadingAsset(true);
		try {
			const formData = new FormData();
			formData.append('file', file);
			
			const response = await fetch('/api/upload-image', {
				method: 'POST',
				body: formData,
			});
			
			if (response.ok) {
				const result = await response.json();
				setEditingResource((prev: any) => ({ ...prev, storageUrl: result.url }));
			}
		} catch (error) {
			console.error('Asset upload failed:', error);
		} finally {
			setIsUploadingAsset(false);
		}
	};

	// Handle AI image generation for new resource
	const handleGenerateImage = async () => {
		if (!newResource.name || !newResource.description) {
			alert('Please enter both name and description before generating an image');
			return;
		}

		setIsGeneratingImage(true);
		try {
			const response = await fetch('/api/resources/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: newResource.name,
					description: newResource.description,
					action: 'generate',
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setNewResource((prev: any) => ({
					...prev,
					image: data.imageUrl,
				}));
			} else {
				const errorData = await response.json();
				alert(`Failed to generate image: ${errorData.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error generating image:', error);
			alert('Failed to generate image. Please try again.');
		} finally {
			setIsGeneratingImage(false);
		}
	};

	// Handle AI image refinement for new resource
	const handleRefineImage = async () => {
		if (!newResource.name || !newResource.description) {
			alert('Please enter both name and description before refining the image');
			return;
		}

		if (!newResource.image) {
			alert('Please upload an image first before refining it');
			return;
		}

		setIsRefiningImage(true);
		try {
			const response = await fetch('/api/resources/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: newResource.name,
					description: newResource.description,
					action: 'refine',
					existingImageUrl: newResource.image,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setNewResource((prev: any) => ({
					...prev,
					image: data.imageUrl,
				}));
			} else {
				const errorData = await response.json();
				alert(`Failed to refine image: ${errorData.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error refining image:', error);
			alert('Failed to refine image. Please try again.');
		} finally {
			setIsRefiningImage(false);
		}
	};

	// Handle AI image generation for edit form
	const handleEditGenerateImage = async () => {
		if (!editingResource.name || !editingResource.description) {
			alert('Please enter both name and description before generating an image');
			return;
		}

		setIsGeneratingImage(true);
		try {
			const response = await fetch('/api/resources/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: editingResource.name,
					description: editingResource.description,
					action: 'generate',
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setEditingResource((prev: any) => ({
					...prev,
					image: data.imageUrl,
				}));
			} else {
				const errorData = await response.json();
				alert(`Failed to generate image: ${errorData.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error generating image:', error);
			alert('Failed to generate image. Please try again.');
		} finally {
			setIsGeneratingImage(false);
		}
	};

	// Handle AI image refinement for edit form
	const handleEditRefineImage = async () => {
		if (!editingResource.name || !editingResource.description) {
			alert('Please enter both name and description before refining the image');
			return;
		}

		if (!editingResource.image) {
			alert('Please upload an image first before refining it');
			return;
		}

		setIsRefiningImage(true);
		try {
			const response = await fetch('/api/resources/generate-image', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: editingResource.name,
					description: editingResource.description,
					action: 'refine',
					existingImageUrl: editingResource.image,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				setEditingResource((prev: any) => ({
					...prev,
					image: data.imageUrl,
				}));
			} else {
				const errorData = await response.json();
				alert(`Failed to refine image: ${errorData.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Error refining image:', error);
			alert('Failed to refine image. Please try again.');
		} finally {
			setIsRefiningImage(false);
		}
	};


	// Drag and drop handlers for image
	const handleImageDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOverImage(true);
	};

	const handleImageDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOverImage(false);
	};

	const handleImageDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOverImage(false);
		
		const files = Array.from(e.dataTransfer.files);
		const imageFile = files.find(file => file.type.startsWith('image/'));
		
		if (imageFile) {
			handleImageUpload(imageFile);
		}
	};

	// Drag and drop handlers for digital asset
	const handleAssetDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOverAsset(true);
	};

	const handleAssetDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOverAsset(false);
	};

	const handleAssetDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOverAsset(false);
		
		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			handleAssetUpload(files[0]);
		}
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
							{/* Generate section - only visible when there's at least 1 free resource AND at least 3 resources */}
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
							) : /* Choose section - visible when there's NOT at least 1 free resource OR NOT at least 3 resources */
							!hasAtLeastOneFreeResource(funnel) || (funnel.resources?.length || 0) < 3 ? (
								<div className="mb-8">
									<InsufficientProductsValidation 
										funnel={funnel} 
										allResources={allResources}
										onHighlightCards={handleHighlightCards}
										onCreateAssetsStateChange={handleCreateAssetsStateChange}
									/>
								</div>
							) : null}
						</>
					)}

					{/* Resources Grid - Categorized */}
					{!error && (
						<div data-products-section>
							{/* New Product Creation Card */}
							{isCreatingNewProduct && (
								<div data-create-form className="group bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-gray-200/40 dark:from-orange-900/80 dark:via-gray-800/60 dark:to-gray-900/30 p-4 rounded-xl border-2 border-orange-500/60 dark:border-orange-400/70 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 mb-6">
									<div className="flex items-start justify-between mb-3">
										<div className="flex items-center gap-2">
											<div className="w-5 h-5 bg-violet-400 rounded-full animate-pulse" />
											<span className="px-2 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300">
												{newResource.type === "AFFILIATE"
													? "Affiliate"
													: "My Product"}
											</span>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													newResource.category === "PAID"
														? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
														: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
												}`}
											>
												{newResource.category === "PAID"
													? "Paid"
													: "Gift"}
											</span>
										</div>
										<div className="flex items-center gap-1">
											<button
												onClick={handleSaveNewProduct}
												disabled={
													isSaving ||
													!newResource.name?.trim() ||
													(newResource.category === "PAID" && !newResource.price?.trim()) ||
													(newResource.category === "PAID" && newResource.price && (parseFloat(newResource.price) < 5 || parseFloat(newResource.price) > 50000)) ||
													!isNameAvailable(newResource.name || "") ||
													(newResource.type === "AFFILIATE" && !newResource.link?.trim()) ||
													(newResource.type === "MY_PRODUCTS" && !newResource.storageUrl?.trim())
												}
												className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isSaving ? "Saving..." : "Create"}
											</button>
											<button
												onClick={handleCancelNewProduct}
												disabled={isSaving}
												className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>

									{/* Two-column layout: Image on left, Form on right */}
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
										{/* Left Column: Image Upload */}
										<div className="space-y-2 flex flex-col h-full">
											<div
												onDragOver={handleImageDragOver}
												onDragLeave={handleImageDragLeave}
												onDrop={handleImageDrop}
												className={`relative border-2 border-solid rounded-xl text-center transition-all duration-200 flex-1 flex items-center justify-center overflow-hidden aspect-[320/224] ${
													isDragOverImage
														? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-300 dark:ring-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-800 p-8"
														: isUploadingImage
														? "border-blue-400 bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700 p-8"
														: newResource.image
														? "border-green-500 bg-green-100 dark:bg-green-900/30 ring-2 ring-green-300 dark:ring-green-700 shadow-lg shadow-green-200 dark:shadow-green-800 p-0"
														: "border-gray-500 dark:border-gray-400 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-800 p-8"
												}`}
											>
												<input
													type="file"
													accept="image/*"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) handleImageUpload(file);
													}}
													disabled={isSaving || isUploadingImage}
													className="hidden"
													id="image-upload"
												/>
												
												{isUploadingImage ? (
													<div className="flex flex-col items-center gap-2">
														<div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
														<span className="text-sm text-blue-600 dark:text-blue-400">Uploading image...</span>
													</div>
												) : newResource.image ? (
													<div className="relative w-full h-full">
														<div 
															className={`relative w-full h-full group overflow-hidden ${
																isGeneratingImage || isRefiningImage ? 'cursor-not-allowed' : 'cursor-pointer'
															}`}
															onClick={isGeneratingImage || isRefiningImage ? undefined : () => document.getElementById('image-upload')?.click()}
															title={isGeneratingImage || isRefiningImage ? "AI processing..." : "Click to change image"}
														>
															<img
																src={newResource.image}
																alt="Product preview"
																className="absolute inset-0 w-full h-full object-cover"
															/>
															<div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-200 ${
																isGeneratingImage || isRefiningImage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
															}`}>
																{isGeneratingImage || isRefiningImage ? (
																	<div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
																		<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
																			<path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
																		</svg>
																	</div>
																) : (
																	<div className="bg-violet-500/90 text-white p-2 rounded-md">
																		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
																		</svg>
																	</div>
																)}
															</div>
														</div>
														
														{/* AI Generation Buttons - Overlay */}
														{!(isGeneratingImage || isRefiningImage) && (
															<div className="absolute top-2 right-2 flex gap-1">
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleGenerateImage();
																	}}
																	disabled={!newResource.name || !newResource.description}
																	className={`px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${
																		!newResource.name || !newResource.description
																			? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed'
																			: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105'
																	}`}
																	title="Generate new AI image"
																>
																	<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
																	</svg>
																</button>
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleRefineImage();
																	}}
																	disabled={!newResource.name || !newResource.description}
																	className={`px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${
																		!newResource.name || !newResource.description
																			? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed'
																			: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105'
																	}`}
																	title="Refine current image with AI"
																>
																	<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
																	</svg>
																</button>
															</div>
														)}
													</div>
												) : isGeneratingImage ? (
													<div className="flex items-center justify-center h-full">
														<div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
															<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
																<path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
															</svg>
														</div>
													</div>
												) : (
													<div className="flex flex-col items-center gap-2">
														<img
															src="https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp"
															alt="WHOP Placeholder"
															className="w-16 h-16 object-cover rounded-lg opacity-50"
														/>
														<div className="text-sm text-gray-600 dark:text-gray-400">
															<span className="font-medium">Drag & drop an image here</span>
															<br />
															<span className="text-xs">or</span>
															<br />
															<label
																htmlFor="image-upload"
																className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
															>
																click to browse
															</label>
														</div>
														
														{/* AI Generation Buttons */}
														<div className="flex gap-2 mt-2">
															<button
																onClick={handleGenerateImage}
																disabled={isGeneratingImage || isRefiningImage || !newResource.name || !newResource.description}
																className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${
																	isGeneratingImage || !newResource.name || !newResource.description
																		? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed'
																		: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105'
																}`}
																title="Generate AI image based on name and description"
															>
																<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
																</svg>
															</button>
														</div>
													</div>
												)}
											</div>
											
										</div>

										{/* Right Column: Form Fields */}
										<div className="space-y-3">
											{/* Type and Category Selectors */}
											<div className="flex gap-2">
												<select
													value={newResource.type || "MY_PRODUCTS"}
													onChange={(e) =>
														setNewResource({
															...newResource,
															type: e.target.value as "AFFILIATE" | "MY_PRODUCTS",
														})
													}
													disabled={isSaving}
													className="flex-1 px-3 py-2 text-sm border-2 border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<option value="AFFILIATE">Affiliate</option>
													<option value="MY_PRODUCTS">Owned</option>
												</select>
												<select
													value={newResource.category || "FREE_VALUE"}
													onChange={(e) =>
														setNewResource({
															...newResource,
															category: e.target.value as "PAID" | "FREE_VALUE",
														})
													}
													disabled={isSaving}
													className={`flex-1 px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
														isSingleFunnel 
															? "border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-xl shadow-orange-500/40 animate-pulse ring-2 ring-orange-500/30" 
															: "border-gray-400 dark:border-gray-500 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
													}`}
												>
													<option value="FREE_VALUE" className="bg-white dark:bg-black text-gray-900 dark:text-white">Gift</option>
													<option value="PAID" className="bg-white dark:bg-black text-gray-900 dark:text-white">Paid</option>
												</select>
											</div>

											{/* Name Field */}
											<input
												type="text"
												value={newResource.name || ""}
												onChange={(e) => {
													setNewResource({ ...newResource, name: e.target.value });
													// Clear error when user starts typing
													if (error && error.includes("Product name already exists")) {
														setError(null);
													}
												}}
												placeholder={isSingleFunnel ? "Digital Asset name" : "Digital Asset name"}
												disabled={isSaving}
												className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
													newResource.name && !isNameAvailable(newResource.name)
														? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
														: isSingleFunnel 
															? "border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-xl shadow-orange-500/40 animate-pulse ring-2 ring-orange-500/30 focus:ring-orange-500/50 focus:border-orange-500 dark:focus:border-orange-400"
															: "border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
												}`}
												autoFocus
											/>
											{newResource.name && !isNameAvailable(newResource.name) && (
												<div className="mt-1 text-xs text-red-600 dark:text-red-400">
													This name is already taken. Please choose a different one.
												</div>
											)}

											{/* Price Field - Only for Paid products */}
											{newResource.category === "PAID" && (
												<div className="space-y-1">
													<input
														type="text"
														value={newResource.price || ""}
														onChange={(e) =>
															setNewResource({ ...newResource, price: e.target.value })
														}
														placeholder="$0.00"
														disabled={isSaving}
														className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
															isSingleFunnel 
																? "border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-xl shadow-orange-500/40 animate-pulse ring-2 ring-orange-500/30 focus:ring-orange-500/50 focus:border-orange-500 dark:focus:border-orange-400"
																: "border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
														}`}
													/>
													{(() => {
														const price = parseFloat(newResource.price || "0");
														const isValidPrice = price >= 5 && price <= 50000;
														const hasPrice = newResource.price && newResource.price.trim() !== "";
														
														if (hasPrice && !isValidPrice) {
															return (
																<p className="text-xs text-red-600 dark:text-red-400">
																	Price must be between $5 and $50,000
																</p>
															);
														}
														
														return (
															<p className="text-xs text-gray-500 dark:text-gray-400">
																*Only whop fees will be deducted
															</p>
														);
													})()}
												</div>
											)}

											{/* URL Field - Only for Affiliate products */}
											{newResource.type === "AFFILIATE" && (
												<input
													type="url"
													value={newResource.link || ""}
													onChange={(e) =>
														setNewResource({ ...newResource, link: e.target.value })
													}
													placeholder="Affiliate URL"
													disabled={isSaving}
													className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
														isSingleFunnel 
															? "border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-xl shadow-orange-500/40 animate-pulse ring-2 ring-orange-500/30 focus:ring-orange-500/50 focus:border-orange-500 dark:focus:border-orange-400"
															: "border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
													}`}
												/>
											)}

											{/* Description Field - For Affiliate products */}
											{newResource.type === "AFFILIATE" && (
												<textarea
													value={newResource.description || ""}
													onChange={(e) =>
														setNewResource({ ...newResource, description: e.target.value })
													}
													placeholder="Product description (optional)..."
													disabled={isSaving}
													rows={3}
													className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
														isSingleFunnel 
															? "border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-xl shadow-orange-500/40 animate-pulse ring-2 ring-orange-500/30 focus:ring-orange-500/50 focus:border-orange-500 dark:focus:border-orange-400"
															: "border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
													}`}
												/>
											)}

											{/* Description Field - Only for Owned products */}
											{newResource.type === "MY_PRODUCTS" && (
													<textarea
														value={newResource.description || ""}
														onChange={(e) =>
															setNewResource({ ...newResource, description: e.target.value })
														}
														placeholder="Product description (optional)..."
														disabled={isSaving}
														rows={3}
														className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
															isSingleFunnel 
																? "border-2 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30 shadow-xl shadow-orange-500/40 animate-pulse ring-2 ring-orange-500/30 focus:ring-orange-500/50 focus:border-orange-500 dark:focus:border-orange-400"
																: "border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
														}`}
													/>
											)}

											{/* Digital Asset Upload - Only for Owned products */}
											{newResource.type === "MY_PRODUCTS" && (
												<div className="space-y-2">
													<div
														onDragOver={handleAssetDragOver}
														onDragLeave={handleAssetDragLeave}
														onDrop={handleAssetDrop}
														className={`relative border-2 border-solid rounded-xl p-4 text-center transition-all duration-200 h-24 flex items-center justify-center ${
															isDragOverAsset
																? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-300 dark:ring-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-800"
																: isUploadingAsset
																? "border-blue-400 bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700"
																: newResource.storageUrl
																? "border-green-500 bg-green-100 dark:bg-green-900/30 ring-2 ring-green-300 dark:ring-green-700 shadow-lg shadow-green-200 dark:shadow-green-800"
																: "border-gray-500 dark:border-gray-400 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-800"
														}`}
													>
														<input
															type="file"
															accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.zip"
															onChange={(e) => {
																const file = e.target.files?.[0];
																if (file) handleAssetUpload(file);
															}}
															disabled={isSaving || isUploadingAsset}
															className="hidden"
															id="asset-upload"
														/>
														
														{isUploadingAsset ? (
															<div className="flex items-center gap-2">
																<div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
																<span className="text-sm text-blue-600 dark:text-blue-400">Uploading...</span>
															</div>
														) : newResource.storageUrl ? (
															<div 
																className="flex items-center gap-2 cursor-pointer group"
																onClick={() => document.getElementById('asset-upload')?.click()}
																title="Click to change asset"
															>
																<div className="flex items-center gap-2">
																	<CheckCircle className="w-6 h-6 text-green-500" />
																	<div className="flex flex-col">
																		<span className="text-sm text-green-600 dark:text-green-400">
																			{newResource.storageUrl.split('/').pop() || 'File uploaded'}
																		</span>
																	</div>
																</div>
																<div className="bg-violet-500/90 text-white p-1.5 rounded-md ml-auto">
																	<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
																	</svg>
																</div>
															</div>
														) : (
															<div className="flex items-center gap-2">
																<Upload className="w-6 h-6 text-gray-400" />
																<div className="text-sm text-gray-600 dark:text-gray-400">
																	<span className="font-medium">Drop file here</span>
																	<span className="text-xs ml-2">or</span>
																	<label
																		htmlFor="asset-upload"
																		className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer ml-1"
																	>
																		browse
																	</label>
																</div>
															</div>
														)}
													</div>
												</div>
											)}

											{/* Promo Code Field - Only for Paid products */}
											{newResource.category === "PAID" && (
												<input
													type="text"
													value={newResource.promoCode || ""}
													onChange={(e) =>
														setNewResource({
															...newResource,
															promoCode: e.target.value,
														})
													}
													placeholder="Promo code (optional)..."
													disabled={isSaving}
													className="w-full px-3 py-2 text-sm border-2 border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
												/>
											)}

										</div>
									</div>

									</div>
							)}

							{/* Edit Product Form */}
							{isEditingProduct && editingResource && (
								<div data-edit-form className="group bg-gradient-to-br from-blue-50/80 via-blue-100/60 to-gray-200/40 dark:from-blue-900/80 dark:via-gray-800/60 dark:to-gray-900/30 p-4 rounded-xl border-2 border-blue-500/60 dark:border-blue-400/70 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 mb-6">
									<div className="flex items-start justify-between mb-3">
										<div className="flex items-center gap-2">
											<div className="w-5 h-5 bg-blue-400 rounded-full animate-pulse" />
											<span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
												{editingResource.type === "AFFILIATE"
													? "Affiliate"
													: "My Product"}
											</span>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${
													editingResource.category === "PAID"
														? "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
														: "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
												}`}
											>
												{editingResource.category === "PAID"
													? "Paid"
													: "Gift"}
											</span>
										</div>
										<div className="flex items-center gap-1">
											<button
												onClick={handleSaveEditedProduct}
												disabled={
													isSavingEdit ||
													!editingResource.name?.trim() ||
													(editingResource.category === "PAID" && !editingResource.price?.trim()) ||
													(editingResource.category === "PAID" && editingResource.price && (parseFloat(editingResource.price) < 5 || parseFloat(editingResource.price) > 50000)) ||
													(editingResource.type === "AFFILIATE" && !editingResource.link?.trim()) ||
													(editingResource.type === "MY_PRODUCTS" && !editingResource.storageUrl?.trim())
												}
												className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isSavingEdit ? "Saving..." : "Update"}
											</button>
											<button
												onClick={handleCancelEditProduct}
												disabled={isSavingEdit}
												className="p-1 text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										</div>
									</div>

									{/* Two-column layout: Image on left, Form on right */}
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
										{/* Left Column: Image Upload */}
										<div className="space-y-2 flex flex-col h-full">
											<div
												onDragOver={handleImageDragOver}
												onDragLeave={handleImageDragLeave}
												onDrop={handleImageDrop}
												className={`relative border-2 border-solid rounded-xl text-center transition-all duration-200 flex-1 flex items-center justify-center overflow-hidden aspect-[320/224] ${
													isDragOverImage
														? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-300 dark:ring-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-800 p-8"
														: isUploadingImage
														? "border-blue-400 bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700 p-8"
														: editingResource.image
														? "border-green-500 bg-green-100 dark:bg-green-900/30 ring-2 ring-green-300 dark:ring-green-700 shadow-lg shadow-green-200 dark:shadow-green-800 p-0"
														: "border-gray-500 dark:border-gray-400 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-800 p-8"
												}`}
											>
												<input
													type="file"
													accept="image/*"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															handleEditImageUpload(file);
														}
													}}
													disabled={isSavingEdit}
													className="hidden"
													id="edit-image-upload"
												/>
												
												{isUploadingImage ? (
													<div className="flex flex-col items-center gap-2">
														<div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
														<span className="text-sm text-blue-600 dark:text-blue-400">Uploading image...</span>
													</div>
												) : editingResource.image ? (
													<div className="relative w-full h-full">
														<div 
															className={`relative w-full h-full group overflow-hidden ${
																isGeneratingImage || isRefiningImage ? 'cursor-not-allowed' : 'cursor-pointer'
															}`}
															onClick={isGeneratingImage || isRefiningImage ? undefined : () => document.getElementById('edit-image-upload')?.click()}
															title={isGeneratingImage || isRefiningImage ? "AI processing..." : "Click to change image"}
														>
															<img
																src={editingResource.image}
																alt="Product preview"
																className="absolute inset-0 w-full h-full object-cover"
															/>
															<div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-200 ${
																isGeneratingImage || isRefiningImage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
															}`}>
																{isGeneratingImage || isRefiningImage ? (
																	<div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
																		<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
																			<path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
																		</svg>
																	</div>
																) : (
																	<div className="bg-violet-500/90 text-white p-2 rounded-md">
																		<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
																		</svg>
																	</div>
																)}
															</div>
														</div>
														
														{/* AI Generation Buttons - Overlay */}
														{!(isGeneratingImage || isRefiningImage) && (
															<div className="absolute top-2 right-2 flex gap-1">
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleEditGenerateImage();
																	}}
																	disabled={!editingResource.name || !editingResource.description}
																	className={`px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${
																		!editingResource.name || !editingResource.description
																			? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed'
																			: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105'
																	}`}
																	title="Generate new AI image"
																>
																	<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
																	</svg>
																</button>
																<button
																	onClick={(e) => {
																		e.stopPropagation();
																		handleEditRefineImage();
																	}}
																	disabled={!editingResource.name || !editingResource.description}
																	className={`px-2 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${
																		!editingResource.name || !editingResource.description
																			? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed'
																			: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105'
																	}`}
																	title="Refine current image with AI"
																>
																	<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
																	</svg>
																</button>
															</div>
														)}
													</div>
												) : isGeneratingImage ? (
													<div className="flex items-center justify-center h-full">
														<div className="w-16 h-16 border-4 border-green-500 rounded-full animate-spin shadow-lg flex items-center justify-center">
															<svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
																<path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
															</svg>
														</div>
													</div>
												) : (
													<div className="flex flex-col items-center gap-2">
														<img
															src="https://img-v2-prod.whop.com/dUwgsAK0vIQWvHpc6_HVbZ345kdPfToaPdKOv9EY45c/plain/https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp"
															alt="WHOP Placeholder"
															className="w-16 h-16 object-cover rounded-lg opacity-50"
														/>
														<div className="text-sm text-gray-600 dark:text-gray-400">
															<span className="font-medium">Drag & drop an image here</span>
															<br />
															<span className="text-xs">or</span>
															<br />
															<label
																htmlFor="edit-image-upload"
																className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
															>
																click to browse
															</label>
														</div>
														
														{/* AI Generation Buttons */}
														<div className="flex gap-2 mt-2">
															<button
																onClick={handleEditGenerateImage}
																disabled={isGeneratingImage || isRefiningImage || !editingResource.name || !editingResource.description}
																className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-300 ${
																	isGeneratingImage || !editingResource.name || !editingResource.description
																		? 'bg-gradient-to-r from-gray-500 to-gray-600 text-gray-300 cursor-not-allowed'
																		: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105'
																}`}
																title="Generate AI image based on name and description"
															>
																<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
																</svg>
															</button>
														</div>
													</div>
												)}
											</div>
										</div>

										{/* Right Column: Form Fields */}
										<div className="space-y-3">
											{/* Type and Category Selectors */}
											<div className="flex gap-2">
												<select
													value={editingResource.type || "MY_PRODUCTS"}
													onChange={(e) =>
														setEditingResource({
															...editingResource,
															type: e.target.value as "AFFILIATE" | "MY_PRODUCTS",
														})
													}
													disabled={isSavingEdit}
													className="flex-1 px-3 py-2 text-sm border-2 border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<option value="AFFILIATE">Affiliate</option>
													<option value="MY_PRODUCTS">Owned</option>
												</select>
												<select
													value={editingResource.category || "FREE_VALUE"}
													onChange={(e) =>
														setEditingResource({
															...editingResource,
															category: e.target.value as "PAID" | "FREE_VALUE",
														})
													}
													disabled={isSavingEdit}
													className="flex-1 px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-gray-400 dark:border-gray-500 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
												>
													<option value="FREE_VALUE" className="bg-white dark:bg-black text-gray-900 dark:text-white">Gift</option>
													<option value="PAID" className="bg-white dark:bg-black text-gray-900 dark:text-white">Paid</option>
												</select>
											</div>

											{/* Name Field */}
											<input
												type="text"
												value={editingResource.name || ""}
												onChange={(e) => {
													setEditingResource({ ...editingResource, name: e.target.value });
													// Clear error when user starts typing
													if (error && error.includes("Product name already exists")) {
														setError(null);
													}
												}}
												placeholder="Digital Asset name"
												disabled={isSavingEdit}
												className={`w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
													editingResource.name && 
													allResources.some((r) => {
														if (r.id === editingResource.id) return false;
														const normalizedInputName = editingResource.name?.trim().replace(/\s+/g, ' ').toLowerCase();
														const normalizedExistingName = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
														return normalizedExistingName === normalizedInputName;
													})
														? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
														: "border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
												}`}
												autoFocus
											/>
											{editingResource.name && 
												allResources.some((r) => {
													if (r.id === editingResource.id) return false;
													const normalizedInputName = editingResource.name?.trim().replace(/\s+/g, ' ').toLowerCase();
													const normalizedExistingName = r.name.trim().replace(/\s+/g, ' ').toLowerCase();
													return normalizedExistingName === normalizedInputName;
												}) && (
												<div className="mt-1 text-xs text-red-600 dark:text-red-400">
													This name is already taken. Please choose a different one.
												</div>
											)}

											{/* Price Field - Only for Paid products */}
											{editingResource.category === "PAID" && (
												<div className="space-y-1">
													<input
														type="text"
														value={editingResource.price || ""}
														onChange={(e) =>
															setEditingResource({ ...editingResource, price: e.target.value })
														}
														placeholder="$0.00"
														disabled={isSavingEdit}
														className="w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
													/>
													{(() => {
														const price = parseFloat(editingResource.price || "0");
														const isValidPrice = price >= 5 && price <= 50000;
														const hasPrice = editingResource.price && editingResource.price.trim() !== "";
														
														if (hasPrice && !isValidPrice) {
															return (
																<p className="text-xs text-red-600 dark:text-red-400">
																	Price must be between $5 and $50,000
																</p>
															);
														}
														
														return (
															<p className="text-xs text-gray-500 dark:text-gray-400">
																*Only whop fees will be deducted
															</p>
														);
													})()}
												</div>
											)}

											{/* URL Field - Only for Affiliate products */}
											{editingResource.type === "AFFILIATE" && (
												<input
													type="url"
													value={editingResource.link || ""}
													onChange={(e) =>
														setEditingResource({ ...editingResource, link: e.target.value })
													}
													placeholder="Affiliate URL"
													disabled={isSavingEdit}
													className="w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
												/>
											)}

											{/* Description Field */}
											<textarea
												value={editingResource.description || ""}
												onChange={(e) =>
													setEditingResource({ ...editingResource, description: e.target.value })
												}
												placeholder="Product description (optional)..."
												disabled={isSavingEdit}
												rows={3}
												className="w-full px-3 py-2 text-sm border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-none border-gray-400 dark:border-gray-500 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800"
											/>

											{/* Digital Asset Upload - Only for Owned products */}
											{editingResource.type === "MY_PRODUCTS" && (
												<div className="space-y-2">
													<div
														onDragOver={handleAssetDragOver}
														onDragLeave={handleAssetDragLeave}
														onDrop={handleAssetDrop}
														className={`relative border-2 border-solid rounded-xl p-4 text-center transition-all duration-200 h-24 flex items-center justify-center ${
															isDragOverAsset
																? "border-blue-500 bg-blue-100 dark:bg-blue-900/30 ring-4 ring-blue-300 dark:ring-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-800"
																: isUploadingAsset
																? "border-blue-400 bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-200 dark:ring-blue-700"
																: editingResource.storageUrl
																? "border-green-500 bg-green-100 dark:bg-green-900/30 ring-2 ring-green-300 dark:ring-green-700 shadow-lg shadow-green-200 dark:shadow-green-800"
																: "border-gray-500 dark:border-gray-400 hover:border-violet-500 dark:hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:shadow-lg hover:shadow-violet-200 dark:hover:shadow-violet-800"
														}`}
													>
														<input
															type="file"
															accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.zip"
															onChange={(e) => {
																const file = e.target.files?.[0];
																if (file) {
																	handleEditAssetUpload(file);
																}
															}}
															disabled={isSavingEdit}
															className="hidden"
															id="edit-asset-upload"
														/>
														
														{isUploadingAsset ? (
															<div className="flex items-center gap-2">
																<div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
																<span className="text-sm text-blue-600 dark:text-blue-400">Uploading...</span>
															</div>
														) : editingResource.storageUrl ? (
															<div 
																className="flex items-center gap-2 cursor-pointer group"
																onClick={() => document.getElementById('edit-asset-upload')?.click()}
																title="Click to change asset"
															>
																<div className="flex items-center gap-2">
																	<CheckCircle className="w-6 h-6 text-green-500" />
																	<div className="flex flex-col">
																		<span className="text-sm text-green-600 dark:text-green-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
																			Asset uploaded - Click to reload
																		</span>
																		<span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
																			{editingResource.storageUrl.split('/').pop() || 'File uploaded'}
																		</span>
																	</div>
																</div>
																<div className="bg-violet-500/90 text-white p-1.5 rounded-md ml-auto">
																	<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
																	</svg>
																</div>
															</div>
														) : (
															<div className="flex items-center gap-2">
																<Upload className="w-6 h-6 text-gray-400" />
																<div className="text-sm text-gray-600 dark:text-gray-400">
																	<span className="font-medium">Drop file here</span>
																	<span className="text-xs ml-2">or</span>
																	<label
																		htmlFor="edit-asset-upload"
																		className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer ml-1"
																	>
																		browse
																	</label>
																</div>
															</div>
														)}
													</div>
												</div>
											)}

											{/* Promo Code Field - Only for Paid products */}
											{editingResource.category === "PAID" && (
												<input
													type="text"
													value={editingResource.promoCode || ""}
													onChange={(e) =>
														setEditingResource({
															...editingResource,
															promoCode: e.target.value,
														})
													}
													placeholder="Promo code (optional)..."
													disabled={isSavingEdit}
													className="w-full px-3 py-2 text-sm border-2 border-gray-400 dark:border-gray-500 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 hover:border-violet-500 dark:hover:border-violet-400 hover:shadow-sm hover:shadow-violet-200 dark:hover:shadow-violet-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
												/>
											)}
										</div>
									</div>
								</div>
							)}

							{/* Paid Resources Section */}
							{(() => {
								const paidResources = displayResources.filter(resource => resource.category === "PAID");
								if (paidResources.length > 0) {
									return (
										<div className="mb-8">
											{/* Paid Section Header */}
											<div className="flex items-center gap-4 mb-6">
												<h3 className="text-xl font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-lg border border-orange-200 dark:border-orange-700/50 shadow-sm flex items-center gap-2">
													<DollarSign className="w-5 h-5" strokeWidth={2.5} />
													Paid Digital Assets
												</h3>
												<div className="flex-1 h-px bg-gradient-to-r from-orange-400/80 via-orange-500/60 to-transparent dark:from-orange-500/80 dark:via-orange-400/60"></div>
											</div>
											
											{/* Paid Resources Grid */}
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
												{paidResources.map((resource) => (
													<div 
														key={resource.id}
														data-resource-id={resource.id}
														className={newlyCreatedResourceId === resource.id ? "animate-pulse" : ""}
													>
														<ResourceCard
															resource={resource}
															funnel={funnel}
															context={context}
															allResources={allResources}
															isResourceInFunnel={isResourceInFunnel}
															isResourceAssignedToAnyFunnel={isResourceAssignedToAnyFunnel}
															onAddToFunnel={handleAddToFunnelWithHighlighting}
															onRemoveFromFunnel={onRemoveFromFunnel}
															onEdit={handleStartEditProduct}
															onDelete={handleDeleteResource}
															onUpdate={handleUpdateResourceWithAnimation}
															isRemoving={removingResourceId === resource.id}
															onEditingChange={handleEditingChange}
															hideAssignmentOptions={context === "funnel" && funnel && (hasValidFlow(funnel) || currentlyGenerating)}
															isJustCreated={newlyCreatedResourceId === resource.id}
															isJustEdited={newlyEditedResourceId === resource.id}
															isHighlighted={highlightedCards.includes(resource.id)}
														/>
													</div>
												))}
											</div>
										</div>
									);
								}
								return null;
							})()}

							{/* Gifts Resources Section */}
							{(() => {
								const giftResources = displayResources.filter(resource => resource.category === "FREE_VALUE");
								if (giftResources.length > 0) {
									return (
										<div className="mb-8">
											{/* Gifts Section Header */}
											<div className="flex items-center gap-4 mb-6">
												<h3 className="text-xl font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-lg border border-green-200 dark:border-green-700/50 shadow-sm flex items-center gap-2">
													<Gift className="w-5 h-5" strokeWidth={2.5} />
													Gift Digital Assets
												</h3>
												<div className="flex-1 h-px bg-gradient-to-r from-green-400/80 via-green-500/60 to-transparent dark:from-green-500/80 dark:via-green-400/60"></div>
											</div>
											
											{/* Gifts Resources Grid */}
											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
												{giftResources.map((resource) => (
													<div 
														key={resource.id}
														data-resource-id={resource.id}
														className={newlyCreatedResourceId === resource.id ? "animate-pulse" : ""}
													>
														<ResourceCard
															resource={resource}
															funnel={funnel}
															context={context}
															allResources={allResources}
															isResourceInFunnel={isResourceInFunnel}
															isResourceAssignedToAnyFunnel={isResourceAssignedToAnyFunnel}
															onAddToFunnel={handleAddToFunnelWithHighlighting}
															onRemoveFromFunnel={onRemoveFromFunnel}
															onEdit={handleStartEditProduct}
															onDelete={handleDeleteResource}
															onUpdate={handleUpdateResourceWithAnimation}
															isRemoving={removingResourceId === resource.id}
															onEditingChange={handleEditingChange}
															hideAssignmentOptions={context === "funnel" && funnel && (hasValidFlow(funnel) || currentlyGenerating)}
															isJustCreated={newlyCreatedResourceId === resource.id}
															isJustEdited={newlyEditedResourceId === resource.id}
															isHighlighted={highlightedCards.includes(resource.id)}
														/>
													</div>
												))}
											</div>
										</div>
									);
								}
								return null;
							})()}
						</div>
					)}


					{/* Empty State */}
					{!error && filteredResources.length === 0 && (
						<LibraryEmptyState selectedCategory={selectedCategory} />
					)}
				</div>
			</div>


			{/* Unified Navigation - Hide when funnel is generating, when no resources and no funnel generated, or when missing FREE products or minimum resources */}
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
								// Start generation directly in ResourceLibrary
								await onGlobalGenerationFunnel(funnel.id);
							} else if (funnel) {
								// Fallback to original behavior
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

			{/* Create Success Notification Popup - Top Right Corner */}
			{showCreateSuccessPopup && newlyCreatedResource && (
				<div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300" style={{ zIndex: 99999 }}>
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

			{/* Edit Success Notification Popup - Top Right Corner */}
			{showEditSuccessPopup && newlyEditedResource && (
				<div className="fixed top-4 right-4 z-[99999] animate-in slide-in-from-right-4 fade-in duration-300" style={{ zIndex: 99999 }}>
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
		</div>
	);
};

export default ResourceLibrary;