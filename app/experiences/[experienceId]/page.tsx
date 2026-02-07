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
	const [experienceId, setExperienceId] = useState<string>("");
	const [selectedView, setSelectedView] = useState<"admin" | "customer" | null>(null);
	const [openChatConversationId, setOpenChatConversationId] = useState<string | null>(null);

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
		const response = await apiGet(url, expId);
		
		if (!response.ok) {
			// Let Whop handle all errors natively
			return null;
		}

		const data = await response.json();
		setAuthContext(data);
		
		// Backend determines everything - no frontend state management
		console.log("🎯 Backend decision:", {
			autoSelectedView: data.autoSelectedView,
			shouldShowViewSelection: data.shouldShowViewSelection,
			userType: data.userType
		});
		
		return data;
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
				if (resolved.view === "customer") {
					setSelectedView("customer");
				}
				if (resolved.openChat) {
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
		return null;
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
		return <AdminPanel user={authContext?.user || null} />;
	}

	if (selectedView === "customer") {
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
		return <AdminPanel user={authContext?.user || null} />;
	}

	if (authContext.autoSelectedView === "customer") {
		// Backend determined: show CustomerView
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
