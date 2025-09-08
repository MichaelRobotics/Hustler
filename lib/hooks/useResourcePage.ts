import { useCallback, useMemo, useState } from "react";
import { type Funnel, Resource } from "../types/resource";

export const useResourcePage = (
	funnel: Funnel,
	onUpdateFunnel: (updatedFunnel: Funnel) => void,
	removeResourceFromFunnel: (
		funnelId: string,
		resourceId: string,
	) => Promise<void>,
) => {
	// Delete confirmation state
	const [deleteConfirmation, setDeleteConfirmation] = useState<{
		show: boolean;
		resourceId: string | null;
		resourceName: string;
	}>({
		show: false,
		resourceId: null,
		resourceName: "",
	});

	// Removing state for instant feedback
	const [removingResourceId, setRemovingResourceId] = useState<string | null>(
		null,
	);

	// Offline confirmation state
	const [offlineConfirmation, setOfflineConfirmation] = useState(false);

	// Get current funnel resources
	const currentResources = useMemo(
		() => funnel.resources || [],
		[funnel.resources],
	);

	const handleDeleteResource = useCallback(
		(resourceId: string, resourceName: string) => {
			setDeleteConfirmation({
				show: true,
				resourceId,
				resourceName,
			});
		},
		[],
	);

	const confirmDelete = useCallback(async () => {
		if (deleteConfirmation.resourceId) {
			// Close dialog instantly
			setDeleteConfirmation({
				show: false,
				resourceId: null,
				resourceName: "",
			});

			// Set removing state
			setRemovingResourceId(deleteConfirmation.resourceId);

			try {
				await removeResourceFromFunnel(
					funnel.id,
					deleteConfirmation.resourceId,
				);
			} catch (err) {
				console.error("Error removing resource from funnel:", err);
				// Fallback to local state update if API fails
				const updatedResources = currentResources.filter(
					(r) => r.id !== deleteConfirmation.resourceId,
				);
				const updatedFunnel = { ...funnel, resources: updatedResources };
				onUpdateFunnel(updatedFunnel);
			} finally {
				// Clear removing state
				setRemovingResourceId(null);
			}
		}
	}, [
		deleteConfirmation.resourceId,
		funnel.id,
		removeResourceFromFunnel,
		currentResources,
		funnel,
		onUpdateFunnel,
	]);

	const cancelDelete = useCallback(() => {
		setDeleteConfirmation({ show: false, resourceId: null, resourceName: "" });
	}, []);

	const openOfflineConfirmation = useCallback(() => {
		setOfflineConfirmation(true);
	}, []);

	const closeOfflineConfirmation = useCallback(() => {
		setOfflineConfirmation(false);
	}, []);

	const takeFunnelOffline = useCallback(() => {
		const updatedFunnel = { ...funnel, isDeployed: false };
		onUpdateFunnel(updatedFunnel);
		setOfflineConfirmation(false);
	}, [funnel, onUpdateFunnel]);

	return {
		// State
		deleteConfirmation,
		removingResourceId,
		offlineConfirmation,
		currentResources,

		// Actions
		handleDeleteResource,
		confirmDelete,
		cancelDelete,
		openOfflineConfirmation,
		closeOfflineConfirmation,
		takeFunnelOffline,
	};
};
