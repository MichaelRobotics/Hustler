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
	whopProductId?: string; // Discovery page product ID
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
		whopProductId: currentFunnel.whopProductId,
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
			whopProductId: currentFunnel.whopProductId,
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

		// Check if any other funnel is currently live for the same product
		// Only check if this funnel has a whopProductId (product-specific validation)
		if (currentFunnel.whopProductId) {
			console.log(`🔍 [FRONTEND VALIDATION] Checking for live funnels for product: ${currentFunnel.whopProductId}`);
			console.log(`🔍 [FRONTEND VALIDATION] Funnel ID: ${currentFunnel.id}`);
			console.log(`🔍 [FRONTEND VALIDATION] User experience ID: ${user?.experienceId}`);
			
			try {
				// Check if user context is available
				if (!user?.experienceId) {
					console.error(`🔍 [FRONTEND VALIDATION] No experience ID found for user`);
					throw new Error("Experience ID is required");
				}

				// Use product-specific live funnel check
				const apiUrl = `/api/funnels/check-live?excludeFunnelId=${currentFunnel.id}&productId=${currentFunnel.whopProductId}`;
				console.log(`🔍 [FRONTEND VALIDATION] API URL: ${apiUrl}`);
				console.log(`🔍 [FRONTEND VALIDATION] Experience ID being sent: ${user.experienceId}`);
				
				const response = await apiGet(apiUrl, user.experienceId);
				console.log(`🔍 [FRONTEND VALIDATION] Response status: ${response.status}, ok: ${response.ok}`);
				
				if (response.ok) {
					const data = await response.json();
					console.log(`🔍 [FRONTEND VALIDATION] Response data:`, JSON.stringify(data, null, 2));
					
					if (data.success && data.data.hasLiveFunnel) {
						console.log(`🔍 [FRONTEND VALIDATION] Found live funnel: ${data.data.liveFunnelName}`);
						// Return early - don't continue with product validation if there's a live funnel conflict
						return {
							isValid: false,
							message: `Funnel "${data.data.liveFunnelName}" is currently live for this product.`,
							missingProducts: [],
							extraProducts: [],
							liveFunnelName: data.data.liveFunnelName,
						};
					} else {
						console.log(`🔍 [FRONTEND VALIDATION] No live funnel found, continuing with deployment`);
					}
				} else {
					console.error(`🔍 [FRONTEND VALIDATION] API call failed with status: ${response.status}`);
					const errorText = await response.text();
					console.error(`🔍 [FRONTEND VALIDATION] Error response:`, errorText);
					// If API call fails, we should be more cautious and let backend handle it
					console.warn(`🔍 [FRONTEND VALIDATION] API validation failed, backend will perform final validation`);
				}
			} catch (error) {
				console.error(`🔍 [FRONTEND VALIDATION] Error checking for live funnels:`, error);
				// Continue with deployment if check fails - backend will catch conflicts
				console.warn(`🔍 [FRONTEND VALIDATION] Frontend validation failed, backend will perform final validation`);
			}
		} else {
			console.log(`🔍 [FRONTEND VALIDATION] No whopProductId found for funnel: ${currentFunnel.id}`);
			console.log(`🔍 [FRONTEND VALIDATION] This means the funnel was not created with a product association`);
			console.log(`🔍 [FRONTEND VALIDATION] Frontend validation will skip live funnel check and proceed with deployment`);
			console.log(`🔍 [FRONTEND VALIDATION] Backend will catch the live funnel conflict and throw an error`);
		}

		// Extract product names from the generated funnel flow (what the AI actually offers)
		const generatedProductNames = new Set<string>();

		// Look for blocks in both OFFER and VALUE_DELIVERY stages using resourceName field
		Object.values(currentFunnel.flow.blocks).forEach((block: any) => {
			// Check if this block is in the OFFER or VALUE_DELIVERY stage and has a resourceName field
			const isRelevantBlock = currentFunnel.flow.stages.some(
				(stage: any) =>
					(stage.name === "OFFER" || stage.name === "VALUE_DELIVERY") && 
					stage.blockIds.includes(block.id),
			);
			if (
				isRelevantBlock &&
				block.resourceName &&
				typeof block.resourceName === "string"
			) {
				generatedProductNames.add(block.resourceName);
			}
		});

		// Check which generated products are missing from "Assigned Products"
		const missingProducts: string[] = [];
		const extraProducts: string[] = [];

		// Find missing products (generated but not assigned)
		generatedProductNames.forEach((productName) => {
			const isAssigned = currentFunnel.resources?.some(
				(resource) => resource.name.toLowerCase() === productName.toLowerCase(),
			);
			if (!isAssigned) {
				missingProducts.push(productName);
			}
		});

		// Find extra products (assigned but not generated)
		currentFunnel.resources?.forEach((resource) => {
			const isGenerated = Array.from(generatedProductNames).some(
				(generatedName) =>
					generatedName.toLowerCase() === resource.name.toLowerCase(),
			);
			if (!isGenerated) {
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
			whopProductId: currentFunnel.whopProductId,
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
			
			// Update deployment log with error
			setDeploymentLog((prev) => [
				...prev,
				"❌ Deployment failed!",
				`Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			]);

			// Parse error message to extract live funnel name if it's a live funnel conflict
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const liveFunnelMatch = errorMessage.match(/Funnel "([^"]+)" is currently live/);
			const liveFunnelName = liveFunnelMatch ? liveFunnelMatch[1] : undefined;

			// Show error in validation modal
			setDeploymentValidation({
				isValid: false,
				message: errorMessage,
				missingProducts: [],
				extraProducts: [],
				liveFunnelName: liveFunnelName, // Set liveFunnelName if it's a live funnel conflict
			});

			// Stop deployment after showing error
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
