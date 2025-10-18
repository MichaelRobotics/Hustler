"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import StorePreviewChat from "./StorePreviewChat";
import { apiGet, apiPost } from "../../utils/api-client";
import type { FunnelFlow } from "../../types/funnel";
import { useTheme } from "../common/ThemeProvider";
import { ArrowLeft, Sun, Moon } from "lucide-react";

interface StorePreviewProps {
	experienceId?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
	onBack?: () => void;
	onEditMerchant?: () => void;
	onLiveFunnelLoaded?: (funnel: any) => void;
}

/**
 * --- Store Preview Component ---
 * 
 * Similar to CustomerView but uses PreviewChat instead of UserChat.
 * Shows the current live funnel if available, otherwise shows iframe with topnavbar.
 * Does NOT include the PreviewView topnavbar (back arrow, avatar, "Preview view" indicator, hustler name, theme switch).
 */
const StorePreview: React.FC<StorePreviewProps> = ({
	experienceId,
	onMessageSent,
	onBack,
	onEditMerchant,
	onLiveFunnelLoaded,
}) => {
	const [liveFunnel, setLiveFunnel] = useState<any>(null);
	const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
	const [isFunnelActive, setIsFunnelActive] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [iframeUrl, setIframeUrl] = useState<string>('');
	const [urlLoaded, setUrlLoaded] = useState(false);
	const [iframeLoaded, setIframeLoaded] = useState(false); // Track iframe load completion
	const [overlayTransitioning, setOverlayTransitioning] = useState(false); // Track overlay transition
	
	// View mode state - similar to CustomerView
	type ViewMode = 'iframe-only' | 'chat-only' | 'split-view';
	const [viewMode, setViewMode] = useState<ViewMode>('iframe-only'); // Start with iframe only
	const [isTransitioning, setIsTransitioning] = useState(false); // Track view transitions
	const [isMobile, setIsMobile] = useState(false); // Track mobile view
	const [iframeError, setIframeError] = useState(false); // Track iframe loading errors
	const [showNoFunnelPopup, setShowNoFunnelPopup] = useState(false); // Track no funnel popup
	const [popupShown, setPopupShown] = useState(false); // Track if popup was already shown
	
	// Theme state
	const { appearance, toggleTheme } = useTheme();

	// Function to extract base URL from experience link
	const extractBaseUrl = useCallback((link: string): string => {
		console.log(`[StorePreview] extractBaseUrl called with link:`, link);
		if (!link) {
			console.log(`[StorePreview] No link provided to extractBaseUrl`);
			return '';
		}
		
		try {
			// Remove /joined and everything with upsell and after it
			// Example: https://whop.com/joined/the-main-character-a2c9/upsell-ELPFt5vK9Ezshm/app/
			// Should become: https://whop.com/the-main-character-a2c9/
			
			const url = new URL(link);
			let pathname = url.pathname;
			
			// Remove /joined from the beginning
			if (pathname.startsWith('/joined/')) {
				pathname = pathname.substring(8); // Remove '/joined'
			}
			
			// Ensure pathname starts with /
			if (!pathname.startsWith('/')) {
				pathname = '/' + pathname;
			}
			
			// Find and remove everything from /upsell onwards
			const upsellIndex = pathname.indexOf('/upsell');
			if (upsellIndex !== -1) {
				pathname = pathname.substring(0, upsellIndex);
			}
			
			// Ensure pathname ends with /
			if (!pathname.endsWith('/')) {
				pathname += '/';
			}
			
			const baseUrl = `${url.protocol}//${url.host}${pathname}`;
			console.log(`[StorePreview] Extracted base URL from ${link}: ${baseUrl}`);
			return baseUrl;
		} catch (error) {
			console.error('Error extracting base URL:', error);
			return '';
		}
	}, []);

	// Fetch experience link for iframe URL
	const fetchExperienceLink = useCallback(async () => {
		if (!experienceId) return;
		
		try {
			console.log(`[StorePreview] Fetching experience link for: ${experienceId}`);
			const response = await apiGet(`/api/experience/link?experienceId=${experienceId}`, experienceId);
			if (response.ok) {
				const data = await response.json();
				console.log(`[StorePreview] Experience link response:`, data);
				
				if (data.experience?.link) {
					console.log(`[StorePreview] Found experience link: ${data.experience.link}`);
					const extractedUrl = extractBaseUrl(data.experience.link);
					setIframeUrl(extractedUrl);
					setUrlLoaded(true);
					console.log(`[StorePreview] Set iframe URL from database: ${extractedUrl}`);
				} else {
					console.log(`[StorePreview] No experience link found in response:`, data.experience);
					setUrlLoaded(true); // Mark as loaded even if no link found
				}
			} else {
				console.error(`[StorePreview] Failed to fetch experience link: ${response.status}`);
			}
		} catch (error) {
			console.error("Error fetching experience link:", error);
		}
	}, [experienceId, extractBaseUrl]);

	// Load live funnel
	const loadLiveFunnel = useCallback(async () => {
		if (!experienceId) {
			setError("Experience ID is required");
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			console.log(`[StorePreview] Loading live funnel for experienceId: ${experienceId}`);

			// Use the dedicated live funnel endpoint
			const response = await apiGet(`/api/funnels/live`, experienceId);
			
			console.log(`[StorePreview] API call made with experienceId: ${experienceId}`);
			
			if (response.ok) {
				const data = await response.json();
				console.log(`[StorePreview] Live funnel response:`, data);
				
				if (data.success && data.hasLiveFunnel && data.funnelFlow) {
					// We have a live funnel
					const funnelData = {
						id: data.funnel.id,
						name: data.funnel.name,
						flow: data.funnelFlow,
						isDeployed: data.funnel.isDeployed,
						resources: data.resources || []
					};
					setFunnelFlow(data.funnelFlow);
					setLiveFunnel(funnelData);
					setIsFunnelActive(true);
					
					// Notify parent component about the live funnel
					if (onLiveFunnelLoaded) {
						onLiveFunnelLoaded(funnelData);
					}
					
					console.log(`[StorePreview] ✅ Found live funnel for experience ${experienceId}`);
					console.log(`[StorePreview] Funnel:`, data.funnel);
					console.log(`[StorePreview] Funnel flow:`, data.funnelFlow);
					console.log(`[StorePreview] Resources:`, data.resources);
				} else {
					// No live funnel
					setLiveFunnel(null);
					setFunnelFlow(null);
					setIsFunnelActive(false);
					// Don't show popup immediately - wait for loading to complete
					console.log(`[StorePreview] ❌ No live funnel found for experience ${experienceId}`);
					console.log(`[StorePreview] Response data:`, data);
				}
			} else {
				console.error(`[StorePreview] Failed to check for live funnel: ${response.status}`);
			}
		} catch (err) {
			console.error("Error loading live funnel:", err);
			setError(err instanceof Error ? err.message : "Failed to load live funnel");
		} finally {
			setIsLoading(false);
		}
	}, [experienceId]);

	// Mobile detection
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768); // md breakpoint
		};
		
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// Unified view mode handler with predictable transitions
	const handleViewToggle = useCallback(() => {
		setIsTransitioning(true);
		setViewMode(prev => {
			if (isMobile) {
				// Mobile: Chat icon switches directly to full PreviewChat
				switch (prev) {
					case 'iframe-only': return 'chat-only';        // Direct to full PreviewChat
					case 'chat-only': return 'iframe-only';      // Back to iframe
					default: return 'chat-only';
				}
			} else {
				// Desktop: Only switch between iframe and half view
				switch (prev) {
					case 'iframe-only': return 'split-view';
					case 'split-view': return 'iframe-only';
					default: return 'split-view';
				}
			}
		});
		// Reset transition state after animation completes
		setTimeout(() => setIsTransitioning(false), 300);
	}, [isMobile]);

	// Button click handler for VIP/GIFT buttons - 3-step cycle (2-step on mobile)
	const handleButtonClick = useCallback(() => {
		setIsTransitioning(true);
		const currentMode = viewMode;
		setViewMode(prev => {
			if (isMobile) {
				// Mobile: Skip half view, go directly to full PreviewChat
				switch (prev) {
					case 'iframe-only': return 'chat-only';        // 1st click: full PreviewChat
					case 'chat-only': return 'iframe-only';      // 2nd click: collapse PreviewChat, reveal iframe
					default: return 'chat-only';
				}
			} else {
				// Desktop: Only switch between iframe and half view
				switch (prev) {
					case 'iframe-only': return 'split-view';      // 1st click: half view
					case 'split-view': return 'iframe-only';      // 2nd click: back to iframe
					default: return 'split-view';
				}
			}
		});
		
		// Transition duration - match CSS animation duration
		const transitionDuration = 300;
		setTimeout(() => setIsTransitioning(false), transitionDuration);
	}, [viewMode, isMobile]);

	// Load data on mount
	useEffect(() => {
		loadLiveFunnel();
		fetchExperienceLink();
	}, [loadLiveFunnel, fetchExperienceLink]);

	// Show popup after loading overlay disappears and no funnel is active
	useEffect(() => {
		if (!isLoading && iframeLoaded && !isFunnelActive && !showNoFunnelPopup && !popupShown) {
			// Show popup after loading overlay is completely gone
			setShowNoFunnelPopup(true);
			setPopupShown(true); // Mark as shown to prevent re-appearing
			
			// Auto-hide popup after 5 seconds
			setTimeout(() => {
				setShowNoFunnelPopup(false);
			}, 5000);
		}
	}, [isLoading, iframeLoaded, isFunnelActive, showNoFunnelPopup, popupShown]);

	// Fallback: Remove overlay after 8 seconds regardless of iframe load state
	useEffect(() => {
		const fallbackTimer = setTimeout(() => {
			if (!iframeLoaded) {
				setOverlayTransitioning(true);
				console.log('🎭 Fallback: Starting fast blur transition...');
				
				setTimeout(() => {
					setIframeLoaded(true);
					setOverlayTransitioning(false);
					console.log('🎭 Fallback: Fancy overlay removed after timeout');
				}, 500);
			}
		}, 8000);

		return () => clearTimeout(fallbackTimer);
	}, [iframeLoaded]);

	const handleMessageSentInternal = (message: string, convId?: string) => {
		console.log("Store preview message:", {
			message,
			conversationId: convId,
			experienceId,
			timestamp: new Date().toISOString(),
		});
		if (onMessageSent) {
			onMessageSent(message, convId);
		}
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="h-screen w-full relative">
				{/* Whop Native Loading Overlay - Covers entire StorePreview until iframe loads */}
				<div className="absolute inset-0 z-50 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden">
					{/* Main content */}
					<div className="text-center relative z-10">
						{/* Whop-style loading spinner */}
						<div className="relative mb-6">
							<div className="w-8 h-8 mx-auto relative">
								<div className="absolute inset-0 border-2 border-gray-200 dark:border-gray-700 rounded-full"></div>
								<div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
							</div>
						</div>
						
						{/* Whop-style loading text */}
						<div className="space-y-2">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Calling for Merchant
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Preparing showcase items...
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center max-w-md mx-auto p-6">
					<div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Store</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
					<button
						onClick={loadLiveFunnel}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// Check if we should show PreviewChat (for all PreviewChat stages)
	const shouldShowPreviewChat = true;
	
	// Debug logging
	console.log('[StorePreview] Debug state:', {
		shouldShowPreviewChat,
		funnelFlow: !!funnelFlow,
		isFunnelActive,
		experienceId
	});

	// isFunnelActive is now a state variable

	// Render with view modes like CustomerView
	return (
		<div className="h-screen w-full relative">
			{/* Whop Native Loading Overlay - Covers entire StorePreview until iframe loads */}
			{(!iframeLoaded || overlayTransitioning) && (
				<div className={`absolute inset-0 z-50 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden ${
					overlayTransitioning ? 'transition-all duration-500 filter blur-[20px] opacity-0' : ''
				}`}>
					{/* Main content */}
					<div className="text-center relative z-10">
						{/* Whop-style loading spinner */}
						<div className="relative mb-6">
							<div className="w-8 h-8 mx-auto relative">
								<div className="absolute inset-0 border-2 border-gray-200 dark:border-gray-700 rounded-full"></div>
								<div className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
							</div>
						</div>
						
						{/* Whop-style loading text */}
						<div className="space-y-2">
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Calling for Merchant
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Preparing showcase items...
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Top Navbar - With back arrow and theme switch */}
			<div className="sticky top-0 z-30 flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg">
				<div className="px-4 py-3">
					<div className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									{/* Back Arrow */}
									{onBack && (
										<button
											onClick={onBack}
											className="p-2 rounded-lg touch-manipulation text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-colors duration-200 dark:hover:bg-surface/60"
											style={{ WebkitTapHighlightColor: "transparent" }}
										>
											<ArrowLeft size={20} strokeWidth={2.5} />
										</button>
									)}
								</div>

						{/* Center: CLAIM YOUR GIFT Button - only show if funnel is active */}
						{isFunnelActive && (
							<div className="flex-1 flex justify-center">
								<button
									onClick={handleButtonClick}
									className="relative inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 rounded-full shadow-lg hover:shadow-xl active:scale-95 overflow-hidden group animate-pulse"
									style={{ WebkitTapHighlightColor: "transparent" }}
								>
									{/* Animated background overlay */}
									<span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
									
									{/* Shimmer effect */}
									<span className="absolute inset-0 -top-1 -left-1 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></span>
									
									{/* Content */}
									<span className="relative flex items-center space-x-2 z-10">
										{/* Show HIDE CHAT when PreviewChat is visible (half view or mobile full view) */}
										{(viewMode === 'split-view' || (viewMode === 'chat-only' && isMobile)) ? (
											<>
												{/* Chat Icon with 3 dots for Hide Chat */}
												<div className="w-5 h-5 text-white relative z-10">
													<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
													</svg>
													{/* 3 Dots inside the circle */}
													<div className="absolute inset-0 flex items-center justify-center">
														<div className="flex space-x-0.5">
															<div className="w-0.5 h-0.5 bg-white rounded-full"></div>
															<div className="w-0.5 h-0.5 bg-white rounded-full"></div>
															<div className="w-0.5 h-0.5 bg-white rounded-full"></div>
														</div>
													</div>
												</div>
												<span>HIDE CHAT</span>
											</>
										) : (
											<>
												{/* Gift Icon for default */}
												<svg
													width={20}
													height={20}
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M20 12v10H4V12"/>
													<path d="M2 7h20v5H2z"/>
													<path d="M12 22V7"/>
													<path d="M12 7L7 2l-5 5"/>
												</svg>
												<span>CLAIM YOUR GIFT!</span>
											</>
										)}
									</span>
									
									{/* Glow effect */}
									<span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></span>
								</button>
							</div>
						)}

						{/* Right Side: Theme Toggle Button - Icon Only */}
						<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
							<button
								onClick={toggleTheme}
								className="p-2 rounded-lg touch-manipulation transition-all duration-200 hover:scale-105"
								style={{ WebkitTapHighlightColor: "transparent" }}
								title={
									appearance === "dark"
										? "Switch to light mode"
										: "Switch to dark mode"
								}
							>
								{appearance === "dark" ? (
									<Sun
										size={20}
										className="text-foreground/70 dark:text-foreground/70"
									/>
								) : (
									<Moon
										size={20}
										className="text-foreground/70 dark:text-foreground/70"
									/>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Main Content Area with Toggle Functionality */}
			<div className="h-[calc(100vh-80px)] w-full relative flex flex-col overflow-hidden">
				{/* Iframe Section - Enhanced reveal animation */}
				<div className={`transition-all duration-500 ease-in-out ${
					viewMode === 'iframe-only' ? 'h-full transform scale-y-100 origin-top' :
					viewMode === 'split-view' ? 'h-1/2 transform scale-y-100 origin-top' : 'h-0 overflow-hidden transform scale-y-0 origin-top'
				} ${viewMode === 'iframe-only' ? 'fixed top-0 left-0 w-full h-screen z-10' : 'relative z-0'}`}>
					<div 
						className={`h-full w-full relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 cursor-pointer ${viewMode === 'iframe-only' ? 'h-screen' : ''}`}
						onClick={() => {
							if (viewMode === 'chat-only') {
								setViewMode('split-view');
							}
						}}
					>
						{/* Discovery Page Content - Using Proxy */}
						<div className={`${viewMode === 'iframe-only' ? 'h-screen' : 'h-full'}`}>
							{/* Proxy iframe to bypass same-origin restrictions */}
							{iframeUrl ? (
								<iframe
									src={`/api/proxy/whop?url=${encodeURIComponent(iframeUrl)}`}
									className="w-full h-full border-0"
									title="Store"
									sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-modals allow-downloads"
									loading="lazy"
									referrerPolicy="no-referrer"
									allow="payment; microphone; camera; fullscreen; autoplay; clipboard-write; cross-origin-isolated"
									onLoad={() => {
										console.log('Store page loaded successfully via proxy');
										setIframeError(false);
										
										// Trigger theme switch click after iframe loads
										setTimeout(() => {
											console.log('🎨 Triggering theme switch click...');
											toggleTheme();
										}, 500); // Small delay to ensure iframe is fully loaded
										
										// Start fast blur transition
										setTimeout(() => {
											setOverlayTransitioning(true);
											console.log('🎭 Starting fast blur transition...');
											
											// Complete the transition after blur effect
											setTimeout(() => {
												setIframeLoaded(true);
												setOverlayTransitioning(false);
												console.log('🎭 Fancy overlay removed - content fully revealed');
											}, 500); // Fast 500ms blur transition
										}, 2000); // 2 second delay for content to stabilize
									}}
									onError={(e) => {
										console.log('Store page failed to load:', e);
										setIframeError(true);
									}}
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
									<div className="text-center">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
										<p className="text-gray-600 dark:text-gray-300">Loading store...</p>
									</div>
								</div>
							)}
						</div>

						{/* Chat Icon - Above bottom of iframe page */}
						{viewMode === 'iframe-only' && isFunnelActive && (
							<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
								<button
									onClick={handleViewToggle}
									className="relative w-10 h-10 bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-700 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl active:scale-95 overflow-hidden group"
									title="Switch to Half-and-Half"
									style={{ WebkitTapHighlightColor: "transparent" }}
								>
									{/* Animated background overlay */}
									<span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-600 via-amber-700 to-yellow-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
									
									{/* Shimmer effect */}
									<span className="absolute inset-0 -top-1 -left-1 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></span>
									
									{/* Content */}
									{/* MessageCircle with 3 dots inside */}
									<div className="w-5 h-5 text-white relative z-10">
										<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
										</svg>
										{/* 3 Dots inside the circle */}
										<div className="absolute inset-0 flex items-center justify-center">
											<div className="flex space-x-0.5">
												<div className="w-0.5 h-0.5 bg-white rounded-full"></div>
												<div className="w-0.5 h-0.5 bg-white rounded-full"></div>
												<div className="w-0.5 h-0.5 bg-white rounded-full"></div>
											</div>
										</div>
									</div>
									
									{/* Glow effect */}
									<span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500 to-amber-700 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></span>
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Chat Section - Enhanced collapse animation */}
				<div className={`transition-all duration-300 ease-in-out flex-shrink-0 ${
					viewMode === 'iframe-only' ? 'h-0 overflow-hidden transform scale-y-0 origin-bottom' :
					viewMode === 'split-view' ? 'h-1/2 transform scale-y-100 origin-bottom' : 'h-full transform scale-y-100 origin-bottom'
				} ${isTransitioning ? 'overflow-hidden' : 'overflow-hidden'} ${
					viewMode === 'iframe-only' ? 'absolute bottom-0 left-0 right-0 z-10' : 'relative z-10'
				}`}>
					{/* Beautiful Golden Separator Line - Only on desktop */}
					{viewMode === 'split-view' && !isMobile && (
						<div className="absolute top-0 left-0 right-0 z-20">
							{/* Main golden line */}
							<div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 via-amber-500 to-transparent shadow-lg shadow-yellow-500/30"></div>
							{/* Subtle glow effect */}
							<div className="h-0.5 bg-gradient-to-r from-transparent via-yellow-300 via-amber-400 to-transparent opacity-60 blur-sm"></div>
							{/* Animated shimmer effect */}
							<div className="h-0.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-pulse"></div>
						</div>
					)}
					{shouldShowPreviewChat && funnelFlow && isFunnelActive ? (
						<div className={`relative h-full w-full ${isTransitioning ? 'pointer-events-none' : ''} ${viewMode === 'split-view' && !isMobile ? 'border-t border-yellow-500/20' : ''}`}>
							<StorePreviewChat
								funnelFlow={funnelFlow}
								resources={liveFunnel?.resources || []}
								experienceId={experienceId}
								onMessageSent={handleMessageSentInternal}
								hideAvatar={true} // Hide avatar as requested
								onEditMerchant={onEditMerchant}
							/>
						</div>
					) : (
						<div className="h-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
							<div className="text-center max-w-md mx-auto p-6">
								<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
									</svg>
								</div>
								
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Live Funnel</h3>
								<p className="text-gray-600 dark:text-gray-400 mb-4">
									There's no live funnel to preview yet.
								</p>
								
								<button
									onClick={loadLiveFunnel}
									className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
								>
									Refresh
								</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Green Popup - No Funnel is Live */}
			{showNoFunnelPopup && !isFunnelActive && (
				<div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
					<div className="bg-green-500 text-white rounded-lg shadow-lg p-4 max-w-sm">
						<div className="flex items-start gap-3">
							{/* Green check icon */}
							<div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
								</svg>
							</div>
							
							<div className="flex-1">
								<h4 className="font-semibold text-sm mb-1">No Funnel is Live</h4>
								<p className="text-xs text-green-100 mb-2">
									My Merchants → Select Merchant → Edit Merchant → Go Live!
								</p>
								
								{/* Close button */}
								<button
									onClick={() => setShowNoFunnelPopup(false)}
									className="text-green-100 hover:text-white transition-colors text-xs underline"
								>
									Dismiss
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default StorePreview;
