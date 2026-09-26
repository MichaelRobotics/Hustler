"use client";

import AdminPanel from "@/lib/components/admin/AdminPanel";
import { CustomerView } from "@/lib/components/userChat";
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import ViewSelectionPanel from "@/lib/components/experiences/ViewSelectionPanel";
import type { AuthenticatedUser } from "@/lib/types/user";
import { apiGet } from "@/lib/utils/api-client";

/**
 * --- Experience Page ---
 * This page handles authentication via API calls and view selection.
 */

interface AuthContext {
	user: AuthenticatedUser;
	isAuthenticated: boolean;
	hasAccess: boolean;
	userType?: string; // Backend-determined user type
	shouldShowViewSelection?: boolean;
	autoSelectedView?: string;
}

export default function ExperiencePage({
	params,
	searchParams,
}: {
	params: Promise<{ experienceId: string }>;
	searchParams?: Promise<{ view?: string; dashboard?: string; openChat?: string }>;
}) {
	const [authContext, setAuthContext] = useState<AuthContext | null>(null);
	const [contextError, setContextError] = useState<string | null>(null);
	const [contextLoading, setContextLoading] = useState(true);
	const [experienceId, setExperienceId] = useState<string>("");
	const [selectedView, setSelectedView] = useState<"admin" | "customer" | null>(null);
	// Read openChat from URL on mount so it's available before searchParams Promise resolves (notification deep link)
	const [openChatConversationId, setOpenChatConversationId] = useState<string | null>(() => {
		if (typeof window === "undefined") return null;
		const params = new URLSearchParams(window.location.search);
		const openChat = params.get("openChat");
		if (openChat) {
			console.log("[ExperiencePage] initial state from URL openChat:", openChat);
			return openChat;
		}
		return null;
	});
	// Admin notification deep link: open Merchants Conversations (Live Chat) instead of store/dashboard
	const [initialAdminView, setInitialAdminView] = useState<"liveChat" | null>(() => {
		if (typeof window === "undefined") return null;
		const params = new URLSearchParams(window.location.search);
		if (params.get("view") === "liveChat") return "liveChat";
		return null;
	});

	// Function to fetch user context
	const fetchUserContext = useCallback(async (forceRefresh = false) => {
		// Get experienceId from params if not already set
		let expId = experienceId;
		if (!expId) {
			const resolvedParams = await params;
			expId = resolvedParams.experienceId;
			setExperienceId(expId);
		}
		
		const url = `/api/user/context?experienceId=${expId}${forceRefresh ? '&forceRefresh=true' : ''}`;
		setContextLoading(true);
		setContextError(null);
		try {
		const response = await apiGet(url, expId);
		
		if (!response.ok) {
			setContextError("Could not load this experience.");
			setContextLoading(false);
			return null;
		}

		const data = await response.json();
		setAuthContext(data);
		setContextLoading(false);
		
		// Backend determines everything - no frontend state management
		console.log("🎯 Backend decision:", {
			autoSelectedView: data.autoSelectedView,
			shouldShowViewSelection: data.shouldShowViewSelection,
			userType: data.userType
		});
		
		return data;
		} catch (error) {
			console.error("Error getting user context:", error);
			setContextError("Could not load this experience.");
			setContextLoading(false);
			return null;
		}
	}, [experienceId, params]);

	// Function to refresh user context after payment (with retry logic for webhook processing)
	const refreshUserContext = useCallback(async () => {
		console.log("🔄 Refreshing user context after payment...");
		
		// Wait longer for webhook to process (webhooks are async and can take time)
		await new Promise(resolve => setTimeout(resolve, 3000));
		
		// Try to refresh with retries (webhook might take a moment)
		let retries = 5;
		let lastData = null;
		
		while (retries > 0) {
			try {
				const data = await fetchUserContext(true);
				if (data) {
					lastData = data;
					console.log(`🔄 Refresh attempt ${6 - retries}/5: Got user data, subscription=${data.user?.subscription}, credits=${data.user?.credits}, messages=${data.user?.messages}`);
					
					// Wait a bit more to ensure webhook has processed
					await new Promise(resolve => setTimeout(resolve, 1500));
					retries--;
				} else {
					console.warn(`⚠️ Refresh attempt ${6 - retries}/5: No data returned`);
					retries--;
				}
			} catch (error) {
				console.error(`❌ Refresh attempt ${6 - retries}/5 error:`, error);
				retries--;
			}
		}
		
		// Final refresh attempt
		const finalData = await fetchUserContext(true);
		if (finalData) {
			console.log("✅ Final refresh successful:", {
				subscription: finalData.user?.subscription,
				credits: finalData.user?.credits,
				messages: finalData.user?.messages
			});
		} else {
			console.warn("⚠️ Final refresh returned no data");
		}
		
		console.log("✅ User context refresh complete");
	}, [fetchUserContext]);

	// Read search params for view and notification deep link (openChat)
	useEffect(() => {
		if (searchParams) {
			searchParams.then((resolved) => {
				console.log("[ExperiencePage] searchParams resolved:", { view: resolved.view, openChat: resolved.openChat });
				if (resolved.view === "customer") {
					setSelectedView("customer");
				}
				if (resolved.view === "liveChat") {
					setInitialAdminView("liveChat");
				}
				if (resolved.openChat) {
					console.log("[ExperiencePage] Setting openChatConversationId from notification deep link:", resolved.openChat);
					setOpenChatConversationId(resolved.openChat);
				}
			});
		}
	}, [searchParams]);

	// Single useEffect - get params and fetch context immediately with force refresh
	useEffect(() => {
		fetchUserContext(true); // Force refresh on page load to get latest data
	}, [fetchUserContext]);


	// Let Whop handle all authentication and access errors natively
	if (!authContext) {
		if (contextError) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
					<p className="text-sm text-red-600">{contextError}</p>
					<button
						type="button"
						className="rounded-md bg-violet-600 px-3 py-2 text-sm text-white"
						onClick={() => fetchUserContext(true)}
					>
						Try again
					</button>
				</div>
			);
		}
		return (
			<div className="flex min-h-screen items-center justify-center p-6">
				<p className="text-sm text-gray-500">Loading...</p>
			</div>
		);
	}

	// Use authenticated user data (backend-determined)
	const currentUser = { 
		name: authContext.user.name, 
		accessLevel: authContext.user.accessLevel,
		whopUserId: authContext.user.whopUserId
	};
	// Use backend-determined access level (no frontend logic)
	const currentAccessLevel = authContext.user.accessLevel;

	const handleViewSelected = (view: "admin" | "customer") => {
		// User selected a view from ViewSelectionPanel
		console.log("User selected view:", view);
		setSelectedView(view);
	};

	const handleCustomerMessage = (message: string, conversationId?: string) => {
		// Handle customer messages - could send to analytics, backend, etc.
		console.log("Customer interaction:", {
			message,
			conversationId,
			userName: currentUser.name,
			experienceId,
			accessLevel: currentAccessLevel,
			timestamp: new Date().toISOString(),
		});
	};

	// Backend determines everything - no frontend logic
	if (authContext.shouldShowViewSelection && !selectedView) {
		// Backend determined: show ViewSelectionPanel (only if no view selected yet)
		return (
			<ViewSelectionPanel
				userName={currentUser.name}
				accessLevel={currentAccessLevel as "admin"}
				onViewSelected={handleViewSelected}
			/>
		);
	}

	// Handle user-selected view from ViewSelectionPanel
	if (selectedView === "admin") {
		return <AdminPanel user={authContext?.user || null} initialView={initialAdminView ?? undefined} />;
	}

	if (selectedView === "customer") {
		console.log("[ExperiencePage] Rendering CustomerView (selectedView=customer)", { experienceId, openChatConversationId });
		return (
			<CustomerView
				userName={currentUser.name}
				experienceId={experienceId}
				onMessageSent={handleCustomerMessage}
				userType="admin" // Developer admin gets admin controls on customer view
				whopUserId={currentUser.whopUserId}
				initialOpenConversationId={openChatConversationId ?? undefined}
			/>
		);
	}

	// Handle backend auto-selected views
	if (authContext.autoSelectedView === "admin") {
		// Backend determined: show AdminPanel
		return <AdminPanel user={authContext?.user || null} initialView={initialAdminView ?? undefined} />;
	}

	if (authContext.autoSelectedView === "customer") {
		// Backend determined: show CustomerView
		console.log("[ExperiencePage] Rendering CustomerView (autoSelectedView=customer)", { experienceId, openChatConversationId });
		return (
			<CustomerView
				userName={currentUser.name}
				experienceId={experienceId}
				onMessageSent={handleCustomerMessage}
				userType="customer"
				whopUserId={currentUser.whopUserId}
				initialOpenConversationId={openChatConversationId ?? undefined}
			/>
		);
	}

	// Let Whop handle all loading and error states
}
