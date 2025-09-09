"use client";

import React, { useMemo, useCallback } from "react";
import AIFunnelBuilderPage from "../funnelBuilder/AIFunnelBuilderPage";
import { LiveChatPage } from "../liveChat";
import PreviewPage from "../preview/PreviewPage";
import ResourceLibrary from "../products/ResourceLibrary";
import ResourcePage from "../products/ResourcePage";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import FunnelAnalyticsPage from "./FunnelAnalyticsPage";
import FunnelsDashboard from "./FunnelsDashboard";
import AddFunnelModal from "./modals/AddFunnelModal";
import DeleteFunnelModal from "./modals/DeleteFunnelModal";
import DeploymentModal from "./modals/DeploymentModal";
import EditFunnelModal from "./modals/EditFunnelModal";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import { useFunnelManagement } from "@/lib/hooks/useFunnelManagement";
import { useResourceManagement } from "@/lib/hooks/useResourceManagement";
import { useViewNavigation } from "@/lib/hooks/useViewNavigation";
import type { Resource } from "@/lib/types/resource";
import {
	generateMockData,
	generateSalesData,
} from "@/lib/utils/dataSimulation";

interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: any[];
	sends?: number;
	flow?: any;
	generationStatus?: "idle" | "generating" | "completed" | "failed";
	generationError?: string;
	lastGeneratedAt?: number;
}

type View =
	| "dashboard"
	| "analytics"
	| "resources"
	| "resourceLibrary"
	| "funnelBuilder"
	| "preview"
	| "liveChat";

const AdminPanel = React.memo(() => {
	// State for tracking typing in LiveChat
	const [isUserTyping, setIsUserTyping] = React.useState(false);
	// State for tracking if we're in a chat conversation
	const [isInChat, setIsInChat] = React.useState(false);

	// State for tracking navigation source for preview
	const [previewSource, setPreviewSource] = React.useState<
		"resources" | "funnelBuilder" | "analytics" | "resourceLibrary"
	>("resources");

	// State for tracking if rename is active (to hide sidebar)
	const [isRenaming, setIsRenaming] = React.useState(false);

	// State for tracking if we're creating a new funnel inline
	const [isCreatingNewFunnel, setIsCreatingNewFunnel] = React.useState(false);

	// State for tracking when modals are open (to disable sidebar)
	const [isLibraryModalOpen, setIsLibraryModalOpen] = React.useState(false);

	// Use the extracted hooks
	const {
		funnels,
		selectedFunnel,
		isAddDialogOpen,
		isDeleteDialogOpen,
		newFunnelName,
		funnelToDelete,
		editingFunnelId,
		isDeleting,
		error,
		setFunnels,
		setSelectedFunnel,
		setIsAddDialogOpen,
		setIsDeleteDialogOpen,
		setNewFunnelName,
		setFunnelToDelete,
		setEditingFunnelId,
		handleAddFunnel,
		handleDeleteFunnel,
		handleConfirmDelete,
		handleEditFunnel,
		handleDeployFunnel,
		handleDuplicateFunnel,
		handleSaveFunnelName,
		onFunnelClick,
		handleManageResources,
		updateFunnelGenerationStatus,
		isFunnelGenerating,
		isAnyFunnelGenerating,
		updateFunnelForGeneration,
		handleGlobalGeneration,
		updateFunnel,
		removeResourceFromFunnel,
		handleGenerationComplete,
		handleGenerationError,
	} = useFunnelManagement();

	const {
		libraryContext,
		selectedFunnelForLibrary,
		allResources,
		setLibraryContext,
		setSelectedFunnelForLibrary,
		setAllResources,
		handleOpenResourceLibrary,
		handleAddToFunnel,
		handleBackToDashboard: resourceBackToDashboard,
	} = useResourceManagement();

	// State synchronization: Update funnel resources when allResources changes
	React.useEffect(() => {
		if (allResources.length > 0 && funnels.length > 0) {
			// Update funnels with latest resource data
			setFunnels((prevFunnels) =>
				prevFunnels.map((funnel) => {
					if (funnel.resources && funnel.resources.length > 0) {
						// Update funnel resources with latest resource data
						const updatedResources = funnel.resources
							.map((funnelResource) => {
								const latestResource = allResources.find(
									(r) => r.id === funnelResource.id,
								);
								return latestResource || funnelResource;
							})
							.filter((resource) =>
								// Remove resources that no longer exist
								allResources.some((r) => r.id === resource.id),
							);

						return {
							...funnel,
							resources: updatedResources,
						};
					}
					return funnel;
				}),
			);
		}
	}, [allResources, setFunnels]);

	const {
		currentView,
		setCurrentView,
		handleViewChange: navigationHandleViewChange,
		onFunnelClick: navigationOnFunnelClick,
		handleManageResources: navigationHandleManageResources,
		handleBackToDashboard: navigationBackToDashboard,
	} = useViewNavigation();

	// Memoized handlers for better performance
	const handleViewChange = useCallback(
		(view: View) => {
			navigationHandleViewChange(
				view,
				selectedFunnel,
				currentView,
				setLibraryContext,
				setSelectedFunnelForLibrary,
			);
		},
		[
			navigationHandleViewChange,
			selectedFunnel,
			currentView,
			setLibraryContext,
			setSelectedFunnelForLibrary,
		],
	);

	const handleAddFunnelWithNavigation = useCallback(async () => {
		const newFunnel = await handleAddFunnel();
		if (newFunnel) {
			setCurrentView("resources");
		}
	}, [handleAddFunnel, setCurrentView]);

	const handleEditFunnelWithNavigation = useCallback(
		(funnel: Funnel) => {
			const targetView = handleEditFunnel(funnel);
			if (targetView) {
				setCurrentView(targetView as View);
			}
		},
		[handleEditFunnel, setCurrentView],
	);

	const handleFunnelClickWithNavigation = useCallback(
		(funnel: Funnel) => {
			const targetView = onFunnelClick(funnel);
			if (targetView) {
				setCurrentView(targetView as View);
			}
		},
		[onFunnelClick, setCurrentView],
	);

	const handleManageResourcesWithNavigation = useCallback(
		(funnel: Funnel) => {
			const targetView = handleManageResources(funnel);
			if (targetView) {
				setCurrentView(targetView as View);
			}
		},
		[handleManageResources, setCurrentView],
	);

	const handleOpenResourceLibraryWithNavigation = useCallback(() => {
		const targetView = handleOpenResourceLibrary(selectedFunnel);
		if (targetView) {
			setCurrentView(targetView as View);
		}
	}, [handleOpenResourceLibrary, selectedFunnel, setCurrentView]);

	const handleAddToFunnelWithState = useCallback(
		async (resource: Resource) => {
			await handleAddToFunnel(
				resource,
				selectedFunnel!,
				funnels,
				setFunnels,
				setSelectedFunnel,
			);
		},
		[handleAddToFunnel, selectedFunnel, funnels, setFunnels, setSelectedFunnel],
	);

	const handleBackToDashboard = useCallback(() => {
		setCurrentView("dashboard");
		setSelectedFunnel(null);
	}, [setCurrentView, setSelectedFunnel]);

	// Handle inline funnel creation
	const handleCreateNewFunnelInline = useCallback(() => {
		setIsCreatingNewFunnel(true);
		setIsRenaming(true);
		setEditingFunnelId("new-funnel-temp");
		setNewFunnelName(""); // Initialize with empty name
	}, [
		setIsCreatingNewFunnel,
		setIsRenaming,
		setEditingFunnelId,
		setNewFunnelName,
	]);

	// Handle library modal state changes
	const handleLibraryModalStateChange = useCallback((isModalOpen: boolean) => {
		setIsLibraryModalOpen(isModalOpen);
	}, []);

	// Render different views based on current state
	if (currentView === "analytics" && selectedFunnel) {
		// Debug logging
		console.log("Rendering analytics page with funnel:", {
			selectedFunnel,
			isDeployed: selectedFunnel.isDeployed,
			wasEverDeployed: selectedFunnel.wasEverDeployed,
			hasValidFlow: hasValidFlow(selectedFunnel),
		});

		// Validate that the funnel actually has valid flow before showing analytics
		// But allow analytics if we have mock data to show
		if (!hasValidFlow(selectedFunnel)) {
			console.log("No valid flow, but allowing analytics with mock data");
			// Don't redirect - let the analytics page handle it gracefully
		}

		return (
			<>
				<FunnelAnalyticsPage
					funnel={selectedFunnel}
					allUsers={generateMockData(150).map((user) => ({
						...user,
						funnelId: selectedFunnel.id,
					}))}
					allSalesData={generateSalesData().map((sale) => ({
						...sale,
						funnelId: selectedFunnel.id,
					}))}
					onBack={handleBackToDashboard}
					onGoToBuilder={(funnel) => {
						if (funnel && hasValidFlow(funnel)) {
							setSelectedFunnel(funnel);
							setCurrentView("funnelBuilder");
						} else {
							alert(
								"This funnel needs to be generated first. Please generate the funnel before editing.",
							);
						}
					}}
					onGlobalGeneration={() =>
						handleGlobalGeneration(selectedFunnel?.id || "")
					}
					isGenerating={
						selectedFunnel ? isFunnelGenerating(selectedFunnel.id) : false
					}
				/>
			</>
		);
	}

	if (currentView === "resources" && selectedFunnel) {
		const currentFunnel =
			funnels.find((f) => f.id === selectedFunnel.id) || selectedFunnel;

		return (
			<ResourcePage
				funnel={currentFunnel}
				onBack={() => {
					if (hasValidFlow(selectedFunnel)) {
						setCurrentView("analytics");
					} else {
						setCurrentView("dashboard");
					}
				}}
				onGoToBuilder={(updatedFunnel?: Funnel) => {
					const targetFunnel = updatedFunnel || selectedFunnel;
					if (targetFunnel && hasValidFlow(targetFunnel)) {
						setSelectedFunnel(targetFunnel);
						setCurrentView("funnelBuilder");
					} else {
						setCurrentView("resources");
					}
				}}
				onGoToPreview={(funnel) => {
					if (funnel && hasValidFlow(funnel)) {
						setSelectedFunnel(funnel);
						setPreviewSource("resources");
						setCurrentView("preview");
					} else {
						alert(
							"This funnel needs to be generated first. Please generate the funnel before previewing.",
						);
					}
				}}
				onUpdateFunnel={(updatedFunnel) => {
					setFunnels(
						funnels.map((f) => (f.id === updatedFunnel.id ? updatedFunnel : f)),
					);
					if (selectedFunnel && selectedFunnel.id === updatedFunnel.id) {
						setSelectedFunnel(updatedFunnel);
					}
				}}
				onOpenResourceLibrary={handleOpenResourceLibraryWithNavigation}
				onGlobalGeneration={handleGlobalGeneration}
				isGenerating={isFunnelGenerating}
				isAnyFunnelGenerating={isAnyFunnelGenerating}
				onEdit={() => {}}
				onGoToFunnelProducts={() => {}}
				removeResourceFromFunnel={removeResourceFromFunnel}
			/>
		);
	}

	if (currentView === "resourceLibrary") {
		if (libraryContext === "global") {
			return (
				<div className="flex h-screen">
					{!isLibraryModalOpen && (
						<AdminSidebar
							currentView={currentView}
							onViewChange={handleViewChange}
							className="flex-shrink-0 h-full"
							libraryContext={libraryContext}
							currentFunnelForLibrary={selectedFunnelForLibrary}
							disabled={isLibraryModalOpen}
						/>
					)}

					<div className="flex-1 overflow-auto w-full lg:w-auto">
						<ResourceLibrary
							funnel={undefined}
							allResources={allResources}
							allFunnels={funnels}
							setAllResources={setAllResources}
							onBack={undefined}
							onAddToFunnel={undefined}
							onEdit={undefined}
							onGlobalGeneration={() => handleGlobalGeneration("")}
							isGenerating={false}
							isAnyFunnelGenerating={isAnyFunnelGenerating}
							onGoToFunnelProducts={() => setCurrentView("resources")}
							context={libraryContext}
							onModalStateChange={handleLibraryModalStateChange}
						/>
					</div>
				</div>
			);
		} else {
			return (
				<ResourceLibrary
					funnel={selectedFunnel || undefined}
					allResources={allResources}
					allFunnels={funnels}
					setAllResources={setAllResources}
					onBack={() => setCurrentView("resources")}
					onAddToFunnel={handleAddToFunnelWithState}
					onEdit={() => {
						if (selectedFunnel && hasValidFlow(selectedFunnel)) {
							setCurrentView("funnelBuilder");
						} else {
							setCurrentView("resources");
						}
					}}
					onGoToPreview={(funnel) => {
						if (funnel && hasValidFlow(funnel)) {
							setSelectedFunnel(funnel);
							setPreviewSource("resourceLibrary");
							setCurrentView("preview");
						} else {
							alert(
								"This funnel needs to be generated first. Please generate the funnel before previewing.",
							);
						}
					}}
					onGlobalGeneration={() =>
						handleGlobalGeneration(selectedFunnel?.id || "")
					}
					isGenerating={
						selectedFunnel ? isFunnelGenerating(selectedFunnel.id) : false
					}
					isAnyFunnelGenerating={isAnyFunnelGenerating}
					onGoToFunnelProducts={() => setCurrentView("resources")}
					context={libraryContext}
					onModalStateChange={handleLibraryModalStateChange}
				/>
			);
		}
	}

	if (currentView === "funnelBuilder" && selectedFunnel) {
		return (
			<AIFunnelBuilderPage
				funnel={selectedFunnel}
				onBack={handleBackToDashboard}
				onUpdate={async (updatedFunnel) => {
					// Debug logging
					console.log("AdminPanel onUpdate called:", {
						updatedFunnel,
						isDeployed: updatedFunnel.isDeployed,
						wasEverDeployed: updatedFunnel.wasEverDeployed,
						hasValidFlow: hasValidFlow(updatedFunnel),
					});

					// Update funnel state immediately for responsive UI
					setSelectedFunnel(updatedFunnel);
					setFunnels(
						funnels.map((f) => (f.id === updatedFunnel.id ? updatedFunnel : f)),
					);

					// Save flow data to database
					try {
						const response = await fetch(`/api/funnels/${updatedFunnel.id}`, {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								flow: updatedFunnel.flow,
								name: updatedFunnel.name,
							}),
						});

						if (!response.ok) {
							const errorData = await response.json();
							throw new Error(
								errorData.message || "Failed to save funnel changes",
							);
						}

						const data = await response.json();
						const savedFunnel = data.data;

						// Update state with the saved version from database
						setSelectedFunnel(savedFunnel);
						setFunnels(
							funnels.map((f) => (f.id === savedFunnel.id ? savedFunnel : f)),
						);

						console.log("Funnel flow data saved to database successfully");
					} catch (error) {
						console.error("Error saving funnel flow data:", error);
						// Note: We don't revert the UI state here to avoid jarring user experience
						// The user can try to save again or refresh to get the latest state
					}

					if (updatedFunnel.isDeployed && hasValidFlow(updatedFunnel)) {
						console.log("Redirecting to analytics...");
						setTimeout(() => {
							setCurrentView("analytics");
						}, 100);
					}
				}}
				onGoToFunnelProducts={() => setCurrentView("resources")}
				onGoToPreview={() => {
					setPreviewSource("funnelBuilder");
					setCurrentView("preview");
				}}
				onGenerationComplete={handleGenerationComplete}
				onGenerationError={handleGenerationError}
			/>
		);
	}

	if (currentView === "funnelBuilder" && !selectedFunnel) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

				<div className="flex h-screen">
					<AdminSidebar
						currentView={currentView}
						onViewChange={handleViewChange}
						className="flex-shrink-0 h-full"
						libraryContext={libraryContext}
						currentFunnelForLibrary={selectedFunnelForLibrary}
						disabled={isLibraryModalOpen}
					/>

					<div className="flex-1 overflow-auto w-full lg:w-auto">
						<div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
							<div className="max-w-7xl mx-auto">
								<div className="text-center py-20">
									<h1 className="text-2xl font-bold text-foreground mb-4">
										No Funnel Selected
									</h1>
									<p className="text-muted-foreground mb-6">
										Please select a funnel to edit or go back to the dashboard.
									</p>
									<button
										onClick={handleBackToDashboard}
										className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
									>
										Back to Dashboard
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (currentView === "preview" && selectedFunnel) {
		const handleBackFromPreview = () => {
			// Navigate back to the source page
			if (previewSource === "funnelBuilder") {
				setCurrentView("funnelBuilder");
			} else if (previewSource === "analytics") {
				setCurrentView("analytics");
			} else if (previewSource === "resourceLibrary") {
				setCurrentView("resourceLibrary");
			} else {
				setCurrentView("resources");
			}
		};

		return (
			<PreviewPage
				funnel={selectedFunnel}
				onBack={handleBackFromPreview}
				sourcePage={previewSource}
			/>
		);
	}

	if (currentView === "liveChat") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

				<div className="h-screen w-full">
					<LiveChatPage
						onBack={handleBackToDashboard}
						onTypingChange={setIsUserTyping}
						onChatStateChange={setIsInChat}
					/>
				</div>
			</div>
		);
	}

	// Main dashboard view
	return (
		<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

			<div className="flex h-screen">
				{!isRenaming && (
					<AdminSidebar
						currentView={currentView}
						onViewChange={handleViewChange}
						className="flex-shrink-0 h-full"
						libraryContext={libraryContext}
						currentFunnelForLibrary={selectedFunnelForLibrary}
						isUserTyping={isUserTyping}
						disabled={isLibraryModalOpen}
					/>
				)}

				<div className="flex-1 overflow-auto w-full lg:w-auto">
					<div className="relative p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
						<div className="max-w-7xl mx-auto">
							<AdminHeader onAddFunnel={handleCreateNewFunnelInline} />

							<div className="mt-8">
								<FunnelsDashboard
									funnels={funnels}
									setFunnels={setFunnels}
									handleEditFunnel={handleEditFunnelWithNavigation}
									handleDeployFunnel={handleDeployFunnel}
									setFunnelToDelete={handleDeleteFunnel}
									editingFunnelId={editingFunnelId}
									setEditingFunnelId={setEditingFunnelId}
									handleSaveFunnelName={handleSaveFunnelName}
									onFunnelClick={handleFunnelClickWithNavigation}
									handleDuplicateFunnel={handleDuplicateFunnel}
									handleManageResources={handleManageResourcesWithNavigation}
									isRenaming={isRenaming}
									setIsRenaming={setIsRenaming}
									isCreatingNewFunnel={isCreatingNewFunnel}
									setIsCreatingNewFunnel={setIsCreatingNewFunnel}
									newFunnelName={newFunnelName}
									setNewFunnelName={setNewFunnelName}
									funnelToDelete={funnelToDelete}
								/>
							</div>

							{/* Modals */}
							<DeleteFunnelModal
								isOpen={isDeleteDialogOpen}
								onOpenChange={setIsDeleteDialogOpen}
								funnelToDelete={funnelToDelete}
								onConfirmDelete={handleConfirmDelete}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
});

AdminPanel.displayName = "AdminPanel";

export default AdminPanel;
