"use client";

import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import UserChat from "./UserChat";
import { AdminNavbar } from "./AdminNavbar";
import type { FunnelFlow } from "../../types/funnel";
import type { ConversationWithMessages } from "../../types/user";
import { apiGet, apiPost } from "../../utils/api-client";
import { Text } from "frosted-ui";
import { MessageSquare, Play, RotateCcw, Settings, User, MessageCircle, Sun, Moon } from "lucide-react";
import FunnelProgressBar from "./FunnelProgressBar";
import { ThemeToggle } from "../common/ThemeToggle";
import { useWhopWebSocket } from "../../hooks/useWhopWebSocket";
import { useTheme } from "../common/ThemeProvider";

/**
 * --- Customer View Component ---
 * This is the entry point for customers to experience the funnel.
 * Now connected to real backend infrastructure instead of mock data.
 */

interface CustomerViewProps {
	userName?: string;
	experienceId?: string;
	onMessageSent?: (message: string, conversationId?: string) => void;
	userType?: "admin" | "customer";
	whopUserId?: string;
}

const CustomerView: React.FC<CustomerViewProps> = ({
	userName,
	experienceId,
	onMessageSent,
	userType = "customer",
	whopUserId,
}) => {
	const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
	const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [stageInfo, setStageInfo] = useState<{
		currentStage: string;
		isDMFunnelActive: boolean;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
	} | null>(null);
	
	// Admin state
	const [adminLoading, setAdminLoading] = useState(false);
	const [adminError, setAdminError] = useState<string | null>(null);
	const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
	
	// View mode state - single source of truth
	type ViewMode = 'iframe-only' | 'chat-only' | 'split-view';
	const [viewMode, setViewMode] = useState<ViewMode>('iframe-only'); // Start with iframe only
	const [isTransitioning, setIsTransitioning] = useState(false); // Track view transitions
	const [isMobile, setIsMobile] = useState(false); // Track mobile view
	const [iframeError, setIframeError] = useState(false); // Track iframe loading errors
	const [iframeLoaded, setIframeLoaded] = useState(false); // Track iframe load completion
	const [overlayTransitioning, setOverlayTransitioning] = useState(false); // Track overlay transition
	const [iframeUrl, setIframeUrl] = useState<string>(''); // Will be set from experience
	const [urlLoaded, setUrlLoaded] = useState(false); // Track if URL has been loaded from database
	
	// Auto-scroll reveal state (removed - now handled by iframe content)
	
	// User context for admin features
	const [userContext, setUserContext] = useState<{
		user_id?: string;
		company_id?: string;
	} | null>(null);

	// Drag state for admin navbar
	const [isDragging, setIsDragging] = useState(false);
	const [navbarPosition, setNavbarPosition] = useState({ x: 0, y: 0 });
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const navbarRef = useRef<HTMLDivElement>(null);

	// Theme and WebSocket state
	const { appearance, toggleTheme } = useTheme();
	const { isConnected } = useWhopWebSocket({
		conversationId: conversationId || "",
		experienceId: experienceId || "",
		onMessage: (newMessage) => {
			console.log("📨 [CustomerView] WebSocket message received:", {
				id: newMessage.id,
				type: newMessage.type,
				content: newMessage.content.substring(0, 50) + "...",
				conversationId: newMessage.metadata?.conversationId,
				userId: newMessage.metadata?.userId,
				experienceId: newMessage.metadata?.experienceId,
				timestamp: newMessage.createdAt,
			});
			
			// Check for stage transition in message metadata
			if (newMessage.metadata?.stageTransition) {
				const newStage = newMessage.metadata.stageTransition.currentStage;
				console.log("🔄 [CustomerView] Stage transition detected:", newStage);
				
				// Update stageInfo state to trigger progress bar update
				setStageInfo(prev => prev ? {
					...prev,
					currentStage: newStage
				} : null);
				
				// Dispatch custom event for progress bar update
				const stageUpdateEvent = new CustomEvent('funnel-stage-update', {
					detail: { newStage }
				});
				window.dispatchEvent(stageUpdateEvent);
			}
		},
		onError: (error) => {
			console.error("WebSocket error:", error);
		},
	});

	// Unified view mode handler with predictable transitions
	const handleViewToggle = useCallback(() => {
		setIsTransitioning(true);
		setViewMode(prev => {
			if (isMobile) {
				// Mobile: Chat icon switches directly to full UserChat
				switch (prev) {
					case 'iframe-only': return 'chat-only';        // Direct to full UserChat
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
				// Mobile: Skip half view, go directly to full UserChat
				switch (prev) {
					case 'iframe-only': return 'chat-only';        // 1st click: full UserChat
					case 'chat-only': return 'iframe-only';      // 2nd click: collapse UserChat, reveal iframe
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

	// Mobile detection
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768); // md breakpoint
		};
		
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// Auto-scroll is now handled by iframe content

	// Auto-scroll is now handled automatically by the iframe content
	// No need for postMessage - iframe triggers its own scroll animation

	// Drag handlers for admin navbar
	const handleDragStart = (e: React.MouseEvent) => {
		if (navbarRef.current) {
			const rect = navbarRef.current.getBoundingClientRect();
			setDragOffset({
				x: e.clientX - rect.left,
				y: e.clientY - rect.top
			});
			setIsDragging(true);
		}
	};

	const handleDragMove = useCallback((e: MouseEvent) => {
		if (isDragging) {
			setNavbarPosition({
				x: e.clientX - dragOffset.x,
				y: e.clientY - dragOffset.y
			});
		}
	}, [isDragging, dragOffset]);

	const handleDragEnd = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Add event listeners for drag
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleDragMove);
			document.addEventListener('mouseup', handleDragEnd);
		}

		return () => {
			document.removeEventListener('mousemove', handleDragMove);
			document.removeEventListener('mouseup', handleDragEnd);
		};
	}, [isDragging, handleDragMove, handleDragEnd]);


	// Function to extract base URL from experience link
	const extractBaseUrl = useCallback((link: string): string => {
		console.log(`[CustomerView] extractBaseUrl called with link:`, link);
		if (!link) {
			console.log(`[CustomerView] No link provided to extractBaseUrl`);
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
			console.log(`[CustomerView] Extracted base URL from ${link}: ${baseUrl}`);
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
			console.log(`[CustomerView] Fetching experience link for: ${experienceId}`);
			const response = await apiGet(`/api/experience/link?experienceId=${experienceId}`, experienceId);
			if (response.ok) {
				const data = await response.json();
				console.log(`[CustomerView] Experience link response:`, data);
				
				if (data.experience?.link) {
					console.log(`[CustomerView] Found experience link: ${data.experience.link}`);
					console.log(`[CustomerView] Link type:`, typeof data.experience.link);
					console.log(`[CustomerView] Link length:`, data.experience.link.length);
					const extractedUrl = extractBaseUrl(data.experience.link);
					setIframeUrl(extractedUrl);
					setUrlLoaded(true);
					console.log(`[CustomerView] Set iframe URL from database: ${extractedUrl}`);
				} else {
					console.log(`[CustomerView] No experience link found in response:`, data.experience);
					console.log(`[CustomerView] Full response data:`, data);
					setUrlLoaded(true); // Mark as loaded even if no link found
				}
			} else {
				console.error(`[CustomerView] Failed to fetch experience link: ${response.status}`);
			}
		} catch (error) {
			console.error("Error fetching experience link:", error);
		}
	}, [experienceId, extractBaseUrl]);

	// Fetch user context for admin features
	const fetchUserContext = useCallback(async () => {
		if (!experienceId) return;
		
		try {
			console.log(`[CustomerView] Fetching user context for experienceId: ${experienceId}`);
			const response = await apiGet(`/api/user/context?experienceId=${experienceId}`, experienceId);
			if (response.ok) {
				const data = await response.json();
				console.log(`[CustomerView] User context response:`, data);
				
				// Set user context for admin users
				if (data.user && userType === "admin") {
					setUserContext({
						user_id: data.user.whopUserId,
						company_id: data.user.experience.whopCompanyId
					});
				}
			} else {
				console.error(`[CustomerView] Failed to fetch user context: ${response.status}`);
			}
		} catch (error) {
			console.error("Error fetching user context:", error);
		}
	}, [experienceId, userType]);

	// Load real funnel data and create/load conversation
	const loadFunnelAndConversation = useCallback(async () => {
		if (!experienceId) {
			setError("Experience ID is required");
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// Debug logging for CustomerView
			console.log(`[CustomerView] Debug - Loading conversation for experienceId: ${experienceId}, whopUserId: ${whopUserId}`);

			// Step 1: Check if there's an active conversation
			const checkResponse = await apiPost('/api/userchat/check-conversation', {
				whopUserId: whopUserId,
			}, experienceId);

			const checkResult = await checkResponse.json();

			if (checkResult.success) {
				// Set funnel flow from API response
				if (checkResult.funnelFlow) {
					setFunnelFlow(checkResult.funnelFlow);
				}

				// Set stage information
				if (checkResult.stageInfo) {
					setStageInfo(checkResult.stageInfo);
				}

				// If there's an active conversation, load it
				if (checkResult.hasActiveConversation && checkResult.conversation) {
					setConversationId(checkResult.conversation.id);
					
					// Set stage info from check result first
					if (checkResult.stageInfo) {
						setStageInfo(checkResult.stageInfo);
					}
					
					// Try to load the full conversation data (optimized)
					try {
						const loadResponse = await apiPost('/api/userchat/load-conversation', {
							conversationId: checkResult.conversation.id,
							whopUserId: whopUserId,
							userType: userType, // Pass userType for message filtering
						}, experienceId);

						const loadResult = await loadResponse.json();

						if (loadResult.success) {
							// Set conversation data (messages included)
							if (loadResult.conversation) {
								setConversation(loadResult.conversation);
							}

							// Update stage information with latest data
							if (loadResult.stageInfo) {
								setStageInfo(loadResult.stageInfo);
							}

							console.log("CustomerView loaded conversation with messages:", {
								experienceId,
								conversationId: checkResult.conversation.id,
								hasFunnelFlow: !!checkResult.funnelFlow,
								hasConversation: !!loadResult.conversation,
								messageCount: loadResult.conversation?.messages?.length || 0,
								stageInfo: loadResult.stageInfo,
							});
						} else {
							console.error("Failed to load conversation details:", loadResult.error);
							// Don't clear the conversation - we still have basic info from check
						}
					} catch (loadError) {
						console.error("Error loading conversation details:", loadError);
						// Don't clear the conversation - we still have basic info from check
					}
				} else {
					// No active conversation
					setConversationId(null);
					setConversation(null);
					console.log("CustomerView: No active conversation found");
					console.log("CustomerView: checkResult details:", {
						success: checkResult.success,
						hasActiveConversation: checkResult.hasActiveConversation,
						conversation: checkResult.conversation,
						error: checkResult.error
					});
				}
			} else {
				throw new Error(checkResult.error || "Failed to check conversation status");
			}
		} catch (err) {
			console.error("Error loading funnel and conversation:", err);
			setError(err instanceof Error ? err.message : "Failed to load conversation");
		} finally {
			setIsLoading(false);
		}
	}, [experienceId, userName, whopUserId]);

	// Admin functions
	const checkConversationStatus = async () => {
		console.log(`[AdminNavbar] checkConversationStatus called with experienceId: ${experienceId}`);
		if (!experienceId) {
			setAdminError("Experience ID is required");
			return;
		}
		
		try {
			setAdminLoading(true);
			setAdminError(null);
			
			const response = await apiPost('/api/userchat/check-conversation', {}, experienceId);
			const result = await response.json();
			
			if (result.success) {
				if (result.hasActiveConversation) {
					setConversationId(result.conversation.id);
					setStageInfo(result.stageInfo);
					setAdminSuccess(`Found active conversation: ${result.conversation.id}`);
				} else {
					setConversationId(null);
					setStageInfo(result.stageInfo);
					setAdminSuccess("No active conversation found");
				}
			} else {
				setAdminError(result.error || "Failed to check conversation status");
			}
		} catch (err) {
			console.error("Error checking conversation status:", err);
			setAdminError("An unexpected error occurred");
		} finally {
			setAdminLoading(false);
		}
	};


	const triggerDMForAdmin = async (productId?: string) => {
		if (!experienceId) {
			setAdminError("Experience ID is required");
			return;
		}

		try {
			setAdminLoading(true);
			setAdminError(null);
			setAdminSuccess(null);
			
			const response = await fetch('/api/admin/trigger-first-dm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ experienceId, productId }),
			});

			const result = await response.json();
			
			if (result.success) {
				const productInfo = result.productId ? ` for product ${result.productId}` : '';
				setAdminSuccess(`DM sent successfully${productInfo}! Conversation ID: ${result.conversationId}`);
				setConversationId(result.conversationId);
				await checkConversationStatus();
			} else {
				setAdminError(result.error || "Failed to trigger DM");
			}
		} catch (err) {
			console.error("Error triggering DM:", err);
			setAdminError("An unexpected error occurred");
		} finally {
			setAdminLoading(false);
		}
	};

	const resetConversations = async () => {
		if (!experienceId) {
			setAdminError("Experience ID is required");
			return;
		}

		try {
			setAdminLoading(true);
			setAdminError(null);
			setAdminSuccess(null);
			
			const response = await fetch('/api/admin/reset-conversations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ experienceId }),
			});

			const result = await response.json();
			
			if (result.success) {
				setAdminSuccess(`Conversations reset successfully! Closed ${result.data.closedConversations} conversations`);
				setConversationId(null);
				setConversation(null);
				setStageInfo(null);
			} else {
				setAdminError(result.error || "Failed to reset conversations");
			}
		} catch (err) {
			console.error("Error resetting conversations:", err);
			setAdminError("An unexpected error occurred");
		} finally {
			setAdminLoading(false);
		}
	};

	// Load data on mount
	useEffect(() => {
		loadFunnelAndConversation();
		fetchUserContext();
		fetchExperienceLink(); // Get experience link for iframe
	}, [loadFunnelAndConversation, fetchUserContext, fetchExperienceLink]);

	// Monitor iframeUrl changes
	useEffect(() => {
		console.log(`[CustomerView] Iframe URL changed to: ${iframeUrl}`);
	}, [iframeUrl]);

	// Debug iframe URL on render
	useEffect(() => {
		console.log(`[CustomerView] Current iframe URL: ${iframeUrl}`);
	});

	// Debug iframe rendering
	useEffect(() => {
		if (urlLoaded) {
			console.log(`[CustomerView] Rendering iframe with URL: ${iframeUrl}`);
		}
	}, [urlLoaded, iframeUrl]);


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
		console.log("Customer message:", {
			message,
			conversationId: convId || conversationId,
			userName,
			experienceId,
			timestamp: new Date().toISOString(),
		});
		if (onMessageSent) {
			onMessageSent(message, convId || conversationId || undefined);
		}
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90">
				<div className="text-center">
					<div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400">Loading conversation...</p>
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
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Conversation</h3>
					<p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
					<button
						onClick={loadFunnelAndConversation}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	// Always show CustomerView interface for both admin and customer access levels
	// The interface will adapt based on funnel/conversation status and access level

	// Check if we should show UserChat (for all UserChat stages)
	// Always show UserChat for both admin and customer access levels
	const shouldShowUserChat = true;

	// Check if funnel is active and conversation exists
	// This matches the same logic used in user-join-actions and check-conversation API
	const isFunnelActive = funnelFlow && conversationId && stageInfo && 
		stageInfo.currentStage !== "NO_FUNNEL" && 
		stageInfo.currentStage !== "NO_CONVERSATION";
	
	// Debug logging
	console.log("CustomerView render state:", {
		hasConversation: !!conversation,
		conversationId,
		stageInfo,
		shouldShowUserChat,
		funnelFlow: !!funnelFlow,
		userType,
		shouldShowAdminPanel: userType === "admin"
	});

	// Render UserChat with real data
			return (
				<div className="h-screen w-full relative">
			{/* Whop Native Loading Overlay - Covers entire CustomerView until iframe loads */}
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
						
						{/* Loading dots animation */}
						<div className="flex justify-center space-x-2 mt-6">
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
							<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
						</div>
					</div>
				</div>
			)}

			{/* Admin Navbar - Movable overlay positioned at top navbar */}
			{userType === "admin" && (
			<div 
				ref={navbarRef}
				className="absolute z-50 cursor-move"
				style={{
					left: navbarPosition.x === 0 ? '50%' : `${navbarPosition.x}px`,
					top: navbarPosition.y === 0 ? '50%' : `${navbarPosition.y}px`,
					transform: navbarPosition.x === 0 && navbarPosition.y === 0 
						? 'translate(-50%, -50%)' 
						: isDragging ? 'scale(1.02)' : 'scale(1)',
					transition: isDragging ? 'none' : 'transform 0.2s ease-out'
				}}
				onMouseDown={handleDragStart}
			>
				<div className="bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg shadow-2xl">
					{/* Drag handle */}
					<div className="w-full h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-t-lg cursor-move flex items-center justify-center">
						<div className="w-8 h-1 bg-white/50 rounded-full"></div>
					</div>
					
						<AdminNavbar
							conversationId={conversationId}
							stageInfo={stageInfo}
							adminLoading={adminLoading}
							adminError={adminError}
							adminSuccess={adminSuccess}
							onCheckStatus={checkConversationStatus}
							onTriggerDM={triggerDMForAdmin}
							onResetConversations={resetConversations}
						experienceId={experienceId}
						funnelFlow={funnelFlow}
						user_id={userContext?.user_id}
						company_id={userContext?.company_id}
						/>
					</div>
			</div>
		)}

		{/* Top Navbar with Integrated Progress Bar */}
		<div className="sticky top-0 z-30 flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg">
			<div className="px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						{/* Avatar Icon */}
						<div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
							<img 
								src="https://img-v2-prod.whop.com/unsafe/rs:fit:256:0/plain/https%3A%2F%2Fassets.whop.com%2Fuploads%2F2025-10-02%2Fuser_16843562_c991d27a-feaa-4318-ab44-2aaa27937382.jpeg@avif?w=256&q=75"
								alt="User Avatar"
								className="w-20 h-20 object-cover"
								onError={(e) => {
									// Fallback to default icon if image fails to load
									const target = e.target as HTMLImageElement;
									target.style.display = 'none';
									const parent = target.parentElement;
									if (parent) {
										parent.innerHTML = '<div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center"><svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
									}
								}}
							/>
						</div>

					</div>

		{/* Center: CLAIM YOUR GIFT Button */}
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
						{stageInfo?.currentStage === "VALUE_DELIVERY" || 
						 stageInfo?.currentStage === "EXPERIENCE_QUALIFICATION" ||
						 stageInfo?.currentStage === "PAIN_POINT_QUALIFICATION" ||
						 stageInfo?.currentStage === "OFFER" ? (
							<>
								{/* Diamond Icon for VIP Access */}
								<svg
									width={20}
									height={20}
									viewBox="0 0 24 24"
									fill="currentColor"
									className="text-white"
								>
									<path d="M6 2L2 8l10 14 10-14-4-6H6zm2.5 2h7l2.5 4-7.5 10.5L4.5 8l2.5-4z"/>
								</svg>
								<span>UNLOCK VIP ACCESS</span>
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

		{/* Integrated Progress Bar - Custom with WebSocket updates */}
		{isFunnelActive && (
				<div className="px-4 pb-3">
					<div className="relative w-full">
						{/* Background Track - Smooth and subtle */}
						<div className="w-full bg-gray-200/30 dark:bg-gray-600/30 rounded-full h-1">
							<div
								className={`h-1 rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
									(() => {
										const stageOrder = [
											{ key: "TRANSITION", name: "Getting Started" },
											{ key: "WELCOME", name: "Welcome" },
											{ key: "VALUE_DELIVERY", name: "Value Delivery" },
											{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
											{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
											{ key: "OFFER", name: "Offer" },
										];
										const currentStageIndex = stageOrder.findIndex(stage => stage.key === stageInfo.currentStage);
										const availableStages = stageOrder.filter(stage => 
											funnelFlow.stages.some(s => s.name === stage.key)
										);
										const progressPercentage = availableStages.length > 0 
											? ((currentStageIndex + 1) / availableStages.length) * 100 
											: 0;
										return progressPercentage >= 100;
									})()
										? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600' 
										: 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600'
								}`}
								style={{ 
									width: `${(() => {
										const stageOrder = [
											{ key: "TRANSITION", name: "Getting Started" },
											{ key: "WELCOME", name: "Welcome" },
											{ key: "VALUE_DELIVERY", name: "Value Delivery" },
											{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
											{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
											{ key: "OFFER", name: "Offer" },
										];
										const currentStageIndex = stageOrder.findIndex(stage => stage.key === stageInfo.currentStage);
										const availableStages = stageOrder.filter(stage => 
											funnelFlow.stages.some(s => s.name === stage.key)
										);
										const progressPercentage = availableStages.length > 0 
											? ((currentStageIndex + 1) / availableStages.length) * 100 
											: 0;
										return progressPercentage;
									})()}%`
								}}
							>
								{/* Multiple Random Shining Spots - Sun/Lava Effect */}
								<div className="absolute inset-0 overflow-hidden">
									{/* Main shimmer wave */}
									<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
									
									{/* Random light spots - like sun rays */}
									<div className="absolute top-0 left-1/4 w-2 h-full bg-gradient-to-b from-yellow-200 via-white to-yellow-200 opacity-60 animate-ping" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
									<div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-amber-200 via-white to-amber-200 opacity-80 animate-ping" style={{ animationDelay: '0.5s', animationDuration: '1.5s' }}></div>
									<div className="absolute top-0 left-3/4 w-1.5 h-full bg-gradient-to-b from-yellow-300 via-white to-yellow-300 opacity-70 animate-ping" style={{ animationDelay: '1s', animationDuration: '2.5s' }}></div>
									<div className="absolute top-0 left-1/6 w-1 h-full bg-gradient-to-b from-amber-300 via-white to-amber-300 opacity-50 animate-ping" style={{ animationDelay: '1.5s', animationDuration: '1.8s' }}></div>
									<div className="absolute top-0 left-5/6 w-1.5 h-full bg-gradient-to-b from-yellow-400 via-white to-yellow-400 opacity-60 animate-ping" style={{ animationDelay: '2s', animationDuration: '2.2s' }}></div>
									
									{/* Lava-like bubbling effect */}
									<div className="absolute top-0 left-1/3 w-1 h-full bg-gradient-to-b from-orange-300 via-yellow-200 to-transparent opacity-40 animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '1.2s' }}></div>
									<div className="absolute top-0 left-2/3 w-1 h-full bg-gradient-to-b from-red-300 via-yellow-300 to-transparent opacity-35 animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '1.6s' }}></div>
									
									{/* Glowing particles */}
									<div className="absolute top-0 left-1/5 w-0.5 h-full bg-white opacity-90 animate-pulse" style={{ animationDelay: '0.2s', animationDuration: '0.8s' }}></div>
									<div className="absolute top-0 left-4/5 w-0.5 h-full bg-white opacity-75 animate-pulse" style={{ animationDelay: '0.7s', animationDuration: '1.1s' }}></div>
								</div>
							</div>
						</div>


						{/* Completion Button - Centered with Faded Background (when progress is 100%) */}
						{(() => {
							const stageOrder = [
								{ key: "TRANSITION", name: "Getting Started" },
								{ key: "WELCOME", name: "Welcome" },
								{ key: "VALUE_DELIVERY", name: "Value Delivery" },
								{ key: "EXPERIENCE_QUALIFICATION", name: "Experience" },
								{ key: "PAIN_POINT_QUALIFICATION", name: "Pain Points" },
								{ key: "OFFER", name: "Offer" },
							];
							const currentStageIndex = stageOrder.findIndex(stage => stage.key === stageInfo.currentStage);
							const availableStages = stageOrder.filter(stage => 
								funnelFlow.stages.some(s => s.name === stage.key)
							);
							const progressPercentage = availableStages.length > 0 
								? ((currentStageIndex + 1) / availableStages.length) * 100 
								: 0;
							return progressPercentage >= 100;
						})() && (
							<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
								{/* Faded Background Line */}
								<div className="absolute inset-0 flex items-center">
									<div className="w-full h-px bg-gray-200/50 dark:bg-gray-600/50 opacity-50"></div>
								</div>
								
								{/* Smooth completion button */}
								<button
									onClick={() => {
										// Scroll to offer button with better detection
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
									}}
									className="relative inline-flex items-center justify-center px-3 py-1 text-xs font-medium text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 rounded-full shadow-md hover:shadow-lg active:scale-95 overflow-hidden group"
								>
									{/* Animated background overlay */}
									<span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
									
									{/* Shimmer effect */}
									<span className="absolute inset-0 -top-1 -left-1 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></span>
									
									{/* Content */}
									<span className="relative flex items-center space-x-1 z-10">
										<span>✨</span>
										<span>Exclusive</span>
									</span>
									
									{/* Glow effect */}
									<span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></span>
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>

		{/* Main Content Area with Toggle Functionality */}
		<div className="h-[calc(100vh-120px)] w-full relative flex flex-col overflow-hidden">
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
							title="ProfitPulse AI"
							sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-modals allow-downloads"
							loading="lazy"
							referrerPolicy="no-referrer"
							allow="payment; microphone; camera; fullscreen; autoplay; clipboard-write; cross-origin-isolated"
						onLoad={() => {
							console.log('Discovery page loaded successfully via proxy');
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
							console.log('Discovery page failed to load:', e);
							setIframeError(true);
						}}
					/>
					) : (
						<div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
							<div className="text-center">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
								<p className="text-gray-600 dark:text-gray-300">Loading experience...</p>
							</div>
						</div>
					)}
							
							{/* Fallback content when iframe fails */}
							<div className={`absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center ${iframeError ? 'flex' : 'hidden'}`}>
								<div className="text-center p-3 max-w-xs mx-auto">
									{/* Trading Icon */}
									<div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
										<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
						</svg>
					</div>
									
									{/* Content */}
									<h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
										ProfitPulse AI
									</h3>
									<p className="text-gray-600 dark:text-gray-300 mb-2 text-xs leading-tight">
										Learn to Scale Sales processes and Affiliate networks with UpSell App!
									</p>
									
									{/* Features */}
									<div className="space-y-0.5 mb-2 text-left">
										<div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-300">
											<div className="w-1 h-1 bg-green-500 rounded-full"></div>
											<span>Digital Sales Academy</span>
										</div>
										<div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-300">
											<div className="w-1 h-1 bg-green-500 rounded-full"></div>
											<span>Affiliate Networks</span>
										</div>
										<div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-300">
											<div className="w-1 h-1 bg-green-500 rounded-full"></div>
											<span>UpSell App</span>
										</div>
									</div>
									
									{/* Open in new tab button */}
					<button
										onClick={() => window.open(iframeUrl, "_blank", "noopener,noreferrer")}
										className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-1.5 px-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs"
									>
										<div className="flex items-center justify-center space-x-1">
											<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
											</svg>
											<span>Open ProfitPulse AI</span>
										</div>
					</button>
				</div>
			</div>
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
										<MessageCircle className="w-5 h-5 text-white" />
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

			{/* Toggle Button - Line only (no chat icon) */}

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
				{shouldShowUserChat && funnelFlow ? (
						<div className={`relative h-full w-full ${isTransitioning ? 'pointer-events-none' : ''} ${viewMode === 'split-view' && !isMobile ? 'border-t border-yellow-500/20' : ''}`}>
					<UserChat
						funnelFlow={funnelFlow}
						conversationId={conversationId || undefined}
						conversation={conversation || undefined}
						experienceId={experienceId}
						onMessageSent={handleMessageSentInternal}
						userType={userType}
						stageInfo={stageInfo || undefined}
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
							
							{stageInfo?.isDMFunnelActive ? (
								<>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">DM Funnel Active</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										Please check your DMs to continue the conversation.
									</p>
								</>
							) : stageInfo?.isTransitionStage ? (
								<>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Transitioning to Chat</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										Please wait while we prepare your personalized strategy session.
									</p>
								</>
							) : (
								<>
									<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Conversation</h3>
									<p className="text-gray-600 dark:text-gray-400 mb-4">
										You don't have an active conversation yet.
									</p>
								</>
							)}
							
							<button
								onClick={loadFunnelAndConversation}
								className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
							>
								Refresh
							</button>
						</div>
					</div>
				)}
				</div>
			</div>
		</div>
	);
};

export default CustomerView;
