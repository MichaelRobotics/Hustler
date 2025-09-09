"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import type React from "react";
import { useAutoNavigation } from "../../hooks/useAutoNavigation";
import { useResourcePage } from "../../hooks/useResourcePage";
import type { ResourcePageProps } from "../../types/resource";
import UnifiedNavigation from "../common/UnifiedNavigation";
import { AssignedResourceCard } from "./AssignedResourceCard";
import { AssignedResourcesEmptyState } from "./AssignedResourcesEmptyState";
import { FunnelGenerationSection } from "./FunnelGenerationSection";
import { InsufficientProductsValidation } from "./InsufficientProductsValidation";
import { ResourcePageHeader } from "./ResourcePageHeader";
import { OfflineConfirmationModal } from "./modals/OfflineConfirmationModal";
import { RemoveResourceModal } from "./modals/RemoveResourceModal";
import { validateFunnelProducts } from "../../helpers/funnel-product-validation";

const ResourcePage: React.FC<ResourcePageProps> = ({
	funnel,
	onBack,
	onGoToBuilder,
	onGoToPreview,
	onUpdateFunnel,
	onOpenResourceLibrary,
	onGlobalGeneration,
	isGenerating,
	isAnyFunnelGenerating,
	onGoToFunnelProducts,
	removeResourceFromFunnel,
}) => {
	const {
		deleteConfirmation,
		removingResourceId,
		offlineConfirmation,
		currentResources,
		handleDeleteResource,
		confirmDelete,
		cancelDelete,
		openOfflineConfirmation,
		closeOfflineConfirmation,
		takeFunnelOffline,
	} = useResourcePage(funnel, onUpdateFunnel, removeResourceFromFunnel);

	// Auto-navigation to funnel builder when generation completes
	useAutoNavigation({
		funnel,
		isGenerating,
		onNavigate: onGoToBuilder,
		enabled: true, // Enable auto-navigation for ResourcePage
	});

	// Check product validation
	const productValidation = validateFunnelProducts(funnel);

	return (
		<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
			{/* Enhanced Background Pattern */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

			<div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
				<div className="max-w-7xl mx-auto">
					{/* Header */}
					<ResourcePageHeader
						funnel={funnel}
						currentResources={currentResources}
						onBack={onBack}
						onOpenResourceLibrary={onOpenResourceLibrary}
						onOpenOfflineConfirmation={openOfflineConfirmation}
						isGenerating={isGenerating}
					/>

					{/* Generate Section or Validation Message - Show generation when valid, validation when missing products */}
					{currentResources.length > 0 && productValidation.isValid ? (
						<FunnelGenerationSection
							funnel={funnel}
							currentResources={currentResources}
							isGenerating={isGenerating}
							isAnyFunnelGenerating={isAnyFunnelGenerating}
							onGlobalGeneration={onGlobalGeneration}
						/>
					) : currentResources.length > 0 && !productValidation.isValid ? (
						<div className="mt-8 mb-8">
							<InsufficientProductsValidation
								hasPaidProducts={productValidation.hasPaidProducts}
								hasFreeProducts={productValidation.hasFreeProducts}
							/>
						</div>
					) : null}

					{/* Current Resources Section */}
					<div className="mt-8">
						{/* Products Grid */}
						{currentResources.length > 0 && (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{currentResources.map((resource) => (
									<AssignedResourceCard
										key={resource.id}
										resource={resource}
										funnel={funnel}
										onDelete={handleDeleteResource}
										isGenerating={isGenerating(funnel.id)}
										isRemoving={removingResourceId === resource.id}
									/>
								))}
							</div>
						)}
					</div>

					{/* Empty State */}
					{currentResources.length === 0 && <AssignedResourcesEmptyState />}
				</div>
			</div>

			{/* Remove Resource Modal */}
			<RemoveResourceModal
				isOpen={deleteConfirmation.show}
				resourceName={deleteConfirmation.resourceName}
				onConfirm={confirmDelete}
				onCancel={cancelDelete}
			/>

			{/* Offline Confirmation Modal */}
			<OfflineConfirmationModal
				isOpen={offlineConfirmation}
				onConfirm={takeFunnelOffline}
				onCancel={closeOfflineConfirmation}
			/>

			{/* Unified Navigation - Hide when funnel is generating, when no resources and no funnel generated, or when missing PAID or FREE products */}
			{!isGenerating(funnel.id) &&
				(currentResources.length > 0 || hasValidFlow(funnel)) &&
				productValidation.hasPaidProducts &&
				productValidation.hasFreeProducts && (
					<UnifiedNavigation
						onPreview={() => onGoToPreview(funnel)}
						onFunnelProducts={onGoToFunnelProducts}
						onEdit={() => onGoToBuilder(funnel)}
						onGeneration={() => onGlobalGeneration(funnel.id)}
						isGenerated={hasValidFlow(funnel)}
						isGenerating={isGenerating(funnel.id)}
						isAnyFunnelGenerating={isAnyFunnelGenerating}
						isDeployed={funnel.isDeployed}
						funnel={funnel}
						showOnPage="resources"
					/>
				)}
		</div>
	);
};

export default ResourcePage;
