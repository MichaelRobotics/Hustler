"use client";

import React, { useState, useEffect } from "react";
import { Text } from "frosted-ui";

// Add custom shimmer animation
const shimmerKeyframes = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

// Inject the keyframes into the document
if (typeof document !== 'undefined') {
	const style = document.createElement('style');
	style.textContent = shimmerKeyframes;
	document.head.appendChild(style);
}

interface FunnelProgressBarProps {
	currentStage: string;
	stages: Array<{
		name: string;
		blockIds: string[];
	}>;
	onStageUpdate?: (newStage: string) => void;
}

export const FunnelProgressBar: React.FC<FunnelProgressBarProps> = ({
	currentStage,
	stages,
	onStageUpdate,
}) => {
	// Define stage order with simple, clear names
	const stageOrder = [
		{ key: "TRANSITION", name: "Getting Started" },
		{ key: "WELCOME", name: "Welcome" },
		{ key: "VALUE_DELIVERY", name: "Value Delivery" },
		{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
		{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
		{ key: "OFFER", name: "Offer" },
	];

	// State for current stage (can be updated via WebSocket)
	const [activeStage, setActiveStage] = useState(currentStage);

	// Update active stage when prop changes
	useEffect(() => {
		setActiveStage(currentStage);
	}, [currentStage]);

	// Listen for WebSocket stage updates
	useEffect(() => {
		const handleStageUpdate = (event: CustomEvent) => {
			const { newStage } = event.detail;
			if (newStage && newStage !== activeStage) {
				setActiveStage(newStage);
				onStageUpdate?.(newStage);
			}
		};

		// Listen for custom stage update events
		window.addEventListener('funnel-stage-update', handleStageUpdate as EventListener);
		
		return () => {
			window.removeEventListener('funnel-stage-update', handleStageUpdate as EventListener);
		};
	}, [activeStage, onStageUpdate]);

	// Find current stage index
	const currentStageIndex = stageOrder.findIndex(stage => stage.key === activeStage);
	
	// Filter stages that exist in the funnel
	const availableStages = stageOrder.filter(stage => 
		stages.some(s => s.name === stage.key)
	);

	// Calculate progress percentage
	const progressPercentage = availableStages.length > 0 
		? ((currentStageIndex + 1) / availableStages.length) * 100 
		: 0;

	// Get stage display name
	const getStageDisplayName = (stageKey: string) => {
		const stage = stageOrder.find(s => s.key === stageKey);
		return stage?.name || "Unknown";
	};

	// Function to scroll to offer button with better detection
	const scrollToOffer = () => {
		// Look for offer button with more specific selectors
		const selectors = [
			'[data-href*="app="]', // Affiliate links
			'.animated-gold-button', // Gold offer buttons
			'[class*="Get Started"]', // Get Started buttons
			'[class*="Claim"]', // Claim buttons
			'button[class*="gold"]', // Gold buttons
			'a[href*="app="]', // Affiliate links
			'[class*="offer-button"]', // Offer buttons
			'[class*="cta"]', // Call-to-action buttons
		];
		
		let offerButton = null;
		for (const selector of selectors) {
			offerButton = document.querySelector(selector);
			if (offerButton) break;
		}
		
		if (offerButton) {
			offerButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else {
			// Fallback: scroll to bottom of chat
			window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
		}
	};

	return (
		<div className="w-full border-b border-gray-200 dark:border-gray-700 px-4 py-3">
			<div className="max-w-6xl mx-auto">
				{/* Desktop-optimized Progress Header */}
				<div className="flex items-center justify-between mb-4">
					<Text size="3" weight="medium" className="text-gray-900 dark:text-white">
						{progressPercentage >= 100 ? "Complete" : getStageDisplayName(activeStage)}
					</Text>
					<Text size="3" weight="semi-bold" className="text-violet-600 dark:text-violet-400">
						{Math.round(progressPercentage)}%
					</Text>
				</div>

				{/* Desktop-optimized Progress Bar */}
				<div className="relative w-full">
					{/* Background Track - Thicker for desktop */}
					<div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 md:h-4">
						<div
							className={`h-3 md:h-4 rounded-full transition-all duration-500 ease-out ${
								progressPercentage >= 100 
									? 'bg-gradient-to-r from-green-500 to-emerald-500' 
									: 'bg-gradient-to-r from-violet-500 to-purple-500'
							}`}
							style={{ width: `${progressPercentage}%` }}
						/>
					</div>


					{/* Completion Button - Centered with Faded Background */}
					{progressPercentage >= 100 && (
						<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
							{/* Faded Background Line */}
							<div className="absolute inset-0 flex items-center">
								<div className="w-full h-px bg-gray-200 dark:bg-gray-600 opacity-50"></div>
							</div>
							
							{/* Desktop-optimized button */}
							<button
								onClick={scrollToOffer}
								className="relative inline-flex items-center justify-center px-4 py-1.5 md:px-6 md:py-2 text-xs md:text-sm font-medium text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-full shadow-md hover:shadow-lg active:scale-95 overflow-hidden group"
							>
								{/* Animated background overlay */}
								<span className="absolute inset-0 w-full h-full bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
								
								{/* Shimmer effect */}
								<span className="absolute inset-0 -top-1 -left-1 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></span>
								
								{/* Content */}
								<span className="relative flex items-center space-x-1.5 md:space-x-2 z-10">
									<span>✨</span>
									<span>Get Exclusive Access</span>
								</span>
								
								{/* Glow effect */}
								<span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default FunnelProgressBar;
