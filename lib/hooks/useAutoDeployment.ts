"use client";

import { useCallback, useState } from "react";
import { apiPost } from "../utils/api-client";
import type { Funnel } from "../types/resource";
import type { AuthenticatedUser } from "../types/user";

interface UseAutoDeploymentProps {
	user: AuthenticatedUser | null;
	onFunnelUpdate: (updatedFunnel: Funnel) => void;
	onFunnelsUpdate: (updateFn: (prevFunnels: Funnel[]) => Funnel[]) => void;
	onNavigateToAnalytics?: (funnel: Funnel) => void;
}

interface UseAutoDeploymentReturn {
	handleAutoDeploy: (funnel: Funnel) => Promise<void>;
	isDeploying: boolean;
	deploymentLog: string[];
	deploymentAction: 'deploy' | 'undeploy';
}

/**
 * Custom hook for handling auto-deployment of single funnels
 * 
 * Provides a clean interface for deploying funnels automatically
 * when generation completes, with proper error handling and state updates.
 */
export function useAutoDeployment({
	user,
	onFunnelUpdate,
	onFunnelsUpdate,
	onNavigateToAnalytics,
}: UseAutoDeploymentProps): UseAutoDeploymentReturn {
	
	// Deployment state management
	const [isDeploying, setIsDeploying] = useState(false);
	const [deploymentLog, setDeploymentLog] = useState<string[]>([]);
	const [deploymentAction, setDeploymentAction] = useState<'deploy' | 'undeploy'>('deploy');
	
	const handleAutoDeploy = useCallback(async (funnel: Funnel) => {
		try {
			console.log("🚀 [AUTO-DEPLOY] Starting auto-deployment for funnel:", funnel.id);
			
			// Set deployment state
			setDeploymentAction('deploy');
			setIsDeploying(true);
			setDeploymentLog(["Auto-deployment initiated..."]);
			
			// Validate user context
			if (!user?.experienceId) {
				throw new Error("Experience ID is required for deployment");
			}

			// Update deployment log
			setDeploymentLog(prev => [...prev, "Validating deployment..."]);

			// Make deployment API call
			const response = await apiPost(
				`/api/funnels/${funnel.id}/deploy`, 
				{}, 
				user.experienceId
			);
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			if (!result.success) {
				throw new Error(result.message || 'Deployment failed');
			}

			// Update deployment log with success
			setDeploymentLog(prev => [
				...prev,
				"✅ Deployment successful!",
				"🎉 Funnel is now live and receiving customers!",
			]);

			// Update the funnel with deployment data
			const deployedFunnel = result.data;
			const updatedFunnel = {
				...funnel,
				...deployedFunnel,
				isDeployed: true,
				wasEverDeployed: true,
			};

			// Update state through callbacks
			onFunnelUpdate(updatedFunnel);
			onFunnelsUpdate(prevFunnels => 
				prevFunnels.map(f => f.id === updatedFunnel.id ? updatedFunnel : f)
			);

			console.log("✅ [AUTO-DEPLOY] Funnel deployed successfully:", updatedFunnel.id);
			
			// Small delay to show success message before closing modal
			setTimeout(() => {
				setIsDeploying(false);
			}, 2000);
			
			// Navigate to Analytics view for the deployed funnel
			if (onNavigateToAnalytics) {
				console.log("📊 [AUTO-DEPLOY] Navigating to Analytics view for deployed funnel:", updatedFunnel.id);
				onNavigateToAnalytics(updatedFunnel);
			}
			
		} catch (error) {
			console.error("❌ [AUTO-DEPLOY] Failed to deploy funnel:", error);
			
			// Update deployment log with error
			setDeploymentLog(prev => [
				...prev,
				"❌ Deployment failed",
				`Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			]);
			
			// Close modal after showing error
			setTimeout(() => {
				setIsDeploying(false);
			}, 3000);
			
			// Show user-friendly notification about deployment failure
			const showNotification = (message: string) => {
				const notification = document.createElement("div");
				notification.className =
					"fixed top-4 right-4 z-50 px-4 py-3 bg-orange-500 text-white rounded-lg border border-orange-600 shadow-lg backdrop-blur-sm text-sm font-medium max-w-xs";
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
				}, 8000);
			};

			showNotification("Generation completed! Please manually deploy the funnel from the Funnel Builder.");
			
			// Re-throw error for any additional error handling
			throw error;
		}
	}, [user?.experienceId, onFunnelUpdate, onFunnelsUpdate, onNavigateToAnalytics]);

	return {
		handleAutoDeploy,
		isDeploying,
		deploymentLog,
		deploymentAction,
	};
}
