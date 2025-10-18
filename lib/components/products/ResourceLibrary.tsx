"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import React, { useEffect } from "react";
import { CheckCircle, DollarSign, Gift } from "lucide-react";
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

	// State for inline product creation
	const [isCreatingNewProduct, setIsCreatingNewProduct] = React.useState(false);
	const [isSaving, setIsSaving] = React.useState(false);
	
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

	// Notify parent when modal states change
	useEffect(() => {
		const isModalOpen =
			isAddingResource || deleteConfirmation.show || isCreatingNewProduct || isEditingResource;
		onModalStateChange?.(isModalOpen);
	}, [
		isAddingResource,
		deleteConfirmation.show,
		isCreatingNewProduct,
		isEditingResource,
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
			type: "AFFILIATE",
			category: "FREE_VALUE",
			description: "",
			promoCode: "",
		});
	};

	// Handle saving new product
	const handleSaveNewProduct = async () => {
		if (!newResource.name?.trim() || !newResource.link?.trim()) {
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
									<InsufficientProductsValidation funnel={funnel} />
								</div>
							) : null}
						</>
					)}

					{/* Resources Grid */}
					{!error && (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-products-section>
							{/* New Product Creation Card */}
							{isCreatingNewProduct && (
								<div className="group bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-gray-200/40 dark:from-orange-900/80 dark:via-gray-800/60 dark:to-gray-900/30 p-4 rounded-xl border-2 border-orange-500/60 dark:border-orange-400/70 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300">
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
													!newResource.link?.trim() ||
													!isNameAvailable(newResource.name || "")
												}
												className="px-3 py-1 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isSaving ? "Saving..." : "+ Add"}
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

									<div className="space-y-3">
										{/* Type and Category Selectors */}
										<div className="flex gap-2">
											<select
												value={newResource.type || "AFFILIATE"}
												onChange={(e) =>
													setNewResource({
														...newResource,
														type: e.target.value as "AFFILIATE" | "MY_PRODUCTS",
													})
												}
												disabled={isSaving}
												className="flex-1 px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
												className="flex-1 px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<option value="FREE_VALUE">Gift</option>
												<option value="PAID">Paid</option>
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
											placeholder="Digital Asset name"
											disabled={isSaving}
											className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
												newResource.name && !isNameAvailable(newResource.name)
													? "border-red-500 focus:border-red-500 focus:ring-red-500/50"
													: "border-violet-300 dark:border-violet-600 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400"
											}`}
											autoFocus
										/>
										{newResource.name && !isNameAvailable(newResource.name) && (
											<div className="mt-1 text-xs text-red-600 dark:text-red-400">
												This name is already taken. Please choose a different one.
											</div>
										)}

										{/* URL Field */}
										<input
											type="url"
											value={newResource.link || ""}
											onChange={(e) =>
												setNewResource({ ...newResource, link: e.target.value })
											}
											placeholder="Digital asset URL"
											disabled={isSaving}
											className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
										/>

										{/* Promo Code Field */}
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
											className="w-full px-3 py-2 text-sm border border-violet-300 dark:border-violet-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 dark:focus:border-violet-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
										/>
									</div>
								</div>
							)}


							{displayResources.map((resource) => (
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
										onAddToFunnel={onAddToFunnel}
										onRemoveFromFunnel={onRemoveFromFunnel}
										onEdit={openEditModal}
										onDelete={handleDeleteResource}
										onUpdate={handleUpdateResourceWithAnimation}
										isRemoving={removingResourceId === resource.id}
										onEditingChange={handleEditingChange}
										hideAssignmentOptions={context === "funnel" && funnel && (hasValidFlow(funnel) || currentlyGenerating)}
										isJustCreated={newlyCreatedResourceId === resource.id}
										isJustEdited={newlyEditedResourceId === resource.id}
									/>
								</div>
							))}
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
