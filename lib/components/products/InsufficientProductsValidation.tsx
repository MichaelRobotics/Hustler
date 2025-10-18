import { Heading, Text } from "frosted-ui";
import { AlertTriangle, DollarSign, Gift, CheckCircle } from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import type { Funnel } from "../../types/resource";
import { validateFunnelProducts } from "../../helpers/funnel-product-validation";

interface InsufficientProductsValidationProps {
	funnel?: Funnel;
	allResources?: any[];
	onHighlightCards?: (highlightedCards: string[]) => void;
	onCreateAssetsStateChange?: (showCreateAssets: boolean) => void;
}

export const InsufficientProductsValidation: React.FC<InsufficientProductsValidationProps> = ({ funnel, allResources, onHighlightCards, onCreateAssetsStateChange }) => {
	const [showProgress, setShowProgress] = useState(false);
	const [digitalAssetsCount, setDigitalAssetsCount] = useState(0);
	const [giftAssetsCount, setGiftAssetsCount] = useState(0);
	const [isAnimating, setIsAnimating] = useState(false);
	const [showCreateAssets, setShowCreateAssets] = useState(false);
	const [totalAvailableCards, setTotalAvailableCards] = useState(0);
	const [availableGiftCards, setAvailableGiftCards] = useState(0);

	// Calculate current counts and available cards
	useEffect(() => {
		if (funnel && allResources) {
			const resources = funnel.resources || [];
			const totalCount = resources.length;
			const freeCount = resources.filter(r => r.category === "FREE_VALUE").length;
			
			// Calculate available cards from global library
			const totalAvailable = allResources.length;
			const availableGifts = allResources.filter(r => r.category === "FREE_VALUE").length;
			const availablePaid = allResources.filter(r => r.category === "PAID").length;
			
			setTotalAvailableCards(totalAvailable);
			setAvailableGiftCards(availableGifts);
			
			// Check if counts actually changed to trigger animation
			const digitalChanged = totalCount !== digitalAssetsCount;
			const giftChanged = freeCount !== giftAssetsCount;
			
			setDigitalAssetsCount(totalCount);
			setGiftAssetsCount(freeCount);
			
			// Trigger animation when counts change (not just on completion)
			if (digitalChanged || giftChanged) {
				setIsAnimating(true);
				setTimeout(() => setIsAnimating(false), 1000);
			}
			
			// Determine which scenario to show
			const shouldShowCreateAssets = totalAvailable < 3 || availableGifts === 0;
			setShowCreateAssets(shouldShowCreateAssets);
		}
	}, [funnel, allResources, digitalAssetsCount, giftAssetsCount]);

	// Notify parent when showCreateAssets state changes
	useEffect(() => {
		if (onCreateAssetsStateChange) {
			onCreateAssetsStateChange(showCreateAssets);
		}
	}, [showCreateAssets, onCreateAssetsStateChange]);

	// Trigger highlighting when switching from "Create" to "Add to Merchant"
	useEffect(() => {
		if (!showCreateAssets && showProgress && onHighlightCards && allResources) {
			console.log('🎯 Transitioning from Create to Add to Merchant - triggering highlighting');
			
			// Get available resources
			const paidResources = allResources.filter(r => r.category === "PAID");
			const giftResources = allResources.filter(r => r.category === "FREE_VALUE");
			console.log('💰 Paid resources found:', paidResources.length);
			console.log('🎁 Gift resources found:', giftResources.length);
			
			// Highlight ALL "Paid" cards from global library
			const highlightedCards: string[] = [];
			highlightedCards.push(...paidResources.map(r => r.id));
			
			// Determine how many gift cards to highlight
			let giftCardsToHighlight = 0;
			
			if (paidResources.length >= 2) {
				// If 2+ paid cards → highlight exactly 1 gift card
				giftCardsToHighlight = 1;
				console.log('🎯 2+ paid cards found, highlighting 1 gift card');
			} else {
				// If fewer than 2 paid cards → highlight enough to reach 3 total
				giftCardsToHighlight = 3 - paidResources.length;
				console.log('🎯 Fewer than 2 paid cards, highlighting', giftCardsToHighlight, 'gift cards to reach 3 total');
			}
			
			// If we need gift cards and have them available
			if (giftCardsToHighlight > 0 && giftResources.length > 0) {
				console.log('🎁 Need to highlight', giftCardsToHighlight, 'gift cards');
				
				// Sort gift resources by priority for selection
				const sortedGifts = [...giftResources].sort((a, b) => {
					// Priority 1: "Discord"
					const aIsDiscord = a.name.toLowerCase().includes("discord");
					const bIsDiscord = b.name.toLowerCase().includes("discord");
					if (aIsDiscord && !bIsDiscord) return -1;
					if (!aIsDiscord && bIsDiscord) return 1;
					
					// Priority 2: Other keywords
					const keywords = ["chat", "forum", "ai", "course", "files", "sell", "merch", "voice", "call", "livestreaming", "content", "clip", "trading", "bounties"];
					const aHasKeyword = keywords.some(keyword => a.name.toLowerCase().includes(keyword));
					const bHasKeyword = keywords.some(keyword => b.name.toLowerCase().includes(keyword));
					if (aHasKeyword && !bHasKeyword) return -1;
					if (!aHasKeyword && bHasKeyword) return 1;
					
					// Priority 3: Alphabetical
					return a.name.localeCompare(b.name);
				});
				
				// Select the needed number of gift cards
				const selectedGifts = sortedGifts.slice(0, giftCardsToHighlight);
				console.log('🎁 Selected gift cards:', selectedGifts.map(g => g.name));
				highlightedCards.push(...selectedGifts.map(g => g.id));
			}
			
			console.log('✨ Highlighting cards after transition:', highlightedCards);
			// Trigger highlighting
			onHighlightCards(highlightedCards);
		}
	}, [showCreateAssets, showProgress]); // Removed onHighlightCards and allResources from dependencies

	// Check if requirements are satisfied
	const digitalAssetsComplete = digitalAssetsCount >= 3;
	const giftAssetsComplete = giftAssetsCount >= 1;
	const allComplete = digitalAssetsComplete && giftAssetsComplete;

	// Determine icon for Digital Assets based on resource types
	const getDigitalAssetsIcon = () => {
		if (funnel?.resources) {
			const hasPaidAssets = funnel.resources.some(r => r.category === "PAID");
			const hasGiftAssets = funnel.resources.some(r => r.category === "FREE_VALUE");
			
			// Show both icons to represent that Digital Assets can be either type
			return (
				<div className="flex items-center gap-1">
					<DollarSign size={18} className="text-orange-600 dark:text-orange-400" />
					<span className="text-gray-400 dark:text-gray-500">/</span>
					<Gift size={18} className="text-green-600 dark:text-green-400" />
				</div>
			);
		}
		// Default to both icons when no resources
		return (
			<div className="flex items-center gap-1">
				<DollarSign size={18} className="text-orange-600 dark:text-orange-400" />
				<span className="text-gray-400 dark:text-gray-500">/</span>
				<Gift size={18} className="text-green-600 dark:text-green-400" />
			</div>
		);
	};

	// Don't show if all requirements are met
	if (allComplete) {
		return null;
	}

	const getValidationMessage = () => {
		// Always show validation (no product type checks)
		return {
			title: "Add digital assets Merchant will learn to sell.",
			message: "Add Gifts Merchant will use to increase the chance of a sale!",
			icon: null, // No icon - will use dollar button instead
			iconBg: "from-orange-100/80 to-red-100/60 dark:from-orange-900/40 dark:to-red-900/30",
			iconBorder: "border-orange-200/50 dark:border-orange-700/30"
		};
	};

	const validation = getValidationMessage();
	if (!validation) return null;

	// Handle dollar button click - show progress display and highlight cards
	const handleDollarButtonClick = () => {
		console.log('🎯 Dollar button clicked!');
		setShowProgress(true);
		
		// If we should show create assets scenario, don't highlight cards
		if (showCreateAssets) {
			console.log('🎯 Showing create assets scenario - no highlighting');
			return;
		}
		
		// Highlight cards based on requirements
		if (onHighlightCards && allResources) {
			console.log('📚 All resources:', allResources.length);
			const highlightedCards: string[] = [];
			
			// Get available resources
			const paidResources = allResources.filter(r => r.category === "PAID");
			const giftResources = allResources.filter(r => r.category === "FREE_VALUE");
			console.log('💰 Paid resources found:', paidResources.length);
			console.log('🎁 Gift resources found:', giftResources.length);
			
			// Highlight ALL "Paid" cards from global library
			highlightedCards.push(...paidResources.map(r => r.id));
			
			// Determine how many gift cards to highlight
			let giftCardsToHighlight = 0;
			
			if (paidResources.length >= 2) {
				// If 2+ paid cards → highlight exactly 1 gift card
				giftCardsToHighlight = 1;
				console.log('🎯 2+ paid cards found, highlighting 1 gift card');
			} else {
				// If fewer than 2 paid cards → highlight enough to reach 3 total
				giftCardsToHighlight = 3 - paidResources.length;
				console.log('🎯 Fewer than 2 paid cards, highlighting', giftCardsToHighlight, 'gift cards to reach 3 total');
			}
			
			// If we need gift cards and have them available
			if (giftCardsToHighlight > 0 && giftResources.length > 0) {
				console.log('🎁 Need to highlight', giftCardsToHighlight, 'gift cards');
				
				// Sort gift resources by priority for selection
				const sortedGifts = [...giftResources].sort((a, b) => {
					// Priority 1: "Discord"
					const aIsDiscord = a.name.toLowerCase().includes("discord");
					const bIsDiscord = b.name.toLowerCase().includes("discord");
					if (aIsDiscord && !bIsDiscord) return -1;
					if (!aIsDiscord && bIsDiscord) return 1;
					
					// Priority 2: Other keywords
					const keywords = ["chat", "forum", "ai", "course", "files", "sell", "merch", "voice", "call", "livestreaming", "content", "clip", "trading", "bounties"];
					const aHasKeyword = keywords.some(keyword => a.name.toLowerCase().includes(keyword));
					const bHasKeyword = keywords.some(keyword => b.name.toLowerCase().includes(keyword));
					if (aHasKeyword && !bHasKeyword) return -1;
					if (!aHasKeyword && bHasKeyword) return 1;
					
					// Priority 3: Alphabetical
					return a.name.localeCompare(b.name);
				});
				
				// Select the needed number of gift cards
				const selectedGifts = sortedGifts.slice(0, giftCardsToHighlight);
				console.log('🎁 Selected gift cards:', selectedGifts.map(g => g.name));
				highlightedCards.push(...selectedGifts.map(g => g.id));
			}
			
		console.log('✨ Highlighting cards:', highlightedCards);
		// Trigger highlighting
		onHighlightCards(highlightedCards);
		
		// Small timeout to let user read the information, then scroll to nearest highlighted card
		setTimeout(() => {
			// Find the first highlighted card and scroll to it
			if (highlightedCards.length > 0) {
				const firstHighlightedCard = document.querySelector(`[data-resource-id="${highlightedCards[0]}"]`);
				if (firstHighlightedCard) {
					console.log('🎯 Scrolling to first highlighted card:', highlightedCards[0]);
					firstHighlightedCard.scrollIntoView({ 
						behavior: 'smooth', 
						block: 'center',
						inline: 'center'
					});
				} else {
					console.log('❌ Could not find highlighted card element');
					// Fallback: scroll to products section
					const productsSection = document.querySelector('[data-products-section]');
					if (productsSection) {
						productsSection.scrollIntoView({ behavior: 'smooth' });
					}
				}
			} else {
				console.log('❌ No highlighted cards to scroll to');
				// Fallback: scroll to products section
			const productsSection = document.querySelector('[data-products-section]');
			if (productsSection) {
				productsSection.scrollIntoView({ behavior: 'smooth' });
			}
			}
		}, 4000); // 4 second timeout to let user read the information
	} else {
		console.log('❌ Missing onHighlightCards or allResources');
		}
	};

	return (
		<div className="mt-8 mb-8">
			<div className="text-center py-12 px-8 bg-gradient-to-br from-orange-50/30 via-orange-100/20 to-gray-200/15 dark:from-orange-900/40 dark:via-gray-800/30 dark:to-gray-700/20 rounded-2xl border border-orange-200/30 dark:border-gray-600/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
				{/* Subtle animated background elements */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(251,146,60,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_20%_80%,rgba(251,146,60,0.12)_0%,transparent_50%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(156,163,175,0.08)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(156,163,175,0.12)_0%,transparent_50%)]" />

				<div className="relative z-10">
					{!showProgress ? (
						<>
					{/* Dollar Button - Same animation as Generate button */}
					<div className="mb-6">
						<button
							onClick={handleDollarButtonClick}
							className="group w-24 h-24 mx-auto mb-4 p-5 rounded-full bg-gradient-to-br from-orange-300/20 to-gray-400/25 dark:from-gray-700/30 dark:to-gray-600/25 border border-orange-200/30 dark:border-gray-500/30 flex items-center justify-center shadow-lg shadow-orange-500/15 transition-all duration-500 ease-out animate-pulse hover:scale-110 hover:shadow-2xl hover:shadow-orange-500/25 cursor-pointer"
						>
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 dark:from-orange-300 dark:via-orange-400 dark:to-orange-500 animate-ping group-hover:animate-none group-hover:scale-125 group-hover:shadow-lg group-hover:shadow-orange-400/50 transition-all duration-300 relative">
								<DollarSign
									className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
									strokeWidth={2.5}
								/>
							</div>
						</button>
					</div>

					<div className="mb-8">
						<Heading size="5" weight="bold" className="mb-3 text-orange-600 dark:text-orange-400">
							{validation.title}
						</Heading>
						<Text
							size="2"
							color="gray"
							className="text-muted-foreground max-w-md mx-auto leading-relaxed whitespace-pre-line"
						>
							{validation.message}
						</Text>
					</div>
						</>
					) : showCreateAssets ? (
						<>
							{/* Create Digital Assets Scenario */}
							<div className="mb-8">
								<Heading size="5" weight="bold" className="mb-32 pb-8 text-orange-600 dark:text-orange-400 text-center">
									Create at Least Digital Assets:
								</Heading>
								
								{/* Create Assets Progress Display */}
								<div className="space-y-2 max-w-md mx-auto">
									{/* Total Digital Assets Progress */}
									<div className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all duration-500 ${
										totalAvailableCards >= 3 
											? 'border-green-500/80 bg-gradient-to-br from-green-50/95 via-green-100/80 to-green-200/60 dark:from-green-900/50 dark:via-green-800/40 dark:to-green-700/30 shadow-lg shadow-green-500/20' 
											: 'border-orange-200/50 bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-orange-200/40 dark:from-orange-900/40 dark:via-orange-800/30 dark:to-orange-700/20'
									} ${isAnimating ? 'animate-pulse' : ''}`}>
										<div className="flex items-center gap-3">
											<div className="flex items-center justify-center transition-all duration-300">
												{totalAvailableCards >= 3 ? (
													<CheckCircle size={20} className="animate-bounce text-green-600 dark:text-green-400" />
												) : (
													<div className="flex items-center gap-1">
														<DollarSign size={18} className="text-orange-600 dark:text-orange-400" />
														<span className="text-gray-400 dark:text-gray-500">/</span>
														<Gift size={18} className="text-green-600 dark:text-green-400" />
													</div>
												)}
											</div>
											<div className="text-center">
												<div className="font-semibold text-gray-900 dark:text-white">
													{totalAvailableCards}/3 Total
												</div>
											</div>
											{totalAvailableCards >= 3 && (
												<div className="text-green-600 dark:text-green-400 font-bold animate-pulse">
													✓
												</div>
											)}
										</div>
									</div>

									{/* Where text */}
									<div className="text-center py-2">
										<Text size="2" color="gray" className="text-gray-500 dark:text-gray-400">
											Where
										</Text>
									</div>

									{/* Gift Assets Progress */}
									<div className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all duration-500 ${
										availableGiftCards >= 1 
											? 'border-green-500/80 bg-gradient-to-br from-green-50/95 via-green-100/80 to-green-200/60 dark:from-green-900/50 dark:via-green-800/40 dark:to-green-700/30 shadow-lg shadow-green-500/20' 
											: 'border-orange-200/50 bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-orange-200/40 dark:from-orange-900/40 dark:via-orange-800/30 dark:to-orange-700/20'
									} ${isAnimating ? 'animate-pulse' : ''}`}>
										<div className="flex items-center gap-3">
											<div className="flex items-center justify-center transition-all duration-300">
												{availableGiftCards >= 1 ? (
													<CheckCircle size={20} className="animate-bounce text-green-600 dark:text-green-400" />
												) : (
													<Gift size={20} className="text-green-600 dark:text-green-400" />
												)}
											</div>
											<div className="text-center">
												<div className="font-semibold text-gray-900 dark:text-white">
													{availableGiftCards}/1 is Gift
												</div>
											</div>
											{availableGiftCards >= 1 && (
												<div className="text-green-600 dark:text-green-400 font-bold animate-pulse">
													✓
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</>
					) : (
						<>
							{/* Add to Merchant Progress Display */}
							<div className="mb-8">
								<Heading size="5" weight="bold" className="mb-32 pb-8 text-orange-600 dark:text-orange-400 text-center">
									Add to Merchant at least:
								</Heading>
								
								{/* Progress Display */}
								<div className="space-y-2 max-w-md mx-auto">
									{/* Digital Assets Progress */}
									<div className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all duration-500 ${
										digitalAssetsComplete 
											? 'border-green-500/80 bg-gradient-to-br from-green-50/95 via-green-100/80 to-green-200/60 dark:from-green-900/50 dark:via-green-800/40 dark:to-green-700/30 shadow-lg shadow-green-500/20' 
											: 'border-orange-200/50 bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-orange-200/40 dark:from-orange-900/40 dark:via-orange-800/30 dark:to-orange-700/20'
									} ${isAnimating ? 'animate-pulse' : ''}`}>
										<div className="flex items-center gap-3">
											<div className="flex items-center justify-center transition-all duration-300">
												{digitalAssetsComplete ? (
													<CheckCircle size={20} className="animate-bounce text-green-600 dark:text-green-400" />
												) : (
													getDigitalAssetsIcon()
												)}
											</div>
											<div className="text-center">
												<div className="font-semibold text-gray-900 dark:text-white">
													{digitalAssetsCount}/3 Digital Assets!
												</div>
											</div>
											{digitalAssetsComplete && (
												<div className="text-green-600 dark:text-green-400 font-bold animate-pulse">
													✓
												</div>
											)}
										</div>
									</div>

									{/* Where text */}
									<div className="text-center py-2">
										<Text size="2" color="gray" className="text-gray-500 dark:text-gray-400">
											Where
										</Text>
									</div>

									{/* Gift Assets Progress */}
									<div className={`flex items-center justify-center p-4 rounded-xl border-2 transition-all duration-500 ${
										giftAssetsComplete 
											? 'border-green-500/80 bg-gradient-to-br from-green-50/95 via-green-100/80 to-green-200/60 dark:from-green-900/50 dark:via-green-800/40 dark:to-green-700/30 shadow-lg shadow-green-500/20' 
											: 'border-orange-200/50 bg-gradient-to-br from-orange-50/80 via-orange-100/60 to-orange-200/40 dark:from-orange-900/40 dark:via-orange-800/30 dark:to-orange-700/20'
									} ${isAnimating ? 'animate-pulse' : ''}`}>
										<div className="flex items-center gap-3">
											<div className="flex items-center justify-center transition-all duration-300">
												{giftAssetsComplete ? (
													<CheckCircle size={20} className="animate-bounce text-green-600 dark:text-green-400" />
												) : (
													<Gift size={20} className="text-green-600 dark:text-green-400" />
												)}
											</div>
											<div className="text-center">
												<div className="font-semibold text-gray-900 dark:text-white">
													{giftAssetsCount}/1 Gift Digital Asset!
												</div>
											</div>
											{giftAssetsComplete && (
												<div className="text-green-600 dark:text-green-400 font-bold animate-pulse">
													✓
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};
