"use client";

import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import UserChat from "./UserChat";
import { AdminNavbar } from "./AdminNavbar";
import type { FunnelFlow } from "../../types/funnel";
import type { ConversationWithMessages } from "../../types/user";
import { apiGet, apiPost } from "../../utils/api-client";
import { Text, Button } from "frosted-ui";
import { MessageSquare, Play, RotateCcw, Settings, User, MessageCircle, Sun, Moon } from "lucide-react";
import FunnelProgressBar from "./FunnelProgressBar";
import { ThemeToggle } from "../common/ThemeToggle";
import { AvatarSquare } from "../common/AvatarSquare";
import { useTheme } from "../common/ThemeProvider";
import { TemplateRenderer } from "./TemplateRenderer";
import { CustomerDashboard } from "../customers/CustomerDashboard";
import { TopNavbar } from "../store/SeasonalStore/components/TopNavbar";
import { getHoverRingClass, getGlowBgClass, getGlowBgStrongClass } from "../store/SeasonalStore/utils";
import { createDefaultDiscountSettings, checkDiscountStatus, convertDiscountDataToSettings } from "../store/SeasonalStore/utils/discountHelpers";
import type { DiscountSettings } from "../store/SeasonalStore/types";
import type { DiscountData } from "../store/SeasonalStore/utils/discountHelpers";

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
	/** When set (e.g. from notification deep link), open CustomerView with chat visible and this conversation loaded */
	initialOpenConversationId?: string;
}

const CustomerView: React.FC<CustomerViewProps> = ({
	userName,
	experienceId,
	onMessageSent,
	userType = "customer",
	whopUserId,
	initialOpenConversationId,
}) => {
	// Log when we receive deep-link prop (notification open-chat)
	if (initialOpenConversationId && typeof window !== "undefined") {
		console.log("[CustomerView] render with initialOpenConversationId", { experienceId, initialOpenConversationId });
	}
	const [funnelFlow, setFunnelFlow] = useState<FunnelFlow | null>(null);
	const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
	const [conversationId, setConversationId] = useState<string | null>(null);
	/** List of conversations (active + closed) for sidebar; oldest first. */
	const [conversationList, setConversationList] = useState<Array<{
		id: string;
		status: string;
		funnelId: string | null;
		funnelName: string | null;
		merchantType: string;
		createdAt: string;
		updatedAt: string;
	}>>([]);
	const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
	/** True when the currently selected conversation is closed (read-only chat, no input/options). */
	const [isChatReadOnly, setIsChatReadOnly] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [stageInfo, setStageInfo] = useState<{
		currentStage: string;
		isDMFunnelActive: boolean;
		isTransitionStage: boolean;
		isExperienceQualificationStage: boolean;
	} | null>(null);
	const [merchantType, setMerchantType] = useState<"qualification" | "upsell">("qualification");
	/** Funnel resources (for product link resolution in chat). */
	const [funnelResources, setFunnelResources] = useState<Array<{ id: string; name: string; link?: string; [key: string]: unknown }>>([]);
	
	// Admin state
	const [adminLoading, setAdminLoading] = useState(false);
	const [adminError, setAdminError] = useState<string | null>(null);
	const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
	
	// Live template state
	const [liveTemplate, setLiveTemplate] = useState<any>(null);
	const [hasLiveTemplate, setHasLiveTemplate] = useState(false);
	const [templateLoading, setTemplateLoading] = useState(true);
	const [templateReady, setTemplateReady] = useState(false);
	
	// Validated discount settings state (validated against database)
	const [validatedDiscountSettings, setValidatedDiscountSettings] = useState<DiscountSettings | null>(null);
	
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
	
	// User context for admin features (and user avatar in UserChat)
	const [userContext, setUserContext] = useState<{
		user_id?: string;
		company_id?: string;
		user?: {
			id: string;
			name: string;
			avatar?: string | null;
			accessLevel?: string;
		};
	} | null>(null);

	// Merchant (company) logo for bot/typing avatar in UserChat – same source as LiveChat (origin-templates)
	const [merchantIconUrl, setMerchantIconUrl] = useState<string | null>(null);

	// Customer Dashboard view state - managed internally
	// Check URL params for dashboard query
	const router = useRouter();
	const searchParams = useSearchParams();
	const dashboardParam = searchParams?.get('dashboard');
	const viewParam = searchParams?.get('view');
	const [showCustomerDashboard, setShowCustomerDashboard] = useState(dashboardParam === 'true');
	const [purchasedPlanId, setPurchasedPlanId] = useState<string | null>(null);
	
	// Track if we came from SeasonalStore (view=customer in URL)
	const cameFromSeasonalStore = viewParam === 'customer';
	
	// Update state when URL param changes
	useEffect(() => {
		if (dashboardParam === 'true') {
			setShowCustomerDashboard(true);
		}
	}, [dashboardParam]);
	
	// Handler for back button from CustomerDashboard
	const handleDashboardBack = () => {
		if (cameFromSeasonalStore) {
			// Navigate back to SeasonalStore (go to admin view which shows SeasonalStore)
			router.push(`/experiences/${experienceId}?view=admin`);
		} else {
			// Just close the dashboard (we're already in CustomerView)
			setShowCustomerDashboard(false);
		}
		setPurchasedPlanId(null); // Clear purchased plan when leaving dashboard
	};
	
	// Handle product purchase success
	const handleProductPurchaseSuccess = useCallback((planId: string) => {
		console.log('✅ [CustomerView] Product purchase successful, planId:', planId);
		setPurchasedPlanId(planId);
		setShowCustomerDashboard(true); // Show customer dashboard
	}, []);

	// Drag state for admin navbar
	const [isDragging, setIsDragging] = useState(false);
	const [navbarPosition, setNavbarPosition] = useState({ x: 0, y: 0 });
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const navbarRef = useRef<HTMLDivElement>(null);

	// Theme state
	const { appearance, toggleTheme } = useTheme();

	// Stage updates are handled by UserChat polling, which dispatches 'funnel-stage-update' events
	// Listen for those events to update the progress bar
	useEffect(() => {
		const handleStageUpdate = (event: CustomEvent) => {
			const { newStage } = event.detail;
			console.log("🔄 [CustomerView] Stage update event received:", newStage);
			setStageInfo(prev => prev ? { ...prev, currentStage: newStage } : null);
		};
		
		window.addEventListener('funnel-stage-update', handleStageUpdate as EventListener);
		return () => window.removeEventListener('funnel-stage-update', handleStageUpdate as EventListener);
	}, []);

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
				
				// Set user context for all users (needed for CustomerDashboard and UserChat user avatar)
				if (data.user) {
					setUserContext({
						user_id: data.user.whopUserId,
						company_id: data.user.experience?.whopCompanyId,
						user: {
							id: data.user.id,
							name: data.user.name,
							avatar: data.user.avatar,
							accessLevel: data.user.accessLevel,
						},
					});
				}
			} else {
				console.error(`[CustomerView] Failed to fetch user context: ${response.status}`);
			}
		} catch (error) {
			console.error("Error fetching user context:", error);
		}
	}, [experienceId, userType]);

	// Check for live template
	const checkLiveTemplate = useCallback(async () => {
		if (!experienceId) return;
		
		try {
			setTemplateLoading(true);
			console.log(`[CustomerView] Checking for live template for experienceId: ${experienceId}`);
			const response = await apiGet(`/api/templates/live`, experienceId);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.template) {
					console.log(`[CustomerView] Found live template:`, data.template.name);
					setLiveTemplate(data.template);
					setHasLiveTemplate(true);
					// Don't set templateReady immediately - wait for frontend loading
					console.log(`[CustomerView] Template found, waiting for frontend loading...`);
				} else {
					console.log(`[CustomerView] No live template found`);
					setLiveTemplate(null);
					setHasLiveTemplate(false);
					setTemplateReady(true); // No template means we're ready to show regular content
				}
			} else {
				console.log(`[CustomerView] No live template found (${response.status})`);
				setLiveTemplate(null);
				setHasLiveTemplate(false);
				setTemplateReady(true); // No template found - ready to show regular content
			}
		} catch (error) {
			console.error(`[CustomerView] Error checking live template:`, error);
			setLiveTemplate(null);
			setHasLiveTemplate(false);
			setTemplateReady(true); // Error case - ready to show regular content
		} finally {
			setTemplateLoading(false);
		}
	}, [experienceId]);

	// Fetch merchant (company) logo from origin template for bot/typing avatar in UserChat – same as LiveChat
	useEffect(() => {
		if (!experienceId) return;
		let cancelled = false;
		(async () => {
			try {
				const response = await apiGet(`/api/origin-templates/${experienceId}`, experienceId);
				const data = await response.json();
				if (!cancelled && data?.originTemplate?.companyLogoUrl) {
					setMerchantIconUrl(data.originTemplate.companyLogoUrl);
				} else if (!cancelled) {
					setMerchantIconUrl(null);
				}
			} catch {
				if (!cancelled) setMerchantIconUrl(null);
			}
		})();
		return () => { cancelled = true; };
	}, [experienceId]);

	// Fetch conversation list (active + closed, oldest first) for sidebar
	const fetchConversationList = useCallback(async () => {
		if (!experienceId) return;
		try {
			const response = await apiGet('/api/userchat/conversations', experienceId);
			if (!response.ok) return;
			const json = await response.json();
			const data = json.data ?? json;
			const list = data.conversations ?? [];
			const activeId = data.activeId ?? null;
			setConversationList(list);
			setActiveConversationId(activeId);
		} catch (e) {
			console.error("[CustomerView] Error fetching conversation list:", e);
		}
	}, [experienceId]);

	// Load a single conversation by id (active or closed); sets conversation + funnel/stage; returns whether it's read-only
	const loadConversationById = useCallback(async (convId: string): Promise<{ readOnly: boolean }> => {
		if (!experienceId) return { readOnly: true };
		try {
			const loadResponse = await apiPost('/api/userchat/load-conversation', {
				conversationId: convId,
				whopUserId: whopUserId,
				userType: userType,
			}, experienceId);
			const loadResult = await loadResponse.json();
			const data = loadResult.data ?? loadResult;
			const ok = loadResult.success === true || data.success === true;
			if (!ok || !(data.conversation ?? loadResult.conversation)) {
				// Archived: clear selection and show list so UI recovers without 404
				if (data.code === "ARCHIVED" || data.error === "Conversation is archived") {
					setConversationId(null);
					setConversation(null);
					fetchConversationList();
				} else {
					console.error("Failed to load conversation:", data.error ?? loadResult.error);
				}
				return { readOnly: true };
			}
			const conv = data.conversation ?? loadResult.conversation;
			const funnelFlowData = data.funnelFlow ?? loadResult.funnelFlow;
			const stageInfoData = data.stageInfo ?? loadResult.stageInfo;
			const merchantTypeData = data.merchantType ?? loadResult.merchantType;
			const resourcesData = data.resources ?? loadResult.resources;
			setConversation(conv);
			setConversationId(convId);
			if (funnelFlowData) setFunnelFlow(funnelFlowData);
			if (stageInfoData) setStageInfo(stageInfoData);
			if (merchantTypeData === "upsell" || merchantTypeData === "qualification") setMerchantType(merchantTypeData);
			setFunnelResources(Array.isArray(resourcesData) ? resourcesData : []);
			const status = (conv as { status?: string } | undefined)?.status;
			return { readOnly: status === "closed" };
		} catch (err) {
			console.error("Error loading conversation by id:", err);
			return { readOnly: true };
		}
	}, [experienceId, whopUserId, userType, fetchConversationList]);

	const handleSelectConversation = useCallback(async (convId: string) => {
		const { readOnly } = await loadConversationById(convId);
		setIsChatReadOnly(readOnly);
	}, [loadConversationById]);

	// Mark conversation as read by user only when they actually open the chat (not just when in app)
	const lastMarkedReadConversationIdRef = useRef<string | null>(null);
	useEffect(() => {
		if (!experienceId || !conversationId) return;
		if (lastMarkedReadConversationIdRef.current === conversationId) return;
		lastMarkedReadConversationIdRef.current = conversationId;
		apiPost(
			`/api/livechat/conversations/${conversationId}/read`,
			{ side: "user" },
			experienceId
		).catch((e) => console.warn("[CustomerView] Mark conversation read (user) failed:", e));
	}, [experienceId, conversationId]);

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

			// Fetch list of conversations (active + closed) first
			await fetchConversationList();

			// Step 1: Check if there's an active conversation
			const checkResponse = await apiPost('/api/userchat/check-conversation', {
				whopUserId: whopUserId,
			}, experienceId);

			const checkResult = await checkResponse.json();

			if (checkResult.success) {
				// Set funnel flow from API response (may be from default/first funnel when no conversation)
				if (checkResult.funnelFlow) {
					setFunnelFlow(checkResult.funnelFlow);
				}

				// Set stage information and merchant type
				if (checkResult.stageInfo) {
					setStageInfo(checkResult.stageInfo);
				}
				if (checkResult.merchantType === "upsell" || checkResult.merchantType === "qualification") {
					setMerchantType(checkResult.merchantType);
				}

				// If there's an active conversation, load it
				if (checkResult.hasActiveConversation && checkResult.conversation) {
					const activeId = checkResult.conversation.id;
					setConversationId(activeId);
					if (checkResult.stageInfo) setStageInfo(checkResult.stageInfo);

					try {
						const loadResponse = await apiPost('/api/userchat/load-conversation', {
							conversationId: activeId,
							whopUserId: whopUserId,
							userType: userType,
						}, experienceId);

						const loadResult = await loadResponse.json();
						const data = loadResult.data ?? loadResult;

						if (data.success !== false && (loadResult.success || data.conversation)) {
							const conv = data.conversation ?? loadResult.conversation;
							if (conv) setConversation(conv);
							if (data.stageInfo ?? loadResult.stageInfo) setStageInfo(data.stageInfo ?? loadResult.stageInfo);
							if (data.merchantType === "upsell" || data.merchantType === "qualification" || loadResult.merchantType === "upsell" || loadResult.merchantType === "qualification") {
								setMerchantType(data.merchantType ?? loadResult.merchantType ?? "qualification");
							}
							const resourcesData = data.resources ?? loadResult.resources;
							setFunnelResources(Array.isArray(resourcesData) ? resourcesData : []);
							setIsChatReadOnly(false);
						}
					} catch (loadError) {
						console.error("Error loading conversation details:", loadError);
					}
				} else {
					// No active conversation: show list (already fetched)
					setConversationId(null);
					setConversation(null);
					setFunnelResources([]);
					setIsChatReadOnly(true); // no active chat; if user picks closed, stays true
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
	}, [experienceId, userName, whopUserId, fetchConversationList]);

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
				await fetchConversationList();
				if (result.hasActiveConversation) {
					setConversationId(result.conversation.id);
					setStageInfo(result.stageInfo);
					if (result.merchantType === "upsell" || result.merchantType === "qualification") {
						setMerchantType(result.merchantType);
					}
					setAdminSuccess(`Found active conversation: ${result.conversation.id}`);
				} else {
					setConversationId(null);
					setStageInfo(result.stageInfo);
					setMerchantType("qualification");
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
				await fetchConversationList();
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
				setFunnelResources([]);
				setStageInfo(null);
				await fetchConversationList();
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

	// When notification deep link: open chat only after Seasonal Store (template) has loaded, so Claim-button chat opens on top of the loaded store.
	const pendingOpenChatWhenReadyRef = useRef(false);
	// When true, TemplateRenderer (live template path) should open its chat; set when store ready + delay fires
	const [openChatFromDeepLink, setOpenChatFromDeepLink] = useState(false);

	// Load data once when experienceId is available; avoid re-running when callback identities change (prevents endless load-conversation loop)
	// When initialOpenConversationId is set (e.g. notification deep link), load that conversation but do NOT open chat yet; open after iframe loads.
	const lastLoadedExperienceIdRef = useRef<string | null>(null);
	const lastOpenChatConversationIdRef = useRef<string | null>(null);
	useEffect(() => {
		if (!experienceId) return;

		if (initialOpenConversationId) {
			if (lastOpenChatConversationIdRef.current === initialOpenConversationId) {
				console.log("[CustomerView] open-chat: already ran for this conversation, skip", { initialOpenConversationId });
				return;
			}
			lastOpenChatConversationIdRef.current = initialOpenConversationId;
			console.log("[CustomerView] open-chat: running deep-link path (load conversation; will open chat after store loads)", { experienceId, initialOpenConversationId });
			setIsLoading(true);
			setError(null);
			let cancelled = false;
			(async () => {
				try {
					await fetchConversationList();
					const { readOnly } = await loadConversationById(initialOpenConversationId);
					if (!cancelled) {
						setIsChatReadOnly(readOnly);
						pendingOpenChatWhenReadyRef.current = true;
						console.log("[CustomerView] open-chat: conversation loaded, will open chat when Seasonal Store has loaded");
					}
					fetchUserContext();
					fetchExperienceLink();
					checkLiveTemplate();
				} catch (err) {
					console.error("[CustomerView] open-chat: Error opening conversation from deep link:", err);
					if (!cancelled) setError(err instanceof Error ? err.message : "Failed to open conversation");
				} finally {
					if (!cancelled) setIsLoading(false);
				}
			})();
			return () => {
				cancelled = true;
			};
		}

		if (lastLoadedExperienceIdRef.current === experienceId) {
			console.log("[CustomerView] init: already loaded for this experience, skip normal path", { experienceId });
			return;
		}
		lastLoadedExperienceIdRef.current = experienceId;
		console.log("[CustomerView] init: running normal funnel load", { experienceId, initialOpenConversationId });
		loadFunnelAndConversation();
		fetchUserContext();
		fetchExperienceLink();
		checkLiveTemplate();
		// Intentionally omit callback deps to avoid re-running when callbacks get new refs (e.g. userType resolving)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [experienceId, initialOpenConversationId]);

	// After Seasonal Store has loaded (template + products), open the Claim-button chat if we came from notification deep link.
	// Wait for store ready THEN an extra delay so "template loads, products load" has time to finish (iframe onLoad is just document load).
	const storeReady = iframeLoaded || (hasLiveTemplate && !!liveTemplate);
	const OPEN_CHAT_DELAY_MS = 1000; // After store ready: brief delay so template/products can paint before opening chat
	useEffect(() => {
		if (!storeReady || !pendingOpenChatWhenReadyRef.current) return;
		const t = setTimeout(() => {
			if (!pendingOpenChatWhenReadyRef.current) return;
			pendingOpenChatWhenReadyRef.current = false;
			setViewMode("chat-only"); // for iframe path
			setOpenChatFromDeepLink(true); // for live template path (TemplateRenderer)
			console.log("[CustomerView] open-chat: Store and products ready, opening Claim-button chat");
		}, OPEN_CHAT_DELAY_MS);
		return () => clearTimeout(t);
	}, [storeReady]);

	// Validate discount settings against database (same logic as usePreviewLiveTemplate)
	useEffect(() => {
		if (!liveTemplate || !experienceId) {
			setValidatedDiscountSettings(null);
			return;
		}

		const validateDiscountSettings = async () => {
			try {
				const templateData = liveTemplate.templateData || {};
				const templateDiscountSettings = templateData.discountSettings;

				// Fetch current discount from database
				let databaseDiscountData: DiscountData | null = null;
				try {
					const response = await apiPost(
						'/api/seasonal-discount/get',
						{ experienceId },
						experienceId
					);
					if (response.ok) {
						const { discountData } = await response.json();
						databaseDiscountData = discountData || null;
					}
				} catch (error) {
					console.warn('⚠️ [CustomerView] Error fetching discount from database:', error);
				}

				const discountStatus = checkDiscountStatus(databaseDiscountData);
				const isActiveOrApproaching = discountStatus === 'active' || discountStatus === 'approaching';

				// Case 1: Template HAS discountSettings
				if (templateDiscountSettings) {
					const templateSeasonalDiscountId = templateDiscountSettings.seasonalDiscountId;
					const databaseSeasonalDiscountId = databaseDiscountData?.seasonalDiscountId;

					// If promo is NON-EXISTENT or EXPIRED
					if (discountStatus === 'non-existent' || discountStatus === 'expired') {
						console.log('🧹 [CustomerView] Removing discount settings - discount is non-existent or expired');
						setValidatedDiscountSettings(createDefaultDiscountSettings());
					}
					// If promo is ACTIVE/APPROACHING but different seasonal_discount_id
					else if (isActiveOrApproaching && databaseSeasonalDiscountId && templateSeasonalDiscountId !== databaseSeasonalDiscountId) {
						console.log('🔄 [CustomerView] Updating discount settings - different active discount found');
						const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
						setValidatedDiscountSettings(newDiscountSettings);
					}
					// If promo is ACTIVE/APPROACHING and seasonal_discount_id MATCHES
					else if (isActiveOrApproaching && templateSeasonalDiscountId === databaseSeasonalDiscountId) {
						console.log('✅ [CustomerView] Discount settings match active discount - using database discount');
						const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
						setValidatedDiscountSettings(newDiscountSettings);
					}
					// If template has discount but no seasonalDiscountId and database has active discount
					else if (!templateSeasonalDiscountId && isActiveOrApproaching && databaseSeasonalDiscountId) {
						console.log('🔄 [CustomerView] Updating template discount - template has discount but no ID, database has active discount');
						const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData!);
						setValidatedDiscountSettings(newDiscountSettings);
					}
					// Template has discount but database doesn't have active/approaching discount
					else {
						console.log('⚠️ [CustomerView] Template has discount but database discount is not active/approaching');
						// Still use database discount data if available to ensure globalDiscount is correct
						if (databaseDiscountData) {
							const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
							setValidatedDiscountSettings(newDiscountSettings);
						} else {
							// Use template settings
							setValidatedDiscountSettings(templateDiscountSettings);
						}
					}
				}
				// Case 2: Template DOESN'T have discountSettings
				else {
					// If discount is ACTIVE/APPROACHING
					if (isActiveOrApproaching && databaseDiscountData) {
						console.log('✅ [CustomerView] Applying active discount from database');
						const newDiscountSettings = convertDiscountDataToSettings(databaseDiscountData);
						setValidatedDiscountSettings(newDiscountSettings);
					}
					// If discount is NOT active/approaching - use default
					else {
						setValidatedDiscountSettings(createDefaultDiscountSettings());
					}
				}
			} catch (error) {
				console.warn('⚠️ [CustomerView] Error validating discount, keeping template settings:', error);
				// Fallback to template settings if validation fails
				const templateData = liveTemplate.templateData || {};
				setValidatedDiscountSettings(templateData.discountSettings || createDefaultDiscountSettings());
			}
		};

		validateDiscountSettings();
	}, [liveTemplate, experienceId]);

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
	// When urlLoaded is true and iframeUrl is empty: only treat as "no template" once we know template check is done and there is no live template
	useEffect(() => {
		// If experience has no link (iframeUrl empty) and we've confirmed no live template, remove overlay
		if (urlLoaded && !iframeUrl && !iframeLoaded && !templateLoading && !hasLiveTemplate) {
			console.log('🎭 No experience link and no live template, removing overlay');
			setOverlayTransitioning(true);
			setTimeout(() => {
				setIframeLoaded(true);
				setOverlayTransitioning(false);
			}, 500);
			return;
		}

		// Fallback timer for when iframe should load but hasn't
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
	}, [iframeLoaded, urlLoaded, iframeUrl, templateLoading, hasLiveTemplate]);

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

	// Extract template data for TopNavbar
	const extractTemplateData = () => {
		if (!liveTemplate) {
			return {
				promoButton: {
					text: "CLAIM YOUR GIFT!",
					buttonClass: "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600",
					ringClass: "ring-yellow-400",
					ringHoverClass: "ring-yellow-500",
					icon: "gift"
				},
				discountSettings: createDefaultDiscountSettings(),
				currentSeason: "default",
				allThemes: {},
				legacyTheme: {
					accent: "bg-indigo-500",
					card: "bg-white/95 backdrop-blur-sm shadow-xl",
					text: "text-gray-800"
				}
			};
		}

		const templateData = liveTemplate.templateData || {};
		const promoButton = templateData.promoButton || {
			text: "CLAIM YOUR GIFT!",
			buttonClass: "bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600",
			ringClass: "ring-yellow-400",
			ringHoverClass: "ring-yellow-500",
			icon: "gift"
		};

		// Use validated discountSettings if available, otherwise use template discountSettings or default
		const discountSettings = validatedDiscountSettings || templateData.discountSettings || createDefaultDiscountSettings();

		const currentSeason = liveTemplate.currentSeason || "default";
		const allThemes = {}; // Empty for now, can be populated if needed
		
		// Get legacyTheme from templateData.currentTheme or themeSnapshot
		const legacyTheme = templateData.currentTheme || liveTemplate.themeSnapshot || {
			accent: "bg-indigo-500",
			card: "bg-white/95 backdrop-blur-sm shadow-xl",
			text: "text-gray-800"
		};

		return {
			promoButton,
			discountSettings,
			currentSeason,
			allThemes,
			legacyTheme
		};
	};

	const templateData = extractTemplateData();

	// Chat state for TopNavbar - derived from viewMode
	const isChatOpen = viewMode === 'split-view' || viewMode === 'chat-only';
	const setIsChatOpen = (open: boolean) => {
		if (open) {
			if (isMobile) {
				setViewMode('chat-only');
			} else {
				setViewMode('split-view');
			}
		} else {
			setViewMode('iframe-only');
		}
	};

	// Show TemplateRenderer if live template is found
	if (hasLiveTemplate && liveTemplate) {
		// If dashboard is shown, render CustomerDashboard instead
		if (showCustomerDashboard && userContext?.user) {
			return (
				<CustomerDashboard
					user={{
						id: userContext.user.id,
						name: userContext.user.name || userName || "User",
						avatar: userContext.user.avatar || undefined,
						accessLevel: (userContext.user.accessLevel as "admin" | "customer") || "customer",
						whopUserId: whopUserId || "",
						experienceId: experienceId || "",
						email: "",
						credits: 0,
						messages: 0,
						productsSynced: false,
						experience: {
							id: experienceId || "",
							whopExperienceId: experienceId || "",
							whopCompanyId: userContext.company_id || "",
							name: userContext.user.name || userName || "",
							link: iframeUrl,
						}
					}}
					onBack={handleDashboardBack}
					onUserSelect={(userId) => {
						// Handle user selection for admin
					}}
					selectedUserId={null}
					scrollToPlanId={purchasedPlanId}
				/>
			);
		}
		
		return (
			<div className="h-screen w-full relative flex flex-col">
				{/* Admin Navbar - Movable overlay positioned at top navbar */}
				{(userType === "admin" || userContext?.user?.accessLevel === "admin") && (
					<div 
						ref={navbarRef}
						className="absolute z-[100] cursor-move"
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
				
			<TemplateRenderer
				liveTemplate={liveTemplate}
				onProductClick={() => {
					console.log('[CustomerView] Product clicked in template');
				}}
				onPromoClick={() => {
					console.log('[CustomerView] Promo button clicked in template');
				}}
				isMobile={isMobile}
				isFunnelActive={isFunnelActive || false}
				funnelFlow={funnelFlow}
				experienceId={experienceId}
				userName={userName}
				whopUserId={whopUserId}
				onMessageSent={handleMessageSentInternal}
				conversationId={conversationId || undefined}
				conversation={conversation || undefined}
				stageInfo={stageInfo || undefined}
				userType={userType}
				merchantType={merchantType}
				onShowCustomerDashboard={() => setShowCustomerDashboard(true)}
				onPurchaseSuccess={handleProductPurchaseSuccess}
				openChatFromDeepLink={openChatFromDeepLink}
			/>
			</div>
		);
	}

	// Render UserChat with real data
	// If dashboard is shown, render CustomerDashboard instead
	if (showCustomerDashboard && userContext?.user) {
		return (
			<CustomerDashboard
				user={{
					id: userContext.user.id,
					name: userContext.user.name || userName || "User",
					avatar: userContext.user.avatar || undefined,
					accessLevel: (userContext.user.accessLevel as "admin" | "customer") || "customer",
					whopUserId: whopUserId || "",
					experienceId: experienceId || "",
					email: "",
					credits: 0,
					messages: 0,
					productsSynced: false,
					experience: {
						id: experienceId || "",
						whopExperienceId: experienceId || "",
						whopCompanyId: userContext.company_id || "",
						name: userContext.user.name || userName || "",
						link: iframeUrl,
					}
				}}
				onBack={() => {
					setShowCustomerDashboard(false);
					setPurchasedPlanId(null); // Clear purchased plan when closing dashboard
				}}
				onUserSelect={(userId) => {
					// Handle user selection for admin
				}}
				selectedUserId={null}
				scrollToPlanId={purchasedPlanId}
			/>
		);
	}
	
			return (
				<div className="h-screen w-full relative flex flex-col">
			{/* Whop Native Loading Overlay - Covers entire CustomerView until Seasonal Store / template loads */}
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
			{(userType === "admin" || userContext?.user?.accessLevel === "admin") && (
			<div 
				ref={navbarRef}
				className="absolute z-[100] cursor-move"
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

		{/* Top Navbar - Using SeasonalStore TopNavbar */}
		{liveTemplate ? (
			<TopNavbar
				editorState={{ isEditorView: false }}
				showGenerateBgInNavbar={false}
				isChatOpen={isChatOpen}
				isGeneratingBackground={false}
				loadingState={{ isImageLoading: false }}
				promoButton={templateData.promoButton}
				currentSeason={templateData.currentSeason}
				allThemes={templateData.allThemes}
				legacyTheme={templateData.legacyTheme}
				previewLiveTemplate={liveTemplate}
				hideEditorButtons={true}
				isStorePreview={true}
				discountSettings={templateData.discountSettings}
				toggleEditorView={() => {}}
				handleGenerateBgClick={() => {}}
				handleBgImageUpload={() => {}}
				handleSaveTemplate={() => {}}
				toggleAdminSheet={() => {}}
				openTemplateManager={() => {}}
				handleAddProduct={() => {}}
				setIsChatOpen={setIsChatOpen}
				setCurrentSeason={() => {}}
				getHoverRingClass={getHoverRingClass}
				getGlowBgClass={getGlowBgClass}
				getGlowBgStrongClass={getGlowBgStrongClass}
				rightSideContent={
					(userType === "customer" || userType === "admin") ? (
						<Button
							size="3"
							color="violet"
							variant="surface"
							onClick={() => setShowCustomerDashboard(true)}
							className="px-3 sm:px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
							title="View Memberships & Files"
						>
							<User size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform duration-300" />
							<span className="ml-1 hidden sm:inline">Membership</span>
						</Button>
					) : undefined
				}
			/>
		) : (
		<div className="sticky top-0 z-30 flex-shrink-0 bg-gradient-to-br from-surface via-surface/95 to-surface/90 backdrop-blur-sm border-b border-border/30 dark:border-border/20 shadow-lg">
			<div className="px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						{/* Avatar - square, non-square images cropped from top (bottom visible) */}
						<AvatarSquare
							src={userContext?.user?.avatar ?? undefined}
							alt="User Avatar"
							sizeClass="w-12 h-12"
							className="flex items-center justify-center"
							fallback={
								<div className="w-full h-full bg-blue-500 flex items-center justify-center">
									<User className="w-6 h-6 text-white" />
								</div>
							}
						/>
					</div>

		{/* Center: CLAIM YOUR GIFT Button */}
		{isFunnelActive && (
		<div className="flex-1 flex justify-center">
			<button
					onClick={handleButtonClick}
					className="relative inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white transition-all duration-300 ease-in-out bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 rounded-full shadow-lg hover:shadow-xl active:scale-95 overflow-hidden group animate-pulse"
					style={{ WebkitTapHighlightColor: "transparent" }}
				>
					<span className="absolute inset-0 w-full h-full bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
					<span className="absolute inset-0 -top-1 -left-1 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></span>
					<span className="relative flex items-center space-x-2 z-10">
						{(viewMode === 'split-view' || (viewMode === 'chat-only' && isMobile)) ? (
							<>
								<div className="w-5 h-5 text-white relative z-10">
									<MessageCircle className="w-5 h-5 text-white" />
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
						) : stageInfo?.currentStage === "VALUE_DELIVERY" || 
						 stageInfo?.currentStage === "EXPERIENCE_QUALIFICATION" ||
						 stageInfo?.currentStage === "PAIN_POINT_QUALIFICATION" ||
						 stageInfo?.currentStage === "OFFER" ? (
							<>
												<svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" className="text-white">
									<path d="M6 2L2 8l10 14 10-14-4-6H6zm2.5 2h7l2.5 4-7.5 10.5L4.5 8l2.5-4z"/>
								</svg>
								<span>UNLOCK VIP ACCESS</span>
							</>
						) : (
							<>
												<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M20 12v10H4V12"/>
									<path d="M2 7h20v5H2z"/>
									<path d="M12 22V7"/>
									<path d="M12 7L7 2l-5 5"/>
								</svg>
								<span>CLAIM YOUR GIFT!</span>
							</>
						)}
					</span>
					<span className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-300"></span>
				</button>
							</div>
		)}

						{/* Right Side: Membership Button and Theme Toggle */}
						<div className="flex items-center gap-2">
							{(userType === "customer" || userType === "admin") && (
								<Button
									size="3"
									color="violet"
									variant="surface"
									onClick={() => setShowCustomerDashboard(true)}
									className="px-3 sm:px-6 py-3 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 dark:shadow-violet-500/30 dark:hover:shadow-violet-500/50 group"
									title="View Memberships & Files"
								>
									<span className="ml-1 hidden sm:inline">Membership</span>
								</Button>
							)}
							
			<div className="p-1 rounded-xl bg-surface/50 border border-border/50 shadow-lg backdrop-blur-sm dark:bg-surface/30 dark:border-border/30 dark:shadow-xl dark:shadow-black/20">
							<button
					onClick={toggleTheme}
					className="p-2 rounded-lg touch-manipulation transition-all duration-200 hover:scale-105"
					style={{ WebkitTapHighlightColor: "transparent" }}
									title={appearance === "dark" ? "Switch to light mode" : "Switch to dark mode"}
				>
					{appearance === "dark" ? (
										<Sun size={20} className="text-foreground/70 dark:text-foreground/70" />
					) : (
										<Moon size={20} className="text-foreground/70 dark:text-foreground/70" />
					)}
							</button>
						</div>
					</div>
				</div>
		</div>
			</div>
		)}

		{/* Main Content Area with Toggle Functionality */}
		<div className="flex-1 w-full relative flex flex-col overflow-hidden">
			{/* Iframe Section - Enhanced reveal animation */}
			<div className={`transition-all duration-500 ease-in-out ${
				viewMode === 'iframe-only' ? 'h-full transform scale-y-100 origin-top' :
				viewMode === 'split-view' ? 'h-[calc(100vh-50vh)] transform scale-y-100 origin-top' : 'h-0 overflow-hidden transform scale-y-0 origin-top'
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
				viewMode === 'split-view' ? 'h-[50vh] transform scale-y-100 origin-bottom' : 'h-full transform scale-y-100 origin-bottom'
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
				{shouldShowUserChat && (funnelFlow || conversationList.length > 0) ? (
						<div className={`relative h-full w-full flex ${isTransitioning ? 'pointer-events-none' : ''} ${viewMode === 'split-view' && !isMobile ? 'border-t border-yellow-500/20' : ''}`}>
							{/* Conversation list sidebar: active + closed (oldest first); show when list has items */}
							{conversationList.length > 0 && (
								<div className="flex-shrink-0 w-48 border-r border-border/30 dark:border-border/20 bg-surface/50 overflow-y-auto flex flex-col">
									<div className="p-2 text-xs font-medium text-foreground/70 uppercase tracking-wider sticky top-0 bg-surface/95 backdrop-blur py-2">
										Chats
									</div>
									<nav className="p-2 space-y-0.5">
										{(() => {
											// Display: active first (if any), then rest in createdAt order (oldest first)
											const active = conversationList.find(c => c.status === "active");
											const closed = conversationList.filter(c => c.status === "closed");
											const ordered = active ? [active, ...closed] : closed;
											return ordered.map((c) => {
												const isActive = c.id === conversationId;
												const isCurrentChat = c.status === "active";
												return (
													<button
														key={c.id}
														type="button"
														onClick={() => handleSelectConversation(c.id)}
														className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
															isActive
																? "bg-blue-500/20 text-blue-700 dark:text-blue-300 font-medium"
																: "text-foreground/80 hover:bg-surface/80"
														}`}
													>
														<span className="block truncate">
															{isCurrentChat ? "Current chat" : (c.funnelName || "Past chat")}
														</span>
														{!isCurrentChat && (
															<span className="block truncate text-xs text-foreground/60 mt-0.5">
																{new Date(c.createdAt).toLocaleDateString()}
															</span>
														)}
													</button>
												);
											});
										})()}
									</nav>
								</div>
							)}
							<div className="flex-1 min-w-0">
								{funnelFlow && (conversationId || conversation) ? (
					<UserChat
						funnelFlow={funnelFlow}
						conversationId={conversationId || undefined}
						conversation={conversation || undefined}
						experienceId={experienceId}
						onMessageSent={handleMessageSentInternal}
						userType={userType}
						stageInfo={stageInfo || undefined}
						merchantType={merchantType}
						readOnly={isChatReadOnly}
						resources={funnelResources}
						userAvatar={userContext?.user?.avatar ?? undefined}
						merchantIconUrl={merchantIconUrl ?? undefined}
						adminAvatarUrl={conversation?.adminAvatar ?? undefined}
					/>
								) : (
									<div className="h-full flex items-center justify-center bg-gradient-to-br from-surface via-surface/95 to-surface/90 p-4">
										<div className="text-center max-w-sm">
											<MessageSquare className="w-10 h-10 text-foreground/50 mx-auto mb-2" />
											<p className="text-sm text-foreground/80">
												{conversationList.length > 0
													? "Select a chat from the list or start a new conversation."
													: "No active chat."}
											</p>
										</div>
									</div>
								)}
							</div>
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
