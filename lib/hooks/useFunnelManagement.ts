"use client";

import { hasValidFlow } from "@/lib/helpers/funnel-validation";
import { useCallback, useEffect, useState } from "react";
import { useOptimisticUpdates } from "../utils/optimisticUpdates";
import { deduplicatedFetch } from "../utils/requestDeduplication";
import { robustDelete } from "../utils/robustFetch";
import { apiGet, apiPost, apiPut, apiDelete } from "../utils/api-client";

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

// Unified interface for AI/API communication - consistent across all components
interface AIResource {
	id: string;
	name: string;
	link: string;
	type: "AFFILIATE" | "MY_PRODUCTS";
	price: "PAID" | "FREE_VALUE";
	code: string; // promoCode converted to code for consistency
}

export function useFunnelManagement(user?: { experienceId?: string } | null) {
	const experienceId = user?.experienceId;
	
	const [funnels, setFunnels] = useState<Funnel[]>([]);
	const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [newFunnelName, setNewFunnelName] = useState("");
	const [funnelToDelete, setFunnelToDelete] = useState<Funnel | null>(null);
	const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	// Product selection modal state
	const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
	const [discoveryProducts, setDiscoveryProducts] = useState<any[]>([]);
	const [productsLoading, setProductsLoading] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

	// Use regular fetch since authentication is handled server-side

	// Helper function to check if a funnel name is available
	// Normalizes names by removing extra spaces and converting to lowercase for comparison
	const isFunnelNameAvailable = useCallback(
		(name: string, currentId?: string): boolean => {
			if (!name.trim()) return true;
			
			// Normalize the input name: trim, replace multiple spaces with single space, lowercase
			const normalizedInputName = name.trim().replace(/\s+/g, ' ').toLowerCase();
			
			return !funnels.some(
				(funnel) => {
					// Normalize existing funnel name the same way
					const normalizedExistingName = funnel.name.trim().replace(/\s+/g, ' ').toLowerCase();
					return funnel.id !== currentId && normalizedExistingName === normalizedInputName;
				}
			);
		},
		[funnels],
	);

	// Fetch funnels from API - load one by one for better performance
	const fetchFunnels = async () => {
		try {
			setIsLoading(true);
			setError(null);
			
			const experienceId = user?.experienceId;
			if (!experienceId) {
				throw new Error("Experience ID is required");
			}
			
			// Load funnels with limit to prevent loading all at once
			const response = await apiGet("/api/funnels?limit=20", experienceId);

			if (!response.ok) {
				throw new Error(`Failed to fetch funnels: ${response.statusText}`);
			}

			const data = await response.json();
			setFunnels(data.data.funnels || []);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to fetch funnels";
			setError(errorMessage);
			console.error("Error fetching funnels:", err);
		} finally {
			setIsLoading(false);
		}
	};

	// Load funnels on component mount
	useEffect(() => {
		if (user?.experienceId) {
			fetchFunnels();
		}

		// Cleanup function to prevent memory leaks
		return () => {
			// Clear any pending operations or subscriptions
			setError(null);
			setIsLoading(false);
		};
	}, [user?.experienceId]);

	const handleAddFunnel = async () => {
		if (newFunnelName.trim()) {
			// Check if name is available
			if (!isFunnelNameAvailable(newFunnelName)) {
				setError("Funnel name already exists. Please choose a different name.");
				return;
			}

			try {
				setError(null);
				const response = await apiPost("/api/funnels", {
					name: newFunnelName.trim()
				}, experienceId);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.message || "Failed to create funnel");
				}

				const data = await response.json();
				const newFunnel = data.data;

				setFunnels([...funnels, newFunnel]);
				setNewFunnelName("");
				setIsAddDialogOpen(false);

				setSelectedFunnel(newFunnel);
				return newFunnel; // Return for navigation
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to create funnel";
				setError(errorMessage);
				console.error("Error creating funnel:", err);
			}
		}
	};

	const handleDeleteFunnel = (funnelId: string | null) => {
		if (funnelId) {
			const funnel = funnels.find((f) => f.id === funnelId);
			if (funnel) {
				setFunnelToDelete(funnel);
				setIsDeleteDialogOpen(true);
			}
		}
	};

	const handleConfirmDelete = async () => {
		if (funnelToDelete) {
			try {
				setError(null);
				setIsDeleting(true);
				
				// Use API client for proper authentication
				const response = await apiDelete(`/api/funnels/${funnelToDelete.id}`, experienceId);

				// Parse response data
				const data = await response.json();
				
				if (!data.success) {
					throw new Error(data.message || "Failed to delete funnel");
				}

				// Update UI state
				setFunnels(funnels.filter((f) => f.id !== funnelToDelete.id));
				setFunnelToDelete(null);
				setIsDeleteDialogOpen(false);
				
				console.log("Funnel deleted successfully:", funnelToDelete.name);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to delete funnel";
				setError(errorMessage);
				console.error("Error deleting funnel:", err);
				
				// Keep the funnel in the list if deletion failed
				// The user can try again
			} finally {
				setIsDeleting(false);
			}
		}
	};

	const handleEditFunnel = (funnel: Funnel) => {
		if (hasValidFlow(funnel)) {
			setSelectedFunnel(funnel);
			return "funnelBuilder";
		} else {
			setSelectedFunnel(funnel);
			return "resources";
		}
	};

	const handleDeployFunnel = (funnelId: string) => {
		setFunnels(
			funnels.map((f) =>
				f.id === funnelId
					? {
							...f,
							isDeployed: !f.isDeployed,
							wasEverDeployed: f.wasEverDeployed || !f.isDeployed, // Set to true if deploying
						}
					: f,
			),
		);
	};

	const handleDuplicateFunnel = (funnel: Funnel) => {
		const duplicatedFunnel = {
			...funnel,
			id: Date.now().toString(),
			name: `${funnel.name} (Copy)`,
			isDeployed: false,
			wasEverDeployed: false, // Reset for new copy
			sends: 0,
			generationStatus: "idle" as const,
			generationError: undefined,
			lastGeneratedAt: undefined,
		};
		setFunnels([...funnels, duplicatedFunnel]);
	};

	const handleSaveFunnelName = async (funnelId: string, newName: string) => {
		// Check if name is available (excluding current funnel)
		if (!isFunnelNameAvailable(newName, funnelId)) {
			setError("Funnel name already exists. Please choose a different name.");
			return;
		}

		try {
			setError(null);
			const response = await apiPut(`/api/funnels/${funnelId}`, {
				name: newName
			}, experienceId);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to update funnel");
			}

			const data = await response.json();
			const updatedFunnel = data.data;

			setFunnels(funnels.map((f) => (f.id === funnelId ? updatedFunnel : f)));
			setEditingFunnelId(null);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to update funnel";
			setError(errorMessage);
			console.error("Error updating funnel:", err);
		}
	};

	const onFunnelClick = (funnel: Funnel) => {
		if (!hasValidFlow(funnel)) {
			setSelectedFunnel(funnel);
			return "resources";
		} else {
			setSelectedFunnel(funnel);
			return "analytics";
		}
	};

	const handleManageResources = (funnel: Funnel) => {
		setSelectedFunnel(funnel);
		return "resources";
	};

	// Per-funnel generation state management
	const updateFunnelGenerationStatus = (
		funnelId: string,
		status: Funnel["generationStatus"],
		error?: string,
	) => {
		updateFunnelForGeneration(funnelId, {
			generationStatus: status,
			generationError: error,
			lastGeneratedAt: status === "completed" ? Date.now() : undefined,
		});
	};

	// Check if a specific funnel is generating (no global state dependency)
	const isFunnelGenerating = (funnelId: string) => {
		const funnel = funnels.find((f) => f.id === funnelId);
		return funnel?.generationStatus === "generating";
	};

	// Check if any funnel is currently generating
	const isAnyFunnelGenerating = () => {
		return funnels.some((f) => f.generationStatus === "generating");
	};

	// Special function for generation updates that NEVER changes selectedFunnel
	const updateFunnelForGeneration = (
		funnelId: string,
		updates: Partial<Funnel>,
	) => {
		setFunnels((prevFunnels) =>
			prevFunnels.map((f) => (f.id === funnelId ? { ...f, ...updates } : f)),
		);
	};

	// Handle generation completion (when database save is successful)
	const handleGenerationComplete = useCallback(async (funnelId: string) => {
		try {
			// Update generation status to completed
			updateFunnelGenerationStatus(funnelId, "completed");
			console.log(
				`Generation completed and saved to database for funnel ${funnelId}`,
			);

			// Note: Credit deduction is now handled server-side in the generation API
			// No need to deduct credits here as it's already done securely on the server
		} catch (error) {
			console.error("Error in generation completion handler:", error);
			// Still mark as completed since the funnel was saved successfully
			updateFunnelGenerationStatus(funnelId, "completed");
		}
	}, []);

	// Handle generation error (when database save fails)
	const handleGenerationError = useCallback(
		(funnelId: string, error: Error) => {
			updateFunnelGenerationStatus(funnelId, "failed", error.message);
			console.error(
				`Generation failed to save to database for funnel ${funnelId}:`,
				error,
			);
		},
		[],
	);

	// Improved generation function with per-funnel state
	const handleGlobalGeneration = async (funnelId: string) => {
		if (!funnelId || funnelId.trim() === "") return;

		const targetFunnel = funnels.find((f) => f.id === funnelId);
		if (!targetFunnel) return;

		if (targetFunnel.generationStatus === "generating" && !targetFunnel.flow)
			return;

		if (targetFunnel.generationStatus === "generating") return;

		// CREDIT VALIDATION - Check credits BEFORE any other checks
		try {
			const experienceId = user?.experienceId;
			if (!experienceId) {
				throw new Error("Experience ID is required");
			}

			// Call dedicated credit validation endpoint
			const creditValidationResponse = await apiPost("/api/validate-credits", {
				experienceId: experienceId,
			}, experienceId);

			if (!creditValidationResponse.ok) {
				const creditError = await creditValidationResponse.json();
				
				// Show specific credit error notification
				if (typeof window !== "undefined") {
					const showNotification = (message: string) => {
						const notification = document.createElement("div");
						notification.className =
							"fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
						notification.textContent = message;

						const closeBtn = document.createElement("button");
						closeBtn.innerHTML = "×";
						closeBtn.className =
							"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
						closeBtn.onclick = () => notification.remove();
						notification.appendChild(closeBtn);

						document.body.appendChild(notification);

						setTimeout(() => {
							if (notification.parentNode) {
								notification.remove();
							}
						}, 5000);
					};

					showNotification(creditError.message || "Insufficient credits to generate funnel");
				}
				return;
			}
		} catch (error) {
			console.error("Credit validation failed:", error);
			// Show error notification
			if (typeof window !== "undefined") {
				const showNotification = (message: string) => {
					const notification = document.createElement("div");
					notification.className =
						"fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
					notification.textContent = message;

					const closeBtn = document.createElement("button");
					closeBtn.innerHTML = "×";
					closeBtn.className =
						"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
					closeBtn.onclick = () => notification.remove();
					notification.appendChild(closeBtn);

					document.body.appendChild(notification);

					setTimeout(() => {
						if (notification.parentNode) {
							notification.remove();
						}
					}, 5000);
				};

				showNotification("Failed to validate credits. Please try again.");
			}
			return;
		}

		if (isAnyFunnelGenerating()) {
			// Show a short, Whop-native notification instead of alert
			if (typeof window !== "undefined") {
				// Use a simple toast-like notification that's more Whop-native
				const showNotification = (message: string) => {
					// Create a temporary notification element
					const notification = document.createElement("div");
					notification.className =
						"fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
					notification.textContent = message;

					// Add close button
					const closeBtn = document.createElement("button");
					closeBtn.innerHTML = "×";
					closeBtn.className =
						"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
					closeBtn.onclick = () => notification.remove();
					notification.appendChild(closeBtn);

					document.body.appendChild(notification);

					// Auto-remove after 3 seconds
					setTimeout(() => {
						if (notification.parentNode) {
							notification.remove();
						}
					}, 3000);
				};

				showNotification("Another generation running");
			}
			return;
		}

		// Update this funnel's generation status (atomic update to prevent race conditions)
		updateFunnelGenerationStatus(funnelId, "generating");

		try {
			const currentFunnelResources = targetFunnel.resources || [];

			if (currentFunnelResources.length === 0) {
				// Show a short, Whop-native notification instead of alert
				if (typeof window !== "undefined") {
					const showNotification = (message: string) => {
						const notification = document.createElement("div");
						notification.className =
							"fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
						notification.textContent = message;

						const closeBtn = document.createElement("button");
						closeBtn.innerHTML = "×";
						closeBtn.className =
							"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
						closeBtn.onclick = () => notification.remove();
						notification.appendChild(closeBtn);

						document.body.appendChild(notification);

						setTimeout(() => {
							if (notification.parentNode) {
								notification.remove();
							}
						}, 3000);
					};

					showNotification("Add resources first");
				}
				updateFunnelGenerationStatus(
					funnelId,
					"failed",
					"No resources assigned",
				);
				return;
			}

			const resourcesForAI: AIResource[] = currentFunnelResources.map(
				(resource) => ({
					id: resource.id,
					type: resource.type,
					name: resource.name,
					link: resource.link,
					code: resource.promoCode || "",
					price: resource.category, // Use the actual category field
				}),
			);

			// Call the AI generation API with funnelId and experienceId
			const experienceId = user?.experienceId;
			if (!experienceId) {
				throw new Error("Experience ID is required");
			}
			
			const response = await apiPost("/api/generate-funnel", {
				resources: resourcesForAI,
				funnelId: funnelId,
				experienceId: experienceId,
			}, experienceId);

			let result;
			try {
				result = await response.json();
			} catch (parseError) {
				throw new Error("Invalid response format from API");
			}

			if (!response.ok) {
				// Handle insufficient credits error specifically
				if (result.error === "INSUFFICIENT_CREDITS") {
					throw new Error(
						"Insufficient credits to generate funnel. Please purchase more credits.",
					);
				}
				throw new Error(result.message || "Failed to generate funnel");
			}

			const flowData = result.data || result;

			// Validate the flow data structure
			if (!flowData || typeof flowData !== "object") {
				throw new Error("Invalid flow data structure received from API");
			}

			if (!flowData.stages || !flowData.blocks || !flowData.startBlockId) {
				throw new Error(
					"Flow data missing required properties (stages, blocks, or startBlockId)",
				);
			}

			// Update local state with the generated flow
			// The flow is already saved to database by the API
			const updatedFunnel = {
				...targetFunnel,
				flow: flowData,
				generationStatus: "completed" as const,
			};
			updateFunnelForGeneration(funnelId, updatedFunnel);

			// Generation is now complete - no need for onGenerationComplete callback
			console.log(
				`Generation completed for funnel ${funnelId} - flow saved to database by API`,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			// Show a short, Whop-native notification instead of alert
			if (typeof window !== "undefined") {
				const showNotification = (message: string) => {
					const notification = document.createElement("div");
					notification.className =
						"fixed top-4 right-4 z-50 px-4 py-3 bg-red-500 text-white rounded-lg border border-red-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
					notification.textContent = message;

					const closeBtn = document.createElement("button");
					closeBtn.innerHTML = "×";
					closeBtn.className =
						"ml-3 text-white/80 hover:text-white transition-colors text-lg font-bold";
					closeBtn.onclick = () => notification.remove();
					notification.appendChild(closeBtn);

					document.body.appendChild(notification);

					setTimeout(() => {
						if (notification.parentNode) {
							notification.remove();
						}
					}, 3000);
				};

				showNotification(errorMessage);
			}
			updateFunnelGenerationStatus(funnelId, "failed", errorMessage);
		}
	};

	const updateFunnel = (funnelId: string, updates: Partial<Funnel>) => {
		setFunnels(
			funnels.map((f) => (f.id === funnelId ? { ...f, ...updates } : f)),
		);
		if (selectedFunnel && selectedFunnel.id === funnelId) {
			setSelectedFunnel({ ...selectedFunnel, ...updates });
		}
	};

	// Remove resource from funnel
	const removeResourceFromFunnel = async (
		funnelId: string,
		resourceId: string,
	) => {
		try {
			const response = await apiDelete(
				`/api/funnels/${funnelId}/resources/${resourceId}`,
				experienceId
			);

			if (!response.ok) {
				throw new Error(
					`Failed to remove resource from funnel: ${response.statusText}`,
				);
			}

			// Update local state to reflect the removal
			const updatedFunnels = funnels.map((f) => {
				if (f.id === funnelId) {
					return {
						...f,
						resources: f.resources?.filter((r) => r.id !== resourceId) || [],
					};
				}
				return f;
			});

			setFunnels(updatedFunnels);

			// Update selected funnel if it's the one being modified
			if (selectedFunnel && selectedFunnel.id === funnelId) {
				const updatedSelectedFunnel = {
					...selectedFunnel,
					resources:
						selectedFunnel.resources?.filter((r) => r.id !== resourceId) || [],
				};
				setSelectedFunnel(updatedSelectedFunnel);
			}
		} catch (err) {
			console.error("Error removing resource from funnel:", err);
			throw err;
		}
	};

	return {
		// State
		funnels,
		selectedFunnel,
		isAddDialogOpen,
		isDeleteDialogOpen,
		newFunnelName,
		funnelToDelete,
		editingFunnelId,
		isLoading,
		isDeleting,
		error,

		// Setters
		setFunnels,
		setSelectedFunnel,
		setIsAddDialogOpen,
		setIsDeleteDialogOpen,
		setNewFunnelName,
		setFunnelToDelete,
		setEditingFunnelId,

		// Actions
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
		fetchFunnels, // Add fetch function for manual refresh
		handleGenerationComplete, // New: callback for generation completion
		handleGenerationError, // New: callback for generation errors
		
		// Utilities
		isFunnelNameAvailable,
		
		// Product selection handlers
		isProductSelectionOpen,
		setIsProductSelectionOpen,
		discoveryProducts,
		setDiscoveryProducts,
		productsLoading,
		setProductsLoading,
		selectedProduct,
		setSelectedProduct,
	};
}
