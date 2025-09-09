"use client";

import React from "react";

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
}

export const useFunnelDeployment = (
	currentFunnel: Funnel,
	onUpdate: (funnel: Funnel) => void,
	enableCalculationsForGoLive?: () => void,
) => {
	const [isDeploying, setIsDeploying] = React.useState(false);
	const [deploymentLog, setDeploymentLog] = React.useState<string[]>([]);
	const [deploymentValidation, setDeploymentValidation] =
		React.useState<DeploymentValidation | null>(null);
	const deployIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

	// Validate that assigned products match generated funnel products
	const validateDeployment = (): {
		isValid: boolean;
		message: string;
		missingProducts: string[];
		extraProducts: string[];
	} => {
		if (!currentFunnel.flow || !currentFunnel.resources) {
			return {
				isValid: false,
				message:
					"Funnel must be generated and have assigned products to deploy.",
				missingProducts: [],
				extraProducts: [],
			};
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

	const handleDeploy = () => {
		// Enable calculations for Go Live action
		if (enableCalculationsForGoLive) {
			enableCalculationsForGoLive();
		}

		// Validate deployment before proceeding
		const validation = validateDeployment();
		if (!validation.isValid) {
			setDeploymentValidation(validation);
			return;
		}

		setIsDeploying(true);
		setDeploymentLog(["Deployment initiated..."]);

		const steps = [
			"Connecting to server...",
			"Authenticating...",
			"Uploading funnel data...",
			"Validating funnel structure...",
			"Provisioning resources...",
			"Finalizing deployment...",
			"✅ Deployment successful!",
		];

		let stepIndex = 0;
		deployIntervalRef.current = setInterval(() => {
			if (stepIndex < steps.length) {
				setDeploymentLog((prev) => [...prev, steps[stepIndex]]);
				stepIndex++;
			} else {
				if (deployIntervalRef.current) {
					clearInterval(deployIntervalRef.current);
				}
				setTimeout(() => {
					setIsDeploying(false);
					// Mark funnel as deployed and set wasEverDeployed
					const updatedFunnel = {
						...currentFunnel,
						isDeployed: true,
						wasEverDeployed: true,
					};

					// Debug logging
					console.log("Deployment completed, updating funnel:", updatedFunnel);

					// Update parent component with deployed funnel
					onUpdate(updatedFunnel);

					// Add deployment success to log
					setDeploymentLog((prev) => [
						...prev,
						"🎉 Deployment completed! Navigating to analytics...",
					]);

					// Small delay to ensure state is updated before navigation
					setTimeout(() => {
						// The parent component will handle navigation to analytics
					}, 500);
				}, 2000); // Keep deployment message for 2s
			}
		}, 700);
	};

	React.useEffect(() => {
		// Cleanup interval on component unmount
		return () => {
			if (deployIntervalRef.current) {
				clearInterval(deployIntervalRef.current);
			}
		};
	}, []);

	return {
		isDeploying,
		deploymentLog,
		deploymentValidation,
		setDeploymentValidation,
		handleDeploy,
		validateDeployment,
	};
};
