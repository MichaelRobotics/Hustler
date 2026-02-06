"use client";

import React from "react";
import { apiGet, apiPost } from "../utils/api-client";

interface Funnel {
	id: string;
	name: string;
	flow?: any;
	isDeployed?: boolean;
	wasEverDeployed?: boolean;
	resources?: Resource[];
}

interface Resource {
	id: string;
	type: "AFFILIATE" | "MY_PRODUCTS" | "CONTENT" | "TOOL";
	name: string;
	link: string;
	promoCode?: string;
	category?: string;
}

interface DeploymentValidation {
	isValid: boolean;
	message: string;
	missingProducts: string[];
	extraProducts: string[];
	liveFunnelName?: string;
}

export const useFunnelDeployment = (
	currentFunnel: Funnel,
	onUpdate: (funnel: Funnel) => void,
	enableCalculationsForGoLive?: () => void,
	user?: { experienceId?: string } | null,
) => {
	console.log(`🔍 [USE FUNNEL DEPLOYMENT] Hook initialized with funnel:`, {
		id: currentFunnel.id,
		name: currentFunnel.name,
		userExperienceId: user?.experienceId
	});
	const [isDeploying, setIsDeploying] = React.useState(false);
	const [deploymentLog, setDeploymentLog] = React.useState<string[]>([]);
	const [deploymentValidation, setDeploymentValidation] =
		React.useState<DeploymentValidation | null>(null);
	const [deploymentAction, setDeploymentAction] = React.useState<'deploy' | 'undeploy'>('deploy');
	const deployIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

	// Validate that assigned products match generated funnel products
	const validateDeployment = async (): Promise<{
		isValid: boolean;
		message: string;
		missingProducts: string[];
		extraProducts: string[];
		liveFunnelName?: string;
	}> => {
		console.log(`🔍 [VALIDATE DEPLOYMENT] Starting validation with funnel:`, {
			id: currentFunnel.id,
			name: currentFunnel.name,
			hasFlow: !!currentFunnel.flow,
			hasResources: !!currentFunnel.resources,
			userExperienceId: user?.experienceId
		});
		console.log(`🔍 [VALIDATE DEPLOYMENT] Full funnel object:`, currentFunnel);

		if (!currentFunnel.flow || !currentFunnel.resources) {
			console.log(`🔍 [VALIDATE DEPLOYMENT] Funnel missing flow or resources`);
			return {
				isValid: false,
				message:
					"Funnel must be generated and have assigned products to deploy.",
				missingProducts: [],
				extraProducts: [],
			};
		}

		// Frontend live funnel check removed - backend validation is sufficient and more reliable

		// Extract product names and resource IDs from the funnel flow (AI-generated and user-selected in cards / Merchant Market Stall)
		const generatedProductNames = new Set<string>();
		const generatedResourceIds = new Set<string>();

		// Look for blocks in product-card stages (OFFER, VALUE_DELIVERY, etc.) using resourceName and resourceId
		Object.values(currentFunnel.flow.blocks).forEach((block: any) => {
			const isRelevantBlock = currentFunnel.flow.stages.some(
				(stage: any) =>
					stage.cardType === "product" && stage.blockIds.includes(block.id),
			);
			if (!isRelevantBlock) return;
			if (block.resourceName && typeof block.resourceName === "string") {
				generatedProductNames.add(block.resourceName);
			}
			// Products selected in cards (Merchant Market Stall) are stored by resourceId
			if (block.resourceId && typeof block.resourceId === "string") {
				generatedResourceIds.add(block.resourceId);
				const res = currentFunnel.resources?.find((r) => r.id === block.resourceId);
				if (res?.name) generatedProductNames.add(res.name);
			}
		});

		// Check which generated products are missing from "Library"
		const missingProducts: string[] = [];
		const extraProducts: string[] = [];

		// Find missing products (in flow but not in Library)
		generatedProductNames.forEach((productName) => {
			const isAssigned = currentFunnel.resources?.some(
				(resource) => resource.name.toLowerCase() === productName.toLowerCase(),
			);
			if (!isAssigned) {
				missingProducts.push(productName);
			}
		});

		// Find extra products (in Library but not used in funnel). Don't flag resources that are selected in cards (resourceId in flow).
		currentFunnel.resources?.forEach((resource) => {
			const isGeneratedByName = Array.from(generatedProductNames).some(
				(n) => n.toLowerCase() === resource.name.toLowerCase(),
			);
			const isGeneratedById = generatedResourceIds.has(resource.id);
			if (!isGeneratedByName && !isGeneratedById) {
				extraProducts.push(resource.id);
			}
		});

		// Simple validation - just check if there's a mismatch
		if (missingProducts.length > 0 || extraProducts.length > 0) {
			return {
				isValid: false,
				message: "Product mismatch detected",
				missingProducts,
				extraProducts,
			};
		}

		return {
			isValid: true,
			message: "",
			missingProducts: [],
			extraProducts: [],
		};
	};

	const handleDeploy = async () => {
		console.log(`🔍 [HANDLE DEPLOY] ===== FUNCTION CALLED =====`);
		console.log(`🔍 [HANDLE DEPLOY] Starting deployment for funnel:`, {
			id: currentFunnel.id,
			name: currentFunnel.name,
			hasFlow: !!currentFunnel.flow,
			hasResources: !!currentFunnel.resources,
			userExperienceId: user?.experienceId
		});

		// Enable calculations for Go Live action
		if (enableCalculationsForGoLive) {
			enableCalculationsForGoLive();
		}

		// Validate deployment before proceeding
		console.log(`🔍 [HANDLE DEPLOY] Running validation...`);
		const validation = await validateDeployment();
		console.log(`🔍 [HANDLE DEPLOY] Validation result:`, validation);
		
		if (!validation.isValid) {
			console.log(`🔍 [HANDLE DEPLOY] Validation failed, showing validation modal`);
			setDeploymentValidation(validation);
			return;
		}

		console.log(`🔍 [HANDLE DEPLOY] Validation passed, proceeding with deployment`);

		setDeploymentAction('deploy');
		setIsDeploying(true);
		setDeploymentLog(["Deployment initiated..."]);

		try {
			// Check if user context is available
			if (!user?.experienceId) {
				throw new Error("Experience ID is required");
			}

			// Make actual API call to deploy funnel
			const response = await apiPost(`/api/funnels/${currentFunnel.id}/deploy`, {}, user.experienceId);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			
			if (!result.success) {
				throw new Error(result.message || 'Deployment failed');
			}

			// Update deployment log with success
			setDeploymentLog((prev) => [
				...prev,
				"✅ Deployment successful!",
				"🎉 Funnel is now live and receiving customers!",
			]);

			// Update the funnel with the deployed data from backend
			const deployedFunnel = result.data;
			const updatedFunnel = {
				...currentFunnel,
				...deployedFunnel,
				isDeployed: true,
				wasEverDeployed: true,
			};

			// Debug logging
			console.log("Deployment completed, updating funnel:", updatedFunnel);

			// Update parent component with deployed funnel
			onUpdate(updatedFunnel);

			// Small delay to show success message before closing
			setTimeout(() => {
				setIsDeploying(false);
			}, 2000);

		} catch (error) {
			console.error("Deployment failed:", error);
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			setDeploymentLog((prev) => [
				...prev,
				"❌ Deployment failed!",
				`Error: ${errorMessage}`,
			]);
			setDeploymentValidation({
				isValid: false,
				message: errorMessage,
				missingProducts: [],
				extraProducts: [],
			});
			setTimeout(() => {
				setIsDeploying(false);
			}, 3000);
		}
	};

	const handleUndeploy = async () => {
		setDeploymentAction('undeploy');
		setIsDeploying(true);
		setDeploymentLog(["Taking funnel offline..."]);

		try {
			// Check if user context is available
			if (!user?.experienceId) {
				throw new Error("Experience ID is required");
			}

			// Make actual API call to undeploy funnel
			const response = await apiPost(`/api/funnels/${currentFunnel.id}/undeploy`, {}, user.experienceId);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const result = await response.json();
			
			if (!result.success) {
				throw new Error(result.message || 'Undeployment failed');
			}

			// Update deployment log with success
			setDeploymentLog((prev) => [
				...prev,
				"✅ Funnel taken offline successfully!",
				"🔴 Funnel is no longer receiving customers.",
			]);

			// Update the funnel with the undeployed data from backend
			const undeployedFunnel = result.data;
			const updatedFunnel = {
				...currentFunnel,
				...undeployedFunnel,
				isDeployed: false,
			};

			// Debug logging
			console.log("Undeployment completed, updating funnel:", updatedFunnel);

			// Update parent component with undeployed funnel
			onUpdate(updatedFunnel);

			// Small delay to show success message before closing
			setTimeout(() => {
				setIsDeploying(false);
			}, 2000);

		} catch (error) {
			console.error("Undeployment failed:", error);
			
			// Update deployment log with error
			setDeploymentLog((prev) => [
				...prev,
				"❌ Failed to take funnel offline!",
				`Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			]);

			// Show error in validation modal
			setDeploymentValidation({
				isValid: false,
				message: `Failed to take funnel offline: ${error instanceof Error ? error.message : 'Unknown error'}`,
				missingProducts: [],
				extraProducts: [],
			});

			// Stop deployment after showing error
			setTimeout(() => {
				setIsDeploying(false);
			}, 3000);
		}
	};

	React.useEffect(() => {
		// Cleanup interval on component unmount
		return () => {
			if (deployIntervalRef.current) {
				clearInterval(deployIntervalRef.current);
			}
		};
	}, [user?.experienceId]);

	return {
		isDeploying,
		deploymentLog,
		deploymentValidation,
		deploymentAction,
		setDeploymentValidation,
		handleDeploy,
		handleUndeploy,
		validateDeployment,
	};
};
