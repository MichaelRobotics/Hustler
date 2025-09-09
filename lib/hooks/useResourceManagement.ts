"use client";

import type { Resource } from "@/lib/types/resource";
import { useEffect, useState } from "react";
import { canAssignResource } from "../helpers/product-limits";
import { deduplicatedFetch } from "../utils/requestDeduplication";

interface Funnel {
	id: string;
	name: string;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: Resource[];
	sends?: number;
	flow?: any;
	generationStatus?: "idle" | "generating" | "completed" | "failed";
	generationError?: string;
	lastGeneratedAt?: number;
}

export function useResourceManagement() {
	const [libraryContext, setLibraryContext] = useState<"global" | "funnel">(
		"global",
	);
	const [selectedFunnelForLibrary, setSelectedFunnelForLibrary] =
		useState<Funnel | null>(null);
	const [allResources, setAllResources] = useState<Resource[]>([]);
	const [resourcesLoading, setResourcesLoading] = useState(true);
	const [resourcesError, setResourcesError] = useState<string | null>(null);

	// Fetch resources from API - load one by one for better performance
	const fetchResources = async () => {
		try {
			setResourcesLoading(true);
			setResourcesError(null);
			
			// Load resources with limit to prevent loading all at once
			const response = await deduplicatedFetch("/api/resources?limit=20");

			if (!response.ok) {
				throw new Error(`Failed to fetch resources: ${response.statusText}`);
			}

			const data = await response.json();
			if (data.success && data.data) {
				setAllResources(data.data.resources || []);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to fetch resources";
			setResourcesError(errorMessage);
			console.error("Error fetching resources:", err);
		} finally {
			setResourcesLoading(false);
		}
	};

	// Load resources on component mount
	useEffect(() => {
		fetchResources();

		// Cleanup function to prevent memory leaks
		return () => {
			setResourcesLoading(false);
			setResourcesError(null);
		};
	}, []);

	const handleOpenResourceLibrary = (selectedFunnel: Funnel | null) => {
		setLibraryContext("funnel");
		setSelectedFunnelForLibrary(selectedFunnel);
		return "resourceLibrary";
	};

	const handleAddToFunnel = async (
		resource: Resource,
		selectedFunnel: Funnel,
		funnels: Funnel[],
		setFunnels: (funnels: Funnel[]) => void,
		setSelectedFunnel: (funnel: Funnel | null) => void,
	): Promise<void> => {
		if (selectedFunnel) {
			// Check if we can assign this resource (not at limit)
			if (!canAssignResource(selectedFunnel, resource)) {
				throw new Error(`Cannot assign ${resource.category === "PAID" ? "paid" : "free"} product: limit reached (max 5 per category)`);
			}

			try {
				const response = await deduplicatedFetch(
					`/api/funnels/${selectedFunnel.id}/resources`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ resourceId: resource.id }),
					},
				);

				if (!response.ok) {
					throw new Error(
						`Failed to add resource to funnel: ${response.statusText}`,
					);
				}

				const data = await response.json();
				if (data.success && data.data) {
					const updatedFunnel = data.data;
					setSelectedFunnel(updatedFunnel);
					setFunnels(
						funnels.map((f) => (f.id === updatedFunnel.id ? updatedFunnel : f)),
					);
				}
			} catch (err) {
				console.error("Error adding resource to funnel:", err);
				// Fallback to local state update if API fails
				const updatedFunnel = {
					...selectedFunnel,
					resources: [...(selectedFunnel.resources || []), resource],
				};
				setSelectedFunnel(updatedFunnel);
				setFunnels(
					funnels.map((f) => (f.id === updatedFunnel.id ? updatedFunnel : f)),
				);
				throw err; // Re-throw to let the component handle the error
			}
		}
	};

	const handleBackToDashboard = () => {
		return "dashboard";
	};

	return {
		// State
		libraryContext,
		selectedFunnelForLibrary,
		allResources,
		resourcesLoading,
		resourcesError,

		// Setters
		setLibraryContext,
		setSelectedFunnelForLibrary,
		setAllResources,

		// Actions
		handleOpenResourceLibrary,
		handleAddToFunnel,
		handleBackToDashboard,
		fetchResources,
	};
}
