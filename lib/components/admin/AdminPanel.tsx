"use client";

import React, { useMemo, useCallback } from "react";
import AIFunnelBuilderPage from "../funnelBuilder/AIFunnelBuilderPage";
import { LiveChatPage } from "../liveChat";
import PreviewPage from "../preview/PreviewPage";
import ResourceLibrary from "../products/ResourceLibrary";
import StorePreview from "../store/StorePreview";
import { SeasonalStore } from "../store/SeasonalStore/SeasonalStore";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import FunnelAnalyticsPage from "./FunnelAnalyticsPage";
import FunnelsDashboard from "./FunnelsDashboard";
import AddFunnelModal from "./modals/AddFunnelModal";
import DeleteFunnelModal from "./modals/DeleteFunnelModal";
import { DeploymentModal } from "../funnelBuilder/modals/DeploymentModal";
import EditFunnelModal from "./modals/EditFunnelModal";
import { OfflineConfirmationModal } from "../funnelBuilder/modals/OfflineConfirmationModal";
import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import { useFunnelManagement } from "@/lib/hooks/useFunnelManagement";
import { useFunnelDeployment } from "@/lib/hooks/useFunnelDeployment";
import { useResourceManagement } from "@/lib/hooks/useResourceManagement";
import { useAnalyticsManagement } from "@/lib/hooks/useAnalyticsManagement";
import { useModalManagement } from "@/lib/hooks/useModalManagement";
import { useViewNavigation } from "@/lib/hooks/useViewNavigation";
import { useAutoDeployment } from "@/lib/hooks/useAutoDeployment";
import { GLOBAL_LIMITS } from "@/lib/types/resource";
import { apiPut } from "@/lib/utils/api-client";
import type { Resource } from "@/lib/types/resource";
import type { AuthenticatedUser } from "@/lib/types/user";
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
	| "resourceLibrary"
	| "funnelBuilder"
	| "preview"
	| "liveChat"
	| "store"
	| "storePreview";

interface AdminPanelProps {
	user: AuthenticatedUser | null;
}

const AdminPanel = React.memo(({ user }: AdminPanelProps) => {
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
		isFunnelNameAvailable,
		isDeleting,
		isAutoCreated,
	} = useFunnelManagement(user);

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
	} = useResourceManagement(user);

	const {
		analyticsData,
		isRefreshing: analyticsRefreshing,
		error: analyticsError,
		getAnalyticsData,
		fetchAnalyticsData,
		updateAnalyticsData,
		refreshAnalyticsData,
		clearAnalyticsData,
		clearAllAnalyticsData,
		isAnalyticsDataStale,
	} = useAnalyticsManagement(user);

	// Modal management for offline confirmation
	const {
		offlineConfirmation,
		openOfflineConfirmation,
		closeOfflineConfirmation,
	} = useModalManagement();

	// Auto-deployment hook for single funnels
	const { handleAutoDeploy, isDeploying: isAutoDeploying, deploymentLog: autoDeploymentLog, deploymentAction: autoDeploymentAction } = useAutoDeployment({
		user,
		onFunnelUpdate: (updatedFunnel) => {
			setSelectedFunnelForLibrary(updatedFunnel);
		},
		onFunnelsUpdate: (updatedFunnels) => {
			setFunnels(updatedFunnels);
		},
		onNavigateToAnalytics: (funnel) => {
			console.log("🏪 [AUTO-DEPLOY] Navigating to Store view for funnel:", funnel.id);
			setSelectedFunnel(funnel);
			setCurrentView("store");
		},
	});

	// Deployment management for Library funnel context
	const deployment = useFunnelDeployment(
		selectedFunnelForLibrary ? {
			...selectedFunnelForLibrary,
			resources: selectedFunnelForLibrary.resources?.map(r => ({
				...r,
				type: r.type as "AFFILIATE" | "MY_PRODUCTS" | "CONTENT" | "TOOL"
			}))
		} : { id: "", name: "", flow: null },
		(updatedFunnel) => {
			// Convert back to the expected type and update state
			const convertedFunnel = {
				...updatedFunnel,
				resources: updatedFunnel.resources?.map(r => ({
					...r,
					type: r.type as "AFFILIATE" | "MY_PRODUCTS",
					category: (r.category as "PAID" | "FREE_VALUE") || "FREE_VALUE"
				}))
			};
			setSelectedFunnelForLibrary(convertedFunnel);
			// Also update the main funnels array
			setFunnels(prevFunnels => 
				prevFunnels.map(f => f.id === convertedFunnel.id ? convertedFunnel : f)
			);
		},
		undefined, // No enableCalculationsForGoLive callback needed for Library
		user,
	);

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
		handleLibraryIconClick: navigationHandleLibraryIconClick,
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

	const handleLibraryIconClick = useCallback(
		() => {
			navigationHandleLibraryIconClick(
				currentView,
				setLibraryContext,
				setSelectedFunnelForLibrary,
			);
		},
		[navigationHandleLibraryIconClick, currentView, setLibraryContext, setSelectedFunnelForLibrary],
	);

	const handleAddFunnelWithNavigation = useCallback(async () => {
		const newFunnel = await handleAddFunnel();
		if (newFunnel) {
			setCurrentView("resourceLibrary");
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
			const targetView = navigationOnFunnelClick(funnel);
			if (targetView) {
				// Set the selected funnel first
				setSelectedFunnel(funnel);
				// Use navigationHandleViewChange directly with the funnel
				navigationHandleViewChange(
					targetView as View,
					funnel, // Pass the funnel directly
					currentView,
					setLibraryContext,
					setSelectedFunnelForLibrary,
				);
			}
		},
		[navigationOnFunnelClick, navigationHandleViewChange, currentView, setLibraryContext, setSelectedFunnelForLibrary],
	);

	const handleManageResourcesWithNavigation = useCallback(
		(funnel: Funnel) => {
			const targetView = handleManageResources(funnel);
			if (targetView) {
				// Set funnel context for resource library
				setLibraryContext("funnel");
				setSelectedFunnelForLibrary(funnel);
				setCurrentView(targetView as View);
			}
		},
		[handleManageResources, setCurrentView, setLibraryContext, setSelectedFunnelForLibrary],
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

	// Handle adding resources to funnel in Library (funnel context)
	const handleAddToFunnelInLibrary = useCallback(
		async (resource: Resource) => {
			if (selectedFunnelForLibrary) {
				await handleAddToFunnel(
					resource,
					selectedFunnelForLibrary,
					funnels,
					setFunnels,
					(updatedFunnel) => {
						// Update both selectedFunnel and selectedFunnelForLibrary
						setSelectedFunnel(updatedFunnel);
						setSelectedFunnelForLibrary(updatedFunnel);
					},
				);
			}
		},
		[handleAddToFunnel, selectedFunnelForLibrary, funnels, setFunnels, setSelectedFunnel, setSelectedFunnelForLibrary],
	);

	// Auto-navigate to Library when a new funnel is auto-created
	React.useEffect(() => {
		console.log("🔍 [AUTO-NAV DEBUG] Checking auto-navigation conditions:", {
			funnelsLength: funnels.length,
			currentView,
			selectedFunnelForLibrary: !!selectedFunnelForLibrary,
			isAutoCreated,
			conditions: {
				hasOneFunnel: funnels.length === 1,
				isOnDashboard: currentView === "dashboard",
				noSelectedFunnel: !selectedFunnelForLibrary,
				wasAutoCreated: isAutoCreated
			}
		});
		
		// Only navigate if:
		// 1. We have exactly one funnel
		// 2. We're on the dashboard
		// 3. No funnel is currently selected for library
		// 4. The funnel was auto-created (not manually created)
		if (funnels.length === 1 && currentView === "dashboard" && !selectedFunnelForLibrary && isAutoCreated) {
			const newFunnel = funnels[0];
			console.log("🚀 [AUTO-NAV] Auto-created funnel detected, navigating to Library view:", newFunnel);
			
			// Navigate to Library view in funnel context
			setLibraryContext("funnel");
			setSelectedFunnelForLibrary(newFunnel);
			setCurrentView("resourceLibrary");
		}
	}, [funnels.length, currentView, selectedFunnelForLibrary, isAutoCreated, setLibraryContext, setSelectedFunnelForLibrary, setCurrentView]);

	// Sync selectedFunnelForLibrary with funnels array when funnel updates (e.g., after generation)
	React.useEffect(() => {
		if (selectedFunnelForLibrary) {
			const updatedFunnel = funnels.find((f) => f.id === selectedFunnelForLibrary.id);
			if (updatedFunnel) {
				// Check if the flow has changed (more reliable than object reference comparison)
				const hasFlowChanged = !!updatedFunnel.flow !== !!selectedFunnelForLibrary.flow;
				const hasGenerationStatusChanged = updatedFunnel.generationStatus !== selectedFunnelForLibrary.generationStatus;
				
				if (hasFlowChanged || hasGenerationStatusChanged) {
					console.log("🔄 [SYNC] Updating selectedFunnelForLibrary with latest funnel data:", {
						funnelId: updatedFunnel.id,
						hasFlow: !!updatedFunnel.flow,
						generationStatus: updatedFunnel.generationStatus,
						oldFlow: !!selectedFunnelForLibrary.flow,
						newFlow: !!updatedFunnel.flow,
						hasFlowChanged,
						hasGenerationStatusChanged,
					});
					setSelectedFunnelForLibrary(updatedFunnel);
					
					// If generation just completed and we have a valid flow, trigger auto-navigation
					// BUT ONLY if we're currently in ResourceLibrary funnel context
					if (hasFlowChanged && !!updatedFunnel.flow && hasValidFlow(updatedFunnel) && 
						currentView === "resourceLibrary" && libraryContext === "funnel" && 
						selectedFunnelForLibrary?.id === updatedFunnel.id) {
						console.log("🚀 [SYNC] Generation completed with valid flow - triggering auto-navigation from ResourceLibrary funnel context");
						
						// Auto-deploy if there's only 1 funnel - do this BEFORE view switch
						if (funnels.length === 1) {
							console.log("🚀 [AUTO-DEPLOY] Single funnel detected, auto-deploying after generation completion");
							// Use the auto-deployment hook for clean separation of concerns
							handleAutoDeploy(updatedFunnel).catch((error) => {
								console.error("❌ [AUTO-DEPLOY] Auto-deployment failed:", error);
								// Error handling is already done in the hook
							});
						}
						
						// For single funnels, auto-deployment will handle navigation to Analytics
						// For multiple funnels, navigate to FunnelBuilder as usual
						if (funnels.length > 1) {
							// Small delay to ensure state is updated, then switch to FunnelBuilder
							setTimeout(() => {
								if (hasValidFlow(updatedFunnel)) {
									console.log("🚀 [SYNC] Auto-navigating to funnelBuilder from ResourceLibrary");
									setSelectedFunnel(updatedFunnel);
									setCurrentView("funnelBuilder");
								}
							}, 100);
						} else {
							console.log("📊 [SYNC] Single funnel detected - auto-deployment will handle navigation to Analytics");
						}
					}
				}
			}
		}
	}, [funnels, selectedFunnelForLibrary, setSelectedFunnelForLibrary, currentView, libraryContext]);

	const handleBackToDashboard = useCallback(() => {
		setCurrentView("dashboard");
		setSelectedFunnel(null);
	}, [setCurrentView, setSelectedFunnel]);

	// Handle back to My Merchants (dashboard) view
	const handleBackToResourceLibrary = useCallback(() => {
		// Always navigate to My Merchants (dashboard) view
		setCurrentView("dashboard");
		setSelectedFunnel(null);
	}, [setCurrentView, setSelectedFunnel]);

	// Handle inline funnel creation - show funnel creation card in dashboard
	const handleCreateNewFunnelInline = useCallback(() => {
		// Show funnel creation card in FunnelsDashboard
		setIsCreatingNewFunnel(true);
		setCurrentView("dashboard");
	}, [setIsCreatingNewFunnel, setCurrentView]);

	// Handle taking funnel offline - use deployment hook for proper offline flow
	const handleTakeFunnelOffline = useCallback(async () => {
		if (selectedFunnelForLibrary) {
			try {
				// Use the deployment hook's handleUndeploy for proper offline flow
				await deployment.handleUndeploy();
				closeOfflineConfirmation();
			} catch (error) {
				console.error("Failed to take funnel offline:", error);
			}
		}
	}, [selectedFunnelForLibrary, deployment, closeOfflineConfirmation]);

	// Handle navigation to Library in funnel context (always goes to Library regardless of generation status)
	const handleGoToLibrary = useCallback((funnel: Funnel) => {
		console.log("🔍 [GO TO LIBRARY] funnel:", funnel);
		console.log("🔍 [GO TO LIBRARY] funnel.isDeployed:", funnel.isDeployed);
		console.log("🔍 [GO TO LIBRARY] funnel.resources:", funnel.resources);
		console.log("🔍 [GO TO LIBRARY] funnel.flow:", funnel.flow);
		console.log("🔍 [GO TO LIBRARY] hasValidFlow:", hasValidFlow(funnel));
		
		// Always go to Library in funnel context, regardless of generation status
		console.log("🔍 [GO TO LIBRARY] Navigating to Library in funnel context");
		setLibraryContext("funnel");
		setSelectedFunnelForLibrary(funnel);
		setCurrentView("resourceLibrary");
	}, [setLibraryContext, setSelectedFunnelForLibrary, setCurrentView]);

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
					experienceId={user?.experienceId}
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
					analyticsManagement={{
						analyticsData,
						isRefreshing: analyticsRefreshing,
						error: analyticsError,
						getAnalyticsData,
						fetchAnalyticsData,
						updateAnalyticsData,
						isAnalyticsDataStale,
					}}
				/>
			</>
		);
	}


	console.log("🔍 [ADMIN PANEL] currentView:", currentView);
	console.log("🔍 [ADMIN PANEL] libraryContext:", libraryContext);
	console.log("🔍 [ADMIN PANEL] selectedFunnelForLibrary:", selectedFunnelForLibrary);
	
	if (currentView === "resourceLibrary") {
		console.log("🔍 [ADMIN PANEL] Rendering resourceLibrary view");
		if (libraryContext === "global") {
			return (
				<div className="flex h-screen">
					{!isLibraryModalOpen && (
						<AdminSidebar
							currentView={currentView}
							onViewChange={handleViewChange}
							onLibraryIconClick={handleLibraryIconClick}
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
							user={user}
							onAddToFunnel={undefined}
							onRemoveFromFunnel={undefined}
							onEdit={undefined}
							onGlobalGeneration={() => handleGlobalGeneration("")}
							isGenerating={false}
							isAnyFunnelGenerating={isAnyFunnelGenerating}
							onGoToFunnelProducts={() => setCurrentView("resourceLibrary")}
							onOpenOfflineConfirmation={undefined}
							context={libraryContext}
							onModalStateChange={handleLibraryModalStateChange}
						/>
					</div>
				</div>
			);
		} else {
			return (
				<>
					<ResourceLibrary
						funnel={selectedFunnelForLibrary || undefined}
						allResources={allResources}
						allFunnels={funnels}
						setAllResources={setAllResources}
						onBack={() => setCurrentView("dashboard")}
						user={user}
						onAddToFunnel={handleAddToFunnelInLibrary}
						onRemoveFromFunnel={(resource) => {
							if (selectedFunnelForLibrary) {
								removeResourceFromFunnel(selectedFunnelForLibrary.id, resource.id);
								// Update the selectedFunnelForLibrary state
								const updatedFunnel = {
									...selectedFunnelForLibrary,
									resources: selectedFunnelForLibrary.resources?.filter(r => r.id !== resource.id) || []
								};
								setSelectedFunnelForLibrary(updatedFunnel);
							}
						}}
						onEdit={() => {
							console.log("🔍 [LIBRARY EDIT] selectedFunnelForLibrary:", selectedFunnelForLibrary);
							console.log("🔍 [LIBRARY EDIT] hasValidFlow:", selectedFunnelForLibrary ? hasValidFlow(selectedFunnelForLibrary) : false);
							if (selectedFunnelForLibrary && hasValidFlow(selectedFunnelForLibrary)) {
								console.log("🔍 [LIBRARY EDIT] Setting selectedFunnel and navigating to funnelBuilder");
								setSelectedFunnel(selectedFunnelForLibrary);
								setCurrentView("funnelBuilder");
							} else {
								console.log("🔍 [LIBRARY EDIT] Navigating to dashboard (no valid flow)");
								setCurrentView("dashboard");
							}
						}}
						onGoToPreview={(funnel) => {
							console.log("🔍 [LIBRARY PREVIEW] funnel:", funnel);
							console.log("🔍 [LIBRARY PREVIEW] hasValidFlow:", funnel ? hasValidFlow(funnel) : false);
							if (funnel && hasValidFlow(funnel)) {
								console.log("🔍 [LIBRARY PREVIEW] Setting selectedFunnel and navigating to preview");
								setSelectedFunnel(funnel);
								setPreviewSource("resourceLibrary");
								setCurrentView("preview");
							} else {
								console.log("🔍 [LIBRARY PREVIEW] Showing alert - no valid flow");
								alert(
									"This funnel needs to be generated first. Please generate the funnel before previewing.",
								);
							}
						}}
						onGlobalGeneration={() =>
							handleGlobalGeneration(selectedFunnelForLibrary?.id || "")
						}
						isGenerating={isFunnelGenerating}
						isAnyFunnelGenerating={isAnyFunnelGenerating}
						onGoToFunnelProducts={() => setCurrentView("resourceLibrary")}
						onOpenOfflineConfirmation={openOfflineConfirmation}
						onDeploy={deployment.handleDeploy}
						context={libraryContext}
						onModalStateChange={handleLibraryModalStateChange}
						// Generation props for funnel context
						isGeneratingFunnel={isFunnelGenerating}
						onGlobalGenerationFunnel={handleGlobalGeneration}
						// Deployment state
						isDeploying={deployment.isDeploying}
						hasAnyLiveFunnel={funnels.some(f => f.isDeployed)}
						// Auto-navigation callback
						onNavigate={(funnel) => {
							console.log("🚀 [AUTO-NAV] onNavigate called:", {
								funnelId: funnel?.id,
								hasValidFlow: funnel ? hasValidFlow(funnel) : false,
								hasFlow: !!funnel?.flow,
							});
							if (funnel && hasValidFlow(funnel)) {
								console.log("🚀 [AUTO-NAV] Navigating to funnelBuilder");
								setSelectedFunnel(funnel);
								setCurrentView("funnelBuilder");
							} else {
								console.log("🚀 [AUTO-NAV] Navigation blocked - invalid funnel or no valid flow");
							}
						}}
					/>
					
					{/* Deployment Modal for Library in funnel context */}
					<DeploymentModal
						isDeploying={deployment.isDeploying}
						deploymentLog={deployment.deploymentLog}
						action={deployment.deploymentAction}
					/>

					{/* Auto-Deployment Modal for single funnels */}
					<DeploymentModal
						isDeploying={isAutoDeploying}
						deploymentLog={autoDeploymentLog}
						action={autoDeploymentAction}
					/>

					{/* Offline Confirmation Modal for Library in funnel context */}
					<OfflineConfirmationModal
						isOpen={offlineConfirmation}
						onClose={closeOfflineConfirmation}
						onConfirm={handleTakeFunnelOffline}
					/>
				</>
			);
		}
	}

	if (currentView === "funnelBuilder" && selectedFunnel) {
		// Calculate if any funnel is live globally (excluding current funnel)
		const hasAnyLiveFunnel = funnels.some(funnel => 
			funnel.id !== selectedFunnel.id && funnel.isDeployed
		);

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
						const response = await apiPut(`/api/funnels/${updatedFunnel.id}`, {
							flow: updatedFunnel.flow,
							name: updatedFunnel.name,
						}, user?.experienceId);

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
						console.log("Redirecting to store...");
						setTimeout(() => {
							setCurrentView("store");
						}, 100);
					}
				}}
				onGoToFunnelProducts={() => {
					// Navigate to Library in funnel context
					console.log("🔍 [FUNNELBUILDER -> LIBRARY] selectedFunnel:", selectedFunnel);
					console.log("🔍 [FUNNELBUILDER -> LIBRARY] selectedFunnel.id:", selectedFunnel?.id);
					console.log("🔍 [FUNNELBUILDER -> LIBRARY] selectedFunnel.resources:", selectedFunnel?.resources);
					setLibraryContext("funnel");
					setSelectedFunnelForLibrary(selectedFunnel);
					setCurrentView("resourceLibrary");
				}}
				onGoToPreview={() => {
					setPreviewSource("funnelBuilder");
					setCurrentView("preview");
				}}
				onGenerationComplete={handleGenerationComplete}
				onGenerationError={handleGenerationError}
				user={user}
				hasAnyLiveFunnel={hasAnyLiveFunnel}
				isSingleMerchant={funnels.length === 1}
			/>
		);
	}

	if (currentView === "funnelBuilder" && !selectedFunnel) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

				<div className="flex h-screen">
					{(
						<AdminSidebar
							currentView={currentView}
							onViewChange={handleViewChange}
							onLibraryIconClick={handleLibraryIconClick}
							className="flex-shrink-0 h-full"
							libraryContext={libraryContext}
							currentFunnelForLibrary={selectedFunnelForLibrary}
							disabled={isLibraryModalOpen}
						/>
					)}

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
				setCurrentView("dashboard");
			}
		};

		return (
			<PreviewPage
				funnel={selectedFunnel}
				experienceId={user?.experienceId}
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
						user={user}
						experienceId={user?.experienceId || ""}
					/>
				</div>
			</div>
		);
	}

	if (currentView === "store") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

				<div className="h-screen w-full">
					<SeasonalStore
						user={user}
						allResources={allResources}
						setAllResources={setAllResources}
						onBack={() => {
							console.log("🏪 [STORE] Back to AdminPanel");
							setCurrentView("dashboard");
						}}
						onNavigateToStorePreview={() => {
							console.log("🏪 [STORE] Navigate to StorePreview");
							setCurrentView("storePreview");
						}}
					/>
				</div>
			</div>
		);
	}

	if (currentView === "storePreview") {
		return (
			<div className="min-h-screen bg-gradient-to-br from-surface via-surface/95 to-surface/90 font-sans transition-all duration-300">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.08)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(120,119,198,0.15)_1px,transparent_0)] bg-[length:24px_24px] pointer-events-none" />

				<div className="h-screen w-full">
					<StorePreview
						user={user}
						allResources={allResources}
						setAllResources={setAllResources}
						onMessageSent={(message, conversationId) => {
							console.log("Store preview message:", {
								message,
								conversationId,
								experienceId: user?.experienceId,
								timestamp: new Date().toISOString(),
							});
						}}
						onBack={() => {
							console.log("🏪 [STORE PREVIEW] Back to SeasonalStore");
							setCurrentView("store");
						}}
						onLiveFunnelLoaded={(funnel) => {
							console.log("🏪 [STORE PREVIEW] Live funnel loaded:", funnel);
							setSelectedFunnel(funnel);
						}}
						onEditMerchant={() => {
							console.log("🏪 [STORE PREVIEW] onEditMerchant called");
							console.log("🏪 [STORE PREVIEW] selectedFunnel:", selectedFunnel);
							console.log("🏪 [STORE PREVIEW] hasValidFlow:", selectedFunnel ? hasValidFlow(selectedFunnel) : false);
							if (selectedFunnel && hasValidFlow(selectedFunnel)) {
								console.log("🏪 [STORE PREVIEW] Navigating to funnel builder for editing:", selectedFunnel.id);
								setCurrentView("funnelBuilder");
							} else {
								console.log("🏪 [STORE PREVIEW] No valid funnel to edit");
							}
						}}
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
					{!isRenaming && !isCreatingNewFunnel && (
					<AdminSidebar
						currentView={currentView}
						onViewChange={handleViewChange}
						onLibraryIconClick={handleLibraryIconClick}
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
							<AdminHeader 
								onAddFunnel={handleCreateNewFunnelInline}
								funnelCount={funnels.length}
								maxFunnels={GLOBAL_LIMITS.FUNNELS}
							/>

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
								onGoToLibrary={handleGoToLibrary}
								isRenaming={isRenaming}
								setIsRenaming={setIsRenaming}
								isCreatingNewFunnel={isCreatingNewFunnel}
								setIsCreatingNewFunnel={setIsCreatingNewFunnel}
								isDeleting={isDeleting}
								newFunnelName={newFunnelName}
								setNewFunnelName={setNewFunnelName}
								funnelToDelete={funnelToDelete}
								isDeleteDialogOpen={isDeleteDialogOpen}
								isFunnelNameAvailable={isFunnelNameAvailable}
								user={user}
								/>
							</div>

							{/* Modals */}
							<DeleteFunnelModal
								isOpen={isDeleteDialogOpen}
								onOpenChange={setIsDeleteDialogOpen}
								funnelToDelete={funnelToDelete}
								onConfirmDelete={handleConfirmDelete}
								isDeleting={isDeleting}
							/>
							<OfflineConfirmationModal
								isOpen={offlineConfirmation}
								onClose={closeOfflineConfirmation}
								onConfirm={handleTakeFunnelOffline}
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
